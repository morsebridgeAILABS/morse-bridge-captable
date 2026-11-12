import { describe, it, expect } from 'vitest';
import { calculateWaterfall } from '../math/waterfall-math';
import { Stakeholder } from '../types';

describe('FIX 7: Exit Waterfall 1x Non-Participating Preferred', () => {
  // Post-Fix-2 Series Seed Cap Table for Apex Robotics:
  // Elena Rostova: 4,500,000 shares Common ($4,500 invested) -> 45%
  // Marcus Vance: 3,500,000 shares Common ($3,500 invested) -> 35%
  // Employee Option Pool: 1,000,000 shares Common ($0 invested) -> 10%
  // Northgate Seed Partners: 1,000,000 shares Preferred ($1,500,000 invested) -> 10%
  // Total: 10,000,000 shares
  const postFix2CapTable: Stakeholder[] = [
    { id: 'stk-1', name: 'Elena Rostova (CEO & Co-Founder)', shareClass: 'Common', shares: 4_500_000, investmentAmount: 4_500, isFounder: true },
    { id: 'stk-2', name: 'Marcus Vance (CTO & Co-Founder)', shareClass: 'Common', shares: 3_500_000, investmentAmount: 3_500, isFounder: true },
    { id: 'stk-3', name: 'Employee Option Pool (Unallocated)', shareClass: 'Common', shares: 1_000_000, investmentAmount: 0, isFounder: false },
    { id: 'stk-4', name: 'Northgate Seed Partners (Series Seed)', shareClass: 'Preferred', shares: 1_000_000, investmentAmount: 1_500_000, isFounder: false },
  ];

  it('Test A: Exit value $10,000,000 (Northgate takes $1,500,000 preference; remaining $8,500,000 goes pro rata to other holders)', () => {
    // Working:
    // Exit proceeds = $10,000,000.
    // Northgate holds 1,000,000 of 10,000,000 shares = 10% as-converted.
    // As-converted pro-rata payout = 10% * $10,000,000 = $1,000,000.
    // Liquidation preference = $1,500,000.
    // Since $1,000,000 < $1,500,000, Northgate does NOT convert and exercises its 1x liquidation preference of $1,500,000.
    // Remaining proceeds after preferences = $10,000,000 - $1,500,000 = $8,500,000.
    // Remaining participating shares = 4,500,000 + 3,500,000 + 1,000,000 = 9,000,000.
    // Payouts:
    // Elena: (4.5M / 9.0M) * $8.5M = $4,250,000
    // Marcus: (3.5M / 9.0M) * $8.5M = $3,305,556
    // Option Pool: (1.0M / 9.0M) * $8.5M = $944,444
    // Northgate: $1,500,000
    // Total distributed = $4,250,000 + $3,305,556 + $944,444 + $1,500,000 = $10,000,000.
    const exitValuation = 10_000_000;
    const result = calculateWaterfall(postFix2CapTable, exitValuation);

    const elena = result.payouts.find((p) => p.name.includes('Elena'));
    const marcus = result.payouts.find((p) => p.name.includes('Marcus'));
    const pool = result.payouts.find((p) => p.name.includes('Option Pool'));
    const northgate = result.payouts.find((p) => p.name.includes('Northgate'));

    expect(northgate?.convertedToCommon).toBe(false);
    expect(northgate?.preferencePayout).toBe(1_500_000);
    expect(northgate?.commonPayout).toBe(0);
    expect(northgate?.totalPayout).toBe(1_500_000);

    expect(elena?.totalPayout).toBe(4_250_000);
    expect(marcus?.totalPayout).toBe(3_305_556);
    expect(pool?.totalPayout).toBe(944_444);

    const sumTotal = (elena?.totalPayout || 0) + (marcus?.totalPayout || 0) + (pool?.totalPayout || 0) + (northgate?.totalPayout || 0);
    expect(sumTotal).toBe(10_000_000);
  });

  it('Test B: Exit value $30,000,000 (Northgate converts to common; as-converted $3,000,000 exceeds preference)', () => {
    // Working:
    // Exit proceeds = $30,000,000.
    // Northgate holds 1,000,000 of 10,000,000 shares = 10% as-converted.
    // As-converted pro-rata payout = 10% * $30,000,000 = $3,000,000.
    // Liquidation preference = $1,500,000.
    // Since $3,000,000 > $1,500,000, Northgate converts to Common stock.
    // Remaining unconverted preferences = $0.
    // All 10,000,000 shares participate pro rata in $30,000,000:
    // Elena (45%): $13,500,000
    // Marcus (35%): $10,500,000
    // Option Pool (10%): $3,000,000
    // Northgate (10%): $3,000,000
    // Total distributed = $13.5M + $10.5M + $3.0M + $3.0M = $30,000,000.
    const exitValuation = 30_000_000;
    const result = calculateWaterfall(postFix2CapTable, exitValuation);

    const elena = result.payouts.find((p) => p.name.includes('Elena'));
    const marcus = result.payouts.find((p) => p.name.includes('Marcus'));
    const pool = result.payouts.find((p) => p.name.includes('Option Pool'));
    const northgate = result.payouts.find((p) => p.name.includes('Northgate'));

    expect(northgate?.convertedToCommon).toBe(true);
    expect(northgate?.preferencePayout).toBe(0);
    expect(northgate?.commonPayout).toBe(3_000_000);
    expect(northgate?.totalPayout).toBe(3_000_000);

    expect(elena?.totalPayout).toBe(13_500_000);
    expect(marcus?.totalPayout).toBe(10_500_000);
    expect(pool?.totalPayout).toBe(3_000_000);

    const sumTotal = (elena?.totalPayout || 0) + (marcus?.totalPayout || 0) + (pool?.totalPayout || 0) + (northgate?.totalPayout || 0);
    expect(sumTotal).toBe(30_000_000);
  });
});
