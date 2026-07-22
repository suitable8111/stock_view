export const runtime = "edge";

import { NextResponse } from "next/server";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://finance.yahoo.com/",
  Origin: "https://finance.yahoo.com",
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  if (q.length < 1) return NextResponse.json({ results: [] });

  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=8&newsCount=0&enableFuzzyQuery=true`;
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) throw new Error(`Yahoo ${res.status}`);

    const data = (await res.json()) as {
      quotes?: Array<{
        symbol: string;
        shortname?: string;
        longname?: string;
        exchDisp?: string;
        quoteType?: string;
      }>;
    };

    const results = (data.quotes ?? [])
      .filter((q) => ["EQUITY", "INDEX", "ETF", "MUTUALFUND"].includes(q.quoteType ?? ""))
      .slice(0, 6)
      .map((q) => ({
        symbol: q.symbol,
        name: q.shortname || q.longname || q.symbol,
        exchange: q.exchDisp ?? "",
      }));

    return NextResponse.json({ results });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
