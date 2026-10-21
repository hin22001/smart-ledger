import React, { useState, useMemo } from 'react';
import { Transaction } from '../types';
import { Search, ArrowUpCircle, ArrowDownCircle, ChevronDown, Filter } from 'lucide-react';

interface TransactionTableProps {
  transactions: Transaction[];
  categoryMap: Record<string, string>;
  categories: string[];
  onUpdateCategory: (merchantName: string, newCategory: string) => void;
}

export const TransactionTable: React.FC<TransactionTableProps> = ({
  transactions,
  categoryMap,
  categories,
  onUpdateCategory,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'DEBIT' | 'CREDIT'>('ALL');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');

  const filteredData = useMemo(() => {
    return transactions.filter(t => {
      const matchesSearch =
        t.merchantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'ALL' || t.type === filterType;
      const currentCat = categoryMap[t.merchantName] || 'Other';
      const matchesCategory =
        selectedCategoryFilter === 'ALL' || currentCat === selectedCategoryFilter;
      return matchesSearch && matchesType && matchesCategory;
    });
  }, [transactions, searchTerm, filterType, selectedCategoryFilter, categoryMap]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-HK', { style: 'currency', currency: currency || 'HKD' }).format(amount);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Transactions Ledger</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Showing {filteredData.length} of {transactions.length} records. Click any category to reassign.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search merchants or notes..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-56"
            />
          </div>

          {/* Category Filter */}
          <div className="relative">
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium py-2 pl-3 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Type Filter */}
          <div className="flex rounded-lg border border-slate-200 p-1 bg-slate-50">
            {(['ALL', 'DEBIT', 'CREDIT'] as const).map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                  filterType === type 
                    ? 'bg-white text-slate-800 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 border-b border-slate-100 text-xs uppercase font-semibold text-slate-500 tracking-wider">
            <tr>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Merchant / Description</th>
              <th className="px-6 py-4">Category</th>
              <th className="px-6 py-4 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredData.map((t, index) => {
              const isCredit = t.type === 'CREDIT';
              const displayAmount = isCredit ? Math.abs(t.amount) : -Math.abs(t.amount);
              const currentCategory = categoryMap[t.merchantName] || 'Other';
              
              return (
                <tr key={t.id || `tx-row-${index}`} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                    {formatDate(t.transactionDate)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-800">{t.merchantName}</span>
                      <span className="text-xs text-slate-400 truncate max-w-xs">{t.description}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="relative inline-block">
                      <select
                        value={currentCategory}
                        onChange={(e) => onUpdateCategory(t.merchantName, e.target.value)}
                        className="appearance-none bg-indigo-50/60 hover:bg-indigo-100/70 text-indigo-700 text-xs font-medium px-3 py-1.5 pr-7 rounded-full border border-indigo-200/80 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        title="Click to change category for this merchant"
                      >
                        {categories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                        {!categories.includes(currentCategory) && (
                          <option value={currentCategory}>
                            {currentCategory}
                          </option>
                        )}
                      </select>
                      <ChevronDown className="w-3 h-3 text-indigo-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </td>
                  <td className={`px-6 py-4 text-right font-medium ${isCredit ? 'text-emerald-600' : 'text-slate-800'}`}>
                    <div className="flex items-center justify-end gap-2">
                      {isCredit ? (
                        <ArrowDownCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      ) : (
                        <ArrowUpCircle className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      )}
                      <span>{formatCurrency(displayAmount, t.currency)}</span>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredData.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                  <p className="text-sm">No transactions match your current search or filter criteria.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};