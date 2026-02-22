import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { canAccessPath, getHomePathForRole } from "../lib/roleRouting";

export function RoleProtectedRoute({ path, children }) {
  const { roleName } = useAuth();
  const location = useLocation();
  const targetPath = path || location.pathname;

  if (!canAccessPath(roleName, targetPath)) {
    return <Navigate to={getHomePathForRole(roleName)} replace />;
  }

  return children;
}
