import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useCurrentUser } from "@/hooks/useAuth";
import { toRole, type Role } from "@/lib/roles";

/** Gates a route to a specific real backend role. Must be nested under
 *  <RequireAuth/> (which already guarantees a token exists), so a missing
 *  `user` here just means the /auth/me request hasn't resolved yet. */
export function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { data: user, isLoading } = useCurrentUser();

  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;

  const current = toRole(user.role);
  if (current !== role) {
    // Bounce to the other role's home rather than a bare "not allowed" page.
    return <Navigate to={current === "admin" ? "/companies" : "/dashboard"} replace />;
  }
  return <>{children}</>;
}
