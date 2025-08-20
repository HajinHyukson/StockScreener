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


  // Sorted rows
  const sorted = useMemo(() => {
    const rows = [...(state.rows || [])];
    rows.sort((a: any, b: any) => {
      const key = state.sortKey;
      const dir = state.sortDir;
      let av: any, bv: any;
      if (key === 'symbol' || key === 'companyName' || key === 'sector') {
        av = String(a[key] ?? '').toUpperCase();
        bv = String(b[key] ?? '').toUpperCase();
        return dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      av = a[key]; bv = b[key];
      if (typeof av !== 'number') av = -Infinity;
      if (typeof bv !== 'number') bv = -Infinity;
      return dir === 'asc' ? av - bv : bv - av;
    });
    return rows;
  }, [state.rows, state.sortKey, state.sortDir]);


  const totalPages = Math.max(1, Math.ceil(sorted.length / (state.pageSize || 25)));
  const pageRows = useMemo(
    () => sorted.slice(((state.page || 1) - 1) * (state.pageSize || 25), (state.page || 1) * (state.pageSize || 25)),
    [sorted, state.page, state.pageSize]
  );


  return {
    today,
    showMarketCap, showPER, showRSI, showNDays,
    priceColTitle,
    sorted, totalPages, pageRows,
  };
}


