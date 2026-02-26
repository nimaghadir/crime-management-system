import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { isOfficerRole } from "../lib/roleRouting";
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

export function TipOfficerQueuePage() {
  const { token, roleName } = useAuth();
  const officerView = isOfficerRole(roleName);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [noteById, setNoteById] = useState({});

  const pendingRows = useMemo(
    () => rows.filter((item) => String(item.status || "").toLowerCase() === "pending_officer"),
    [rows],
  );

  async function loadQueue() {
    if (!officerView) return;
    setLoading(true);
    setError("");
    try {
      const data = await api.listOfficerTipQueue(token);
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(formatUiApiError(err, "Failed to load officer tip queue."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadQueue();
  }, [officerView, token]);

  async function actOnTip(tipId, action) {
    setSavingId(Number(tipId));
    setError("");
    setMessage("");
    try {
      const updated = await api.officerReviewTip(token, tipId, {
        action,
        note: noteById[tipId] || "",
      });
      setRows((prev) => prev.map((item) => (Number(item.id) === Number(tipId) ? { ...item, ...updated } : item)));
      setMessage(
        action === "forward"
          ? `Tip #${tipId} forwarded to detective.`
          : `Tip #${tipId} rejected in officer review.`,
      );
    } catch (err) {
      setError(formatUiApiError(err, "Failed to review tip."));
    } finally {
      setSavingId(null);
    }
  }

  if (!officerView) {
    return (
      <section>
        <h1 className="font-display text-3xl uppercase text-brass">Officer Tip Review</h1>
        <p className="mt-2 text-zinc-400">Only Police Officer can do the first tip review step.</p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl uppercase text-brass">Officer Tip Review</h1>
          <p className="mt-1 text-zinc-400">
            First-stage review for citizen-submitted information before forwarding to detective.
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
              {tip.subject_type === "suspect" && tip.suspect_tracking_formula && (
                <div className="mt-2 rounded border border-zinc-800 bg-zinc-950/40 p-2 text-xs">
                  <p className="text-zinc-300">
                    Formula reward basis: {formatNumber(tip.suspect_tracking_formula.reward_amount_rial)} IRR
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

              <div className="mt-3">
                <label className="mb-2 block text-sm">Officer review note</label>
                <textarea
                  className="input min-h-20"
                  value={noteById[tip.id] ?? tip.officer_note ?? ""}
                  onChange={(e) => setNoteById((prev) => ({ ...prev, [tip.id]: e.target.value }))}
                  placeholder="Why valid / invalid?"
                />
              </div>

              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <button
                  className="btn-secondary"
                  onClick={() => actOnTip(tip.id, "reject")}
                  disabled={savingId === Number(tip.id)}
                >
                  {savingId === Number(tip.id) ? "Saving..." : "Reject"}
                </button>
                <button
                  className="btn-primary"
                  onClick={() => actOnTip(tip.id, "forward")}
                  disabled={savingId === Number(tip.id)}
                >
                  {savingId === Number(tip.id) ? "Saving..." : "Forward To Detective"}
                </button>
              </div>
            </article>
          ))}

        {!loading && !pendingRows.length && (
          <div className="card p-4 text-zinc-500">No pending tips for officer review.</div>
        )}
        {loading &&
          Array.from({ length: 2 }).map((_, index) => (
            <article key={`tip-officer-skeleton-${index}`} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <Skeleton className="h-4 w-52" />
                  <Skeleton className="mt-2 h-3 w-56" />
                  <Skeleton className="mt-2 h-3 w-44" />
                </div>
                <Skeleton className="h-6 w-28 rounded-full" />
              </div>
              <SkeletonLines className="mt-3" lines={3} />
              <div className="mt-3">
                <Skeleton className="mb-2 h-4 w-28" />
                <Skeleton className="h-20 w-full rounded" />
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <Skeleton className="h-10 w-20 rounded" />
                <Skeleton className="h-10 w-36 rounded" />
              </div>
            </article>
          ))}
      </div>
    </section>
  );
}
