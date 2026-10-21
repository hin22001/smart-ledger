import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Transaction, DEFAULT_CATEGORIES } from './types';
import { parseCSV } from './services/csvService';
import { saveToStorage, loadFromStorage, clearStorage } from './services/storageService';
import { FileUpload } from './components/FileUpload';
import { StatCard } from './components/StatCard';
import { TransactionTable } from './components/TransactionTable';
import { SpendingCharts } from './components/Charts';
import { AiInsights } from './components/AiInsights';
import { CategoryManager } from './components/CategoryManager';
import { categorizeTransactions } from './services/geminiService';
import { 
  Wallet, TrendingDown, TrendingUp, CreditCard, RefreshCw, 
  Trash2, PlusCircle, Sparkles, AlertCircle, X, Tag, Settings2 
} from 'lucide-react';

export const App: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categoryMap, setCategoryMap] = useState<Record<string, string>>({});
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [loadingCats, setLoadingCats] = useState(false);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'info' | 'warning' } | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load from storage on mount
  useEffect(() => {
    const savedData = loadFromStorage();
    if (savedData) {
      if (savedData.transactions.length > 0) {
        setTransactions(savedData.transactions);
      }
      if (savedData.categoryMap) {
        setCategoryMap(savedData.categoryMap);
      }
      if (savedData.categories && savedData.categories.length > 0) {
        setCategories(savedData.categories);
      }
    }
  }, []);

  // Save to storage on change
  useEffect(() => {
    if (transactions.length > 0 || categories.length > 0) {
      saveToStorage(transactions, categoryMap, categories);
    }
  }, [transactions, categoryMap, categories]);

  const handleLoadFromStorage = () => {
    const savedData = loadFromStorage();
    if (savedData) {
      setTransactions(savedData.transactions);
      setCategoryMap(savedData.categoryMap);
      if (savedData.categories && savedData.categories.length > 0) {
        setCategories(savedData.categories);
      }
    }
  };

  const autoCategorize = async (data: Transaction[], targetCategories?: string[]) => {
    const catsToUse = targetCategories && targetCategories.length > 0 ? targetCategories : categories;
    const unmappedMerchants = Array.from(new Set(data.map(t => t.merchantName)))
      .filter(m => !categoryMap[m])
      .slice(0, 50);

    if (unmappedMerchants.length > 0) {
      setLoadingCats(true);
      try {
        const mapping = await categorizeTransactions(unmappedMerchants, catsToUse);
        setCategoryMap(prev => ({ ...prev, ...mapping }));
      } catch (err) {
        console.warn("Categorization error:", err);
      } finally {
        setLoadingCats(false);
      }
    }
  };

  const handleRecategorizeAll = async (targetCategories?: string[]) => {
    const catsToUse = targetCategories && targetCategories.length > 0 ? targetCategories : categories;
    const uniqueMerchants = Array.from(new Set(transactions.map(t => t.merchantName))).slice(0, 100);

    if (uniqueMerchants.length === 0) {
      setNotification({
        message: "No merchants available in transactions to categorize.",
        type: "warning"
      });
      return;
    }

    setLoadingCats(true);
    setNotification({
      message: `AI is categorizing ${uniqueMerchants.length} merchants into your ${catsToUse.length} predefined categories...`,
      type: "info"
    });

    try {
      const mapping = await categorizeTransactions(uniqueMerchants, catsToUse);
      setCategoryMap(mapping);
      setNotification({
        message: `Successfully categorized ${Object.keys(mapping).length} merchants with AI!`,
        type: "info"
      });
    } catch (err) {
      console.error("Recategorization failed:", err);
      setNotification({
        message: "Failed to complete AI categorization. Please try again.",
        type: "warning"
      });
    } finally {
      setLoadingCats(false);
    }
  };

  const handleUpdateMerchantCategory = (merchantName: string, newCategory: string) => {
    setCategoryMap(prev => {
      const updated = { ...prev, [merchantName]: newCategory };
      saveToStorage(transactions, updated, categories);
      return updated;
    });
    setNotification({
      message: `Updated all "${merchantName}" transactions to "${newCategory}".`,
      type: "info"
    });
  };

  const handleSaveCategories = (newCategories: string[]) => {
    setCategories(newCategories);
    saveToStorage(transactions, categoryMap, newCategories);
  };

  const processLoadedFiles = (csvContents: string[]) => {
    const newTransactions = csvContents.flatMap(text => parseCSV(text));
    
    // Merge logic: Filter out duplicates based on ID
    const existingIds = new Set(transactions.map(t => t.id));
    const uniqueNewTransactions: Transaction[] = [];

    for (const t of newTransactions) {
      if (!existingIds.has(t.id)) {
        existingIds.add(t.id);
        uniqueNewTransactions.push(t);
      }
    }
    
    if (uniqueNewTransactions.length === 0) {
      if (newTransactions.length > 0) {
        setNotification({
          message: "No new transactions found. The uploaded statements appear to be already imported.",
          type: "warning"
        });
      }
      return;
    }

    const mergedTransactions = [...transactions, ...uniqueNewTransactions];
    const sortedData = mergedTransactions.sort((a, b) => b.transactionDate.getTime() - a.transactionDate.getTime());
    
    setTransactions(sortedData);
    setNotification({
      message: `Imported ${uniqueNewTransactions.length} new transactions. Feeding merchants to predefined categories with AI...`,
      type: "info"
    });
    
    // Automatically categorize with user's defined categories
    autoCategorize(uniqueNewTransactions, categories);
  };

  const handleConfirmReset = () => {
    setTransactions([]);
    setCategoryMap({});
    clearStorage();
    setShowResetConfirm(false);
    setNotification({
      message: "Ledger and storage cleared successfully.",
      type: "info"
    });
  };

  const triggerImport = () => {
    fileInputRef.current?.click();
  };

  const handleHiddenFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const filePromises = Array.from(files).map(file => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (ev) => resolve((ev.target?.result as string) || '');
          reader.readAsText(file);
        });
      });
      const contents = await Promise.all(filePromises);
      processLoadedFiles(contents);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Usage count per category
  const categoryUsageCount = useMemo(() => {
    const counts: Record<string, number> = {};
    transactions.forEach(t => {
      const cat = categoryMap[t.merchantName] || 'Other';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [transactions, categoryMap]);

  // Calculate Summary Stats
  const stats = useMemo(() => {
    const totalSpending = transactions
      .filter(t => t.type === 'DEBIT')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    const totalIncome = transactions
      .filter(t => t.type === 'CREDIT')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    const net = totalIncome - totalSpending;

    // Find top merchant
    const merchantMap = transactions
      .filter(t => t.type === 'DEBIT')
      .reduce((acc, t) => {
        const name = t.merchantName || 'Unknown';
        acc[name] = (acc[name] || 0) + Math.abs(t.amount);
        return acc;
      }, {} as Record<string, number>);
    
    const topMerchant = Object.entries(merchantMap).sort((a, b) => (b[1] as number) - (a[1] as number))[0];

    return {
      totalSpending,
      totalIncome,
      net,
      topMerchant: topMerchant ? topMerchant[0] : 'N/A'
    };
  }, [transactions]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-20">
      {/* Hidden Input for Continuous Import */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleHiddenFileInputChange} 
        accept=".csv" 
        multiple 
        className="hidden" 
      />

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2.5 rounded-xl shadow-sm">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-none">Smart Ledger</h1>
              <p className="text-xs text-slate-400 mt-0.5">Local CSV Bookkeeping &amp; AI Intelligence</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Manage Categories Button */}
            <button
              onClick={() => setIsCategoryManagerOpen(true)}
              className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-700 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 px-3 py-2 rounded-lg transition-colors border border-slate-200 cursor-pointer"
              title="Define custom categories for AI to match against"
            >
              <Tag className="w-4 h-4 text-indigo-600" />
              <span>Categories</span>
              <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-0.5">
                {categories.length}
              </span>
            </button>

            {transactions.length > 0 && (
              <>
                {/* Re-categorize All button */}
                <button
                  onClick={() => handleRecategorizeAll()}
                  disabled={loadingCats}
                  className="hidden md:flex items-center gap-1.5 text-xs sm:text-sm font-medium text-indigo-700 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-lg transition-colors border border-indigo-200 cursor-pointer disabled:opacity-50"
                  title="Re-run AI categorization for all merchants"
                >
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>Re-categorize All</span>
                </button>

                <button 
                  onClick={triggerImport}
                  className="flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-700 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 px-3 py-2 rounded-lg transition-colors border border-slate-200 cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4 text-indigo-600" />
                  <span className="hidden sm:inline">Import CSV</span>
                </button>

                <button 
                  onClick={() => setShowResetConfirm(true)}
                  className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-red-600 bg-white hover:bg-red-50 p-2 sm:px-3 sm:py-2 rounded-lg transition-colors border border-slate-200 cursor-pointer"
                  title="Clear all data"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* In-app Notification Banner */}
      {notification && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className={`p-4 rounded-xl flex items-center justify-between border ${
            notification.type === 'warning' 
              ? 'bg-amber-50 border-amber-200 text-amber-900' 
              : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}>
            <div className="flex items-center gap-3">
              <AlertCircle className={`w-5 h-5 flex-shrink-0 ${notification.type === 'warning' ? 'text-amber-600' : 'text-emerald-600'}`} />
              <p className="text-sm font-medium">{notification.message}</p>
            </div>
            <button 
              onClick={() => setNotification(null)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Clear All Ledger Data?</h3>
            <p className="text-sm text-slate-600 mb-6">
              This will remove all imported transactions and clear your saved state from local browser storage. This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button 
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmReset}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm cursor-pointer"
              >
                Yes, Clear Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Manager Modal */}
      <CategoryManager 
        isOpen={isCategoryManagerOpen}
        onClose={() => setIsCategoryManagerOpen(false)}
        categories={categories}
        onSaveCategories={handleSaveCategories}
        onRecategorizeAll={handleRecategorizeAll}
        categoryUsageCount={categoryUsageCount}
        isRecategorizing={loadingCats}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Intro / Upload State */}
        {transactions.length === 0 ? (
          <div className="max-w-xl mx-auto mt-16 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              Automated Categorization &amp; Financial Insights
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-3 tracking-tight">Take Control of Your Finances</h2>
            <p className="text-slate-600 mb-6 text-sm sm:text-base">
              Import your bank statement CSV files to instantly parse statements, visualize spending habits, and let AI classify merchants into your predefined categories.
            </p>

            {/* Predefined Categories Chip Bar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-8 text-left">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-indigo-600" />
                  Predefined Categories ({categories.length})
                </span>
                <button
                  onClick={() => setIsCategoryManagerOpen(true)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center gap-1 cursor-pointer"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  Customize
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {categories.map((c) => (
                  <span
                    key={c}
                    className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>

            <FileUpload onDataLoaded={processLoadedFiles} onLoadFromStorage={handleLoadFromStorage} />
            
            <div className="mt-8 text-xs text-slate-400 space-y-1">
              <p>Data is processed locally in your browser.</p>
              <p className="text-slate-500 font-medium">Supports multiple statement uploads, customizable categories, and smart duplicate detection.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Financial Overview</h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  Statement records mapped to {categories.length} predefined categories
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleRecategorizeAll()}
                  disabled={loadingCats}
                  className="md:hidden inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-xs font-medium text-indigo-700 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Recategorize All
                </button>
                <div className="inline-flex items-center px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs font-medium text-slate-600 shadow-sm">
                  {transactions.length} transactions loaded
                </div>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard 
                title="Total Spending" 
                value={`$${stats.totalSpending.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`} 
                icon={TrendingDown}
                colorClass="text-rose-600 bg-rose-600"
              />
              <StatCard 
                title="Total Income" 
                value={`$${stats.totalIncome.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`} 
                icon={TrendingUp}
                colorClass="text-emerald-600 bg-emerald-600"
              />
              <StatCard 
                title="Net Cashflow" 
                value={`$${stats.net.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`} 
                icon={Wallet}
                colorClass={stats.net >= 0 ? "text-emerald-600 bg-emerald-600" : "text-rose-600 bg-rose-600"}
              />
              <StatCard 
                title="Top Merchant" 
                value={stats.topMerchant} 
                icon={CreditCard}
                colorClass="text-indigo-600 bg-indigo-600"
              />
            </div>

            {/* AI Assistant */}
            <AiInsights transactions={transactions} />

            {/* Charts */}
            <SpendingCharts transactions={transactions} categoryMap={categoryMap} />

            {/* Transaction List */}
            <div className="relative">
              {loadingCats && (
                <div className="absolute top-4 right-4 z-10 flex items-center gap-2 bg-white/95 backdrop-blur px-3 py-1 rounded-full shadow-md text-xs font-medium text-indigo-600 border border-indigo-100 animate-pulse">
                  <RefreshCw className="w-3 h-3 animate-spin text-indigo-600" />
                  AI feeding merchants into predefined categories...
                </div>
              )}
              <TransactionTable 
                transactions={transactions} 
                categoryMap={categoryMap}
                categories={categories}
                onUpdateCategory={handleUpdateMerchantCategory}
              />
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default App;