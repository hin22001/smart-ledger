import React, { useState } from 'react';
import { Transaction } from '../types';
import { generateFinancialReport } from '../services/geminiService';
import { Sparkles, Loader2, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface AiInsightsProps {
  transactions: Transaction[];
}

export const AiInsights: React.FC<AiInsightsProps> = ({ transactions }) => {
  const [report, setReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerateReport = async () => {
    setLoading(true);
    try {
      const result = await generateFinancialReport(transactions);
      setReport(result);
    } catch (err) {
      console.error(err);
      setReport("Unable to generate financial report at this moment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden mb-6">
      <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-200" />
            AI Financial Consultant
          </h3>
          <p className="text-indigo-100 text-sm opacity-90">Get a comprehensive summary of your spending habits and actionable savings advice.</p>
        </div>
        <button 
          onClick={handleGenerateReport}
          disabled={loading || transactions.length === 0}
          className="bg-white/20 hover:bg-white/30 text-white border border-white/40 px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 self-start sm:self-auto disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
          {report ? 'Regenerate Report' : 'Generate Report'}
        </button>
      </div>

      {report && (
        <div className="p-6 bg-slate-50 prose prose-slate max-w-none prose-sm prose-headings:text-slate-700">
          <ReactMarkdown>{report}</ReactMarkdown>
        </div>
      )}
    </div>
  );
};