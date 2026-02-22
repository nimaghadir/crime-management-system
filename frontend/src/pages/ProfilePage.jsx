import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { isPoliceRole } from "../lib/roleRouting";

export function ProfilePage() {
  const { user, roleName, token } = useAuth();
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.listPaymentRecords(token).then(setPayments).catch(() => setPayments([]));
    api.getBoardSummary(token).then(setStats).catch(() => setStats(null));
  }, [token]);

  const isPolice = isPoliceRole(roleName);

  return (
    <section>
      <h1 className="font-display text-3xl uppercase text-brass">Profile</h1>
      <p className="mb-6 mt-1 text-zinc-400">User profile and badge</p>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="card p-4">
          <p><span className="text-zinc-400">Username:</span> {user?.username}</p>
          <p><span className="text-zinc-400">Role:</span> {roleName || "No role"}</p>
          <p className="mt-2 text-sm">
            {isPolice ? (
              <span className="rounded bg-brass/20 px-2 py-1 text-brass">Police Badge Active</span>
            ) : (
              <span className="rounded bg-zinc-800 px-2 py-1 text-zinc-300">Citizen Profile</span>
            )}
          </p>

          <div className="mt-4 rounded border border-zinc-700 p-3">
            <p className="text-xs uppercase tracking-wide text-zinc-500">ID Card</p>
            <p className="font-display text-xl uppercase text-paper">{user?.username}</p>
            <p className="text-sm text-zinc-400">{roleName || "Unassigned"}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-4">
            <p className="mb-2 text-sm text-zinc-400">My board stats</p>
            {stats ? (
              <div className="grid grid-cols-3 gap-2 text-center text-sm">
                <div className="rounded border border-zinc-700 p-2">
                  <p className="text-zinc-500">Open</p>
                  <p className="text-lg text-brass">{stats.open_assigned_cases}</p>
                </div>
                <div className="rounded border border-zinc-700 p-2">
                  <p className="text-zinc-500">Urgent</p>
                  <p className="text-lg text-brass">{stats.urgent_cases}</p>
                </div>
                <div className="rounded border border-zinc-700 p-2">
                  <p className="text-zinc-500">Evidence</p>
                  <p className="text-lg text-brass">{stats.pending_evidence}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-zinc-500">Stats unavailable</p>
            )}
          </div>

          <div className="card p-4">
            <p className="mb-2 text-sm text-zinc-400">Payment / reward records (mock fallback)</p>
            <div className="space-y-2">
              {payments.map((item) => (
                <div key={item.id} className="rounded border border-zinc-700 p-2 text-sm">
                  {item.type} - {item.amount} ({item.status})
                </div>
              ))}
              {!payments.length && <p className="text-sm text-zinc-400">No records.</p>}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
