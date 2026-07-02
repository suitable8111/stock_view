import { NextResponse } from "next/server";
import yahooFinance from "yahoo-finance2";

const SYMBOLS = [
  { symbol: "^KS11", name: "KOSPI", market: "KR" },
  { symbol: "^KQ11", name: "KOSDAQ", market: "KR" },
  { symbol: "^IXIC", name: "NASDAQ", market: "US" },
  { symbol: "^GSPC", name: "S&P 500", market: "US" },
];

export async function GET() {
  try {
    const results = await Promise.all(
      SYMBOLS.map(async ({ symbol, name, market }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const q = (await yahooFinance.quote(symbol)) as any;
        return {
          symbol,
          name,
          market,
          price: q.regularMarketPrice ?? null,
          change: q.regularMarketChange ?? null,
          changePercent: q.regularMarketChangePercent ?? null,
          open: q.regularMarketOpen ?? null,
          high: q.regularMarketDayHigh ?? null,
          low: q.regularMarketDayLow ?? null,
          volume: q.regularMarketVolume ?? null,
          previousClose: q.regularMarketPreviousClose ?? null,
          marketState: q.marketState ?? "CLOSED",
          timestamp: q.regularMarketTime
            ? new Date(q.regularMarketTime).toISOString()
            : null,
        };
      })
    );

    return NextResponse.json(
      { data: results, fetchedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("Market fetch error:", err);
    return NextResponse.json({ error: "Failed to fetch market data" }, { status: 500 });
  }
}
