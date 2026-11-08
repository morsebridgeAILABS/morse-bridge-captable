import { Valuation409AParams, BSMResponse } from '../types';

/**
 * Standard Normal Probability Density Function Z(x)
 */
export function normalPdf(x: number): number {
  return (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * x * x);
}

/**
 * Cumulative Standard Normal Distribution N(x)
 * Implemented using Abramowitz and Stegun approximation (formula 7.1.26).
 * Absolute error is strictly less than 1.5e-7 across all real numbers.
 */
export function normalCdf(x: number): number {
  if (isNaN(x)) return 0;
  if (x < -10) return 0;
  if (x > 10) return 1;

  const isNegative = x < 0;
  const absX = Math.abs(x);

  const p = 0.2316419;
  const b1 = 0.319381530;
  const b2 = -0.356563782;
  const b3 = 1.781477937;
  const b4 = -1.821255978;
  const b5 = 1.330274429;

  const t = 1.0 / (1.0 + p * absX);
  const poly = ((((b5 * t + b4) * t + b3) * t + b2) * t + b1) * t;
  const cdf = 1.0 - normalPdf(absX) * poly;

  return isNegative ? 1.0 - cdf : cdf;
}

/**
 * Black-Scholes-Merton Call Option Valuation Model (409A Standard)
 */
export function calculateBlackScholes(params: Valuation409AParams): BSMResponse {
  const S = Math.max(0.0001, Number(params.stockPrice) || 0.0001);
  const K = Math.max(0.0001, Number(params.strikePrice) || 0.0001);
  const T = Math.max(0.001, Number(params.timeToExit) || 0.001);
  const r = Math.max(0, Number(params.riskFreeRate) || 0);
  const sigma = Math.max(0.01, Number(params.volatility) || 0.01);

  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;

  const nd1 = normalCdf(d1);
  const nd2 = normalCdf(d2);

  const discountFactor = Math.exp(-r * T);
  const callPrice = S * nd1 - K * discountFactor * nd2;
  const normalizedCallPrice = Math.max(0, callPrice);

  const intrinsicValue = Math.max(0, S - K);
  const timeValue = Math.max(0, normalizedCallPrice - intrinsicValue);

  const delta = nd1;
  const gamma = normalPdf(d1) / (S * sigma * sqrtT);

  return {
    callPrice: Number(normalizedCallPrice.toFixed(4)),
    d1: Number(d1.toFixed(4)),
    d2: Number(d2.toFixed(4)),
    nd1: Number(nd1.toFixed(4)),
    nd2: Number(nd2.toFixed(4)),
    intrinsicValue: Number(intrinsicValue.toFixed(4)),
    timeValue: Number(timeValue.toFixed(4)),
    delta: Number(delta.toFixed(4)),
    gamma: Number(gamma.toFixed(4)),
  };
}
