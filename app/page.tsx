'use client';
import { useEffect, useMemo, useState } from 'react';
import { allFilters } from '../filters';

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
function formatKST(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('en-US', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** -------- Searchable ComboBox (alphabetized externally via options prop) -------- */
type ComboOption = { value: string; label: string };

function ComboBox({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  width = '100%',
}: {
  options: ComboOption[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  width?: string | number;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState<string>('');

  const activeLabel = useMemo(
    () => options.find((o) => o.value === value)?.label ?? '',
    [options, value]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  return (
    <div style={{ position: 'relative', width }}>
      <div
        style={{
          display: 'flex',
          gap: 6,
          alignItems: 'center',
          border: '1px solid #cbd5e1',
          borderRadius: 6,
          padding: '6px 8px',
          background: '#fff',
          cursor: 'text',
        }}
        onClick={() => {
          setOpen(true);
        }}
      >
        <input
          value={open ? query : activeLabel}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent' }}
        />
        <span style={{ fontSize: 12, color: '#64748b' }}>▾</span>
      </div>

      {open && (
        <div
          style={{
            position: 'absolute',
            zIndex: 20,
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            maxHeight: 220,
            overflowY: 'auto',
            border: '1px solid #e2e8f0',
            background: '#fff',
            borderRadius: 6,
            boxShadow: '0 8px 18px rgba(0,0,0,0.08)',
          }}
        >
          {filtered.length === 0 ? (
            <div style={{ padding: 8, color: '#94a3b8', fontSize: 14 }}>No matches</div>
          ) : (
            filtered.map((o) => (
              <div
                key={o.value || 'none'}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(o.value);
                  setQuery('');
                  setOpen(false);
                }}
                style={{
                  padding: '8px 10px',
                  cursor: 'pointer',
                  background: o.value === value ? '#f1f5f9' : undefined,
                }}
              >
                {o.label}
              </div>
            ))
          )}
        </div>
      )}

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 10, background: 'transparent' }}
        />
      )}
    </div>
  );
}

/** ===== AST utils ===== */
function flattenConditions(ast: RuleAST): { id: string; params: any }[] {
  const out: { id: string; params: any }[] = [];
  const walk = (n: RuleAST) => {
    if (!n) return;
    if (n.type === 'condition') out.push({ id: n.id, params: n.params ?? {} });
    else if ((n.type === 'AND' || n.type === 'OR' || n.type === 'NOT') && Array.isArray((n as any).children)) {
      (n as any).children.forEach(walk);
    }
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
    if (Array.isArray(nodes) && nodes.length) children.push(...nodes);
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
  /** Filter state (modular by filter id) */
  const [filterValues, setFilterValues] = useState<Record<string, any>>({
    'base.exchange': { value: 'NASDAQ' },
  });

  /** Combos that control visibility of optional groups */
  const [fundamentalSel, setFundamentalSel] = useState<'' | 'base.marketCap'>('');
  const [technicalSel, setTechnicalSel] = useState<'' | 'ti.rsi'>('');

  /** Data & pagination */
  const [serverLimit, setServerLimit] = useState(50);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  /** Sorting */
  const [sortKey, setSortKey] = useState<SortKey>('marketCap');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  /** Client pagination */
  const [page, setPage] = useState(1);
  const pageSize = 25;

  /** Rules */
  const [ruleName, setRuleName] = useState('');
  const [saving, setSaving] = useState(false);
  const [rules, setRules] = useState<SavedRule[]>([]);
  const [loadingRules, setLoadingRules] = useState(false);
  const [rulesError, setRulesError] = useState<string | null>(null);

  /** Modals */
  const [viewOpen, setViewOpen] = useState(false);
  const [viewData, setViewData] = useState<{ name: string; fields: Record<string, string> } | null>(null);
  const [explainOpen, setExplainOpen] = useState(false);
  const [explainRow, setExplainRow] = useState<Row | null>(null);

  /** Help + data time */
  const [helpOpen, setHelpOpen] = useState(false);
  const [asOf, setAsOf] = useState<string | null>(null);

  /** Dynamic, alphabetized combo options from registry */
  const fundamentalOptions: ComboOption[] = useMemo(() => {
    const opts = allFilters
      .filter((f) => f.group === 'fundamental')
      .map((f) => ({ value: f.id, label: f.label }));
    return [{ value: '', label: 'None' }, ...opts.sort((a, b) => a.label.localeCompare(b.label))];
  }, []);

  const technicalOptions: ComboOption[] = useMemo(() => {
    const opts = allFilters
      .filter((f) => f.group === 'technical')
      .map((f) => ({ value: f.id, label: f.label }));
    return [{ value: '', label: 'None' }, ...opts.sort((a, b) => a.label.localeCompare(b.label))];
  }, []);

  /** ---- Backend runner ---- */
  async function runWithAst(ast: RuleAST, nextLimit?: number, append = false) {
    setLoading(true);
    setErr(null);
    const requestedLimit = Number.isFinite(nextLimit as number) ? (nextLimit as number) : serverLimit;
    try {
      const res = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ast, limit: requestedLimit })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = (json as any)?.error || `HTTP ${res.status}`;
        const detail = (json as any)?.detail ? ` — ${(json as any).detail}` : '';
        throw new Error(msg + detail);
      }

      setAsOf((json as any)?.asOf || (json as any)?.timestamp || new Date().toISOString());

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

  /** ---- Rules CRUD ---- */
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
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function loadRules() {
    setLoadingRules(true);
    setRulesError(null);
    try {
      const res = await fetch('/api/rules');
      const json = await res.json();
      setRules(Array.isArray(json.rules) ? json.rules : []);
    } catch (e: any) {
      setRulesError(e.message ?? 'Failed to load rules');
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

  useEffect(() => {
    loadRules();
  }, []);

  /** ---- Sorting (client-side) ---- */
  const sorted = useMemo(() => {
    const cp = [...rows];
    cp.sort((a, b) => {
      let av: any, bv: any;
      switch (sortKey) {
        case 'symbol':
        case 'companyName':
        case 'sector': {
          av = String((a as any)[sortKey] ?? '').toUpperCase();
          bv = String((b as any)[sortKey] ?? '').toUpperCase();
          return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
        }
        case 'price':
        case 'marketCap':
        case 'priceChangePct': {
          av = (a as any)[sortKey]; 
          bv = (b as any)[sortKey];
          if (typeof av !== 'number') av = -Infinity;
          if (typeof bv !== 'number') bv = -Infinity;
          return sortDir === 'asc' ? av - bv : bv - av;
        }
      }
    });
    return cp;
  }, [rows, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageRows = sorted.slice((page - 1) * pageSize, page * pageSize);

  /** ---- Dates / titles ---- */
  const today = new Date().toLocaleDateString('en-US', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'short',
    day: '2-digit'
  });

  const priceChangeVal = filterValues['pv.priceChangePctN'];
  const priceColTitle = priceChangeVal?.days ? `Price (${priceChangeVal.days} days % change)` : 'Price';

  /** ---- Resolve filter components by id (stable even if registry order changes) ---- */
  const ExchangeComp = useMemo(() => allFilters.find(f => f.id === 'base.exchange')!.Component, []);
  const SectorComp = useMemo(() => allFilters.find(f => f.id === 'base.sector')!.Component, []);
  const PriceChangeComp = useMemo(() => allFilters.find(f => f.id === 'pv.priceChangePctN')!.Component, []);
  const MarketCapComp = useMemo(() => allFilters.find(f => f.id === 'base.marketCap')!.Component, []);
  const RSIComp = useMemo(() => allFilters.find(f => f.id === 'ti.rsi')!.Component, []);

  /** ===== UI ===== */
  return (
    <main style={{ maxWidth: 1150, margin: '40px auto', padding: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginRight: 8 }}>Stock Screener</h1>
        <div style={{ marginLeft: 'auto', textAlign: 'right', color: '#64748b' }}>
          <div>{today}</div>
          <div style={{ fontSize: 12 }}>Data as of: {formatKST(asOf ?? undefined)} (KST)</div>
        </div>
      </div>

      {/* Friendly intro */}
      <p style={{ marginTop: 8, marginBottom: 8, color: '#334155' }}>
        This screener makes it easier to sort through many stocks and focus only on the ones that interest you.
        You can filter by things like exchange, sector, company size, or how the price has been moving.
        Once you find a set of conditions you like, save it as a rule so you can quickly check those stocks again later.
      </p>

      {/* Help panel */}
      <div style={{ marginBottom: 10 }}>
        <button
          onClick={() => setHelpOpen((v) => !v)}
          style={{ padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: 6, background: '#f8fafc' }}
          aria-expanded={helpOpen}
          aria-controls="help-panel"
        >
          {helpOpen ? 'Hide help' : 'How to use this screener'}
        </button>
        {helpOpen && (
          <div
            id="help-panel"
            style={{ marginTop: 8, padding: 10, border: '1px solid #e2e8f0', borderRadius: 8, background: '#ffffff' }}
          >
            <ol style={{ margin: 0, paddingLeft: 18, color: '#334155' }}>
              <li style={{ marginBottom: 6 }}>
                <b>Set filters</b>: Exchange, Sector, Price Change; use Fundamental/Technical combos to add Market Cap or RSI.
              </li>
              <li style={{ marginBottom: 6 }}>
                <b>Run</b>: press <i>Run</i> to fetch and display matching stocks.
              </li>
              <li style={{ marginBottom: 6 }}>
                <b>Sort</b>: "Sort By" and "Sort Direction" to reorder results.
              </li>
              <li style={{ marginBottom: 6 }}>
                <b>More</b>: results load in batches of 50. Click <i>More</i> to load the next batch.
              </li>
              <li>
                <b>Save rules</b>: name your filters to reuse later; click a rule's name to apply it again. Use <i>View</i> or <i>Delete</i>.
              </li>
            </ol>
          </div>
        )}
      </div>

      {/* Hint */}
      <div style={{ color: '#334155', marginBottom: 16 }}>
        Set filters → <b>Run</b>. Click column headers to sort. ({sorted.length} results loaded)
      </div>

      {/* Always-visible filters */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: 10,
          marginBottom: 10
        }}
      >
        {/* Exchange */}
        <div>
          <ExchangeComp
            value={filterValues['base.exchange']}
            onChange={(v) => setFilterValues((s) => ({ ...s, 'base.exchange': v }))}
          />
        </div>

        {/* Sector */}
        <div>
          <SectorComp
            value={filterValues['base.sector']}
            onChange={(v) => setFilterValues((s) => ({ ...s, 'base.sector': v }))}
          />
        </div>

        {/* Price Change (2 controls inside) */}
        <div style={{ gridColumn: 'span 2' }}>
          <PriceChangeComp
            value={filterValues['pv.priceChangePctN']}
            onChange={(v) => setFilterValues((s) => ({ ...s, 'pv.priceChangePctN': v }))}
          />
        </div>

        {/* Sorting field */}
        <div>
          <div style={{ fontSize: 12, color: '#64748b' }}>Sort By</div>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            style={{ width: '100%' }}
          >
            <option value="marketCap">Market Cap</option>
            <option value="price">Price</option>
            <option value="priceChangePct">Price Change (%)</option>
            <option value="symbol">Symbol</option>
            <option value="companyName">Company Name</option>
            <option value="sector">Sector</option>
          </select>
        </div>

        {/* Sorting direction */}
        <div>
          <div style={{ fontSize: 12, color: '#64748b' }}>Sort Direction</div>
          <select
            value={sortDir}
            onChange={(e) => setSortDir(e.target.value as 'asc' | 'desc')}
            style={{ width: '100%' }}
          >
            {sortKey === 'marketCap' || sortKey === 'price' || sortKey === 'priceChangePct' ? (
              <>
                <option value="asc">Low → High</option>
                <option value="desc">High → Low</option>
              </>
            ) : (
              <>
                <option value="asc">A → Z</option>
                <option value="desc">Z → A</option>
              </>
            )}
          </select>
        </div>

        {/* Fundamental combo (searchable, alphabetized) */}
        <div>
          <div style={{ fontSize: 12, color: '#64748b' }}>Fundamental</div>
          <ComboBox
            options={fundamentalOptions}
            value={fundamentalSel}
            onChange={(v) => setFundamentalSel(v as ('' | 'base.marketCap'))}
            placeholder="Choose a fundamental filter"
          />
        </div>

        {/* Technical combo (searchable, alphabetized) */}
        <div>
          <div style={{ fontSize: 12, color: '#64748b' }}>Technical</div>
          <ComboBox
            options={technicalOptions}
            value={technicalSel}
            onChange={(v) => setTechnicalSel(v as ('' | 'ti.rsi'))}
            placeholder="Choose a technical filter"
          />
        </div>
      </div>

      {/* Conditional groups */}
      {fundamentalSel === 'base.marketCap' && (
        <div style={{ marginBottom: 10, border: '1px solid #e2e8f0', borderRadius: 10, padding: 10 }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Fundamental — Market Cap</div>
          <MarketCapComp
            value={filterValues['base.marketCap']}
            onChange={(v) => setFilterValues((s) => ({ ...s, 'base.marketCap': v }))}
          />
        </div>
      )}

      {technicalSel === 'ti.rsi' && (
        <div style={{ marginBottom: 10, border: '1px solid #e2e8f0', borderRadius: 10, padding: 10 }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Technical — RSI</div>
          <RSIComp
            value={filterValues['ti.rsi']}
            onChange={(v) => setFilterValues((s) => ({ ...s, 'ti.rsi': v }))}
          />
        </div>
      )}

      {/* Actions */}
      <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={run} disabled={loading} style={{ padding: '8px 14px' }}>
          {loading ? 'Loading…' : 'Run'}
        </button>
        <button
          onClick={() => {
            setFilterValues({ 'base.exchange': { value: 'NASDAQ' }, 'base.sector': { value: '' } });
            setFundamentalSel('');
            setTechnicalSel('');
          }}
          style={{ padding: '8px 14px' }}
        >
          Reset Filters
        </button>
      </div>

      {/* Save Rule */}
      <div style={{ marginTop: 16, padding: 12, border: '1px solid #e2e8f0', borderRadius: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Save current filters as a Rule</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            value={ruleName}
            onChange={(e) => setRuleName(e.target.value)}
            placeholder="Rule name (e.g., Large Caps up ≥5% / 20d + RSI≤30)"
            style={{ flex: '1 1 320px', padding: 8, border: '1px solid #cbd5e1', borderRadius: 8 }}
          />
          <button onClick={saveCurrentRule} disabled={saving} style={{ padding: '8px 14px' }}>
            {saving ? 'Saving…' : 'Save Rule'}
          </button>
        </div>
      </div>

      {/* My Rules */}
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
              {rules.map((r) => (
                <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: 8 }}>
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        applyRuleAndRun(r);
                      }}
                      style={{ color: '#2563eb', textDecoration: 'none' }}
                      onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                      onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                      title="Click to apply this rule and run"
                    >
                      {r.name}
                    </a>
                  </td>
                  <td style={{ padding: 8, color: '#64748b' }}>{new Date(r.updatedAt).toLocaleString()}</td>
                  <td style={{ padding: 8, display: 'flex', gap: 8 }}>
                    <button onClick={() => openViewModal(r)} title="View rule details" style={{ padding: '6px 10px' }}>
                      View
                    </button>
                    <button onClick={() => deleteRule(r.id)} title="Delete rule" style={{ padding: '6px 10px' }}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {rules.length === 0 && !loadingRules && (
                <tr>
                  <td colSpan={3} style={{ padding: 8, color: '#64748b' }}>
                    No saved rules yet.
                  </td>
                </tr>
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

      {/* Results */}
      <div style={{ marginTop: 16, overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 12 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1 }}>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>
              {[
                { key: 'symbol', label: 'Symbol' },
                { key: 'companyName', label: 'Company' },
                { key: 'price', label: priceColTitle, right: true },
                { key: 'marketCap', label: 'Market Cap', right: true },
                { key: 'sector', label: 'Sector' }
              ].map((c: any) => (
                <th
                  key={c.key}
                  style={{ padding: 10, cursor: 'pointer', textAlign: c.right ? 'right' : 'left' }}
                  title="Click to sort"
                  onClick={() => {
                    const k = c.key as SortKey;
                    if (sortKey === k) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
                    else {
                      setSortKey(k);
                      setSortDir(k === 'symbol' || k === 'companyName' || k === 'sector' ? 'asc' : 'desc');
                    }
                  }}
                >
                  {c.label} {sortKey === c.key ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                </th>
              ))}
              <th style={{ padding: 10, textAlign: 'right' }}>RSI</th>
              <th style={{ padding: 10, textAlign: 'right' }}>Volume</th>
              <th style={{ padding: 10 }}>Explain</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r) => {
              const pct = r.priceChangePct;
              const color =
                typeof pct === 'number'
                  ? (pct > 0 ? '#ef4444' : pct < 0 ? '#2563eb' : undefined)
                  : undefined;
              const priceCell = priceChangeVal?.days
                ? `${formatUsd(r.price)} (${formatPct(pct)})`
                : formatUsd(r.price);
              const rsiColor =
                typeof r.rsi === 'number'
                  ? (r.rsi <= 30 ? '#2563eb' : r.rsi >= 70 ? '#ef4444' : undefined)
                  : undefined;

              return (
                <tr key={r.symbol} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: 10 }}>{r.symbol}</td>
                  <td style={{ padding: 10 }}>{r.companyName ?? '—'}</td>
                  <td style={{ padding: 10, textAlign: 'right', color }}>{priceCell}</td>
                  <td style={{ padding: 10, textAlign: 'right' }}>${formatInt(r.marketCap)}</td>
                  <td style={{ padding: 10 }}>{r.sector ?? '—'}</td>
                  <td style={{ padding: 10, textAlign: 'right', color: rsiColor }}>
                    {typeof r.rsi === 'number' ? r.rsi.toFixed(2) : '—'}
                  </td>
                  <td style={{ padding: 10, textAlign: 'right' }}>{formatInt(r.volume)}</td>
                  <td style={{ padding: 10 }}>
                    {Array.isArray(r.explain) ? (
                      <button
                        onClick={() => {
                          setExplainRow(r);
                          setExplainOpen(true);
                        }}
                      >
                        Explain
                      </button>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>—</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {!loading && pageRows.length === 0 && !err && (
              <tr>
                <td colSpan={8} style={{ padding: 16, color: '#6b7280' }}>
                  No results. Adjust filters and press <b>Run</b>.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Client pagination + server "More" */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12, flexWrap: 'wrap' }}>
        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
          Prev
        </button>
        <div style={{ fontSize: 12, color: '#64748b' }}>
          Page {page} / {totalPages}
        </div>
        <button onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages}>
          Next
        </button>
        <span style={{ flex: '1 0 12px' }} />
        <button onClick={loadMore} disabled={loading || !hasMore} style={{ padding: '8px 14px' }}>
          {hasMore ? (loading ? 'Loading…' : 'More (next 50)') : 'No more'}
        </button>
      </div>

      {/* View Rule Modal */}
      {viewOpen && viewData && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16
          }}
          onClick={() => setViewOpen(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: 12,
              width: '100%',
              maxWidth: 520,
              boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: 16,
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ fontWeight: 700 }}>{viewData.name}</div>
              <button onClick={() => setViewOpen(false)} style={{ padding: '6px 10px' }}>
                Close
              </button>
            </div>
            <div style={{ padding: 16 }}>
              <dl style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {Object.entries(viewData.fields).map(([k, v]) => (
                  <div key={k} style={{ display: 'contents' }}>
                    <dt style={{ color: '#64748b' }}>{k}</dt>
                    <dd style={{ textAlign: 'right' }}>{v}</dd>
                  </div>
                ))}
              </dl>
              {Object.keys(viewData.fields).length === 0 && (
                <div style={{ color: '#64748b' }}>No parameters set for this rule.</div>
              )}
            </div>
            <div
              style={{
                padding: 16,
                borderTop: '1px solid #e5e7eb',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 8
              }}
            >
              <button onClick={() => setViewOpen(false)} style={{ padding: '8px 14px' }}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Explain Modal */}
      {explainOpen && explainRow && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16
          }}
          onClick={() => setExplainOpen(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: 12,
              width: '100%',
              maxWidth: 520,
              boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: 16,
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ fontWeight: 700 }}>Why did {explainRow.symbol} match?</div>
              <button onClick={() => setExplainOpen(false)} style={{ padding: '6px 10px' }}>
                Close
              </button>
            </div>
            <div style={{ padding: 16 }}>
              {Array.isArray(explainRow.explain) ? (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>
                      <th style={{ padding: 8 }}>Condition</th>
                      <th style={{ padding: 8 }}>Value</th>
                      <th style={{ padding: 8 }}>Pass?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {explainRow.explain.map((e, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: 8 }}>{e.id}</td>
                        <td style={{ padding: 8 }}>{e.value ?? '—'}</td>
                        <td style={{ padding: 8, color: e.pass ? '#16a34a' : '#b91c1c' }}>{e.pass ? 'Yes' : 'No'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ color: '#64748b' }}>No explain data.</div>
              )}
            </div>
            <div
              style={{
                padding: 16,
                borderTop: '1px solid #e5e7eb',
                display: 'flex',
                justifyContent: 'flex-end'
              }}
            >
              <button onClick={() => setExplainOpen(false)} style={{ padding: '8px 14px' }}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}




