import { useState } from "react";
import { evaluateBook } from "../api/axiosClient";
import type { BookEvaluationResponse } from "../types";

interface AIValidationLabProps {
  bookId: string;
}

function AIValidationLab({ bookId }: AIValidationLabProps) {
  const [result, setResult] = useState<BookEvaluationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEvidence, setShowEvidence] = useState<Record<number, boolean>>({});

  const handleRunTest = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await evaluateBook(bookId);
      setResult(data);
      setShowEvidence({});
    } catch (err) {
      console.error("AI Validation Error:", err);
      setError("Không thể chạy kiểm định AI lúc này. Vui lòng kiểm tra lại kết nối backend.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleEvidence = (index: number) => {
    setShowEvidence((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <div className="glass-card rounded-3xl border border-sky-500/10 p-6 space-y-6 shadow-2xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 border border-sky-200 shadow-inner">
            <svg className="w-6 h-6 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-800">Hệ thống Kiểm định AI</h3>
            <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Đánh giá độ discovery & retrieval accuracy</p>
          </div>
        </div>
        <button
          onClick={handleRunTest}
          disabled={isLoading}
          className={`flex items-center gap-2 rounded-xl px-6 py-3 text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${
            isLoading 
            ? "bg-slate-100 text-slate-500 cursor-not-allowed" 
            : "bg-sky-500 text-slate-900 hover:bg-sky-400 hover:shadow-[0_0_20px_rgba(14,165,233,0.3)] active:scale-95"
          }`}
        >
          {isLoading ? (
            <>
              <span className="spinner h-3 w-3 border-2 border-slate-600 border-t-slate-400" />
              Đang chạy Lab...
            </>
          ) : "Bắt đầu kiểm định"}
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-100 p-4 text-xs text-rose-700 font-medium animate-in fade-in zoom-in-95">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        </div>
      )}

      {result && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
           <div className="grid gap-3">
            {result.results.map((test, i) => (
              <div key={i} className="group rounded-2xl border border-slate-200/60 bg-white/40 p-4 space-y-3 transition-colors hover:border-slate-300/80">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-lg px-2 py-1 text-[9px] font-bold uppercase tracking-wider ${
                        test.type === "Tên sách" ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" :
                        test.type === "Tác giả" ? "bg-amber-100 text-amber-400 border border-amber-500/20" :
                        "bg-cyan-100 text-cyan-400 border border-cyan-500/20"
                    }`}>
                        {test.type}
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-slate-600">Test Case #{i+1}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Hạng</span>
                    <span className={`text-base font-display font-bold ${test.rank === 1 ? "text-emerald-600" : test.rank > 0 ? "text-amber-400" : "text-rose-500"}`}>
                      #{test.rank > 0 ? test.rank : "N/A"}
                    </span>
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50/50 p-3">
                    <p className="text-[11px] text-slate-600 font-medium leading-relaxed italic">"{test.query}"</p>
                </div>
                <div className="flex items-center justify-between pt-2">
                   <div className="flex items-center gap-6">
                      <div className="flex flex-col">
                        <span className="text-[8px] uppercase font-bold text-slate-600 tracking-widest mb-0.5">Similarity Score</span>
                        <span className="text-[11px] font-mono text-slate-600">{test.score.toFixed(4)}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[8px] uppercase font-bold text-slate-600 tracking-widest mb-0.5">Test Status</span>
                        <span className={`text-[10px] font-bold uppercase ${test.success ? "text-emerald-500" : "text-rose-500"}`}>
                            {test.success ? "PASSED" : "FAILED"}
                        </span>
                      </div>
                   </div>
                   <div className="flex items-center gap-2">
                     <button
                       onClick={() => toggleEvidence(i)}
                       className={`flex h-8 items-center gap-2 rounded-lg px-3 text-[9px] font-bold uppercase tracking-widest transition-all ${
                         showEvidence[i] 
                         ? "bg-sky-500/20 text-sky-600 border border-sky-500/30" 
                         : "bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200"
                       }`}
                     >
                       <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showEvidence[i] ? "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" : "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"} />
                       </svg>
                       {showEvidence[i] ? "Đóng minh chứng" : "Xem minh chứng"}
                     </button>
                     {test.success ? (
                       <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 border border-emerald-200 text-emerald-500">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                       </div>
                     ) : (
                       <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 border border-rose-500/20 text-rose-500">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                       </div>
                     )}
                   </div>
                </div>

                {showEvidence[i] && (
                  <div className="mt-3 overflow-hidden rounded-xl border-l-4 border-sky-500 bg-slate-50/80 p-4 shadow-inner animate-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-2 mb-2">
                       <svg className="w-3 h-3 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                       </svg>
                       <span className="text-[9px] font-bold uppercase tracking-widest text-sky-600/70">Đoạn văn bản khớp nhất trong sách:</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-slate-700 font-mono">
                      {test.text_evidence || "Không tìm thấy đoạn trích dẫn cụ thể."}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <div className="rounded-2xl bg-sky-50 border border-sky-200 p-5 flex justify-between items-center shadow-inner">
            <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-600">Discovery Accuracy Index</span>
                <p className="text-[10px] text-slate-500">Chỉ số trung bình dựa trên 3 tiêu chí truy xuất chính</p>
            </div>
            <div className="flex items-end gap-1">
                <span className="text-2xl font-display font-bold text-sky-600 leading-none">{result.average_score.toFixed(4)}</span>
                <span className="text-[10px] font-bold text-sky-600 uppercase mb-1">Raw</span>
            </div>
          </div>
        </div>
      )}

      {!result && !isLoading && (
        <div className="rounded-3xl border border-dashed border-slate-200/60 p-10 text-center bg-white/20">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-slate-100/40 flex items-center justify-center mb-4 text-slate-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed italic max-w-xs mx-auto">
            Nhấn nút để khởi chạy quy trình kiểm định **SPOT (Single Point of Truth)** nhằm xác định xác suất tìm thấy tài liệu này trong kho tri thức của AI.
          </p>
        </div>
      )}
    </div>
  );
}

export default AIValidationLab;
