'use client';
import { useMemo, useState } from 'react';

type Row = {
  symbol: string;
  companyName?: string;
  price?: number;
  marketCap?: number;
  sector?: string;
  volume?: number;
};

type SortKey = 'symbol' | 'companyName' | 'price' | 'marketCap' | 'sector' | 'volume';

function formatInt(n?: number) {
  if (typeof n !== 'number' || !isFinite(n)) return '—';
  return n.toLocaleString('en-US');
}

export default function Page() {
  // Base filters
  const [exchange, setExchange] = useState('NASDAQ');
  const [sector, setSector] = useState('');
  const [mktMin, setMktMin] = useState('10000000000'); // default $10B
  const [mktMax, setMktMax] = useState('');

  // New change filters
  const [priceChangePctMin, setPriceChangePctMin] = useState(''); // e.g., 5 (%)
  const [priceChangeDays, setPriceChangeDays] = useState('');     // e.g., 20 (days)
  const [volChangePctMin, setVolChangePctMin] = useState('');     // e.g., 20 (%)
  const [volChangeDays, setVolChangeDays] = useState('');         // e.g., 20 (days)

  // Server limit and results
  const [limit, setLimit] = useState('25'); // keep modest for free tier
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Table UX
  const [sortBy, setSortBy] = useState<SortKey>('marketCap');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const pageSize = 25;

  async function run() {
    setLoading(true);
    setErr(null);
    setPage(1);

    try {
      const qs = new URLSearchParams({
        exchange,
        limit,
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
      setErr(e.message ?? 'Error');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  function toggleSort(key: SortKey) {
    if (sortBy === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
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

  // Today’s date in KST (as you’re based in Korea)
  const today = new Date().toLocaleDateString('en-US', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'short',
    day: '2-digit'
  });

  return (
    <main style={{ maxWidth: 1100, margin: '40px auto', padding: 16 }}>
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
            <option>NASDAQ</option>
            <option>NYSE</option>
            <option>AMEX</option>
          </select>
        </div>

        <div>
          <div style={{ fontSize: 12, color: '#64748b' }}>Sector</div>
          <select value={sector} onChange={(e) => setSector(e.target.value)} style={{ width: '100%' }}>
            <option value="">Any</option>
            <option>Technology</option>
            <option>Financial Services</option>
            <option>Healthcare</option>
            <option>Consumer Cyclical</option>
            <option>Consumer Defensive</option>
            <option>Industrials</option>
            <option>Energy</option>
            <option>Basic Materials</option>
            <option>Utilities</option>
            <option>Real Estate</option>
            <option>Communication Services</option>
          </select>
        </div>

        {/* Market cap with $ adornments */}
        <div>
          <div style={{ fontSize: 12, color: '#64748b' }}>Market Cap Min (USD)</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>$</span>
            <input
              value={mktMin}
              onChange={(e) => setMktMin(e.target.value)}
              inputMode="numeric"
              style={{ width: '100%' }}
              placeholder="e.g., 10000000000"
            />
          </div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: '#64748b' }}>Market Cap Max (USD)</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>$</span>
            <input
              value={mktMax}
              onChange={(e) => setMktMax(e.target.value)}
              inputMode="numeric"
              style={{ width: '100%' }}
              placeholder="optional"
            />
          </div>
        </div>

        {/* Price change filter */}
        <div>
          <div style={{ fontSize: 12, color: '#64748b' }}>Price change ≥ (%)</div>
          <input
            value={priceChangePctMin}
            onChange={(e) => setPriceChangePctMin(e.target.value)}
            inputMode="decimal"
            style={{ width: '100%' }}
            placeholder="e.g., 5"
          />
        </div>
        <div>
          <div style={{ fontSize: 12, color: '#64748b' }}>over last (days)</div>
          <input
            value={priceChangeDays}
            onChange={(e) => setPriceChangeDays(e.target.value)}
            inputMode="numeric"
            style={{ width: '100%' }}
            placeholder="e.g., 20"
          />
        </div>

        {/* Volume change filter */}
        <div>
          <div style={{ fontSize: 12, color: '#64748b' }}>Volume change ≥ (%)</div>
          <input
            value={volChangePctMin}
            onChange={(e) => setVolChangePctMin(e.target.value)}
            inputMode="decimal"
            style={{ width: '100%' }}
            placeholder="e.g., 20"
          />
        </div>
        <div>
          <div style={{ fontSize: 12, color: '#64748b' }}>over last (days)</div>
          <input
            value={volChangeDays}
            onChange={(e) => setVolChangeDays(e.target.value)}
            inputMode="numeric"
            style={{ width: '100%' }}
            placeholder="e.g., 20"
          />
        </div>

        <div>
          <div style={{ fontSize: 12, color: '#64748b' }}>Limit (server)</div>
          <input
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            inputMode="numeric"
            style={{ width: '100%' }}
            placeholder="e.g., 25"
          />
        </div>
      </div>

      {/* Actions */}
      <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={run} disabled={loading} style={{ padding: '8px 14px' }}>
          {loading ? 'Loading…' : 'Run'}
        </button>
        <button
          onClick={() => {
            setSector('');
            setMktMin('');
            setMktMax('');
            setPriceChangePctMin('');
            setPriceChangeDays('');
            setVolChangePctMin('');
            setVolChangeDays('');
          }}
          style={{ padding: '8px 14px' }}
        >
          Reset filters
        </button>
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
                { key: 'price', label: 'Price', right: true },
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
            {pageRows.map((r) => (
              <tr key={r.symbol} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: 10 }}>{r.symbol}</td>
                <td style={{ padding: 10 }}>{r.companyName ?? '—'}</td>
                <td style={{ padding: 10, textAlign: 'right' }}>{r.price ?? '—'}</td>
                <td style={{ padding: 10, textAlign: 'right' }}>${formatInt(r.marketCap)}</td>
                <td style={{ padding: 10 }}>{r.sector ?? '—'}</td>
                <td style={{ padding: 10, textAlign: 'right' }}>{formatInt(r.volume)}</td>
              </tr>
            ))}
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
        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
          Prev
        </button>
        <div style={{ fontSize: 12, color: '#64748b' }}>
          Page {page} / {totalPages}
        </div>
        <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
          Next
        </button>
      </div>
    </main>
  );
}
