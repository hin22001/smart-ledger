import { Transaction } from '../types';

function generateHash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

export const parseCSV = (csvText: string): Transaction[] => {
  const lines = csvText.trim().split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];

  // Remove header
  const dataLines = lines.slice(1);
  const occurrenceMap = new Map<string, number>();

  return dataLines.map((line, lineIndex) => {
    // Regex to split by comma, ignoring commas inside quotes
    const columns = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
    
    // Clean up columns (remove surrounding quotes)
    const cleanCols = columns.map(col => (col ? col.trim().replace(/^"|"$/g, '').trim() : ''));

    // Basic validation: must have at least date, description, amount
    if (cleanCols.length < 4) return null;

    // Map based on provided structure:
    // 0: Transaction date, 1: Post date, 2: Description, 3: Billing amount, 
    // 4: Billing currency, 5: Transaction status, 6: Merchant name, 
    // 7: Country / region, 8: Area / district, 9: Credit / Debit

    const parseDate = (dateStr: string) => {
      if (!dateStr) return new Date();
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        // DD/MM/YYYY format
        const p0 = parseInt(parts[0], 10);
        const p1 = parseInt(parts[1], 10);
        const p2 = parseInt(parts[2], 10);
        const year = p2 < 100 ? 2000 + p2 : p2;
        return new Date(year, p1 - 1, p0);
      }
      const parsed = new Date(dateStr);
      return isNaN(parsed.getTime()) ? new Date() : parsed;
    };

    const parseAmount = (amtStr: string) => {
      if (!amtStr) return 0;
      // Remove commas or currency signs inside numbers if any (e.g. "3,380.00", "$45.50")
      const cleanAmt = amtStr.replace(/[$, ]/g, '');
      const parsed = parseFloat(cleanAmt);
      return isNaN(parsed) ? 0 : parsed;
    };

    const txDate = parseDate(cleanCols[0]);
    const postDate = parseDate(cleanCols[1] || cleanCols[0]);
    const description = cleanCols[2] || 'Transaction';
    const amountStr = cleanCols[3];
    const amountVal = parseAmount(amountStr);
    const currency = cleanCols[4] || 'HKD';
    const status = cleanCols[5] || 'COMPLETED';
    const merchantName = cleanCols[6] || description;
    const country = cleanCols[7] || '';
    const area = cleanCols[8] || '';

    let type: 'DEBIT' | 'CREDIT' = 'DEBIT';
    const rawType = (cleanCols[9] || '').toUpperCase();
    if (rawType.includes('CREDIT') || rawType === 'CR') {
      type = 'CREDIT';
    } else if (rawType.includes('DEBIT') || rawType === 'DR') {
      type = 'DEBIT';
    } else if (amountVal < 0) {
      type = 'CREDIT';
    }

    // Generate a unique, deterministic ID based on content + line index + occurrence
    const dateStr = !isNaN(txDate.getTime()) ? txDate.toISOString().split('T')[0] : 'undated';
    const signature = `${dateStr}_${description}_${amountVal}_${merchantName}_${cleanCols[9] || ''}`;
    const occ = (occurrenceMap.get(signature) || 0) + 1;
    occurrenceMap.set(signature, occ);

    const safeHash = generateHash(signature);
    const uniqueId = `tx_${dateStr}_${safeHash}_${lineIndex + 1}_${occ}`;

    return {
      id: uniqueId,
      transactionDate: txDate,
      postDate: postDate,
      description: description,
      amount: Math.abs(amountVal),
      currency: currency,
      status: status,
      merchantName: merchantName,
      country: country,
      area: area,
      type: type,
      originalRow: cleanCols
    };
  }).filter((t): t is Transaction => t !== null && !isNaN(t.amount));
};