import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, apiRuntime } from "../lib/api";

const AuthContext = createContext(null);

const STORAGE_KEY = "caseflow_auth";
const KNOWN_ROLE_KEYWORDS = [
  "system admin",
  "super admin",
  "superuser",
  "administrator",
  "admin",
  "complainant",
  "citizen",
  "plaintiff",
  "reporter",
  "basic user",
  "ordinary user",
  "normal user",
  "witness",
  "suspect",
  "officer",
  "patrol",
  "cadet",
  "intern",
  "detective",
  "sergeant",
  "captain",
  "chief",
  "judge",
  "coroner",
  "forensic",
  "medical examiner",
  "police",
];

function normalizeRoleName(value) {
  return String(value || "")
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function isKnownRoleName(value) {
  const normalized = normalizeRoleName(value);
  if (!normalized) return false;
  return KNOWN_ROLE_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function resolveRoleNameForAccess(user) {
  const explicitRoleName = String(user?.role_name || "").trim();
  if (isKnownRoleName(explicitRoleName)) {
    return explicitRoleName;
  }

  const roles = Array.isArray(user?.roles) ? user.roles : [];
  const hasBasicRole = roles.some((roleName) => normalizeRoleName(roleName) === "basic user");
  if (hasBasicRole) {
    return "Basic User";
  }

  return explicitRoleName;
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed) return null;

    const token = String(parsed?.token || "");
    if (!apiRuntime.useMockApi && token.startsWith("mock-token-")) {
      return null;
    }

    // Legacy real-api auth payloads may lack user.id (older backend login response),
    // which breaks role-scoped case inbox filtering. Force a clean re-login once.
    if (!apiRuntime.useMockApi && token && !Number(parsed?.user?.id)) {
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
      roleName: resolveRoleNameForAccess(user),
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
