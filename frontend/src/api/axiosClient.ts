import axios from "axios";
import type {
  BookContentResponse,
  BookDetail,
  BookEvaluationResponse,
  FilterOptions,
  LibraryResponse,
  SearchHistoryItem,
  SearchMode,
  SearchResponse,
} from "../types";

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.trim() ?? "http://localhost:8000";

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 90_000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      if (!window.location.pathname.endsWith("/login")) {
        window.location.href = "/login";
      }
    }
    if (err.response?.data?.detail) {
      return Promise.reject(new Error(String(err.response.data.detail)));
    }
    if (err.code === "ECONNABORTED") {
      return Promise.reject(
        new Error("AI model is loading, please wait ~30-50s and retry...")
      );
    }
    if (err.code === "ERR_NETWORK") {
      return Promise.reject(
        new Error("Cannot reach backend. Is the API server running on port 8000?")
      );
    }
    return Promise.reject(err);
  }
);

// ── Params ────────────────────────────────────────────────────────────────────
export interface SearchParams {
  q: string;
  limit?: number;
  category?: string;
  language?: string;
  mode?: SearchMode;
}

// ── Normalizer ────────────────────────────────────────────────────────────────
const normalizeSearch = (data: SearchResponse): SearchResponse => ({
  ...data,
  results: data.results.map((r) => ({
    ...r,
    text_snippet: r.text_snippet ?? (r as unknown as Record<string, string>)["text"] ?? "",
  })),
});

// ── Endpoints ─────────────────────────────────────────────────────────────────
export const searchBooks = async (p: SearchParams): Promise<SearchResponse> => {
  const { data } = await api.get<SearchResponse>("/search", {
    params: {
      q: p.q,
      limit: p.limit ?? 5,
      mode: p.mode ?? "hybrid",
      category: p.category || undefined,
      language: p.language || undefined,
    },
  });
  return normalizeSearch(data);
};

export const getBooks = async (
  page = 1,
  limit = 12,
  q?: string,
  category?: string,
  language?: string
): Promise<LibraryResponse> => {
  const { data } = await api.get<LibraryResponse>("/books", {
    params: { page, limit, q, category, language },
  });
  return data;
};

export const getBookDetail = async (id: string): Promise<BookDetail> => {
  const { data } = await api.get<BookDetail>(`/book/${id}`);
  return data;
};

export const getBookContent = async (
  id: string,
  page = 1,
  pageSize = 50
): Promise<BookContentResponse> => {
  const { data } = await api.get<BookContentResponse>(`/book/${id}/content`, {
    params: { page, page_size: pageSize },
  });
  return data;
};

export const getFilters = async (): Promise<FilterOptions> => {
  const { data } = await api.get<FilterOptions>("/filters");
  return data;
};

export const getHistory = async (): Promise<SearchHistoryItem[]> => {
  const { data } = await api.get<SearchHistoryItem[]>("/history");
  return data;
};

export const clearHistory = async (): Promise<void> => {
  await api.delete("/history");
};

export const evaluateBook = async (
  id: string
): Promise<BookEvaluationResponse> => {
  const { data } = await api.post<BookEvaluationResponse>(
    `/evaluate/book/${id}`
  );
  return data;
};

export default api;
