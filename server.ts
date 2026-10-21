import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

const DEFAULT_CATEGORIES = [
  'Food & Dining',
  'Groceries',
  'Shopping',
  'Transport',
  'Utilities',
  'Entertainment',
  'Health & Fitness',
  'Housing & Rent',
  'Salary & Transfer',
  'Other',
];

// Heuristic fallback that maps to the user's predefined categories
const getHeuristicCategory = (merchant: string, availableCategories: string[]): string => {
  const m = merchant.toLowerCase();
  const cats = new Set(availableCategories.map(c => c.toLowerCase()));

  const pick = (pref: string[]): string | null => {
    for (const p of pref) {
      const match = availableCategories.find(c => c.toLowerCase() === p.toLowerCase());
      if (match) return match;
    }
    // Partial substring match
    for (const p of pref) {
      const match = availableCategories.find(c => c.toLowerCase().includes(p.toLowerCase()) || p.toLowerCase().includes(c.toLowerCase()));
      if (match) return match;
    }
    return null;
  };

  // Check common merchant patterns
  if (/market|grocery|supermarket|costco|walmart|trader joe|whole foods|carrefour|wellcome|parknshop|dairy farm/.test(m)) {
    const chosen = pick(['Groceries', 'Food & Dining', 'Shopping']);
    if (chosen) return chosen;
  }
  if (/starbucks|mcdonald|kfc|burger|pizza|coffee|cafe|bistro|sushi|restaurant|bakery|diner|eats|ubereats|deliveroo|doordash|foodpanda|subway|taco|noodle|dining|tea|bar\b|pub\b|brew|catering|canton|kitchen|7-eleven|circle k|convenience/.test(m)) {
    const chosen = pick(['Food & Dining', 'Groceries', 'Entertainment']);
    if (chosen) return chosen;
  }
  if (/uber|lyft|taxi|grab|metro|mtr|transit|train|subway|airline|flight|cathay|delta|united|airways|gas|fuel|petrol|shell|chevron|bp|parking|toll|octopus/.test(m)) {
    const chosen = pick(['Transport', 'Travel', 'Utilities']);
    if (chosen) return chosen;
  }
  if (/amazon|apple|target|ebay|ikea|zara|h&m|nike|adidas|uniqlo|store|shop|mall|retail|clothing|electronics|bestbuy|sephora|muji|watsons|mannings/.test(m)) {
    const chosen = pick(['Shopping', 'Electronics', 'Clothing']);
    if (chosen) return chosen;
  }
  if (/netflix|spotify|youtube|hulu|disney|prime video|steam|playstation|xbox|nintendo|cinema|movie|theatre|ticketmaster|amc|broadway|golden harvest/.test(m)) {
    const chosen = pick(['Entertainment', 'Subscriptions', 'Shopping']);
    if (chosen) return chosen;
  }
  if (/electric|power|water|gas co|telecom|verizon|at&t|t-mobile|broadband|utility|clp|hkelectric|pccw|hkbn|smartone|csl|internet/.test(m)) {
    const chosen = pick(['Utilities', 'Bills & Utilities', 'Housing']);
    if (chosen) return chosen;
  }
  if (/hospital|clinic|doctor|pharmacy|cvs|walgreens|dental|optometry|gym|fitness|health|care|wellness|pure yoga/.test(m)) {
    const chosen = pick(['Health & Fitness', 'Health', 'Medical']);
    if (chosen) return chosen;
  }
  if (/rent|mortgage|landlord|realty|property|management fee|estate/.test(m)) {
    const chosen = pick(['Housing & Rent', 'Housing', 'Utilities']);
    if (chosen) return chosen;
  }
  if (/transfer|atm|cash|deposit|withdrawal|wire|paypal|venmo|zelle|payout|payroll|salary|dividend|fps|payme/.test(m)) {
    const chosen = pick(['Salary & Transfer', 'Transfer', 'Income']);
    if (chosen) return chosen;
  }

  // Fallback to 'Other' or the last category
  const fallback = availableCategories.find(c => c.toLowerCase() === 'other') || availableCategories[availableCategories.length - 1] || 'Other';
  return fallback;
};

const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('GEMINI_API_KEY not configured in environment');
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// Helper to attempt model generation with automatic fallback models
async function generateWithModelFallback(ai: GoogleGenAI, params: any) {
  // Use gemini-2.5-flash as first choice to avoid temporary 503 spikes, followed by gemini-3.8-flash
  const candidateModels = ['gemini-2.5-flash', 'gemini-3.8-flash', 'gemini-flash-latest'];
  let lastError: any = null;

  for (const model of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        ...params,
        model,
      });
      return response;
    } catch (err: any) {
      console.warn(`Model ${model} failed with ${err?.status || err?.message}, trying next fallback...`);
      lastError = err;
    }
  }
  throw lastError;
}

// API: Categorize merchants into user-predefined categories
app.post('/api/gemini/categorize', async (req, res) => {
  const { merchants, categories } = req.body as {
    merchants: string[];
    categories?: string[];
  };

  if (!merchants || !Array.isArray(merchants) || merchants.length === 0) {
    return res.json({ categories: {} });
  }

  const targetCategories = Array.isArray(categories) && categories.length > 0
    ? categories
    : DEFAULT_CATEGORIES;

  const fallbackCategory = targetCategories.find(c => c.toLowerCase() === 'other') || targetCategories[targetCategories.length - 1];

  // Pre-fill with heuristic mapping
  const mapping: Record<string, string> = {};
  merchants.forEach(m => {
    mapping[m] = getHeuristicCategory(m, targetCategories);
  });

  const ai = getAiClient();
  if (!ai) {
    return res.json({ categories: mapping });
  }

  try {
    const prompt = `You are a financial bookkeeping assistant. Your task is to categorize each merchant into EXACTLY ONE category from this predefined list provided by the user:
${JSON.stringify(targetCategories)}

CRITICAL RULES:
1. Every categorized merchant MUST be assigned one of the exact strings from the predefined category list above.
2. DO NOT invent or alter category names.
3. If a merchant doesn't clearly match, assign it to "${fallbackCategory}".

Merchants to categorize:
${JSON.stringify(merchants)}`;

    const response = await generateWithModelFallback(ai, {
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              merchant: { type: Type.STRING },
              category: { type: Type.STRING },
            },
            required: ['merchant', 'category'],
          },
        },
      },
    });

    const jsonText = response.text || '[]';
    const items = JSON.parse(jsonText) as { merchant: string; category: string }[];

    // Validate that returned categories are in the user-defined list
    const categoryLookup = new Map<string, string>();
    targetCategories.forEach(c => categoryLookup.set(c.toLowerCase(), c));

    items.forEach(item => {
      if (item.merchant && item.category) {
        const lower = item.category.toLowerCase().trim();
        const matched = categoryLookup.get(lower);
        if (matched) {
          mapping[item.merchant] = matched;
        } else {
          // Find closest category by substring or fallback
          const closest = targetCategories.find(c => c.toLowerCase().includes(lower) || lower.includes(c.toLowerCase()));
          mapping[item.merchant] = closest || fallbackCategory;
        }
      }
    });

    return res.json({ categories: mapping });
  } catch (error) {
    console.warn('Gemini categorization failed on all models, using heuristic fallback:', error);
    return res.json({ categories: mapping });
  }
});

// API: Generate Financial Report / Insights
app.post('/api/gemini/insights', async (req, res) => {
  const { transactions } = req.body as { transactions: any[] };
  if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
    return res.json({ report: 'No transactions found to analyze.' });
  }

  const totalSpending = transactions
    .filter(t => t.type === 'DEBIT')
    .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);

  const totalIncome = transactions
    .filter(t => t.type === 'CREDIT')
    .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);

  const merchantTotals: Record<string, number> = {};
  transactions
    .filter(t => t.type === 'DEBIT')
    .forEach(t => {
      const name = t.merchantName || t.description || 'Unknown';
      merchantTotals[name] = (merchantTotals[name] || 0) + Math.abs(t.amount || 0);
    });

  const sortedMerchants = Object.entries(merchantTotals).sort((a, b) => b[1] - a[1]);
  const topMerchantsText = sortedMerchants.slice(0, 5).map(([m, val]) => `- **${m}**: $${val.toFixed(2)}`).join('\n');

  const fallbackReport = `### Financial Health Summary

- **Total Spending:** $${totalSpending.toFixed(2)}
- **Total Income:** $${totalIncome.toFixed(2)}
- **Net Cashflow:** $${(totalIncome - totalSpending).toFixed(2)}

#### Top Spending Merchants
${topMerchantsText || '- No debit transactions recorded.'}

#### Smart Budgeting Recommendations
1. **Target Discretionary Spend:** Examine your top spending merchants to identify subscription plans or daily incidental costs that can be optimized.
2. **Emergency Cushion:** Aim to reserve at least 15-20% of net positive cashflow into high-yield savings.
3. **Regular Audit:** Re-upload statement updates monthly to maintain visibility into seasonal spending variance.`;

  const ai = getAiClient();
  if (!ai) {
    return res.json({ report: fallbackReport });
  }

  try {
    const simplifiedData = transactions.slice(0, 60).map(t => ({
      date: t.transactionDate,
      merchant: t.merchantName || t.description,
      amount: t.amount,
      type: t.type,
    }));

    const prompt = `Analyze the following list of transactions and provide a concise, high-value financial insight report in Markdown format.
Include:
1. Short executive summary of spending trends and cashflow.
2. Largest expense categories and merchants.
3. Any recurring subscriptions or frequent small purchases.
4. Actionable tips to optimize personal savings based directly on the provided numbers.

Data:
${JSON.stringify(simplifiedData)}`;

    const response = await generateWithModelFallback(ai, { contents: prompt });
    const report = response.text || fallbackReport;
    return res.json({ report });
  } catch (error) {
    console.warn('Gemini report generation error, using analytical summary:', error);
    return res.json({ report: fallbackReport });
  }
});

// Setup Vite in development or static serve in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0', port: PORT },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
