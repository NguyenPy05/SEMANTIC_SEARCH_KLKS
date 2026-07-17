import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Layers, Brain, Hash, Cpu, TrendingUp, Search, Loader2,
  HelpCircle, BarChart2, ArrowUpDown
} from "lucide-react";
import { searchBooks } from "../api/axiosClient";
import type { SearchResponse, SearchResult } from "../types";

const DEMO_QUERIES = [
  "Sách về trí tuệ nhân tạo",
  "Philosophy and consciousness",
  "Văn học kinh điển Việt Nam",
  "Quantum physics for beginners",
];

function SimilarityHeatmap({ results }: { results: SearchResult[] }) {
  const max = Math.max(...results.map((r) => r.score), 0.01);
  return (
    <div className="space-y-2">
      {results.map((r) => {
        const intensity = r.score / max;
        return (
          <div key={r.rank} className="flex items-center gap-3">
            <span className="text-[10px] mono text-text-muted w-4 flex-shrink-0">#{r.rank}</span>
            <div
              className="flex-1 h-8 rounded-lg flex items-center px-3 transition-all"
              style={{
                background: `rgba(56,189,248,${intensity * 0.25})`,
                border: `1px solid rgba(56,189,248,${intensity * 0.4})`,
              }}
            >
              <span className="text-xs font-bold text-text truncate">{r.title}</span>
            </div>
            <span className="mono text-xs font-black text-sky-400 w-10 text-right flex-shrink-0">
              {(r.score * 100).toFixed(0)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function XAI() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<SearchResult | null>(null);

  const runSearch = async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setResult(null);
    setSelected(null);
    try {
      const data = await searchBooks({ q, limit: 8, mode: "hybrid" });
      setResult(data);
      if (data.results.length) setSelected(data.results[0]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const contributions = selected
    ? [
        { label: "Semantic / Dense Score", value: selected.dense_score, max: 1.0, color: "from-sky-500 to-sky-400", icon: Cpu },
        { label: "Keyword / Sparse Score", value: selected.sparse_score, max: 15.0, color: "from-amber-500 to-amber-400", icon: Hash },
        { label: "RRF Fusion Score", value: selected.rrf_score * 10, max: 1.0, color: "from-purple-500 to-purple-400", icon: Layers },
        { label: "Rerank Confidence", value: selected.score, max: 1.0, color: "from-rose-500 to-rose-400", icon: Brain },
      ]
    : [];

  return (
    <section className="space-y-5">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-purple-400">
          XAI · Explainability Panel
        </p>
        <h1 className="gradient-title text-3xl md:text-4xl font-black mt-1 pb-1">
          Giải thích tìm kiếm
        </h1>
        <p className="text-sm text-text-muted mt-1">
          Hiểu tại sao hệ thống trả về kết quả · Score decomposition · Rank analysis
        </p>
      </motion.div>

      {/* Search */}
      <div className="glass-bright rounded-2xl p-4 space-y-3 neon-border">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void runSearch(query)}
              placeholder="Nhập câu hỏi để xem giải thích XAI..."
              className="input-ai pl-4"
            />
          </div>
          <button
            onClick={() => void runSearch(query)}
            disabled={loading || !query.trim()}
            className="btn-primary disabled:opacity-40"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <HelpCircle className="w-4 h-4" />}
            Phân tích
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {DEMO_QUERIES.map((q) => (
            <button
              key={q}
              onClick={() => { setQuery(q); void runSearch(q); }}
              className="text-xs px-3 py-1.5 rounded-xl bg-white/5 border border-white/8 text-slate-400 hover:text-purple-400 hover:border-purple-400/30 transition-all"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12 gap-3">
          <div className="spinner-lg" />
          <span className="text-sm text-slate-400">Đang phân tích XAI...</span>
        </div>
      )}

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid gap-4 lg:grid-cols-[1fr_380px]"
          >
            {/* Left: Results + Heatmap */}
            <div className="space-y-4">
              {/* Similarity Heatmap */}
              <div className="glass rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-sky-400" />
                  <p className="text-xs font-bold uppercase tracking-widest text-text-muted">
                    Semantic Similarity Heatmap
                  </p>
                </div>
                <SimilarityHeatmap results={result.results} />
              </div>

              {/* Rank list */}
              <div className="glass rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="w-4 h-4 text-purple-400" />
                  <p className="text-xs font-bold uppercase tracking-widest text-text-muted">
                    Kết quả · Click để xem giải thích
                  </p>
                </div>
                <div className="space-y-2">
                  {result.results.map((r) => (
                    <button
                      key={r.rank}
                      onClick={() => setSelected(r)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                        selected?.rank === r.rank
                          ? "border-purple-400/40 bg-purple-400/8"
                          : "border-white/8 bg-white/[0.02] hover:border-white/20"
                      }`}
                    >
                      <span className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black flex-shrink-0 ${
                        selected?.rank === r.rank ? "bg-purple-400/20 text-purple-400" : "bg-white/5 text-text-muted"
                      }`}>
                        {r.rank}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-text truncate">{r.title}</p>
                        <p className="text-[10px] text-text-muted">{r.author}</p>
                      </div>
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="mono text-xs text-sky-400 font-bold">{(r.score * 100).toFixed(0)}%</span>
                        <span className="mono text-[10px] text-purple-400">{(r.rrf_score * 100).toFixed(0)}% RRF</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: XAI Detail */}
            <aside className="space-y-4">
              <AnimatePresence mode="wait">
                {selected && (
                  <motion.div
                    key={selected.rank}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="glass-bright rounded-2xl p-5 space-y-5 neon-border"
                  >
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-purple-400">
                        Giải thích · Hạng #{selected.rank}
                      </p>
                      <h2 className="text-base font-black text-text mt-1">{selected.title}</h2>
                    </div>

                    <div className="divider" />

                    {/* Contributions */}
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-3">
                        Phân tích đóng góp điểm số
                      </p>
                      <div className="space-y-3">
                        {contributions.map((c, i) => (
                          <div key={i}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                <c.icon className="w-3.5 h-3.5" />
                                {c.label}
                              </div>
                              <span className="mono text-xs font-bold text-text">{c.value.toFixed(4)}</span>
                            </div>
                            <div className="progress-bar">
                              <motion.div
                                className={`progress-fill bg-gradient-to-r ${c.color}`}
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(100, Math.max(0, (c.value / c.max) * 100))}%` }}
                                transition={{ delay: i * 0.1, duration: 0.8 }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="divider" />

                    {/* Retrieval Source */}
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-3">
                        Nguồn truy xuất
                      </p>
                      <div className="space-y-2">
                        {[
                          { label: "Dense Retrieval (Bi-Encoder)", active: true, icon: Cpu, color: "text-sky-400" },
                          { label: "Sparse Retrieval (BM25)", active: true, icon: Hash, color: "text-amber-400" },
                          { label: "Hybrid RRF Fusion", active: true, icon: Layers, color: "text-purple-400" },
                          { label: "Cross-Encoder Reranking", active: true, icon: Brain, color: "text-rose-400" },
                        ].map((s) => (
                          <div key={s.label} className={`flex items-center gap-2 p-2 rounded-lg ${s.active ? "bg-white/[0.04] border border-white/8" : "opacity-30"}`}>
                            <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
                            <span className="text-xs text-slate-400">{s.label}</span>
                            {s.active && <span className="ml-auto badge badge-green text-[9px]">Active</span>}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="divider" />

                    {/* Why this result */}
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2">
                        Tại sao kết quả này?
                      </p>
                      <div className="space-y-1.5">
                        {[
                          selected.score > 0.8 && "Độ tương đồng ngữ nghĩa rất cao (>80%)",
                          selected.rrf_score > 0.05 && "Điểm RRF từ cả dense và sparse retrieval",
                          selected.rank === 1 && "Xếp hạng cao nhất sau reranking",
                          "Nội dung phù hợp với ý định tìm kiếm",
                        ].filter(Boolean).map((r, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs text-slate-400">
                            <span className="w-4 h-4 rounded-full bg-purple-400/20 text-purple-400 flex items-center justify-center text-[9px] font-bold flex-shrink-0">
                              {i + 1}
                            </span>
                            {r}
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </aside>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
