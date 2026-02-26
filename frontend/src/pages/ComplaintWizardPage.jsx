import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { isBasicUserRole, isComplainantRole } from "../lib/roleRouting";
import { api } from "../lib/api";
import { formatUiApiError } from "../lib/uiApiError";
import { Skeleton, SkeletonLines } from "../components/Skeleton";

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

function normalizeRoleName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ");
}

export function ComplaintWizardPage() {
  const { token, roleName } = useAuth();
  const complainantMode = isComplainantRole(roleName);
  const basicUserMode = isBasicUserRole(roleName);
  const normalizedRole = normalizeRoleName(roleName);
  const canSubmitComplaint = normalizedRole.includes("complainant") || normalizedRole.includes("shaki");
  const canJoinAsComplainant = canSubmitComplaint || basicUserMode;
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(loadDraft);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [lastCaseId, setLastCaseId] = useState("");
  const [myCases, setMyCases] = useState([]);
  const [workflowByCaseId, setWorkflowByCaseId] = useState({});
  const [loadingMyCases, setLoadingMyCases] = useState(false);
  const [loadingWorkflows, setLoadingWorkflows] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingCaseId, setEditingCaseId] = useState("");
  const [lastSubmitMode, setLastSubmitMode] = useState("new");
  const [joinCaseId, setJoinCaseId] = useState("");
  const [joiningComplainant, setJoiningComplainant] = useState(false);
  const [joinMessage, setJoinMessage] = useState("");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
  }, [form]);

  async function loadMyCases() {
    if (!canSubmitComplaint) return;
    setLoadingMyCases(true);
    try {
      const rows = await api.listMyCases(token);
      const normalizedRows = Array.isArray(rows) ? rows : [];
      setMyCases(normalizedRows);
      await loadCaseWorkflows(normalizedRows);
    } catch (err) {
      setError(formatUiApiError(err, "Failed to load your complaints."));
    } finally {
      setLoadingMyCases(false);
    }
  }

  async function loadCaseWorkflows(caseRows = []) {
    const ids = [...new Set((Array.isArray(caseRows) ? caseRows : []).map((item) => Number(item?.id)).filter((id) => id > 0))];
    if (!ids.length) {
      setWorkflowByCaseId({});
      return;
    }
    setLoadingWorkflows(true);
    try {
      const results = await Promise.allSettled(ids.map((id) => api.getCaseWorkflow(token, id)));
      const next = {};
      ids.forEach((id, index) => {
        const result = results[index];
        if (result?.status === "fulfilled") {
          next[id] = result.value;
          return;
        }
        next[id] = api.getMockWorkflowState(id) || null;
      });
      setWorkflowByCaseId(next);
    } finally {
      setLoadingWorkflows(false);
    }
  }

  useEffect(() => {
    if (!canSubmitComplaint) return;
    loadMyCases();
  }, [canSubmitComplaint, token]);

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
        .map((item) => ({ item, workflow: workflowByCaseId[Number(item.id)] || null }))
        .filter(({ item, workflow }) => isRevisionRequiredCase(item, workflow))
        .sort((a, b) => String(b.item?.updated_at || "").localeCompare(String(a.item?.updated_at || ""))),
    [myCases, workflowByCaseId],
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
        const refreshedWorkflow = await api.getCaseWorkflow(token, editingCase.id).catch(() => api.getMockWorkflowState(editingCase.id));
        setResult(refreshed);
        setWorkflowByCaseId((prev) => ({ ...prev, [Number(editingCase.id)]: refreshedWorkflow || null }));
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
        const createdWorkflow = await api.getCaseWorkflow(token, data.id).catch(() => api.getMockWorkflowState(data.id));
        setResult(data);
        setWorkflowByCaseId((prev) => ({ ...prev, [Number(data.id)]: createdWorkflow || null }));
        setLastCaseId(String(data.id));
        setLastSubmitMode("new");
        setStep(3);
        localStorage.removeItem(STORAGE_KEY);
        await loadMyCases();
      }
    } catch (err) {
      setError(formatUiApiError(err, (editingCase ? "Failed to resubmit complaint revision" : "Failed to submit complaint")));
    } finally {
      setSubmitting(false);
    }
  }

  const workflow = useMemo(() => {
    if (!lastCaseId) return null;
    return workflowByCaseId[Number(lastCaseId)] || api.getMockWorkflowState(lastCaseId);
  }, [lastCaseId, result, workflowByCaseId]);

  const complainantNotice =
    workflow && workflow.rejection_count > 0
      ? workflow.rejection_count >= 3
        ? "This complaint reached 3 rejections and is voided."
        : `This complaint has ${workflow.rejection_count} rejection(s). Please revise before resubmission.`
      : "";

  async function joinExistingCaseAsComplainant() {
    const numericCaseId = Number(joinCaseId);
    if (!numericCaseId) {
      setError("A valid case ID is required.");
      return;
    }
    setError("");
    setJoinMessage("");
    setJoiningComplainant(true);
    try {
      const response = await api.joinCaseAsComplainant(token, numericCaseId);
      setJoinMessage(response?.message || "Joined case successfully.");
      if (canSubmitComplaint) {
        await loadMyCases();
      }
    } catch (err) {
      setError(formatUiApiError(err, "Failed to join case as complainant."));
    } finally {
      setJoiningComplainant(false);
    }
  }

  if (!complainantMode && !basicUserMode) {
    return (
      <section>
        <h1 className="font-display text-3xl uppercase text-brass">Complaint Wizard</h1>
        <p className="mt-2 text-zinc-400">Only complainant/basic-user side roles can use complaint tools and join a case as complainant.</p>
      </section>
    );
  }

  return (
    <section>
      <h1 className="font-display text-3xl uppercase text-brass">Complaint Wizard</h1>
      <p className="mb-6 mt-1 text-zinc-400">
        {canSubmitComplaint
          ? "Guided complaint entry with draft persistence."
          : "Join an existing case as a complainant using your registered system account."}
      </p>

      <div className="mb-4 card max-w-4xl p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-paper">Join Existing Case</p>
            <p className="mt-1 text-xs text-zinc-400">
              Use this to join a previously created case as a complainant. Witness flow is handled separately.
            </p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            className="input max-w-xs"
            type="number"
            min="1"
            placeholder="Case ID"
            value={joinCaseId}
            onChange={(e) => setJoinCaseId(e.target.value)}
          />
          {canJoinAsComplainant && (
            <button
              className="btn-secondary"
              onClick={joinExistingCaseAsComplainant}
              disabled={joiningComplainant}
            >
              {joiningComplainant ? "Joining..." : "Join as Complainant"}
            </button>
          )}
        </div>
        {joinMessage && <p className="mt-3 text-sm text-emerald-400">{joinMessage}</p>}
      </div>

      {!canSubmitComplaint && (
        <div className="card max-w-4xl p-4">
          <p className="text-sm text-zinc-300">
            Your current role can join existing cases but cannot create a new complaint case.
          </p>
        </div>
      )}

      {canSubmitComplaint && (
        <>

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
          {loadingMyCases &&
            Array.from({ length: 2 }).map((_, index) => (
              <div key={`complaint-revision-skeleton-${index}`} className="rounded border border-zinc-700 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <Skeleton className="h-4 w-64" />
                    <Skeleton className="mt-2 h-3 w-40" />
                    <SkeletonLines className="mt-2" lines={2} widths={["w-full", "w-3/4"]} />
                  </div>
                  <Skeleton className="h-10 w-32 rounded" />
                </div>
              </div>
            ))}
          {!loadingMyCases && loadingWorkflows && (
            <p className="text-xs text-zinc-500">Loading validation workflow states...</p>
          )}
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
                  {!!itemWorkflow?.history?.length && (
                    <div className="mt-2 space-y-1 rounded border border-zinc-800 bg-zinc-900/40 p-2">
                      <p className="text-xs uppercase tracking-wide text-zinc-500">Recent Validation Messages</p>
                      {itemWorkflow.history.slice(-2).reverse().map((entry) => (
                        <p key={`complaint-history-${item.id}-${entry.id || entry.at}`} className="text-xs text-zinc-300">
                          <span className="text-zinc-500">
                            {String(entry?.from_role || entry?.by_role || "User").replaceAll("_", " ")}:
                          </span>{" "}
                          {entry?.comment ? entry.comment : "(No message)"}
                        </p>
                      ))}
                    </div>
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
            <option value={1}>Level 1 (Low)</option>
            <option value={2}>Level 2 (Medium)</option>
            <option value={3}>Level 3 (High)</option>
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
      </>
      )}
    </section>
  );
}
