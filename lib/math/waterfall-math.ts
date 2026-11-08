import {
  Stakeholder,
  WaterfallResponse,
  WaterfallStakeholderPayout,
} from '../types';

/**
 * Calculates deterministic stakeholder payouts for a single exit valuation scenario
 */
function calculateSingleExitPayouts(
  capTable: Stakeholder[],
  exitProceeds: number
): {
  payouts: WaterfallStakeholderPayout[];
  totalPreferredPreference: number;
  maxCrossover: number;
} {
  const totalShares = capTable.reduce((acc, curr) => acc + (Number(curr.shares) || 0), 0);
  const safeTotalShares = totalShares > 0 ? totalShares : 1;

  // Calculate total preference capital
  const preferredStakeholders = capTable.filter((s) => s.shareClass === 'Preferred');
  const totalPreferredPreference = preferredStakeholders.reduce(
    (acc, curr) => acc + (Number(curr.investmentAmount) || 0),
    0
  );

  // Equilibrium solver for 1x Non-Participating Preferred conversion
  // An investor converts to Common if pro-rata common payout > liquidation preference
  const convertedSet = new Set<string>();

  for (let iter = 0; iter < preferredStakeholders.length + 2; iter++) {
    let changed = false;

    // Sum preferences of unconverted preferred
    const unconvertedPreferenceSum = preferredStakeholders
      .filter((s) => !convertedSet.has(s.id))
      .reduce((sum, s) => sum + (Number(s.investmentAmount) || 0), 0);

    const sharesParticipating = capTable
      .filter((s) => s.shareClass === 'Common' || convertedSet.has(s.id))
      .reduce((sum, s) => sum + (Number(s.shares) || 0), 0);

    for (const pref of preferredStakeholders) {
      const prefAmount = Number(pref.investmentAmount) || 0;
      const isCurrentlyConverted = convertedSet.has(pref.id);

      const hypotheticalShares = isCurrentlyConverted
        ? sharesParticipating
        : sharesParticipating + (Number(pref.shares) || 0);

      const proRataPayout =
        hypotheticalShares > 0
          ? ((Number(pref.shares) || 0) / hypotheticalShares) *
            Math.max(0, exitProceeds - (unconvertedPreferenceSum - (isCurrentlyConverted ? 0 : prefAmount)))
          : 0;

      const shouldConvert = proRataPayout > prefAmount;

      if (shouldConvert && !isCurrentlyConverted) {
        convertedSet.add(pref.id);
        changed = true;
      } else if (!shouldConvert && isCurrentlyConverted) {
        convertedSet.delete(pref.id);
        changed = true;
      }
    }

    if (!changed) break;
  }

  // Final distribution calculation
  const finalUnconvertedPreferences = preferredStakeholders
    .filter((s) => !convertedSet.has(s.id))
    .reduce((sum, s) => sum + (Number(s.investmentAmount) || 0), 0);

  const preferenceCoverageRatio =
    finalUnconvertedPreferences > 0
      ? Math.min(1, exitProceeds / finalUnconvertedPreferences)
      : 1;

  const proceedsAfterPreferences = Math.max(
    0,
    exitProceeds - finalUnconvertedPreferences
  );

  const totalParticipatingShares = capTable
    .filter((s) => s.shareClass === 'Common' || convertedSet.has(s.id))
    .reduce((sum, s) => sum + (Number(s.shares) || 0), 0);

  const payouts: WaterfallStakeholderPayout[] = capTable.map((stk) => {
    const shares = Number(stk.shares) || 0;
    const invested = Number(stk.investmentAmount) || 0;
    const ownershipPercent = (shares / safeTotalShares) * 100;

    let preferencePayout = 0;
    let commonPayout = 0;
    const isPreferred = stk.shareClass === 'Preferred';
    const isConverted = convertedSet.has(stk.id);

    if (isPreferred && !isConverted) {
      preferencePayout = invested * preferenceCoverageRatio;
      commonPayout = 0;
    } else {
      preferencePayout = 0;
      if (totalParticipatingShares > 0 && proceedsAfterPreferences > 0) {
        commonPayout = (shares / totalParticipatingShares) * proceedsAfterPreferences;
      }
    }

    const totalPayout = preferencePayout + commonPayout;
    const moic = invested > 0 ? totalPayout / invested : 0;

    return {
      stakeholderId: stk.id,
      name: stk.name,
      shareClass: stk.shareClass,
      invested,
      ownershipPercent: Number(ownershipPercent.toFixed(2)),
      preferencePayout: Math.round(preferencePayout),
      commonPayout: Math.round(commonPayout),
      totalPayout: Math.round(totalPayout),
      convertedToCommon: isConverted,
      moic: Number(moic.toFixed(2)),
    };
  });

  // Calculate global crossover valuation (where every preferred converts)
  let maxCrossover = 0;
  preferredStakeholders.forEach((pref) => {
    const shares = Number(pref.shares) || 0;
    const invested = Number(pref.investmentAmount) || 0;
    const ownership = safeTotalShares > 0 ? shares / safeTotalShares : 0;
    if (ownership > 0 && invested > 0) {
      const co = invested / ownership;
      if (co > maxCrossover) maxCrossover = co;
    }
  });

  return {
    payouts,
    totalPreferredPreference,
    maxCrossover,
  };
}

export function calculateWaterfall(
  capTable: Stakeholder[],
  exitValuation: number
): WaterfallResponse {
  const exitProceeds = Math.max(0, Number(exitValuation) || 0);

  const primaryResult = calculateSingleExitPayouts(capTable, exitProceeds);

  // Generate multi-scenario data for Recharts Stacked Bar visualization
  const scenarios = [
    Math.round(primaryResult.totalPreferredPreference * 0.5),
    Math.round(primaryResult.totalPreferredPreference * 1.0),
    Math.round(primaryResult.maxCrossover * 0.75),
    Math.round(primaryResult.maxCrossover * 1.5),
    Math.round(exitProceeds),
  ]
    .filter((v, idx, arr) => v > 0 && arr.indexOf(v) === idx)
    .sort((a, b) => a - b);

  const chartData = scenarios.map((scenarioVal) => {
    const scenarioResult = calculateSingleExitPayouts(capTable, scenarioVal);
    const row: { [key: string]: string | number } = {
      name: `$${(scenarioVal / 1_000_000).toFixed(1)}M`,
    };

    scenarioResult.payouts.forEach((p) => {
      row[p.name] = p.totalPayout;
    });

    return row as { name: string; [stakeholderName: string]: string | number };
  });

  return {
    exitValuation: exitProceeds,
    totalPreferredPreference: primaryResult.totalPreferredPreference,
    crossoverValuation: Math.round(primaryResult.maxCrossover),
    payouts: primaryResult.payouts,
    chartData,
  };
}
