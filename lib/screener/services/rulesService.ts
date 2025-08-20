import type { RuleAST } from '@/types';


export async function listRules() {
  const res = await fetch('/api/rules', { method: 'GET' });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
  return Array.isArray(json.rules) ? json.rules : [];
}


export async function saveRule(input: { name: string; ast: RuleAST }) {
  const res = await fetch('/api/rules', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
  return json.rule;
}


export async function deleteRule(id: string) {
  const res = await fetch(`/api/rules/${id}`, { method: 'DELETE' });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
  return true;
}
