import { motion, AnimatePresence } from "framer-motion";
import { History, Trash2, Clock, ChevronRight, X } from "lucide-react";
import type { SearchHistoryItem } from "../types";

interface Props {
  history: SearchHistoryItem[];
  onSelect: (q: string) => void;
  onDelete?: (id: string) => void;
  onClear: () => void;
}

const STATUS_DOT: Record<string, string> = {
  good: "bg-emerald-400",
  low_confidence: "bg-amber-400",
  no_match: "bg-rose-400",
};

function formatTime(ts: number): string {
  const d = new Date(ts * 1000);
  return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

export default function HistoryPanel({ history, onSelect, onDelete, onClear }: Props) {
  if (!history.length) return null;

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-text-muted" />
          <p className="text-xs font-bold uppercase tracking-widest text-text-muted">
            Lịch sử tìm kiếm
          </p>
          <span className="badge badge-cyan">{history.length}</span>
        </div>
        <button
          onClick={onClear}
          className="flex items-center gap-1 text-[11px] text-rose-400/60 hover:text-rose-400 transition-colors px-2 py-1 rounded-lg hover:bg-rose-400/10"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Xóa tất cả
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <AnimatePresence>
          {history.slice(0, 8).map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="group flex items-center gap-1.5 bg-white/[0.04] border border-white/8 rounded-xl px-3 py-1.5 cursor-pointer hover:border-sky-400/30 hover:bg-sky-400/5 transition-all"
              onClick={() => onSelect(item.query)}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[item.status] ?? "bg-slate-500"}`}
              />
              <span className="text-xs text-slate-400 group-hover:text-sky-400 transition-colors max-w-[180px] truncate">
                {item.query}
              </span>
              <Clock className="w-3 h-3 text-text-muted ml-1 flex-shrink-0" />
              <span className="text-[10px] text-text-muted mono flex-shrink-0">
                {formatTime(item.timestamp)}
              </span>
              {onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(item.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 ml-1 text-text-muted hover:text-rose-400 transition-all"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
              <ChevronRight className="w-3 h-3 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
