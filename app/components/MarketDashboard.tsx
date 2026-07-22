"use client";

import { useEffect, useState, useCallback } from "react";
import MarketCard, { SearchResultCard, type MarketData, type SizeMode } from "./MarketCard";
import StockSearch from "./StockSearch";

const DEFAULT_SYMBOLS = ["^GSPC", "^IXIC", "^KS11", "^KQ11"];
const DEFAULT_SYMBOL_SET = new Set(DEFAULT_SYMBOLS);
const REFRESH_INTERVAL = 30_000;
const SIZE_MODES: { key: SizeMode; label: string }[] = [
  { key: "small",  label: "작게" },
  { key: "normal", label: "보통" },
  { key: "large",  label: "크게" },
];

export default function MarketDashboard() {
  const [data, setData] = useState<MarketData[]>([]);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL / 1000);
  const [size, setSize] = useState<SizeMode>("small");
  const [customSymbol, setCustomSymbol] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Load from localStorage after hydration (handle both old array format and new string format)
  useEffect(() => {
    try {
      const saved = localStorage.getItem("stock-view-custom");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setCustomSymbol(parsed[parsed.length - 1]);
          }
        } catch {
          setCustomSymbol(saved);
        }
      }
    } catch {}
    setMounted(true);
  }, []);

  // Persist to localStorage
  useEffect(() => {
    if (!mounted) return;
    if (customSymbol) {
      localStorage.setItem("stock-view-custom", customSymbol);
    } else {
      localStorage.removeItem("stock-view-custom");
    }
  }, [customSymbol, mounted]);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const extra = customSymbol ? `?extra=${customSymbol}` : "";
      const res = await fetch(`/api/market${extra}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json.data ?? []);
      setFetchedAt(json.fetchedAt);
      setCountdown(REFRESH_INTERVAL / 1000);
    } catch (e) {
      setError("데이터를 불러오는 중 오류가 발생했습니다.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [customSymbol]);

  useEffect(() => {
    if (!mounted) return;
    fetchData();
    const interval = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData, mounted]);

  useEffect(() => {
    const tick = setInterval(() => setCountdown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(tick);
  }, [fetchedAt]);

  const setSymbol = useCallback((symbol: string) => {
    if (DEFAULT_SYMBOL_SET.has(symbol)) return;
    setCustomSymbol(symbol);
    // 이전 카드 즉시 제거해서 스켈레톤으로 전환
    setData((prev) => prev.filter((d) => DEFAULT_SYMBOL_SET.has(d.symbol)));
  }, []);

  const clearSymbol = useCallback(() => {
    setCustomSymbol(null);
    setData((prev) => prev.filter((d) => DEFAULT_SYMBOL_SET.has(d.symbol)));
  }, []);

  const defaultData = data.filter((d) => DEFAULT_SYMBOL_SET.has(d.symbol));
  const customItem = data.find((d) => !DEFAULT_SYMBOL_SET.has(d.symbol)) ?? null;
  const allExisting = new Set([...DEFAULT_SYMBOLS, ...(customSymbol ? [customSymbol] : [])]);

  return (
    <div className="h-[100dvh] flex flex-col bg-[#0a0a0f]">

      {/* 헤더 */}
      <header className="shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-white/5">
        <span className="text-lg font-bold text-white">📈 글로벌 시황</span>
        <div className="flex items-center gap-2">
          {fetchedAt && (
            <span className="text-[11px] text-gray-600 hidden sm:block">
              {new Date(fetchedAt).toLocaleString("ko-KR")} 조회
            </span>
          )}
          <div className="flex rounded-lg overflow-hidden border border-white/10">
            {SIZE_MODES.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setSize(key)}
                className={`px-2.5 py-1.5 text-xs font-medium transition
                  ${size === key ? "bg-white/15 text-white" : "bg-white/0 text-gray-400 hover:bg-white/10"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-gray-300 transition disabled:opacity-40"
          >
            <svg className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {loading ? "..." : `${countdown}s`}
          </button>
        </div>
      </header>

      {/* 상단 — 기본 4격자 (60%) */}
      <div className="flex-[3] min-h-0 p-2.5">
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-red-400 text-xs mb-2">
            {error}
          </div>
        )}
        <div className="h-full grid grid-cols-2 grid-rows-2 gap-2.5">
          {loading && defaultData.length === 0
            ? [...Array(4)].map((_, i) => (
                <div key={i} className="rounded-2xl border border-white/10 bg-white/5 animate-pulse" />
              ))
            : defaultData.map((item) => (
                <MarketCard key={item.symbol} data={item} size={size} />
              ))
          }
        </div>
      </div>

      {/* 하단 — 종목 검색 (40%) */}
      <div className="flex-[2] min-h-[140px] flex flex-col border-t border-white/10">

        {/* 검색 입력 */}
        <div className="shrink-0 px-3 pt-2.5 pb-2">
          <p className="text-xs font-semibold text-gray-500 mb-2">종목검색</p>
          <StockSearch onAdd={setSymbol} existingSymbols={allExisting} />
        </div>

        {/* 검색된 종목 — 하나만 표시 */}
        <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-2">
          {!customSymbol ? (
            <p className="text-xs text-gray-700 text-center pt-3">
              종목을 검색하여 추가하세요
            </p>
          ) : customItem ? (
            <SearchResultCard data={customItem} onRemove={clearSymbol} />
          ) : (
            <div className="rounded-xl border border-white/10 bg-white/5 animate-pulse h-[88px]" />
          )}
        </div>
      </div>
    </div>
  );
}
