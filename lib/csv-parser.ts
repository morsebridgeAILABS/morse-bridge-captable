import { Stakeholder, ShareClass } from './types';

/**
 * Clean currency and formatted number strings (e.g. "$1,500,000.00" -> 1500000, "\"6,000,000\"" -> 6000000)
 */
export function cleanNumber(val: any): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const str = String(val).replace(/[^0-9.-]/g, '').trim();
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

/**
 * Determine if a parsed row is a header row or a data row
 */
export function isHeaderRow(cols: string[]): boolean {
  if (!cols || cols.length === 0) return false;
  // If either col 2 (Shares) or col 3 (Invested) is already a positive number, this is definitely a data row
  const num2 = cleanNumber(cols[2]);
  const num3 = cleanNumber(cols[3]);
  if (num2 > 0 || num3 > 0) {
    return false;
  }

  // Check header keywords
  const combined = cols.join(' ').toLowerCase();
  const keywords = ['name', 'holder', 'class', 'share', 'invest', 'stock', 'equity', 'amount', 'paid', 'cost', 'basis'];
  const matches = keywords.filter((k) => combined.includes(k));
  return matches.length >= 2;
}

/**
 * Robust RFC 4180 compliant CSV line tokenizer.
 * Handles tab separation (spreadsheet copy/paste), semicolons,
 * commas inside quotes, escaped quotes, and reassembles unquoted
 * digit-comma-digit thousands separators (e.g. 6,000,000 or $6,000).
 */
export function parseCsvLine(rawLine: string): string[] {
  if (!rawLine || !rawLine.trim()) return [];

  // Tab separation (Excel / Google Sheets copy-paste)
  if (rawLine.includes('\t')) {
    return rawLine.split('\t').map((s) => s.trim().replace(/^["']|["']$/g, ''));
  }

  // Semicolon separation
  if (rawLine.includes(';') && !rawLine.includes(',')) {
    return rawLine.split(';').map((s) => s.trim().replace(/^["']|["']$/g, ''));
  }

  // Reassemble unquoted digit-comma-digit thousands separators:
  // e.g. "6,000,000", "$6,000", "1,234,567.89", "$500,000"
  let cleaned = rawLine;
  // 1. Strip $ right before digits
  cleaned = cleaned.replace(/\$\s*(\d)/g, '$1');
  // 2. Reassemble digit-comma-digit groups (regex \d{1,3}(,\d{3})+)
  cleaned = cleaned.replace(/\b(\d{1,3}(?:,\d{3})+)(?!\d)/g, (m) => m.replace(/,/g, ''));
  // 3. Universal loop for any remaining comma thousands-separators
  while (/(\d),(\d{3})(?=\D|$)/.test(cleaned)) {
    cleaned = cleaned.replace(/(\d),(\d{3})(?=\D|$)/g, '$1$2');
  }

  // Standard RFC 4180 parsing for comma-separated tokens
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    if (char === '"') {
      if (inQuotes && cleaned[i + 1] === '"') {
        current += '"';
        i++; // Escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim().replace(/^["']|["']$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim().replace(/^["']|["']$/g, ''));
  return result;
}

export interface CsvParseResult {
  success: boolean;
  stakeholders: Stakeholder[];
  totalShares: number;
  totalInvested: number;
  errors: string[];
  summary: {
    commonCount: number;
    preferredCount: number;
    totalCount: number;
  };
}

/**
 * Parses full CSV / pasted text with automatic header detection,
 * thousands-comma preservation, and strict validation.
 */
export function parseCapTableCsv(csvText: string): CsvParseResult {
  const errors: string[] = [];
  const lines = (csvText || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return {
      success: false,
      stakeholders: [],
      totalShares: 0,
      totalInvested: 0,
      errors: ['Input is empty. Please paste or upload cap table rows.'],
      summary: { commonCount: 0, preferredCount: 0, totalCount: 0 },
    };
  }

  const firstRowCols = parseCsvLine(lines[0]);
  const firstRowIsHeader = isHeaderRow(firstRowCols);

  let nameIndex = 0;
  let classIndex = 1;
  let sharesIndex = 2;
  let investedIndex = 3;

  let startIndex = 0;

  if (firstRowIsHeader) {
    startIndex = 1;
    const headerCols = firstRowCols.map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
    
    // Priority exact / specific matching
    const detectedName = headerCols.findIndex((h) =>
      h.includes('name') || h.includes('holder') || h.includes('investor') || h.includes('stakeholder')
    );
    const detectedClass = headerCols.findIndex((h) =>
      h.includes('class') || h.includes('type')
    );
    const detectedShares = headerCols.findIndex((h) =>
      h === 'shares' || h === 'share' || h === 'quantity' || h === 'sharecount' || (h.includes('share') && !h.includes('class')) || h.includes('amountofshares')
    );
    const detectedInvested = headerCols.findIndex((h) =>
      h.includes('invest') || h.includes('cost') || h.includes('basis') || h.includes('paid') || (h.includes('amount') && !h.includes('share'))
    );

    if (detectedName !== -1) nameIndex = detectedName;
    if (detectedClass !== -1) classIndex = detectedClass;
    if (detectedShares !== -1) sharesIndex = detectedShares;
    if (detectedInvested !== -1) investedIndex = detectedInvested;
  }

  const stakeholders: Stakeholder[] = [];
  let commonCount = 0;
  let preferredCount = 0;

  for (let i = startIndex; i < lines.length; i++) {
    const rawLine = lines[i];
    const cols = parseCsvLine(rawLine);
    if (cols.length === 0 || (cols.length === 1 && !cols[0])) continue;

    const rowNumber = i + 1;
    const name = cols[nameIndex] || `Stakeholder #${rowNumber}`;
    const rawClass = (cols[classIndex] || '').toLowerCase();
    const shareClass: ShareClass =
      rawClass.includes('pref') || rawClass.includes('series') || rawClass.includes('investor')
        ? 'Preferred'
        : 'Common';

    const rawSharesStr = cols[sharesIndex];
    const shares = cleanNumber(rawSharesStr);
    const rawInvestedStr = cols[investedIndex];
    const investmentAmount = cleanNumber(rawInvestedStr);

    if (shares <= 0) {
      errors.push(`Row ${rowNumber} ("${name}"): Invalid share count ("${rawSharesStr || '0'}"). Shares must be a positive number.`);
      continue;
    }

    if (shareClass === 'Preferred') preferredCount++;
    else commonCount++;

    stakeholders.push({
      id: `imported-${Date.now()}-${i}`,
      name,
      shareClass,
      shares,
      investmentAmount: Math.max(investmentAmount, 0),
    });
  }

  const totalShares = stakeholders.reduce((sum, s) => sum + s.shares, 0);
  const totalInvested = stakeholders.reduce((sum, s) => sum + s.investmentAmount, 0);

  return {
    success: stakeholders.length > 0,
    stakeholders,
    totalShares,
    totalInvested,
    errors,
    summary: {
      commonCount,
      preferredCount,
      totalCount: stakeholders.length,
    },
  };
}

export const SAMPLE_CSV_TEMPLATE = `Stakeholder Name,Share Class,Shares,Investment Amount
Elena Rostova (CEO & Founder),Common,4500000,$4500
Marcus Vance (CTO & Founder),Common,3500000,$3500
Employee Option Pool (Unallocated),Common,1000000,$0
Vanguard Seed Fund,Preferred,1000000,$1500000
First Check Angel Syndicate,Common,200000,$100000
Horizon Ventures Seed II,Preferred,800000,$1000000
`;
