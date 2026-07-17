import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, User, AlertCircle, Zap, Eye, EyeOff } from "lucide-react";
import { useAuthStore } from "../store/authStore";
import api from "../api/axiosClient";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  const loginStore = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Vui lòng điền đầy đủ Tên đăng nhập và Mật khẩu");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Gọi API login-json của backend
      const res = await api.post("/auth/login-json", {
        username: username.trim(),
        password: password.trim(),
      });

      const { access_token, user } = res.data;
      
      // Lưu vào store & localStorage
      loginStore(access_token, user);
      
      // Chuyển hướng sang trang chủ tìm kiếm
      navigate("/search");
    } catch (err: any) {
      console.error("Lỗi đăng nhập:", err);
      setError(
        err.message || "Đăng nhập thất bại. Vui lòng kiểm tra lại tài khoản và mật khẩu."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="glass-card max-w-md w-full p-8 rounded-3xl space-y-6"
      >
        {/* Header Logo */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center shadow-neon">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black">
              Smart<span className="gradient-text-cyan">Lib</span> Login
            </h1>
            <p className="text-xs text-text-muted mt-0.5">
              Đăng nhập để sử dụng Thư viện thông minh
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-400/20 text-rose-400 text-xs"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p className="leading-tight">{error}</p>
          </motion.div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
              Tên đăng nhập
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nhập tên đăng nhập"
                className="input-ai w-full pr-4 py-2.5"
                style={{ paddingLeft: "2.5rem" }}
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
              Mật khẩu
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-ai w-full pr-10 py-2.5"
                style={{ paddingLeft: "2.5rem" }}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text focus:outline-none transition-colors"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full btn-primary py-3 rounded-xl flex items-center justify-center font-bold text-xs"
            disabled={loading}
          >
            {loading ? <div className="spinner-sm" /> : "Đăng nhập"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
