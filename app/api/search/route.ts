export const runtime = "edge";

import { NextResponse } from "next/server";

const YAHOO_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://finance.yahoo.com/",
  Origin: "https://finance.yahoo.com",
};

const DAUM_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8",
  Referer: "https://finance.daum.net/",
  Origin: "https://finance.daum.net",
};

type SearchResult = { symbol: string; name: string; exchange: string };

type YahooQuote = {
  symbol: string;
  shortname?: string;
  longname?: string;
  exchDisp?: string;
  quoteType?: string;
};

// Yahoo Finance 심볼 유효성 검증 (차트 API 사용 — Vercel Edge에서 확실히 작동)
async function verifyTicker(symbol: string): Promise<SearchResult | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
  const res = await fetch(url, { headers: YAHOO_HEADERS });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    chart: { result?: Array<{ meta: Record<string, string | number> }> | null };
  };
  const meta = data.chart?.result?.[0]?.meta;
  if (!meta?.regularMarketPrice) return null;
  return {
    symbol: (meta.symbol as string) ?? symbol,
    name: (meta.shortName as string) || (meta.longName as string) || symbol,
    exchange: (meta.exchangeName as string) ?? "",
  };
}

// Yahoo Finance 텍스트 검색 (영문 종목용)
async function yahooSearch(q: string, host: string): Promise<YahooQuote[]> {
  const url = `https://${host}/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=8&newsCount=0&enableFuzzyQuery=true`;
  const res = await fetch(url, { headers: YAHOO_HEADERS });
  if (!res.ok) throw new Error(`${host} ${res.status}`);
  const data = (await res.json()) as { quotes?: YahooQuote[] };
  return data.quotes ?? [];
}

// 다음 금융 한글 검색 → displayedCode(6자리 숫자) 추출
async function daumSearch(q: string): Promise<Array<{ code: string; name: string }>> {
  const url = `https://finance.daum.net/api/search?q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: DAUM_HEADERS });
  if (!res.ok) throw new Error(`Daum ${res.status}`);
  const data = (await res.json()) as {
    suggestItems?: Array<{ symbolCode: string; koreanName: string; displayedCode: string }>;
  };
  return (data.suggestItems ?? [])
    .filter((item) => /^\d{6}$/.test(item.displayedCode)) // 순수 6자리 숫자만 (일반 주식/ETF)
    .slice(0, 5)
    .map((item) => ({ code: item.displayedCode, name: item.koreanName }));
}

const ALLOWED_TYPES = ["EQUITY", "INDEX", "ETF", "MUTUALFUND"];
const HAS_KOREAN = /[ㄱ-ㆎ가-힣]/;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  if (q.length < 1) return NextResponse.json({ results: [] });

  // ── 한글 입력: 다음 금융 검색 후 Yahoo Finance에서 티커 검증 ──
  if (HAS_KOREAN.test(q)) {
    try {
      const items = await daumSearch(q);
      if (items.length === 0) return NextResponse.json({ results: [] });

      // .KS (KOSPI) 와 .KQ (KOSDAQ) 동시 검증
      const verified = await Promise.all(
        items.map(async ({ code, name }) => {
          const [ks, kq] = await Promise.allSettled([
            verifyTicker(`${code}.KS`),
            verifyTicker(`${code}.KQ`),
          ]);
          const result =
            (ks.status === "fulfilled" && ks.value) ? ks.value :
            (kq.status === "fulfilled" && kq.value) ? kq.value : null;
          if (!result) return null;
          return { symbol: result.symbol, name, exchange: "KRX" } as SearchResult;
        })
      );

      const results = verified.filter((r): r is SearchResult => r !== null);
      return NextResponse.json({ results });
    } catch {
      return NextResponse.json({ results: [], searchFailed: true });
    }
  }

  // ── 영문/숫자 입력: Yahoo Finance 검색 ──
  let quotes: YahooQuote[] = [];
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

  let results: SearchResult[] = quotes
    .filter((r) => ALLOWED_TYPES.includes(r.quoteType ?? ""))
    .slice(0, 6)
    .map((r) => ({
      symbol: r.symbol,
      name: r.shortname || r.longname || r.symbol,
      exchange: r.exchDisp ?? "",
    }));

  // 검색 실패 + 티커 형식이면 차트 API로 직접 검증
  if (results.length === 0 && /^[\w^.]{1,12}$/i.test(q)) {
    const verified = await verifyTicker(q).catch(() => null);
    if (verified) results = [verified];
  }

  return NextResponse.json({ results, searchFailed: searchFailed && results.length === 0 });
}
