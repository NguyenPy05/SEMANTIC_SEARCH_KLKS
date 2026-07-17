// src/types.ts
export type SearchMode = "keyword" | "semantic" | "hybrid" | "hybrid_no_rerank";
export type SearchStatus = "good" | "low_confidence" | "no_match" | string;
export type SearchIntent = "summarize" | "author_search" | "year_search" | "category_search" | "general_search" | string;

export interface SearchResult {
  book_id: string;
  rank: number;
  score: number;
  rrf_score: number;
  dense_score: number;
  sparse_score: number;
  title: string;
  author: string;
  year?: number | null;
  category: string;
  language: string;
  summary: string;
  text_snippet: string;
  text?: string;
  chunk_id?: string | null;
}

export interface SearchResponse {
  query: string;
  intent: SearchIntent;
  status: SearchStatus;
  processing_time_ms: number;
  total_results: number;
  results: SearchResult[];
}

export interface BookDetail {
  book_id: string;
  title: string;
  author: string;
  year?: number | null;
  category: string;
  language: string;
  summary: string;
  total_chunks: number;
  file_name: string;
  cover_url?: string | null;
}

export interface FilterOptions {
  categories: string[];
  languages: string[];
}

export interface SearchHistoryItem {
  id: string;
  query: string;
  timestamp: number;
  intent: string;
  status: string;
  results_count: number;
  processing_time_ms: number;
}

export interface BookTestResult {
  query: string;
  type: string;
  success: boolean;
  rank: number;
  score: number;
  text_evidence?: string;
}

export interface BookEvaluationResponse {
  book_id: string;
  results: BookTestResult[];
  average_score: number;
}

export interface BookContentResponse {
  book_id: string;
  page: number;
  total_pages: number;
  content: string[];
}

export interface QueryMetric {
  query: string;
  expectedDoc: string;
  retrievedDoc: string;
  mode: string;
  hitAt1: number;
  hitAtK: number;
  precisionAtK: number;
  recallAtK: number;
  reciprocalRank: number;
}

export interface MetricSummary {
  avgHitAt1: number;
  avgAccuracyAt1: number;
  avgPrecisionAtK: number;
  avgRecallAtK: number;
  avgHitAtK: number;
  mrr: number;
  rows: QueryMetric[];
}

export interface LibraryResponse {
  total: number;
  page: number;
  limit: number;
  books: BookDetail[];
}
