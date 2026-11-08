import { NextRequest, NextResponse } from 'next/server';
import { calculateWaterfall } from '@/lib/math/waterfall-math';
import { Stakeholder } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { capTable, exitValuation } = body as {
      capTable: Stakeholder[];
      exitValuation: number;
    };

    if (!Array.isArray(capTable) || exitValuation === undefined) {
      return NextResponse.json(
        { error: 'Invalid payload: capTable and exitValuation are required.' },
        { status: 400 }
      );
    }

    const result = calculateWaterfall(capTable, Number(exitValuation));
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Waterfall distribution calculation failed', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}
