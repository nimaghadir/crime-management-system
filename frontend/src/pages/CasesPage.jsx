import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { StatusBadge } from "../components/StatusBadge";
import { isComplainantRole } from "../lib/roleRouting";

export function CasesPage() {
  const { token, user, roleName } = useAuth();
  const complainantView = isComplainantRole(roleName);
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadCases(currentStatus = status) {
    setLoading(true);
    setError("");
    try {
      const loader = complainantView ? api.listMyCases : api.listCases;
      const data = await loader(token, currentStatus ? { status: currentStatus } : {});
      setItems(data);
    } catch (err) {
      setError(err.message || "Failed to load cases");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCases();
  }, [complainantView, token]);

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl uppercase text-brass">
            {complainantView ? "My Cases" : "Case Inbox"}
          </h1>
          <p className="text-zinc-400">
            {complainantView
              ? "Only cases linked to your account are listed here."
              : "Filter and inspect assigned/open records"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <button className="btn-secondary" onClick={() => loadCases(status)}>
            Apply
          </button>
        </div>
      </div>

      {error && <p className="mb-3 text-danger">{error}</p>}

      <div className="overflow-x-auto rounded-lg border border-zinc-700">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-zinc-900 text-zinc-300">
            <tr>
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Level</th>
              <th className="px-3 py-2">Updated</th>
            </tr>
          </thead>
          <tbody>
            {!loading &&
              items.map((item) => {
                const pendingMyApproval =
                  !complainantView && item.assigned_to === user?.id && item.status === "open";
                return (
                  <tr
                    key={item.id}
                    className={`border-t border-zinc-800 ${pendingMyApproval ? "bg-brass/15" : "hover:bg-zinc-900/40"}`}
                  >
                    <td className="px-3 py-2">{item.id}</td>
                    <td className="px-3 py-2 font-medium">
                      <Link className="text-brass hover:underline" to={`/cases/${item.id}`}>
                        {item.title}
                      </Link>
                      {pendingMyApproval && (
                        <span className="ml-2 rounded bg-brass/25 px-2 py-0.5 text-xs text-brass">Pending My Approval</span>
                      )}
                    </td>
                    <td className="px-3 py-2"><StatusBadge value={item.status} /></td>
                    <td className="px-3 py-2">{item.level}</td>
                    <td className="px-3 py-2">{new Date(item.updated_at).toLocaleString()}</td>
                  </tr>
                );
              })}
            {!loading && !items.length && (
              <tr>
                <td className="px-3 py-6 text-zinc-400" colSpan={5}>
                  No cases found.
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td className="px-3 py-6 text-zinc-400" colSpan={5}>
                  Loading...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
