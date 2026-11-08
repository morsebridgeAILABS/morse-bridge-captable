export interface TermSheetOffer {
  leadInvestor: string;
  preMoneyValuation: number;
  investmentAmount: number;
  targetOptionPoolPct: number; // e.g. 0.15 for 15%
  poolTiming: 'Pre-Money' | 'Post-Money';
}

export interface TermSheetComparisonResult {
  offerA: {
    effectiveValuation: number;
    founderOwnershipPct: number;
    investorOwnershipPct: number;
    poolExpansionShares: number;
    pricePerShare: number;
  };
  offerB: {
    effectiveValuation: number;
    founderOwnershipPct: number;
    investorOwnershipPct: number;
    poolExpansionShares: number;
    pricePerShare: number;
  };
  founderEquityDeltaPct: number; // Positive means Offer A preserves more, negative means Offer B
  equityValueDeltaDollar: number;
  verdict: string;
}

export function compareTermSheets(
  currentFounderShares: number,
  totalExistingShares: number,
  offerA: TermSheetOffer,
  offerB: TermSheetOffer
): TermSheetComparisonResult {
  function evaluateOffer(offer: TermSheetOffer) {
    const postMoneyVal = offer.preMoneyValuation + offer.investmentAmount;
    const investorPct = (offer.investmentAmount / postMoneyVal);
    
    // In standard pre-money pool shuffle, the pool expansion is created before new money:
    // New total pre-round shares = existingShares / (1 - targetOptionPoolPct)
    let poolShares = 0;
    let preRoundShares = totalExistingShares;
    
    if (offer.poolTiming === 'Pre-Money' && offer.targetOptionPoolPct > 0) {
      preRoundShares = totalExistingShares / (1 - offer.targetOptionPoolPct);
      poolShares = preRoundShares - totalExistingShares;
    }

    const pps = offer.preMoneyValuation / preRoundShares;
    const investorShares = Math.round(offer.investmentAmount / (pps > 0 ? pps : 1));
    const totalPostShares = preRoundShares + investorShares;

    const founderPct = totalPostShares > 0 ? (currentFounderShares / totalPostShares) * 100 : 0;
    const finalInvestorPct = totalPostShares > 0 ? (investorShares / totalPostShares) * 100 : 0;

    // Effective pre-money accounting for founder pool dilution
    const effectiveVal = offer.preMoneyValuation * (1 - (offer.poolTiming === 'Pre-Money' ? offer.targetOptionPoolPct : 0));

    return {
      effectiveValuation: Math.round(effectiveVal),
      founderOwnershipPct: Number(founderPct.toFixed(2)),
      investorOwnershipPct: Number(finalInvestorPct.toFixed(2)),
      poolExpansionShares: Math.round(poolShares),
      pricePerShare: Number(pps.toFixed(3)),
    };
  }

  const resultA = evaluateOffer(offerA);
  const resultB = evaluateOffer(offerB);

  const deltaPct = Number((resultA.founderOwnershipPct - resultB.founderOwnershipPct).toFixed(2));
  const postValAvg = (offerA.preMoneyValuation + offerA.investmentAmount + offerB.preMoneyValuation + offerB.investmentAmount) / 2;
  const dollarDelta = Math.round((Math.abs(deltaPct) / 100) * postValAvg);

  let verdict = '';
  if (deltaPct > 0.1) {
    verdict = `${offerA.leadInvestor}'s term sheet preserves ${Math.abs(deltaPct)}% more founder equity (~$${dollarDelta.toLocaleString()} in value).`;
  } else if (deltaPct < -0.1) {
    verdict = `${offerB.leadInvestor}'s term sheet preserves ${Math.abs(deltaPct)}% more founder equity (~$${dollarDelta.toLocaleString()} in value).`;
  } else {
    verdict = 'Both term sheets yield virtually identical net founder ownership.';
  }

  return {
    offerA: resultA,
    offerB: resultB,
    founderEquityDeltaPct: deltaPct,
    equityValueDeltaDollar: dollarDelta,
    verdict,
  };
}
