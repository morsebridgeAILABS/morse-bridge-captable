import { describe, it, expect } from 'vitest';
import { DEFAULT_TERMINAL_STATE } from '../state';
import { generateSeedState } from '../sample-data';

describe('FIX 1: Founders Retain Metric', () => {
  it('correctly calculates founder ownership for the Apex Robotics sample at 80.00% with 8,000,000 founder shares', () => {
    const sample = DEFAULT_TERMINAL_STATE;
    const totalIssuedShares = sample.capTable.reduce((acc, curr) => acc + (Number(curr.shares) || 0), 0);

    // Rule: founder ownership = shares held by stakeholders tagged as founders / total issued shares.
    // Unallocated option pool must NOT be counted as founder ownership.
    const founders = sample.capTable.filter(
      (s) =>
        s.isFounder === true ||
        (s.isFounder === undefined &&
          (s.name.toLowerCase().includes('founder') ||
            s.name.toLowerCase().includes('ceo') ||
            s.name.toLowerCase().includes('cto')) &&
          !s.name.toLowerCase().includes('pool') &&
          !s.name.toLowerCase().includes('option'))
    );

    const founderShares = founders.reduce((acc, curr) => acc + (Number(curr.shares) || 0), 0);
    const founderPct = totalIssuedShares > 0 ? (founderShares / totalIssuedShares) * 100 : 0;
    const founderPctFormatted = founderPct.toFixed(2);
    const subtitle = `${founderShares.toLocaleString()} founder shares`;

    expect(totalIssuedShares).toBe(10_000_000);
    expect(founderShares).toBe(8_000_000);
    expect(founderPctFormatted).toBe('80.00');
    expect(subtitle).toBe('8,000,000 founder shares');

    // Elena and Marcus are founders, pool and Northgate are not
    const elena = sample.capTable.find((s) => s.name.includes('Elena Rostova'));
    const marcus = sample.capTable.find((s) => s.name.includes('Marcus Vance'));
    const pool = sample.capTable.find((s) => s.name.includes('Option Pool'));
    const northgate = sample.capTable.find((s) => s.name.includes('Northgate Seed Partners'));

    expect(elena?.isFounder).toBe(true);
    expect(marcus?.isFounder).toBe(true);
    expect(pool?.isFounder).toBe(false);
    expect(northgate?.isFounder).toBe(false);
  });

  it('verifies generateSeedState matches the same 80.00% and 8,000,000 founder shares', () => {
    const seedState = generateSeedState();
    const totalIssuedShares = seedState.capTable.reduce((acc, curr) => acc + (Number(curr.shares) || 0), 0);
    const founders = seedState.capTable.filter((s) => s.isFounder === true);
    const founderShares = founders.reduce((acc, curr) => acc + (Number(curr.shares) || 0), 0);
    const founderPct = (founderShares / totalIssuedShares) * 100;

    expect(totalIssuedShares).toBe(10_000_000);
    expect(founderShares).toBe(8_000_000);
    expect(founderPct.toFixed(2)).toBe('80.00');
  });
});
