import { describe, it, expect } from 'vitest';
import { parseCapTableCsv } from '../csv-parser';

describe('FIX 8: Bring Your Old Data Import Validation', () => {
  it('successfully imports valid cap table with comma thousands-separators and currency symbols', () => {
    const csv = `Alex Founder, Common, 6,000,000, $6,000
Jamie CoFounder, Common, 4,000,000, $4,000
Test Angel, Preferred, 500,000, $500,000`;

    const result = parseCapTableCsv(csv);
    expect(result.success).toBe(true);
    expect(result.errors.length).toBe(0);
    expect(result.stakeholders.length).toBe(3);

    expect(result.stakeholders[0].shares).toBe(6_000_000);
    expect(result.stakeholders[0].investmentAmount).toBe(6_000);

    expect(result.stakeholders[1].shares).toBe(4_000_000);
    expect(result.stakeholders[1].investmentAmount).toBe(4_000);

    expect(result.stakeholders[2].shares).toBe(500_000);
    expect(result.stakeholders[2].investmentAmount).toBe(500_000);

    expect(result.totalShares).toBe(10_500_000);
    expect(result.totalInvested).toBe(510_000);
  });

  it('validates total shares against a Total row and succeeds when they match', () => {
    const csv = `Stakeholder Name,Share Class,Shares,Investment Amount
Elena Rostova,Common,4500000,$4500
Marcus Vance,Common,3500000,$3500
Employee Option Pool,Common,1000000,$0
Northgate Seed Partners,Preferred,1000000,$1500000
Total,Common,10000000,$1508000`;

    const result = parseCapTableCsv(csv);
    expect(result.success).toBe(true);
    expect(result.errors.length).toBe(0);
    expect(result.totalShares).toBe(10_000_000);
    expect(result.stakeholders.length).toBe(4);
  });

  it('rejects import and reports specific row when total shares does not equal sum of holder shares', () => {
    const csv = `Stakeholder Name,Share Class,Shares,Investment Amount
Elena Rostova,Common,4500000,$4500
Marcus Vance,Common,3500000,$3500
Employee Option Pool,Common,1000000,$0
Northgate Seed Partners,Preferred,1000000,$1500000
Total,Common,12000000,$1508000`; // Stated 12M vs actual 10M

    const result = parseCapTableCsv(csv);
    expect(result.success).toBe(false);
    expect(result.stakeholders.length).toBe(0); // Data must NOT be loaded
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('Total shares mismatch');
    expect(result.errors[0]).toContain('Row 6 ("Total")');
    expect(result.errors[0]).toContain('12,000,000');
    expect(result.errors[0]).toContain('10,000,000');
  });

  it('validates explicit ownership column and succeeds when it sums to 100.00% (within 0.01% tolerance)', () => {
    const csv = `Stakeholder Name,Share Class,Shares,Investment Amount,Ownership %
Elena Rostova,Common,4500000,$4500,45.00%
Marcus Vance,Common,3500000,$3500,35.00%
Employee Option Pool,Common,1000000,$0,10.00%
Northgate Seed Partners,Preferred,1000000,$1500000,10.00%`;

    const result = parseCapTableCsv(csv);
    expect(result.success).toBe(true);
    expect(result.errors.length).toBe(0);
    expect(result.stakeholders.length).toBe(4);
  });

  it('rejects import and reports problematic rows when ownership column does not sum to 100.00%', () => {
    const csv = `Stakeholder Name,Share Class,Shares,Investment Amount,Ownership %
Elena Rostova,Common,4500000,$4500,45.00%
Marcus Vance,Common,3500000,$3500,35.00%
Employee Option Pool,Common,1000000,$0,10.00%
Northgate Seed Partners,Preferred,1000000,$1500000,5.00%`; // Sums to 95.00%

    const result = parseCapTableCsv(csv);
    expect(result.success).toBe(false);
    expect(result.stakeholders.length).toBe(0); // Data must NOT be loaded
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('Ownership percentages sum to 95.00% instead of 100.00%');
    expect(result.errors[0]).toContain('Row 5 ("Northgate Seed Partners")');
  });

  it('rejects import when a row contains an invalid non-positive share count and reports the row', () => {
    const csv = `Elena Rostova, Common, 4500000, 4500
Broken Holder, Common, 0, 0
Northgate Seed Partners, Preferred, 1000000, 1500000`;

    const result = parseCapTableCsv(csv);
    expect(result.success).toBe(false);
    expect(result.stakeholders.length).toBe(0);
    expect(result.errors.some((e) => e.includes('Row 2') && e.includes('Broken Holder'))).toBe(true);
  });
});
