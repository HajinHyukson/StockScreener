import type {
  QueryPlan,
  ScreenerRow,
  HistoricalFilter,
  TechnicalFilterRSI
} from './types';
import { fetchRSI } from './technical';

// If you already have these utilities, keep your existing ones:
import {
  fetchHistorical,                    // (symbol, maxDays, apiKey) => price/volume series
  computePriceChangePctNDays,         // (series, days) => number | undefined
  computeVolumeChangePctNDays         // (series, days) => number | undefined
} from './historical';

const MAX_CONCURRENCY = Number(process.env.MAX_CONCURRENCY ?? 6);

/** Minimal p-limit to bound upstream calls */
function pLimit<T extends (...args: any[]) => Promise<any>>(concurrency: number, fn: T) {
  let active = 0;
  const queue: (() => void)[] = [];
  const next = () => {
    active--;
    const job = queue.shift();
    if (job) job();
  };
  return (...args: Parameters<T>) =>
    new Promise<ReturnType<T>>((resolve, reject) => {
      const run = () => {
        active++;
        fn(...args).then((r) => { next(); resolve(r as any); })
                   .catch((e) => { next(); reject(e); });
      };
      if (active < concurrency) run();
      else queue.push(run);
    });
}

function buildScreenerUrl(base: QueryPlan['base'], limit: number, apiKey: string): string {
  const params = new URLSearchParams();
  for (const b of base) {
    params.set(b.fmpParam, String(b.value));
  }
  params.set('limit', String(limit));
  params.set('apikey', apiKey);
  return `https://financialmodelingprep.com/api/v3/stock-screener?${params.toString()}`;
}

type Explain = { id: string; pass: boolean; value?: string };

function explainForSeries(series: any[], filters: HistoricalFilter[]): Explain[] {
  const ex: Explain[] = [];
  for (const f of filters) {
    if (f.kind === 'priceChangePctNDays') {
      const pct = computePriceChangePctNDays(series, f.days);
      ex.push({ id: 'pv.priceChangePctN', pass: pct !== undefined && pct >= f.pct, value: pct?.toFixed(2) });
    } else if (f.kind === 'volumeChangePctNDays') {
      const pct = computeVolumeChangePctNDays(series, f.days);
      ex.push({ id: 'pv.volumeChangePctN', pass: pct !== undefined && pct >= f.pct, value: pct?.toFixed(2) });
    }
  }
  return ex;
}

function passesAll(ex: Explain[]) {
  return ex.every(e => e.pass);
}

/**
 * Execute the plan:
 *  1) Call FMP screener for base filters
 *  2) If historical filters exist, fetch series and compute features
 *  3) If RSI filters exist, fetch RSI and filter rows
 *  Returns the filtered/enhanced rows (with explain data)
 */
export async function executePlan(
  plan: QueryPlan,
  limit: number,
  apiKey: string
): Promise<(ScreenerRow & { explain?: Explain[] })[]> {

  // 1) Base screener
  const url = buildScreenerUrl(plan.base, limit, apiKey);
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Screener ${res.status}`);
  const baseRows = (await res.json()) as any[];

  const rows: (ScreenerRow & { explain?: Explain[] })[] = baseRows.map((r) => {
  // FMP screener often returns `changesPercentage` as a number or string like "1.23%"
  let dailyPct: number | undefined = undefined;
  if (typeof r.changesPercentage === 'number') {
    dailyPct = r.changesPercentage;
  } else if (typeof r.changesPercentage === 'string') {
    const m = r.changesPercentage.match(/-?\d+(\.\d+)?/);
    if (m) dailyPct = Number(m[0]);
  }


  return {
    symbol: r.symbol,
    companyName: r.companyName ?? r.companyName,
    price: r.price,
    sector: r.sector,
    volume: r.volume,
    marketCap: r.marketCap,
    per: typeof r.pe === 'number' ? r.pe : undefined,   // ← attach PER if present
    dailyChangePct: dailyPct                            // ← attach daily change %
  };
});


  // Short circuit if nothing else to compute
  const needHistorical = plan.historical.length > 0;
  const needTechnical = plan.technical.length > 0;
  if (!needHistorical && !needTechnical) return rows;

  // 2) Historical evaluation
  let afterHistorical: (ScreenerRow & { explain?: Explain[] })[] = rows;
  if (needHistorical) {
    const maxDays = Math.max(...plan.historical.map(h => ('days' in h ? h.days : 0)));
    const runSymbolHist = pLimit(MAX_CONCURRENCY, async (row: (ScreenerRow & { explain?: Explain[] })) => {
      try {
        const series = await fetchHistorical(row.symbol, maxDays, apiKey);
        const ex = explainForSeries(series, plan.historical);
        if (!passesAll(ex)) return null;

        // attach computed values for table (e.g., priceChangePct)
        const priceEx = ex.find(e => e.id === 'pv.priceChangePctN' && e.value !== undefined);
        if (priceEx) row.priceChangePct = Number(priceEx.value);
        row.explain = (row.explain ?? []).concat(ex);
        return row;
      } catch {
        return null;
      }
    });

    const settled = await Promise.allSettled(afterHistorical.map((r) => runSymbolHist(r)));
    const filtered: (ScreenerRow & { explain?: Explain[] })[] = [];
    for (const s of settled) {
      if (s.status === 'fulfilled' && s.value) filtered.push(s.value);
    }
    afterHistorical = filtered;
  }

  // 3) Technical (RSI) evaluation
  if (!needTechnical) return afterHistorical;

  const rsiFilters = plan.technical.filter(t => t.kind === 'rsi') as TechnicalFilterRSI[];
  if (!rsiFilters.length) return afterHistorical;

  // for now AND all RSI filters (usually one)
  const runRSI = pLimit(MAX_CONCURRENCY, async (row: (ScreenerRow & { explain?: Explain[] })) => {
    try {
      for (const f of rsiFilters) {
        const data = await fetchRSI(row.symbol, f.timeframe, f.period, apiKey);
        const val = data.value;
        if (typeof val !== 'number') {
          return null; // no data => fail the RSI condition
        }
        const pass = f.op === 'lte' ? val <= f.value : val >= f.value;
        if (!pass) return null;

        // Attach RSI + explain
        row.rsi = val;
        row.explain = (row.explain ?? []);
        row.explain.push({ id: 'ti.rsi', pass: true, value: val.toFixed(2) });
      }
      return row;
    } catch {
      return null;
    }
  });

  const settledRSI = await Promise.allSettled(afterHistorical.map((r) => runRSI(r)));
  const filteredRSI: (ScreenerRow & { explain?: Explain[] })[] = [];
  for (const s of settledRSI) {
    if (s.status === 'fulfilled' && s.value) filteredRSI.push(s.value);
  }

  return filteredRSI;
}
