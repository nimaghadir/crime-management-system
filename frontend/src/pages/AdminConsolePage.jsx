import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api, apiRuntime } from "../lib/api";

const emptyData = {
  summary: {
    users: 0,
    roles: 0,
    cases: 0,
    open_cases: 0,
    resolved_cases: 0,
    evidence: 0,
    attachments: 0,
    suspects: 0,
    actions: 0,
    notifications: 0,
    unread_notifications: 0,
  },
  recent_cases: [],
  recent_users: [],
  role_distribution: [],
  mocked: false,
};

const summaryCards = [
  { key: "users", label: "Users" },
  { key: "roles", label: "Roles" },
  { key: "cases", label: "Cases" },
  { key: "open_cases", label: "Open Cases" },
  { key: "resolved_cases", label: "Resolved Cases" },
  { key: "evidence", label: "Evidence Items" },
  { key: "suspects", label: "Suspects" },
  { key: "actions", label: "Audit Actions" },
  { key: "unread_notifications", label: "Unread Notifications" },
];

export function AdminConsolePage() {
  const { token } = useAuth();
  const [data, setData] = useState(emptyData);
  const [testAccounts, setTestAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const [adminData, accounts] = await Promise.all([
        api.getAdminConsoleData(token),
        api.getMockTestingAccounts(),
      ]);
      setData({
        ...emptyData,
        ...(adminData || {}),
        summary: {
          ...emptyData.summary,
          ...(adminData?.summary || {}),
        },
        recent_cases: Array.isArray(adminData?.recent_cases) ? adminData.recent_cases : [],
        recent_users: Array.isArray(adminData?.recent_users) ? adminData.recent_users : [],
        role_distribution: Array.isArray(adminData?.role_distribution)
          ? adminData.role_distribution
          : [],
      });
      setTestAccounts(Array.isArray(accounts) ? accounts : []);
    } catch (err) {
      setError(err.message || "Failed to load admin console data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [token]);

  const registryRows = useMemo(
    () => [
      { model: "Users", count: data.summary.users, link: "/admin/roles" },
      { model: "Roles", count: data.summary.roles, link: "/admin/roles" },
      { model: "Cases", count: data.summary.cases, link: "/cases" },
      { model: "Evidence", count: data.summary.evidence, link: "/cases" },
      { model: "Suspects", count: data.summary.suspects, link: "/cases" },
      { model: "Investigation Actions", count: data.summary.actions, link: "/reports" },
      { model: "Notifications", count: data.summary.notifications, link: "/notifications" },
    ],
    [data.summary],
  );

  async function resetMockStore() {
    setResetting(true);
    setError("");
    setMessage("");
    try {
      const response = await api.resetMockStore(token);
      setMessage(response?.message || "Mock storage has been reset.");
      await load();
    } catch (err) {
      setError(err.message || "Failed to reset mock storage.");
    } finally {
      setResetting(false);
    }
  }

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl uppercase text-brass">Admin Console</h1>
          <p className="mt-1 text-zinc-400">
            Custom admin panel inspired by Django admin, implemented fully in this frontend.
          </p>
        </div>

        <div className="card min-w-64 p-3 text-sm">
          <p className="text-zinc-400">Runtime Mode</p>
          <p className="mt-1">
            API: <span className="text-brass">{apiRuntime.useMockApi ? "Mock" : "Real"}</span>
          </p>
          <p>
            Fallback:{" "}
            <span className="text-brass">{apiRuntime.useMockFallback ? "Enabled" : "Disabled"}</span>
          </p>
          {data.mocked && <p className="mt-1 text-xs text-brass">Data currently includes mocked responses.</p>}
        </div>
      </div>

      {error && <p className="mb-4 text-danger">{error}</p>}
      {message && <p className="mb-4 text-emerald-400">{message}</p>}

      <div className="mb-6 grid gap-3 md:grid-cols-3 xl:grid-cols-5">
        {summaryCards.map((item) => (
          <div key={item.key} className="card p-3">
            <p className="text-xs uppercase tracking-wide text-zinc-500">{item.label}</p>
            <p className="mt-2 text-2xl font-semibold text-paper">
              {loading ? "..." : data.summary[item.key] ?? 0}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.25fr_1fr]">
        <div className="space-y-4">
          <div className="card p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-semibold">Model Registry</p>
              <div className="flex gap-2">
                <Link to="/admin/roles" className="btn-secondary">
                  Manage Roles
                </Link>
                <Link to="/reports" className="btn-secondary">
                  Reports
                </Link>
              </div>
            </div>

            <div className="overflow-x-auto rounded border border-zinc-800">
              <table className="min-w-full text-sm">
                <thead className="bg-zinc-900/80 text-zinc-300">
                  <tr>
                    <th className="px-3 py-2 text-left">Model</th>
                    <th className="px-3 py-2 text-left">Records</th>
                    <th className="px-3 py-2 text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {registryRows.map((row) => (
                    <tr key={row.model} className="border-t border-zinc-800">
                      <td className="px-3 py-2">{row.model}</td>
                      <td className="px-3 py-2">{loading ? "..." : row.count}</td>
                      <td className="px-3 py-2">
                        <Link to={row.link} className="text-brass hover:underline">
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card p-4">
            <p className="mb-3 font-semibold">Recent Cases</p>
            <div className="space-y-2">
              {data.recent_cases.map((item) => (
                <div key={item.id} className="rounded border border-zinc-800 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-brass">Case #{item.id}</p>
                    <p className="text-xs uppercase text-zinc-400">{item.status}</p>
                  </div>
                  <p className="mt-1">{item.title}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Updated: {new Date(item.updated_at).toLocaleString()}
                  </p>
                </div>
              ))}
              {!loading && !data.recent_cases.length && (
                <p className="text-sm text-zinc-500">No recent cases available.</p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-4">
            <p className="mb-3 font-semibold">Recent Users</p>
            <div className="space-y-2">
              {data.recent_users.map((item) => (
                <div key={item.id} className="rounded border border-zinc-800 p-3">
                  <p className="font-medium">{item.username}</p>
                  <p className="text-xs text-zinc-400">{item.role_name || "No role"}</p>
                  <p className="text-xs text-zinc-500">{item.email}</p>
                </div>
              ))}
              {!loading && !data.recent_users.length && (
                <p className="text-sm text-zinc-500">No recent users available.</p>
              )}
            </div>
          </div>

          <div className="card p-4">
            <p className="mb-3 font-semibold">Role Distribution</p>
            <div className="space-y-2">
              {data.role_distribution.map((item) => (
                <div
                  key={item.role_id}
                  className="flex items-center justify-between rounded border border-zinc-800 px-3 py-2 text-sm"
                >
                  <p>{item.role_name}</p>
                  <p className="text-brass">{item.user_count}</p>
                </div>
              ))}
              {!loading && !data.role_distribution.length && (
                <p className="text-sm text-zinc-500">No role distribution data.</p>
              )}
            </div>
          </div>

          {(apiRuntime.useMockApi || apiRuntime.useMockFallback) && (
            <div className="card p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="font-semibold">Mock Data Tools</p>
                <button className="btn-secondary" onClick={resetMockStore} disabled={resetting}>
                  {resetting ? "Resetting..." : "Reset Mock Store"}
                </button>
              </div>
              <p className="mb-3 text-xs text-zinc-400">
                Use these seeded accounts to test role-based flows quickly.
              </p>
              <div className="space-y-2">
                {testAccounts.map((account) => (
                  <div key={account.email} className="rounded border border-zinc-800 p-2 text-xs">
                    <p className="text-zinc-300">
                      <span className="text-zinc-500">Role:</span> {account.role_name}
                    </p>
                    <p className="text-zinc-300">
                      <span className="text-zinc-500">Identifier:</span> {account.identifier}
                    </p>
                    <p className="text-zinc-300">
                      <span className="text-zinc-500">Password:</span> {account.password}
                    </p>
                  </div>
                ))}
                {!testAccounts.length && (
                  <p className="text-sm text-zinc-500">Mock account list is unavailable.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
