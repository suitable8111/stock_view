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
    const tick = setInterval(() => {
      setCountdown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(tick);
  }, [fetchedAt]);

  return (
    <div className="min-h-screen bg-[#0a0a0f] px-4 py-10">
      {/* Header */}
      <header className="max-w-6xl mx-auto mb-10">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-4xl font-bold text-white tracking-tight">
              📈 글로벌 시황
            </h1>
            <p className="text-base text-gray-500 mt-1">
              KOSPI · KOSDAQ · NASDAQ · S&P 500
            </p>
          </div>
          <div className="flex items-center gap-3">
            {fetchedAt && (
              <span className="text-sm text-gray-600">
                {new Date(fetchedAt).toLocaleString("ko-KR")} 조회
              </span>
            )}

            {/* 돋보기 토글 */}
            <button
              onClick={() => setLarge((v) => !v)}
              title={large ? "기본 모드" : "크게 보기"}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition
                ${large
                  ? "bg-white/15 border-white/30 text-white"
                  : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"}`}
            >
              {large ? (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0zM9 11h4" />
                  </svg>
                  기본 모드
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0zM11 8v6M8 11h6" />
                  </svg>
                  크게 보기
                </>
              )}
            </button>

            {/* 새로고침 */}
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-gray-300 transition disabled:opacity-40"
            >
              <svg
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {loading ? "조회중..." : `새로고침 (${countdown}s)`}
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto">
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-400 text-base mb-6">
            {error}
          </div>
        )}

        {loading && data.length === 0 ? (
          <div className={`grid gap-6 ${large ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>
            {[...Array(4)].map((_, i) => (
              <div key={i} className={`rounded-2xl border border-white/10 bg-white/5 animate-pulse ${large ? "h-96" : "h-64"}`} />
            ))}
          </div>
        ) : (
          <div className={`grid gap-6 transition-all duration-300 ${large ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>
            {data.map((item) => (
              <MarketCard key={item.symbol} data={item} large={large} />
            ))}
          </div>
        )}
      </main>

      <footer className="max-w-6xl mx-auto mt-12 text-center text-sm text-gray-700">
        데이터 출처: Yahoo Finance · {REFRESH_INTERVAL / 1000}초마다 자동 갱신
      </footer>
    </div>
  );
}
