import React from 'react';
import { Transaction } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from 'recharts';

interface ChartsProps {
  transactions: Transaction[];
  categoryMap: Record<string, string>;
}

const COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', 
  '#06b6d4', '#ef4444', '#14b8a6', '#f97316', '#3b82f6',
  '#84cc16', '#a855f7', '#0ea5e9', '#eab308', '#64748b'
];

export const SpendingCharts: React.FC<ChartsProps> = ({ transactions, categoryMap }) => {
  
  // Prepare Daily Spending Data
  const dailyDataMap = transactions
    .filter(t => t.type === 'DEBIT')
    .reduce((acc, t) => {
      const date = t.transactionDate.toISOString().split('T')[0];
      const val = Math.abs(t.amount);
      acc[date] = (acc[date] || 0) + val;
      return acc;
    }, {} as Record<string, number>);

  const dailyData = Object.entries(dailyDataMap)
    .map(([date, amount]) => ({ date: date.slice(5), amount })) // Show MM-DD
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14); // Last 14 active days

  // Prepare Category Data
  const categoryDataMap = transactions
    .filter(t => t.type === 'DEBIT')
    .reduce((acc, t) => {
      const cat = categoryMap[t.merchantName] || 'Other';
      const val = Math.abs(t.amount);
      acc[cat] = (acc[cat] || 0) + val;
      return acc;
    }, {} as Record<string, number>);
  
  const categoryData = Object.entries(categoryDataMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => (b.value as number) - (a.value as number));

  // Fallback if no categories (showing top merchants instead)
  const merchantDataMap = transactions
     .filter(t => t.type === 'DEBIT')
     .reduce((acc, t) => {
        const name = t.merchantName;
        const val = Math.abs(t.amount);
        acc[name] = (acc[name] || 0) + val;
        return acc;
     }, {} as Record<string, number>);

  const merchantData = Object.entries(merchantDataMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => (b.value as number) - (a.value as number))
    .slice(0, 5);

  const displayPieData = categoryData.length > 0 ? categoryData : merchantData;
  const pieTitle = categoryData.length > 0 ? "Spending by Category" : "Top Merchants (Spending)";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      {/* Bar Chart */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-slate-800">Daily Spending Trend</h3>
          <span className="text-xs text-slate-400">Last active days</span>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
              <YAxis tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} tickFormatter={(val) => `$${val}`} />
              <Tooltip 
                cursor={{fill: '#f8fafc'}}
                formatter={(val: number) => [`$${val.toFixed(2)}`, 'Spending']}
                contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
              />
              <Bar dataKey="amount" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pie Chart */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-slate-800">{pieTitle}</h3>
          <span className="text-xs text-slate-400">{displayPieData.length} categories</span>
        </div>
        <div className="h-64 w-full">
           <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={displayPieData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={4}
                dataKey="value"
              >
                {displayPieData.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
              <Legend 
                layout="vertical" 
                verticalAlign="middle" 
                align="right" 
                wrapperStyle={{fontSize: '11px', color: '#64748b', maxHeight: '180px', overflowY: 'auto'}} 
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};