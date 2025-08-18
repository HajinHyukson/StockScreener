import { NextResponse } from 'next/server';

// Use Node runtime so process.env works nicely
export const runtime = 'nodejs';

export async function GET(req: Request) {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Missing FMP_API_KEY. Add it in Vercel → Project → Settings → Environment Variables.' },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(req.url);
  const exchange = searchParams.get('exchange') ?? 'NASDAQ';
  const limit    = searchParams.get('limit') ?? '50';

  // optional filters
  const sector    = searchParams.get('sector') || '';
  const mktMin    = searchParams.get('marketCapMoreThan') || '';
  const mktMax    = searchParams.get('marketCapLowerThan') || '';
  const priceMin  = searchParams.get('priceMoreThan') || '';
  const priceMax  = searchParams.get('priceLowerThan') || '';
  const volMin    = searchParams.get('volumeMoreThan') || '';

  const q = new URLSearchParams({
    exchange,
    limit,
    ...(sector   ? { sector } : {}),
    ...(mktMin   ? { marketCapMoreThan: mktMin } : {}),
    ...(mktMax   ? { marketCapLowerThan: mktMax } : {}),
    ...(priceMin ? { priceMoreThan: priceMin } : {}),
    ...(priceMax ? { priceLowerThan: priceMax } : {}),
    ...(volMin   ? { volumeMoreThan: volMin } : {}),
    apikey: apiKey
  });

  const upstream = `https://financialmodelingprep.com/api/v3/stock-screener?${q.toString()}`;

  try {
    const res = await fetch(upstream, { next: { revalidate: 60 } });
    if (!res.ok) return NextResponse.json({ error: `Upstream ${res.status}` }, { status: 502 });

    const data = await res.json();
    if (!Array.isArray(data)) return NextResponse.json({ error: 'Unexpected response' }, { status: 500 });

    const rows = data.map((d: any) => ({
      symbol: d.symbol,
      companyName: d.companyName,
      price: d.price,
      marketCap: d.marketCap,
      sector: d.sector,
      volume: d.volume
    }));

    return NextResponse.json(rows);
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'Request failed' }, { status: 500 });
  }
}
