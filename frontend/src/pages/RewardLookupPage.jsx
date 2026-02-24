import { useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { isPoliceRankRole } from "../lib/roleRouting";

function formatDate(value) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

function formatNumber(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "-";
  return new Intl.NumberFormat().format(numeric);
}

export function RewardLookupPage() {
  const { token, roleName } = useAuth();
  const policeRankView = isPoliceRankRole(roleName);
  const [nationalId, setNationalId] = useState("");
  const [rewardCode, setRewardCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  async function lookup(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await api.lookupReward(token, {
        national_id: nationalId,
        reward_code: rewardCode,
      });
      setResult(data);
    } catch (err) {
      setError(err.message || "Lookup failed.");
    } finally {
      setLoading(false);
    }
  }

  if (!policeRankView) {
    return (
      <section>
        <h1 className="font-display text-3xl uppercase text-brass">Reward Lookup</h1>
        <p className="mt-2 text-zinc-400">Only police ranks can access reward lookup.</p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div>
        <h1 className="font-display text-3xl uppercase text-brass">Reward Lookup</h1>
        <p className="mt-1 text-zinc-400">
          Lookup reward amount and user info using National ID + Unique Reward Code.
        </p>
      </div>

      <form className="card max-w-2xl p-4" onSubmit={lookup}>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm">National ID</label>
            <input
              className="input"
              value={nationalId}
              onChange={(e) => setNationalId(e.target.value)}
              placeholder="e.g. 1000000013"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm">Reward Code</label>
            <input
              className="input"
              value={rewardCode}
              onChange={(e) => setRewardCode(e.target.value)}
              placeholder="e.g. RW-2026-0001"
            />
          </div>
        </div>
        <button className="btn-primary mt-4" disabled={loading}>
          {loading ? "Searching..." : "Lookup Reward"}
        </button>
      </form>

      {error && <p className="text-danger">{error}</p>}

      {result?.payment && (
        <div className="card p-4">
          <p className="mb-3 font-semibold text-brass">Reward Record</p>
          <div className="grid gap-2 md:grid-cols-2">
            <p className="text-sm"><span className="text-zinc-400">Code:</span> {result.payment.code}</p>
            <p className="text-sm"><span className="text-zinc-400">Amount:</span> {formatNumber(result.payment.amount)} IRR</p>
            <p className="text-sm"><span className="text-zinc-400">Status:</span> {result.payment.status}</p>
            <p className="text-sm"><span className="text-zinc-400">Created:</span> {formatDate(result.payment.created_at)}</p>
            <p className="text-sm"><span className="text-zinc-400">Subject Type:</span> {result.payment.subject_type || result.tip?.subject_type || "-"}</p>
            <p className="text-sm"><span className="text-zinc-400">Case ID:</span> {result.payment.case_id ?? "-"}</p>
            <p className="text-sm"><span className="text-zinc-400">Tip ID:</span> {result.payment.tip_id ?? "-"}</p>
            <p className="text-sm"><span className="text-zinc-400">Suspect ID:</span> {result.payment.suspect_id ?? result.tip?.suspect_id ?? "-"}</p>
          </div>

          <div className="mt-4 rounded border border-zinc-700 p-3">
            <p className="mb-2 text-sm font-semibold">User Info</p>
            {result.user ? (
              <div className="grid gap-2 md:grid-cols-2">
                <p className="text-sm"><span className="text-zinc-400">Username:</span> {result.user.username || "-"}</p>
                <p className="text-sm"><span className="text-zinc-400">Name:</span> {`${result.user.first_name || ""} ${result.user.last_name || ""}`.trim() || "-"}</p>
                <p className="text-sm"><span className="text-zinc-400">National ID:</span> {result.user.national_id || "-"}</p>
                <p className="text-sm"><span className="text-zinc-400">Phone:</span> {result.user.phone || result.user.phone_number || "-"}</p>
              </div>
            ) : (
              <p className="text-sm text-zinc-500">No user info attached.</p>
            )}
          </div>

          {result.tip && (
            <div className="mt-4 rounded border border-zinc-700 p-3">
              <p className="mb-2 text-sm font-semibold">Tip Summary</p>
              <p className="text-sm"><span className="text-zinc-400">Subject:</span> {result.tip.subject_label || "-"}</p>
              <p className="text-sm"><span className="text-zinc-400">Title:</span> {result.tip.title || "-"}</p>
              <p className="text-sm"><span className="text-zinc-400">Status:</span> {result.tip.status || "-"}</p>
              <p className="mt-1 text-sm text-zinc-300">{result.tip.description || "-"}</p>
            </div>
          )}

          {result.suspect && (
            <div className="mt-4 rounded border border-zinc-700 p-3">
              <p className="mb-2 text-sm font-semibold">Suspect Summary</p>
              <div className="grid gap-2 md:grid-cols-2">
                <p className="text-sm"><span className="text-zinc-400">Name:</span> {result.suspect.name || "-"}</p>
                <p className="text-sm"><span className="text-zinc-400">National ID:</span> {result.suspect.national_id || "-"}</p>
                <p className="text-sm"><span className="text-zinc-400">Status:</span> {result.suspect.status || "-"}</p>
                <p className="text-sm"><span className="text-zinc-400">Tracking Started:</span> {formatDate(result.suspect.tracking_started_at || result.suspect.identified_at)}</p>
              </div>
              {result.suspect_tracking_formula && (
                <div className="mt-3 rounded border border-zinc-800 bg-zinc-950/40 p-2 text-xs">
                  <p className="text-zinc-300">
                    Formula basis: 20,000,000 x maxD({result.suspect_tracking_formula.max_tracking_days}) x maxL({result.suspect_tracking_formula.max_level_weight})
                  </p>
                  <p className="text-zinc-500">
                    Expected formula amount: {formatNumber(result.suspect_tracking_formula.reward_amount_rial)} IRR
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
