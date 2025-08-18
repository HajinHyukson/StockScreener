import type { QueryPlan, ScreenerRow, HistoricalFilter } from './types';
import { fetchHistorical, computePriceChangePctNDays, computeVolumeChangePctNDays } from './historical';

function buildScreenerUrl(base: QueryPlan['base'], limit: number, apiKey: string): string {
  const params = new URLSearchParams();
  base.forEach(b => {
    params.set(b.fmpParam, String(b.value));
  });
  params.set('limit', String(limit));
  params.set('apikey', apiKey);
  return `https://financialmodelingprep.com/api/v3/stock-screener?${params.toString()}`;
}

function passesHistoricalFilters(series: any[], filters: HistoricalFilter[], row: ScreenerRow): boolean {
  for (const f of filters) {
    if (f.metric === 'priceChangePctNDays') {
      const pct = computePriceChangePctNDays(series as any, f.days);
      if (pct === undefined || pct < f.pct) return false;
      row.priceChangePct = pct;
    } else if (f.metric === 'volumeChangePctNDays') {
      const pct = computeVolumeChangePctNDays(series as any, f.days);
      if (pct === undefined || pct < f.pct) return false;
      // (we’re not storing volume pct on row yet; add if needed)
    }
  }
  return true;
}

export async function executePlan(plan: QueryPlan, limit: number, apiKey: string): Promise<ScreenerRow[]> {
  // 1) Fetch base list from FMP screener
  const url = buildScreenerUrl(plan.base, limit, apiKey);
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Screener ${res.status}`);
  const baseRows = (await res.json()) as any[];

  // Shape to our row type
  const rows: ScreenerRow[] = baseRows.map((r) => ({
    symbol: r.symbol,
    companyName: r.companyName ?? r.companyName ?? r.companyName,
    price: r.price,
    marketCap: r.marketCap,
    sector: r.sector,
    volume: r.volume
  }));

  // 2) If no historical filters, we’re done
  if (!plan.historical.length) return rows;

  // Determine max days required
  const maxDays = Math.max(...plan.historical.map(h => ('days' in h ? h.days : 0)));

  // 3) For each symbol, fetch historical once and test filters
  const out: ScreenerRow[] = [];
  for (const row of rows) {
    try {
      const series = await fetchHistorical(row.symbol, maxDays, apiKey);
      if (passesHistoricalFilters(series, plan.historical, row)) {
        out.push(row);
      }
    } catch {
      // skip on error per-symbol
    }
  }
  return out;
}
