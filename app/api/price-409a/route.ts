import { NextRequest, NextResponse } from 'next/server';
import { calculateBlackScholes } from '@/lib/math/black-scholes';
import { Valuation409AParams } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const params = body as Valuation409AParams;

    if (
      params.stockPrice === undefined ||
      params.strikePrice === undefined ||
      params.timeToExit === undefined ||
      params.riskFreeRate === undefined ||
      params.volatility === undefined
    ) {
      return NextResponse.json(
        { error: 'Missing 409A parameters: stockPrice, strikePrice, timeToExit, riskFreeRate, and volatility are required.' },
        { status: 400 }
      );
    }

    const result = calculateBlackScholes(params);
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: '409A Black-Scholes calculation failed', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}
