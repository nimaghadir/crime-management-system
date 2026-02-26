import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { StatusBadge } from "../components/StatusBadge";
import { formatUiApiError } from "../lib/uiApiError";
import { Skeleton } from "../components/Skeleton";
import { ConfirmDialog } from "../components/ConfirmDialog";
import {
  isCaptainRole,
  isCadetRole,
  isChiefRole,
  isComplainantRole,
  isCoronerRole,
  isDetectiveRole,
  isJudgeRole,
  isOfficerRole,
  isReportReviewerRole,
  isSergeantRole,
  isSystemAdminRole,
  isWitnessRole,
} from "../lib/roleRouting";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "awaiting_validation", label: "Awaiting Validation" },
  { value: "open", label: "Open" },
  { value: "under_investigation", label: "Under Investigation" },
  { value: "awaiting_trial", label: "Awaiting Trial" },
  { value: "closed", label: "Closed" },
  { value: "invalidated", label: "Invalidated" },
  { value: "pending_cadet_review", label: "Pending Cadet Review" },
  { value: "pending_cadet_recheck", label: "Pending Cadet Recheck" },
  { value: "pending_officer_review", label: "Pending Officer Review" },
  { value: "pending_superior_approval", label: "Pending Superior Approval" },
  { value: "needs_complainant_revision", label: "Needs Complainant Revision" },
  { value: "needs_creator_revision", label: "Needs Creator Revision" },
];

function normalizeStatus(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function matchesStatusFilter(caseStatus, selectedStatus) {
  const selected = normalizeStatus(selectedStatus);
  if (!selected) return true;

  const current = normalizeStatus(caseStatus);
  if (current === selected) return true;

  if (selected === "awaiting_validation") {
    return [
      "pending_cadet_review",
      "pending_cadet_recheck",
      "pending_officer_review",
      "pending_superior_approval",
      "needs_complainant_revision",
      "needs_creator_revision",
    ].includes(current);
  }

  if (selected === "invalidated") {
    return current === "voided";
  }

  if (selected === "open") {
    return current === "formed";
  }

  return false;
}

function workflowStageLabel(value) {
  const key = normalizeStatus(value);
  const labels = {
    pending_cadet_review: "Pending Cadet Review",
    pending_cadet_recheck: "Pending Cadet Recheck",
    pending_officer_review: "Pending Officer Review",
    needs_complainant_revision: "Needs Complainant Revision",
    pending_superior_approval: "Pending Superior Approval",
    needs_creator_revision: "Needs Creator Revision",
    formed: "Formation Approved",
    voided: "Voided",
  };
  return labels[key] || String(value || "-").replaceAll("_", " ");
}

function isFormationWorkflowStage(stage) {
  return [
    "pending_cadet_review",
    "pending_cadet_recheck",
    "pending_officer_review",
    "needs_complainant_revision",
    "pending_superior_approval",
    "needs_creator_revision",
  ].includes(normalizeStatus(stage));
}

export function CasesPage() {
  const { token, user, roleName } = useAuth();
  const complainantView = isComplainantRole(roleName);
  const witnessView = isWitnessRole(roleName);
  const adminView = isSystemAdminRole(roleName);
  const cadetView = isCadetRole(roleName);
  const officerView = isOfficerRole(roleName);
  const sergeantView = isSergeantRole(roleName);
  const captainView = isCaptainRole(roleName);
  const chiefView = isChiefRole(roleName);
  const coronerView = isCoronerRole(roleName);
  const detectiveView = isDetectiveRole(roleName);
  const judgeView = isJudgeRole(roleName);
  const reportReviewerView = isReportReviewerRole(roleName);
  const formationValidationView =
    complainantView || cadetView || officerView || sergeantView || captainView || chiefView;
  const [items, setItems] = useState([]);
  const [workflowByCaseId, setWorkflowByCaseId] = useState({});
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingWorkflowStates, setLoadingWorkflowStates] = useState(false);
  const [deletingCaseId, setDeletingCaseId] = useState(null);
  const [deleteTargetCase, setDeleteTargetCase] = useState(null);
  const [witnessJoinCaseId, setWitnessJoinCaseId] = useState("");
  const [witnessJoinedCaseId, setWitnessJoinedCaseId] = useState(null);
  const [joiningWitnessCase, setJoiningWitnessCase] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const visibleItems = useMemo(
    () => (items || []).filter((item) => matchesStatusFilter(item?.status, status)),
    [items, status],
  );

  const validationQueueRows = useMemo(() => {
    if (!formationValidationView) return [];
    const rows = (visibleItems || [])
      .map((item) => ({ item, workflow: workflowByCaseId[Number(item.id)] || null }))
      .filter(({ workflow }) => isFormationWorkflowStage(workflow?.stage || workflow?.status))
      .filter(({ item, workflow }) => {
        const stage = normalizeStatus(workflow?.stage || workflow?.status);
        if (complainantView) return stage === "needs_complainant_revision";
        if (cadetView) return ["pending_cadet_review", "pending_cadet_recheck"].includes(stage);
        if (officerView || sergeantView || captainView || chiefView) return stage === "pending_officer_review";
        return false;
      })
      .sort((a, b) => String(b.item?.updated_at || "").localeCompare(String(a.item?.updated_at || "")));
    return rows;
  }, [
    visibleItems,
    workflowByCaseId,
    formationValidationView,
    complainantView,
    cadetView,
    officerView,
    sergeantView,
    captainView,
    chiefView,
  ]);

  async function loadCaseWorkflows(caseRows) {
    const ids = [...new Set((Array.isArray(caseRows) ? caseRows : []).map((item) => Number(item?.id)).filter((id) => id > 0))];
    if (!formationValidationView || !ids.length) {
      setWorkflowByCaseId({});
      return;
    }
    setLoadingWorkflowStates(true);
    try {
      const results = await Promise.allSettled(ids.map((id) => api.getCaseWorkflow(token, id)));
      const next = {};
      ids.forEach((id, index) => {
        const result = results[index];
        next[id] =
          result?.status === "fulfilled" ? result.value : api.getMockWorkflowState(id) || null;
      });
      setWorkflowByCaseId(next);
    } finally {
      setLoadingWorkflowStates(false);
    }
  }

  async function loadCases() {
    setLoading(true);
    setError("");
    try {
      const loader = complainantView || witnessView ? api.listMyCases : api.listCases;
      const data = await loader(token);
      const filtered = (data || []).filter((item) => {
        if (adminView) {
          return true;
        }
        if (cadetView) {
          const cadetId = Number(item?.intern_id ?? item?.cadet_id ?? item?.assigned_cadet);
          return cadetId > 0 && cadetId === Number(user?.id);
        }
        if (officerView) {
          const officerId = Number(item?.officer_id ?? item?.assigned_police_officer ?? item?.assigned_officer);
          return officerId > 0 && officerId === Number(user?.id);
        }
        if (sergeantView) {
          const sergeantId = Number(item?.sergeant_id ?? item?.supervisor_id ?? item?.assigned_sergeant);
          return sergeantId > 0 && sergeantId === Number(user?.id);
        }
        if (captainView) {
          const captainId = Number(item?.captain_id ?? item?.assigned_captain);
          return captainId > 0 && captainId === Number(user?.id);
        }
        if (chiefView) {
          const chiefId = Number(item?.chief_id ?? item?.assigned_chief ?? item?.assigned_police_chief);
          return chiefId > 0 && chiefId === Number(user?.id);
        }
        if (coronerView) {
          const coronerId = Number(item?.coroner_id ?? item?.assigned_coroner ?? item?.assigned_forensic);
          return coronerId > 0 && coronerId === Number(user?.id);
        }
        if (detectiveView) {
          const detectiveId = Number(item?.detective_id ?? item?.assigned_to);
          return detectiveId > 0 && detectiveId === Number(user?.id);
        }
        if (judgeView) {
          const judgeId = Number(item?.judge_id);
          return judgeId > 0 && judgeId === Number(user?.id);
        }
        return true;
      });
      setItems(filtered);
      await loadCaseWorkflows(filtered);
    } catch (err) {
      setError(formatUiApiError(err, "Failed to load cases"));
    } finally {
      setLoading(false);
    }
  }

  async function joinCaseAsWitness() {
    const numericCaseId = Number(witnessJoinCaseId);
    if (!witnessView) return;
    if (!numericCaseId) {
      setError("Enter a valid case ID.");
      return;
    }
    setJoiningWitnessCase(true);
    setError("");
    setMessage("");
    try {
      const result = await api.joinCaseAsWitness(token, numericCaseId);
      setMessage(result?.message || `Joined Case #${numericCaseId} as witness.`);
      setWitnessJoinedCaseId(numericCaseId);
      setWitnessJoinCaseId("");
      await loadCases();
    } catch (err) {
      setError(formatUiApiError(err, "Failed to join case as witness"));
    } finally {
      setJoiningWitnessCase(false);
    }
  }

  function requestDeleteCaseAsAdmin(caseItem) {
    if (!adminView) return;
    setDeleteTargetCase(caseItem || null);
  }

  function closeDeleteDialog() {
    if (deletingCaseId) return;
    setDeleteTargetCase(null);
  }

  async function confirmDeleteCaseAsAdmin() {
    const caseId = Number(deleteTargetCase?.id);
    if (!caseId) return;

    setDeletingCaseId(caseId);
    setError("");
    setMessage("");
    try {
      await api.deleteAdminCase(token, caseId);
      setMessage(`Case #${caseId} deleted.`);
      await loadCases();
      setDeleteTargetCase(null);
    } catch (err) {
      setError(formatUiApiError(err, `Failed to delete case #${caseId}.`));
    } finally {
      setDeletingCaseId(null);
    }
  }

  useEffect(() => {
    loadCases();
  }, [
    complainantView,
    witnessView,
    adminView,
    cadetView,
    officerView,
    sergeantView,
    captainView,
    chiefView,
    coronerView,
    detectiveView,
    judgeView,
    token,
    user?.id,
  ]);

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl uppercase text-brass">
            {complainantView || witnessView ? "My Cases" : "Case Inbox"}
          </h1>
          <p className="text-zinc-400">
            {complainantView
              ? "Only cases linked to your account are listed here."
              : witnessView
                ? "Cases where you are a registered witness or have submitted testimony are listed here."
              : adminView
                ? "All cases are visible to system administrator."
              : judgeView
                ? "Only cases assigned to you as judge are listed here."
              : detectiveView
                ? "Only cases assigned to you as detective are listed here."
                : coronerView
                  ? "Only cases assigned to you as coroner are listed here."
                  : chiefView
                    ? "Only cases assigned to you as police chief are listed here."
                    : captainView
                      ? "Only cases assigned to you as captain are listed here."
                      : sergeantView
                        ? "Only cases assigned to you as sergeant are listed here."
                        : officerView
                          ? "Only cases assigned to you as police officer are listed here."
                : cadetView
                  ? "Only cases assigned to you as cadet/intern are listed here."
                : "Filter and inspect assigned/open records"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button className="btn-secondary" onClick={() => loadCases()}>
            Apply
          </button>
        </div>
      </div>

      {error && <p className="mb-3 text-danger">{error}</p>}
      {message && <p className="mb-3 text-emerald-400">{message}</p>}

      {witnessView && (
        <div className="mb-4 rounded-lg border border-zinc-700 bg-zinc-900/40 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Witness Case Access</p>
              <p className="mt-1 text-sm text-zinc-300">
                Enter a case ID to join that case as witness. After joining, you can open the case and submit testimony evidence.
              </p>
            </div>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-[220px_auto_auto]">
            <input
              className="input"
              type="number"
              min="1"
              placeholder="Case ID"
              value={witnessJoinCaseId}
              onChange={(e) => {
                setWitnessJoinCaseId(e.target.value);
                setWitnessJoinedCaseId(null);
              }}
            />
            <button
              className="btn-primary"
              onClick={joinCaseAsWitness}
              disabled={joiningWitnessCase}
            >
              {joiningWitnessCase ? "Joining..." : "Join Case as Witness"}
            </button>
            {Number(witnessJoinedCaseId) > 0 && (
              <Link className="btn-secondary" to={`/cases/${Number(witnessJoinedCaseId)}`}>
                Open Joined Case
              </Link>
            )}
          </div>
        </div>
      )}

      {formationValidationView && (
        <div className="mb-4 rounded-lg border border-zinc-700 bg-zinc-900/40 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Case Formation Validation</p>
              <p className="mt-1 text-sm text-zinc-300">
                {complainantView
                  ? "Returned complaints and validation-stage cases with reviewer messages."
                  : "Cases currently waiting for your validation action in the formation workflow."}
              </p>
            </div>
            <div className="text-xs text-zinc-500">
              {loadingWorkflowStates ? "Loading workflow states..." : `${validationQueueRows.length} item(s) need attention`}
            </div>
          </div>

          <div className="mt-3 space-y-2">
            {loading && (
              Array.from({ length: 2 }).map((_, index) => (
                <div key={`validation-queue-skeleton-${index}`} className="rounded border border-zinc-800 p-3">
                  <Skeleton className="h-4 w-56" />
                  <Skeleton className="mt-2 h-3 w-40" />
                  <Skeleton className="mt-2 h-3 w-5/6" />
                </div>
              ))
            )}

            {!loading &&
              validationQueueRows.map(({ item, workflow }) => {
                const stage = workflow?.stage || workflow?.status;
                const openTo = complainantView && normalizeStatus(stage) === "needs_complainant_revision"
                  ? "/complaint"
                  : `/cases/${item.id}`;
                const ctaLabel =
                  complainantView && normalizeStatus(stage) === "needs_complainant_revision"
                    ? "Open Complaint Wizard"
                    : "Open Validation Panel";
                return (
                  <div key={`validation-row-${item.id}`} className="rounded border border-zinc-800 bg-zinc-950/60 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium text-brass">Case #{item.id}: {item.title}</p>
                        <p className="mt-1 text-xs text-zinc-400">
                          Validation stage: {workflowStageLabel(stage)} | Case status: {String(item.status || "-").replaceAll("_", " ")}
                        </p>
                      </div>
                      <Link className="btn-secondary" to={openTo}>
                        {ctaLabel}
                      </Link>
                    </div>
                    {workflow?.last_comment && (
                      <p className="mt-2 text-sm text-zinc-300">
                        <span className="text-zinc-500">Latest message:</span> {workflow.last_comment}
                      </p>
                    )}
                  </div>
                );
              })}

            {!loading && !validationQueueRows.length && (
              <p className="text-sm text-zinc-500">No formation-validation item is currently assigned to your role.</p>
            )}
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-zinc-700">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-zinc-900 text-zinc-300">
            <tr>
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Level</th>
              <th className="px-3 py-2">Updated</th>
              {adminView && <th className="px-3 py-2 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {!loading &&
              visibleItems.map((item) => {
                const pendingMyApproval =
                  !complainantView && item.assigned_to === user?.id && item.status === "open";
                return (
                  <tr
                    key={item.id}
                    className={`border-t border-zinc-800 ${pendingMyApproval ? "bg-brass/15" : "hover:bg-zinc-900/40"}`}
                  >
                    <td className="px-3 py-2">{item.id}</td>
                    <td className="px-3 py-2 font-medium">
                      <Link
                        className="text-brass hover:underline"
                        to={reportReviewerView ? `/reports?caseId=${item.id}` : `/cases/${item.id}`}
                      >
                        {item.title}
                      </Link>
                      {pendingMyApproval && (
                        <span className="ml-2 rounded bg-brass/25 px-2 py-0.5 text-xs text-brass">Pending My Approval</span>
                      )}
                    </td>
                    <td className="px-3 py-2"><StatusBadge value={item.status} /></td>
                    <td className="px-3 py-2">{item.level}</td>
                    <td className="px-3 py-2">{new Date(item.updated_at).toLocaleString()}</td>
                    {adminView && (
                      <td className="px-3 py-2 text-right">
                        <button
                          className="btn-secondary border-danger/60 text-danger hover:bg-danger/10"
                          onClick={() => requestDeleteCaseAsAdmin(item)}
                          disabled={deletingCaseId === Number(item.id)}
                        >
                          {deletingCaseId === Number(item.id) ? "Deleting..." : "Delete"}
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            {!loading && !visibleItems.length && (
              <tr>
                <td className="px-3 py-6 text-zinc-400" colSpan={adminView ? 6 : 5}>
                  No cases found.
                </td>
              </tr>
            )}
            {loading && (
              Array.from({ length: 5 }).map((_, rowIndex) => (
                <tr key={`case-row-skeleton-${rowIndex}`} className="border-t border-zinc-800">
                  <td className="px-3 py-3"><Skeleton className="h-4 w-8" /></td>
                  <td className="px-3 py-3"><Skeleton className="h-4 w-44" /></td>
                  <td className="px-3 py-3"><Skeleton className="h-5 w-20" /></td>
                  <td className="px-3 py-3"><Skeleton className="h-4 w-8" /></td>
                  <td className="px-3 py-3"><Skeleton className="h-4 w-36" /></td>
                  {adminView && <td className="px-3 py-3"><Skeleton className="ml-auto h-9 w-20" /></td>}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={Boolean(deleteTargetCase)}
        title={deleteTargetCase ? `Delete Case #${deleteTargetCase.id}` : "Delete Case"}
        subtitle={deleteTargetCase?.title || ""}
        description="This permanently removes the case and related records. Use it only for duplicate/invalid entries."
        tone="danger"
        confirmLabel="Delete Case Permanently"
        busy={Boolean(deletingCaseId)}
        onClose={closeDeleteDialog}
        onConfirm={confirmDeleteCaseAsAdmin}
      >
        {deleteTargetCase && (
          <div className="grid gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-sm md:grid-cols-2">
            <p>
              <span className="text-zinc-500">Status:</span> {String(deleteTargetCase.status || "-").replaceAll("_", " ")}
            </p>
            <p>
              <span className="text-zinc-500">Level:</span> {deleteTargetCase.level || "-"}
            </p>
            <p className="md:col-span-2">
              <span className="text-zinc-500">Updated:</span>{" "}
              {deleteTargetCase.updated_at ? new Date(deleteTargetCase.updated_at).toLocaleString() : "-"}
            </p>
          </div>
        )}
      </ConfirmDialog>
    </section>
  );
}
