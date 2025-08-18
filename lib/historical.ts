type Bar = { date: string; close: number; volume: number };
type HistResponse = { symbol: string; historical: Bar[] };

export async function fetchHistorical(symbol: string, daysNeeded: number, apiKey: string): Promise<Bar[]> {
  // buffer a bit: need daysNeeded + a few for safety
  const url = `https://financialmodelingprep.com/api/v3/historical-price-full/${encodeURIComponent(symbol)}?timeseries=${Math.max(
    daysNeeded + 5,
    10
  )}&apikey=${apiKey}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Historical ${symbol} ${res.status}`);
  const json = (await res.json()) as HistResponse | any;
  const arr = (json?.historical || []) as Bar[];
  // FMP returns newest first; we need latest as index 0 (T) for convenience below
  return arr;
}

export function computePriceChangePctNDays(series: Bar[], days: number): number | undefined {
  if (!Array.isArray(series) || series.length <= days) return undefined;
  const latest = series[0]?.close;
  const past = series[days]?.close;
  if (typeof latest !== 'number' || typeof past !== 'number' || past === 0) return undefined;
  return ((latest - past) / past) * 100;
}

export function computeVolumeChangePctNDays(series: Bar[], days: number): number | undefined {
  if (!Array.isArray(series) || series.length <= days) return undefined;
  const latest = series[0]?.volume;
  const past = series[days]?.volume;
  if (typeof latest !== 'number' || typeof past !== 'number' || past === 0) return undefined;
  return ((latest - past) / past) * 100;
}
