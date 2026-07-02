"use client";

import { useState } from "react";

export interface MarketData {
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
  allTimeHigh: number | null;
  athDrawdown: number | null;
}

export type SizeMode = "small" | "normal" | "large";

const FLAG: Record<string, string> = { KR: "🇰🇷", US: "🇺🇸" };

function formatPrice(v: number | null, market: string): string {
  if (v == null) return "—";
  return v.toLocaleString(market === "KR" ? "ko-KR" : "en-US", {
    minimumFractionDigits: market === "KR" ? 0 : 2,
    maximumFractionDigits: market === "KR" ? 0 : 2,
  });
}

function formatVolume(v: number | null): string {
  if (v == null) return "—";
  if (v >= 1_000_000_000) return (v / 1_000_000_000).toFixed(2) + "B";
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(2) + "M";
  if (v >= 1_000) return (v / 1_000).toFixed(1) + "K";
  return v.toString();
}

function marketStateLabel(state: string): { label: string; color: string } {
  switch (state) {
    case "REGULAR": return { label: "장중", color: "text-green-400" };
    case "PRE":     return { label: "장전", color: "text-yellow-400" };
    case "POST":    return { label: "장후", color: "text-blue-400" };
    default:        return { label: "휴장", color: "text-gray-500" };
  }
}

const sizes = {
  small: {
    pad: "p-3",
    flag: "text-base",
    name: "text-sm",
    symbol: "text-[10px]",
    badge: "text-[10px] px-1.5 py-0.5",
    price: "text-2xl",
    change: "text-xs",
    ath: "text-xs",
    athLabel: "text-[10px]",
    statLabel: "text-[10px]",
    statVal: "text-xs",
    ts: "text-[9px]",
    toggleText: "text-[10px]",
  },
  normal: {
    pad: "p-4",
    flag: "text-xl",
    name: "text-base",
    symbol: "text-xs",
    badge: "text-xs px-2 py-0.5",
    price: "text-4xl",
    change: "text-sm",
    ath: "text-sm",
    athLabel: "text-xs",
    statLabel: "text-xs",
    statVal: "text-sm",
    ts: "text-[10px]",
    toggleText: "text-xs",
  },
  large: {
    pad: "p-5",
    flag: "text-2xl",
    name: "text-xl",
    symbol: "text-sm",
    badge: "text-sm px-2.5 py-1",
    price: "text-5xl",
    change: "text-lg",
    ath: "text-base",
    athLabel: "text-sm",
    statLabel: "text-sm",
    statVal: "text-base",
    ts: "text-xs",
    toggleText: "text-sm",
  },
} as const;

function AthColor(drawdown: number | null) {
  if (drawdown === null) return "text-gray-500";
  if (drawdown >= -0.5) return "text-green-400";
  if (drawdown >= -10) return "text-yellow-400";
  return "text-orange-400";
}

function AthText(drawdown: number | null) {
  if (drawdown === null) return "—";
  if (drawdown >= -0.5) return "0.00% (역대 고점)";
  return `${drawdown.toFixed(2)}%`;
}

export default function MarketCard({ data, size = "small" }: { data: MarketData; size?: SizeMode }) {
  const [showDetail, setShowDetail] = useState(false);

  const isUp = (data.change ?? 0) >= 0;
  const upColor = isUp ? "text-red-400" : "text-blue-400";
  const bgAccent = isUp ? "from-red-500/10" : "from-blue-500/10";
  const borderColor = isUp ? "border-red-500/20" : "border-blue-500/20";
  const sign = isUp ? "+" : "";
  const { label, color: stateColor } = marketStateLabel(data.marketState);
  const s = sizes[size];

  const STATS = [
    { l: "시가",     v: formatPrice(data.open, data.market),          c: "text-gray-200" },
    { l: "전일 종가", v: formatPrice(data.previousClose, data.market), c: "text-gray-200" },
    { l: "고가",     v: formatPrice(data.high, data.market),           c: "text-red-300" },
    { l: "저가",     v: formatPrice(data.low, data.market),            c: "text-blue-300" },
    { l: "거래량",   v: formatVolume(data.volume),                     c: "text-gray-200" },
  ];

  return (
    <div className={`rounded-2xl border ${borderColor} bg-gradient-to-br ${bgAccent} to-transparent
      flex flex-col h-full min-h-0 overflow-hidden ${s.pad}`}>

      {/* ① 이름 + 상태 */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={s.flag}>{FLAG[data.market]}</span>
          <span className={`${s.name} font-bold text-white truncate`}>{data.name}</span>
          <span className={`${s.symbol} text-gray-600 hidden sm:inline`}>{data.symbol}</span>
        </div>
        <span className={`${s.badge} font-semibold rounded-full bg-white/5 shrink-0 ${stateColor}`}>{label}</span>
      </div>

      {/* ② 가격 */}
      <div className="shrink-0 mt-2">
        <p className={`${s.price} font-bold text-white tracking-tight leading-none`}>
          {formatPrice(data.price, data.market)}
        </p>
        <p className={`${s.change} font-semibold mt-1.5 ${upColor}`}>
          {sign}{formatPrice(data.change, data.market)}&nbsp;({sign}{(data.changePercent ?? 0).toFixed(2)}%)
        </p>
      </div>

      {/* ③ 역대 고점 대비 — 항상 표시 */}
      <div className="shrink-0 mt-2.5 pt-2.5 border-t border-white/10">
        <p className={`${s.athLabel} text-gray-500`}>역대 고점 대비</p>
        <p className={`${s.ath} font-bold mt-0.5 ${AthColor(data.athDrawdown)}`}>
          {AthText(data.athDrawdown)}
        </p>
      </div>

      {/* ④ 상세 토글 버튼 */}
      <button
        onClick={() => setShowDetail((v) => !v)}
        className={`shrink-0 mt-2 flex items-center gap-1 text-gray-600 hover:text-gray-400 transition-colors self-start ${s.toggleText}`}
      >
        <svg
          className={`w-3 h-3 transition-transform duration-200 ${showDetail ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
        {showDetail ? "접기" : "상세"}
      </button>

      {/* ⑤ 상세 통계 — 토글 */}
      {showDetail && (
        <div className="mt-2 pt-2 border-t border-white/10 min-h-0 overflow-hidden">
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            {STATS.map(({ l, v, c }) => (
              <div key={l} className={l === "거래량" ? "col-span-2" : ""}>
                <span className={`${s.statLabel} text-gray-600`}>{l}</span>
                <p className={`${s.statVal} ${c} font-medium leading-tight`}>{v}</p>
              </div>
            ))}
          </div>
          {data.timestamp && (
            <p className={`${s.ts} text-gray-700 text-right mt-1.5`}>
              {new Date(data.timestamp).toLocaleString("ko-KR")} 기준
            </p>
          )}
        </div>
      )}
    </div>
  );
}
