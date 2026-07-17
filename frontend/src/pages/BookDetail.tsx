import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, BookOpen, User, Calendar, Hash, Globe,
  Layers, BarChart3, Play, Loader2, CheckCircle2, XCircle
} from "lucide-react";
import { getBookDetail, evaluateBook } from "../api/axiosClient";
import type { BookDetail, BookEvaluationResponse } from "../types";
import { useAuthStore } from "../store/authStore";

type Tab = "overview" | "content" | "evaluation";

export default function BookDetailPage() {
  const { bookId } = useParams<{ bookId: string }>();
  const [book, setBook] = useState<BookDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");
  const [evalResult, setEvalResult] = useState<BookEvaluationResponse | null>(null);
  const [evalLoading, setEvalLoading] = useState(false);
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (!bookId) return;
    setLoading(true);
    getBookDetail(bookId)
      .then(setBook)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [bookId]);

  const runEval = async () => {
    if (!bookId) return;
    setEvalLoading(true);
    try {
      setEvalResult(await evaluateBook(bookId));
    } catch (e) {
      console.error(e);
    } finally {
      setEvalLoading(false);
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center py-24">
        <div className="spinner-lg" />
      </div>
    );

  if (!book)
    return (
      <div className="flex flex-col items-center py-20">
        <p className="text-slate-400 font-bold">Không tìm thấy sách</p>
        <Link to="/library" className="btn-ghost mt-4">
          <ArrowLeft className="w-4 h-4" /> Quay lại
        </Link>
      </div>
    );

  return (
    <section className="space-y-5">
      {/* Back */}
      <Link to="/library" className="btn-ghost inline-flex">
        <ArrowLeft className="w-4 h-4" /> Thư viện
      </Link>

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-bright rounded-3xl p-6 neon-border"
      >
        <div className="flex flex-col md:flex-row gap-6">
          {/* Cover */}
          <div className="w-full md:w-36 h-48 md:h-auto rounded-2xl bg-gradient-to-br from-sky-500/15 to-purple-500/15 border border-white/8 flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-16 h-16 text-sky-400/40" />
          </div>

          {/* Info */}
          <div className="flex-1 space-y-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-black leading-tight" style={{ color: "var(--color-text)" }}>
                {book.title}
              </h1>
              <p className="text-text-muted mt-1 flex items-center gap-2">
                <User className="w-4 h-4" /> {book.author}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="badge badge-cyan flex items-center gap-1">
                <Hash className="w-3 h-3" /> {book.category}
              </span>
              <span className="badge badge-green flex items-center gap-1">
                <Globe className="w-3 h-3" /> {book.language.toUpperCase()}
              </span>
              {book.year && (
                <span className="badge badge-amber flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> {book.year}
                </span>
              )}
              <span className="badge badge-purple flex items-center gap-1">
                <Layers className="w-3 h-3" /> {book.total_chunks} chunks
              </span>
            </div>

            <p className="text-sm text-slate-400 leading-relaxed">{book.summary}</p>

            <div className="flex gap-3">
              <Link
                to={`/library/${book.book_id}/read`}
                className="btn-primary"
              >
                <BookOpen className="w-4 h-4" /> Đọc sách
              </Link>
              {isAdmin && (
                <button
                  onClick={runEval}
                  disabled={evalLoading}
                  className="btn-ghost border border-purple-400/30 text-purple-400 hover:bg-purple-400/10"
                >
                  {evalLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <BarChart3 className="w-4 h-4" />
                  )}
                  Đánh giá AI
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="tab-bar">
        {(["overview", "content", "evaluation"] as Tab[])
          .filter((t) => t !== "evaluation" || isAdmin)
          .map((t) => (
            <button
              key={t}
              className={`tab-item ${tab === t ? "active" : ""}`}
              onClick={() => setTab(t)}
            >
              {t === "overview" && "Tổng quan"}
              {t === "content" && "Nội dung"}
              {t === "evaluation" && "Đánh giá"}
            </button>
          ))}
      </div>

      {/* Tab Content */}
      <motion.div
        key={tab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {tab === "overview" && (
          <div className="glass rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-black uppercase tracking-widest" style={{ color: "var(--color-text)" }}>Thông tin chi tiết</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Tác giả", value: book.author, icon: User },
                { label: "Thể loại", value: book.category, icon: Hash },
                { label: "Ngôn ngữ", value: book.language.toUpperCase(), icon: Globe },
                { label: "Chunks", value: String(book.total_chunks), icon: Layers },
              ].map((m) => (
                <div key={m.label} className="p-3 rounded-xl border" style={{ background: "var(--color-surface-2)", borderColor: "var(--color-border)" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <m.icon className="w-3.5 h-3.5 text-sky-400" />
                    <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">{m.label}</p>
                  </div>
                  <p className="text-sm font-black truncate" style={{ color: "var(--color-text)" }}>{m.value}</p>
                </div>
              ))}
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2">Tóm tắt đầy đủ</p>
              <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>{book.summary || "Chưa có tóm tắt."}</p>
            </div>
          </div>
        )}

        {tab === "content" && (
          <div className="text-center py-10">
            <Link
              to={`/library/${book.book_id}/read`}
              className="btn-primary inline-flex"
            >
              <Play className="w-4 h-4" /> Mở trình đọc sách
            </Link>
          </div>
        )}

        {tab === "evaluation" && (
          <div className="glass rounded-2xl p-5 space-y-4">
            {!evalResult && !evalLoading && (
              <div className="flex flex-col items-center py-12 text-center">
                <BarChart3 className="w-12 h-12 text-text-muted mb-4" />
                <p className="text-slate-400 font-bold mb-4">Chạy đánh giá AI Retrieval</p>
                <button onClick={runEval} className="btn-primary">
                  <Play className="w-4 h-4" /> Bắt đầu đánh giá
                </button>
              </div>
            )}
            {evalLoading && (
              <div className="flex items-center justify-center py-12 gap-3">
                <div className="spinner" />
                <span className="text-sm text-slate-400">Đang đánh giá...</span>
              </div>
            )}
            {evalResult && <EvalResults data={evalResult} />}
          </div>
        )}
      </motion.div>
    </section>
  );
}

function EvalItem({ r, i }: { r: BookEvaluationResponse["results"][number]; i: number }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--color-border)" }}>
      {/* Header row */}
      <div className="flex items-start gap-3 p-3" style={{ background: "var(--color-surface-2)" }}>
        {r.success ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
        ) : (
          <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-xs font-bold" style={{ color: "var(--color-text)" }}>{r.type}</span>
            <div className="flex items-center gap-2">
              {r.rank > 0 && (
                <span className="text-[10px] text-text-muted mono">Rank #{r.rank}</span>
              )}
              <span className="mono text-xs text-sky-400 font-bold">{(r.score * 100).toFixed(1)}%</span>
            </div>
          </div>
          <p className="text-xs leading-relaxed mt-0.5" style={{ color: "var(--color-text-muted)" }}>{r.query}</p>
        </div>
      </div>

      {/* Evidence block - collapsible */}
      {r.text_evidence && (
        <div className="border-t" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
          {/* Toggle button */}
          <button
            onClick={() => setOpen(!open)}
            className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-sky-400 hover:text-sky-300 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <span>📎</span> Dẫn chứng tìm được
            </span>
            <motion.span
              animate={{ rotate: open ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="text-text-muted"
            >
              ▼
            </motion.span>
          </button>

          {/* Content */}
          <AnimatePresence initial={false}>
            {open && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                style={{ overflow: "hidden" }}
              >
                <div className="px-3 pb-3">
                  <blockquote
                    className="text-[12px] leading-relaxed border-l-2 border-sky-400/40 pl-3 whitespace-pre-wrap"
                    style={{ color: "var(--color-text)" }}
                  >
                    {r.text_evidence}
                  </blockquote>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function EvalResults({ data }: { data: BookEvaluationResponse }) {
  const successCount = data.results.filter((r) => r.success).length;
  const rate = Math.round((successCount / data.results.length) * 100);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black" style={{ color: "var(--color-text)" }}>Kết quả đánh giá</h2>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-black text-emerald-400">{rate}%</span>
          <span className="text-xs text-text-muted">Success Rate</span>
        </div>
      </div>
      <div className="progress-bar">
        <motion.div
          className="progress-fill bg-gradient-to-r from-emerald-500 to-sky-500"
          initial={{ width: 0 }}
          animate={{ width: `${rate}%` }}
          transition={{ duration: 1 }}
        />
      </div>
      <div className="space-y-3">
        {data.results.map((r, i) => (
          <EvalItem key={i} r={r} i={i} />
        ))}
      </div>
      <div className="p-3 rounded-xl bg-sky-500/8 border border-sky-400/20">
        <p className="text-xs text-text-muted">Điểm trung bình</p>
        <p className="text-2xl font-black text-sky-400 mono">{(data.average_score * 100).toFixed(1)}%</p>
      </div>
    </div>
  );
}
