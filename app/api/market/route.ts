export const runtime = "edge";

import { NextResponse } from "next/server";

const SYMBOLS = [
  { symbol: "^GSPC", name: "S&P 500", market: "US" },
  { symbol: "^IXIC", name: "NASDAQ", market: "US" },
  { symbol: "^KS11", name: "KOSPI", market: "KR" },
  { symbol: "^KQ11", name: "KOSDAQ", market: "KR" },
];

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://finance.yahoo.com/",
  Origin: "https://finance.yahoo.com",
};

async function fetchChart(symbol: string, range: string, interval: string) {
  const encoded = encodeURIComponent(symbol);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encoded}?interval=${interval}&range=${range}&includePrePost=true`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`Yahoo Finance ${res.status} for ${symbol} (${range})`);
  const data = (await res.json()) as {
    chart: {
      result: Array<{
        meta: Record<string, number | string>;
        indicators: { quote: Array<{ close: (number | null)[] }> };
      }> | null;
      error: { description: string } | null;
    };
  };
  if (data.chart?.error) throw new Error(data.chart.error.description);
  const result = data.chart?.result?.[0];
  if (!result) throw new Error(`No result for ${symbol}`);
  return result;
}

export async function GET() {
  try {
    const results = await Promise.all(
      SYMBOLS.map(async ({ symbol, name, market }) => {
        // 현재가 + 역대 최고가를 병렬 조회
        const [current, history] = await Promise.all([
          fetchChart(symbol, "1d", "1m"),
          fetchChart(symbol, "max", "1mo"),
        ]);

        const meta = current.meta;
        const price = meta.regularMarketPrice as number;
        const prevClose = (meta.chartPreviousClose ?? meta.previousClose) as number;
        const change = price - prevClose;
        const changePercent = prevClose ? (change / prevClose) * 100 : 0;

        // 역대 고점 계산 — 월간 고가(high) 기준으로 장중 피크까지 포함
        const highs = history.indicators?.quote?.[0]?.high ?? [];
        const validHighs = highs.filter((v): v is number => v !== null && !isNaN(v));
        // 현재 장중 고가도 후보에 포함
        const currentHigh = meta.regularMarketDayHigh as number | undefined;
        if (currentHigh) validHighs.push(currentHigh);
        const allTimeHigh = validHighs.length > 0 ? Math.max(...validHighs) : null;
        const athDrawdown =
          allTimeHigh !== null && allTimeHigh > 0
            ? ((price - allTimeHigh) / allTimeHigh) * 100
            : null;

        return {
          symbol,
          name,
          market,
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
          allTimeHigh,
          athDrawdown,
        };
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
