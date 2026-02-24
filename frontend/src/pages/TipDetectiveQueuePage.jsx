import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { isDetectiveRole } from "../lib/roleRouting";
import { StatusBadge } from "../components/StatusBadge";

function formatDate(value) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

export function TipDetectiveQueuePage() {
  const { token, roleName } = useAuth();
  const detectiveView = isDetectiveRole(roleName);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [noteById, setNoteById] = useState({});
  const [rewardAmountById, setRewardAmountById] = useState({});

  const pendingRows = useMemo(
    () => rows.filter((item) => String(item.status || "").toLowerCase() === "pending_detective"),
    [rows],
  );

  async function loadQueue() {
    if (!detectiveView) return;
    setLoading(true);
    setError("");
    try {
      const data = await api.listDetectiveTipQueue(token);
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to load detective tip queue.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadQueue();
  }, [detectiveView, token]);

  async function reviewTip(tipId, action) {
    setSavingId(Number(tipId));
    setError("");
    setMessage("");
    try {
      const payload = {
        action,
        note: noteById[tipId] || "",
      };
      if (action === "approve") {
        payload.reward_amount = Number(rewardAmountById[tipId] || 0);
      }
      const updated = await api.detectiveReviewTip(token, tipId, payload);
      setRows((prev) => prev.map((item) => (Number(item.id) === Number(tipId) ? { ...item, ...updated } : item)));
      if (action === "approve") {
        setMessage(`Tip #${tipId} approved. Reward code generated: ${updated?.reward_code || "-"}`);
      } else {
        setMessage(`Tip #${tipId} rejected by detective review.`);
      }
    } catch (err) {
      setError(err.message || "Failed to review tip.");
    } finally {
      setSavingId(null);
    }
  }

  if (!detectiveView) {
    return (
      <section>
        <h1 className="font-display text-3xl uppercase text-brass">Detective Tip Review</h1>
        <p className="mt-2 text-zinc-400">Only detectives can perform the final tip review.</p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl uppercase text-brass">Detective Tip Review</h1>
          <p className="mt-1 text-zinc-400">
            Final review for forwarded citizen information. Approve to generate reward code.
          </p>
        </div>
        <button className="btn-secondary" onClick={loadQueue} disabled={loading || savingId !== null}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && <p className="text-danger">{error}</p>}
      {message && <p className="text-emerald-400">{message}</p>}

      <div className="space-y-4">
        {!loading &&
          pendingRows.map((tip) => (
            <article key={tip.id} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-brass">Tip #{tip.id} - {tip.title}</p>
                  <p className="text-sm text-zinc-400">
                    Case #{tip.case_id} {tip.case_title ? `- ${tip.case_title}` : ""}
                  </p>
                  <p className="text-xs text-zinc-500">
                    Submitted by {tip.submitter_name || "user"} | {formatDate(tip.created_at)}
                  </p>
                </div>
                <StatusBadge value={tip.status} />
              </div>

              <p className="mt-3 text-sm text-zinc-300">{tip.description}</p>
              {tip.suspect_hint && (
                <p className="mt-1 text-sm">
                  <span className="text-zinc-400">Suspect hint:</span> {tip.suspect_hint}
                </p>
              )}
              {tip.officer_note && (
                <p className="mt-2 text-sm">
                  <span className="text-zinc-400">Officer note:</span> {tip.officer_note}
                </p>
              )}

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm">Detective note</label>
                  <textarea
                    className="input min-h-20"
                    value={noteById[tip.id] ?? tip.detective_note ?? ""}
                    onChange={(e) => setNoteById((prev) => ({ ...prev, [tip.id]: e.target.value }))}
                    placeholder="Why useful / not useful?"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm">Reward amount (for approval)</label>
                  <input
                    className="input"
                    type="number"
                    min={1}
                    step="1"
                    value={rewardAmountById[tip.id] ?? ""}
                    onChange={(e) => setRewardAmountById((prev) => ({ ...prev, [tip.id]: e.target.value }))}
                    placeholder="e.g. 250"
                  />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <button
                  className="btn-secondary"
                  onClick={() => reviewTip(tip.id, "reject")}
                  disabled={savingId === Number(tip.id)}
                >
                  {savingId === Number(tip.id) ? "Saving..." : "Reject"}
                </button>
                <button
                  className="btn-primary"
                  onClick={() => reviewTip(tip.id, "approve")}
                  disabled={savingId === Number(tip.id)}
                >
                  {savingId === Number(tip.id) ? "Saving..." : "Approve + Generate Reward"}
                </button>
              </div>
            </article>
          ))}

        {!loading && !pendingRows.length && (
          <div className="card p-4 text-zinc-500">No forwarded tips waiting for detective review.</div>
        )}
        {loading && <div className="card p-4 text-zinc-400">Loading detective queue...</div>}
      </div>
    </section>
  );
}
