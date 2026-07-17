import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ChevronLeft, ChevronRight, BookOpen,
  Search, Loader2
} from "lucide-react";
import { getBookContent, getBookDetail } from "../api/axiosClient";
import type { BookContentResponse, BookDetail } from "../types";


export default function BookReader() {
  const { bookId } = useParams<{ bookId: string }>();
  const [book, setBook] = useState<BookDetail | null>(null);
  const [content, setContent] = useState<BookContentResponse | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");

  const loadPage = useCallback(
    async (p: number) => {
      if (!bookId) return;
      setLoading(true);
      try {
        setContent(await getBookContent(bookId, p));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    },
    [bookId]
  );

  useEffect(() => {
    if (!bookId) return;
    Promise.all([getBookDetail(bookId), getBookContent(bookId, 1)])
      .then(([b, c]) => {
        setBook(b);
        setContent(c);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [bookId]);

  const handlePage = (p: number) => {
    if (!content) return;
    if (p < 1 || p > content.total_pages) return;
    setPage(p);
    void loadPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const highlight = (text: string) => {
    if (!searchText.trim()) return text;
    const re = new RegExp(`(${searchText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    return text.replace(re, '<mark class="highlight">$1</mark>');
  };

  return (
    <section className="space-y-5 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          to={bookId ? `/library/${bookId}` : "/library"}
          className="btn-ghost"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-sky-400">Đọc sách</p>
          <h1 className="text-base font-black truncate" style={{ color: "var(--color-text)" }}>{book?.title ?? "..."}</h1>
        </div>
        <BookOpen className="w-5 h-5 text-text-muted" />
      </div>

      {/* Search inside book */}
      <div className="relative">
        <input
          type="text"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="Tìm kiếm trong sách..."
          className="input-ai pl-4 py-2.5"
        />
      </div>

      {/* Page info */}
      {content && (
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-widest text-text-muted">
            Trang {content.page} / {content.total_pages}
          </p>
          <div className="progress-bar w-48">
            <div
              className="progress-fill bg-gradient-to-r from-sky-500 to-purple-500"
              style={{ width: `${(content.page / content.total_pages) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-16">
          <div className="spinner-lg" />
        </div>
      )}

      {/* Content */}
      {!loading && content && (
        <AnimatePresence mode="wait">
          <motion.div
            key={page}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass rounded-2xl p-6 space-y-5"
          >
            {content.content.map((para, i) => (
              <p
                key={i}
                className="text-sm leading-7"
                style={{ color: "var(--color-text)" }}
                dangerouslySetInnerHTML={{ __html: highlight(para) }}
              />
            ))}
            {content.content.length === 0 && (
              <p className="text-center text-text-muted italic text-sm">
                Không có nội dung ở trang này.
              </p>
            )}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Pagination */}
      {content && content.total_pages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => handlePage(page - 1)}
            disabled={page <= 1}
            className="btn-ghost border border-border-bright disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex gap-1">
            {Array.from({ length: Math.min(7, content.total_pages) }, (_, i) => {
              let p: number;
              if (content.total_pages <= 7) {
                p = i + 1;
              } else if (page <= 4) {
                p = i + 1;
              } else if (page >= content.total_pages - 3) {
                p = content.total_pages - 6 + i;
              } else {
                p = page - 3 + i;
              }
              return (
                <button
                  key={p}
                  onClick={() => handlePage(p)}
                  className={`w-9 h-9 rounded-lg text-xs font-bold transition-all ${
                    p === page
                      ? "bg-sky-500/20 border border-sky-400/30 text-sky-400"
                      : "text-text-muted hover:text-sky-400"
                  }`}
                  style={p !== page ? { background: "var(--color-surface-2)", border: "1px solid var(--color-border)" } : {}}
                >
                  {p}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => handlePage(page + 1)}
            disabled={page >= (content?.total_pages ?? 1)}
            className="btn-ghost border border-border-bright disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
  )
}
    </section >
  );
}
