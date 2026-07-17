
interface XAIProgressProps {
  score: number;
  rrfScore: number;
}

const getStatusStyle = (score: number) => {
  // Bộ ngưỡng chuẩn Research (0.85 / 0.60) đồng bộ với backend search.py
  if (score >= 0.85) {
    return {
      color: "text-cyan-400",
      bg: "bg-cyan-100",
      border: "border-cyan-500/30",
      badge: "XÁC THỰC NGỮ NGHĨA CAO",
      label: "Độ tin cậy tốt (Good)"
    };
  }

  if (score > 0.60) {
    return {
      color: "text-amber-400",
      bg: "bg-amber-100",
      border: "border-amber-300",
      badge: "KHỚP TIỀM NĂNG (TRUNG BÌNH)",
      label: "Độ tin cậy thấp (Low Confidence)"
    };
  }

  return {
    color: "text-rose-400",
    bg: "bg-rose-100",
    border: "border-rose-300",
    badge: "DỮ LIỆU KHÔNG PHÙ HỢP",
    label: "Không khớp (No Match)"
  };
};

/**
 * XAIProgress v5.5 - Research Edition
 * Hiển thị điểm số Raw Logit làm trung tâm, loại bỏ thanh phần trăm để tăng tính kỹ thuật.
 */
function XAIProgress({ score, rrfScore }: XAIProgressProps) {
  const styles = getStatusStyle(score);

  return (
    <div className="space-y-4">
      {/* Header trạng thái */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Phân tích chuyên sâu (XAI)</span>
        <div className={`px-2 py-0.5 rounded text-[9px] font-black border ${styles.bg} ${styles.color} ${styles.border}`}>
          {styles.badge}
        </div>
      </div>

      {/* Main Score Display */}
      <div className={`p-4 rounded-2xl border ${styles.bg} ${styles.border} flex flex-col items-center justify-center relative overflow-hidden`}>
        <div className="absolute top-0 right-0 p-2 opacity-10">
          <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24"><path d="M21 16.5C21 16.88 20.79 17.21 20.47 17.38L12.57 21.82C12.41 21.94 12.21 22 12 22C11.79 22 11.59 21.94 11.43 21.82L3.53 17.38C3.21 17.21 3 16.88 3 16.5V7.5C3 7.12 3.21 6.79 3.53 6.62L11.43 2.18C11.59 2.06 11.79 2 12 2C12.21 2 12.41 2.06 12.57 2.18L20.47 6.62C20.79 6.79 21 7.12 21 7.5V16.5Z"/></svg>
        </div>
        
        <span className="text-[10px] font-mono text-slate-600 mb-1">RERANKER RAW LOGIT</span>
        <div className={`text-4xl font-mono font-black tracking-tighter ${styles.color}`}>
          {score > 0 ? `+${score.toFixed(4)}` : score.toFixed(4)}
        </div>
        <span className={`text-[11px] font-medium mt-1 ${styles.color} opacity-80 uppercase tracking-widest`}>
          {styles.label}
        </span>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 gap-2">
        <div className="flex justify-between items-center px-3 py-2 rounded-xl bg-white/50 border border-slate-200/50">
          <div className="flex flex-col">
            <span className="text-[9px] text-slate-500 font-bold uppercase">Retrieval Stage (RRF)</span>
            <span className="text-[11px] text-slate-700 font-mono italic">Reciprocal Rank Fusion</span>
          </div>
          <span className="text-sm font-mono font-bold text-sky-600">{rrfScore.toFixed(4)}</span>
        </div>
      </div>

      {/* Note kỹ thuật */}
      <p className="text-[9px] text-slate-500 leading-relaxed italic text-center px-4">
        * Hệ thống sử dụng thang đo Logit thô để đảm bảo tính khách quan trong nghiên cứu, tránh sai số do hàm chuẩn hóa.
      </p>
    </div>
  );
}

export default XAIProgress;
