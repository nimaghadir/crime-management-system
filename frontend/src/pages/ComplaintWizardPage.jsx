import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
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

export function ComplaintWizardPage() {
  const { token, roleName } = useAuth();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(loadDraft);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [lastCaseId, setLastCaseId] = useState("");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
  }, [form]);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submitComplaint() {
    setError("");
    try {
      const data = await api.createCase(token, form);
      setResult(data);
      setLastCaseId(String(data.id));
      setStep(3);
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      setError(err.message || "Failed to submit complaint");
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

  const isComplainantRole = ["complainant", "shaki"].some((needle) =>
    String(roleName || "").toLowerCase().includes(needle),
  );

  return (
    <section>
      <h1 className="font-display text-3xl uppercase text-brass">Complaint Wizard</h1>
      <p className="mb-6 mt-1 text-zinc-400">Guided complaint entry with draft persistence.</p>

      {isComplainantRole && complainantNotice && (
        <div className={`mb-4 rounded border p-3 text-sm ${workflow.is_voided ? "border-danger text-danger" : "border-brass/70 text-brass"}`}>
          {complainantNotice}
        </div>
      )}

      <div className="mb-4 flex gap-2 text-xs">
        {[1, 2, 3].map((n) => (
          <div key={n} className={`rounded-full px-3 py-1 ${step === n ? "bg-brass text-ink" : "bg-zinc-800 text-zinc-400"}`}>
            Step {n}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="card max-w-2xl p-4">
          <label className="mb-2 block text-sm">Case title</label>
          <input className="input" value={form.title} onChange={(e) => updateField("title", e.target.value)} />
          <button className="btn-primary mt-4" onClick={() => setStep(2)} disabled={!form.title.trim()}>
            Next
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="card max-w-2xl p-4">
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
            <button className="btn-primary" onClick={submitComplaint}>Submit</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="card max-w-2xl p-4">
          <p className="text-emerald-400">Complaint submitted successfully.</p>
          <p className="mt-2 text-sm text-zinc-300">Created Case ID: {result?.id}</p>
          {workflow && (
            <p className="mt-1 text-sm text-zinc-400">Current workflow status: {workflow.status}</p>
          )}
          <button className="btn-secondary mt-4" onClick={() => { setForm(initialForm); setStep(1); setResult(null); setLastCaseId(""); }}>
            Submit another
          </button>
        </div>
      )}
    </section>
  );
}
