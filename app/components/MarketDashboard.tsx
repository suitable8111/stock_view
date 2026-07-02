"use client";

import { useEffect, useState, useCallback } from "react";
import MarketCard from "./MarketCard";

interface MarketData {
  symbol: string;
  name: string;
  market: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  volume: number | null;
  previousClose: number | null;
  marketState: string;
  timestamp: string | null;
}

const REFRESH_INTERVAL = 30_000;

export default function MarketDashboard() {
  const [data, setData] = useState<MarketData[]>([]);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL / 1000);
  const [large, setLarge] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/market");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json.data);
      setFetchedAt(json.fetchedAt);
      setCountdown(REFRESH_INTERVAL / 1000);
    } catch (e) {
      setError("데이터를 불러오는 중 오류가 발생했습니다.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    const tick = setInterval(() => setCountdown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(tick);
  }, [fetchedAt]);

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0f] overflow-hidden">
      {/* 헤더 — 고정 높이 */}
      <header className="shrink-0 flex items-center justify-between px-6 py-3 border-b border-white/5">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-white tracking-tight">📈 글로벌 시황</h1>
          <span className="text-sm text-gray-600 hidden sm:block">KOSPI · KOSDAQ · NASDAQ · S&P 500</span>
        </div>
        <div className="flex items-center gap-3">
          {fetchedAt && (
            <span className="text-xs text-gray-600 hidden sm:block">
              {new Date(fetchedAt).toLocaleString("ko-KR")} 조회
            </span>
          )}
          <button
            onClick={() => setLarge((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition
              ${large ? "bg-white/15 border-white/30 text-white" : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"}`}
          >
            {large ? (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0zM9 11h4" />
                </svg>
                격자 보기
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0zM11 8v6M8 11h6" />
                </svg>
                크게 보기
              </>
            )}
          </button>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-gray-300 transition disabled:opacity-40"
          >
            <svg className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {loading ? "조회중..." : `${countdown}s`}
          </button>
        </div>
      </header>

      {/* 메인 — 남은 화면 꽉 채움 */}
      <main className="flex-1 min-h-0 p-4">
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-400 text-sm mb-3">
            {error}
          </div>
        )}

        {large ? (
          /* 크게 보기: 스크롤 가능 1열 */
          <div className="h-full overflow-y-auto space-y-4 pr-1">
            {loading && data.length === 0
              ? [...Array(4)].map((_, i) => <div key={i} className="rounded-2xl border border-white/10 bg-white/5 h-96 animate-pulse" />)
              : data.map((item) => <MarketCard key={item.symbol} data={item} large />)
            }
          </div>
        ) : (
          /* 격자 보기: 2×2, 높이 꽉 채움 */
          <div className="h-full grid grid-cols-2 grid-rows-2 gap-4">
            {loading && data.length === 0
              ? [...Array(4)].map((_, i) => <div key={i} className="rounded-2xl border border-white/10 bg-white/5 animate-pulse" />)
              : data.map((item) => <MarketCard key={item.symbol} data={item} />)
            }
          </div>
        )}
      </main>

      <footer className="shrink-0 text-center text-xs text-gray-700 py-2">
        데이터 출처: Yahoo Finance · {REFRESH_INTERVAL / 1000}초마다 자동 갱신
      </footer>
    </div>
  );
}
