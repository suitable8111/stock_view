"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
}

interface Props {
  onAdd: (symbol: string) => void;
  existingSymbols: Set<string>;
}

export default function StockSearch({ onAdd, existingSymbols }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.results ?? []);
      setOpen(true);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  // Debounced auto-search (500ms, min 2 chars)
  useEffect(() => {
    clearTimeout(timerRef.current);
    if (query.trim().length >= 2) {
      timerRef.current = setTimeout(() => doSearch(query), 500);
    } else {
      setResults([]);
      setOpen(false);
    }
    return () => clearTimeout(timerRef.current);
  }, [query, doSearch]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        !inputRef.current?.contains(e.target as Node) &&
        !dropdownRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleAdd = (r: SearchResult) => {
    onAdd(r.symbol);
    setQuery("");
    setResults([]);
    setOpen(false);
  };

  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="flex-1 flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 focus-within:border-white/20 transition-colors">
          {searching ? (
            <svg className="w-3.5 h-3.5 text-gray-500 animate-spin shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5 text-gray-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && doSearch(query)}
            placeholder="종목명 또는 티커 입력"
            className="flex-1 bg-transparent text-sm text-white placeholder:text-gray-600 focus:outline-none min-w-0"
          />
          {query && (
            <button onClick={() => { setQuery(""); setResults([]); setOpen(false); }}>
              <svg className="w-3 h-3 text-gray-600 hover:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <button
          onClick={() => doSearch(query)}
          className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-xs text-gray-200 font-medium transition-colors shrink-0"
        >
          검색
        </button>
      </div>

      {/* Dropdown — appears above the input */}
      {open && results.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute bottom-full left-0 right-0 mb-1.5 bg-[#12121e] border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50"
        >
          {results.map((r) => {
            const already = existingSymbols.has(r.symbol);
            return (
              <button
                key={r.symbol}
                onClick={() => !already && handleAdd(r)}
                disabled={already}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors
                  ${already ? "opacity-40 cursor-default" : "hover:bg-white/5 cursor-pointer"}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm text-white font-medium shrink-0">{r.symbol}</span>
                  <span className="text-xs text-gray-500 truncate">{r.name}</span>
                </div>
                <span className="text-xs text-gray-600 shrink-0 ml-2">
                  {already ? "추가됨" : r.exchange}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
