import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

interface ProtectedRouteProps {
  allowedRoles?: ("admin" | "reader")[];
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { token, user } = useAuthStore();

  if (!token || !user) {
    // Chưa đăng nhập, chuyển hướng sang trang Login
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Đã đăng nhập nhưng quyền không hợp lệ
    return <Navigate to="/unauthorized" replace />;
  }

  // Quyền hợp lệ, render component con (các Route bên trong)
  return <Outlet />;
}
