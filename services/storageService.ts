import { Transaction, DEFAULT_CATEGORIES } from '../types';

const STORAGE_KEY = 'smart_ledger_data';

interface StorageData {
  transactions: Transaction[];
  categoryMap: Record<string, string>;
  categories: string[];
  lastUpdated: string;
}

export const saveToStorage = (
  transactions: Transaction[],
  categoryMap: Record<string, string>,
  categories?: string[]
) => {
  try {
    const prev = loadFromStorage();
    const data: StorageData = {
      transactions,
      categoryMap,
      categories: categories || prev?.categories || DEFAULT_CATEGORIES,
      lastUpdated: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Failed to save to localStorage", error);
  }
};

export const loadFromStorage = (): {
  transactions: Transaction[];
  categoryMap: Record<string, string>;
  categories: string[];
} | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const data = JSON.parse(raw);
    
    // Revive Date objects and ensure strictly unique IDs even for previously saved data
    const seenIds = new Set<string>();
    const transactions = (data.transactions || []).map((t: any, idx: number) => {
      let id = t.id;
      if (!id || seenIds.has(id)) {
        id = `${id || 'tx'}_legacy_${idx}_${Math.random().toString(36).substring(2, 6)}`;
      }
      seenIds.add(id);

      return {
        ...t,
        id,
        transactionDate: new Date(t.transactionDate),
        postDate: t.postDate ? new Date(t.postDate) : null
      };
    });

    const categories = Array.isArray(data.categories) && data.categories.length > 0
      ? data.categories
      : DEFAULT_CATEGORIES;

    return {
      transactions,
      categoryMap: data.categoryMap || {},
      categories
    };
  } catch (error) {
    console.error("Failed to load from localStorage", error);
    return null;
  }
};

export const clearStorage = () => {
  localStorage.removeItem(STORAGE_KEY);
};

export const hasStorageData = (): boolean => {
  return !!localStorage.getItem(STORAGE_KEY);
};