import type { QueryPlan, ScreenerRow, HistoricalFilter } from './types';
import { fetchHistorical, computePriceChangePctNDays, computeVolumeChangePctNDays } from './historical';
import type { QueryPlan, ScreenerRow, TechnicalFilterRSI } from './types';
import { fetchRSI } from './technical';
// If no technical filters, return as-is
if (!plan.technical.length) return rows;

// Extract single RSI filter(s) (you can extend later for multiple)
const rsiFilters = plan.technical.filter(t => t.kind === 'rsi') as TechnicalFilterRSI[];
if (!rsiFilters.length) return rows;

// For now, assume a single RSI condition; if multiple, you can AND them
const rsi = rsiFilters[0];

const runRSI = pLimit(MAX_CONCURRENCY, async (row: ScreenerRow) => {
  try {
    const data = await fetchRSI(row.symbol, rsi.timeframe, rsi.period, apiKey);
    const val = data.value;
    if (typeof val !== 'number') {
      // no data → treat as not passing RSI condition
      return null;
    }
    const pass = rsi.op === 'lte' ? val <= rsi.value : val >= rsi.value;

    if (!pass) return null;

    // Attach RSI + explain
    (row as any).rsi = val;
    const ex = (row.explain ?? []);
    ex.push({ id: 'ti.rsi', pass: true, value: val.toFixed(2) });
    row.explain = ex;
    return row;
  } catch {
    return null;
  }
});

const settledRSI = await Promise.allSettled(rows.map((r) => runRSI(r)));
const filteredRSI: ScreenerRow[] = [];
for (const s of settledRSI) {
  if (s.status === 'fulfilled' && s.value) filteredRSI.push(s.value);
}
return filteredRSI;

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
