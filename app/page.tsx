'use client';
import { useEffect, useMemo, useState } from 'react';
import type { RuleAST, SavedRule } from '@/lib/types';

/** ----------------- Row Type ----------------- */
type Row = {
  symbol: string;
  companyName?: string;
  price?: number;
  marketCap?: number;
  sector?: string;
  volume?: number;
  priceChangePct?: number;
};

type SortKey = 'symbol' | 'companyName' | 'price' | 'marketCap' | 'sector' | 'volume' | 'priceChangePct';

/** ----------------- Helpers ----------------- */
function formatInt(n?: number) {
  if (typeof n !== 'number' || !isFinite(n)) return '—';
  return n.toLocaleString('en-US');
}
function formatUsd(n?: number) {
  if (typeof n !== 'number' || !isFinite(n)) return '—';
  return `$${n.toLocaleString('en-US')}`;
}
function formatPct(n?: number) {
  if (typeof n !== 'number' || !isFinite(n)) return '—';
  const sign = n > 0 ? '+' : n < 0 ? '' : '';
  return `${sign}${n.toFixed(2)}%`;
}

/** Build a Rule AST from current filters (UI → AST) */
function buildAstFromFilters(opts: {
  exchange: string;
  sector: string;
  mktMin: string;
  mktMax: string;
  priceChangePctMin: string;
  priceChangeDays: string;
  volChangePctMin: string;
  volChangeDays: string;
}): RuleAST {
  const children: RuleAST[] = [];

  if (opts.exchange) {
    children.push({ type: 'condition', id: 'base.exchange', params: { value: opts.exchange } });
  }
  if (opts.sector) {
    children.push({ type: 'condition', id: 'base.sector', params: { value: opts.sector } });
  }
  if (opts.mktMin) {
    const v = Number(opts.mktMin);
    if (Number.isFinite(v)) children.push({ type: 'condition', id: 'base.marketCapMin', params: { value: v } });
  }
  if (opts.mktMax) {
    const v = Number(opts.mktMax);
    if (Number.isFinite(v)) children.push({ type: 'condition', id: 'base.marketCapMax', params: { value: v } });
  }
  if (opts.priceChangePctMin && opts.priceChangeDays) {
    const pct = Number(opts.priceChangePctMin);
    const days = Number(opts.priceChangeDays);
    if (Number.isFinite(pct) && Number.isFinite(days) && days > 0) {
      children.push({ type: 'condition', id: 'pv.priceChangePctN', params: { pct, days } });
    }
  }
  if (opts.volChangePctMin && opts.volChangeDays) {
    const pct = Number(opts.volChangePctMin);
    const days = Number(opts.volChangeDays);
    if (Number.isFinite(pct) && Number.isFinite(days) && days > 0) {
      children.push({ type: 'condition', id: 'pv.volumeChangePctN', params: { pct, days } });
    }
  }

  if (children.length === 0) {
    return { type: 'condition', id: 'base.exchange', params: { value: opts.exchange || 'NASDAQ' } };
  }
  return children.length === 1 ? children[0] : { type: 'AND', children };
}

/** Merge AST back into filter state */
function applyAstToFilters(ast: RuleAST, set: {
  setExchange: (v: string) => void;
  setSector: (v: string) => void;
  setMktMin: (v: string) => void;
  setMktMax: (v: string) => void;
  setPriceChangePctMin: (v: string) => void;
  setPriceChangeDays: (v: string) => void;
  setVolChangePctMin: (v: string) => void;
  setVolChangeDays: (v: string) => void;
}) {
  function walk(node: RuleAST) {
    if (!node) return;
    if (node.type === 'condition') {
      const { id, params = {} } = node;
      switch (id) {
        case 'base.exchange':
          if (typeof params.value === 'string') set.setExchange(params.value);
          break;
        case 'base.sector':
          if (typeof params.value === 'string') set.setSector(params.value);
          break;
        case 'base.marketCapMin':
          if (typeof params.value === 'number') set.setMktMin(String(params.value));
          break;
        case 'base.marketCapMax':
          if (typeof params.value === 'number') set.setMktMax(String(params.value));
          break;
        case 'pv.priceChangePctN':
          if (typeof params.pct === 'number') set.setPriceChangePctMin(String(params.pct));
          if (typeof params.days === 'number') set.setPriceChangeDays(String(params.days));
          break;
        case 'pv.volumeChangePctN':
          if (typeof params.pct === 'number') set.setVolChangePctMin(String(params.pct));
          if (typeof params.days === 'number') set.setVolChangeDays(String(params.days));
          break;
      }
      return;
    }
    if ((node.type === 'AND' || node.type === 'OR' || node.type === 'NOT') && Array.isArray((node as any).children)) {
      (node as any).children.forEach(walk);
    }
  }
  walk(ast);
}

/** Summarize AST for friendly “View” */
function summarizeAst(ast: RuleAST) {
  const out: Record<string, string> = {};
  function put(key: string, val: any) {
    if (val !== undefined && val !== null && val !== '') out[key] = String(val);
  }
  function walk(node: RuleAST) {
    if (!node) return;
    if (node.type === 'condition') {
      const { id, params = {} } = node;
      if (id === 'base.exchange') put('Exchange', params.value);
      else if (id === 'base.sector') put('Sector', params.value);
      else if (id === 'base.marketCapMin') put('Market Cap Min (USD)', params.value);
      else if (id === 'base.marketCapMax') put('Market Cap Max (USD)', params.value);
      else if (id === 'pv.priceChangePctN') {
        put('Price change ≥ (%)', params.pct);
        put('Over last (days)', params.days);
      } else if (id === 'pv.volumeChangePctN') {
        put('Volume change ≥ (%)', params.pct);
        put('Over last (days) [volume]', params.days);
      }
      return;
    }
    if ((node.type === 'AND' || node.type === 'OR' || node.type === 'NOT') && Array.isArray((node as any).children)) {
      (node as any).children.forEach(walk);
    }
  }
  walk(ast);
  return out;
}

/** ----------------- Page Component ----------------- */
export default function Page() {
  // Filters
  const [exchange, setExchange] = useState('NASDAQ');
  const [sector, setSector] = useState('');
  const [mktMin, setMktMin] = useState('10000000000');
  const [mktMax, setMktMax] = useState('');
  const [priceChangePctMin, setPriceChangePctMin] = useState('');
  const [priceChangeDays, setPriceChangeDays] = useState('');
  const [volChangePctMin, setVolChangePctMin] = useState('');
  const [volChangeDays, setVolChangeDays] = useState('');

  const [limit, setLimit] = useState('25');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [sortBy, setSortBy] = useState<SortKey>('marketCap');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);

  const [ruleName, setRuleName] = useState('');
  const [saving, setSaving] = useState(false);
  const [rules, setRules] = useState<SavedRule[]>([]);
  const [loadingRules, setLoadingRules] = useState(false);
  const [rulesError, setRulesError] = useState<string | null>(null);

  const [viewOpen, setViewOpen] = useState(false);
  const [viewData, setViewData] = useState<{ name: string; fields: Record<string, string> } | null>(null);

  const pageSize = 25;

  async function runWithAst(ast: RuleAST) {
    setLoading(true); setErr(null); setPage(1);
    try {
      const res = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ast, limit: Number(limit) || 25 })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const data = Array.isArray(json?.rows) ? json.rows : [];
      setRows(data);
    } catch (e: any) {
      setErr(e.message ?? 'Error'); setRows([]);
    } finally {
      setLoading(false);
    }
  }

  async function run() {
    const ast = buildAstFromFilters({
      exchange, sector, mktMin, mktMax,
      priceChangePctMin, priceChangeDays,
      volChangePctMin, volChangeDays
    });
    await runWithAst(ast);
  }

  async function saveCurrentRule() {
    setSaving(true);
    try {
      const ast = buildAstFromFilters({
        exchange, sector, mktMin, mktMax,
        priceChangePctMin, priceChangeDays,
        volChangePctMin, volChangeDays
      });
      const name = ruleName.trim() || `Rule ${new Date().toLocaleString()}`;
      const res = await fetch('/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, ast })
      });
      if (!res.ok) throw new Error('Save failed');
      setRuleName('');
      await loadRules();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function loadRules() {
    setLoadingRules(true);
    try {
      const res = await fetch('/api/rules');
      const json = await res.json();
      setRules(json.rules || []);
    } catch (e: any) {
      setRulesError(e.message);
    } finally {
      setLoadingRules(false);
    }
  }

  async function deleteRule(id: string) {
    if (!confirm('Delete this rule?')) return;
    await fetch(`/api/rules/${id}`, { method: 'DELETE' });
    await loadRules();
  }

  async function applyRuleAndRun(rule: SavedRule) {
    applyAstToFilters(rule.ast, {
      setExchange, setSector, setMktMin, setMktMax,
      setPriceChangePctMin, setPriceChangeDays,
      setVolChangePctMin, setVolChangeDays
    });
    await runWithAst(rule.ast);
  }

  function openViewModal(rule: SavedRule) {
    const fields = summarizeAst(rule.ast);
    setViewData({ name: rule.name, fields });
    setViewOpen(true);
  }

  useEffect(() => { loadRules(); }, []);

  const sorted = useMemo(() => {
    const cp = [...rows];
    cp.sort((a, b) => {
      const av = (a as any)[sortBy];
      const bv = (b as any)[sortBy];
      if (typeof av === 'number' && typeof bv === 'number') return sortDir === 'asc' ? av - bv : bv - av;
      const as = String(av ?? '').toUpperCase();
      const bs = String(bv ?? '').toUpperCase();
      return sortDir === 'asc' ? as.localeCompare(bs) : bs.localeCompare(as);
    });
    return cp;
  }, [rows, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageRows = sorted.slice((page - 1) * pageSize, page * pageSize);

  const today = new Date().toLocaleDateString('en-US', { timeZone: 'Asia/Seoul', year: 'numeric', month: 'short', day: '2-digit' });
  const priceColTitle = priceChangeDays ? `Price (${priceChangeDays} days %change)` : 'Price';

  return (
    <main style={{ maxWidth: 1150, margin: '40px auto', padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h1>Stock Screener</h1>
        <div style={{ color: '#64748b' }}>{today}</div>
      </div>

      {/* Save Rule Panel */}
      <div style={{ marginTop: 16 }}>
        <input value={ruleName} onChange={e=>setRuleName(e.target.value)} placeholder="Rule name" />
        <button onClick={saveCurrentRule} disabled={saving}>Save Rule</button>
      </div>

      {/* Rules List */}
      <table style={{ marginTop: 16, width: '100%' }}>
        <thead><tr><th>Name</th><th>Updated</th><th>Actions</th></tr></thead>
        <tbody>
          {rules.map(r=>(
            <tr key={r.id}>
              <td>
                <a href="#" onClick={e=>{e.preventDefault(); applyRuleAndRun(r);}}>{r.name}</a>
              </td>
              <td>{new Date(r.updatedAt).toLocaleString()}</td>
              <td>
                <button onClick={()=>openViewModal(r)}>View</button>
                <button onClick={()=>deleteRule(r.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Results Table */}
      <table style={{ marginTop: 16, width: '100%' }}>
        <thead><tr><th>Symbol</th><th>Name</th><th>{priceColTitle}</th><th>Market Cap</th><th>Sector</th><th>Volume</th></tr></thead>
        <tbody>
          {pageRows.map(r=>(
            <tr key={r.symbol}>
              <td>{r.symbol}</td>
              <td>{r.companyName}</td>
              <td style={{ color: r.priceChangePct!>0?'red':r.priceChangePct!<0?'blue':undefined }}>
                {priceChangeDays ? `${formatUsd(r.price)} (${formatPct(r.priceChangePct)})` : formatUsd(r.price)}
              </td>
              <td>{formatInt(r.marketCap)}</td>
              <td>{r.sector}</td>
              <td>{formatInt(r.volume)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* View Modal */}
      {viewOpen && viewData && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)' }} onClick={()=>setViewOpen(false)}>
          <div style={{ background:'white', margin:'auto', padding:20, width:400 }} onClick={e=>e.stopPropagation()}>
            <h3>{viewData.name}</h3>
            <ul>
              {Object.entries(viewData.fields).map(([k,v])=><li key={k}>{k}: {v}</li>)}
            </ul>
            <button onClick={()=>setViewOpen(false)}>Close</button>
          </div>
        </div>
      )}
    </main>
  );
}
