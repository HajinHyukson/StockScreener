'use client';
import { useEffect, useMemo, useState } from 'react';
import { allFilters } from '../lib/filters';

/**Hook imports */
import { useScreenerState } from '../lib/screener/hooks/useScreenerState';
import { useCombos } from '../lib/screener/hooks/useCombos';
import { useScreenerActions } from '../lib/screener/hooks/useScreenerActions';
import { useResultsView } from '../lib/screener/hooks/useResultsView';
import MultiComboBox from '../app/components/MultiComboBox';
import { formatInt, formatUsd, formatKST } from '../lib/utils/format';



type Row = {
  symbol: string; companyName?: string; price?: number; sector?: string; volume?: number;
  marketCap?: number; per?: number; rsi?: number; priceChangePct?: number; dailyChangePct?: number;
  explain?: { id: string; pass: boolean; value?: string }[];
};


export default function Page() {
  const state = useScreenerState<Row>();
  const { fundamentalOptions, technicalOptions, pruneInactive } = useCombos(state.fundamentalSel, state.technicalSel);
  const actions = useScreenerActions(state, { pruneInactive });
  const view = useResultsView(state);


  useEffect(() => { actions.loadRules(); /* eslint-disable-next-line */ }, []);


  return (
    <main style={{ maxWidth: 1150, margin: '40px auto', padding: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginRight: 8 }}>Stock Screener</h1>
        <div style={{ marginLeft: 'auto', textAlign: 'right', color: '#64748b' }}>
          <div>{view.today}</div>
          <div style={{ fontSize: 12 }}>Data as of: {formatKST(state.asOf ?? undefined)} (KST)</div>
        </div>
      </div>


      {/* Intro */}
      <p style={{ marginTop: 8, marginBottom: 8, color: '#334155' }}>
        This screener makes it easier to sort through many stocks and focus only on the ones that interest you.
        You can filter by things like exchange, sector, company size, or how the price has been moving.
        Once you find a set of conditions you like, save it as a rule so you can quickly check those stocks again later.
      </p>


      {/* Always-visible filter panels (Exchange, Sector, Price Change) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10, marginBottom: 10 }}>
        <div>
          {(() => { const Mod = allFilters.find(f => f.id === 'base.exchange')!.Component;
            return <Mod value={state.filterValues['base.exchange']} onChange={(v: any) => state.setFilterValues((s: any) => ({ ...s, 'base.exchange': v }))} />; })()}
        </div>
        <div>
          {(() => { const Mod = allFilters.find(f => f.id === 'base.sector')!.Component;
            return <Mod value={state.filterValues['base.sector']} onChange={(v: any) => state.setFilterValues((s: any) => ({ ...s, 'base.sector': v }))} />; })()}
        </div>
        <div style={{ gridColumn: 'span 2' }}>
          {(() => { const Mod = allFilters.find(f => f.id === 'pv.priceChangePctN')!.Component;
            return <Mod value={state.filterValues['pv.priceChangePctN']} onChange={(v: any) => state.setFilterValues((s: any) => ({ ...s, 'pv.priceChangePctN': v }))} />; })()}
        </div>


        {/* Sorting controls */}
        <div>
          <div style={{ fontSize: 12, color: '#64748b' }}>Sort By</div>
          <select value={state.sortKey} onChange={(e) => state.setSortKey(e.target.value as any)} style={{ width: '100%' }}>
            <option value="marketCap">Market Cap</option>
            <option value="price">Price</option>
            <option value="priceChangePct">Price Change (%)</option>
            <option value="symbol">Symbol</option>
            <option value="companyName">Company Name</option>
            <option value="sector">Sector</option>
          </select>
        </div>
        <div>
          <div style={{ fontSize: 12, color: '#64748b' }}>Sort Direction</div>
          <select value={state.sortDir} onChange={(e) => state.setSortDir(e.target.value as any)} style={{ width: '100%' }}>
            {state.sortKey === 'marketCap' || state.sortKey === 'price' || state.sortKey === 'priceChangePct'
              ? (<><option value="asc">Low → High</option><option value="desc">High → Low</option></>)
              : (<><option value="asc">A → Z</option><option value="desc">Z → A</option></>)}
          </select>
        </div>


        {/* Fundamental / Technical combos */}
        <div>
          <div style={{ fontSize: 12, color: '#64748b' }}>Fundamental</div>
          <MultiComboBox options={fundamentalOptions} values={state.fundamentalSel} onChange={vals => state.setFundamentalSel(vals)} />
        </div>
        <div>
          <div style={{ fontSize: 12, color: '#64748b' }}>Technical</div>
          <MultiComboBox options={technicalOptions} values={state.technicalSel} onChange={vals => state.setTechnicalSel(vals)} />
        </div>
      </div>


      {/* Selected fundamental panels */}
      {state.fundamentalSel.map(fid => {
        const f = allFilters.find(ff => ff.id === fid); if (!f) return null;
        const Mod = f.Component;
        return <div key={fid} style={{ marginBottom: 10, border: '1px solid #e2e8f0', borderRadius: 10, padding: 10 }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Fundamental — {f.label}</div>
          <Mod value={state.filterValues[fid]} onChange={(v: any) => state.setFilterValues((s: any) => ({ ...s, [fid]: v }))} />
        </div>;
      })}


      {/* Selected technical panels */}
      {state.technicalSel.map(tid => {
        const f = allFilters.find(ff => ff.id === tid); if (!f) return null;
        const Mod = f.Component;
        return <div key={tid} style={{ marginBottom: 10, border: '1px solid #e2e8f0', borderRadius: 10, padding: 10 }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Technical — {f.label}</div>
          <Mod value={state.filterValues[tid]} onChange={(v: any) => state.setFilterValues((s: any) => ({ ...s, [tid]: v }))} />
        </div>;
      })}


      {/* Actions */}
      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
        <button onClick={actions.run} disabled={state.loading}>{state.loading ? 'Loading…' : 'Run'}</button>
        <button onClick={() => { state.setFilterValues({ 'base.exchange': { value: 'NASDAQ' }, 'base.sector': { value: '' } }); state.setFundamentalSel([]); state.setTechnicalSel([]); }}>Reset</button>
      </div>


      {/* Save Rule */}
      <div style={{ marginTop: 16, padding: 12, border: '1px solid #e2e8f0', borderRadius: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Save current filters as a Rule</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input value={state.ruleName} onChange={(e) => state.setRuleName(e.target.value)} placeholder="Rule name…" style={{ flex: '1 1 320px', padding: 8, border: '1px solid #cbd5e1', borderRadius: 8 }} />
          <button onClick={actions.saveRule} disabled={state.saving}>{state.saving ? 'Saving…' : 'Save Rule'}</button>
        </div>
      </div>


      {/* My Rules */}
      <div style={{ marginTop: 16, padding: 12, border: '1px solid #e2e8f0', borderRadius: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={{ fontWeight: 600 }}>My Rules</div>
          <button onClick={actions.loadRules} disabled={state.loadingRules}>{state.loadingRules ? 'Refreshing…' : 'Refresh'}</button>
        </div>
        {state.rulesError && <div style={{ color: '#b91c1c', marginTop: 8 }}>Error: {state.rulesError}</div>}
        <div style={{ marginTop: 8, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}><th style={{ padding: 8 }}>Name</th><th style={{ padding: 8 }}>Updated</th><th style={{ padding: 8 }}>Actions</th></tr></thead>
            <tbody>
              {state.rules.map((r) => (
                <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: 8 }}><a href="#" onClick={(e) => { e.preventDefault(); actions.applyRuleAndRun(r); }} style={{ color: '#2563eb', textDecoration: 'none' }}>{r.name}</a></td>
                  <td style={{ padding: 8, color: '#64748b' }}>{new Date(r.updatedAt).toLocaleString()}</td>
                  <td style={{ padding: 8, display: 'flex', gap: 8 }}>
                    <button onClick={() => actions.openViewModal(r)}>View</button>
                    <button onClick={() => actions.deleteRule(r.id)}>Delete</button>
                  </td>
                </tr>
              ))}
              {state.rules.length === 0 && !state.loadingRules && (
                <tr><td colSpan={3} style={{ padding: 8, color: '#64748b' }}>No saved rules yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>


      {state.err && <div style={{ marginTop: 10, color: '#b91c1c', background: '#fee2e2', padding: 8, borderRadius: 8 }}>Error: {state.err}</div>}


      {/* Results */}
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


      {/* Pagination + More */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12, flexWrap: 'wrap' }}>
        <button onClick={() => state.setPage((p: number) => Math.max(1, p - 1))} disabled={state.page <= 1}>Prev</button>
        <div style={{ fontSize: 12, color: '#64748b' }}>Page {state.page} / {view.totalPages}</div>
        <button onClick={() => state.setPage((p: number) => p + 1)} disabled={state.page >= view.totalPages}>Next</button>
        <span style={{ flex: '1 0 12px' }} />
        <button onClick={actions.loadMore} disabled={state.loading || !state.hasMore} style={{ padding: '8px 14px' }}>
          {state.hasMore ? (state.loading ? 'Loading…' : 'More (next 50)') : 'No more'}
        </button>
      </div>


      {/* View Rule Modal */}
      {state.viewOpen && state.viewData && (
        <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => state.setViewOpen(false)}>
          <div style={{ background: 'white', borderRadius: 12, width: '100%', maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: 16, borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ fontWeight: 700 }}>{state.viewData.name}</div>
              <button onClick={() => state.setViewOpen(false)} style={{ padding: '6px 10px' }}>Close</button>
            </div>
            <div style={{ padding: 16 }}>
              <dl style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {Object.entries(state.viewData.fields).map(([k, v]) => (
                  <div key={k} style={{ display: 'contents' }}>
                    <dt style={{ color: '#64748b' }}>{k}</dt>
                    <dd style={{ textAlign: 'right' }}>{v}</dd>
                  </div>
                ))}
              </dl>
              {Object.keys(state.viewData.fields).length === 0 && <div style={{ color: '#64748b' }}>No parameters set for this rule.</div>}
            </div>
            <div style={{ padding: 16, borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => state.setViewOpen(false)} style={{ padding: '8px 14px' }}>OK</button>
            </div>
          </div>
        </div>
      )}


      {/* Explain Modal */}
      {state.explainOpen && state.explainRow && (
        <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => state.setExplainOpen(false)}>
          <div style={{ background: 'white', borderRadius: 12, width: '100%', maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: 16, borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ fontWeight: 700 }}>Why did {state.explainRow.symbol} match?</div>
              <button onClick={() => state.setExplainOpen(false)} style={{ padding: '6px 10px' }}>Close</button>
            </div>
            <div style={{ padding: 16 }}>
              {Array.isArray(state.explainRow.explain) ? (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}><th style={{ padding: 8 }}>Condition</th><th style={{ padding: 8 }}>Value</th><th style={{ padding: 8 }}>Pass?</th></tr></thead>
                  <tbody>
                    {state.explainRow.explain.map((e, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: 8 }}>{e.id}</td>
                        <td style={{ padding: 8 }}>{e.value ?? '—'}</td>
                        <td style={{ padding: 8, color: e.pass ? '#16a34a' : '#b91c1c' }}>{e.pass ? 'Yes' : 'No'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <div style={{ color: '#64748b' }}>No explain data.</div>}
            </div>
            <div style={{ padding: 16, borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => state.setExplainOpen(false)} style={{ padding: '8px 14px' }}>OK</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
