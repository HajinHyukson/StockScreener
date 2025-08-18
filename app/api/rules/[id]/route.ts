import { NextResponse } from 'next/server';
import { getRule, updateRule, deleteRule } from '../../../../lib/rulesStore';
import type { RuleAST } from '../../../../lib/types';

export const runtime = 'nodejs';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const rule = getRule(params.id);
  if (!rule) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ rule });
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { name, ast } = body as { name: string; ast: RuleAST };
  const updated = updateRule(params.id, name, ast);
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ rule: updated });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const ok = deleteRule(params.id);
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}
