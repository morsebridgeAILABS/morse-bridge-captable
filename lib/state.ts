import LZString from 'lz-string';
import { TerminalState } from './types';

export const DEFAULT_TERMINAL_STATE: TerminalState = {
  version: 1,
  companyDetails: {
    companyName: 'Apex Robotics Inc.',
    totalAuthorizedShares: 15_000_000,
    targetSeriesAValuation: 25_000_000, // $25M Pre-Money
    seriesANewMoney: 5_000_000,         // $5M New Capital
  },
  capTable: [
    {
      id: 'stk-1',
      name: 'Elena Rostova (CEO & Co-Founder)',
      shareClass: 'Common',
      shares: 4_500_000,
      investmentAmount: 4_500,
    },
    {
      id: 'stk-2',
      name: 'Marcus Vance (CTO & Co-Founder)',
      shareClass: 'Common',
      shares: 3_500_000,
      investmentAmount: 3_500,
    },
    {
      id: 'stk-3',
      name: 'Employee Option Pool (Unallocated)',
      shareClass: 'Common',
      shares: 1_000_000,
      investmentAmount: 0,
    },
    {
      id: 'stk-4',
      name: 'Vanguard Seed Fund (Series Seed)',
      shareClass: 'Preferred',
      shares: 1_000_000,
      investmentAmount: 1_500_000,
    },
  ],
  safes: [
    {
      id: 'safe-1',
      investor: 'Y Combinator (Post-Money SAFE)',
      amount: 500_000,
      valuationCap: 15_000_000,
      discount: 0,
      type: 'Post-Money',
    },
    {
      id: 'safe-2',
      investor: 'Horizon Angels (Pre-Money SAFE)',
      amount: 1_000_000,
      valuationCap: 12_000_000,
      discount: 0.20,
      type: 'Pre-Money',
    },
  ],
  params409A: {
    stockPrice: 3.50,
    strikePrice: 3.50,
    timeToExit: 2.5,
    riskFreeRate: 0.045,
    volatility: 0.65,
  },
  waterfallParams: {
    exitValuation: 50_000_000,
  },
};

/**
 * Encodes the global terminal state into a compressed URL hash string using lz-string
 */
export function encodeStateToHash(state: TerminalState): string {
  try {
    const jsonStr = JSON.stringify(state);
    return LZString.compressToEncodedURIComponent(jsonStr);
  } catch (error) {
    console.error('Failed to compress terminal state:', error);
    return '';
  }
}

/**
 * Decodes the terminal state from an lz-string compressed hash
 */
export function decodeStateFromHash(hashString: string): TerminalState | null {
  try {
    if (!hashString) return null;
    const cleanHash = hashString.startsWith('#') ? hashString.slice(1) : hashString;
    // Strip optional "state=" prefix if present
    const payload = cleanHash.startsWith('state=') ? cleanHash.slice(6) : cleanHash;
    if (!payload) return null;

    const decompressed = LZString.decompressFromEncodedURIComponent(payload);
    if (!decompressed) return null;

    const parsed = JSON.parse(decompressed) as TerminalState;
    if (!parsed || !parsed.companyDetails || !Array.isArray(parsed.capTable)) {
      return null;
    }
    return parsed;
  } catch (error) {
    console.warn('Failed to decompress terminal state from URL, falling back to default:', error);
    return null;
  }
}

/**
 * Updates the browser URL hash without causing a page reload or router transition
 */
export function syncStateToUrl(state: TerminalState): void {
  if (typeof window === 'undefined') return;
  const compressed = encodeStateToHash(state);
  const newHash = `#state=${compressed}`;
  if (window.location.hash !== newHash) {
    window.history.replaceState(null, '', newHash);
  }
}

/**
 * Reads initial state from current window location hash, or falls back to default seed
 */
export function loadStateFromUrl(): TerminalState {
  if (typeof window === 'undefined') return DEFAULT_TERMINAL_STATE;
  const hash = window.location.hash;
  const state = decodeStateFromHash(hash);
  return state ?? DEFAULT_TERMINAL_STATE;
}
