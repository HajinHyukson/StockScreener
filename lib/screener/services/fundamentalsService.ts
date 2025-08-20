// lib/screener/services/fundamentalsService.ts
/**
 * Company-level PER (P/E) enrichment for rows that don't carry `per` from /stock-screener.
 * Strategy:
 *  1) Try /key-metrics-ttm      → peRatioTTM | peRatio
 *  2) Try /ratios-ttm            → priceEarningsRatioTTM | priceEarningsRatio
 *  3) Try /profile               → pe | priceEarningsRatio | peRatio
 *
 * Notes:
 * - All calls are GET and "no-store" (we provide our own small TTL cache).
 * - If nothing returns a numeric PE, we resolve with { symbol, per: undefined }.
 */

const FMP_BASE = 'https://financialmodelingprep.com/api/v3';

export type PEResult = { symbol: string; per?: number };

// ---------- Tiny in-memory cache ----------
type CacheEntry = { per?: number; expires: number };
const perCache = new Map<string, CacheEntry>();
const DEFAULT_TTL = Number(process.env.FMP_PER_TTL_SECONDS ?? 300); // 5 minutes

function now() { return Date.now(); }
function cacheKey(symbol: string) { return symbol.trim().toUpperCase(); }

function getCachedPER(symbol: string): number | undefined {
  const key = cacheKey(symbol);
  const hit = perCache.get(key);
  if (!hit) return undefined;
  if (hit.expires < now()) { perCache.delete(key); return undefined; }
  return hit.per;
}
function setCachedPER(symbol: string, per?: number, ttlSec = DEFAULT_TTL) {
  const key = cacheKey(symbol);
  perCache.set(key, { per, expires: now() + ttlSec * 1000 });
}

// ---------- Small fetch helper ----------
async function fetchJSON(url: string) {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
  return r.json();
}

// ---------- Key extractors (defensive) ----------
function extractPEFromKeyMetricsTTM(arr: any[]): number | undefined {
  if (!Array.isArray(arr) || arr.length === 0) return undefined;
  const first = arr[0];
  if (typeof first?.peRatioTTM === 'number') return first.peRatioTTM;
  if (typeof first?.peRatio === 'number') return first.peRatio;
  return undefined;
}
function extractPEFromRatiosTTM(arr: any[]): number | undefined {
  if (!Array.isArray(arr) || arr.length === 0) return undefined;
  const first = arr[0];
  if (typeof first?.priceEarningsRatioTTM === 'number') return first.priceEarningsRatioTTM;
  if (typeof first?.priceEarningsRatio === 'number') return first.priceEarningsRatio;
  return undefined;
}
function extractPEFromProfile(arr: any[]): number | undefined {
  if (!Array.isArray(arr) || arr.length === 0) return undefined;
  const first = arr[0];
  if (typeof first?.pe === 'number') return first.pe;
  if (typeof first?.priceEarningsRatio === 'number') return first.priceEarningsRatio;
  if (typeof first?.peRatio === 'number') return first.peRatio;
  return undefined;
}

// ---------- Public API ----------
export async function fetchCompanyPER(symbol: string, apiKey: string): Promise<PEResult> {
  const sym = symbol.trim().toUpperCase();

  // cache check
  const cached = getCachedPER(sym);
  if (typeof cached === 'number') return { symbol: sym, per: cached };

  // 1) Key Metrics TTM
  try {
    const kmURL = `${FMP_BASE}/key-metrics-ttm/${encodeURIComponent(sym)}?limit=1&apikey=${apiKey}`;
    const kmJson = await fetchJSON(kmURL);
    const peKm = extractPEFromKeyMetricsTTM(kmJson);
    if (typeof peKm === 'number') {
      setCachedPER(sym, peKm);
      return { symbol: sym, per: peKm };
    }
  } catch {}

  // 2) Ratios TTM
  try {
    const rtURL = `${FMP_BASE}/ratios-ttm/${encodeURIComponent(sym)}?limit=1&apikey=${apiKey}`;
    const rtJson = await fetchJSON(rtURL);
    const peRt = extractPEFromRatiosTTM(rtJson);
    if (typeof peRt === 'number') {
      setCachedPER(sym, peRt);
      return { symbol: sym, per: peRt };
    }
  } catch {}

  // 3) Profile
  try {
    const pfURL = `${FMP_BASE}/profile/${encodeURIComponent(sym)}?apikey=${apiKey}`;
    const pfJson = await fetchJSON(pfURL);
    const pePf = extractPEFromProfile(pfJson);
    if (typeof pePf === 'number') {
      setCachedPER(sym, pePf);
      return { symbol: sym, per: pePf };
    }
  } catch {}

  return { symbol: sym, per: undefined };
}

/** Batch helper with bounded concurrency */
export async function fetchManyCompanyPER(
  symbols: string[],
  apiKey: string,
  concurrency = Number(process.env.MAX_CONCURRENCY ?? 6)
): Promise<Map<string, number>> {
  const results = new Map<string, number>();
  const uniq = Array.from(new Set(symbols.map(s => s.trim().toUpperCase()))).filter(Boolean);

  // quick cache pass
  const pending: string[] = [];
  for (const s of uniq) {
    const c = getCachedPER(s);
    if (typeof c === 'number') results.set(s, c);
    else pending.push(s);
  }
  if (pending.length === 0) return results;

  // naive limiter
  let i = 0;
  async function worker() {
    while (i < pending.length) {
      const sym = pending[i++];
      try {
        const { per } = await fetchCompanyPER(sym, apiKey);
        if (typeof per === 'number') results.set(sym, per);
      } catch {}
    }
  }

  const workers = Math.min(concurrency, pending.length);
  await Promise.all(Array.from({ length: workers }, worker));
  return results;
}
