import { motion } from "framer-motion";
import type { FilterOptions } from "../types";
import { SlidersHorizontal, Hash } from "lucide-react";

interface Props {
  filters: FilterOptions;
  category: string;
  language: string;
  limit: number;
  onCategoryChange: (c: string) => void;
  onLanguageChange: (l: string) => void;
  onLimitChange: (n: number) => void;
}

const LANG_LABELS: Record<string, string> = {
  vi: "🇻🇳 Tiếng Việt",
  en: "🇬🇧 English",
};

const LIMIT_OPTIONS = [3, 5, 10, 15, 20];

export default function FilterPanel({
  filters,
  category,
  language,
  limit,
  onCategoryChange,
  onLanguageChange,
  onLimitChange,
}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="glass rounded-2xl p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <SlidersHorizontal className="w-4 h-4 text-text-muted" />
        <p className="text-xs font-bold uppercase tracking-widest text-text-muted">Bộ lọc</p>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        {/* Category */}
        <div className="flex flex-col gap-1.5 min-w-[160px]">
          <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
            Thể loại
          </label>
          <select
            id="filter-category"
            value={category}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="input-ai select-ai py-2 text-sm"
          >
            <option value="">Tất cả thể loại</option>
            {filters.categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Language */}
        <div className="flex flex-col gap-1.5 min-w-[140px]">
          <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
            Ngôn ngữ
          </label>
          <select
            id="filter-language"
            value={language}
            onChange={(e) => onLanguageChange(e.target.value)}
            className="input-ai select-ai py-2 text-sm"
          >
            <option value="">Tất cả ngôn ngữ</option>
            {filters.languages.map((l) => (
              <option key={l} value={l}>
                {LANG_LABELS[l] ?? l}
              </option>
            ))}
          </select>
        </div>

        {/* Top K */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted flex items-center gap-1">
            <Hash className="w-3 h-3" /> Top K
          </label>
          <div className="flex gap-1">
            {LIMIT_OPTIONS.map((n) => (
              <button
                key={n}
                onClick={() => onLimitChange(n)}
                className={`w-9 h-9 rounded-xl text-sm font-bold transition-all ${
                  limit === n
                    ? "bg-sky-500/20 border border-sky-400/30 text-sky-400"
                    : "bg-white/5 border border-white/8 text-text-muted hover:text-sky-400 hover:border-sky-400/30"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Active filters indicator */}
        {(category || language) && (
          <div className="flex items-center gap-2 ml-auto">
            {category && (
              <span className="badge badge-cyan flex items-center gap-1">
                {category}
                <button onClick={() => onCategoryChange("")} className="hover:text-rose-400 ml-1">×</button>
              </span>
            )}
            {language && (
              <span className="badge badge-green flex items-center gap-1">
                {LANG_LABELS[language] ?? language}
                <button onClick={() => onLanguageChange("")} className="hover:text-rose-400 ml-1">×</button>
              </span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
