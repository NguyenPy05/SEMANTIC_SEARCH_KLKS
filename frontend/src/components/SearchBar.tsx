import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Mic, X, Loader2, Sparkles } from "lucide-react";
import type { SearchMode } from "../types";

const SUGGESTIONS = [
  "Sách về trí tuệ nhân tạo và machine learning",
  "Triết học về ý thức và bản ngã",
  "Lịch sử cuộc cách mạng công nghiệp",
  "Novel về dystopia và tương lai",
  "Kinh tế học hành vi",
  "Books about quantum physics",
  "Văn học hiện đại Việt Nam",
  "Psychology of decision making",
];

const MODE_CONFIG: Record<SearchMode, { label: string; color: string; dot: string }> = {
  keyword: { label: "Keyword", color: "text-amber-400", dot: "bg-amber-400" },
  semantic: { label: "Semantic", color: "text-sky-400", dot: "bg-sky-400" },
  hybrid: { label: "Hybrid AI", color: "text-purple-400", dot: "bg-purple-400" },
  hybrid_no_rerank: { label: "Hybrid (No Rerank)", color: "text-emerald-400", dot: "bg-emerald-400" },
};

interface Props {
  query: string;
  mode: SearchMode;
  isLoading: boolean;
  onQueryChange: (q: string) => void;
  onModeChange: (m: SearchMode) => void;
  onSearch: () => void;
}

export default function SearchBar({
  query,
  mode,
  isLoading,
  onQueryChange,
  onModeChange,
  onSearch,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [placeholder, setPlaceholder] = useState("");
  const placeholderRef = useRef(0);
  const phTarget = "Tìm kiếm sách theo ngữ nghĩa, chủ đề, tác giả...";

  // Typewriter placeholder
  useEffect(() => {
    if (focused) return;
    let i = 0;
    placeholderRef.current = 0;
    const interval = setInterval(() => {
      setPlaceholder(phTarget.slice(0, i));
      i++;
      if (i > phTarget.length) clearInterval(interval);
    }, 40);
    return () => clearInterval(interval);
  }, [focused]);

  const filteredSuggestions = SUGGESTIONS.filter(
    (s) =>
      query.length >= 2 &&
      s.toLowerCase().includes(query.toLowerCase())
  );

  const displaySuggestions =
    query.length < 2 ? SUGGESTIONS.slice(0, 5) : filteredSuggestions;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      setShowSuggestions(false);
      onSearch();
    }
    if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  const handleSelectSuggestion = (s: string) => {
    onQueryChange(s);
    setShowSuggestions(false);
    setTimeout(() => onSearch(), 50);
  };

  const modeInfo = MODE_CONFIG[mode];

  return (
    <div className="relative">
      {/* Mode Pills */}
      <div className="flex gap-1.5 flex-wrap p-3 pb-2">
        {(Object.keys(MODE_CONFIG) as SearchMode[]).map((m) => {
          const cfg = MODE_CONFIG[m];
          const isActive = mode === m;
          return (
            <button
              key={m}
              onClick={() => onModeChange(m)}
              className={`mode-pill text-xs ${isActive ? "active" : ""}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isActive ? cfg.dot : "bg-text-muted"}`} />
              {cfg.label}
            </button>
          );
        })}
      </div>

      {/* Input Row */}
      <div
        className={`flex items-center gap-3 px-4 py-3.5 transition-all duration-300 rounded-2xl ${
          focused
            ? "ring-2 ring-sky-500/30 shadow-[0_0_30px_rgba(56,189,248,0.1)]"
            : ""
        }`}
        style={{
          background: "var(--color-surface)",
          border: focused ? undefined : "1px solid var(--color-border)",
        }}
      >
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-sky-500/10 flex-shrink-0">
          {isLoading ? (
            <Loader2 className="w-5 h-5 text-sky-400 animate-spin" />
          ) : (
            <Search className="w-5 h-5 text-sky-400" />
          )}
        </div>

        <input
          ref={inputRef}
          id="main-search-input"
          type="text"
          value={query}
          placeholder={placeholder}
          onChange={(e) => onQueryChange(e.target.value)}
          onFocus={() => {
            setFocused(true);
            setShowSuggestions(true);
          }}
          onBlur={() => {
            setFocused(false);
            setTimeout(() => setShowSuggestions(false), 200);
          }}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          className="flex-1 bg-transparent text-text text-base font-medium outline-none placeholder:text-text-muted min-w-0"
          autoComplete="off"
          spellCheck={false}
        />

        {/* Active mode badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border" style={{ background: "var(--color-surface-2)", borderColor: "var(--color-border)" }}>
          <span className={`w-1.5 h-1.5 rounded-full ${modeInfo.dot}`} />
          <span className={`text-[11px] font-bold ${modeInfo.color}`}>{modeInfo.label}</span>
        </div>

        {query && (
          <button
            onClick={() => onQueryChange("")}
            className="flex-shrink-0 p-1.5 rounded-lg text-text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <button
          onClick={() => {/* voice placeholder */}}
          className="flex-shrink-0 p-2 rounded-lg text-text-muted hover:text-sky-400 hover:bg-sky-500/10 transition-all"
          title="Voice search"
        >
          <Mic className="w-4 h-4" />
        </button>

        <button
          id="search-submit-btn"
          onClick={() => { setShowSuggestions(false); onSearch(); }}
          disabled={isLoading || !query.trim()}
          className="btn-primary flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          <span className="hidden sm:block">Tìm kiếm</span>
        </button>
      </div>

      {/* Suggestions Dropdown */}
      <AnimatePresence>
        {showSuggestions && displaySuggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 right-0 mt-2 glass-bright rounded-2xl overflow-hidden z-50 border border-border-bright shadow-neon"
          >
            <div className="px-3 py-2 border-b border-border">
              <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
                {query.length < 2 ? "Gợi ý tìm kiếm" : "Kết quả gợi ý"}
              </p>
            </div>
            {displaySuggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => handleSelectSuggestion(s)}
                className="suggestion-item w-full text-left"
              >
                <Search className="w-3.5 h-3.5 flex-shrink-0 text-text-muted" />
                <span>{s}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
