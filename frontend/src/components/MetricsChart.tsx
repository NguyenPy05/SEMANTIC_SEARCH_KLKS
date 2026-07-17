import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MetricSummary } from "../types";

interface MetricsChartProps {
  summary: MetricSummary;
  kValue: number;
}

function MetricsChart({ summary, kValue }: MetricsChartProps) {
  const overviewData = [
    { name: "Accuracy@1", value: summary.avgAccuracyAt1 },
    { name: `Precision@${kValue}`, value: summary.avgPrecisionAtK },
    { name: `Recall@${kValue}`, value: summary.avgRecallAtK },
    { name: `Hit@${kValue}`, value: summary.avgHitAtK },
  ];

  const mrrLine = summary.rows.map((row, index) => ({
    index: index + 1,
    mrr: row.reciprocalRank,
  }));

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-5">
        <StatCard 
          title="Average Accuracy@1" 
          value={summary.avgAccuracyAt1} 
          description="Tỷ lệ kết quả đầu tiên khớp chính xác với kỳ vọng."
        />
        <StatCard
          title={`Average Precision@${kValue}`}
          value={summary.avgPrecisionAtK}
          description="Tỷ lệ tài liệu đúng trong số K kết quả trả về."
        />
        <StatCard
          title={`Average Recall@${kValue}`}
          value={summary.avgRecallAtK}
          description="Khả năng tìm thấy tài liệu đúng trong Top K kết quả."
        />
        <StatCard 
          title={`Average Hit@${kValue}`} 
          value={summary.avgHitAtK} 
          description="Tỷ lệ truy vấn tìm thấy đúng tài liệu trong Top K."
        />
        <StatCard 
          title="MRR" 
          value={summary.mrr} 
          description="Thứ hạng nghịch đảo trung bình (vị trí càng cao điểm càng cao)."
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="glass-card rounded-2xl p-4">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.12em] text-slate-700">
            Retrieval Metrics Overview
          </h3>
          <div className="h-72 w-full">
            <ResponsiveContainer>
              <BarChart data={overviewData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(148, 163, 184, 0.2)"
                />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis domain={[0, 1]} stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    background: "#0b1220",
                    border: "1px solid #334155",
                  }}
                />
                <Bar dataKey="value" fill="#38bdf8" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="glass-card rounded-2xl p-4">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.12em] text-slate-700">
            MRR by Query
          </h3>
          <div className="h-72 w-full">
            <ResponsiveContainer>
              <LineChart data={mrrLine}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(148, 163, 184, 0.2)"
                />
                <XAxis dataKey="index" stroke="#94a3b8" />
                <YAxis domain={[0, 1]} stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    background: "#0b1220",
                    border: "1px solid #334155",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="mrr"
                  stroke="#22d3ee"
                  strokeWidth={3}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <section className="glass-card overflow-auto rounded-2xl">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-white/70 text-xs uppercase tracking-[0.12em] text-slate-600">
            <tr>
              <th className="px-4 py-3 w-12 text-center">STT</th>
              <th className="px-4 py-3">Query</th>
              <th className="px-4 py-3">Expected Doc</th>
              <th className="px-4 py-3">Retrieved Doc</th>
              <th className="px-4 py-3">Hit@1</th>
              <th className="px-4 py-3">Hit@K</th>
              <th className="px-4 py-3">Precision@K</th>
              <th className="px-4 py-3">Recall@K</th>
              <th className="px-4 py-3">MRR</th>
            </tr>
          </thead>
          <tbody>
            {summary.rows.map((row, idx) => (
              <tr
                key={`${row.query}-${idx}`}
                className="border-t border-slate-200/70 text-slate-800 hover:bg-white/50 transition-colors"
              >
                <td className="px-4 py-3 text-center font-bold text-slate-500">{idx + 1}</td>
                <td className="px-4 py-3">{row.query}</td>
                <td className="px-4 py-3">{row.expectedDoc}</td>
                <td className="px-4 py-3">{row.retrievedDoc}</td>
                <td className="px-4 py-3">{row.hitAt1}</td>
                <td className="px-4 py-3">{row.hitAtK}</td>
                <td className="px-4 py-3">{row.precisionAtK.toFixed(3)}</td>
                <td className="px-4 py-3">{row.recallAtK.toFixed(3)}</td>
                <td className="px-4 py-3">{row.reciprocalRank.toFixed(3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number;
  description: string;
}

function StatCard({ title, value, description }: StatCardProps) {
  return (
    <div className="glass-card group relative rounded-xl p-4 transition-all hover:shadow-lg hover:shadow-sky-500/10">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
        {title}
      </p>
      <p className="mt-2 font-display text-2xl font-bold text-sky-700">
        {value.toFixed(3)}
      </p>
      <p className="mt-2 text-[9px] leading-relaxed text-slate-500 font-medium border-t border-slate-200/50 pt-2">
        {description}
      </p>
    </div>
  );
}

export default MetricsChart;
