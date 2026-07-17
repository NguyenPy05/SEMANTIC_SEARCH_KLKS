import React, { useState } from "react";
import type { SearchResult } from "../types";
import axiosClient from "../api/axiosClient";

interface ComparisonResult {
  mode: "keyword" | "semantic" | "hybrid";
  results: SearchResult[];
}

interface SearchComparisonProps {
  query: string;
  onClose?: () => void;
}

export const SearchComparison: React.FC<SearchComparisonProps> = ({
  query,
  onClose,
}) => {
  const [comparisonResults, setComparisonResults] = useState<
    Record<string, ComparisonResult>
  >({});
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"keyword" | "semantic" | "hybrid">(
    "hybrid",
  );

  const modes: Array<"keyword" | "semantic" | "hybrid"> = [
    "keyword",
    "semantic",
    "hybrid",
  ];

  const runComparison = async () => {
    setLoading(true);
    const results: Record<string, ComparisonResult> = {};

    for (const mode of modes) {
      try {
        const response = await axiosClient.get("/search", {
          params: {
            q: query,
            limit: 5,
            mode: mode,
          },
        });

        results[mode] = {
          mode,
          results: response.data.results,
        };
      } catch (error) {
        console.error(`Error fetching ${mode} results:`, error);
        results[mode] = {
          mode,
          results: [],
        };
      }
    }

    setComparisonResults(results);
    setLoading(false);
  };

  const getModeColor = (mode: string): string => {
    switch (mode) {
      case "keyword":
        return "from-blue-500 to-blue-600";
      case "semantic":
        return "from-purple-500 to-purple-600";
      case "hybrid":
        return "from-green-500 to-green-600";
      default:
        return "from-gray-500 to-gray-600";
    }
  };

  const ResultCard: React.FC<{ result: SearchResult }> = ({ result }) => (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 truncate">
            #{result.rank}. {result.title}
          </h4>
          <p className="text-sm text-gray-600">{result.author}</p>
        </div>
      </div>
      <p className="text-sm text-gray-700 line-clamp-3">
        {result.text_snippet}
      </p>
    </div>
  );

  return (
    <div className="w-full bg-gradient-to-b from-gray-50 to-white rounded-lg border border-gray-200 p-6">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          🔄 So sánh Chế độ Tìm kiếm
        </h3>
        <p className="text-sm text-gray-600">
          So sánh kết quả giữa tìm kiếm từ khóa, ngữ nghĩa, và hybrid cho truy
          vấn: <span className="font-semibold">"{query}"</span>
        </p>
      </div>

      <button
        onClick={runComparison}
        disabled={loading}
        className={`w-full py-2 px-4 rounded-lg font-semibold transition-all mb-6 ${
          loading
            ? "bg-gray-400 text-gray-100 cursor-not-allowed"
            : "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white hover:shadow-lg hover:scale-[1.02]"
        }`}
      >
        {loading ? "⏳ Đang so sánh..." : "🚀 Chạy So sánh"}
      </button>

      {Object.keys(comparisonResults).length > 0 && (
        <div className="space-y-6">
          {/* Tabs for Results */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="flex border-b border-gray-200 bg-gray-50">
              {modes.map((mode) => (
                <button
                  key={mode}
                  onClick={() => setActiveTab(mode)}
                  className={`flex-1 py-3 px-4 font-semibold transition-colors ${
                    activeTab === mode
                      ? `bg-gradient-to-r ${getModeColor(mode)} text-white`
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <div className="text-sm">{mode.toUpperCase()}</div>
                </button>
              ))}
            </div>

            <div className="p-4 space-y-3">
              {comparisonResults[activeTab]?.results.length > 0 ? (
                comparisonResults[activeTab].results.map((result) => (
                  <ResultCard
                    key={result.chunk_id || result.rank}
                    result={result}
                  />
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">Không có kết quả</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {onClose && (
        <button
          onClick={onClose}
          className="mt-4 text-sm text-gray-600 hover:text-gray-900 underline"
        >
          ← Đóng So sánh
        </button>
      )}
    </div>
  );
};
