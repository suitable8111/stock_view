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
        indicators: {
          quote: Array<{ open: (number | null)[]; high: (number | null)[]; low: (number | null)[]; close: (number | null)[] }>;
          adjclose?: Array<{ adjclose: (number | null)[] }>;
        };
      }> | null;
      error: { description: string } | null;
    };
  };
  if (data.chart?.error) throw new Error(data.chart.error.description);
  const result = data.chart?.result?.[0];
  if (!result) throw new Error(`No result for ${symbol}`);
  return result;
}

async function fetchSymbolData(symbol: string, defaultName?: string, defaultMarket?: string) {
  const [current, history] = await Promise.all([
    fetchChart(symbol, "1d", "1m"),
    fetchChart(symbol, "max", "1mo"),
  ]);

  const meta = current.meta;
  const price = meta.regularMarketPrice as number;
  const prevClose = (meta.chartPreviousClose ?? meta.previousClose) as number;
  const change = price - prevClose;
  const changePercent = prevClose ? (change / prevClose) * 100 : 0;

  const name = defaultName ?? ((meta.shortName as string) || (meta.longName as string) || symbol);
  const currency = (meta.currency as string) ?? "";
  const market = defaultMarket ?? (currency === "KRW" ? "KR" : "US");

  // 분할 조정된 ATH 계산:
  // high/close 비율이 2.0 초과이면 분할 미반영 데이터 오염으로 판단해 제외.
  // 나머지는 adjclose/close 비율로 배당 조정 적용.
  const rawHighs = history.indicators?.quote?.[0]?.high ?? [];
  const rawCloses = history.indicators?.quote?.[0]?.close ?? [];
  const adjCloseArr = history.indicators?.adjclose?.[0]?.adjclose ?? [];

  const validHighs: number[] = rawHighs
    .map((h, i) => {
      if (!h || h <= 0) return null;
      const rawClose = rawCloses[i];
      if (rawClose && rawClose > 0 && h / rawClose > 2.0) return null; // 오염 데이터 제외
      if (rawClose && adjCloseArr[i] && rawClose > 0) {
        return h * (adjCloseArr[i]! / rawClose); // 배당 조정
      }
      return h;
    })
    .filter((v): v is number => v !== null && !isNaN(v) && v > 0);

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
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const extraParam = searchParams.get("extra");
    const extraRaw = extraParam ? extraParam.split(",").filter(Boolean) : [];
    const defaultSet = new Set(SYMBOLS.map((s) => s.symbol));
    const extraSymbols = extraRaw.filter((s) => !defaultSet.has(s));

    // Default 4 symbols: fail-fast (return 500 if any fails)
    const defaultResults = await Promise.all(
      SYMBOLS.map(({ symbol, name, market }) => fetchSymbolData(symbol, name, market))
    );

    // Extra custom symbols: fail per-symbol, don't break the whole response
    const extraResults = await Promise.all(
      extraSymbols.map((symbol) =>
        fetchSymbolData(symbol).catch((err) => ({
          symbol,
          name: symbol,
          market: "US" as const,
          price: null,
          change: null,
          changePercent: null,
          open: null,
          high: null,
          low: null,
          volume: null,
          previousClose: null,
          marketState: "CLOSED",
          timestamp: null,
          allTimeHigh: null,
          athDrawdown: null,
          fetchError: err instanceof Error ? err.message : String(err),
        }))
      )
    );

    return NextResponse.json(
      { data: [...defaultResults, ...extraResults], fetchedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Market fetch error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
