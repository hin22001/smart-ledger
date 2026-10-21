export interface Transaction {
  id: string;
  transactionDate: Date;
  postDate: Date;
  description: string;
  amount: number; // Absolute value for calculation, signed based on type
  currency: string;
  status: string;
  merchantName: string;
  country: string;
  area: string;
  type: 'DEBIT' | 'CREDIT';
  originalRow: any;
}

export interface SummaryStats {
  totalSpending: number;
  totalIncome: number;
  netBalance: number;
  transactionCount: number;
  topMerchant: string;
}

export interface CategoryData {
  name: string;
  value: number;
}

export interface DailyData {
  date: string; // ISO date string YYYY-MM-DD
  amount: number;
}

export const DEFAULT_CATEGORIES: string[] = [
  'Food & Dining',
  'Groceries',
  'Shopping',
  'Transport',
  'Utilities',
  'Entertainment',
  'Health & Fitness',
  'Housing & Rent',
  'Salary & Transfer',
  'Other'
];