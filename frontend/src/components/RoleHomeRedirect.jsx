import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getHomePathForRole } from "../lib/roleRouting";

export function RoleHomeRedirect() {
  const { isAuthenticated, roleName } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={getHomePathForRole(roleName)} replace />;
}
