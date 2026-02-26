import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { isCoronerRole } from "../lib/roleRouting";
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

function isImageAttachment(item) {
  return String(item?.mime_type || "").toLowerCase().startsWith("image/");
}

export function ForensicReviewPage() {
  const { token, roleName } = useAuth();
  const coronerView = isCoronerRole(roleName);
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState("pending_forensic");
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [formById, setFormById] = useState({});

  const visibleRows = useMemo(() => {
    if (filter === "all") return rows;
    return rows.filter((item) => String(item.status || "").toLowerCase() === filter.toLowerCase());
  }, [rows, filter]);

  async function loadQueue() {
    if (!coronerView) return;
    setLoading(true);
    setError("");
    try {
      const data = await api.listForensicEvidenceQueue(token);
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(formatUiApiError(err, "Failed to load forensic queue."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadQueue();
  }, [coronerView, token]);

  function getForm(evidenceId, row) {
    const existing = formById[evidenceId];
    if (existing) return existing;
    return {
      doctor_notes: String(row?.metadata?.doctor_notes || ""),
      identity_db_notes: String(row?.metadata?.identity_db_notes || ""),
      comment: String(row?.metadata?.forensic_comment || ""),
    };
  }

  function setFormField(evidenceId, key, value) {
    setFormById((prev) => ({
      ...prev,
      [evidenceId]: {
        ...getForm(evidenceId, rows.find((r) => Number(r.id) === Number(evidenceId))),
        [key]: value,
      },
    }));
  }

  async function submitReview(row, approved) {
    const evidenceId = Number(row.id);
    const form = getForm(evidenceId, row);
    setSavingId(evidenceId);
    setError("");
    setMessage("");
    try {
      const updated = await api.reviewForensicEvidence(token, evidenceId, {
        approved,
        doctor_notes: form.doctor_notes,
        identity_db_notes: form.identity_db_notes,
        comment: form.comment,
      });
      setRows((prev) => prev.map((item) => (Number(item.id) === evidenceId ? { ...item, ...updated } : item)));
      setMessage(
        approved
          ? `Biological evidence #${evidenceId} approved.`
          : `Biological evidence #${evidenceId} rejected and returned to detective.`,
      );
    } catch (err) {
      setError(formatUiApiError(err, "Failed to submit forensic review."));
    } finally {
      setSavingId(null);
    }
  }

  if (!coronerView) {
    return (
      <section>
        <h1 className="font-display text-3xl uppercase text-brass">Forensic Review</h1>
        <p className="mt-2 text-zinc-400">Only coroner / forensic roles can access this page.</p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl uppercase text-brass">Forensic Review</h1>
          <p className="mt-1 text-zinc-400">
            Review biological/medical evidence submitted by detectives and confirm or reject it.
          </p>
        </div>
        <div className="flex gap-2">
          <Link className="btn-secondary" to="/notifications">
            Notifications
          </Link>
          <button className="btn-secondary" onClick={loadQueue} disabled={loading || savingId !== null}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {error && <p className="text-danger">{error}</p>}
      {message && <p className="text-emerald-400">{message}</p>}

      <div className="flex items-center gap-2">
        <span className="text-sm text-zinc-400">Filter</span>
        <select className="input max-w-60" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="pending_forensic">Pending Forensic</option>
          <option value="forensic_rejected">Forensic Rejected</option>
          <option value="verified">Verified</option>
          <option value="all">All</option>
        </select>
      </div>

      <div className="space-y-4">
        {!loading &&
          visibleRows.map((row) => {
            const form = getForm(row.id, row);
            const attachments = Array.isArray(row.attachments) ? row.attachments : [];
            const pending = String(row.status || "").toLowerCase() === "pending_forensic";
            return (
              <article key={row.id} className="card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-brass">
                      Evidence #{row.id} {row.title ? `- ${row.title}` : ""}
                    </p>
                    <p className="text-sm text-zinc-400">
                      Case #{row.case} {row.case_title ? `- ${row.case_title}` : ""}
                    </p>
                    <p className="text-xs text-zinc-500">
                      Registered: {formatDate(row.registered_at || row.created_at)}
                    </p>
                  </div>
                  <StatusBadge value={row.status} />
                </div>

                <p className="mt-3 text-sm text-zinc-300">{row.description || "-"}</p>
                <p className="mt-2 text-sm">
                  <span className="text-zinc-400">Sample Type:</span>{" "}
                  {row.metadata?.sample_type || "-"}
                </p>

                <div className="mt-3 rounded border border-zinc-800 bg-zinc-900/40 p-3">
                  <p className="text-xs uppercase tracking-wide text-zinc-400">Attachments</p>
                  {attachments.length ? (
                    <div className="mt-2 space-y-1">
                      {attachments.map((file, index) => {
                        const fileUrl = String(file?.file_url || "").trim();
                        return (
                          <div key={`${row.id}-${file.id || index}`} className="rounded border border-zinc-800/80 p-2">
                            <p className="text-sm">
                              {fileUrl ? (
                                <a className="text-brass underline hover:text-brass/80" href={fileUrl} target="_blank" rel="noreferrer">
                                  {file.original_name || `Attachment #${index + 1}`}
                                </a>
                              ) : (
                                <span>{file.original_name || `Attachment #${index + 1}`}</span>
                              )}{" "}
                              <span className="text-zinc-500">({file.mime_type || "unknown"})</span>
                            </p>
                            {fileUrl && isImageAttachment(file) && (
                              <a href={fileUrl} target="_blank" rel="noreferrer" className="mt-2 block">
                                <img
                                  src={fileUrl}
                                  alt={file.original_name || `Attachment #${index + 1}`}
                                  className="max-h-44 rounded border border-zinc-800 object-contain"
                                  loading="lazy"
                                />
                              </a>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-zinc-500">No attachments found.</p>
                  )}
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm">Doctor Follow-up</label>
                    <textarea
                      className="input min-h-24"
                      value={form.doctor_notes}
                      onChange={(e) => setFormField(row.id, "doctor_notes", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm">Identity DB Follow-up</label>
                    <textarea
                      className="input min-h-24"
                      value={form.identity_db_notes}
                      onChange={(e) => setFormField(row.id, "identity_db_notes", e.target.value)}
                    />
                  </div>
                </div>

                <div className="mt-3">
                  <label className="mb-2 block text-sm">Forensic Comment</label>
                  <textarea
                    className="input min-h-20"
                    value={form.comment}
                    onChange={(e) => setFormField(row.id, "comment", e.target.value)}
                  />
                </div>

                <div className="mt-4 flex flex-wrap justify-end gap-2">
                  <button
                    className="btn-secondary"
                    onClick={() => submitReview(row, false)}
                    disabled={!pending || savingId === Number(row.id)}
                  >
                    {savingId === Number(row.id) ? "Saving..." : "Reject"}
                  </button>
                  <button
                    className="btn-primary"
                    onClick={() => submitReview(row, true)}
                    disabled={!pending || savingId === Number(row.id)}
                  >
                    {savingId === Number(row.id) ? "Saving..." : "Approve"}
                  </button>
                </div>
              </article>
            );
          })}

        {!loading && !visibleRows.length && (
          <div className="card p-4 text-zinc-500">No biological evidence in this queue.</div>
        )}
        {loading &&
          Array.from({ length: 2 }).map((_, index) => (
            <article key={`forensic-skeleton-${index}`} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Skeleton className="h-4 w-56" />
                  <Skeleton className="mt-2 h-3 w-48" />
                  <Skeleton className="mt-2 h-3 w-36" />
                </div>
                <Skeleton className="h-6 w-28 rounded-full" />
              </div>
              <SkeletonLines className="mt-3" lines={3} />
              <div className="mt-3 rounded border border-zinc-800 bg-zinc-900/40 p-3">
                <Skeleton className="h-3 w-24" />
                <SkeletonLines className="mt-2" lines={2} widths={["w-56", "w-48"]} />
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div>
                  <Skeleton className="mb-2 h-4 w-28" />
                  <Skeleton className="h-24 w-full rounded" />
                </div>
                <div>
                  <Skeleton className="mb-2 h-4 w-32" />
                  <Skeleton className="h-24 w-full rounded" />
                </div>
              </div>
              <div className="mt-3">
                <Skeleton className="mb-2 h-4 w-28" />
                <Skeleton className="h-20 w-full rounded" />
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <Skeleton className="h-10 w-24 rounded" />
                <Skeleton className="h-10 w-24 rounded" />
              </div>
            </article>
          ))}
      </div>
    </section>
  );
}
