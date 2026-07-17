import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, ChevronDown, ChevronUp, ExternalLink, BookOpen, Hash, Cpu, Layers } from "lucide-react";
import { Link } from "react-router-dom";
import type { SearchResult, SearchMode } from "../types";

interface Props {
  result: SearchResult;
  queryWords: string[];
  mode: SearchMode;
  isActive?: boolean;
  onClick?: () => void;
}

const LANG_LABELS: Record<string, string> = {
  vi: "🇻🇳 Tiếng Việt",
  en: "🇬🇧 English",
};

function highlightText(text: string, words: string[]): React.ReactNode {
  if (!words.length || !text) return text;
  const escaped = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const regex = new RegExp(`(${escaped.join("|")})`, "gi");
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="highlight">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

function ScoreBadge({ value, label, color }: { value: number; label: string; color: string }) {
  const pct = Math.round(value * 100);
  return (
    <div className={`flex flex-col items-center px-2 py-1.5 rounded-lg bg-white/5 border border-white/8 min-w-[60px]`}>
      <span className={`text-base font-black ${color} mono`}>{pct}%</span>
      <span className="text-[9px] font-bold uppercase tracking-widest text-text-muted mt-0.5">{label}</span>
    </div>
  );
}

function RetrievalSource({ mode }: { mode: SearchMode }) {
  const labels: Record<SearchMode, { icon: React.ReactNode; text: string; color: string }> = {
    keyword: { icon: <Hash className="w-3 h-3" />, text: "BM25 Sparse", color: "badge-amber" },
    semantic: { icon: <Cpu className="w-3 h-3" />, text: "Dense Vector", color: "badge-cyan" },
    hybrid: { icon: <Layers className="w-3 h-3" />, text: "Hybrid + Reranker", color: "badge-purple" },
    hybrid_no_rerank: { icon: <Layers className="w-3 h-3" />, text: "Hybrid Fusion (RRF)", color: "badge-green" },
  };
  const cfg = labels[mode];
  return (
    <span className={`badge ${cfg.color} flex items-center gap-1`}>
      {cfg.icon} {cfg.text}
    </span>
  );
}

export default function ResultCard({ result, queryWords, mode, isActive, onClick }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      await navigator.clipboard.writeText(result.text_snippet || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    },
    [result.text_snippet]
  );

  const handleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded((v) => !v);
  };

  const rankColors = ["text-amber-400", "text-slate-300", "text-amber-600"];
  const rankColor = result.rank <= 3 ? rankColors[result.rank - 1] : "text-text-muted";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: result.rank * 0.06 }}
      onClick={onClick}
      className={`result-card cursor-pointer ${isActive ? "active" : ""}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Rank */}
          <div
            className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black border ${
              isActive
                ? "border-sky-400/40 bg-sky-400/10 text-sky-400"
                : "border-white/10 bg-white/5 " + rankColor
            }`}
          >
            {result.rank}
          </div>

          {/* Title */}
          <div className="min-w-0">
            <h3 className="font-bold text-sm leading-tight transition-colors" style={{ color: isActive ? "var(--color-accent)" : "var(--color-text)" }}>
              {result.title}
            </h3>
            <p className="text-xs text-text-muted mt-0.5">{result.author}</p>
          </div>
        </div>

        {/* Scores */}
        <div className="flex gap-2 flex-shrink-0">
          <ScoreBadge value={result.score} label="Score" color="text-sky-400" />
          {result.rrf_score > 0 && (
            <ScoreBadge value={result.rrf_score} label="RRF" color="text-purple-400" />
          )}
        </div>
      </div>

      {/* Score Bar */}
      <div className="score-bar mb-3">
        <motion.div
          className="score-bar-fill"
          initial={{ width: 0 }}
          animate={{ width: `${result.score * 100}%` }}
          transition={{ duration: 0.8, delay: result.rank * 0.06 + 0.2, ease: "easeOut" }}
        />
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        <span className="badge badge-cyan">{result.category}</span>
        <span className="badge badge-green">{LANG_LABELS[result.language] ?? result.language}</span>
        {result.year && <span className="badge badge-amber">{result.year}</span>}
        <RetrievalSource mode={mode} />
        {result.chunk_id && (
          <span className="badge badge-purple mono text-[9px]">
            chunk:{result.chunk_id.slice(-8)}
          </span>
        )}
      </div>

      {/* Summary */}
      {result.summary && (
        <p className="text-xs leading-relaxed mb-3 line-clamp-2" style={{ color: "var(--color-text-muted)" }}>
          {result.summary}
        </p>
      )}

      {/* Snippet */}
      <AnimatePresence>
        <motion.div
          className={`relative rounded-xl border border-white/8 bg-white/[0.03] p-3 text-xs leading-relaxed italic ${
            !expanded ? "line-clamp-3" : ""
          }`}
          style={{ color: "var(--color-text-muted)" }}
        >
          <div className="absolute top-2 right-2 flex gap-1">
            <button
              onClick={handleCopy}
              className="p-1 rounded hover:bg-white/10 text-text-muted hover:text-sky-400 transition-all"
              title="Copy snippet"
            >
              <Copy className="w-3 h-3" />
            </button>
          </div>
          <span className="text-text-muted mr-1">"</span>
          {highlightText(result.text_snippet, queryWords)}
          <span className="text-text-muted ml-1">"</span>
          {copied && (
            <span className="absolute bottom-2 right-2 text-[10px] text-emerald-400 font-bold">
              Copied!
            </span>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Actions */}
      <div className="flex items-center justify-between mt-3">
        <button
          onClick={handleExpand}
          className="flex items-center gap-1 text-[11px] text-text-muted hover:text-sky-400 transition-colors"
        >
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {expanded ? "Thu gọn" : "Xem thêm"}
        </button>

        <div className="flex gap-2">
          {result.book_id && (
            <>
              <Link
                to={`/library/${result.book_id}`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg border border-border-bright text-text-muted hover:text-sky-400 hover:border-sky-400/30 transition-all"
              >
                <ExternalLink className="w-3 h-3" />
                Chi tiết
              </Link>
              <Link
                to={`/library/${result.book_id}/read`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 hover:bg-sky-500/20 transition-all"
              >
                <BookOpen className="w-3 h-3" />
                Đọc sách
              </Link>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
