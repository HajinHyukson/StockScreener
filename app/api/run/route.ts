import { NextResponse } from 'next/server';
import type { RuleAST } from '@/lib/types';
import { compileRule } from '@/lib/compiler';
import { executePlan } from '@/lib/executor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function json(res: any, status = 200) {
  return NextResponse.json(res, { status });
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.FMP_API_KEY;
    if (!apiKey) {
      console.error('[api/run] Missing FMP_API_KEY');
      return json({ error: 'Missing FMP_API_KEY' }, 500);
    }

    let body: any = null;
    try {
      body = await req.json();
    } catch (e: any) {
      console.error('[api/run] JSON parse error:', e?.message);
      return json({ error: 'Invalid JSON body' }, 400);
    }

    const ast = body?.ast as RuleAST | undefined;
    const limitRaw = body?.limit;
    const limit = Number.isFinite(Number(limitRaw)) ? Number(limitRaw) : 50;

    if (!ast || typeof ast !== 'object') {
      console.error('[api/run] Missing or invalid ast:', ast);
      return json({ error: 'Missing or invalid "ast"' }, 400);
    }

    const plan = compileRule(ast);
    try {
      const rows = await executePlan(plan, limit, apiKey);
      return json({ ok: true, rows });
    } catch (e: any) {
      console.error('[api/run] executePlan error:', e?.message);
      return json({ error: 'Upstream/plan execution failed', detail: e?.message ?? 'unknown' }, 502);
    }
  } catch (e: any) {
    console.error('[api/run] Uncaught error:', e?.message);
    return json({ error: 'Server error', detail: e?.message ?? 'unknown' }, 500);
  }
}
