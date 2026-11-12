export type ShareClass = 'Common' | 'Preferred';
export type SafeType = 'Pre-Money' | 'Post-Money';

export interface Stakeholder {
  id: string;
  name: string;
  shareClass: ShareClass;
  shares: number;
  investmentAmount: number;
  isFounder?: boolean;
}

export interface SafeNote {
  id: string;
  investor: string;
  amount: number;
  valuationCap: number; // 0 or Infinity if uncapped
  discount: number;     // e.g., 0.20 for 20%
  type: SafeType;
}

export interface CompanyDetails {
  companyName: string;
  totalAuthorizedShares: number;
  targetSeriesAValuation: number; // Pre-money valuation of Series A
  seriesANewMoney: number;        // New capital raised in Series A
}

export interface Valuation409AParams {
  stockPrice: number;     // S: Current underlying stock price ($)
  strikePrice: number;    // K: Option exercise price ($)
  timeToExit: number;     // T: Years until expected exit
  riskFreeRate: number;   // r: Risk-free rate (e.g., 0.045 for 4.5%)
  volatility: number;     // sigma: Volatility (e.g., 0.60 for 60%)
}

export interface ExitWaterfallParams {
  exitValuation: number;  // Total exit / M&A gross proceeds
}

export interface TerminalState {
  version: number;
  companyDetails: CompanyDetails;
  capTable: Stakeholder[];
  safes: SafeNote[];
  params409A: Valuation409AParams;
  waterfallParams: ExitWaterfallParams;
}

export interface SafeConversionResultStakeholder {
  id: string;
  name: string;
  shareClass: ShareClass;
  shares: number;
  investmentAmount: number;
  ownershipPercent: number;
  source: 'Original' | 'SAFE Conversion' | 'Series A';
  effectivePricePerShare: number;
}

export interface SafeBreakdownItem {
  id: string;
  investor: string;
  type: SafeType;
  amount: number;
  valuationCap: number;
  discount: number;
  impliedOwnershipPct: number;
  estimatedShares: number;
  effectivePps: number;
}

export interface SafeConversionResponse {
  dilutedCapTable: SafeConversionResultStakeholder[];
  totalShares: number;
  postMoneyValuation: number;
  seriesAPricePerShare: number;
  totalSafeDilutionPercent: number;
  safeBreakdown: SafeBreakdownItem[];
}

export interface BSMResponse {
  callPrice: number;
  d1: number;
  d2: number;
  nd1: number;
  nd2: number;
  intrinsicValue: number;
  timeValue: number;
  delta: number;
  gamma: number;
}

export interface WaterfallStakeholderPayout {
  stakeholderId: string;
  name: string;
  shareClass: ShareClass;
  invested: number;
  ownershipPercent: number;
  preferencePayout: number;
  commonPayout: number;
  totalPayout: number;
  convertedToCommon: boolean;
  moic: number; // Multiple on invested capital
}

export interface WaterfallResponse {
  exitValuation: number;
  totalPreferredPreference: number;
  crossoverValuation: number;
  payouts: WaterfallStakeholderPayout[];
  chartData: Array<{
    name: string;
    [stakeholderName: string]: string | number;
  }>;
}
