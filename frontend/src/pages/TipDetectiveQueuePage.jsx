import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { isDetectiveRole } from "../lib/roleRouting";
import { StatusBadge } from "../components/StatusBadge";
import { formatUiApiError } from "../lib/uiApiError";
import { Skeleton, SkeletonLines } from "../components/Skeleton";

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

function isImageAttachment(att) {
  return String(att?.mime_type || "").toLowerCase().startsWith("image/");
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
      setError(formatUiApiError(err, "Failed to load detective tip queue."));
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
        const target = rows.find((item) => Number(item.id) === Number(tipId));
        if (String(target?.subject_type || "").toLowerCase() !== "suspect") {
          payload.reward_amount = Number(rewardAmountById[tipId] || 0);
        }
      }
      const updated = await api.detectiveReviewTip(token, tipId, payload);
      setRows((prev) => prev.map((item) => (Number(item.id) === Number(tipId) ? { ...item, ...updated } : item)));
      if (action === "approve") {
        setMessage(`Tip #${tipId} approved. Reward code generated: ${updated?.reward_code || "-"}`);
      } else {
        setMessage(`Tip #${tipId} rejected by detective review.`);
      }
    } catch (err) {
      setError(formatUiApiError(err, "Failed to review tip."));
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
                    {tip.subject_label || `Case #${tip.case_id} ${tip.case_title ? `- ${tip.case_title}` : ""}`}
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
              {tip.subject_type === "suspect" && tip.suspect_tracking_formula && (
                <div className="mt-2 rounded border border-emerald-500/20 bg-emerald-950/10 p-2 text-xs">
                  <p className="text-emerald-300">
                    Suspect reward is auto-computed from tracking formula: {formatNumber(tip.suspect_tracking_formula.reward_amount_rial)} IRR
                  </p>
                  <p className="text-zinc-500">
                    20,000,000 x maxD({tip.suspect_tracking_formula.max_tracking_days}) x maxL({tip.suspect_tracking_formula.max_level_weight})
                  </p>
                </div>
              )}

              {Array.isArray(tip.attachments) && tip.attachments.length > 0 && (
                <div className="mt-3 rounded border border-zinc-800 bg-zinc-900/40 p-3">
                  <p className="text-xs uppercase tracking-wide text-zinc-400">Attachments</p>
                  <div className="mt-2 space-y-1">
                    {tip.attachments.map((att, index) => {
                      const fileUrl = String(att?.file_url || "").trim();
                      return (
                        <div key={`${tip.id}-${att.id || index}`} className="rounded border border-zinc-800/80 p-2">
                          <p className="text-sm">
                            {fileUrl ? (
                              <a className="text-brass underline hover:text-brass/80" href={fileUrl} target="_blank" rel="noreferrer">
                                {att.original_name || `Attachment #${index + 1}`}
                              </a>
                            ) : (
                              <span>{att.original_name || `Attachment #${index + 1}`}</span>
                            )}{" "}
                            <span className="text-zinc-500">({att.mime_type || "unknown"})</span>
                          </p>
                          {fileUrl && isImageAttachment(att) && (
                            <a href={fileUrl} target="_blank" rel="noreferrer" className="mt-2 block">
                              <img
                                src={fileUrl}
                                alt={att.original_name || `Tip attachment ${index + 1}`}
                                className="max-h-40 rounded border border-zinc-800 object-contain"
                                loading="lazy"
                              />
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
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
                  <label className="mb-2 block text-sm">
                    {tip.subject_type === "suspect"
                      ? "Reward amount (auto from suspect tracking formula)"
                      : "Reward amount (for approval)"}
                  </label>
                  <input
                    className="input"
                    type="number"
                    min={1}
                    step="1"
                    value={
                      tip.subject_type === "suspect"
                        ? tip.suspect_tracking_formula?.reward_amount_rial ?? tip.suggested_reward_amount ?? ""
                        : rewardAmountById[tip.id] ?? ""
                    }
                    onChange={(e) => setRewardAmountById((prev) => ({ ...prev, [tip.id]: e.target.value }))}
                    placeholder={tip.subject_type === "suspect" ? "Auto-calculated" : "e.g. 250"}
                    disabled={tip.subject_type === "suspect"}
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
        {loading &&
          Array.from({ length: 2 }).map((_, index) => (
            <article key={`tip-detective-skeleton-${index}`} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <Skeleton className="h-4 w-56" />
                  <Skeleton className="mt-2 h-3 w-56" />
                  <Skeleton className="mt-2 h-3 w-40" />
                </div>
                <Skeleton className="h-6 w-32 rounded-full" />
              </div>
              <SkeletonLines className="mt-3" lines={4} />
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div>
                  <Skeleton className="mb-2 h-4 w-24" />
                  <Skeleton className="h-20 w-full rounded" />
                </div>
                <div>
                  <Skeleton className="mb-2 h-4 w-36" />
                  <Skeleton className="h-10 w-full rounded" />
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <Skeleton className="h-10 w-20 rounded" />
                <Skeleton className="h-10 w-44 rounded" />
              </div>
            </article>
          ))}
      </div>
    </section>
  );
}
