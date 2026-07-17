import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Upload, TrendingUp, Target, Award, Hash, AlertCircle
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid,
  PolarAngleAxis, Radar
} from "recharts";
import type { MetricSummary } from "../types";

const SAMPLE_METRICS: MetricSummary = {
  avgHitAt1: 0.72,
  avgAccuracyAt1: 0.72,
  avgPrecisionAtK: 0.68,
  avgRecallAtK: 0.81,
  avgHitAtK: 0.88,
  mrr: 0.76,
  rows: [],
};

const COMPARISON_DATA = [
  { name: "Precision@1", keyword: 45, semantic: 63, hybrid: 76 },
  { name: "Recall@5",    keyword: 61, semantic: 73, hybrid: 85 },
  { name: "MRR",         keyword: 58, semantic: 72, hybrid: 80 },
];

const LINE_DATA = [
  { k: 1, keyword: 45, semantic: 63, hybrid: 76 },
  { k: 2, keyword: 57, semantic: 70, hybrid: 82 },
  { k: 3, keyword: 63, semantic: 74, hybrid: 85 },
  { k: 5, keyword: 70, semantic: 80, hybrid: 90 },
  { k: 10, keyword: 78, semantic: 85, hybrid: 94 },
];

const RADAR_DATA = [
  { metric: "Precision@1", keyword: 45, semantic: 63, hybrid: 76 },
  { metric: "Recall",    keyword: 61, semantic: 73, hybrid: 85 },
  { metric: "MRR",       keyword: 58, semantic: 72, hybrid: 80 },
  { metric: "Speed",     keyword: 90, semantic: 55, hybrid: 60 },
];

const CHART_COLORS = {
  keyword: "#f59e0b",
  semantic: "#38bdf8",
  hybrid: "#a78bfa",
};

const customTooltipStyle = {
  backgroundColor: "rgba(5,10,18,0.95)",
  border: "1px solid rgba(56,189,248,0.2)",
  borderRadius: "0.75rem",
  color: "#e2e8f0",
  fontSize: "12px",
};

function MetricCard({
  label, value, unit = "%", color, icon: Icon, description, isDecimal = false
}: {
  label: string; value: number; unit?: string; color: string;
  icon: React.ElementType; description?: string; isDecimal?: boolean;
}) {
  const displayValue = isDecimal ? value.toFixed(3) : Math.round(value * 100);
  const widthPercent = Math.min(Math.max(Math.round(value * 100), 0), 100);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-2xl p-5 space-y-3"
    >
      <div className="flex items-center justify-between">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className={`w-4.5 h-4.5 ${color.replace("bg-", "text-").replace("/20", "")}`} />
        </div>
        <span className={`text-3xl font-black mono ${color.replace("bg-", "text-").replace("/20", "")}`}>
          {displayValue}{unit}
        </span>
      </div>
      <div>
        <p className="text-xs font-bold" style={{ color: "var(--color-text)" }}>{label}</p>
        {description && <p className="text-[11px] text-text-muted mt-0.5">{description}</p>}
      </div>
      <div className="progress-bar">
        <motion.div
          className={`progress-fill ${color.replace("bg-", "bg-")}`}
          initial={{ width: 0 }}
          animate={{ width: `${widthPercent}%` }}
          transition={{ duration: 1, delay: 0.2 }}
        />
      </div>
    </motion.div>
  );
}

export default function Evaluation() {
  const [metrics, setMetrics] = useState<MetricSummary>(SAMPLE_METRICS);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [activeChart, setActiveChart] = useState<"bar" | "line" | "radar">("bar");
  const [modeFilter, setModeFilter] = useState<string>("all");

  const [comparisonData, setComparisonData] = useState(COMPARISON_DATA);
  const [lineData, setLineData] = useState(LINE_DATA);
  const [radarData, setRadarData] = useState(RADAR_DATA);

  const handleCSV = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvError(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const lines = text.trim().split("\n");
        const header = lines[0].toLowerCase().split(",").map((h) => h.trim());

        const qIdx = header.findIndex((h) => h.includes("query"));
        const expIdx = header.findIndex((h) => h.includes("expected"));
        const retIdx = header.findIndex((h) => h.includes("retrieved"));
        const rankIdx = header.findIndex((h) => h.includes("rank"));
        const modeIdx = header.findIndex((h) => h.includes("mode"));

        if (qIdx < 0 || expIdx < 0) {
          setCsvError("CSV phải có cột 'query' và 'expected_doc'");
          return;
        }

        const K = 5;
        const rows = lines.slice(1).map((line) => {
          // Parse CSV line handling commas inside quotes
          const cols: string[] = [];
          let curr = "";
          let inQuotes = false;
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              cols.push(curr.trim().replace(/^"|"$/g, ""));
              curr = "";
            } else {
              curr += char;
            }
          }
          cols.push(curr.trim().replace(/^"|"$/g, ""));

          const query = cols[qIdx] ?? "";
          const expected = cols[expIdx] ?? "";
          const retrieved = retIdx >= 0 ? cols[retIdx] : "";
          const mode = modeIdx >= 0 ? cols[modeIdx].toLowerCase() : "all";
          const rank = rankIdx >= 0 ? parseInt(cols[rankIdx]) || 0 : 0;
          
          const hit1 = rank === 1 ? 1 : 0;
          const hitK = rank > 0 && rank <= K ? 1 : 0;
          
          return {
            query, 
            expectedDoc: expected, 
            retrievedDoc: retrieved,
            mode,
            rank,
            hitAt1: hit1, 
            hitAtK: hitK,
            precisionAtK: hitK / K,
            recallAtK: hitK,
            reciprocalRank: rank > 0 ? 1 / rank : 0,
          };
        }).filter((r) => r.query);

        if (rows.length === 0) { setCsvError("Không có dữ liệu hợp lệ"); return; }

        setMetrics({
          avgHitAt1: 0, // Will be calculated dynamically
          avgAccuracyAt1: 0,
          avgPrecisionAtK: 0,
          avgRecallAtK: 0,
          avgHitAtK: 0,
          mrr: 0,
          rows,
        });

        // Calculate dynamic chart data
        const modes = ["keyword", "semantic", "hybrid"];
        const statsPerMode: Record<string, any> = {};

        modes.forEach(m => {
          const modeRows = rows.filter(r => r.mode === m);
          const n = modeRows.length || 1;
          const hitAt1 = modeRows.reduce((s, r) => s + r.hitAt1, 0) / n;
          const hitAt5 = modeRows.reduce((s, r) => s + r.hitAtK, 0) / n;
          const precisionAt5 = modeRows.reduce((s, r) => s + r.precisionAtK, 0) / n;
          const recallAt5 = modeRows.reduce((s, r) => s + (r.hitAtK ? 1 : 0), 0) / n;
          const mrr = modeRows.reduce((s, r) => s + r.reciprocalRank, 0) / n;
          
          statsPerMode[m] = {
            hitAt1: Math.round(hitAt1 * 100),
            hitAt5: Math.round(hitAt5 * 100),
            precisionAt5: Math.round(precisionAt5 * 100),
            recallAt5: Math.round(recallAt5 * 100),
            mrr: Math.round(mrr * 100),
          };
        });

        setComparisonData([
          { name: "Precision@1", keyword: statsPerMode.keyword.hitAt1, semantic: statsPerMode.semantic.hitAt1, hybrid: statsPerMode.hybrid.hitAt1 },
          { name: "Recall@5",    keyword: statsPerMode.keyword.recallAt5, semantic: statsPerMode.semantic.recallAt5, hybrid: statsPerMode.hybrid.recallAt5 },
          { name: "MRR",         keyword: statsPerMode.keyword.mrr, semantic: statsPerMode.semantic.mrr, hybrid: statsPerMode.hybrid.mrr },
        ]);

        setRadarData([
          { metric: "Precision@1", keyword: statsPerMode.keyword.hitAt1, semantic: statsPerMode.semantic.hitAt1, hybrid: statsPerMode.hybrid.hitAt1 },
          { metric: "Recall",    keyword: statsPerMode.keyword.recallAt5, semantic: statsPerMode.semantic.recallAt5, hybrid: statsPerMode.hybrid.recallAt5 },
          { metric: "MRR",       keyword: statsPerMode.keyword.mrr, semantic: statsPerMode.semantic.mrr, hybrid: statsPerMode.hybrid.mrr },
        ]);

        const ks = [1, 2, 3, 5, 10];
        const newLineData = ks.map(k => {
          const dataPoint: any = { k };
          modes.forEach(m => {
            const modeRows = rows.filter(r => r.mode === m);
            const n = modeRows.length || 1;
            const hitAtCurrK = modeRows.reduce((s, r) => s + ((r as any).rank > 0 && (r as any).rank <= k ? 1 : 0), 0) / n;
            dataPoint[m] = Math.round(hitAtCurrK * 100);
          });
          return dataPoint;
        });
        setLineData(newLineData);

      } catch (err) {
        setCsvError("Lỗi đọc CSV: " + String(err));
      }
    };
    reader.readAsText(file, "utf-8");
  }, []);

  // Calculate dynamic metrics based on filter
  const filteredRows = metrics.rows.filter(r => modeFilter === "all" || r.mode === modeFilter);
  const n = filteredRows.length || 1;
  const currentStats = {
    hitAt1: filteredRows.length > 0
      ? filteredRows.reduce((s, r) => s + r.hitAt1, 0) / n
      : metrics.avgHitAt1,
    precision: filteredRows.length > 0
      ? filteredRows.reduce((s, r) => s + r.precisionAtK, 0) / n
      : metrics.avgPrecisionAtK,
    recall: filteredRows.length > 0
      ? filteredRows.reduce((s, r) => s + (r.hitAtK ? 1 : 0), 0) / n
      : metrics.avgRecallAtK,
    mrr: filteredRows.length > 0
      ? filteredRows.reduce((s, r) => s + r.reciprocalRank, 0) / n
      : metrics.mrr,
    hitAtK: filteredRows.length > 0
      ? filteredRows.reduce((s, r) => s + (r.hitAtK ? 1 : 0), 0) / n
      : metrics.avgHitAtK,
  };

  const metricCards = [
    { label: "Precision@1", value: currentStats.hitAt1, icon: Target, color: "bg-sky-500/20", description: `Độ chính xác Top 1 (${modeFilter})` },
    { label: "Recall@5",    value: currentStats.recall,    icon: Hash, color: "bg-purple-500/20", description: `Độ bao phủ (${modeFilter})` },
    { label: "MRR",         value: currentStats.mrr,       icon: Award, color: "bg-emerald-500/20", description: `Mean Reciprocal Rank`, unit: "", isDecimal: true },
    { label: "Hit@5",       value: currentStats.hitAtK,    icon: TrendingUp, color: "bg-amber-500/20", description: `Tỉ lệ tìm thấy` },
  ];

  return (
    <section className="space-y-5 pb-10">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-400">
          Evaluation Dashboard
        </p>
        <h1 className="gradient-title text-3xl md:text-4xl font-black mt-1 pb-1">
          Đánh giá hệ thống
        </h1>
        <p className="text-sm text-text-muted mt-1">
          So sánh hiệu suất giữa các mô hình tìm kiếm dựa trên Ground Truth
        </p>
      </motion.div>

      {/* CSV Upload & Filter */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="glass rounded-2xl p-4 md:col-span-1">
          <label className="btn-primary w-full justify-center cursor-pointer">
            <Upload className="w-4 h-4" />
            Tải kết quả CSV
            <input type="file" accept=".csv" onChange={handleCSV} className="hidden" />
          </label>
          {csvError && <p className="text-[10px] text-rose-400 mt-2 text-center">{csvError}</p>}
        </div>

        <div className="glass rounded-2xl p-2 flex items-center justify-around md:col-span-2">
          {["all", "keyword", "semantic", "hybrid"].map((m) => (
            <button
              key={m}
              onClick={() => setModeFilter(m)}
              className={`px-4 py-2 rounded-xl text-[11px] font-bold transition-all uppercase tracking-wider ${
                modeFilter === m
                  ? "text-sky-400"
                  : "text-text-muted hover:text-sky-400"
              }`}
              style={modeFilter === m ? {
                background: "var(--color-surface-2)",
                border: "1px solid var(--color-border-bright)",
                boxShadow: "0 2px 8px rgba(56,189,248,0.1)"
              } : {}}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {metricCards.map((m, i) => (
          <motion.div key={m.label} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.08 }}>
            <MetricCard {...m} />
          </motion.div>
        ))}
      </div>

      {/* Chart Tabs */}
      <div className="tab-bar">
        {(["bar", "line", "radar"] as const).map((c) => (
          <button key={c} className={`tab-item ${activeChart === c ? "active" : ""}`} onClick={() => setActiveChart(c)}>
            {c === "bar" && "Comparison Chart"}
            {c === "line" && "Hit@K Curve"}
            {c === "radar" && "Capabilities"}
          </button>
        ))}
      </div>

      {/* Charts */}
      <motion.div key={activeChart} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-5">
        <ResponsiveContainer width="100%" height={320}>
          {activeChart === "bar" ? (
            <BarChart data={comparisonData} barCategoryGap="25%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
              <Tooltip 
                contentStyle={customTooltipStyle} 
                formatter={(value, name, props) => {
                  const isMRR = props.payload.name === "MRR";
                  return [isMRR ? (Number(value) / 100).toFixed(3) : `${value}%`, name];
                }} 
              />
              <Legend wrapperStyle={{ fontSize: "12px", color: "#64748b" }} />
              <Bar dataKey="keyword" name="Keyword" fill={CHART_COLORS.keyword} radius={[4, 4, 0, 0]} />
              <Bar dataKey="semantic" name="Semantic" fill={CHART_COLORS.semantic} radius={[4, 4, 0, 0]} />
              <Bar dataKey="hybrid" name="Hybrid" fill={CHART_COLORS.hybrid} radius={[4, 4, 0, 0]} />
            </BarChart>
          ) : activeChart === "line" ? (
            <LineChart data={lineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="k" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
              <Tooltip contentStyle={customTooltipStyle} formatter={(v) => [`${v}%`]} />
              <Legend wrapperStyle={{ fontSize: "12px", color: "#64748b" }} />
              <Line dataKey="keyword" name="Keyword" stroke={CHART_COLORS.keyword} strokeWidth={2} dot={{ r: 4 }} />
              <Line dataKey="semantic" name="Semantic" stroke={CHART_COLORS.semantic} strokeWidth={2} dot={{ r: 4 }} />
              <Line dataKey="hybrid" name="Hybrid" stroke={CHART_COLORS.hybrid} strokeWidth={2.5} dot={{ r: 4 }} />
            </LineChart>
          ) : (
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(255,255,255,0.06)" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: "#64748b", fontSize: 11 }} />
              <Radar name="Keyword" dataKey="keyword" stroke={CHART_COLORS.keyword} fill={CHART_COLORS.keyword} fillOpacity={0.15} />
              <Radar name="Semantic" dataKey="semantic" stroke={CHART_COLORS.semantic} fill={CHART_COLORS.semantic} fillOpacity={0.15} />
              <Radar name="Hybrid" dataKey="hybrid" stroke={CHART_COLORS.hybrid} fill={CHART_COLORS.hybrid} fillOpacity={0.2} />
              <Legend wrapperStyle={{ fontSize: "12px", color: "#64748b" }} />
              <Tooltip 
                contentStyle={customTooltipStyle} 
                formatter={(value, name, props) => {
                  const isMRR = props.payload.metric === "MRR";
                  const isSpeed = props.payload.metric === "Speed";
                  if (isMRR) return [(Number(value) / 100).toFixed(3), name];
                  if (isSpeed) return [value, name];
                  return [`${value}%`, name];
                }} 
              />
            </RadarChart>
          )}
        </ResponsiveContainer>
      </motion.div>

      {/* Data Table */}
      {metrics.rows.length > 0 && (
        <div className="glass rounded-2xl p-5 overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--color-text)" }}>
              Chi tiết {filteredRows.length} câu hỏi ({modeFilter})
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b" style={{ borderColor: "var(--color-border)" }}>
                  {["Query", "Expected", "Mode", "Hit@1", "Rank", "MRR"].map((h) => (
                    <th key={h} className="py-2 px-3 text-left text-text-muted font-bold uppercase tracking-wider text-[10px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((r, i) => (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="py-2.5 px-3 text-slate-400 max-w-[200px] truncate" title={r.query}>{r.query}</td>
                    <td className="py-2.5 px-3 text-slate-400 max-w-[150px] truncate" title={r.expectedDoc}>{r.expectedDoc}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-tighter
                        ${r.mode === "hybrid" ? "bg-purple-500/20 text-purple-400" : 
                          r.mode === "semantic" ? "bg-sky-500/20 text-sky-400" : 
                          "bg-amber-500/20 text-amber-400"}`}>
                        {r.mode}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={r.hitAt1 ? "text-emerald-400 font-bold" : "text-rose-400"}>{r.hitAt1 ? "✓" : "✗"}</span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 mono">{r.hitAtK ? "Top 5" : "MISS"}</td>
                    <td className="py-2.5 px-3 text-purple-400 mono">{r.reciprocalRank.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
