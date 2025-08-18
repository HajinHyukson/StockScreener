 'use client';
import { useEffect, useMemo, useState } from 'react';

/** ----------------- Types ----------------- */
type Row = {
  symbol: string;
  companyName?: string;
  price?: number;
  marketCap?: number;
  sector?: string;
  volume?: number;
  priceChangePct?: number; // supplied by backend when change filters used
};

type SortKey = 'symbol' | 'companyName' | 'price' | 'marketCap' | 'sector' | 'volume' | 'priceChangePct';

type RuleAST =
  | { type: 'condition'; id: string; params: Record<string, any> }
  | { type: 'AND' | 'OR' | 'NOT'; children: RuleAST[] };

type SavedRule = {
  id: string;
  name: string;
  ast: RuleAST;
  createdAt: string;
  updatedAt: string;
};

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

/** Build a Rule AST from current filters.
 *  Maps UI → condition IDs from /lib/conditions.ts
 */
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

  // Always persist exchange (so the rule replays the same universe)
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
  // Only add change conditions if both threshold and days are provided
  if (opts.priceChangePctMin && opts.priceChangeDays) {
    const pct = Number(opts.priceChangePctMin);
    const days = Number(opts.priceChangeDays);
    if (Number.isFinite(pct) && Number.isFinite(days) && days > 0) {
      children.push({
        type: 'condition',
        id: 'pv.priceChangePctN',
        params: { pct, days }
      });
    }
  }
  if (opts.volChangePctMin && opts.volChangeDays) {
    const pct = Number(opts.volChangePctMin);
    const days = Number(opts.volChangeDays);
    if (Number.isFinite(pct) && Number.isFinite(days) && days > 0) {
      children.push({
        type: 'condition',
        id: 'pv.volumeChangePctN',
        params: { pct, days }
      });
    }
  }

  if (children.length === 0) {
    return { type: 'condition', id: 'base.exchange', params: { value: opts.exchange || 'NASDAQ' } };
  }
  return children.length === 1 ? children[0] : { type: 'AND', children };
}

/** Merge a Rule AST back into the current filter UI state */
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
      const id = node.id;
      const p = node.params || {};
      switch (id) {
        case 'base.exchange':
          if (typeof p.value === 'string') set.setExchange(p.value);
          break;
        case 'base.sector':
          if (typeof p.value === 'string') set.setSector(p.value);
          break;
        case 'base.marketCapMin':
          if (typeof p.value === 'number') set.setMktMin(String(p.value));
          break;
        case 'base.marketCapMax':
          if (typeof p.value === 'number') set.setMktMax(String(p.value));
          break;
        case 'pv.priceChangePctN':
          if (typeof p.pct === 'number')  set.setPriceChangePctMin(String(p.pct));
          if (typeof p.days === 'number') set.setPriceChangeDays(String(p.days));
          break;
        case 'pv.volumeChangePctN':
          if (typeof p.pct === 'number')  set.setVolChangePctMin(String(p.pct));
          if (typeof p.days === 'number') set.setVolChangeDays(String(p.days));
          break;
        // extend with new condition IDs as you add them
      }
      return;
    }
    if ((node.type === 'AND' || node.type === 'OR' || node.type === 'NOT') && Array.isArray((node as any).children)) {
      (node as any).children.forEach(walk);
    }
  }
  walk(ast);
}

/** ----------------- Page ----------------- */
export default function Page() {
  // Base filters
  const [exchange, setExchange] = useState('NASDAQ');
  const [sector, setSector] = useState('');
  const [mktMin, setMktMin] = useState('10000000000');
  const [mktMax, setMktMax] = useState('');

  // Change filters (also drive display label)
  const [priceChangePctMin, setPriceChangePctMin] = useState('');
  const [priceChangeDays, setPriceChangeDays] = useState('');
  const [volChangePctMin, setVolChangePctMin] = useState('');
  const [volChangeDays, setVolChangeDays] = useState('');

  // Server limit + results
  const [limit, setLimit] = useState('25');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Sorting / paging
  const [sortBy, setSortBy] = useState<SortKey>('marketCap');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const pageSize = 25;

  // Rules (save/list)
  const [ruleName, setRuleName] = useState('');
  const [saving, setSaving] = useState(false);
  const [rules, setRules] = useState<SavedRule[]>([]);
  const [loadingRules, setLoadingRules] = useState(false);
  const [rulesError, setRulesError] = useState<string | null>(null);

  async function run() {
    setLoading(true); setErr(null); setPage(1);
    try {
      const qs = new URLSearchParams({
        exchange, limit,
        ...(sector ? { sector } : {}),
        ...(mktMin ? { marketCapMoreThan: mktMin } : {}),
        ...(mktMax ? { marketCapLowerThan: mktMax } : {}),
        ...(priceChangePctMin ? { priceChangePctMin } : {}),
        ...(priceChangeDays ? { priceChangeDays } : {}),
        ...(volChangePctMin ? { volChangePctMin } : {}),
        ...(volChangeDays ? { volChangeDays } : {})
      });
      const res = await fetch(`/api/screener?${qs.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as Row[];
      setRows(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setErr(e.message ?? 'Error'); setRows([]);
    } finally {
      setLoading(false);
    }
  }

  function toggleSort(key: SortKey) {
    if (sortBy === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else {
      setSortBy(key);
      setSortDir(key === 'symbol' || key === 'companyName' || key === 'sector' ? 'asc' : 'desc');
    }
  }

  const sorted = useMemo(() => {
    const cp = [...rows];
    cp.sort((a, b) => {
      const av = (a as any)[sortBy];
      const bv = (b as any)[sortBy];
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      const as = String(av ?? '').toUpperCase();
      const bs = String(bv ?? '').toUpperCase();
      return sortDir === 'asc' ? as.localeCompare(bs) : bs.localeCompare(as);
    });
    return cp;
  }, [rows, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageRows = sorted.slice((page - 1) * pageSize, page * pageSize);

  const today = new Date().toLocaleDateString('en-US', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: 'short', day: '2-digit'
  });

  const priceColTitle = priceChangeDays ? `Price (${priceChangeDays} days %change)` : 'Price';

  /** ------- Save Rule + List Rules ------- */
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
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
      setRuleName('');
      await loadRules();
    } catch (e: any) {
      alert(`Save failed: ${e.message ?? e}`);
    } finally {
      setSaving(false);
    }
  }

  async function loadRules() {
    setLoadingRules(true); setRulesError(null);
    try {
      const res = await fetch('/api/rules');
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
      setRules(json.rules as SavedRule[]);
    } catch (e: any) {
      setRulesError(e.message ?? 'Failed to load rules');
      setRules([]);
    } finally {
      setLoadingRules(false);
    }
  }

  async function deleteRule(id: string) {
    if (!confirm('Delete this rule?')) return;
    try {
      const res = await fetch(`/api/rules/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
      await loadRules();
    } catch (e: any) {
      alert(`Delete failed: ${e.message ?? e}`);
    }
  }

  async function applyRule(rule: SavedRule) {
    // Optional reset for predictable UX
    setSector('');
    setMktMin('');
    setMktMax('');
    setPriceChangePctMin('');
    setPriceChangeDays('');
    setVolChangePctMin('');
    setVolChangeDays('');

    // Merge AST → UI
    applyAstToFilters(rule.ast, {
      setExchange,
      setSector,
      setMktMin,
      setMktMax,
      setPriceChangePctMin,
      setPriceChangeDays,
      setVolChangePctMin,
      setVolChangeDays
    });

    await run();
  }

  useEffect(() => {
    loadRules();
  }, []);

  return (
    <main style={{ maxWidth: 1150, margin: '40px auto', padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700 }}>Stock Screener</h1>
        <div style={{ color: '#64748b' }}>{today}</div>
      </div>
      <p style={{ color: '#334155', marginBottom: 16 }}>
        Set filters → <b>Run</b>. Click column headers to sort. ({sorted.length} results)
      </p>

      {/* Filters */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
        <div>
          <div style={{ fontSize: 12, color: '#64748b' }}>Exchange</div>
          <select value={exchange} onChange={(e) => setExchange(e.target.value)} style={{ width: '100%' }}>
            <option>NASDAQ</option><option>NYSE</option><option>AMEX</option>
          </select>
        </div>
        <div>
          <div style={{ fontSize: 12, color: '#64748b' }}>Sector</div>
          <select value={sector} onChange={(e) => setSector(e.target.value)} style={{ width: '100%' }}>
            <option value="">Any</option>
            <option>Technology</option><option>Financial Services</option><option>Healthcare</option>
            <option>Consumer Cyclical</option><option>Consumer Defensive</option><option>Industrials</option>
            <option>Energy</option><option>Basic Materials</option><option>Utilities</option>
            <option>Real Estate</option><option>Communication Services</option>
          </select>
        </div>
        <div>
          <div style={{ fontSize: 12, color: '#64748b' }}>Market Cap Min (USD)</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>$</span>
            <input value={mktMin} onChange={(e) => setMktMin(e.target.value)} inputMode="numeric" style={{ width: '100%' }} />
          </div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: '#64748b' }}>Market Cap Max (USD)</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>$</span>
            <input value={mktMax} onChange={(e) => setMktMax(e.target.value)} inputMode="numeric" style={{ width: '100%' }} />
          </div>
        </div>

        {/* Price change filter */}
        <div>
          <div style={{ fontSize: 12, color: '#64748b' }}>Price change ≥ (%)</div>
          <input value={priceChangePctMin} onChange={(e) => setPriceChangePctMin(e.target.value)} inputMode="decimal" style={{ width: '100%' }} />
        </div>
        <div>
          <div style={{ fontSize: 12, color: '#64748b' }}>over last (days)</div>
          <input value={priceChangeDays} onChange={(e) => setPriceChangeDays(e.target.value)} inputMode="numeric" style={{ width: '100%' }} />
        </div>

        {/* Volume change filter */}
        <div>
          <div style={{ fontSize: 12, color: '#64748b' }}>Volume change ≥ (%)</div>
          <input value={volChangePctMin} onChange={(e) => setVolChangePctMin(e.target.value)} inputMode="decimal" style={{ width: '100%' }} />
        </div>
        <div>
          <div style={{ fontSize: 12, color: '#64748b' }}>over last (days)</div>
          <input value={volChangeDays} onChange={(e) => setVolChangeDays(e.target.value)} inputMode="numeric" style={{ width: '100%' }} />
        </div>

        <div>
          <div style={{ fontSize: 12, color: '#64748b' }}>Limit (server)</div>
          <input value={limit} onChange={(e) => setLimit(e.target.value)} inputMode="numeric" style={{ width: '100%' }} />
        </div>
      </div>

      {/* Actions */}
      <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={run} disabled={loading} style={{ padding: '8px 14px' }}>
          {loading ? 'Loading…' : 'Run'}
        </button>
        <button
          onClick={() => {
            setSector(''); setMktMin(''); setMktMax('');
            setPriceChangePctMin(''); setPriceChangeDays('');
            setVolChangePctMin(''); setVolChangeDays('');
          }}
          style={{ padding: '8px 14px' }}
        >
          Reset filters
        </button>
      </div>

      {/* Save Rule panel */}
      <div style={{ marginTop: 16, padding: 12, border: '1px solid #e2e8f0', borderRadius: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Save current filters as a Rule</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            value={ruleName}
            onChange={(e) => setRuleName(e.target.value)}
            placeholder="Rule name (e.g., Big caps up ≥5% / 20d)"
            style={{ flex: '1 1 320px', padding: 8, border: '1px solid #cbd5e1', borderRadius: 8 }}
          />
          <button onClick={saveCurrentRule} disabled={saving} style={{ padding: '8px 14px' }}>
            {saving ? 'Saving…' : 'Save Rule'}
          </button>
        </div>
      </div>

      {/* My Rules list */}
      <div style={{ marginTop: 16, padding: 12, border: '1px solid #e2e8f0', borderRadius: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={{ fontWeight: 600 }}>My Rules</div>
          <button onClick={loadRules} disabled={loadingRules} style={{ padding: '6px 10px' }}>
            {loadingRules ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
        {rulesError && <div style={{ color: '#b91c1c', marginTop: 8 }}>Error: {rulesError}</div>}
        <div style={{ marginTop: 8, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: 8 }}>Name</th>
                <th style={{ padding: 8 }}>Updated</th>
                <th style={{ padding: 8 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: 8 }}>{r.name}</td>
                  <td style={{ padding: 8, color: '#64748b' }}>{new Date(r.updatedAt).toLocaleString()}</td>
                  <td style={{ padding: 8, display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => alert(JSON.stringify(r.ast, null, 2))}
                      title="View AST JSON"
                      style={{ padding: '6px 10px' }}
                    >
                      View
                    </button>
                    <button
                      onClick={() => applyRule(r)}
                      title="Apply rule to filters and run"
                      style={{ padding: '6px 10px' }}
                    >
                      Apply
                    </button>
                    <button
                      onClick={() => deleteRule(r.id)}
                      title="Delete rule"
                      style={{ padding: '6px 10px' }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {rules.length === 0 && !loadingRules && (
                <tr><td colSpan={3} style={{ padding: 8, color: '#64748b' }}>No saved rules yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {err && (
        <div style={{ marginTop: 10, color: '#b91c1c', background: '#fee2e2', padding: 8, borderRadius: 8 }}>
          Error: {err}
        </div>
      )}

      {/* Results table */}
      <div style={{ marginTop: 16, overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 12 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1 }}>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>
              {[
                { key: 'symbol', label: 'Symbol' },
                { key: 'companyName', label: 'Name' },
                { key: 'price', label: priceColTitle, right: true },
                { key: 'marketCap', label: 'Market Cap', right: true },
                { key: 'sector', label: 'Sector' },
                { key: 'volume', label: 'Volume', right: true }
              ].map((c: any) => (
                <th
                  key={c.key}
                  onClick={() => toggleSort(c.key as SortKey)}
                  style={{ padding: 10, cursor: 'pointer', textAlign: c.right ? 'right' : 'left' }}
                  title="Click to sort"
                >
                  {c.label} {sortBy === c.key ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r) => {
              const pct = r.priceChangePct;
              const color =
                typeof pct === 'number'
                  ? (pct > 0 ? '#ef4444' : pct < 0 ? '#2563eb' : undefined)
                  : undefined;
              const priceCell = priceChangeDays
                ? `${formatUsd(r.price)} (${formatPct(pct)})`
                : formatUsd(r.price);
              return (
                <tr key={r.symbol} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: 10 }}>{r.symbol}</td>
                  <td style={{ padding: 10 }}>{r.companyName ?? '—'}</td>
                  <td style={{ padding: 10, textAlign: 'right', color }}>{priceCell}</td>
                  <td style={{ padding: 10, textAlign: 'right' }}>${formatInt(r.marketCap)}</td>
                  <td style={{ padding: 10 }}>{r.sector ?? '—'}</td>
                  <td style={{ padding: 10, textAlign: 'right' }}>{formatInt(r.volume)}</td>
                </tr>
              );
            })}
            {!loading && pageRows.length === 0 && !err && (
              <tr>
                <td colSpan={6} style={{ padding: 16, color: '#6b7280' }}>
                  No results. Adjust filters and press <b>Run</b>.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12 }}>
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>Prev</button>
        <div style={{ fontSize: 12, color: '#64748b' }}>Page {page} / {totalPages}</div>
        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next</button>
      </div>
    </main>
  );
}
