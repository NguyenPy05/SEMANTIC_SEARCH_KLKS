import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, BookOpen, AlertCircle, Hash, Globe,
  Search as SearchIcon, Clock, ChevronDown, ChevronUp, Library, X
} from "lucide-react";
import SearchBar from "../components/SearchBar";
import FilterPanel from "../components/FilterPanel";
import HistoryPanel from "../components/HistoryPanel";
import ResultCard from "../components/ResultCard";
import SearchStats from "../components/SearchStats";
import RetrievalExplanation from "../components/RetrievalExplanation";
import SkeletonList from "../components/SkeletonList";
import { useSearchStore } from "../store/searchStore";
import { useAuthStore } from "../store/authStore";
import { Link } from "react-router-dom";
import {
  searchBooks,
  getFilters,
  getHistory,
  clearHistory,
  getBooks,
} from "../api/axiosClient";
import type { BookDetail, SearchHistoryItem, SearchResult } from "../types";

export default function Search() {
  const store = useSearchStore();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "admin";
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [activeResultKey, setActiveResultKey] = useState<string>("");
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [browseBooks, setBrowseBooks] = useState<BookDetail[]>([]);
  const [browseTotal, setBrowseTotal] = useState(0);
  const [browsing, setBrowsing] = useState(false);

  const loadHistory = async () => {
    if (!isAdmin) return;
    try {
      setHistory(await getHistory());
    } catch {
      /* silent */
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        store.setFilters(await getFilters());
      } catch {
        /* silent */
      }
      await loadHistory();
    };
    void init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const performSearch = async (q: string) => {
    if (!q.trim()) return;
    store.setLoading(true);
    store.setError(null);
    store.setResult(null);
    setActiveResultKey("");
    try {
      const data = await searchBooks({
        q: q.trim(),
        limit: store.limit,
        category: store.category || undefined,
        language: store.language || undefined,
        mode: store.mode,
      });
      store.setResult(data);
      if (data.results.length > 0) {
        setActiveResultKey(buildKey(data.results[0]));
      }
      await loadHistory();
    } catch (e) {
      store.setError(e instanceof Error ? e.message : "Tìm kiếm thất bại");
    } finally {
      store.setLoading(false);
    }
  };

  const handleSearch = () => performSearch(store.query);

  // Fetch all books by filter (when no query)
  const fetchFilteredBooks = async (cat: string, lang: string) => {
    if (!cat && !lang) {
      setBrowseBooks([]);
      setBrowseTotal(0);
      setBrowsing(false);
      return;
    }
    setBrowsing(true);
    store.setResult(null);
    store.setError(null);
    try {
      const res = await getBooks(1, 50, "", cat || undefined, lang || undefined);
      setBrowseBooks(res.books);
      setBrowseTotal(res.total);
    } catch {
      /* silent */
    } finally {
      setBrowsing(false);
    }
  };

  // Auto-browse when filter changes and no query
  useEffect(() => {
    if (!store.query.trim()) {
      void fetchFilteredBooks(store.category, store.language);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.category, store.language]);

  // Handle filter change: clear search results when switching to browse mode
  const handleCategoryChange = (c: string) => {
    store.setCategory(c);
    if (!store.query.trim()) store.setResult(null);
  };
  const handleLanguageChange = (l: string) => {
    store.setLanguage(l);
    if (!store.query.trim()) store.setResult(null);
  };

  const activeResult = useMemo<SearchResult | null>(() => {
    if (!store.result) return null;
    return (
      store.result.results.find((r) => buildKey(r) === activeResultKey) ??
      store.result.results[0] ??
      null
    );
  }, [store.result, activeResultKey]);

  const queryWords = useMemo(
    () =>
      store.query
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length >= 3),
    [store.query]
  );

  const hasResults = (store.result?.total_results ?? 0) > 0;

  return (
    <section className="space-y-5">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative"
      >
        <div className="absolute -left-4 top-0 h-full w-0.5 rounded-full bg-gradient-to-b from-sky-400 via-purple-400 to-transparent" />
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-sky-400 flex items-center gap-2">
          <Sparkles className="w-3 h-3" />
          Semantic Search Engine v5.1
        </p>
        <h1 className="gradient-title text-3xl md:text-4xl font-black mt-1 pb-1">
          Tìm kiếm ngữ nghĩa
        </h1>
        <p className="text-sm text-text-muted mt-1 max-w-xl">
          Hybrid Retrieval · Dense Embedding · BM25 · RRF Fusion · Cross-Encoder Reranking
        </p>
      </motion.div>

      {/* Search Box */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-bright rounded-3xl overflow-hidden neon-border"
      >
        <SearchBar
          query={store.query}
          mode={store.mode}
          isLoading={store.isLoading}
          onQueryChange={store.setQuery}
          onModeChange={store.setMode}
          onSearch={handleSearch}
        />
      </motion.div>

      {/* Filters */}
      <div className="glass rounded-2xl p-1">
        <FilterPanel
          filters={store.filters}
          category={store.category}
          language={store.language}
          limit={store.limit}
          onCategoryChange={handleCategoryChange}
          onLanguageChange={handleLanguageChange}
          onLimitChange={store.setLimit}
        />
      </div>

      {/* History Toggle & Panel */}
      {isAdmin && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-2">
            <button 
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted hover:text-sky-400 transition-colors"
            >
              <Clock className="w-3.5 h-3.5" />
              Lịch sử tìm kiếm
              {showHistory ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            
            {showHistory && history.length > 0 && (
              <button 
                onClick={async () => { await clearHistory(); setHistory([]); }}
                className="text-[9px] font-bold uppercase text-rose-400/60 hover:text-rose-400 transition-colors"
              >
                Xóa tất cả
              </button>
            )}
          </div>

          <AnimatePresence>
            {showHistory && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="glass rounded-2xl p-1">
                  <HistoryPanel
                    history={history}
                    onSelect={(q) => { store.setQuery(q); void performSearch(q); }}
                    onClear={() => {}}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Error */}
      <AnimatePresence>
        {store.error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-start gap-3 p-4 rounded-2xl border border-rose-400/20 bg-rose-400/10"
          >
            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-rose-400">Lỗi tìm kiếm</p>
              <p className="text-xs text-rose-400/70 mt-0.5">{store.error}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading */}
      {store.isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-3"
        >
          <div className="flex items-center gap-3 p-4 glass rounded-2xl">
            <div className="spinner" />
            <div>
              <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
                Đang truy xuất không gian vector...
              </p>
              <p className="text-xs text-text-muted mt-0.5">
                {store.mode === "hybrid" && "Bi-Encoder → BM25 → RRF Fusion → Cross-Encoder Reranking"}
                {store.mode === "semantic" && "Dense Embedding → Cosine Similarity Search"}
                {store.mode === "keyword" && "BM25 Sparse Retrieval → TF-IDF Scoring"}
                {store.mode === "hybrid_no_rerank" && "Dense + Sparse → RRF Fusion (No Reranking)"}
              </p>
            </div>
          </div>
          <SkeletonList count={store.limit} />
        </motion.div>
      )}

      {/* Browse mode: filter without query */}
      {!store.query.trim() && (store.category || store.language) && !store.result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {/* Browse header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Library className="w-4 h-4 text-sky-400" />
              <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
                {browsing ? "Đang tải..." : `${browseTotal} cuốn sách`}
              </p>
              {store.category && (
                <span className="badge badge-cyan flex items-center gap-1">
                  <Hash className="w-2.5 h-2.5" />{store.category}
                  <button onClick={() => handleCategoryChange("")} className="ml-1 hover:text-white">×</button>
                </span>
              )}
              {store.language && (
                <span className="badge badge-green flex items-center gap-1">
                  <Globe className="w-2.5 h-2.5" />{store.language.toUpperCase()}
                  <button onClick={() => handleLanguageChange("")} className="ml-1 hover:text-white">×</button>
                </span>
              )}
            </div>
            <button
              onClick={() => { handleCategoryChange(""); handleLanguageChange(""); }}
              className="flex items-center gap-1 text-xs text-text-muted hover:text-rose-400 transition-colors"
            >
              <X className="w-3 h-3" /> Xóa bộ lọc
            </button>
          </div>

          {browsing && <SkeletonList count={6} />}

          {!browsing && browseBooks.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence>
                {browseBooks.map((book, i) => (
                  <motion.div
                    key={book.book_id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="glass-card rounded-2xl p-4 flex flex-col gap-3 hover:neon-border transition-all duration-300"
                  >
                    {/* Cover placeholder */}
                    <div className="w-full h-16 rounded-xl bg-gradient-to-br from-sky-500/10 to-purple-500/10 border border-white/8 flex items-center justify-center">
                      <BookOpen className="w-7 h-7 text-sky-400/30" />
                    </div>

                    {/* Title & Author */}
                    <div className="flex-1 space-y-1">
                      <h3 className="font-black text-sm line-clamp-2 leading-tight" style={{ color: "var(--color-text)" }}>
                        {book.title}
                      </h3>
                      <p className="text-xs text-text-muted">
                        {book.author}
                        {book.year && <span className="ml-2 text-amber-400/70">· {book.year}</span>}
                      </p>
                      {book.summary && (
                        <p className="text-[11px] text-text-muted leading-relaxed line-clamp-3 mt-1 pt-1 border-t" style={{ borderColor: "var(--color-border)" }}>
                          {book.summary}
                        </p>
                      )}
                    </div>

                    {/* Badges */}
                    <div className="flex gap-1 flex-wrap">
                      <span className="badge badge-cyan">{book.category}</span>
                      <span className="badge badge-green">{book.language.toUpperCase()}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Link to={`/library/${book.book_id}`} className="flex-1 text-center py-1.5 rounded-lg text-xs font-bold text-text-muted border hover:text-sky-400 transition-all" style={{ borderColor: "var(--color-border)" }}>Chi tiết</Link>
                      <Link to={`/library/${book.book_id}/read`} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-bold text-sky-400 border border-sky-400/20 bg-sky-500/10 hover:bg-sky-500/20 transition-all">
                        <BookOpen className="w-3 h-3" />Đọc
                      </Link>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {!browsing && browseBooks.length === 0 && (
            <div className="flex flex-col items-center py-16 glass rounded-3xl text-center">
              <Library className="w-12 h-12 text-text-muted mb-4 opacity-20" />
              <p className="text-slate-400 font-bold">Không tìm thấy sách phù hợp</p>
            </div>
          )}
        </motion.div>
      )}

      {/* Empty State - only when no filter active */}
      {!store.isLoading && !store.result && !store.error && !store.category && !store.language && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="w-20 h-20 rounded-3xl bg-sky-500/10 border border-sky-400/20 flex items-center justify-center mb-5 animate-float">
            <SearchIcon className="w-10 h-10 text-sky-400/50" />
          </div>
          <h2 className="text-lg font-bold text-slate-400 mb-2">
            Bắt đầu tìm kiếm
          </h2>
          <p className="text-sm text-text-muted max-w-md">
            Nhập câu hỏi, chủ đề, tên sách hoặc tác giả để tìm kiếm bằng
            ngữ nghĩa AI
          </p>
          <div className="flex gap-2 mt-6 flex-wrap justify-center">
            {["Triết học hiện đại", "Machine Learning", "Văn học Việt Nam"].map((t) => (
              <button
                key={t}
                onClick={() => { store.setQuery(t); void performSearch(t); }}
                className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-text-muted hover:text-sky-500 hover:border-sky-400/30 transition-all shadow-sm"
              >
                {t}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* No Results */}
      {!store.isLoading && store.result && !hasResults && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-400/20 flex items-center justify-center mb-4">
            <BookOpen className="w-8 h-8 text-rose-400/50" />
          </div>
          <h2 className="text-base font-bold text-slate-400 mb-1">
            Không tìm thấy kết quả
          </h2>
          <p className="text-sm text-text-muted">
            Thử tìm với từ khóa khác hoặc chuyển sang chế độ Semantic
          </p>
        </motion.div>
      )}

      {/* Results */}
      {!store.isLoading && hasResults && store.result && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          {/* Stats */}
          <SearchStats result={store.result} mode={store.mode} />

          {/* Two-col layout */}
          <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
            {/* Result List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-widest text-text-muted">
                  {store.result.total_results} kết quả
                </p>
              </div>

              <AnimatePresence>
                {store.result.results.map((r) => (
                  <ResultCard
                    key={buildKey(r)}
                    result={r}
                    queryWords={queryWords}
                    mode={store.mode}
                    isActive={buildKey(r) === activeResultKey}
                    onClick={() => setActiveResultKey(buildKey(r))}
                  />
                ))}
              </AnimatePresence>
            </div>

            {/* Right Panel: Detail + XAI */}
            <aside className="space-y-4 xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto">
              {activeResult && (
                <>
                  {/* Book Detail Panel */}
                  <motion.div
                    key={activeResultKey}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="glass-bright rounded-2xl p-5 space-y-4 neon-border shadow-xl"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
                          Tài liệu được chọn
                        </p>
                        <h2 className="text-lg font-black mt-1 leading-tight" style={{ color: "var(--color-text)" }}>
                          {activeResult.title}
                        </h2>
                        <p className="text-sm text-text-muted mt-0.5">
                          {activeResult.author}
                          {activeResult.year && ` · ${activeResult.year}`}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: "Thể loại", value: activeResult.category },
                        { label: "Ngôn ngữ", value: activeResult.language.toUpperCase() },
                        { label: "Hạng", value: `#${activeResult.rank}` },
                      ].map((m) => (
                        <div key={m.label} className="p-2.5 rounded-xl bg-white/[0.04] border border-white/8 text-center">
                          <p className="text-[9px] font-bold uppercase tracking-widest text-text-muted">{m.label}</p>
                          <p className="text-xs font-black mt-1 truncate" style={{ color: "var(--color-text)" }}>{m.value}</p>
                        </div>
                      ))}
                    </div>

                    {activeResult.summary && (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2">
                          Tóm tắt
                        </p>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          {activeResult.summary}
                        </p>
                      </div>
                    )}

                    {/* Score display */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2.5 rounded-xl bg-sky-500/8 border border-sky-400/20">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-sky-400/70">
                          {store.mode === "keyword" ? "BM25 Score" : "AI Score"}
                        </p>
                        <p className="text-xl font-black text-sky-400 mono">
                          {store.mode === "keyword"
                            ? activeResult.score.toFixed(2)
                            : `${(activeResult.score * 100).toFixed(1)}%`}
                        </p>
                      </div>
                      {activeResult.rrf_score > 0 && (
                        <div className="p-2.5 rounded-xl bg-purple-500/8 border border-purple-400/20">
                          <p className="text-[9px] font-bold uppercase tracking-widest text-purple-400/70">RRF Score</p>
                          <p className="text-xl font-black text-purple-400 mono">{activeResult.rrf_score.toFixed(4)}</p>
                        </div>
                      )}
                    </div>

                    {activeResult.book_id && (
                      <div className="flex gap-2 pt-1">
                        <a
                          href={`/library/${activeResult.book_id}/read`}
                          className="flex-1 btn-primary justify-center text-xs py-2.5"
                        >
                          <BookOpen className="w-4 h-4" />
                          Đọc sách
                        </a>
                        <a
                          href={`/library/${activeResult.book_id}`}
                          className="btn-ghost border border-border-bright text-xs py-2.5 px-4"
                        >
                          Chi tiết
                        </a>
                      </div>
                    )}
                  </motion.div>

                  {/* XAI Explanation */}
                  <RetrievalExplanation
                    result={activeResult}
                    mode={store.mode}
                    allResults={store.result?.results ?? []}
                  />
                </>
              )}
            </aside>
          </div>
        </motion.div>
      )}
    </section>
  );
}

function buildKey(r: SearchResult): string {
  return `${r.chunk_id ?? r.title}-${r.rank}`;
}
