import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { isBasicUserRole } from "../lib/roleRouting";
import { StatusBadge } from "../components/StatusBadge";

function isActiveCase(status) {
  const s = String(status || "").trim().toLowerCase();
  return !["closed", "resolved", "voided"].includes(s);
}

function makeAttachmentRow() {
  return { file: null, file_url: "", mime_type: "", original_name: "" };
}

function normalizeAttachments(rows = []) {
  return (Array.isArray(rows) ? rows : [])
    .map((row) => ({
      file: row.file || null,
      file_url: String(row.file_url || "").trim(),
      mime_type: String(row.mime_type || row.file?.type || "").trim(),
      original_name: String(row.original_name || row.file?.name || "").trim(),
    }))
    .filter((row) => row.file || row.file_url);
}

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

export function TipSubmitPage() {
  const { token, roleName } = useAuth();
  const basicUserView = isBasicUserRole(roleName);
  const [cases, setCases] = useState([]);
  const [suspects, setSuspects] = useState([]);
  const [intenseTrackingRows, setIntenseTrackingRows] = useState([]);
  const [myTips, setMyTips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    subject_type: "case",
    case_id: "",
    suspect_id: "",
    title: "",
    description: "",
    suspect_hint: "",
    attachments: [makeAttachmentRow()],
  });

  const activeCases = useMemo(
    () => (Array.isArray(cases) ? cases : []).filter((item) => isActiveCase(item.status)),
    [cases],
  );
  const suspectOptions = useMemo(
    () =>
      (Array.isArray(suspects) ? suspects : []).sort((a, b) =>
        `${a.name || ""}`.localeCompare(`${b.name || ""}`),
      ),
    [suspects],
  );
  const selectedSuspect = useMemo(
    () => suspectOptions.find((item) => Number(item.id) === Number(form.suspect_id)) || null,
    [suspectOptions, form.suspect_id],
  );
  const selectedIntenseRow = useMemo(() => {
    if (!selectedSuspect) return null;
    return (
      (Array.isArray(intenseTrackingRows) ? intenseTrackingRows : []).find(
        (item) =>
          Number(item.suspect_id) === Number(selectedSuspect.id) ||
          (selectedSuspect.national_id && item.national_id === selectedSuspect.national_id),
      ) || null
    );
  }, [intenseTrackingRows, selectedSuspect]);

  async function loadData() {
    if (!basicUserView) return;
    setLoading(true);
    setError("");
    try {
      const [caseRows, tipRows, intenseRows] = await Promise.all([
        api.listCases(token),
        api.listMyTips(token),
        api.listIntenseTrackingSuspects(token).catch(() => []),
      ]);
      const normalizedCases = Array.isArray(caseRows) ? caseRows : [];
      const activeCaseRows = normalizedCases.filter((item) => isActiveCase(item.status));
      const suspectCollections = await Promise.all(
        activeCaseRows.map(async (caseItem) => {
          try {
            const rows = await api.listSuspects(token, caseItem.id);
            return (Array.isArray(rows) ? rows : []).map((suspect) => ({
              ...suspect,
              case_id: caseItem.id,
              case_title: caseItem.title,
              case_status: caseItem.status,
              case_level: caseItem.level,
            }));
          } catch {
            return [];
          }
        }),
      );
      setCases(Array.isArray(caseRows) ? caseRows : []);
      setSuspects(suspectCollections.flat());
      setIntenseTrackingRows(Array.isArray(intenseRows) ? intenseRows : []);
      setMyTips(Array.isArray(tipRows) ? tipRows : []);
      setForm((prev) => ({
        ...prev,
        case_id:
          prev.case_id ||
          String(activeCaseRows[0]?.id || ""),
        suspect_id:
          prev.suspect_id ||
          String((suspectCollections.flat()[0]?.id || "")),
      }));
    } catch (err) {
      setError(err.message || "Failed to load tip submission page.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [basicUserView, token]);

  function setAttachmentField(index, key, value) {
    setForm((prev) => {
      const next = [...prev.attachments];
      next[index] = { ...next[index], [key]: value };
      return { ...prev, attachments: next };
    });
  }

  function setAttachmentFile(index, file) {
    setForm((prev) => {
      const next = [...prev.attachments];
      next[index] = {
        ...next[index],
        file: file || null,
        mime_type: file?.type || next[index]?.mime_type || "",
        original_name: file?.name || next[index]?.original_name || "",
      };
      return { ...prev, attachments: next };
    });
  }

  function addAttachmentRow() {
    setForm((prev) => ({ ...prev, attachments: [...prev.attachments, makeAttachmentRow()] }));
  }

  function removeAttachmentRow(index) {
    setForm((prev) => {
      const next = prev.attachments.filter((_, i) => i !== index);
      return { ...prev, attachments: next.length ? next : [makeAttachmentRow()] };
    });
  }

  async function submitTip(event) {
    event.preventDefault();
    if (form.subject_type === "case" && !form.case_id) {
      setError("Please choose a case.");
      return;
    }
    if (form.subject_type === "suspect" && !form.suspect_id) {
      setError("Please choose a suspect.");
      return;
    }
    if (!String(form.title || "").trim() || !String(form.description || "").trim()) {
      setError("Title and description are required.");
      return;
    }

    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      const suspect = suspectOptions.find((item) => Number(item.id) === Number(form.suspect_id)) || null;
      await api.submitTip(token, {
        subject_type: form.subject_type,
        case_id: Number(form.case_id) || Number(suspect?.case_id) || undefined,
        suspect_id: form.subject_type === "suspect" ? Number(form.suspect_id) : undefined,
        title: form.title,
        description: form.description,
        suspect_hint: form.suspect_hint,
        attachments: normalizeAttachments(form.attachments),
      });
      setMessage("Your information was submitted. It will be reviewed by the case officer first.");
      setForm((prev) => ({
        ...prev,
        title: "",
        description: "",
        suspect_hint: "",
        subject_type: prev.subject_type,
        attachments: [makeAttachmentRow()],
      }));
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to submit tip.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!basicUserView) {
    return (
      <section>
        <h1 className="font-display text-3xl uppercase text-brass">Submit Tip / Reward</h1>
        <p className="mt-2 text-zinc-400">Only Basic User can submit this kind of information.</p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl uppercase text-brass">Submit Tip / Reward</h1>
          <p className="mt-1 text-zinc-400">
            Submit useful information about a case or suspect. Review flow: Officer to Detective.
          </p>
        </div>
        <div className="flex gap-2">
          <Link className="btn-secondary" to="/dashboard">
            Dashboard
          </Link>
          <button className="btn-secondary" onClick={loadData} disabled={loading || submitting}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {error && <p className="text-danger">{error}</p>}
      {message && <p className="text-emerald-400">{message}</p>}

      <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
        <form className="card p-4" onSubmit={submitTip}>
          <p className="mb-3 font-semibold">New Information</p>

          <div className="space-y-3">
            <div>
              <label className="mb-2 block text-sm">Information Subject</label>
              <select
                className="input"
                value={form.subject_type}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    subject_type: e.target.value === "suspect" ? "suspect" : "case",
                  }))
                }
              >
                <option value="case">Case</option>
                <option value="suspect">Suspect</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm">Case</label>
              <select
                className="input"
                value={form.case_id}
                onChange={(e) => setForm((prev) => ({ ...prev, case_id: e.target.value }))}
                disabled={form.subject_type === "suspect"}
              >
                <option value="">Select a case</option>
                {activeCases.map((item) => (
                  <option key={item.id} value={item.id}>
                    #{item.id} - {item.title}
                  </option>
                ))}
              </select>
              {form.subject_type === "suspect" && (
                <p className="mt-1 text-xs text-zinc-500">
                  For suspect submissions, the related case is selected automatically.
                </p>
              )}
            </div>

            {form.subject_type === "suspect" && (
              <div className="rounded border border-zinc-700 p-3">
                <label className="mb-2 block text-sm">Suspect</label>
                <select
                  className="input"
                  value={form.suspect_id}
                  onChange={(e) => setForm((prev) => ({ ...prev, suspect_id: e.target.value }))}
                >
                  <option value="">Select a suspect</option>
                  {suspectOptions.map((item) => (
                    <option key={item.id} value={item.id}>
                      #{item.id} - {item.name} ({item.case_title || `Case #${item.case_id}`})
                    </option>
                  ))}
                </select>
                {selectedSuspect && (
                  <div className="mt-3 rounded border border-zinc-800 bg-zinc-950/50 p-3 text-sm">
                    <p>
                      <span className="text-zinc-400">Case:</span> #{selectedSuspect.case_id} - {selectedSuspect.case_title}
                    </p>
                    <p>
                      <span className="text-zinc-400">Current status:</span> {selectedSuspect.status || "-"}
                    </p>
                    {selectedIntenseRow ? (
                      <div className="mt-2 rounded border border-emerald-500/30 bg-emerald-950/10 p-2">
                        <p className="text-emerald-300">
                          Under Intense Tracking (rank #{selectedIntenseRow.rank})
                        </p>
                        <p className="text-xs text-zinc-300">
                          Reward formula amount: {formatNumber(selectedIntenseRow.reward_amount_rial)} IRR
                        </p>
                        <p className="text-xs text-zinc-500">
                          20,000,000 x maxD({selectedIntenseRow.max_tracking_days}) x maxL({selectedIntenseRow.max_level_weight})
                        </p>
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-zinc-500">
                        This suspect is not currently listed in the public intense-tracking page.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm">Title</label>
              <input
                className="input"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Short useful summary"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm">Description</label>
              <textarea
                className="input min-h-28"
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Explain what you know"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm">Suspect Hint (optional)</label>
              <input
                className="input"
                value={form.suspect_hint}
                onChange={(e) => setForm((prev) => ({ ...prev, suspect_hint: e.target.value }))}
                placeholder="Appearance / nickname / vehicle / etc."
              />
            </div>

            <div className="rounded border border-zinc-700 p-3">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-medium">Attachments (optional)</p>
                <button className="btn-secondary" type="button" onClick={addAttachmentRow}>
                  Add Attachment
                </button>
              </div>
              <div className="space-y-3">
                {form.attachments.map((row, index) => (
                  <div key={`tip-att-${index}`} className="rounded border border-zinc-800 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs text-zinc-400">Attachment #{index + 1}</p>
                      <button className="btn-secondary" type="button" onClick={() => removeAttachmentRow(index)}>
                        Remove
                      </button>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="md:col-span-2">
                        <input
                          className="input"
                          type="file"
                          accept="image/*,video/*,audio/*,.pdf,.txt"
                          onChange={(e) => setAttachmentFile(index, e.target.files?.[0] || null)}
                        />
                        {row.file && (
                          <p className="mt-2 text-xs text-zinc-500">
                            Selected: {row.file.name} ({row.file.type || "unknown"})
                          </p>
                        )}
                      </div>
                      <input
                        className="input"
                        placeholder="External file URL (optional)"
                        value={row.file_url}
                        onChange={(e) => setAttachmentField(index, "file_url", e.target.value)}
                      />
                      <input
                        className="input"
                        placeholder="Original name override (optional)"
                        value={row.original_name}
                        onChange={(e) => setAttachmentField(index, "original_name", e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button className="btn-primary" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit For Review"}
            </button>
          </div>
        </form>

        <div className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-semibold">My Submitted Tips</p>
            <span className="text-xs text-zinc-500">{myTips.length} item(s)</span>
          </div>
          <div className="max-h-[42rem] space-y-3 overflow-y-auto pr-1">
            {myTips.map((tip) => (
              <article key={tip.id} className="rounded border border-zinc-700 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-brass">Tip #{tip.id} - {tip.title}</p>
                    <p className="text-xs text-zinc-500">
                      {tip.subject_label || `Case #${tip.case_id}`} | {formatDate(tip.created_at)}
                    </p>
                  </div>
                  <StatusBadge value={tip.status} />
                </div>
                <p className="mt-2 text-sm text-zinc-300">{tip.description}</p>
                {tip.suspect_hint && (
                  <p className="mt-1 text-sm">
                    <span className="text-zinc-400">Suspect hint:</span> {tip.suspect_hint}
                  </p>
                )}
                {tip.reward_code && (
                  <div className="mt-3 rounded border border-emerald-500/40 bg-emerald-900/10 p-2 text-sm">
                    <p>
                      <span className="text-zinc-400">Reward code:</span>{" "}
                      <span className="font-semibold text-emerald-300">{tip.reward_code}</span>
                    </p>
                    <p>
                      <span className="text-zinc-400">Reward amount:</span> {formatNumber(tip.reward_amount)} IRR
                    </p>
                  </div>
                )}
                {!tip.reward_code && tip.subject_type === "suspect" && tip.suggested_reward_amount && (
                  <p className="mt-2 text-xs text-zinc-400">
                    Suspect tracking formula reward (if approved): {formatNumber(tip.suggested_reward_amount)} IRR
                  </p>
                )}
              </article>
            ))}
            {!loading && !myTips.length && (
              <p className="text-sm text-zinc-500">No tip submitted yet.</p>
            )}
            {loading && <p className="text-sm text-zinc-400">Loading...</p>}
          </div>
        </div>
      </div>
    </section>
  );
}
