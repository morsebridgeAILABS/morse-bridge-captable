import {
  Stakeholder,
  SafeNote,
  CompanyDetails,
  SafeConversionResponse,
  SafeConversionResultStakeholder,
  SafeBreakdownItem,
} from '../types';

export interface SafePreviewResult {
  capPrice: number;
  discountPrice: number;
  effectivePps: number;
  shares: number;
  effectiveValuation: number;
  dilutionPercent: number;
  undiscountedPct: number;
  isDiscountActive: boolean;
}

/**
 * Accurately calculate single SAFE dilution preview metrics, accounting for
 * cap, discount, and effective share price per conversion math.
 */
export function calculateSingleSafePreview(
  amount: number,
  valuationCap: number,
  discount: number,
  preConversionShares: number,
  seriesAPreMoney?: number
): SafePreviewResult {
  const sharesBase = Math.max(Number(preConversionShares) || 0, 1);
  const safeAmount = Math.max(Number(amount) || 0, 0);
  const statedCap = Number(valuationCap) > 0 ? Number(valuationCap) : (Number(seriesAPreMoney) || 10_000_000);
  const safeDiscount = Math.min(Math.max(Number(discount) || 0, 0), 0.99);

  // 1. Cap Price = cap / preConversionShares
  const capPrice = statedCap / sharesBase;

  // 2. Discount Price = capPrice * (1 - discount)
  const discountMultiplier = safeDiscount > 0 ? 1 - safeDiscount : 1;
  const discountPrice = capPrice * discountMultiplier;

  // 3. Effective conversion price = min(capPrice, discountPrice)
  const isDiscountActive = safeDiscount > 0;
  const effectivePps = isDiscountActive ? Math.min(capPrice, discountPrice) : capPrice;

  // 4. Converted shares = amount / effectivePrice
  const shares = effectivePps > 0 ? Math.round(safeAmount / effectivePps) : 0;

  // 5. Effective Valuation = statedCap * discountMultiplier
  const effectiveValuation = statedCap * discountMultiplier;

  // 6. Pre-round dilution % = (amount / effectiveValuation) * 100
  const dilutionPercent = effectiveValuation > 0 ? (safeAmount / effectiveValuation) * 100 : 0;

  // Undiscounted percentage
  const undiscountedPct = statedCap > 0 ? (safeAmount / statedCap) * 100 : 0;

  return {
    capPrice,
    discountPrice,
    effectivePps,
    shares,
    effectiveValuation,
    dilutionPercent,
    undiscountedPct,
    isDiscountActive,
  };
}

export function calculateSafeConversion(
  companyDetails: CompanyDetails,
  capTable: Stakeholder[],
  safes: SafeNote[]
): SafeConversionResponse {
  // 1. Initial pre-round fully diluted share count
  const initialShares = capTable.reduce((acc, curr) => acc + (Number(curr.shares) || 0), 0);
  const baselineShares = initialShares > 0 ? initialShares : 1;

  // 2. Base Series A valuation & preliminary PPS
  const seriesAPreMoney = Math.max(Number(companyDetails.targetSeriesAValuation) || 1, 100_000);
  const seriesANewMoney = Math.max(Number(companyDetails.seriesANewMoney) || 0, 0);

  // 3. Process Post-Money SAFEs (YC Standard)
  // In YC Post-Money SAFE: Safe Ownership % is fixed based on Cap:
  // Ownership% = Amount / Cap (or if uncapped, Amount / Series A Pre-Money)
  interface SafeCalculated {
    safe: SafeNote;
    shares: number;
    effectivePps: number;
    ownershipTarget?: number;
  }

  const postMoneySafes = safes.filter((s) => s.type === 'Post-Money');
  const preMoneySafes = safes.filter((s) => s.type === 'Pre-Money');

  let totalPostMoneyOwnershipPct = 0;
  postMoneySafes.forEach((safe) => {
    const discountMultiplier = Number(safe.discount) > 0 ? 1 - Number(safe.discount) : 1;
    const baseCap = Number(safe.valuationCap) > 0 ? Number(safe.valuationCap) : seriesAPreMoney;
    const effectiveCap = baseCap * discountMultiplier;
    const ownershipFraction = Math.min(
      Number(safe.amount) / (effectiveCap > 0 ? effectiveCap : 1),
      0.90
    );
    totalPostMoneyOwnershipPct += ownershipFraction;
  });

  // Series A unadjusted PPS before safes
  let seriesAPps = seriesAPreMoney / baselineShares;

  // Process Pre-Money SAFEs:
  // Conversion price = min(CapPrice * (1 - Discount), Series A PPS * (1 - Discount))
  const calculatedPreSafes: SafeCalculated[] = preMoneySafes.map((safe) => {
    const discountFactor = 1 - (Number(safe.discount) || 0);
    const discountedPrice = seriesAPps * discountFactor;
    const capPrice =
      Number(safe.valuationCap) > 0
        ? (Number(safe.valuationCap) / baselineShares) * discountFactor
        : discountedPrice;
    const effectivePps = Math.min(discountedPrice, capPrice);
    const shares = Math.round(Number(safe.amount) / (effectivePps > 0 ? effectivePps : 1));
    return {
      safe,
      shares,
      effectivePps,
    };
  });

  const totalPreMoneySafeShares = calculatedPreSafes.reduce((sum, s) => sum + s.shares, 0);

  // Re-adjust for post-money SAFEs:
  // Post-money safe investors buy a % of the company immediately prior to Series A new money:
  // PostMoneySafeShares = (PreRoundShares + PreSafeShares) * (TotalPostMoneyPct / (1 - TotalPostMoneyPct))
  const preSeriesAShares = baselineShares + totalPreMoneySafeShares;
  const postMoneySafeMultiplier =
    totalPostMoneyOwnershipPct < 0.99
      ? totalPostMoneyOwnershipPct / (1 - totalPostMoneyOwnershipPct)
      : 1;
  const totalPostMoneySafeShares = Math.round(preSeriesAShares * postMoneySafeMultiplier);

  const calculatedPostSafes: SafeCalculated[] = postMoneySafes.map((safe) => {
    const discountMultiplier = Number(safe.discount) > 0 ? 1 - Number(safe.discount) : 1;
    const baseCap = Number(safe.valuationCap) > 0 ? Number(safe.valuationCap) : seriesAPreMoney;
    const effectiveCap = baseCap * discountMultiplier;
    const safeFraction =
      totalPostMoneyOwnershipPct > 0
        ? Number(safe.amount) / effectiveCap / totalPostMoneyOwnershipPct
        : 0;
    const safeShares = Math.round(totalPostMoneySafeShares * safeFraction);
    const effectivePps =
      safeShares > 0 ? Number(safe.amount) / safeShares : seriesAPps * discountMultiplier;
    return {
      safe,
      shares: safeShares,
      effectivePps,
    };
  });

  // Total pre-Series A shares including all converted SAFEs
  const convertedPreRoundShares = preSeriesAShares + totalPostMoneySafeShares;

  // Series A Lead Investor Shares
  seriesAPps = seriesAPreMoney / (convertedPreRoundShares > 0 ? convertedPreRoundShares : 1);
  const seriesAShares = seriesAPps > 0 ? Math.round(seriesANewMoney / seriesAPps) : 0;

  // Total Post-Series A Fully Diluted Shares
  const finalTotalShares = convertedPreRoundShares + seriesAShares;

  // Build the diluted cap table ledger
  const dilutedCapTable: SafeConversionResultStakeholder[] = [];

  // Add original stakeholders
  capTable.forEach((stk) => {
    const shares = Number(stk.shares) || 0;
    const ownershipPercent = finalTotalShares > 0 ? (shares / finalTotalShares) * 100 : 0;
    const effectivePricePerShare =
      shares > 0 && stk.investmentAmount > 0 ? stk.investmentAmount / shares : 0;
    dilutedCapTable.push({
      id: stk.id,
      name: stk.name,
      shareClass: stk.shareClass,
      shares,
      investmentAmount: Number(stk.investmentAmount) || 0,
      ownershipPercent,
      source: 'Original',
      effectivePricePerShare,
    });
  });

  // Add converted post-money SAFEs
  calculatedPostSafes.forEach(({ safe, shares, effectivePps }) => {
    const ownershipPercent = finalTotalShares > 0 ? (shares / finalTotalShares) * 100 : 0;
    dilutedCapTable.push({
      id: `conv-${safe.id}`,
      name: `${safe.investor} (SAFE Conv - Post)`,
      shareClass: 'Preferred',
      shares,
      investmentAmount: Number(safe.amount),
      ownershipPercent,
      source: 'SAFE Conversion',
      effectivePricePerShare: effectivePps,
    });
  });

  // Add converted pre-money SAFEs
  calculatedPreSafes.forEach(({ safe, shares, effectivePps }) => {
    const ownershipPercent = finalTotalShares > 0 ? (shares / finalTotalShares) * 100 : 0;
    dilutedCapTable.push({
      id: `conv-${safe.id}`,
      name: `${safe.investor} (SAFE Conv - Pre)`,
      shareClass: 'Preferred',
      shares,
      investmentAmount: Number(safe.amount),
      ownershipPercent,
      source: 'SAFE Conversion',
      effectivePricePerShare: effectivePps,
    });
  });

  // Add Series A new investor
  if (seriesAShares > 0) {
    const ownershipPercent = (seriesAShares / finalTotalShares) * 100;
    dilutedCapTable.push({
      id: 'stk-series-a',
      name: 'Series A Lead Investor',
      shareClass: 'Preferred',
      shares: seriesAShares,
      investmentAmount: seriesANewMoney,
      ownershipPercent,
      source: 'Series A',
      effectivePricePerShare: seriesAPps,
    });
  }

  const totalSafeDilutionPercent =
    finalTotalShares > 0
      ? ((totalPreMoneySafeShares + totalPostMoneySafeShares) / finalTotalShares) * 100
      : 0;

  const safeBreakdown: SafeBreakdownItem[] = [];

  calculatedPostSafes.forEach(({ safe, shares, effectivePps }) => {
    const impliedOwnershipPct =
      finalTotalShares > 0 ? (shares / finalTotalShares) * 100 : 0;
    safeBreakdown.push({
      id: safe.id,
      investor: safe.investor,
      type: safe.type,
      amount: safe.amount,
      valuationCap: safe.valuationCap,
      discount: safe.discount,
      impliedOwnershipPct: Number(impliedOwnershipPct.toFixed(2)),
      estimatedShares: shares,
      effectivePps: Number(effectivePps.toFixed(4)),
    });
  });

  calculatedPreSafes.forEach(({ safe, shares, effectivePps }) => {
    const impliedOwnershipPct =
      finalTotalShares > 0 ? (shares / finalTotalShares) * 100 : 0;
    safeBreakdown.push({
      id: safe.id,
      investor: safe.investor,
      type: safe.type,
      amount: safe.amount,
      valuationCap: safe.valuationCap,
      discount: safe.discount,
      impliedOwnershipPct: Number(impliedOwnershipPct.toFixed(2)),
      estimatedShares: shares,
      effectivePps: Number(effectivePps.toFixed(4)),
    });
  });

  return {
    dilutedCapTable,
    totalShares: finalTotalShares,
    postMoneyValuation: seriesAPreMoney + seriesANewMoney,
    seriesAPricePerShare: Number(seriesAPps.toFixed(4)),
    totalSafeDilutionPercent: Number(totalSafeDilutionPercent.toFixed(2)),
    safeBreakdown,
  };
}
