import React, { useState } from 'react';
import { Tag, Plus, Trash2, RotateCcw, Sparkles, X, Check } from 'lucide-react';
import { DEFAULT_CATEGORIES } from '../types';

interface CategoryManagerProps {
  isOpen: boolean;
  onClose: () => void;
  categories: string[];
  onSaveCategories: (newCategories: string[]) => void;
  onRecategorizeAll: (newCategories: string[]) => void;
  categoryUsageCount: Record<string, number>;
  isRecategorizing: boolean;
}

const POPULAR_SUGGESTIONS = [
  'Groceries',
  'Food & Dining',
  'Coffee & Snacks',
  'Travel & Vacation',
  'Subscriptions & SaaS',
  'Health & Medical',
  'Gym & Fitness',
  'Education & Kids',
  'Pet Care',
  'Housing & Rent',
  'Home & Garden',
  'Investments',
  'Personal Care & Beauty',
  'Gifts & Donations'
];

export const CategoryManager: React.FC<CategoryManagerProps> = ({
  isOpen,
  onClose,
  categories,
  onSaveCategories,
  onRecategorizeAll,
  categoryUsageCount,
  isRecategorizing,
}) => {
  const [localCategories, setLocalCategories] = useState<string[]>(categories);
  const [newCatInput, setNewCatInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync when opened
  React.useEffect(() => {
    if (isOpen) {
      setLocalCategories(categories);
      setErrorMsg(null);
    }
  }, [isOpen, categories]);

  if (!isOpen) return null;

  const handleAddCategory = (nameToAdd?: string) => {
    const raw = (nameToAdd || newCatInput).trim();
    if (!raw) return;

    // Check duplicate case-insensitively
    if (localCategories.some(c => c.toLowerCase() === raw.toLowerCase())) {
      setErrorMsg(`"${raw}" is already in your predefined categories.`);
      return;
    }

    const updated = [...localCategories, raw];
    setLocalCategories(updated);
    setNewCatInput('');
    setErrorMsg(null);
    onSaveCategories(updated);
  };

  const handleRemoveCategory = (catToRemove: string) => {
    if (localCategories.length <= 1) {
      setErrorMsg("You must keep at least one category.");
      return;
    }
    const updated = localCategories.filter(c => c !== catToRemove);
    setLocalCategories(updated);
    setErrorMsg(null);
    onSaveCategories(updated);
  };

  const handleResetDefaults = () => {
    setLocalCategories(DEFAULT_CATEGORIES);
    setErrorMsg(null);
    onSaveCategories(DEFAULT_CATEGORIES);
  };

  const handleApplyAndRecategorize = () => {
    onSaveCategories(localCategories);
    onRecategorizeAll(localCategories);
    onClose();
  };

  // Suggestions that aren't already added
  const availableSuggestions = POPULAR_SUGGESTIONS.filter(
    s => !localCategories.some(c => c.toLowerCase() === s.toLowerCase())
  ).slice(0, 6);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Manage Predefined Categories</h3>
              <p className="text-xs text-slate-300">
                AI will map incoming and existing merchants to these exact categories.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Add Category Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Add New Category
            </label>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAddCategory();
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                placeholder="e.g. Pet Care, Software Subscriptions, Travel..."
                value={newCatInput}
                onChange={(e) => {
                  setNewCatInput(e.target.value);
                  setErrorMsg(null);
                }}
                className="flex-1 px-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </form>
            {errorMsg && (
              <p className="text-xs text-red-500 mt-1.5">{errorMsg}</p>
            )}
          </div>

          {/* Quick Suggestions */}
          {availableSuggestions.length > 0 && (
            <div>
              <span className="text-xs font-medium text-slate-400 block mb-2">
                Quick Suggestions:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {availableSuggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleAddCategory(s)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 rounded-full border border-slate-200 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3 text-slate-400" />
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Current Categories List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Active Categories ({localCategories.length})
              </label>
              <button
                onClick={handleResetDefaults}
                className="text-xs text-slate-500 hover:text-indigo-600 inline-flex items-center gap-1 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                Reset Defaults
              </button>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {localCategories.map((cat) => {
                const count = categoryUsageCount[cat] || 0;
                return (
                  <div
                    key={cat}
                    className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 flex-shrink-0" />
                      <span className="text-sm font-medium text-slate-800">{cat}</span>
                      {count > 0 && (
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                          {count} tx
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveCategory(cat)}
                      disabled={localCategories.length <= 1}
                      title="Remove category"
                      className="text-slate-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-5 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-500 text-center sm:text-left">
            Changes save automatically to your browser storage.
          </p>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Done
            </button>
            <button
              onClick={handleApplyAndRecategorize}
              disabled={isRecategorizing}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow-sm transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-indigo-200" />
              Feed AI &amp; Recategorize All
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
