export const runtime = "edge";

import { NextResponse } from "next/server";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://finance.yahoo.com/",
  Origin: "https://finance.yahoo.com",
};

type Quote = {
  symbol: string;
  shortname?: string;
  longname?: string;
  exchDisp?: string;
  quoteType?: string;
};

async function yahooSearch(q: string, host: string): Promise<Quote[]> {
  const url = `https://${host}/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=8&newsCount=0&enableFuzzyQuery=true`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`${host} ${res.status}`);
  const data = (await res.json()) as { quotes?: Quote[] };
  return data.quotes ?? [];
}

// Fallback: verify an exact ticker via the chart API (always works on Edge)
async function verifyTicker(symbol: string) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    chart: {
      result?: Array<{ meta: Record<string, string | number> }> | null;
    };
  };
  const meta = data.chart?.result?.[0]?.meta;
  if (!meta?.regularMarketPrice) return null;
  return {
    symbol: (meta.symbol as string) ?? symbol.toUpperCase(),
    name: (meta.shortName as string) || (meta.longName as string) || symbol.toUpperCase(),
    exchange: (meta.exchangeName as string) ?? "",
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  if (q.length < 1) return NextResponse.json({ results: [] });

  // 1) Try Yahoo Finance search — query1 then query2
  let quotes: Quote[] = [];
  let searchFailed = false;
  try {
    try {
      quotes = await yahooSearch(q, "query1.finance.yahoo.com");
    } catch {
      quotes = await yahooSearch(q, "query2.finance.yahoo.com");
    }
  } catch {
    searchFailed = true;
  }

  const ALLOWED = ["EQUITY", "INDEX", "ETF", "MUTUALFUND"];
  let results = quotes
    .filter((r) => ALLOWED.includes(r.quoteType ?? ""))
    .slice(0, 6)
    .map((r) => ({
      symbol: r.symbol,
      name: r.shortname || r.longname || r.symbol,
      exchange: r.exchDisp ?? "",
    }));

  // 2) If search failed or returned nothing and input looks like a ticker, try chart verification
  if (results.length === 0) {
    const looksLikeTicker = /^[\w^.]{1,12}$/i.test(q);
    if (looksLikeTicker) {
      const verified = await verifyTicker(q).catch(() => null);
      if (verified) results = [verified];
    }
  }

  // Return searchFailed so UI can show an appropriate message
  return NextResponse.json({ results, searchFailed: searchFailed && results.length === 0 });
}
