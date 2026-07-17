import { create } from "zustand";
import type { SearchMode, SearchResponse, FilterOptions } from "../types";

interface SearchStore {
  // Search state
  query: string;
  mode: SearchMode;
  limit: number;
  category: string;
  language: string;
  filters: FilterOptions;
  result: SearchResponse | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setQuery: (q: string) => void;
  setMode: (m: SearchMode) => void;
  setLimit: (n: number) => void;
  setCategory: (c: string) => void;
  setLanguage: (l: string) => void;
  setFilters: (f: FilterOptions) => void;
  setResult: (r: SearchResponse | null) => void;
  setLoading: (v: boolean) => void;
  setError: (e: string | null) => void;
  reset: () => void;
  theme: "light" | "dark";
  setTheme: (t: "light" | "dark") => void;
}

const defaultFilters: FilterOptions = { categories: [], languages: [] };

export const useSearchStore = create<SearchStore>((set) => ({
  query: "",
  mode: "hybrid",
  limit: 5,
  category: "",
  language: "",
  filters: defaultFilters,
  result: null,
  isLoading: false,
  error: null,

  setQuery: (q) => set({ query: q }),
  setMode: (m) => set({ mode: m }),
  setLimit: (n) => set({ limit: n }),
  setCategory: (c) => set({ category: c }),
  setLanguage: (l) => set({ language: l }),
  setFilters: (f) => set({ filters: f }),
  setResult: (r) => set({ result: r }),
  setLoading: (v) => set({ isLoading: v }),
  setError: (e) => set({ error: e }),
  reset: () => set({ result: null, error: null, query: "" }),
  theme: (localStorage.getItem("theme") as "light" | "dark") || "dark",
  setTheme: (t) => {
    set({ theme: t });
    localStorage.setItem("theme", t);
    if (t === "light") {
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
    }
  },
}));
