import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export function DashboardPage() {
  const { token } = useAuth();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getBoardSummary(token);
        setStats(data);
      } catch (err) {
        setError(err.message || "Failed to load stats");
      }
    }
    load();
  }, [token]);

  return (
    <section>
      <h1 className="font-display text-3xl uppercase text-brass">Dashboard</h1>
      <p className="mb-6 mt-1 text-zinc-400">Detective board summary</p>

      {error && <p className="text-danger">{error}</p>}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-400">Open Assigned Cases</p>
          <p className="mt-2 text-3xl font-bold">{stats?.open_assigned_cases ?? "-"}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-400">Urgent Cases</p>
          <p className="mt-2 text-3xl font-bold">{stats?.urgent_cases ?? "-"}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-400">Pending Evidence</p>
          <p className="mt-2 text-3xl font-bold">{stats?.pending_evidence ?? "-"}</p>
        </div>
      </div>
    </section>
  );
}
