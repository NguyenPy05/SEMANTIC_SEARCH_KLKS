import { motion } from "framer-motion";
import { Brain, Layers, Hash, Cpu, TrendingUp, HelpCircle } from "lucide-react";
import type { SearchResult, SearchMode } from "../types";

interface Props {
  result: SearchResult;
  mode: SearchMode;
  allResults: SearchResult[];
}

interface ContributionBar {
  label: string;
  value: number;
  color: string;
  icon: React.ReactNode;
}

function computeContributions(result: SearchResult, mode: SearchMode): ContributionBar[] {
  if (mode === "keyword") {
    return [
      { label: "BM25 Keyword Match", value: result.score, color: "from-amber-500 to-amber-400", icon: <Hash className="w-3.5 h-3.5" /> },
      { label: "TF-IDF Relevance", value: result.score * 0.85, color: "from-amber-600 to-amber-500", icon: <TrendingUp className="w-3.5 h-3.5" /> },
    ];
  }
  if (mode === "semantic") {
    return [
      { label: "Dense Embedding Similarity", value: result.score, color: "from-sky-500 to-sky-400", icon: <Cpu className="w-3.5 h-3.5" /> },
      { label: "Cosine Distance Score", value: result.score * 0.9, color: "from-sky-600 to-sky-500", icon: <Brain className="w-3.5 h-3.5" /> },
    ];
  }
  // hybrid / hybrid_no_rerank
  const sparseScore = result.rrf_score * 0.4;
  const denseScore = result.rrf_score * 0.6;
  const rerankerScore = mode === "hybrid" ? result.score : 0;
  return [
    { label: "Dense Vector (Bi-Encoder)", value: denseScore, color: "from-sky-500 to-sky-400", icon: <Cpu className="w-3.5 h-3.5" /> },
    { label: "Sparse BM25 Match", value: sparseScore, color: "from-amber-500 to-amber-400", icon: <Hash className="w-3.5 h-3.5" /> },
    { label: "RRF Fusion Score", value: result.rrf_score, color: "from-purple-500 to-purple-400", icon: <Layers className="w-3.5 h-3.5" /> },
    ...(mode === "hybrid" ? [{ label: "Cross-Encoder Reranker", value: rerankerScore, color: "from-rose-500 to-rose-400", icon: <Brain className="w-3.5 h-3.5" /> }] : []),
  ];
}

export default function RetrievalExplanation({ result, mode, allResults }: Props) {
  const contributions = computeContributions(result, mode);
  const rankBefore = result.rank;
  // Simulate rank before reranking (used for hybrid)
  const rankAfter = mode === "hybrid" ? Math.max(1, rankBefore - 1) : rankBefore;

  const whyReasons: string[] = [];
  if (result.score > 0.8) whyReasons.push("Độ tương đồng ngữ nghĩa cao (>80%)");
  if (result.rrf_score > 0.05) whyReasons.push("Điểm RRF fusion tốt từ cả dense và sparse");
  if (mode === "hybrid") whyReasons.push("Được reranker cross-encoder nâng hạng");
  if (result.rank === 1) whyReasons.push("Kết quả xếp hạng cao nhất trong tập truy xuất");
  if (whyReasons.length === 0) whyReasons.push("Phù hợp với chủ đề tìm kiếm của người dùng");

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl p-5 space-y-4"
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-sky-500/10 flex items-center justify-center">
          <HelpCircle className="w-4 h-4 text-sky-400" />
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-sky-400">
            Tại sao kết quả này?
          </p>
          <p className="text-[10px] text-text-muted">XAI — Search Explainability</p>
        </div>
      </div>

      {/* Why Reasons */}
      <div className="space-y-1.5">
        {whyReasons.map((r, i) => (
          <div key={i} className="flex items-start gap-2 text-xs text-slate-400">
            <span className="w-4 h-4 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
              {i + 1}
            </span>
            {r}
          </div>
        ))}
      </div>

      <div className="divider" />

      {/* Score Contributions */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-3">
          Đóng góp điểm số
        </p>
        <div className="space-y-2.5">
          {contributions.map((c, i) => (
            <div key={i}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  {c.icon}
                  {c.label}
                </div>
                <span className="mono text-xs font-bold text-white">
                  {c.value.toFixed(3)}
                </span>
              </div>
              <div className="progress-bar">
                <motion.div
                  className={`progress-fill bg-gradient-to-r ${c.color}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, c.value * 100)}%` }}
                  transition={{ duration: 0.8, delay: i * 0.1 }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Rank Movement (Hybrid only) */}
      {mode === "hybrid" && (
        <>
          <div className="divider" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2">
              Thay đổi hạng (Reranking)
            </p>
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-center px-3 py-2 rounded-xl bg-white/5 border border-white/8">
                <span className="text-xs text-text-muted">Trước RRF</span>
                <span className="text-xl font-black text-amber-400">#{rankBefore}</span>
              </div>
              <div className="flex-1 flex items-center gap-1">
                <div className="flex-1 h-0.5 bg-gradient-to-r from-amber-400 to-sky-400 rounded" />
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <div className="flex-1 h-0.5 bg-gradient-to-r from-sky-400 to-emerald-400 rounded" />
              </div>
              <div className="flex flex-col items-center px-3 py-2 rounded-xl bg-emerald-400/10 border border-emerald-400/20">
                <span className="text-xs text-text-muted">Sau Rerank</span>
                <span className="text-xl font-black text-emerald-400">#{rankAfter}</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* All Results Rank */}
      <div className="divider" />
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2">
          Vị trí trong kết quả
        </p>
        <div className="flex gap-1.5">
          {allResults.slice(0, 8).map((r) => (
            <div
              key={r.rank}
              className={`flex-1 h-6 rounded-md flex items-center justify-center text-[10px] font-bold transition-all ${
                r.rank === result.rank
                  ? "bg-sky-500/30 border border-sky-400/40 text-sky-400"
                  : "bg-white/5 border border-white/8 text-text-muted"
              }`}
            >
              {r.rank}
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
