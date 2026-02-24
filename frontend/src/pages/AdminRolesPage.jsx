import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { formatUiApiError } from "../lib/uiApiError";

export function AdminRolesPage() {
  const { token } = useAuth();
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedRoleByUser, setSelectedRoleByUser] = useState({});
  const [newRoleName, setNewRoleName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const [r, u] = await Promise.all([api.listRoles(token), api.listUsers(token)]);
      setRoles(Array.isArray(r) ? r : []);
      setUsers(Array.isArray(u) ? u : []);
    } catch (err) {
      setError(formatUiApiError(err, "Admin endpoints require system admin role."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [token]);

  const roleUsageById = useMemo(
    () =>
      users.reduce((acc, user) => {
        const id = Number(user.role_id);
        if (!id) return acc;
        acc[id] = (acc[id] || 0) + 1;
        return acc;
      }, {}),
    [users],
  );

  async function assign(userId) {
    const role = selectedRoleByUser[userId];
    if (!role) return;
    setError("");
    setMessage("");
    try {
      const updated = await api.assignRole(token, userId, Number(role));
      setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
      setMessage(`Role updated for ${updated.username}.`);
    } catch (err) {
      setError(formatUiApiError(err, "Failed to assign role"));
    }
  }

  async function createRole() {
    const name = newRoleName.trim();
    if (!name) return;
    setError("");
    setMessage("");
    try {
      const created = await api.createRole(token, { name });
      setRoles((prev) =>
        [...prev, created].sort((a, b) => String(a.name).localeCompare(String(b.name))),
      );
      setNewRoleName("");
      setMessage(`Role "${created.name}" created.`);
    } catch (err) {
      setError(formatUiApiError(err, "Failed to create role"));
    }
  }

  async function deleteRole(role) {
    const assignedUsers = roleUsageById[role.id] || 0;
    if (assignedUsers > 0) return;

    setError("");
    setMessage("");
    try {
      await api.deleteRole(token, role.id);
      setRoles((prev) => prev.filter((item) => item.id !== role.id));
      setSelectedRoleByUser((prev) => {
        const next = { ...prev };
        Object.entries(next).forEach(([userId, selected]) => {
          if (Number(selected) === Number(role.id)) {
            delete next[userId];
          }
        });
        return next;
      });
      setMessage(`Role "${role.name}" deleted.`);
    } catch (err) {
      setError(formatUiApiError(err, "Failed to delete role"));
    }
  }

  return (
    <section>
      <h1 className="font-display text-3xl uppercase text-brass">Role Management</h1>
      <p className="mb-5 mt-1 text-zinc-400">System-admin only</p>

      {error && <p className="mb-3 text-danger">{error}</p>}
      {message && <p className="mb-3 text-emerald-400">{message}</p>}

      <div className="mb-5 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="card p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold">Role Catalog</p>
            <button className="btn-secondary" onClick={load} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          <div className="mb-4 flex gap-2">
            <input
              className="input"
              placeholder="New role name"
              value={newRoleName}
              onChange={(event) => setNewRoleName(event.target.value)}
            />
            <button className="btn-primary" onClick={createRole} disabled={!newRoleName.trim()}>
              Add Role
            </button>
          </div>

          <div className="space-y-2">
            {roles.map((role) => {
              const assigned = roleUsageById[role.id] || 0;
              return (
                <div key={role.id} className="rounded border border-zinc-800 px-3 py-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{role.name}</p>
                      <p className="text-xs text-zinc-500">ID #{role.id}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-300">
                        {assigned} assigned
                      </span>
                      <button
                        className="btn-secondary"
                        onClick={() => deleteRole(role)}
                        disabled={assigned > 0}
                        title={assigned > 0 ? "Unassign users from this role before deleting." : ""}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {!roles.length && !loading && <p className="text-sm text-zinc-500">No roles found.</p>}
          </div>
        </div>

        <div className="space-y-3">
          {users.map((user) => (
            <div key={user.id} className="card flex flex-wrap items-center gap-3 p-3">
              <div className="min-w-40">
                <p className="font-medium">{user.username}</p>
                <p className="text-xs text-zinc-400">Current: {user.role_name || "None"}</p>
              </div>
              <select
                className="input max-w-64"
                value={selectedRoleByUser[user.id] || ""}
                onChange={(e) =>
                  setSelectedRoleByUser((prev) => ({ ...prev, [user.id]: e.target.value }))
                }
              >
                <option value="">Select role</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
              <button className="btn-primary" onClick={() => assign(user.id)}>
                Assign
              </button>
            </div>
          ))}
          {!users.length && !loading && <p className="text-sm text-zinc-500">No users found.</p>}
        </div>
      </div>
    </section>
  );
}
