import type { RuleAST } from '@/types';
import { allFilters } from '@/filters';


/** Flatten all condition nodes out of an AST */
export function flattenConditions(ast: RuleAST): { id: string; params: any }[] {
  const out: { id: string; params: any }[] = [];
  const walk = (n?: RuleAST) => {
    if (!n) return;
    if (n.type === 'condition') out.push({ id: n.id, params: n.params ?? {} });
    else if (('children' in n) && Array.isArray((n as any).children)) (n as any).children.forEach(walk);
  };
  walk(ast);
  return out;
}


/** Build AST by asking each filter module to emit AST nodes from its value bucket */
export function buildASTFromFilterValues(values: Record<string, any>): RuleAST {
  const children: RuleAST[] = [];
  for (const f of allFilters) {
    const v = values[f.id];
    if (!v) continue;
    const nodes = f.toAST(v);
    if (Array.isArray(nodes) && nodes.length) children.push(...nodes);
  }
  if (children.length === 0) {
    return { type: 'condition', id: 'base.exchange', params: { value: 'NASDAQ' } };
  }
  return children.length === 1 ? children[0] : ({ type: 'AND', children } as RuleAST);
}


/** Convert AST back into the filter value buckets */
export function valuesFromAST(ast: RuleAST): Record<string, any> {
  const entries = flattenConditions(ast);
  const merged: Record<string, any> = {};
  for (const f of allFilters) {
    for (const e of entries) {
      const v = f.fromAST({ type: 'condition', id: e.id, params: e.params });
      if (v !== undefined) merged[f.id] = { ...(merged[f.id] ?? {}), ...(v ?? {}) };
    }
  }
  return merged;
}


/** Summary for “View Rule” */
export function summaryFromValues(values: Record<string, any>): Record<string, string> {
  const s: Record<string, string> = {};
  for (const f of allFilters) {
    if (!values[f.id]) continue;
    const part = f.summarize?.(values[f.id]) ?? {};
    for (const [k, v] of Object.entries(part)) {
      if (v !== undefined && v !== null && v !== '') s[k] = String(v);
    }
  }
  return s;
}


















