import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export function AdminRolesPage() {
  const { token } = useAuth();
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedRoleByUser, setSelectedRoleByUser] = useState({});
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setError("");
      try {
        const [r, u] = await Promise.all([api.listRoles(token), api.listUsers(token)]);
        setRoles(r);
        setUsers(u);
      } catch (err) {
        setError(err.message || "Admin endpoints require system admin role.");
      }
    }
    load();
  }, [token]);

  async function assign(userId) {
    const role = selectedRoleByUser[userId];
    if (!role) return;
    try {
      const updated = await api.assignRole(token, userId, Number(role));
      setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
    } catch (err) {
      setError(err.message || "Failed to assign role");
    }
  }

  return (
    <section>
      <h1 className="font-display text-3xl uppercase text-brass">Role Management</h1>
      <p className="mb-5 mt-1 text-zinc-400">System-admin only</p>

      {error && <p className="mb-3 text-danger">{error}</p>}

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
              onChange={(e) => setSelectedRoleByUser((prev) => ({ ...prev, [user.id]: e.target.value }))}
            >
              <option value="">Select role</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </select>
            <button className="btn-primary" onClick={() => assign(user.id)}>
              Assign
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
