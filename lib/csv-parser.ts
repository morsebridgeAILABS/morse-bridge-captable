import { Stakeholder, ShareClass } from './types';

/**
 * Robust RFC 4180 compliant CSV line tokenizer
 * Correctly handles quotes, commas inside quotes, escaped quotes, and trim.
 */
export function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // Skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

/**
 * Clean currency and formatted number strings (e.g. "$1,500,000.00" -> 1500000)
 */
export function cleanNumber(val: any): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const str = String(val).replace(/[\$,\s]/g, '').trim();
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
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
 * Parses full CSV text with auto-header detection
 */
export function parseCapTableCsv(csvText: string): CsvParseResult {
  const errors: string[] = [];
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    return {
      success: false,
      stakeholders: [],
      totalShares: 0,
      totalInvested: 0,
      errors: ['File is empty or missing data rows.'],
      summary: { commonCount: 0, preferredCount: 0, totalCount: 0 },
    };
  }

  // Parse header row
  const headerCols = parseCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));

  let nameIndex = headerCols.findIndex((h) =>
    h.includes('name') || h.includes('holder') || h.includes('investor') || h.includes('stakeholder')
  );
  let classIndex = headerCols.findIndex((h) =>
    h.includes('class') || h.includes('type') || h.includes('shareclass')
  );
  let sharesIndex = headerCols.findIndex((h) =>
    h.includes('share') || h.includes('quantity') || h.includes('count') || h.includes('amountofshares')
  );
  let investedIndex = headerCols.findIndex((h) =>
    h.includes('invest') || h.includes('cost') || h.includes('basis') || h.includes('paid') || h.includes('amount')
  );

  // Fallbacks if headers not detected
  if (nameIndex === -1) nameIndex = 0;
  if (classIndex === -1) classIndex = 1;
  if (sharesIndex === -1) sharesIndex = 2;
  if (investedIndex === -1) investedIndex = 3;

  const stakeholders: Stakeholder[] = [];
  let commonCount = 0;
  let preferredCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (cols.length === 0 || (cols.length === 1 && !cols[0])) continue;

    const name = cols[nameIndex] || `Stakeholder #${i}`;
    const rawClass = (cols[classIndex] || '').toLowerCase();
    const shareClass: ShareClass =
      rawClass.includes('pref') || rawClass.includes('series') || rawClass.includes('investor')
        ? 'Preferred'
        : 'Common';

    const shares = cleanNumber(cols[sharesIndex]);
    const investmentAmount = cleanNumber(cols[investedIndex]);

    if (shares <= 0 && investmentAmount <= 0) {
      errors.push(`Row ${i + 1} (${name}): Skipped because shares and investment amount are zero.`);
      continue;
    }

    if (shareClass === 'Preferred') preferredCount++;
    else commonCount++;

    stakeholders.push({
      id: `imported-${Date.now()}-${i}`,
      name,
      shareClass,
      shares,
      investmentAmount,
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
