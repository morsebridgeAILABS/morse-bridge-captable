import { NextRequest, NextResponse } from 'next/server';
import { calculateSafeConversion } from '@/lib/math/safe-math';
import { CompanyDetails, Stakeholder, SafeNote } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { companyDetails, capTable, safes } = body as {
      companyDetails: CompanyDetails;
      capTable: Stakeholder[];
      safes: SafeNote[];
    };

    if (!companyDetails || !Array.isArray(capTable) || !Array.isArray(safes)) {
      return NextResponse.json(
        { error: 'Invalid payload: companyDetails, capTable, and safes are required.' },
        { status: 400 }
      );
    }

    const result = calculateSafeConversion(companyDetails, capTable, safes);
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'SAFE Conversion failed', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}
