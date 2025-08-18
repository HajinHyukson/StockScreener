import { NextResponse } from 'next/server';
import { listRules, createRule } from '../../../lib/rulesStore';
import type { RuleAST } from '../../../lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';


export async function GET() {
  try {
    return NextResponse.json({ rules: listRules() });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, ast } = body as { name: string; ast: RuleAST };
    if (!name || !ast) {
      return NextResponse.json({ error: 'Missing name or ast' }, { status: 400 });
    }
    const rule = createRule(name, ast);
    return NextResponse.json({ rule });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 });
  }
}  
