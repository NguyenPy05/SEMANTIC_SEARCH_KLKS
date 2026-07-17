import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Library, Search, BookOpen, Hash, Globe, 
  Calendar, ChevronLeft, ChevronRight 
} from "lucide-react";
import { Link } from "react-router-dom";
import { getBooks, getFilters } from "../api/axiosClient";
import type { BookDetail } from "../types";

export default function LibraryPage() {
  const [books, setBooks] = useState<BookDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedCat, setSelectedCat] = useState("");
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 12;
  
  const [categories, setCategories] = useState<string[]>([]);

  // Fetch categories once
  useEffect(() => {
    getFilters().then(f => setCategories(f.categories)).catch(console.error);
  }, []);

  // Fetch books when page or filters change
  useEffect(() => {
    const fetchBooks = async () => {
      setLoading(true);
      try {
        const res = await getBooks(page, limit, query, selectedCat);
        setBooks(res.books);
        setTotal(res.total);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchBooks, 300); // Debounce search
    return () => clearTimeout(timer);
  }, [page, query, selectedCat]);

  const totalPages = Math.ceil(total / limit);

  const handlePageChange = (p: number) => {
    if (p < 1 || p > totalPages) return;
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <section className="space-y-5 pb-10">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="relative">
        <div className="absolute -left-4 top-0 h-full w-0.5 rounded-full bg-gradient-to-b from-purple-400 to-transparent" />
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-purple-400">
          Book Library
        </p>
        <h1 className="gradient-title text-3xl md:text-4xl font-black mt-1 pb-1">
          Thư viện sách
        </h1>
        <p className="text-sm text-text-muted mt-1">
          {total} cuốn sách · Trang {page} / {totalPages || 1}
        </p>
      </motion.div>

      {/* Search + Filter */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px] flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            placeholder="Tìm theo tiêu đề, tác giả..."
            className="input-ai pl-4 py-2.5 flex-1"
          />
          <button 
            onClick={() => setPage(1)}
            className="btn-primary px-4 flex items-center justify-center"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>
        <select
          value={selectedCat}
          onChange={(e) => { setSelectedCat(e.target.value); setPage(1); }}
          className="input-ai select-ai py-2.5 min-w-[160px] flex-shrink-0"
        >
          <option value="">Tất cả thể loại</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="spinner-lg" />
          <p className="text-xs text-text-muted animate-pulse">Đang tải dữ liệu từ kho sách...</p>
        </div>
      )}

      {/* Books Grid */}
      {!loading && (
        <>
          {books.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center glass rounded-3xl">
              <Library className="w-12 h-12 text-text-muted mb-4 opacity-20" />
              <p className="text-slate-400 font-bold">Không tìm thấy sách phù hợp</p>
              <button onClick={() => {setQuery(""); setSelectedCat("");}} className="text-xs text-sky-400 mt-2 underline">Xóa bộ lọc</button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <AnimatePresence mode="popLayout">
                {books.map((book, i) => (
                  <BookCard key={book.book_id} book={book} index={i} />
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-10">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
                className="p-2 rounded-xl glass hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-5 h-5 text-text" />
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .map((p, i, arr) => (
                    <div key={p} className="flex items-center">
                      {i > 0 && p - arr[i-1] > 1 && <span className="px-2 text-text-muted">...</span>}
                      <button
                        onClick={() => handlePageChange(p)}
                        className={`w-10 h-10 rounded-xl font-bold text-xs transition-all
                          ${page === p 
                            ? "bg-purple-500 text-white shadow-lg shadow-purple-500/20" 
                            : "glass hover:bg-white/10 text-text-muted"}`}
                      >
                        {p}
                      </button>
                    </div>
                  ))}
              </div>

              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page === totalPages}
                className="p-2 rounded-xl glass hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="w-5 h-5 text-text" />
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function BookCard({ book, index }: { book: BookDetail; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="glass-card rounded-2xl p-5 flex flex-col gap-3 group hover:neon-border transition-all duration-300"
    >
      {/* Cover placeholder */}
      <div className="w-full h-24 rounded-xl bg-surface-2 border border-border-bright flex items-center justify-center relative overflow-hidden">
        <BookOpen className="w-10 h-10 text-sky-400/30" />
        <div className="absolute inset-0 bg-gradient-to-br from-sky-500/5 to-transparent" />
      </div>

      <div className="flex-1 space-y-2">
        <h2 className="font-black text-sm text-text line-clamp-2 group-hover:text-sky-300 transition-colors leading-tight">
          {book.title}
        </h2>
        <p className="text-xs text-text-muted">{book.author}</p>
        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{book.summary}</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <span className="badge badge-cyan flex items-center gap-1">
          <Hash className="w-2.5 h-2.5" />{book.category}
        </span>
        <span className="badge badge-green flex items-center gap-1">
          <Globe className="w-2.5 h-2.5" />{book.language.toUpperCase()}
        </span>
        {book.year && (
          <span className="badge badge-amber flex items-center gap-1">
            <Calendar className="w-2.5 h-2.5" />{book.year}
          </span>
        )}
      </div>

      <div className="flex gap-2 pt-1">
        <Link
          to={`/library/${book.book_id}`}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-surface-2 border border-border-bright text-xs font-bold text-text-muted hover:text-accent hover:border-accent/50 transition-all"
        >
          Chi tiết
        </Link>
        <Link
          to={`/library/${book.book_id}/read`}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-sky-500/10 border border-sky-400/20 text-xs font-bold text-sky-400 hover:bg-sky-500/20 transition-all"
        >
          <BookOpen className="w-3.5 h-3.5" />
          Đọc
        </Link>
      </div>
    </motion.div>
  );
}
