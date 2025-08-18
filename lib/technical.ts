/**
 * Fetch RSI with lightweight in-memory caching.
 * Supports both daily and intraday intervals via FMP.
 */

const RSI_CACHE_SECONDS = Number(process.env.RSI_CACHE_SECONDS ?? 90);
type CacheEntry = { expires: number; data: { value?: number; asOf?: string } };
const rsiCache = new Map<string, CacheEntry>();

function key(symbol: string, tf: string, period: number) {
  return `${symbol}|${tf}|${period}`;
}

export async function fetchRSI(
  symbol: string,
  timeframe: 'daily' | '1min' | '5min' | '15min' | '30min' | '1hour',
  period: number,
  apiKey: string
): Promise<{ value?: number; asOf?: string }> {
  const k = key(symbol, timeframe, period);
  const now = Date.now();
  const hit = rsiCache.get(k);
  if (hit && hit.expires > now) return hit.data;

  const base = 'https://financialmodelingprep.com/api/v3';
  const url =
    timeframe === 'daily'
      ? `${base}/technical_indicator/daily/${encodeURIComponent(symbol)}?type=RSI&period=${period}&apikey=${apiKey}`
      : `${base}/technical_indicator/${timeframe}/${encodeURIComponent(symbol)}?type=RSI&period=${period}&apikey=${apiKey}`;

  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`RSI ${res.status}`);

  const arr = await res.json();
  // Be defensive about order (some endpoints return newest last/first)
  const last = Array.isArray(arr) && arr.length ? arr[arr.length - 1] : null;
  const first = Array.isArray(arr) && arr.length ? arr[0] : null;
  const pick = last?.rsi !== undefined ? last : first;
  const value = typeof pick?.rsi === 'number' ? pick.rsi : undefined;
  const asOf = pick?.date || pick?.datetime;

  const data = { value, asOf };
  rsiCache.set(k, { expires: now + RSI_CACHE_SECONDS * 1000, data });
  return data;
}
