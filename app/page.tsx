
'use client';
import { useState, useMemo } from 'react';

type Row = {
  symbol: string;
  companyName?: string;
  price?: number;
  marketCap?: number;
  sector?: string;
  volume?: number;
};

type SortKey = 'symbol' | 'companyName' | 'price' | 'marketCap' | 'sector' | 'volume';

export default function Page() {
  // Filters
  const [exchange, setExchange] = useState('NASDAQ');
  const [sector, setSector] = useState('');
  const [mktMin, setMktMin] = useState('10000000000');
  const [mktMax, setMktMax] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [volumeMin, setVolumeMin] = useState('');
  const [limit, setLimit] = useState('25');

  // Data & UI state
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Table UX
  const [sortBy, setSortBy] = useState<SortKey>('marketCap');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const pageSize = 25;

  async function run() {
    setLoading(true); setErr(null); setPage(1);
    try {
      const qs = new URLSearchParams({
        exchange, limit,
        ...(sector   ? { sector } : {}),
        ...(mktMin   ? { marketCapMoreThan: mktMin } : {}),
        ...(mktMax   ? { marketCapLowerThan: mktMax } : {}),
        ...(priceMin ? { priceMoreThan: priceMin } : {}),
        ...(priceMax ? { priceLowerThan: priceMax } : {}),
        ...(volumeMin? { volumeMoreThan: volumeMin } : {})
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
    else { setSortBy(key); setSortDir(key === 'symbol' || key === 'companyName' || key === 'sector' ? 'asc' : 'desc'); }
  }

  const sorted = useMemo(() => {
    const cp = [...rows];
    cp.sort((a, b) => {
      const av = (a as any)[sortBy]; const bv = (b as any)[sortBy];
      if (typeof av === 'number' && typeof bv === 'number') return sortDir === 'asc' ? av - bv : bv - av;
      const as = String(av ?? '').toUpperCase(); const bs = String(bv ?? '').toUpperCase();
      return sortDir === 'asc' ? as.localeCompare(bs) : bs.localeCompare(as);
    });
    return cp;
  }, [rows, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageRows = sorted.slice((page - 1) * pageSize, page * pageSize);

  return (
    <main style={{ maxWidth: 1040, margin: '40px auto', padding: 16 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>Stock Screener</h1>
      <p style={{ color: '#334155', marginBottom: 16 }}>Set filters → <b>Run</b>. Click headers to sort. ({sorted.length} results)</p>

      {/* Filters */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
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
          <input value={mktMin} onChange={(e) => setMktMin(e.target.value)} inputMode="numeric" style={{ width: '100%' }} />
        </div>
        <div>
          <div style={{ fontSize: 12, color: '#64748b' }}>Market Cap Max (USD)</div>
          <input value={mktMax} onChange={(e) => setMktMax(e.target.value)} inputMode="numeric" style={{ width: '100%' }} />
        </div>
        <div>
          <div style={{ fontSize: 12, color: '#64748b' }}>Price Min</div>
          <input value={priceMin} onChange={(e) => setPriceMin(e.target.value)} inputMode="decimal" style={{ width: '100%' }} />
        </div>
        <div>
          <div style={{ fontSize: 12, color: '#64748b' }}>Price Max</div>
          <input value={priceMax} onChange={(e) => setPriceMax(e.target.value)} inputMode="decimal" style={{ width: '100%' }} />
        </div>
        <div>
          <div style={{ fontSize: 12, color: '#64748b' }}>Avg Volume Min</div>
          <input value={volumeMin} onChange={(e) => setVolumeMin(e.target.value)} inputMode="numeric" style={{ width: '100%' }} />
        </div>
        <div>
          <div style={{ fontSize: 12, color: '#64748b' }}>Limit (server)</div>
          <input value={limit} onChange={(e) => setLimit(e.target.value)} inputMode="numeric" style={{ width: '100%' }} />
        </div>
      </div>

      {/* Actions */}
      <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
        <button onClick={run} disabled={loading} style={{ padding: '8px 14px' }}>{loading ? 'Loading…' : 'Run'}</button>
        <button onClick={() => { setSector(''); setMktMin(''); setMktMax(''); setPriceMin(''); setPriceMax(''); setVolumeMin(''); }} style={{ padding: '8px 14px' }}>
          Reset filters
        </button>
      </div>

      {err && <div style={{ marginTop: 10, color: '#b91c1c', background: '#fee2e2', padding: 8, borderRadius: 8 }}>Error: {err}</div>}

      {/* Table */}
      <div style={{ marginTop: 16, overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 12 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1 }}>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>
              {[
                { key: 'symbol', label: 'Symbol' },
                { key: 'companyName', label: 'Name' },
                { key: 'price', label: 'Price', right: true },
                { key: 'marketCap', label: 'Market Cap', right: true },
                { key: 'sector', label: 'Sector' },
                { key: 'volume', label: 'Volume', right: true }
              ].map((c: any) => (
                <th key={c.key}
                    onClick={() => toggleSort(c.key as SortKey)}
                    style={{ padding: 10, cursor: 'pointer', textAlign: c.right ? 'right' : 'left' }}
                    title="Click to sort">
                  {c.label} {(sortBy === c.key) ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r) => (
              <tr key={r.symbol} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: 10 }}>{r.symbol}</td>
                <td style={{ padding: 10 }}>{r.companyName ?? '—'}</td>
                <td style={{ padding: 10, textAlign: 'right' }}>{r.price ?? '—'}</td>
                <td style={{ padding: 10, textAlign: 'right' }}>{r.marketCap ?? '—'}</td>
                <td style={{ padding: 10 }}>{r.sector ?? '—'}</td>
                <td style={{ padding: 10, textAlign: 'right' }}>{r.volume ?? '—'}</td>
              </tr>
            ))}
            {!loading && pageRows.length === 0 && !err && (
              <tr><td colSpan={6} style={{ padding: 16, color: '#6b7280' }}>
                No results. Adjust filters and press <b>Run</b>.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12 }}>
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>Prev</button>
        <div style={{ fontSize: 12, color: '#64748b' }}>Page {page} / {Math.max(1, Math.ceil(sorted.length / pageSize))}</div>
        <button onClick={() => setPage(p => Math.min(Math.max(1, Math.ceil(sorted.length / pageSize)), p + 1))}
                disabled={page >= Math.max(1, Math.ceil(sorted.length / pageSize))}>
          Next
        </button>
      </div>
    </main>
  );
}
