import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getHomePathForRole, isSystemAdminRole } from "../lib/roleRouting";

export function AdminOnlyRoute({ children }) {
  const { isAuthenticated, roleName } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isSystemAdminRole(roleName)) {
    return <Navigate to={getHomePathForRole(roleName)} replace />;
  }

  return children;
}
