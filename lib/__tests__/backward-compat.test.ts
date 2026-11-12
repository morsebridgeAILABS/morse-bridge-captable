import { describe, it, expect } from 'vitest';
import { decodeStateFromHash, encodeStateToHash } from '../state';
import LZString from 'lz-string';

describe('Backward Compatibility & Migration: Old Share Links', () => {
  it('opens and migrates share links created before this change without data loss', () => {
    // Old terminal state structure before our changes:
    // 1. Used "Vanguard Seed Fund (Series Seed)"
    // 2. Lacked isFounder flag in Stakeholder model
    const oldState = {
      version: 1,
      companyDetails: {
        companyName: 'Apex Robotics Inc.',
        totalAuthorizedShares: 15_000_000,
        targetSeriesAValuation: 25_000_000,
        seriesANewMoney: 5_000_000,
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
      safes: [],
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

    // Encode with lz-string as older share link would have done
    const oldCompressed = LZString.compressToEncodedURIComponent(JSON.stringify(oldState));
    const oldUrlHash = `#state=${oldCompressed}`;

    // Decode using current decoder
    const decoded = decodeStateFromHash(oldUrlHash);
    expect(decoded).not.toBeNull();
    if (!decoded) return;

    // Verify 1: Vanguard Seed Fund is migrated to Northgate Seed Partners
    const northgate = decoded.capTable.find((s) => s.id === 'stk-4');
    expect(northgate?.name).toBe('Northgate Seed Partners (Series Seed)');
    expect(decoded.capTable.some((s) => s.name.includes('Vanguard'))).toBe(false);

    // Verify 2: isFounder is migrated cleanly
    const elena = decoded.capTable.find((s) => s.id === 'stk-1');
    const marcus = decoded.capTable.find((s) => s.id === 'stk-2');
    const pool = decoded.capTable.find((s) => s.id === 'stk-3');

    expect(elena?.isFounder).toBe(true);
    expect(marcus?.isFounder).toBe(true);
    expect(pool?.isFounder).toBe(false);
    expect(northgate?.isFounder).toBe(false);

    // Verify 3: Total shares and founder ownership calculate accurately on migrated state
    const totalShares = decoded.capTable.reduce((sum, s) => sum + s.shares, 0);
    const founderShares = decoded.capTable
      .filter((s) => s.isFounder === true)
      .reduce((sum, s) => sum + s.shares, 0);

    expect(totalShares).toBe(10_000_000);
    expect(founderShares).toBe(8_000_000);
    expect(((founderShares / totalShares) * 100).toFixed(2)).toBe('80.00');
  });
});
