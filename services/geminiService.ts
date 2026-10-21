import { Transaction, DEFAULT_CATEGORIES } from "../types";

export const generateFinancialReport = async (transactions: Transaction[]): Promise<string> => {
  try {
    const res = await fetch("/api/gemini/insights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transactions }),
    });

    if (!res.ok) {
      throw new Error(`Server returned status ${res.status}`);
    }

    const data = await res.json();
    return data.report || "No insights generated.";
  } catch (error) {
    console.warn("Failed to generate AI insights, generating local report:", error);

    const totalSpending = transactions
      .filter(t => t.type === 'DEBIT')
      .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);
    const totalIncome = transactions
      .filter(t => t.type === 'CREDIT')
      .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);

    return `### Financial Overview

- **Total Spending:** $${totalSpending.toFixed(2)}
- **Total Income:** $${totalIncome.toFixed(2)}
- **Net Cashflow:** $${(totalIncome - totalSpending).toFixed(2)}

#### Recommendations
- Regularly inspect repeat expenses to discover automatic recurring subscription charges.
- Aim to maintain positive net cashflow each statement cycle.`;
  }
};

export const categorizeTransactions = async (
  uniqueMerchants: string[],
  categories?: string[]
): Promise<Record<string, string>> => {
  if (!uniqueMerchants || uniqueMerchants.length === 0) return {};

  try {
    const res = await fetch("/api/gemini/categorize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merchants: uniqueMerchants,
        categories: categories && categories.length > 0 ? categories : DEFAULT_CATEGORIES,
      }),
    });

    if (!res.ok) {
      throw new Error(`Server returned status ${res.status}`);
    }

    const data = await res.json();
    return data.categories || {};
  } catch (error) {
    console.warn("Failed to fetch merchant categories from server, applying defaults:", error);
    const fallbackCategory = (categories && categories[0]) || DEFAULT_CATEGORIES[0] || 'Other';
    const fallback: Record<string, string> = {};
    for (const m of uniqueMerchants) {
      fallback[m] = fallbackCategory;
    }
    return fallback;
  }
};