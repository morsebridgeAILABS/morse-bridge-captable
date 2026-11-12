import { StartupStage } from './sample-data';

export type SectorVertical =
  | 'ai'
  | 'saas'
  | 'devtools'
  | 'fintech'
  | 'healthtech'
  | 'consumer';

export type TractionTier =
  | 'pre-revenue'
  | 'early-revenue'
  | 'pmf'
  | 'scale';

export type GeographyMarket =
  | 'us-tier1'
  | 'us-standard'
  | 'europe-uk'
  | 'global';

export interface BenchmarkParams {
  stage: StartupStage;
  sector: SectorVertical;
  traction: TractionTier;
  geography: GeographyMarket;
}

export interface BenchmarkRecommendation {
  preMoneyValuation: number;
  newMoneyRaised: number;
  impliedDilutionPct: number;
  range25th: number;
  rangeMedian: number;
  range75th: number;
  recommendedSafeCap: number;
  rationale: string;
  stageName: string;
}

const STAGE_BASELINES: Record<
  StartupStage,
  {
    name: string;
    p25: number;
    median: number;
    p75: number;
    targetDilution: number;
    typicalSafeCap: number;
  }
> = {
  'pre-seed': {
    name: 'Pre-Seed',
    p25: 4_500_000,
    median: 6_500_000,
    p75: 9_000_000,
    targetDilution: 0.15,
    typicalSafeCap: 8_000_000,
  },
  'seed': {
    name: 'Series Seed',
    p25: 10_000_000,
    median: 14_000_000,
    p75: 18_500_000,
    targetDilution: 0.18,
    typicalSafeCap: 15_000_000,
  },
  'series-a': {
    name: 'Series A',
    p25: 28_000_000,
    median: 40_000_000,
    p75: 55_000_000,
    targetDilution: 0.20,
    typicalSafeCap: 35_000_000,
  },
  'growth': {
    name: 'Growth (Series B+)',
    p25: 80_000_000,
    median: 115_000_000,
    p75: 160_000_000,
    targetDilution: 0.18,
    typicalSafeCap: 100_000_000,
  },
};

const SECTOR_MULTIPLIERS: Record<SectorVertical, { name: string; multiplier: number }> = {
  ai: { name: 'AI & DeepTech', multiplier: 1.30 },
  saas: { name: 'B2B Enterprise SaaS', multiplier: 1.00 },
  devtools: { name: 'DevTools & Cyber', multiplier: 1.15 },
  fintech: { name: 'FinTech & Payments', multiplier: 1.05 },
  healthtech: { name: 'HealthTech & Bio', multiplier: 1.10 },
  consumer: { name: 'Consumer & Marketplace', multiplier: 0.85 },
};

const TRACTION_MULTIPLIERS: Record<TractionTier, { name: string; multiplier: number }> = {
  'pre-revenue': { name: 'Pre-Revenue / MVP', multiplier: 1.00 },
  'early-revenue': { name: 'Early Revenue (<$250k ARR)', multiplier: 1.20 },
  'pmf': { name: 'Product-Market Fit ($250k–$1M ARR)', multiplier: 1.45 },
  'scale': { name: 'Scaling ($1M+ ARR)', multiplier: 1.80 },
};

const GEO_MULTIPLIERS: Record<GeographyMarket, { name: string; multiplier: number }> = {
  'us-tier1': { name: 'US Tier 1 (SF / NYC)', multiplier: 1.10 },
  'us-standard': { name: 'US Standard / Remote', multiplier: 1.00 },
  'europe-uk': { name: 'Europe / UK', multiplier: 0.85 },
  'global': { name: 'Global / Emerging', multiplier: 0.70 },
};

export const BENCHMARK_SECTORS = SECTOR_MULTIPLIERS;
export const BENCHMARK_TRACTIONS = TRACTION_MULTIPLIERS;
export const BENCHMARK_GEOS = GEO_MULTIPLIERS;

export function calculateBenchmarkRecommendation(
  params: BenchmarkParams
): BenchmarkRecommendation {
  const base = STAGE_BASELINES[params.stage] || STAGE_BASELINES['seed'];
  const sector = SECTOR_MULTIPLIERS[params.sector] || SECTOR_MULTIPLIERS.saas;
  const traction = TRACTION_MULTIPLIERS[params.traction] || TRACTION_MULTIPLIERS['pre-revenue'];
  const geo = GEO_MULTIPLIERS[params.geography] || GEO_MULTIPLIERS['us-standard'];

  const compositeMultiplier = sector.multiplier * traction.multiplier * geo.multiplier;

  // Rounding helper to clean $250k or $500k increments
  const roundIncrement = base.median >= 50_000_000 ? 1_000_000 : 500_000;
  const preMoneyValuation = Math.max(
    500_000,
    Math.round((base.median * compositeMultiplier) / roundIncrement) * roundIncrement
  );

  const range25th = Math.max(
    500_000,
    Math.round((base.p25 * compositeMultiplier) / roundIncrement) * roundIncrement
  );

  const range75th = Math.max(
    range25th + roundIncrement,
    Math.round((base.p75 * compositeMultiplier) / roundIncrement) * roundIncrement
  );

  const checkRounding = base.median >= 50_000_000 ? 500_000 : 250_000;
  const newMoneyRaised = Math.max(
    100_000,
    Math.round((preMoneyValuation * base.targetDilution) / checkRounding) * checkRounding
  );

  const impliedDilutionPct = Number(
    ((newMoneyRaised / (preMoneyValuation + newMoneyRaised)) * 100).toFixed(1)
  );

  const recommendedSafeCap = Math.max(
    500_000,
    Math.round((base.typicalSafeCap * compositeMultiplier) / roundIncrement) * roundIncrement
  );

  const rationale = `Based on illustrative venture market benchmarks, ${base.name} rounds in ${sector.name} with ${traction.name} (${geo.name}) typically price at a median pre-money of $${(preMoneyValuation / 1_000_000).toFixed(1)}M (25th–75th percentile: $${(range25th / 1_000_000).toFixed(1)}M – $${(range75th / 1_000_000).toFixed(1)}M) for a $${(newMoneyRaised / 1_000_000).toFixed(1)}M lead investment.`;

  return {
    preMoneyValuation,
    newMoneyRaised,
    impliedDilutionPct,
    range25th,
    rangeMedian: preMoneyValuation,
    range75th,
    recommendedSafeCap,
    rationale,
    stageName: base.name,
  };
}
