import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { isComplainantRole } from "../lib/roleRouting";
import { api } from "../lib/api";

const STORAGE_KEY = "caseflow_complaint_draft";

const initialForm = {
  title: "",
  description: "",
  level: 3,
};

function loadDraft() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : initialForm;
  } catch {
    return initialForm;
  }
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function isRevisionRequiredCase(caseItem, workflow) {
  const caseStatus = normalizeText(caseItem?.status);
  const workflowStage = normalizeText(workflow?.stage || workflow?.status);
  return caseStatus === "needs_complainant_revision" || workflowStage === "needs_complainant_revision";
}

export function ComplaintWizardPage() {
  const { token, roleName } = useAuth();
  const complainantMode = isComplainantRole(roleName);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(loadDraft);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [lastCaseId, setLastCaseId] = useState("");
  const [myCases, setMyCases] = useState([]);
  const [loadingMyCases, setLoadingMyCases] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingCaseId, setEditingCaseId] = useState("");
  const [lastSubmitMode, setLastSubmitMode] = useState("new");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
  }, [form]);

  async function loadMyCases() {
    if (!complainantMode) return;
    setLoadingMyCases(true);
    try {
      const rows = await api.listMyCases(token);
      setMyCases(Array.isArray(rows) ? rows : []);
    } catch (err) {
      setError(err.message || "Failed to load your complaints.");
    } finally {
      setLoadingMyCases(false);
    }
  }

  useEffect(() => {
    if (!complainantMode) return;
    loadMyCases();
  }, [complainantMode, token]);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const editingCase = useMemo(
    () => myCases.find((item) => Number(item.id) === Number(editingCaseId)) || null,
    [myCases, editingCaseId],
  );

  const revisionCases = useMemo(
    () =>
      (myCases || [])
        .map((item) => ({ item, workflow: api.getMockWorkflowState(item.id) }))
        .filter(({ item, workflow }) => isRevisionRequiredCase(item, workflow))
        .sort((a, b) => String(b.item?.updated_at || "").localeCompare(String(a.item?.updated_at || ""))),
    [myCases],
  );

  function startEditingReturnedCase(caseItem) {
    setEditingCaseId(String(caseItem.id));
    setForm({
      title: String(caseItem?.title || "").trim(),
      description: String(caseItem?.description || ""),
      level: Number(caseItem?.level) || 3,
    });
    setResult(null);
    setLastCaseId(String(caseItem.id));
    setLastSubmitMode("revision");
    setError("");
    setStep(1);
  }

  function resetToNewComplaint() {
    setEditingCaseId("");
    setForm(initialForm);
    setResult(null);
    setLastCaseId("");
    setLastSubmitMode("new");
    setStep(1);
    localStorage.removeItem(STORAGE_KEY);
  }

  async function submitComplaint() {
    setError("");
    setSubmitting(true);
    try {
      if (editingCase) {
        await api.updateCasePartial(token, editingCase.id, {
          title: form.title,
          description: form.description,
          level: Number(form.level) || 3,
        });
        await api.transitionCase(token, editingCase.id, {
          action: "complainant_resubmit",
          role: roleName,
          comment: "",
        });
        const refreshed = await api.getCase(token, editingCase.id);
        setResult(refreshed);
        setLastCaseId(String(editingCase.id));
        setLastSubmitMode("revision");
        setStep(3);
        setEditingCaseId("");
        localStorage.removeItem(STORAGE_KEY);
        await loadMyCases();
      } else {
        const data = await api.createCase(token, {
          ...form,
          creation_method: "complaint",
        });
        setResult(data);
        setLastCaseId(String(data.id));
        setLastSubmitMode("new");
        setStep(3);
        localStorage.removeItem(STORAGE_KEY);
        await loadMyCases();
      }
    } catch (err) {
      setError(err.message || (editingCase ? "Failed to resubmit complaint revision" : "Failed to submit complaint"));
    } finally {
      setSubmitting(false);
    }
  }

  const workflow = useMemo(() => {
    if (!lastCaseId) return null;
    return api.getMockWorkflowState(lastCaseId);
  }, [lastCaseId, result]);

  const complainantNotice =
    workflow && workflow.rejection_count > 0
      ? workflow.rejection_count >= 3
        ? "This complaint reached 3 rejections and is voided."
        : `This complaint has ${workflow.rejection_count} rejection(s). Please revise before resubmission.`
      : "";

  if (!complainantMode) {
    return (
      <section>
        <h1 className="font-display text-3xl uppercase text-brass">Complaint Wizard</h1>
        <p className="mt-2 text-zinc-400">Only complainant-side roles can submit complaint-based cases.</p>
      </section>
    );
  }

  return (
    <section>
      <h1 className="font-display text-3xl uppercase text-brass">Complaint Wizard</h1>
      <p className="mb-6 mt-1 text-zinc-400">Guided complaint entry with draft persistence.</p>

      <div className="mb-4 card max-w-4xl p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-paper">Returned Complaints (Need Your Revision)</p>
            <p className="mt-1 text-xs text-zinc-400">
              Select a returned complaint to edit its title/description/level and resubmit it.
            </p>
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={loadMyCases} disabled={loadingMyCases || submitting}>
              {loadingMyCases ? "Refreshing..." : "Refresh"}
            </button>
            {editingCase && (
              <button className="btn-secondary" onClick={resetToNewComplaint} disabled={submitting}>
                New Complaint Mode
              </button>
            )}
          </div>
        </div>

        <div className="mt-3 space-y-2">
          {revisionCases.map(({ item, workflow: itemWorkflow }) => (
            <div key={item.id} className="rounded border border-zinc-700 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-brass">
                    Case #{item.id}: {item.title}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Status: {String(item.status || "-").replaceAll("_", " ")} | Level: {item.level ?? "-"}
                  </p>
                  {itemWorkflow?.last_comment && (
                    <p className="mt-2 text-sm text-zinc-300">
                      <span className="text-zinc-400">Reviewer message:</span> {itemWorkflow.last_comment}
                    </p>
                  )}
                </div>
                <button
                  className="btn-primary"
                  onClick={() => startEditingReturnedCase(item)}
                  disabled={submitting}
                >
                  {Number(editingCaseId) === Number(item.id) ? "Editing" : "Edit & Re-submit"}
                </button>
              </div>
            </div>
          ))}
          {!loadingMyCases && !revisionCases.length && (
            <p className="text-sm text-zinc-500">No complaint is currently waiting for your revision.</p>
          )}
        </div>
      </div>

      {complainantNotice && (
        <div
          className={`mb-4 rounded border p-3 text-sm ${
            workflow?.is_voided ? "border-danger text-danger" : "border-brass/70 text-brass"
          }`}
        >
          {complainantNotice}
        </div>
      )}

      <div className="mb-4 flex gap-2 text-xs">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className={`rounded-full px-3 py-1 ${
              step === n ? "bg-brass text-ink" : "bg-zinc-800 text-zinc-400"
            }`}
          >
            Step {n}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="card max-w-2xl p-4">
          <p className="mb-3 text-xs uppercase tracking-wide text-zinc-500">
            {editingCase ? `Editing Returned Complaint #${editingCase.id}` : "New Complaint"}
          </p>
          <label className="mb-2 block text-sm">Case title</label>
          <input className="input" value={form.title} onChange={(e) => updateField("title", e.target.value)} />
          <button className="btn-primary mt-4" onClick={() => setStep(2)} disabled={!form.title.trim()}>
            Next
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="card max-w-2xl p-4">
          <p className="mb-3 text-xs uppercase tracking-wide text-zinc-500">
            {editingCase ? `Revision Form for Case #${editingCase.id}` : "Complaint Details"}
          </p>
          <label className="mb-2 block text-sm">Description</label>
          <textarea className="input min-h-28" value={form.description} onChange={(e) => updateField("description", e.target.value)} />

          <label className="mb-2 mt-4 block text-sm">Level</label>
          <select className="input" value={form.level} onChange={(e) => updateField("level", Number(e.target.value))}>
            <option value={3}>Level 3 (Normal)</option>
            <option value={2}>Level 2 (Major)</option>
            <option value={1}>Level 1 (Severe)</option>
            <option value={4}>Critical</option>
          </select>

          {error && <p className="mt-3 text-sm text-danger">{error}</p>}

          <div className="mt-4 flex gap-2">
            <button className="btn-secondary" onClick={() => setStep(1)}>Back</button>
            <button className="btn-primary" onClick={submitComplaint} disabled={submitting}>
              {submitting
                ? (editingCase ? "Re-submitting..." : "Submitting...")
                : (editingCase ? "Save Changes & Re-submit" : "Submit Complaint")}
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="card max-w-2xl p-4">
          <p className="text-emerald-400">
            {lastSubmitMode === "revision"
              ? "Complaint revision submitted successfully."
              : "Complaint submitted successfully."}
          </p>
          <p className="mt-2 text-sm text-zinc-300">Case ID: {result?.id}</p>
          {workflow && (
            <p className="mt-1 text-sm text-zinc-400">Current workflow status: {workflow.status}</p>
          )}
          <button
            className="btn-secondary mt-4"
            onClick={() => {
              resetToNewComplaint();
            }}
          >
            Submit another
          </button>
        </div>
      )}
    </section>
  );
}
