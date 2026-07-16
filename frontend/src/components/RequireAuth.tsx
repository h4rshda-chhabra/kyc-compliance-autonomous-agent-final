import { Navigate, Outlet, useLocation } from "react-router-dom";
import { TOKEN_KEY } from "@/services/apiClient";

export function RequireAuth() {
  const location = useLocation();
  const hasToken = Boolean(localStorage.getItem(TOKEN_KEY));

  if (!hasToken) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
