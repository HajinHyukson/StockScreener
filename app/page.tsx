'use client';
import { useEffect, useMemo, useState } from 'react';
import { allFilters } from '@/filters';

/** ===== Minimal shared types ===== */
export type RuleAST =
  | { type: 'condition'; id: string; params: Record<string, any> }
  | { type: 'AND' | 'OR' | 'NOT'; children: RuleAST[] };

type SavedRule = {
  id: string;
  name: string;
  ast: RuleAST;
  createdAt: string;
  updatedAt: string;
};

type Row = {
  symbol: string;
  companyName?: string;
  price?: number;
  marketCap?: number;
  sector?: string;
  volume?: number;
  priceChangePct?: number;
  rsi?: number;
  explain?: { id: string; pass: boolean; value?: string }[];
};

type SortKey = 'symbol' | 'companyName' | 'price' | 'marketCap' | 'sector' | 'priceChangePct';

/** ===== Helpers ===== */
function formatInt(n?: number) { if (typeof n !== 'number' || !isFinite(n)) return '—'; return n.toLocaleString('en-US'); }
function formatUsd(n?: number) { if (typeof n !== 'number' || !isFinite(n)) return '—'; return `$${n.toLocaleString('en-US')}`; }
function formatPct(n?: number) { if (typeof n !== 'number' || !isFinite(n)) return '—'; const s = n>0?'+':n<0?'':''; return `${s}${n.toFixed(2)}%`; }
function formatKST(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('en-US',{ timeZone:'Asia/Seoul', year:'numeric', month:'short', day:'2-digit', hour:'2-digit', minute:'2-digit' });
}

/** ===== AST utils ===== */
function flattenConditions(ast: RuleAST): { id: string; params: any }[] {
  const out: { id: string; params: any }[] = [];
  const walk = (n: RuleAST) => {
    if (!n) return;
    if (n.type === 'condition') out.push({ id: n.id, params: n.params ?? {} });
    else if (Array.isArray((n as any).children)) (n as any).children.forEach(walk);
  };
  walk(ast);
  return out;
}

function buildASTFromFilterValues(values: Record<string, any>) {
  const children: RuleAST[] = [];
  for (const f of allFilters) {
    const v = values[f.id];
    if (!v) continue;
    const nodes = f.toAST(v);
    if (Array.isArray(nodes)) children.push(...nodes);
  }
  if (children.length === 0) {
    children.push({ type: 'condition', id: 'base.exchange', params: { value: 'NASDAQ' } });
  }
  return children.length === 1 ? children[0] : ({ type: 'AND', children } as RuleAST);
}

function summaryFromValues(values: Record<string, any>) {
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

function valuesFromAST(ast: RuleAST) {
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

/** ===== Page ===== */
export default function Page() {
  const [filterValues, setFilterValues] = useState<Record<string, any>>({
    'base.exchange': { value: 'NASDAQ' }
  });

  const [fundamentalSel, setFundamentalSel] = useState<'' | 'base.marketCap'>('');
  const [technicalSel, setTechnicalSel] = useState<'' | 'ti.rsi'>('');

  const [serverLimit, setServerLimit] = useState(50);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const [sortKey, setSortKey] = useState<SortKey>('marketCap');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [page, setPage] = useState(1);
  const pageSize = 25;

  const [ruleName, setRuleName] = useState('');
  const [saving, setSaving] = useState(false);
  const [rules, setRules] = useState<SavedRule[]>([]);
  const [loadingRules, setLoadingRules] = useState(false);
  const [rulesError, setRulesError] = useState<string | null>(null);

  const [viewOpen, setViewOpen] = useState(false);
  const [viewData, setViewData] = useState<{ name: string; fields: Record<string, string> } | null>(null);
  const [explainOpen, setExplainOpen] = useState(false);
  const [explainRow, setExplainRow] = useState<Row | null>(null);

  const [helpOpen, setHelpOpen] = useState(false);
  const [asOf, setAsOf] = useState<string | null>(null);

  async function runWithAst(ast: RuleAST, nextLimit?: number, append = false) {
    setLoading(true); setErr(null);
    const requestedLimit = Number.isFinite(nextLimit as number) ? (nextLimit as number) : serverLimit;
    try {
      const res = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ast, limit: requestedLimit })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as any)?.error || `HTTP ${res.status}`);
      setAsOf((json as any)?.asOf || new Date().toISOString());

      const data: Row[] = Array.isArray((json as any)?.rows) ? (json as any).rows : [];
      if (append) {
        const existing = new Set(rows.map(r => r.symbol));
        const add = data.filter(r => !existing.has(r.symbol));
        setRows([...rows, ...add]);
        setHasMore(data.length >= requestedLimit);
      } else {
        setRows(data);
        setHasMore(data.length >= requestedLimit);
        setPage(1);
      }
      setServerLimit(requestedLimit);
    } catch (e: any) {
      setErr(e.message ?? 'Error');
      if (!append) setRows([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }

  async function run() {
    const values = { ...filterValues };
    if (fundamentalSel !== 'base.marketCap') delete values['base.marketCap'];
    if (technicalSel !== 'ti.rsi') delete values['ti.rsi'];
    const ast = buildASTFromFilterValues(values);
    setServerLimit(50);
    await runWithAst(ast, 50, false);
  }

  async function loadMore() {
    const values = { ...filterValues };
    if (fundamentalSel !== 'base.marketCap') delete values['base.marketCap'];
    if (technicalSel !== 'ti.rsi') delete values['ti.rsi'];
    const ast = buildASTFromFilterValues(values);
    const next = serverLimit + 50;
    await runWithAst(ast, next, true);
  }

  async function saveCurrentRule() {
    setSaving(true);
    try {
      const values = { ...filterValues };
      if (fundamentalSel !== 'base.marketCap') delete values['base.marketCap'];
      if (technicalSel !== 'ti.rsi') delete values['ti.rsi'];
      const ast = buildASTFromFilterValues(values);
      const name = ruleName.trim() || `Rule ${new Date().toLocaleString()}`;
      const res = await fetch('/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, ast })
      });
      if (!res.ok) throw new Error('Save failed');
      setRuleName('');
      await loadRules();
    } catch (e: any) { alert(e.message); } finally { setSaving(false); }
  }

  async function loadRules() {
    setLoadingRules(true); setRulesError(null);
    try {
      const res = await fetch('/api/rules');
      const json = await res.json();
      setRules(Array.isArray(json.rules) ? json.rules : []);
    } catch (e: any) { setRulesError(e.message ?? 'Failed to load rules'); }
    finally { setLoadingRules(false); }
  }

  async function deleteRule(id: string) {
    if (!confirm('Delete this rule?')) return;
    await fetch(`/api/rules/${id}`, { method: 'DELETE' });
    await loadRules();
  }

  async function applyRuleAndRun(rule: SavedRule) {
    const vals = valuesFromAST(rule.ast);
    setFilterValues(vals);
    setFundamentalSel(vals['base.marketCap'] ? 'base.marketCap' : '');
    setTechnicalSel(vals['ti.rsi'] ? 'ti.rsi' : '');
    setServerLimit(50);
    await runWithAst(rule.ast, 50, false);
  }

  function openViewModal(rule: SavedRule) {
    const vals = valuesFromAST(rule.ast);
    const fields = summaryFromValues(vals);
    setViewData({ name: rule.name, fields });
    setViewOpen(true);
  }

  useEffect(() => { loadRules(); }, []);

  const sorted = useMemo(() => {
    const cp = [...rows];
    cp.sort((a, b) => {
      let av: any, bv: any;
      switch (sortKey) {
        case 'symbol':
        case 'companyName':
        case 'sector':
          av = String((a as any)[sortKey] ?? '').toUpperCase();
          bv = String((b as any)[sortKey] ?? '').toUpperCase();
          return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
        case 'price':
        case 'marketCap':
        case 'priceChangePct':
          av = (a as any)[sortKey]; bv = (b as any)[sortKey];
          if (typeof av !== 'number') av = -Infinity;
          if (typeof bv !== 'number') bv = -Infinity;
          return sortDir === 'asc' ? av - bv : bv - av;
      }
    });
    return cp;
  }, [rows, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageRows = sorted.slice((page - 1) * pageSize, page * pageSize);
  const today = new Date().toLocaleDateString('en-US', { timeZone: 'Asia/Seoul', year: 'numeric', month: 'short', day: '2-digit' });

  /** ===== UI ===== */
  return (
    <main style={{ maxWidth: 1150, margin: '40px auto', padding: 16 }}>
      <h1>Stock Screener</h1>
      {/* ... full UI for filters, combos, results, etc. as before ... */}
    </main>
  );
}
