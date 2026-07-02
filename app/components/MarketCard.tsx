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
    case "PRE": return { label: "장전", color: "text-yellow-400" };
    case "POST": return { label: "장후", color: "text-blue-400" };
    default: return { label: "휴장", color: "text-gray-500" };
  }
}

export default function MarketCard({ data }: { data: MarketData }) {
  const isUp = (data.change ?? 0) >= 0;
  const color = isUp ? "text-red-400" : "text-blue-400";
  const bgAccent = isUp ? "from-red-500/10" : "from-blue-500/10";
  const borderColor = isUp ? "border-red-500/30" : "border-blue-500/30";
  const sign = isUp ? "+" : "";
  const { label, color: stateColor } = marketStateLabel(data.marketState);

  return (
    <div
      className={`relative rounded-2xl border ${borderColor} bg-gradient-to-br ${bgAccent} to-transparent backdrop-blur-sm p-6 flex flex-col gap-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg`}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">{FLAG[data.market]}</span>
            <span className="text-lg font-bold text-white">{data.name}</span>
          </div>
          <span className="text-xs text-gray-500 mt-0.5 block">{data.symbol}</span>
        </div>
        <span className={`text-xs font-medium px-2 py-1 rounded-full bg-white/5 ${stateColor}`}>
          {label}
        </span>
      </div>

      {/* Price */}
      <div>
        <p className="text-3xl font-bold text-white tracking-tight">
          {formatPrice(data.price, data.market)}
        </p>
        <p className={`text-sm font-medium mt-1 ${color}`}>
          {sign}{formatPrice(data.change, data.market)}&nbsp;
          ({sign}{(data.changePercent ?? 0).toFixed(2)}%)
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-gray-400 border-t border-white/10 pt-4">
        <div>
          <span className="text-gray-600">시가</span>
          <p className="text-gray-300">{formatPrice(data.open, data.market)}</p>
        </div>
        <div>
          <span className="text-gray-600">전일 종가</span>
          <p className="text-gray-300">{formatPrice(data.previousClose, data.market)}</p>
        </div>
        <div>
          <span className="text-gray-600">고가</span>
          <p className="text-red-300">{formatPrice(data.high, data.market)}</p>
        </div>
        <div>
          <span className="text-gray-600">저가</span>
          <p className="text-blue-300">{formatPrice(data.low, data.market)}</p>
        </div>
        <div className="col-span-2">
          <span className="text-gray-600">거래량</span>
          <p className="text-gray-300">{formatVolume(data.volume)}</p>
        </div>
      </div>

      {/* Timestamp */}
      {data.timestamp && (
        <p className="text-[10px] text-gray-600 text-right -mt-2">
          {new Date(data.timestamp).toLocaleString("ko-KR")} 기준
        </p>
      )}
    </div>
  );
}
