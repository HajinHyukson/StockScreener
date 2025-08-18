import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

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
  const limitStr = String(searchParams.get('limit') ?? '50');

  const sector = searchParams.get('sector') || '';
  const mktMin = searchParams.get('marketCapMoreThan') || '';
  const mktMax = searchParams.get('marketCapLowerThan') || '';

  // Change filters / display
  const priceChangePctMin = Number(searchParams.get('priceChangePctMin') ?? '');
  const priceChangeDays   = Number(searchParams.get('priceChangeDays') ?? '');
  const volChangePctMin   = Number(searchParams.get('volChangePctMin') ?? '');
  const volChangeDays     = Number(searchParams.get('volChangeDays') ?? '');

  const wantsPriceFilter = Number.isFinite(priceChangePctMin) && priceChangeDays > 0;
  const wantsVolFilter   = Number.isFinite(volChangePctMin) && volChangeDays > 0;
  const wantsPctDisplay  = priceChangeDays > 0; // even if not filtering, we’ll compute % for display

  // Build upstream query
  const qs = new URLSearchParams({
    exchange,
    limit: limitStr,
    ...(sector ? { sector } : {}),
    ...(mktMin ? { marketCapMoreThan: mktMin } : {}),
    ...(mktMax ? { marketCapLowerThan: mktMax } : {}),
    apikey: apiKey
  });
  const upstream = `https://financialmodelingprep.com/api/v3/stock-screener?${qs.toString()}`;

  try {
    const r = await fetch(upstream, { next: { revalidate: 60 } });
    if (!r.ok) return NextResponse.json({ error: `Upstream ${r.status}`, url: upstream }, { status: 502 });

    const data = await r.json();
    if (!Array.isArray(data)) return NextResponse.json({ error: 'Unexpected response' }, { status: 500 });

    let rows: Array<{
      symbol: string;
      companyName?: string;
      price?: number;
      marketCap?: number;
      sector?: string;
      volume?: number;
      priceChangePct?: number; // NEW: attach N-day % change for display
    }> = data.map((d: any) => ({
      symbol: d.symbol,
      companyName: d.companyName,
      price: d.price,
      marketCap: d.marketCap,
      sector: d.sector,
      volume: d.volume
    }));

    // If any change logic needed, fetch historical once per symbol (cap symbols to protect free tier)
    if (wantsPriceFilter || wantsVolFilter || wantsPctDisplay) {
      const hardCap = Math.min(Number(limitStr || 50), 25); // keep it modest
      rows = rows.slice(0, hardCap);

      const now = new Date();
      const back = Math.max(priceChangeDays || 0, volChangeDays || 0);
      const fromD = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      fromD.setUTCDate(fromD.getUTCDate() - Math.max(back, 1));
      const from = toYMD(fromD);
      const to = toYMD(now);

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
            Array.isArray(hj?.historical) ? hj.historical : [];
          if (series.length === 0) continue;

          const latest = series[0];
          // pick closest record at/just before "from"
          const past = series.find(d => d.date <= from) ?? series.at(-1);
          if (!past) continue;

          // Compute % changes (if applicable)
          const pricePct = priceChangeDays > 0 && past.close > 0
            ? ((latest.close - past.close) / past.close) * 100
            : undefined;
          const volPct = volChangeDays > 0 && past.volume > 0
            ? ((latest.volume - past.volume) / past.volume) * 100
            : undefined;

          let ok = true;
          if (wantsPriceFilter && (pricePct ?? -Infinity) < priceChangePctMin) ok = false;
          if (ok && wantsVolFilter && (volPct ?? -Infinity) < volChangePctMin) ok = false;

          if (ok) {
            filtered.push({ ...row, priceChangePct: pricePct });
          }
        } catch {
          // skip symbol on error
        }
      }
      rows = filtered;
    }

    return NextResponse.json(rows);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Request failed' }, { status: 500 });
  }
}
