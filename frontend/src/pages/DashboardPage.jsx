import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { StatusBadge } from "../components/StatusBadge";
import { isBasicUserRole, isComplainantRole } from "../lib/roleRouting";
import { formatUiApiError } from "../lib/uiApiError";

const CLOSED_CASE_STATUSES = new Set(["closed", "resolved", "voided"]);

function isActiveCase(status) {
  return !CLOSED_CASE_STATUSES.has(String(status || "").toLowerCase());
}

function sortByUpdatedDesc(items = []) {
  return [...items].sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));
}

export function DashboardPage() {
  const { token, roleName } = useAuth();
  const basicUserView = isBasicUserRole(roleName);
  const complainantView = isComplainantRole(roleName);
  const [stats, setStats] = useState(null);
  const [openCases, setOpenCases] = useState([]);
  const [myCases, setMyCases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [joiningCaseId, setJoiningCaseId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadPoliceSummary() {
    setLoading(true);
    setError("");
    try {
      const data = await api.getBoardSummary(token);
      setStats(data);
    } catch (err) {
      setError(formatUiApiError(err, "Failed to load stats"));
    } finally {
      setLoading(false);
    }
  }

  async function loadComplainantData() {
    setLoading(true);
    setError("");
    try {
      const [allCases, ownedCases] = await Promise.all([api.listCases(token), api.listMyCases(token)]);
      const activeCases = sortByUpdatedDesc((allCases || []).filter((item) => isActiveCase(item.status)));
      const myOwnedCases = sortByUpdatedDesc(ownedCases || []);
      setOpenCases(activeCases);
      setMyCases(myOwnedCases);
    } catch (err) {
      setError(formatUiApiError(err, "Failed to load complainant dashboard."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setMessage("");
    if (complainantView || basicUserView) {
      loadComplainantData();
      return;
    }
    loadPoliceSummary();
  }, [token, roleName]);

  const myCaseIds = useMemo(
    () => new Set((myCases || []).map((item) => Number(item.id))),
    [myCases],
  );

  async function joinCase(caseId) {
    setJoiningCaseId(Number(caseId));
    setError("");
    setMessage("");
    try {
      const response = await api.joinCaseAsComplainant(token, caseId);
      setMessage(response?.message || "You were added to this case.");
      await loadComplainantData();
    } catch (err) {
      setError(formatUiApiError(err, "Failed to join selected case."));
    } finally {
      setJoiningCaseId(null);
    }
  }

  if (!complainantView && !basicUserView) {
    return (
      <section>
        <h1 className="font-display text-3xl uppercase text-brass">Dashboard</h1>
        <p className="mb-6 mt-1 text-zinc-400">Detective board summary</p>

        {error && <p className="text-danger">{error}</p>}

        <div className="grid gap-4 md:grid-cols-3">
          <div className="card p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-400">Open Assigned Cases</p>
            <p className="mt-2 text-3xl font-bold">{loading ? "..." : stats?.open_assigned_cases ?? "-"}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-400">Urgent Cases</p>
            <p className="mt-2 text-3xl font-bold">{loading ? "..." : stats?.urgent_cases ?? "-"}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-400">Pending Evidence</p>
            <p className="mt-2 text-3xl font-bold">{loading ? "..." : stats?.pending_evidence ?? "-"}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl uppercase text-brass">
            {basicUserView ? "Basic User Dashboard" : "Complainant Dashboard"}
          </h1>
          <p className="mt-1 text-zinc-400">
            {basicUserView
              ? "View active cases and use Submit Tip for reward-eligible information."
              : "View active cases with minimal details, join an existing case, or register a new complaint."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {basicUserView ? (
            <Link to="/tips/submit" className="btn-primary">
              Submit Tip / Reward
            </Link>
          ) : (
            <>
              <Link to="/complaint" className="btn-primary">
                Register New Complaint
              </Link>
              <Link to="/cases" className="btn-secondary">
                Open My Cases
              </Link>
            </>
          )}
        </div>
      </div>

      {error && <p className="mb-3 text-danger">{error}</p>}
      {message && <p className="mb-3 text-emerald-400">{message}</p>}

      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <div className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-semibold">Active Cases</p>
            <button className="btn-secondary" onClick={loadComplainantData} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
          <p className="mb-3 text-xs text-zinc-400">
            Minimal details are shown intentionally: title, description, level, and status.
          </p>

          <div className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
            {(openCases || []).map((item) => {
              const joined = myCaseIds.has(Number(item.id));
              const disabled = joined || joiningCaseId === Number(item.id);
              return (
                <div key={item.id} className="rounded border border-zinc-700 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-brass">Case #{item.id}: {item.title}</p>
                    <StatusBadge value={item.status} />
                  </div>
                  <p className="mt-2 text-sm text-zinc-300">{item.description || "-"}</p>
                  <p className="mt-2 text-xs text-zinc-500">Level: {item.level ?? "-"}</p>
                  {!basicUserView && (
                    <button
                      className="btn-secondary mt-3"
                      onClick={() => joinCase(item.id)}
                      disabled={disabled}
                    >
                      {joined ? "Already Added" : joiningCaseId === Number(item.id) ? "Adding..." : "Add Me To This Case"}
                    </button>
                  )}
                </div>
              );
            })}
            {!loading && !openCases.length && (
              <p className="text-sm text-zinc-500">No active cases available for joining.</p>
            )}
          </div>
        </div>

        {!basicUserView && (
        <div className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-semibold">My Cases</p>
            <Link to="/cases" className="text-sm text-brass hover:underline">
              View all
            </Link>
          </div>

          <div className="space-y-2">
            {(myCases || []).slice(0, 8).map((item) => (
              <div key={item.id} className="rounded border border-zinc-700 p-3 text-sm">
                <p className="font-medium">{item.title}</p>
                <p className="mt-1 text-xs text-zinc-500">Level: {item.level ?? "-"}</p>
                <div className="mt-2">
                  <StatusBadge value={item.status} />
                </div>
              </div>
            ))}
            {!loading && !myCases.length && (
              <p className="text-sm text-zinc-500">You have no cases yet.</p>
            )}
          </div>
        </div>
        )}
      </div>
    </section>
  );
}
