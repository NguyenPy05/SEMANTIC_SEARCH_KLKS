import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import Sidebar from "./layout/Sidebar";
import Search from "./pages/Search";
import Library from "./pages/Library";
import BookDetail from "./pages/BookDetail";
import Evaluation from "./pages/Evaluation";
import XAI from "./pages/XAI";
import BookReader from "./pages/BookReader";
import Comparison from "./pages/Comparison";
import Login from "./pages/Login";
import Unauthorized from "./pages/Unauthorized";
import ProtectedRoute from "./components/ProtectedRoute";
import { useSearchStore } from "./store/searchStore";
import { useAuthStore } from "./store/authStore";

function App() {
  const theme = useSearchStore((s) => s.theme);
  const { token, user } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    if (theme === "light") {
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
    }
  }, [theme]);

  // Kiểm tra xem có hiển thị khung Layout (có Sidebar) hay hiển thị độc lập (chưa đăng nhập/ở trang Login)
  const isLoginPage = location.pathname === "/login";
  const hasShell = token && user && !isLoginPage;

  return (
    <div className="min-h-screen text-[var(--color-text)] bg-[var(--color-bg)] transition-colors duration-300 flex items-center justify-center">
      {hasShell ? (
        <div className="mx-auto flex w-full max-w-[1700px] flex-col gap-4 p-3 md:flex-row md:p-5 items-stretch self-start">
          <Sidebar />
          <motion.main
            className="flex-1 min-w-0 glass rounded-3xl p-4 md:p-6 min-h-[calc(100vh-2.5rem)]"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <Routes>
              <Route path="/" element={<Navigate to="/search" replace />} />
              <Route path="/unauthorized" element={<Unauthorized />} />
              
              {/* Cả Độc giả và Admin đều truy cập được */}
              <Route element={<ProtectedRoute allowedRoles={["reader", "admin"]} />}>
                <Route path="/search" element={<Search />} />
                <Route path="/comparison" element={<Comparison />} />
                <Route path="/library" element={<Library />} />
                <Route path="/library/:bookId" element={<BookDetail />} />
                <Route path="/library/:bookId/read" element={<BookReader />} />
                <Route path="/xai" element={<XAI />} />
              </Route>

              {/* Chỉ Admin mới truy cập được */}
              <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
                <Route path="/evaluation" element={<Evaluation />} />
              </Route>

              {/* Route không khớp tự chuyển về search */}
              <Route path="*" element={<Navigate to="/search" replace />} />
            </Routes>
          </motion.main>
        </div>
      ) : (
        <div className="w-full flex items-center justify-center p-4">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      )}
    </div>
  );
}

export default App;
