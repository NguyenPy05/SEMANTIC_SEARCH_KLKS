import { create } from "zustand";

export interface User {
  username: string;
  role: "admin" | "reader";
}

interface AuthState {
  token: string | null;
  user: User | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: localStorage.getItem("token"),
  user: JSON.parse(localStorage.getItem("user") || "null"),
  login: (token, user) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    set({ token, user });
  },
  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    set({ token: null, user: null });
    // Chuyển hướng về login
    if (!window.location.pathname.endsWith("/login")) {
      window.location.href = "/login";
    }
  },
  isAuthenticated: () => !!get().token,
}));
