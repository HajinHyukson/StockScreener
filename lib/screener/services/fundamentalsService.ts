const FMP_BASE = 'https://financialmodelingprep.com/api/v3';


type PEResult = { symbol: string; per?: number };


/** Try /key-metrics-ttm first; fall back to /ratios-ttm if needed */
export async function fetchCompanyPER(symbol: string, apiKey: string): Promise<PEResult> {
  // Key Metrics TTM often includes 'peRatioTTM' or 'peRatio'
  const km = `${FMP_BASE}/key-metrics-ttm/${encodeURIComponent(symbol)}?limit=1&apikey=${apiKey}`;
  try {
    const r = await fetch(km, { cache: 'no-store' });
    if (r.ok) {
      const arr = await r.json();
      const first = Array.isArray(arr) && arr.length ? arr[0] : undefined;
      const pe =
        typeof first?.peRatioTTM === 'number' ? first.peRatioTTM :
        typeof first?.peRatio === 'number' ? first.peRatio : undefined;
      if (typeof pe === 'number') return { symbol, per: pe };
    }
  } catch {}


  // Ratios TTM sometimes exposes 'priceEarningsRatioTTM' or 'priceEarningsRatio'
  const rr = `${FMP_BASE}/ratios-ttm/${encodeURIComponent(symbol)}?limit=1&apikey=${apiKey}`;
  try {
    const r = await fetch(rr, { cache: 'no-store' });
    if (r.ok) {
      const arr = await r.json();
      const first = Array.isArray(arr) && arr.length ? arr[0] : undefined;
      const pe =
        typeof first?.priceEarningsRatioTTM === 'number' ? first.priceEarningsRatioTTM :
        typeof first?.priceEarningsRatio === 'number' ? first.priceEarningsRatio : undefined;
      if (typeof pe === 'number') return { symbol, per: pe };
    }
  } catch {}


  return { symbol, per: undefined };
}
