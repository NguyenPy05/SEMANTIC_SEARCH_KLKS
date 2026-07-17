import { motion } from "framer-motion";
import { ShieldAlert, ArrowLeft, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export default function UnauthorizedPage() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);

  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card max-w-md w-full p-8 rounded-3xl flex flex-col items-center gap-6"
      >
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-400/20 flex items-center justify-center animate-pulse">
          <ShieldAlert className="w-8 h-8 text-rose-400" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-black text-rose-400">Không có quyền truy cập</h1>
          <p className="text-xs text-text-muted leading-relaxed">
            Xin lỗi, tài khoản <strong>{user?.username}</strong> của bạn với vai trò{" "}
            <strong>{user?.role === "admin" ? "Admin" : "Độc giả"}</strong> không được phép truy
            cập vào chức năng này. Vui lòng liên hệ quản trị viên hoặc chuyển sang tài khoản khác.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full pt-4">
          <button
            onClick={() => navigate("/search")}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-surface-2 border border-border-bright text-xs font-bold text-text hover:text-accent hover:border-accent/50 transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Trang chủ
          </button>
          <button
            onClick={logout}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-500/10 border border-rose-400/20 text-xs font-bold text-rose-400 hover:bg-rose-500/20 transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            Đăng xuất
          </button>
        </div>
      </motion.div>
    </div>
  );
}
