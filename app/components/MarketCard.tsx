"use client";

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

export default function MarketCard({ data, large = false }: { data: MarketData; large?: boolean }) {
  const isUp = (data.change ?? 0) >= 0;
  const color = isUp ? "text-red-400" : "text-blue-400";
  const bgAccent = isUp ? "from-red-500/10" : "from-blue-500/10";
  const borderColor = isUp ? "border-red-500/20" : "border-blue-500/20";
  const sign = isUp ? "+" : "";
  const { label, color: stateColor } = marketStateLabel(data.marketState);

  if (large) {
    return (
      <div className={`rounded-2xl border ${borderColor} bg-gradient-to-br ${bgAccent} to-transparent p-10 flex flex-col gap-5`}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-3xl">{FLAG[data.market]}</span>
              <span className="text-3xl font-bold text-white">{data.name}</span>
            </div>
            <span className="text-base text-gray-500 mt-1 block">{data.symbol}</span>
          </div>
          <span className={`text-base font-semibold px-3 py-1 rounded-full bg-white/5 ${stateColor}`}>{label}</span>
        </div>
        <div>
          <p className="text-7xl font-bold text-white tracking-tight">{formatPrice(data.price, data.market)}</p>
          <p className={`text-2xl font-semibold mt-2 ${color}`}>
            {sign}{formatPrice(data.change, data.market)} ({sign}{(data.changePercent ?? 0).toFixed(2)}%)
          </p>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 border-t border-white/10 pt-5 text-lg">
          {[
            { label: "시가", value: formatPrice(data.open, data.market), cls: "text-gray-200" },
            { label: "전일 종가", value: formatPrice(data.previousClose, data.market), cls: "text-gray-200" },
            { label: "고가", value: formatPrice(data.high, data.market), cls: "text-red-300" },
            { label: "저가", value: formatPrice(data.low, data.market), cls: "text-blue-300" },
          ].map(({ label: l, value, cls }) => (
            <div key={l}>
              <span className="text-gray-500">{l}</span>
              <p className={`text-xl font-medium mt-1 ${cls}`}>{value}</p>
            </div>
          ))}
          <div className="col-span-2">
            <span className="text-gray-500">거래량</span>
            <p className="text-xl font-medium mt-1 text-gray-200">{formatVolume(data.volume)}</p>
          </div>
        </div>
        {data.timestamp && (
          <p className="text-sm text-gray-600 text-right">{new Date(data.timestamp).toLocaleString("ko-KR")} 기준</p>
        )}
      </div>
    );
  }

  /* ── 4격자 카드 ── */
  return (
    <div className={`rounded-2xl border ${borderColor} bg-gradient-to-br ${bgAccent} to-transparent p-5 flex flex-col h-full`}>
      {/* 상단 */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{FLAG[data.market]}</span>
          <span className="text-xl font-bold text-white">{data.name}</span>
          <span className="text-sm text-gray-500">{data.symbol}</span>
        </div>
        <span className={`text-sm font-semibold px-2 py-0.5 rounded-full bg-white/5 ${stateColor}`}>{label}</span>
      </div>

      {/* 가격 — flex-1로 세로 공간 차지 */}
      <div className="flex-1 flex flex-col justify-center py-2">
        <p className="text-5xl font-bold text-white tracking-tight leading-none">
          {formatPrice(data.price, data.market)}
        </p>
        <p className={`text-xl font-semibold mt-3 ${color}`}>
          {sign}{formatPrice(data.change, data.market)}&nbsp;
          <span className="text-lg">({sign}{(data.changePercent ?? 0).toFixed(2)}%)</span>
        </p>
      </div>

      {/* 하단 통계 */}
      <div className="border-t border-white/10 pt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div>
          <span className="text-gray-500 text-xs">시가</span>
          <p className="text-gray-200 font-medium">{formatPrice(data.open, data.market)}</p>
        </div>
        <div>
          <span className="text-gray-500 text-xs">전일 종가</span>
          <p className="text-gray-200 font-medium">{formatPrice(data.previousClose, data.market)}</p>
        </div>
        <div>
          <span className="text-gray-500 text-xs">고가</span>
          <p className="text-red-300 font-medium">{formatPrice(data.high, data.market)}</p>
        </div>
        <div>
          <span className="text-gray-500 text-xs">저가</span>
          <p className="text-blue-300 font-medium">{formatPrice(data.low, data.market)}</p>
        </div>
        <div className="col-span-2">
          <span className="text-gray-500 text-xs">거래량</span>
          <p className="text-gray-200 font-medium">{formatVolume(data.volume)}</p>
        </div>
      </div>

      {data.timestamp && (
        <p className="text-[10px] text-gray-600 text-right mt-2">
          {new Date(data.timestamp).toLocaleString("ko-KR")} 기준
        </p>
      )}
    </div>
  );
}
