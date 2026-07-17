import { NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Search,
  BookOpen,
  BarChart3,
  Layers,
  GitBranch,
  Zap,
  Library,
  Sun,
  Moon,
  LogOut,
} from "lucide-react";
import { useSearchStore } from "../store/searchStore";
import { useAuthStore } from "../store/authStore";

const NAV_ITEMS = [
  { to: "/search", icon: Search, label: "Tìm kiếm", sub: "Semantic Search" },
  { to: "/comparison", icon: GitBranch, label: "So sánh", sub: "Mode Comparison" },
  { to: "/library", icon: Library, label: "Thư viện", sub: "Book Library" },
  { to: "/evaluation", icon: BarChart3, label: "Đánh giá", sub: "Evaluation" },
  { to: "/xai", icon: Layers, label: "Giải thích", sub: "XAI Panel" },
];

export default function Sidebar() {
  const location = useLocation();
  const theme = useSearchStore((s) => s.theme);
  const setTheme = useSearchStore((s) => s.setTheme);
  const { user, logout } = useAuthStore();

  const visibleNavItems = NAV_ITEMS.filter(({ to }) => {
    if (to === "/evaluation") return user?.role === "admin";
    return true;
  });

  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex flex-col gap-4 md:w-[220px] md:flex-shrink-0"
    >
      {/* Logo */}
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-1">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center shadow-neon-sm">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-bg animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm font-black leading-none" style={{ color: "var(--color-text)" }}>
              Smart<span className="gradient-text-cyan">Lib</span>
            </h1>
            <p className="text-[10px] text-text-muted font-medium mt-0.5">
              Semantic Search
            </p>
          </div>
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="mt-4 w-full flex items-center justify-between p-2.5 rounded-xl bg-white/[0.04] border border-white/8 hover:bg-white/[0.08] transition-all group"
        >
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center">
              {theme === "dark" ? (
                <Moon className="w-4 h-4 text-purple-400" />
              ) : (
                <Sun className="w-4 h-4 text-amber-500" />
              )}
            </div>
            <span className="text-[11px] font-bold text-text-muted group-hover:text-sky-400 transition-colors">
              {theme === "dark" ? "Dark Mode" : "Light Mode"}
            </span>
          </div>
          <div className="w-8 h-4 rounded-full bg-white/10 relative transition-colors">
            <motion.div
              animate={{ x: theme === "dark" ? 18 : 2 }}
              className="absolute top-1 w-2 h-2 rounded-full bg-sky-500 shadow-neon-sm"
            />
          </div>
        </button>
      </div>

      {/* User Profile */}
      {user && (
        <div className="glass rounded-2xl p-4 flex items-center gap-3 bg-white/[0.02] border border-white/5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center font-bold text-white text-xs shadow-neon-sm flex-shrink-0">
            {user.username.substring(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold leading-none truncate" style={{ color: "var(--color-text)" }}>
              {user.username}
            </p>
            <p className="text-[9px] text-text-muted font-black mt-1.5 uppercase tracking-wider">
              {user.role === "admin" ? "Quản trị viên" : "Độc giả"}
            </p>
          </div>
        </div>
      )}

      <nav className="glass rounded-2xl p-2 flex flex-col gap-1">
        {visibleNavItems.map(({ to, icon: Icon, label, sub }) => {
          const isActive = location.pathname.startsWith(to);
          return (
            <NavLink
              key={to}
              to={to}
              className={`nav-link group ${isActive ? "active" : ""}`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                  isActive
                    ? "bg-sky-500/20 text-sky-400"
                    : "bg-white/5 text-text-muted group-hover:bg-sky-500/10 group-hover:text-sky-400"
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={`text-xs font-bold leading-none ${
                    isActive ? "text-sky-500" : "text-text-muted group-hover:text-sky-500"
                  }`}
                >
                  {label}
                </p>
                <p className="text-[10px] text-text-muted mt-0.5 leading-none truncate">
                  {sub}
                </p>
              </div>
              {isActive && (
                <motion.div
                  layoutId="nav-active"
                  className="w-1.5 h-1.5 rounded-full bg-sky-400"
                />
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Đăng xuất */}
      <button
        onClick={logout}
        className="flex items-center justify-between p-2.5 rounded-xl bg-rose-500/5 border border-rose-500/10 hover:bg-rose-500/10 hover:border-rose-400/30 transition-all group w-full text-rose-400 font-bold text-xs"
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-rose-500/10 flex items-center justify-center group-hover:bg-rose-500/20 transition-all">
            <LogOut className="w-4 h-4 text-rose-400" />
          </div>
          <span>Đăng xuất</span>
        </div>
      </button>

      {/* System Status */}
      <div className="glass rounded-2xl p-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-3">
          System Status
        </p>
        <div className="space-y-2.5">
          {[
            { label: "Qdrant Vector DB", color: "bg-emerald-400" },
            { label: "Embedding Model", color: "bg-emerald-400" },
            { label: "BM25 Index", color: "bg-sky-400" },
            { label: "Reranker", color: "bg-sky-400" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${item.color} animate-pulse`} />
              <span className="text-[11px] text-text-muted">{item.label}</span>
              <span className="ml-auto text-[9px] font-bold text-emerald-500 uppercase">
                Online
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Version */}
      <div className="px-4">
        <p className="text-[10px] text-text-muted text-center">
          <span className="mono">v5.1.0</span> · Hybrid Search Engine
        </p>
      </div>
    </motion.aside>
  );
}
