import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, apiRuntime } from "../lib/api";

const AuthContext = createContext(null);

const STORAGE_KEY = "caseflow_auth";

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed) return null;

    const token = String(parsed?.token || "");
    if (!apiRuntime.useMockApi && token.startsWith("mock-token-")) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const initial = loadFromStorage();
  const [token, setToken] = useState(initial?.token || "");
  const [user, setUser] = useState(initial?.user || null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user }));
  }, [token, user]);

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      isAuthenticated: Boolean(token),
      roleName: user?.role_name || "",
      async login(identifier, password) {
        setLoading(true);
        try {
          const response = await api.login({ identifier, password });
          setToken(response.access_token);
          setUser(response.user);
          return response;
        } finally {
          setLoading(false);
        }
      },
      async register(payload) {
        setLoading(true);
        try {
          const response = await api.register(payload);
          setToken(response.access_token);
          setUser(response.user);
          return response;
        } finally {
          setLoading(false);
        }
      },
      logout() {
        setToken("");
        setUser(null);
        localStorage.removeItem(STORAGE_KEY);
      },
    }),
    [token, user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
