import { NextResponse } from 'next/server';

// Force Node runtime for process.env and stable fetch behavior
export const runtime = 'nodejs';

// Small helper to format YYYY-MM-DD (UTC)
function toYMD(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function GET(req: Request) {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Missing FMP_API_KEY. Add it in Vercel → Project → Settings → Environment Variables.' },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(req.url);

  // Base screener inputs
  const exchange = searchParams.get('exchange') ?? 'NASDAQ';
  const limit = String(searchParams.get('limit') ?? '50');

  const sector = searchParams.get('sector') || '';
  const mktMin = searchParams.get('marketCapMoreThan') || '';
  const mktMax = searchParams.get('marketCapLowerThan') || '';

  // New change filters
  const priceChangePctMin = Number(searchParams.get('priceChangePctMin') ?? '');
  const priceChangeDays = Number(searchParams.get('priceChangeDays') ?? '');
  const volChangePctMin = Number(searchParams.get('volChangePctMin') ?? '');
  const volChangeDays = Number(searchParams.get('volChangeDays') ?? '');

  // Build upstream query for the base screener (include only provided params)
  const q = new URLSearchParams({
    exchange,
    limit,
    ...(sector ? { sector } : {}),
    ...(mktMin ? { marketCapMoreThan: mktMin } : {}),
    ...(mktMax ? { marketCapLowerThan: mktMax } : {}),
    apikey: apiKey
  });

  const upstream = `https://financialmodelingprep.com/api/v3/stock-screener?${q.toString()}`;

  try {
    const r = await fetch(upstream, { next: { revalidate: 60 } });
    if (!r.ok) {
      return NextResponse.json(
        { error: `Upstream ${r.status}`, hint: 'Try lowering limit or relaxing filters', url: upstream },
        { status: 502 }
      );
    }

    const data = await r.json();
    if (!Array.isArray(data)) {
      return NextResponse.json({ error: 'Unexpected response from FMP', raw: data }, { status: 500 });
    }

    // Keep only fields you display, plus symbol
    let rows: Array<{
      symbol: string;
      companyName?: string;
      price?: number;
      marketCap?: number;
      sector?: string;
      volume?: number;
    }> = data.map((d: any) => ({
      symbol: d.symbol,
      companyName: d.companyName,
      price: d.price,
      marketCap: d.marketCap,
      sector: d.sector,
      volume: d.volume
    }));

    const wantsPriceChange = Number.isFinite(priceChangePctMin) && Number(priceChangeDays) > 0;
    const wantsVolChange = Number.isFinite(volChangePctMin) && Number(volChangeDays) > 0;

    if (wantsPriceChange || wantsVolChange) {
      // Guardrail: keep symbol count modest to respect free tiers
      const hardCap = Math.min(Number(limit || 50), 25);
      rows = rows.slice(0, hardCap);

      // Compute date range N days back (UTC)
      const now = new Date();
      const fromD = new Date(now);
      // Use the larger of the two windows to minimize calls if both filters are set
      const backDays = Math.max(priceChangeDays || 0, volChangeDays || 0);
      fromD.setUTCDate(now.getUTCDate() - backDays);
      const from = toYMD(fromD);
      const to = toYMD(now); // inclusive range; FMP returns latest as first element typically

      // For each symbol, fetch historical to compute changes.
      // NOTE: This can be many calls; we kept rows to <= 25 above.
      const filtered: typeof rows = [];
      for (const row of rows) {
        try {
          const histURL = `https://financialmodelingprep.com/api/v3/historical-price-full/${encodeURIComponent(
            row.symbol
          )}?from=${from}&to=${to}&apikey=${apiKey}`;
          const hr = await fetch(histURL, { next: { revalidate: 60 } });
          if (!hr.ok) continue;
          const hj = await hr.json();

          const series: Array<{ date: string; close: number; volume: number }> =
            hj?.historical && Array.isArray(hj.historical) ? hj.historical : [];

          if (series.length === 0) continue;

          // FMP historical usually ordered newest -> oldest
          const latest = series[0];
          // Find a point approximately N days back (could be market-closed days)
          const past = series.find((d) => d.date <= from) ?? series.at(-1);

          if (!past) continue;

          let pass = true;

          if (wantsPriceChange) {
            const priceDeltaPct = past.close > 0 ? ((latest.close - past.close) / past.close) * 100 : 0;
            if (priceDeltaPct < priceChangePctMin) pass = false;
          }

          if (pass && wantsVolChange) {
            const volDeltaPct = past.volume > 0 ? ((latest.volume - past.volume) / past.volume) * 100 : 0;
            if (volDeltaPct < volChangePctMin) pass = false;
          }

          if (pass) filtered.push(row);
        } catch {
          // Ignore symbol on any error
        }
      }

      rows = filtered;
    }

    return NextResponse.json(rows);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Request failed' }, { status: 500 });
  }
}
