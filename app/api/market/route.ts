export const runtime = "edge";

import { NextResponse } from "next/server";

const SYMBOLS = [
  { symbol: "^GSPC", name: "S&P 500", market: "US" },
  { symbol: "^IXIC", name: "NASDAQ", market: "US" },
  { symbol: "^KS11", name: "KOSPI", market: "KR" },
  { symbol: "^KQ11", name: "KOSDAQ", market: "KR" },
];

async function fetchChart(symbol: string) {
  const encoded = encodeURIComponent(symbol);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encoded}?interval=1m&range=1d&includePrePost=true`;

  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Accept: "application/json",
      "Accept-Language": "en-US,en;q=0.9",
      Referer: "https://finance.yahoo.com/",
      Origin: "https://finance.yahoo.com",
    },
  });

  if (!res.ok) throw new Error(`Yahoo Finance ${res.status} for ${symbol}`);

  const data = (await res.json()) as {
    chart: { result: Array<{ meta: Record<string, number | string> }> | null; error: { description: string } | null };
  };

  if (data.chart?.error) throw new Error(data.chart.error.description);

  const meta = data.chart?.result?.[0]?.meta;
  if (!meta) throw new Error(`No result for ${symbol}`);

  const price = meta.regularMarketPrice as number;
  const prevClose = (meta.chartPreviousClose ?? meta.previousClose) as number;
  const change = price - prevClose;
  const changePercent = prevClose ? (change / prevClose) * 100 : 0;

  return {
    price,
    change,
    changePercent,
    open: (meta.regularMarketDayOpen as number) ?? null,
    high: (meta.regularMarketDayHigh as number) ?? null,
    low: (meta.regularMarketDayLow as number) ?? null,
    volume: (meta.regularMarketVolume as number) ?? null,
    previousClose: prevClose ?? null,
    marketState: (meta.marketState as string) ?? "CLOSED",
    timestamp: meta.regularMarketTime
      ? new Date((meta.regularMarketTime as number) * 1000).toISOString()
      : null,
  };
}

export async function GET() {
  try {
    const results = await Promise.all(
      SYMBOLS.map(async ({ symbol, name, market }) => {
        const quote = await fetchChart(symbol);
        return { symbol, name, market, ...quote };
      })
    );

    return NextResponse.json(
      { data: results, fetchedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Market fetch error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
