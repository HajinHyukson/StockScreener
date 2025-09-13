'use client';
import { useScreener } from '@/screener/ui/ScreenerProvider';
import { formatInt, formatUsd } from '@/utils/format';


type Row = {
  symbol: string; companyName?: string; price?: number; sector?: string; volume?: number;
  marketCap?: number; per?: number; rsi?: number; priceChangePct?: number; dailyChangePct?: number;
  explain?: { id: string; pass: boolean; value?: string }[];
};


export default function ResultsTable() {
  const { state, view } = useScreener();


  return (
    <div style={{ marginTop: 16, overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 12 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1 }}>
          <tr style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>
            <th style={{ padding: 10 }}>Symbol</th>
            <th style={{ padding: 10 }}>Company</th>
            <th style={{ padding: 10 }}>Sector</th>
            <th style={{ padding: 10, textAlign: 'right' }}>Price (Daily %)</th>
            {state.fundamentalSel.includes('base.marketCap') && <th style={{ padding: 10, textAlign: 'right' }}>Market Cap</th>}
            {state.fundamentalSel.includes('fa.per') && <th style={{ padding: 10, textAlign: 'right' }}>PER</th>}
            {state.technicalSel.includes('ti.rsi') && <th style={{ padding: 10, textAlign: 'right' }}>RSI</th>}
            {!!state.filterValues['pv.priceChangePctN'] && <th style={{ padding: 10, textAlign: 'right' }}>Price Δ</th>}
            <th style={{ padding: 10 }}>Explain</th>
          </tr>
        </thead>
        <tbody>
          {(view.pageRows.length === 0 && !state.loading && !state.err) ? (
            <tr><td colSpan={8} style={{ padding: 16, color: '#6b7280' }}>No results. Adjust filters and press <b>Run</b>.</td></tr>
          ) : (
            view.pageRows.map((r: Row) => {
              const daily = r.dailyChangePct;
              const color = typeof daily === 'number' ? (daily > 0 ? '#ef4444' : daily < 0 ? '#2563eb' : undefined) : undefined;
              const dailyTxt = typeof daily === 'number' ? ` (${daily.toFixed(2)}%)` : '';
              return (
                <tr key={r.symbol} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: 10 }}>{r.symbol}</td>
                  <td style={{ padding: 10 }}>{r.companyName ?? '—'}</td>
                  <td style={{ padding: 10 }}>{r.sector ?? '—'}</td>
                  <td style={{ padding: 10, textAlign: 'right', color }}>{formatUsd(r.price)}{dailyTxt}</td>
                  {state.fundamentalSel.includes('base.marketCap') && <td style={{ padding: 10, textAlign: 'right' }}>${formatInt(r.marketCap)}</td>}
                  {state.fundamentalSel.includes('fa.per') && <td style={{ padding: 10, textAlign: 'right' }}>{typeof r.per === 'number' ? r.per.toFixed(2) : '—'}</td>}
                  {state.technicalSel.includes('ti.rsi') && <td style={{ padding: 10, textAlign: 'right' }}>{typeof r.rsi === 'number' ? r.rsi.toFixed(2) : '—'}</td>}
                  {!!state.filterValues['pv.priceChangePctN'] && <td style={{ padding: 10, textAlign: 'right' }}>{typeof r.priceChangePct === 'number' ? `${r.priceChangePct.toFixed(2)}%` : '—'}</td>}
                  <td style={{ padding: 10 }}>
                    {Array.isArray(r.explain) ? (
                      <button onClick={() => { state.setExplainRow(r); state.setExplainOpen(true); }}>Explain</button>
                    ) : <span style={{ color: '#94a3b8' }}>—</span>}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}




