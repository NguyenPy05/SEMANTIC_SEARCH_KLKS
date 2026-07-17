import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GitBranch, Search, Loader2, Hash, Cpu, Layers, ArrowRight
} from "lucide-react";
import { searchBooks } from "../api/axiosClient";
import type { SearchResponse } from "../types";

type CompareMode = "keyword" | "semantic" | "hybrid";

const MODE_LABELS: Record<CompareMode, { label: string; icon: React.ReactNode; color: string; description: string }> = {
  keyword: {
    label: "Keyword (BM25)",
    icon: <Hash className="w-4 h-4" />,
    color: "text-amber-400",
    description: "Traditional sparse retrieval",
  },
  semantic: {
    label: "Semantic (Dense)",
    icon: <Cpu className="w-4 h-4" />,
    color: "text-sky-400",
    description: "Neural embedding similarity",
  },
  hybrid: {
    label: "Hybrid + Rerank",
    icon: <Layers className="w-4 h-4" />,
    color: "text-purple-400",
    description: "RRF fusion + cross-encoder",
  },
};

const KILLER_QUERIES = [
  "Cuốn sách nào nói về sự cô đơn của con người trong vũ trụ?",
  "Philosophy of consciousness and self-awareness",
  "Tác phẩm khoa học về lý thuyết thông tin",
  "Adventures on the open sea with nature",
  "Sách kinh tế hành vi ảnh hưởng quyết định",
];

export default function Comparison() {
  const [query, setQuery] = useState("");
  const [limit] = useState(5);
  const [results, setResults] = useState<Record<CompareMode, SearchResponse | null>>({
    keyword: null,
    semantic: null,
    hybrid: null,
  });
  const [loading, setLoading] = useState<Record<CompareMode, boolean>>({
    keyword: false,
    semantic: false,
    hybrid: false,
  });
  const [error, setError] = useState<string | null>(null);

  const runAll = async (q: string) => {
    if (!q.trim()) return;
    setError(null);
    setResults({ keyword: null, semantic: null, hybrid: null });
    const modes: CompareMode[] = ["keyword", "semantic", "hybrid"];

    await Promise.all(
      modes.map(async (mode) => {
        setLoading((prev) => ({ ...prev, [mode]: true }));
        try {
          const data = await searchBooks({ q: q.trim(), limit, mode });
          setResults((prev) => ({ ...prev, [mode]: data }));
        } catch (e) {
          setError(e instanceof Error ? e.message : "Lỗi tìm kiếm");
        } finally {
          setLoading((prev) => ({ ...prev, [mode]: false }));
        }
      })
    );
  };

  const isAllLoading = Object.values(loading).some(Boolean);

  return (
    <section className="space-y-5">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-amber-400">
          Mode Comparison
        </p>
        <h1 className="gradient-title text-3xl md:text-4xl font-black mt-1 pb-1">
          So sánh chiến lược
        </h1>
        <p className="text-sm text-text-muted mt-1">
          So sánh trực quan Keyword · Semantic · Hybrid cho cùng một câu hỏi
        </p>
      </motion.div>

      {/* Search */}
      <div className="glass-bright rounded-3xl p-4 neon-border space-y-3">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-sky-400/50 pointer-events-none">
              <GitBranch className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void runAll(query)}
              placeholder="Nhập câu hỏi để so sánh tất cả chế độ..."
              className="input-ai"
              style={{ paddingLeft: '3.2rem' }}
            />
          </div>
          <button
            onClick={() => void runAll(query)}
            disabled={isAllLoading || !query.trim()}
            className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isAllLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitBranch className="w-4 h-4" />}
            So sánh
          </button>
        </div>

        {/* Killer queries */}
        <div className="flex flex-wrap gap-2">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest self-center">
            Gợi ý:
          </span>
          {KILLER_QUERIES.map((q) => (
            <button
              key={q}
              onClick={() => { setQuery(q); void runAll(q); }}
              className="text-xs px-3 py-1.5 rounded-xl border transition-all text-left"
              style={{ 
                background: "var(--color-surface-2)", 
                borderColor: "var(--color-border)",
                color: "var(--color-text-muted)"
              }}
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-400/10 border border-rose-400/20 text-xs text-rose-400">
          {error}
        </div>
      )}

      {/* Three-column comparison */}
      <div className="grid gap-4 md:grid-cols-3">
        {(["keyword", "semantic", "hybrid"] as CompareMode[]).map((mode) => {
          const cfg = MODE_LABELS[mode];
          const modeResult = results[mode];
          const isLoading = loading[mode];

          return (
            <div key={mode} className="glass rounded-2xl overflow-hidden flex flex-col">
              {/* Mode header */}
              <div
                className={`flex items-center gap-2 p-4 border-b ${
                  mode === "keyword" ? "bg-amber-400/5" :
                  mode === "semantic" ? "bg-sky-400/5" : "bg-purple-400/5"
                }`}
                style={{ borderColor: "var(--color-border)" }}
              >
                <span className={cfg.color}>{cfg.icon}</span>
                <div>
                  <p className={`text-sm font-black ${cfg.color}`}>{cfg.label}</p>
                  <p className="text-[10px] text-text-muted">{cfg.description}</p>
                </div>
                {modeResult && (
                  <div className="ml-auto text-right">
                    <p className="text-xs font-black" style={{ color: "var(--color-text)" }}>{modeResult.total_results}</p>
                    <p className="text-[10px] text-text-muted">results</p>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 p-3 space-y-2 min-h-[300px]">
                {isLoading && (
                  <div className="flex items-center justify-center h-40 gap-2">
                    <div className="spinner" />
                    <span className="text-xs text-text-muted">Đang tìm kiếm...</span>
                  </div>
                )}
                {!isLoading && !modeResult && (
                  <div className="flex items-center justify-center h-40 text-text-muted text-xs italic">
                    Nhập câu hỏi để xem kết quả
                  </div>
                )}
                <AnimatePresence>
                  {modeResult?.results.map((r, i) => (
                    <motion.div
                      key={r.chunk_id ?? `${r.rank}-${r.title}`}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-start gap-2 p-3 rounded-xl border transition-all"
                      style={{ background: "var(--color-surface-2)", borderColor: "var(--color-border)" }}
                    >
                      <span
                        className={`flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black ${
                          i === 0 ? "bg-amber-400/15 text-amber-400" : "text-text-muted"
                        }`}
                        style={i !== 0 ? { background: "var(--color-surface-3)" } : {}}
                      >
                        {r.rank}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate" style={{ color: "var(--color-text)" }}>{r.title}</p>
                        <p className="text-[10px] text-text-muted mt-0.5">{r.author}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="score-bar flex-1">
                            <div
                              className={`score-bar-fill ${
                                mode === "keyword" ? "!bg-gradient-to-r !from-amber-500 !to-amber-400" :
                                mode === "semantic" ? "!bg-gradient-to-r !from-sky-500 !to-sky-400" :
                                "!bg-gradient-to-r !from-purple-500 !to-purple-400"
                              }`}
                              style={{ width: `${r.score * 100}%` }}
                            />
                          </div>
                          <span className={`text-[10px] font-black mono ${cfg.color}`}>
                            {mode === "keyword" ? r.score.toFixed(2) : `${(r.score * 100).toFixed(0)}%`}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Footer stats */}
              {modeResult && (
                <div className="px-3 pb-3">
                  <div className="flex items-center justify-between p-2.5 rounded-xl border" style={{ background: "var(--color-surface-2)", borderColor: "var(--color-border)" }}>
                    <span className="text-[10px] text-text-muted">Thời gian</span>
                    <span className={`text-xs font-black mono ${cfg.color}`}>
                      {modeResult.processing_time_ms.toFixed(0)}ms
                    </span>
                    <ArrowRight className="w-3 h-3 text-text-muted" />
                    <span className="text-[10px] text-text-muted">Top 1:</span>
                    <span className={`text-xs font-black mono ${cfg.color}`}>
                      {modeResult.results[0]
                        ? (mode === "keyword"
                            ? modeResult.results[0].score.toFixed(2)
                            : `${(modeResult.results[0].score * 100).toFixed(0)}%`)
                        : "N/A"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
