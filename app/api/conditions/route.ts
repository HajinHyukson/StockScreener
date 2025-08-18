// /app/api/conditions/route.ts
import { NextResponse } from 'next/server';
import { CONDITIONS, groupByCategory } from '../../../lib/conditions';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const group = searchParams.get('group');

  if (group === 'category') {
    return NextResponse.json({ grouped: groupByCategory(CONDITIONS) });
  }
  return NextResponse.json({ conditions: CONDITIONS });
}
