import type {
  QueryPlan,
  ScreenerRow,
  HistoricalFilter,
  TechnicalFilterRSI
} from './types';
import { fetchRSI } from './technical';
import { fetchCompanyPER } from './screener/services/fundamentalsService';
// If you already have these utilities, keep your existing ones:
import {
  fetchHistorical,                    // (symbol, maxDays, apiKey) => price/volume series
  computePriceChangePctNDays,         // (series, days) => number | undefined
  computeVolumeChangePctNDays         // (series, days) => number | undefined
} from './historical';

/** Concurrency controls */
const MAX_CONCURRENCY = Number(process.env.MAX_CONCURRENCY ?? 6);

/** Minimal p-limit */
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
        fn(...args)
          .then((r) => { next(); resolve(r as any); })
          .catch((e) => { next(); reject(e); });
      };
      if (active < concurrency) run();
      else queue.push(run);
    });
}

/** Build /stock-screener URL from plan.base */
function buildScreenerUrl(base: QueryPlan['base'], limit: number, apiKey: string): string {
  const params = new URLSearchParams();
  for (const b of base) params.set(b.fmpParam, String(b.value));
  params.set('limit', String(limit));
  params.set('apikey', apiKey);
  return `https://financialmodelingprep.com/api/v3/stock-screener?${params.toString()}`;
}

/** Explain entry */
type Explain = { id: string; pass: boolean; value?: string };

/** Convert screener payload row -> ScreenerRow (robust keys) */
function mapScreenerRow(raw: any): ScreenerRow {
  // daily % change can be numeric or "1.23%"
  let dailyPct: number | undefined;
  if (typeof raw.changesPercentage === 'number') {
    dailyPct = raw.changesPercentage;
  } else if (typeof raw.changesPercentage === 'string') {
    const m = raw.changesPercentage.match(/-?\d+(\.\d+)?/);
    if (m) dailyPct = Number(m[0]);
  }

  // PER / P-E ratio under different keys
  const pe =
    typeof raw.pe === 'number' ? raw.pe :
    typeof raw.priceEarningsRatio === 'number' ? raw.priceEarningsRatio :
    typeof raw.peRatio === 'number' ? raw.peRatio :
    undefined;

  return {
    symbol: raw.symbol,
    companyName: raw.companyName ?? raw.companyName,
    price: raw.price,
    sector: raw.sector,
    volume: raw.volume,
    marketCap: raw.marketCap,
    per: pe,
    dailyChangePct: dailyPct,
  };
}

/** Attach RSI explain + value */
function explainRSI(
  series: any[],
  rsiFilters: TechnicalFilterRSI[],
  r: ScreenerRow
): Explain[] {
  const ex: Explain[] = [];
  // We compute RSI via the API (fetchRSI), not from series — series is left for price change.
  // The caller will fill ex using fetchRSI; this helper unused for RSI; keep for future.
  return ex;
}

/**
 * Execute the plan:
 *  1) /stock-screener for base filters
 *  2) historical filters (priceChangePctNDays with op, volumeChange optional)
 *  3) technical RSI
 *  4) enrich PER when missing
 *  5) apply post filters (PER gte/lte)
 */
export async function executePlan(
  plan: QueryPlan & { post?: Array<{ kind: 'per'; op: 'lte' | 'gte'; value: number }> },
  limit: number,
  apiKey: string
): Promise<(ScreenerRow & { explain?: Explain[] })[]> {

  // 1) Base screener
  const url = buildScreenerUrl(plan.base, limit, apiKey);
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Screener ${res.status}`);
  const baseRows = (await res.json()) as any[];

  // Map to our row shape
  let rows: (ScreenerRow & { explain?: Explain[]; __raw?: any })[] = baseRows.map((raw) => {
    const r = mapScreenerRow(raw);
    (r as any).__raw = raw; // keep for robust fallbacks (optional)
    return r;
  });

  // Short-circuit if no further filters
  const needHistorical = plan.historical?.length > 0;
  const needTechnical = plan.technical?.length > 0;

  // 2) Historical (priceChangePctNDays with op)
  if (needHistorical) {
    // One pass per symbol: figure out max days needed
    const maxDays = Math.max(
      0,
      ...plan.historical.map((h: any) => (typeof h.days === 'number' ? h.days : 0))
    );

    const runHist = pLimit(MAX_CONCURRENCY, async (row: ScreenerRow & { explain?: Explain[] }) => {
      try {
        const series = await fetchHistorical(row.symbol, maxDays, apiKey);
        const ex: Explain[] = row.explain ? [...row.explain] : [];

        // Compute and check priceChangePctNDays
        for (const h of plan.historical as any[]) {
          if (h.kind === 'priceChangePctNDays') {
            const pct = computePriceChangePctNDays(series, h.days);
            // store value
            if (typeof pct === 'number') row.priceChangePct = pct;
            const pass = typeof pct === 'number'
              ? (h.op === 'lte' ? pct <= h.pct : pct >= h.pct)
              : false;
            ex.push({ id: 'pv.priceChangePctN', pass, value: typeof pct === 'number' ? pct.toFixed(2) : undefined });
            if (!pass) return null; // fail early
          } else if (h.kind === 'volumeChangePctNDays') {
            const pct = computeVolumeChangePctNDays(series, h.days);
            const pass = typeof pct === 'number' ? pct >= h.pct : false;
            ex.push({ id: 'pv.volumeChangePctN', pass, value: typeof pct === 'number' ? pct.toFixed(2) : undefined });
            if (!pass) return null;
          }
        }

        row.explain = ex;
        return row;
      } catch {
        return null;
      }
    });

    const settled = await Promise.allSettled(rows.map((r) => runHist(r)));
    rows = [];
    for (const s of settled) if (s.status === 'fulfilled' && s.value) rows.push(s.value);
  }

  // 3) Technical (RSI)
  if (needTechnical) {
    // determine distinct RSI requests (assume one for now; extendable)
    const rsiFilters = (plan.technical || []).filter((t: any) => t.kind === 'rsi') as TechnicalFilterRSI[];
    if (rsiFilters.length) {
      const rf = rsiFilters[0]; // AND semantics: if you add multiple, loop them
      const runRSI = pLimit(MAX_CONCURRENCY, async (row: ScreenerRow & { explain?: Explain[] }) => {
        try {
          const data = await fetchRSI(row.symbol, rf.timeframe, rf.period, apiKey);
          const val = data?.value;
          const pass = typeof val === 'number' ? (rf.op === 'lte' ? val <= rf.value : val >= rf.value) : false;
          const ex = row.explain ? [...row.explain] : [];
          ex.push({ id: 'ti.rsi', pass, value: typeof val === 'number' ? val.toFixed(2) : undefined });
          row.explain = ex;
          if (typeof val === 'number') row.rsi = val;
          return pass ? row : null;
        } catch {
          return null;
        }
      });

      const settled = await Promise.allSettled(rows.map((r) => runRSI(r)));
      const filtered: (ScreenerRow & { explain?: Explain[] })[] = [];
      for (const s of settled) if (s.status === 'fulfilled' && s.value) filtered.push(s.value);
      rows = filtered;
    }
  }

  // 4) Enrich PER for rows missing it (Key Metrics / Ratios)
  {
    const missing = rows.filter(r => typeof r.per !== 'number').map(r => r.symbol);
    if (missing.length) {
      type PERFn = (s: string, k: string) => Promise<{ symbol: string; per?: number }>;
      const perRunner: PERFn = pLimit(MAX_CONCURRENCY, (s: string, k: string) => fetchCompanyPER(s, k));
      const perResults = await Promise.allSettled(missing.map(sym => perRunner(sym, apiKey)));
      const perMap = new Map<string, number>();
      for (const pr of perResults) {
        if (pr.status === 'fulfilled' && typeof pr.value?.per === 'number') {
          perMap.set(pr.value.symbol, pr.value.per);
        }
      }
      for (const r of rows) {
        if (typeof r.per !== 'number' && perMap.has(r.symbol)) {
          r.per = perMap.get(r.symbol);
        }
      }
    }
  }

  // 5) Apply post filters (PER gte/lte)
  if ((plan as any).post?.length) {
    for (const pf of (plan as any).post) {
      if (pf.kind === 'per') {
        rows = rows.filter(r => {
          const val = typeof r.per === 'number' ? r.per : NaN;
          return pf.op === 'gte' ? val >= pf.value : val <= pf.value;
        });
      }
    }
  }

  // Done
  // (Strip __raw if you kept it)
  rows.forEach(r => { if ((r as any).__raw) delete (r as any).__raw; });
  return rows;
}
