import { TerminalState, Stakeholder } from './types';

export type StartupStage = 'pre-seed' | 'seed' | 'series-a' | 'growth';

/**
 * Pre-Seed Stage Preset:
 * 2 Founders + 1.5M Option Pool + 2 Early SAFEs
 */
export function generatePreSeedState(): TerminalState {
  return {
    version: 1,
    companyDetails: {
      companyName: 'NovaAI Labs (Pre-Seed)',
      totalAuthorizedShares: 15_000_000,
      targetSeriesAValuation: 12_000_000,
      seriesANewMoney: 2_500_000,
    },
    capTable: [
      {
        id: 'ps-f1',
        name: 'Sarah Chen (CEO & Co-Founder)',
        shareClass: 'Common',
        shares: 5_000_000,
        investmentAmount: 5_000,
      },
      {
        id: 'ps-f2',
        name: 'David Kim (CTO & Co-Founder)',
        shareClass: 'Common',
        shares: 4_000_000,
        investmentAmount: 4_000,
      },
      {
        id: 'ps-pool',
        name: 'Unallocated Option Pool (10%)',
        shareClass: 'Common',
        shares: 1_000_000,
        investmentAmount: 0,
      },
    ],
    safes: [
      {
        id: 'safe-ps-1',
        investor: 'Y Combinator (W24 SAFE)',
        amount: 125_000,
        valuationCap: 8_000_000,
        discount: 0,
        type: 'Post-Money',
      },
      {
        id: 'safe-ps-2',
        investor: 'First Check Angels Syndicate',
        amount: 250_000,
        valuationCap: 10_000_000,
        discount: 0.20,
        type: 'Post-Money',
      },
    ],
    params409A: {
      stockPrice: 1.00,
      strikePrice: 1.00,
      timeToExit: 3.0,
      riskFreeRate: 0.045,
      volatility: 0.70,
    },
    waterfallParams: {
      exitValuation: 20_000_000,
    },
  };
}

/**
 * Series Seed Stage Preset:
 * Founders + Early Angels + Seed Preferred VC Fund + SAFEs
 */
export function generateSeedState(): TerminalState {
  return {
    version: 1,
    companyDetails: {
      companyName: 'Apex Robotics Inc. (Series Seed)',
      totalAuthorizedShares: 15_000_000,
      targetSeriesAValuation: 20_000_000,
      seriesANewMoney: 4_000_000,
    },
    capTable: [
      {
        id: 'stk-1',
        name: 'Elena Rostova (CEO & Founder)',
        shareClass: 'Common',
        shares: 4_500_000,
        investmentAmount: 4_500,
      },
      {
        id: 'stk-2',
        name: 'Marcus Vance (CTO & Founder)',
        shareClass: 'Common',
        shares: 3_500_000,
        investmentAmount: 3_500,
      },
      {
        id: 'stk-3',
        name: 'Employee Option Pool',
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
}

/**
 * Series A Stage Preset:
 * Founders + Option Pool + Seed Preferred + Series A Lead + Multiple SAFEs
 */
export function generateSeriesAState(): TerminalState {
  return {
    version: 1,
    companyDetails: {
      companyName: 'Lumina Cloud Security (Series A)',
      totalAuthorizedShares: 25_000_000,
      targetSeriesAValuation: 40_000_000,
      seriesANewMoney: 10_000_000,
    },
    capTable: [
      { id: 'sa-f1', name: 'Alex Rivera (CEO)', shareClass: 'Common', shares: 6_000_000, investmentAmount: 6_000 },
      { id: 'sa-f2', name: 'Priya Sharma (CTO)', shareClass: 'Common', shares: 4_500_000, investmentAmount: 4_500 },
      { id: 'sa-pool', name: 'Employee Option Pool (Expanded)', shareClass: 'Common', shares: 2_000_000, investmentAmount: 0 },
      { id: 'sa-seed', name: 'Founders Fund Seed', shareClass: 'Preferred', shares: 2_000_000, investmentAmount: 2_500_000 },
      { id: 'sa-lead', name: 'Benchmark Capital (Series A Lead)', shareClass: 'Preferred', shares: 3_500_000, investmentAmount: 10_000_000 },
    ],
    safes: [
      { id: 'safe-sa-1', investor: 'Strategic Enterprise Angels', amount: 750_000, valuationCap: 25_000_000, discount: 0.15, type: 'Post-Money' },
      { id: 'safe-sa-2', investor: 'Techstars Accelerator Fund', amount: 250_000, valuationCap: 18_000_000, discount: 0, type: 'Post-Money' },
    ],
    params409A: {
      stockPrice: 6.25,
      strikePrice: 6.25,
      timeToExit: 3.0,
      riskFreeRate: 0.045,
      volatility: 0.60,
    },
    waterfallParams: {
      exitValuation: 120_000_000,
    },
  };
}

/**
 * Growth Stage (Series B / 80+ Investors) Preset:
 * Institutional Lead + Syndicate + 34 Employees + Angels + Seed Funds
 */
export function generateSeriesBState(): TerminalState {
  const capTable: Stakeholder[] = [
    { id: 'f-1', name: 'Elena Rostova (CEO & Founder)', shareClass: 'Common', shares: 8_000_000, investmentAmount: 8_000 },
    { id: 'f-2', name: 'Marcus Vance (CTO & Founder)', shareClass: 'Common', shares: 6_000_000, investmentAmount: 6_000 },
    { id: 'pool', name: 'Employee Option Pool (Unallocated)', shareClass: 'Common', shares: 3_500_000, investmentAmount: 0 },
  ];

  // 10 Seed Angels
  for (let i = 1; i <= 10; i++) {
    capTable.push({
      id: `seed-angel-${i}`,
      name: `Seed Angel #${i}`,
      shareClass: 'Common',
      shares: 100_000,
      investmentAmount: 50_000,
    });
  }

  // 2 Seed Venture Funds
  capTable.push(
    { id: 'seed-fund-1', name: 'First Round Seed Capital', shareClass: 'Preferred', shares: 1_200_000, investmentAmount: 1_500_000 },
    { id: 'seed-fund-2', name: 'SV Seed Partners', shareClass: 'Preferred', shares: 800_000, investmentAmount: 1_000_000 }
  );

  // Series A Lead + 10 Syndicate Members
  capTable.push({ id: 'series-a-lead', name: 'Sequoia Growth Fund XI (Series A Lead)', shareClass: 'Preferred', shares: 4_500_000, investmentAmount: 12_000_000 });
  for (let i = 1; i <= 10; i++) {
    capTable.push({
      id: `series-a-syn-${i}`,
      name: `Series A Syndicate #${i}`,
      shareClass: 'Preferred',
      shares: 150_000,
      investmentAmount: 400_000,
    });
  }

  // Series B Lead + 20 Syndicate Members / Sovereign Wealth
  capTable.push({ id: 'series-b-lead', name: 'Andreessen Horowitz (Series B Lead)', shareClass: 'Preferred', shares: 6_000_000, investmentAmount: 30_000_000 });
  for (let i = 1; i <= 20; i++) {
    capTable.push({
      id: `series-b-syn-${i}`,
      name: `Series B Co-Investor #${i}`,
      shareClass: 'Preferred',
      shares: 200_000,
      investmentAmount: 1_000_000,
    });
  }

  // 34 Key Employees with Exercised Options
  for (let i = 1; i <= 34; i++) {
    capTable.push({
      id: `emp-${i}`,
      name: `Staff Member #${i} (Exercised Options)`,
      shareClass: 'Common',
      shares: 45_000,
      investmentAmount: 4_500,
    });
  }

  return {
    version: 1,
    companyDetails: {
      companyName: 'OmniAI Autonomous Systems Inc. (Growth Stage)',
      totalAuthorizedShares: 50_000_000,
      targetSeriesAValuation: 85_000_000,
      seriesANewMoney: 20_000_000,
    },
    capTable,
    safes: [
      { id: 'safe-1', investor: 'Y Combinator W21 SAFE', amount: 500_000, valuationCap: 20_000_000, discount: 0, type: 'Post-Money' },
      { id: 'safe-2', investor: 'Strategic AI Venture Fund', amount: 2_500_000, valuationCap: 45_000_000, discount: 0.15, type: 'Pre-Money' },
    ],
    params409A: {
      stockPrice: 15.50,
      strikePrice: 15.50,
      timeToExit: 3.5,
      riskFreeRate: 0.045,
      volatility: 0.65,
    },
    waterfallParams: {
      exitValuation: 350_000_000,
    },
  };
}
