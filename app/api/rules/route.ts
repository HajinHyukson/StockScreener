import { NextResponse } from 'next/server';
import { listRules, createRule } from '../../../lib/rulesStore';
import type { RuleAST } from '../../../lib/types';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({ rules: listRules() });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { name, ast } = body as { name: string; ast: RuleAST };
  if (!name || !ast) {
    return NextResponse.json({ error: 'Missing name or ast' }, { status: 400 });
  }
  const rule = createRule(name, ast);
  return NextResponse.json({ rule });
}
