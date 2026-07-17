import { motion } from "framer-motion";
import { Zap, Target, Clock, BarChart2 } from "lucide-react";
import type { SearchResponse, SearchMode } from "../types";

interface Props {
  result: SearchResponse;
  mode: SearchMode;
}

const INTENT_MAP: Record<string, string> = {
  summarize: "Tóm tắt nội dung",
  author_search: "Tìm theo tác giả",
  year_search: "Tìm theo năm",
  category_search: "Tìm theo thể loại",
  general_search: "Tìm kiếm tổng quát",
};

const MODE_MAP: Record<SearchMode, string> = {
  keyword: "BM25 Keyword",
  semantic: "Dense Semantic",
  hybrid: "Hybrid + Reranker",
  hybrid_no_rerank: "Hybrid RRF",
};

export default function SearchStats({ result, mode }: Props) {
  const stats = [
    {
      icon: Zap,
      label: "Thời gian",
      value: `${result.processing_time_ms.toFixed(0)}ms`,
      color: "text-sky-400",
      bg: "bg-sky-400/10",
    },
    {
      icon: Target,
      label: "Kết quả",
      value: String(result.total_results),
      color: "text-purple-400",
      bg: "bg-purple-400/10",
    },
    {
      icon: BarChart2,
      label: "Chế độ",
      value: MODE_MAP[mode],
      color: "text-amber-400",
      bg: "bg-amber-400/10",
    },
    {
      icon: Clock,
      label: "Intent",
      value: INTENT_MAP[result.intent] ?? result.intent,
      color: "text-emerald-400",
      bg: "bg-emerald-400/10",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl p-4 space-y-3"
    >
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Query</p>
          <p className="text-sm font-bold mt-0.5" style={{ color: "var(--color-text)" }}>"{result.query}"</p>
        </div>
      </div>

      <div className="divider" />

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center gap-2.5 p-2 rounded-xl bg-white/[0.03] border border-white/5">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${s.bg}`}>
              <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-widest text-text-muted">{s.label}</p>
              <p className={`text-xs font-bold truncate ${s.color}`}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
