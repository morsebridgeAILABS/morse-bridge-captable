export interface RoleEquityBenchmark {
  role: string;
  defaultPct: number;
  seniority: 'Executive' | 'Lead' | 'Senior' | 'Core';
}

export const STANDARD_HIRING_BENCHMARKS: RoleEquityBenchmark[] = [
  { role: 'VP of Engineering', defaultPct: 1.25, seniority: 'Executive' },
  { role: 'VP of Sales / CRO', defaultPct: 1.25, seniority: 'Executive' },
  { role: 'Head of Product', defaultPct: 0.90, seniority: 'Executive' },
  { role: 'Principal Architect / Staff Eng', defaultPct: 0.35, seniority: 'Lead' },
  { role: 'Lead Product Designer', defaultPct: 0.40, seniority: 'Lead' },
  { role: 'Senior Software Engineer', defaultPct: 0.18, seniority: 'Senior' },
  { role: 'Senior Growth / Marketing Lead', defaultPct: 0.25, seniority: 'Senior' },
  { role: 'Full-Stack Developer', defaultPct: 0.12, seniority: 'Core' },
];

export interface PlannedHire {
  id: string;
  role: string;
  equityPct: number;
}

export function calculateOptionPoolRunway(
  totalAuthorizedShares: number,
  unallocatedPoolShares: number,
  plannedHires: PlannedHire[]
) {
  const currentPoolPct =
    totalAuthorizedShares > 0 ? (unallocatedPoolShares / totalAuthorizedShares) * 100 : 0;

  const totalAllocatedToHiresPct = plannedHires.reduce((sum, h) => sum + h.equityPct, 0);
  const remainingPoolPct = Math.max(0, currentPoolPct - totalAllocatedToHiresPct);
  const remainingPoolShares = Math.round((remainingPoolPct / 100) * totalAuthorizedShares);

  const isOverallocated = totalAllocatedToHiresPct > currentPoolPct;
  const shortfallPct = isOverallocated ? totalAllocatedToHiresPct - currentPoolPct : 0;

  return {
    currentPoolPct: Number(currentPoolPct.toFixed(2)),
    totalAllocatedToHiresPct: Number(totalAllocatedToHiresPct.toFixed(2)),
    remainingPoolPct: Number(remainingPoolPct.toFixed(2)),
    remainingPoolShares,
    isOverallocated,
    shortfallPct: Number(shortfallPct.toFixed(2)),
  };
}
