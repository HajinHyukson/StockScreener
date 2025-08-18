import { NextResponse } from 'next/server';
import type { RuleAST } from '@/lib/types';
import { compileRule } from '@/lib/compiler';
import { executePlan } from '@/lib/executor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const apiKey = process.env.FMP_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'Missing FMP_API_KEY' }, { status: 500 });

    const body = await req.json();
    const { ast, limit } = body as { ast: RuleAST; limit?: number };
    if (!ast) return NextResponse.json({ error: 'Missing ast' }, { status: 400 });

    const plan = compileRule(ast);
    const rows = await executePlan(plan, Number(limit) || 50, apiKey);
    return NextResponse.json({ rows });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 });
  }
}
