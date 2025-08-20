import type { RuleAST } from '@/types';


export type RunResponse<Row = any> = { ok?: boolean; rows: Row[]; asOf?: string; error?: string; detail?: string };


export async function runScreener(input: { ast: RuleAST; limit: number }): Promise<RunResponse> {
  const res = await fetch('/api/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { rows: [], error: json?.error || `HTTP ${res.status}`, detail: json?.detail };
  }
  return { rows: Array.isArray(json?.rows) ? json.rows : [], asOf: json?.asOf, ok: true };
}
