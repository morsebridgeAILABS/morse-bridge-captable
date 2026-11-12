import { describe, it, expect } from 'vitest';
import { convertSafesAtRound, calculateSafeConversion } from '../math/safe-math';
import { SafeNote, Stakeholder, CompanyDetails } from '../types';
import { DEFAULT_TERMINAL_STATE } from '../state';

describe('FIX 2: SAFE Conversions at Priced Round', () => {
  it('Test A: One $500,000 SAFE at a $5,000,000 post-money cap on 9,000,000 shares', () => {
    // Test A hand-worked:
    // Capitalization before conversion is 9,000,000 shares (founders plus pool).
    // One $500,000 SAFE at a $5,000,000 post-money cap converts to 10% of post-conversion capitalization.
    // Receives 1,000,000 shares (9,000,000 x 0.10 / 0.90).
    const preConversionShares = 9_000_000;
    const safes: SafeNote[] = [
      {
        id: 'safe-test-a',
        investor: 'Angel A',
        amount: 500_000,
        valuationCap: 5_000_000,
        discount: 0,
        type: 'Post-Money',
      },
    ];

    const result = convertSafesAtRound(preConversionShares, safes);

    expect(result.totalConvertedShares).toBe(1_000_000);
    expect(result.convertedStakeholders[0].shares).toBe(1_000_000);
    expect(result.postConversionSharesBeforeNewMoney).toBe(10_000_000);

    // Ownership of SAFE holder in post-conversion capitalization before new money:
    const safeOwnership = (result.convertedStakeholders[0].shares / result.postConversionSharesBeforeNewMoney) * 100;
    expect(safeOwnership).toBe(10);
  });

  it('Test B: Two SAFEs, each $500,000 at a $5,000,000 post-money cap on 9,000,000 shares', () => {
    // Test B hand-worked:
    // Two SAFEs, each $500,000 at a $5,000,000 post-money cap, on the same 9,000,000 shares.
    // Together they own 20%, so they receive 2,250,000 shares in total (9,000,000 x 0.20 / 0.80), 1,125,000 each.
    const preConversionShares = 9_000_000;
    const safes: SafeNote[] = [
      {
        id: 'safe-test-b1',
        investor: 'Angel 1',
        amount: 500_000,
        valuationCap: 5_000_000,
        discount: 0,
        type: 'Post-Money',
      },
      {
        id: 'safe-test-b2',
        investor: 'Angel 2',
        amount: 500_000,
        valuationCap: 5_000_000,
        discount: 0,
        type: 'Post-Money',
      },
    ];

    const result = convertSafesAtRound(preConversionShares, safes);

    expect(result.totalConvertedShares).toBe(2_250_000);
    expect(result.convertedStakeholders[0].shares).toBe(1_125_000);
    expect(result.convertedStakeholders[1].shares).toBe(1_125_000);
    expect(result.postConversionSharesBeforeNewMoney).toBe(11_250_000);

    // Each SAFE owns 10%, combined 20%
    const safe1Pct = (result.convertedStakeholders[0].shares / result.postConversionSharesBeforeNewMoney) * 100;
    const safe2Pct = (result.convertedStakeholders[1].shares / result.postConversionSharesBeforeNewMoney) * 100;
    expect(safe1Pct).toBe(10);
    expect(safe2Pct).toBe(10);
    expect(safe1Pct + safe2Pct).toBe(20);
  });

  it('Pre-Money SAFE: applies more favourable of cap price and discount price (Cap price favourable case)', () => {
    // Pre-conversion shares = 9,000,000
    // Priced round PPS = $2.00 ($18,000,000 pre-money / 9,000,000 shares)
    // Pre-money SAFE: $500,000 amount, $9,000,000 cap, 10% discount
    // Cap price = $9,000,000 / 9,000,000 = $1.00 / share
    // Discount price = $2.00 * (1 - 0.10) = $1.80 / share
    // More favourable price for holder is LOWER price = $1.00 / share
    // Shares received = $500,000 / $1.00 = 500,000 shares (vs 277,778 if discount used)
    const preConversionShares = 9_000_000;
    const safes: SafeNote[] = [
      {
        id: 'safe-cap-favourable',
        investor: 'Cap Investor',
        amount: 500_000,
        valuationCap: 9_000_000,
        discount: 0.10,
        type: 'Pre-Money',
      },
    ];

    const result = convertSafesAtRound(preConversionShares, safes, 18_000_000, 2.0);
    expect(result.convertedStakeholders[0].shares).toBe(500_000);
  });

  it('Pre-Money SAFE: applies more favourable of cap price and discount price (Discount price favourable case)', () => {
    // Pre-conversion shares = 9,000,000
    // Priced round PPS = $2.00 ($18,000,000 pre-money / 9,000,000 shares)
    // Pre-money SAFE: $500,000 amount, $22,500,000 cap, 30% discount
    // Cap price = $22,500,000 / 9,000,000 = $2.50 / share
    // Discount price = $2.00 * (1 - 0.30) = $1.40 / share
    // More favourable price for holder is LOWER price = $1.40 / share
    // Shares received = Math.round($500,000 / $1.40) = 357,143 shares (vs 200,000 if cap used)
    const preConversionShares = 9_000_000;
    const safes: SafeNote[] = [
      {
        id: 'safe-discount-favourable',
        investor: 'Discount Investor',
        amount: 500_000,
        valuationCap: 22_500_000,
        discount: 0.30,
        type: 'Pre-Money',
      },
    ];

    const result = convertSafesAtRound(preConversionShares, safes, 18_000_000, 2.0);
    expect(result.convertedStakeholders[0].shares).toBe(357_143);
  });

  it('Apex Robotics sample verifies Series Seed Active SAFEs is $0 and Capital Invested is $1,508,000', () => {
    const sample = DEFAULT_TERMINAL_STATE;
    const totalSafeCapital = sample.safes.reduce((sum, s) => sum + s.amount, 0);
    const totalCapitalInvested = sample.capTable.reduce((sum, s) => sum + s.investmentAmount, 0);

    // Active SAFEs at Series Seed priced round is $0
    expect(sample.safes.length).toBe(0);
    expect(totalSafeCapital).toBe(0);

    // Capital invested includes founders ($4.5k + $3.5k) and Northgate Preferred ($1.5M) = $1,508,000
    expect(totalCapitalInvested).toBe(1_508_000);
  });
});
