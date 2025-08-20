'use client';
import { useMemo } from 'react';


export function useResultsView(state: any) {
  const today = new Date().toLocaleDateString('en-US', { timeZone: 'Asia/Seoul', year: 'numeric', month: 'short', day: '2-digit' });
  const selectedFund = useMemo(() => new Set(state.fundamentalSel || []), [state.fundamentalSel]);
  const selectedTech = useMemo(() => new Set(state.technicalSel || []), [state.technicalSel]);
  const showMarketCap = selectedFund.has('base.marketCap');
  const showPER      = selectedFund.has('fa.per');
  const showRSI      = selectedTech.has('ti.rsi');
  const showNDays    = !!state.filterValues?.['pv.priceChangePctN'];
  const priceChangeVal = state.filterValues?.['pv.priceChangePctN'];
  const priceColTitle = priceChangeVal?.days ? `Price (${priceChangeVal.days} days % change)` : 'Price';


  const sorted = useMemo(() => {
    const rows = [...(state.rows || [])];
    rows.sort((a: any, b: any) => {
      const key = state.sortKey, dir = state.sortDir;
      if (key === 'symbol' || key === 'companyName' || key === 'sector') {
        const A = String(a[key] ?? '').toUpperCase(), B = String(b[key] ?? '').toUpperCase();
        return dir === 'asc' ? A.localeCompare(B) : B.localeCompare(A);
      }
      let A = a[key], B = b[key];
      if (typeof A !== 'number') A = -Infinity;
      if (typeof B !== 'number') B = -Infinity;
      return dir === 'asc' ? A - B : B - A;
    });
    return rows;
  }, [state.rows, state.sortKey, state.sortDir]);


  const totalPages = Math.max(1, Math.ceil(sorted.length / (state.pageSize || 25)));
  const pageRows = useMemo(
    () => sorted.slice(((state.page || 1) - 1) * (state.pageSize || 25), (state.page || 1) * (state.pageSize || 25)),
    [sorted, state.page, state.pageSize]
  );


  return { today, showMarketCap, showPER, showRSI, showNDays, priceColTitle, sorted, totalPages, pageRows };
}
