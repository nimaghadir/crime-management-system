import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { StatusBadge } from "../components/StatusBadge";
import { EvidenceEntryModal } from "../components/EvidenceEntryModal";
import {
  isCadetRole,
  isCaptainRole,
  isChiefRole,
  isComplainantRole,
  isCoronerRole,
  isDetectiveRole,
  isJudgeRole,
  isOfficerRole,
  isSergeantRole,
} from "../lib/roleRouting";

const tabs = ["info", "evidence", "suspects", "logs"];

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function formatDateTime(value) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

function evidenceTypeLabel(type) {
  const normalized = normalizeText(type);
  if (normalized === "testimony") return "Witness / Local Statement";
  if (normalized === "bio_medical") return "Found: Biological / Medical";
  if (normalized === "vehicle") return "Found: Vehicle";
  if (normalized === "identity") return "Found: Identification Document";
  if (normalized === "other") return "Found: Other";
  return type || "-";
}

function evidenceTitle(item) {
  return String(item?.title || "").trim() || `Evidence #${item?.id || "-"}`;
}

function evidenceDescription(item) {
  return String(item?.description || "").trim() || "-";
}

function evidenceRegisteredAt(item) {
  return item?.registered_at || item?.created_at || null;
}

function evidenceSubmitter(item) {
  const name = String(item?.submitter_name || item?.submitter?.username || "").trim();
  const role = String(item?.submitter_role || item?.submitted_by_role || "").trim();
  if (name && role) return `${name} (${role})`;
  if (name) return name;
  if (role) return role;
  return "Unknown";
}

function evidenceAttachments(item) {
  const rows = Array.isArray(item?.attachments) ? item.attachments : [];
  return rows
    .map((entry) => ({
      id: Number(entry?.id) || null,
      file_url: String(entry?.file_url || "").trim(),
      file_path: String(entry?.file_path || "").trim(),
      mime_type: String(entry?.mime_type || "").trim(),
      original_name: String(entry?.original_name || "").trim(),
    }))
    .filter((entry) => entry.file_url || entry.file_path || entry.mime_type || entry.original_name);
}

function evidenceMetadata(item) {
  if (item?.metadata && typeof item.metadata === "object" && !Array.isArray(item.metadata)) {
    return item.metadata;
  }
  return {};
}

function identityDetailsRows(metadata) {
  const details = metadata?.details;
  if (!details || typeof details !== "object" || Array.isArray(details)) {
    return [];
  }
  return Object.entries(details)
    .map(([key, value]) => [String(key || "").trim(), String(value || "").trim()])
    .filter(([key]) => Boolean(key));
}

function workflowPathLabel(value) {
  const normalized = normalizeText(value);
  if (normalized === "complaint") return "Complaint-based Case Formation";
  if (normalized === "crime_scene") return "Crime-scene Case Formation";
  return value || "-";
}

function workflowStageLabel(value) {
  const normalized = normalizeText(value);
  const labels = {
    pending_cadet_review: "Pending Cadet Review",
    needs_complainant_revision: "Needs Complainant Revision",
    pending_officer_review: "Pending Officer Approval",
    pending_cadet_recheck: "Returned to Cadet (Re-check)",
    pending_superior_approval: "Pending Superior Approval",
    needs_creator_revision: "Needs Creator Revision",
    formed: "Formation Approved",
    voided: "Voided",
  };
  return labels[normalized] || value || "-";
}

function workflowRoleRank(roleName) {
  if (isCadetRole(roleName)) return 1;
  if (isOfficerRole(roleName)) return 2;
  if (isDetectiveRole(roleName)) return 2;
  if (isCoronerRole(roleName)) return 2;
  if (isSergeantRole(roleName)) return 3;
  if (isCaptainRole(roleName)) return 4;
  if (isChiefRole(roleName)) return 5;
  return 0;
}

function isComplaintOfficerStageRole(roleName) {
  return isOfficerRole(roleName) || isSergeantRole(roleName) || isCaptainRole(roleName) || isChiefRole(roleName);
}

function userIsComplainantForCase(user, caseData) {
  if (!user || !caseData) return false;
  if (Number(caseData.created_by) === Number(user.id)) return true;
  const ids = Array.isArray(caseData.complainant_ids) ? caseData.complainant_ids : [];
  return ids.some((id) => Number(id) === Number(user.id));
}

function canSceneSuperiorApprove(roleName, creatorRoleName) {
  if (isCadetRole(roleName)) return false;
  if (isCoronerRole(roleName)) return true;
  const actorRank = workflowRoleRank(roleName);
  const creatorRank = workflowRoleRank(creatorRoleName);
  return actorRank > creatorRank;
}

function workflowActionsForUser({ workflow, roleName, user, caseData }) {
  if (!workflow || workflow.is_voided) return [];
  const stage = normalizeText(workflow.stage || workflow.status);
  const path = normalizeText(workflow.path);

  if (path === "complaint") {
    if (userIsComplainantForCase(user, caseData) && stage === "needs_complainant_revision") {
      return [
        {
          key: "complainant_resubmit",
          label: "Re-submit To Cadet",
          tone: "primary",
          requiresComment: false,
        },
      ];
    }
    if (isCadetRole(roleName) && ["pending_cadet_review", "pending_cadet_recheck"].includes(stage)) {
      return [
        {
          key: "cadet_request_revision",
          label: "Return To Complainant",
          tone: "secondary",
          requiresComment: true,
        },
        {
          key: "cadet_forward_to_officer",
          label: "Forward To Officer",
          tone: "primary",
          requiresComment: false,
        },
      ];
    }
    if (isComplaintOfficerStageRole(roleName) && stage === "pending_officer_review") {
      return [
        {
          key: "officer_return_to_cadet",
          label: "Return To Cadet",
          tone: "secondary",
          requiresComment: true,
        },
        {
          key: "officer_approve_formation",
          label: "Approve Case Formation",
          tone: "primary",
          requiresComment: false,
        },
      ];
    }
    return [];
  }

  if (path === "crime_scene") {
    const creatorRoleName = String(caseData?.created_by_role || "");
    const actorIsCreator = Number(user?.id) > 0 && Number(user.id) === Number(caseData?.created_by);
    if (actorIsCreator && stage === "needs_creator_revision") {
      return [
        {
          key: "creator_resubmit_for_approval",
          label: "Re-submit For Approval",
          tone: "primary",
          requiresComment: false,
        },
      ];
    }
    if (canSceneSuperiorApprove(roleName, creatorRoleName) && stage === "pending_superior_approval") {
      return [
        {
          key: "superior_request_creator_revision",
          label: "Request Creator Revision",
          tone: "secondary",
          requiresComment: true,
        },
        {
          key: "superior_approve_formation",
          label: "Approve Case Formation",
          tone: "primary",
          requiresComment: false,
        },
      ];
    }
  }

  return [];
}

function roleDisplayName(roleName) {
  const normalized = normalizeText(roleName);
  if (isChiefRole(normalized)) return "Police Chief";
  if (isCaptainRole(normalized)) return "Captain";
  if (isSergeantRole(normalized)) return "Sergeant";
  if (isDetectiveRole(normalized)) return "Detective";
  if (isOfficerRole(normalized)) return "Police Officer";
  if (isCadetRole(normalized)) return "Cadet";
  if (isCoronerRole(normalized)) return "Coroner / Medical Examiner";
  if (isJudgeRole(normalized)) return "Judge";
  if (isComplainantRole(normalized)) return "Complainant";
  return String(roleName || "")
    .trim()
    .replace(/[_-]+/g, " ") || "-";
}

function sceneApproverLabelForCreatorRole(creatorRoleName) {
  if (isOfficerRole(creatorRoleName) || isDetectiveRole(creatorRoleName) || isCoronerRole(creatorRoleName)) {
    return "Sergeant / Captain / Police Chief";
  }
  if (isSergeantRole(creatorRoleName)) {
    return "Captain / Police Chief";
  }
  if (isCaptainRole(creatorRoleName)) {
    return "Police Chief";
  }
  if (isChiefRole(creatorRoleName)) {
    return "No validation needed (chief-created)";
  }
  return "Higher-ranked police officer";
}

function validationResponsibilitySummary(workflow, caseData) {
  if (!workflow) {
    return {
      actor: "Unknown",
      message: "Workflow details are not available.",
    };
  }

  const stage = normalizeText(workflow.stage || workflow.status);
  const path = normalizeText(workflow.path);

  if (workflow.is_voided || stage === "voided") {
    return {
      actor: "No further validator",
      message: "Case formation was invalidated and the validation flow is closed.",
    };
  }

  if (stage === "formed" || workflow.formed) {
    return {
      actor: "No validator pending",
      message: "Case formation is approved. Operational case handling can continue.",
    };
  }

  if (path === "complaint") {
    if (["pending_cadet_review", "pending_cadet_recheck"].includes(stage)) {
      return {
        actor: "Cadet",
        message: "Cadet must review complaint data and either request revision or forward it.",
      };
    }
    if (stage === "needs_complainant_revision") {
      return {
        actor: "Complainant",
        message: "Complainant must fix the reported issues and resubmit the complaint.",
      };
    }
    if (stage === "pending_officer_review") {
      return {
        actor: "Police Officer / Sergeant / Captain / Police Chief",
        message: "A police reviewer must approve formation or return the case to cadet.",
      };
    }
  }

  if (path === "crime_scene") {
    if (stage === "needs_creator_revision") {
      return {
        actor: `Case Creator (${roleDisplayName(caseData?.created_by_role)})`,
        message: "Creator must update the record and re-submit it for superior approval.",
      };
    }
    if (stage === "pending_superior_approval") {
      return {
        actor: sceneApproverLabelForCreatorRole(caseData?.created_by_role),
        message: "A valid superior reviewer must approve formation for this crime-scene case.",
      };
    }
  }

  return {
    actor: "Unknown",
    message: "No validation summary is available for the current stage.",
  };
}

function normalizedCaseLifecycleStatus(caseStatus, workflow) {
  const status = normalizeText(caseStatus);
  const stage = normalizeText(workflow?.stage || workflow?.status);

  const canonical = [
    "awaiting_validation",
    "invalidated",
    "open",
    "under_investigation",
    "awaiting_trial",
    "closed",
  ];
  if (canonical.includes(status)) {
    return status;
  }
  if (status === "voided" || workflow?.is_voided) {
    return "invalidated";
  }
  if (
    [
      "pending_cadet_review",
      "pending_cadet_recheck",
      "needs_complainant_revision",
      "pending_officer_review",
      "pending_superior_approval",
      "needs_creator_revision",
    ].includes(status)
  ) {
    return "awaiting_validation";
  }
  if (
    [
      "pending_cadet_review",
      "pending_cadet_recheck",
      "needs_complainant_revision",
      "pending_officer_review",
      "pending_superior_approval",
      "needs_creator_revision",
    ].includes(stage)
  ) {
    return "awaiting_validation";
  }
  if (status === "formed") {
    return "open";
  }
  return status || "open";
}

function caseLifecycleSteps(currentStatus) {
  const sequence = [
    "awaiting_validation",
    "open",
    "under_investigation",
    "awaiting_trial",
    "closed",
  ];
  const current = normalizeText(currentStatus);
  const currentIndex = sequence.indexOf(current);
  const invalidated = current === "invalidated";

  return sequence.map((step, index) => ({
    key: step,
    label: step.replaceAll("_", " "),
    active: !invalidated && current === step,
    done: !invalidated && currentIndex >= 0 && index < currentIndex,
    muted: invalidated,
  }));
}

function workflowStageChips(workflow) {
  const path = normalizeText(workflow?.path);
  const stage = normalizeText(workflow?.stage || workflow?.status);
  if (path === "complaint") {
    return [
      {
        key: "cadet",
        label: "Cadet Review",
        active: ["pending_cadet_review", "pending_cadet_recheck"].includes(stage),
        done: ["pending_officer_review", "formed"].includes(stage) || Boolean(workflow?.formed),
      },
      {
        key: "complainant_revision",
        label: "Complainant Revision",
        active: stage === "needs_complainant_revision",
        done: false,
      },
      {
        key: "officer",
        label: "Officer Approval",
        active: stage === "pending_officer_review",
        done: stage === "formed" || Boolean(workflow?.formed),
      },
      {
        key: "formed",
        label: "Formation Approved",
        active: stage === "formed" || Boolean(workflow?.formed),
        done: false,
      },
    ];
  }

  if (path === "crime_scene") {
    return [
      {
        key: "superior",
        label: "Superior Approval",
        active: stage === "pending_superior_approval",
        done: stage === "formed" || Boolean(workflow?.formed),
      },
      {
        key: "creator_revision",
        label: "Creator Revision",
        active: stage === "needs_creator_revision",
        done: false,
      },
      {
        key: "formed",
        label: "Formation Approved",
        active: stage === "formed" || Boolean(workflow?.formed),
        done: false,
      },
    ];
  }

  return [];
}

export function CaseDetailPage() {
  const { caseId } = useParams();
  const { token, roleName, user } = useAuth();
  const complainantView = isComplainantRole(roleName);
  const detectiveView = isDetectiveRole(roleName);
  const judgeView = isJudgeRole(roleName);
  const readOnlyCaseView = complainantView || judgeView;
  const canCreateEvidence = detectiveView;
  const [activeTab, setActiveTab] = useState("info");
  const [caseData, setCaseData] = useState(null);
  const [evidence, setEvidence] = useState([]);
  const [suspects, setSuspects] = useState([]);
  const [logs, setLogs] = useState([]);
  const [workflow, setWorkflow] = useState(() => api.getMockWorkflowState(caseId));
  const [error, setError] = useState("");
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [newSuspect, setNewSuspect] = useState({ name: "", national_id: "" });
  const [workflowComment, setWorkflowComment] = useState("");

  async function loadAll() {
    setError("");
    try {
      const [caseResponse, evidenceResponse, suspectResponse, logResponse] = await Promise.all([
        api.getCase(token, caseId),
        api.listEvidence(token, caseId),
        api.listSuspects(token, caseId),
        api.listInvestigationActions(token, caseId),
      ]);
      setCaseData(caseResponse);
      setEvidence(evidenceResponse);
      setSuspects(suspectResponse);
      setLogs(logResponse);
      setWorkflow(api.getMockWorkflowState(caseId));
    } catch (err) {
      setError(err.message || "Failed to load case details");
    }
  }

  useEffect(() => {
    loadAll();
  }, [caseId]);

  async function onCreateEvidence(payload) {
    if (!canCreateEvidence) {
      setError("Only detective users can add evidence.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const created = await api.createEvidence(token, {
        case: Number(caseId),
        type: payload.type,
        title: payload.title,
        description: payload.description,
        registered_at: payload.registered_at,
        submitter_name: payload.submitter_name,
        submitter_role: payload.submitter_role,
        metadata: payload.metadata,
      });

      const attachmentRows = Array.isArray(payload.attachments) ? payload.attachments : [];
      const evidenceId = Number(created?.id);

      if (attachmentRows.length && evidenceId <= 0) {
        throw new Error("Evidence was created without a valid id for attachment upload.");
      }

      await Promise.all(
        attachmentRows.map((attachment) =>
          api.createEvidenceAttachment(token, {
            evidence: evidenceId,
            file: attachment.file,
            file_url: attachment.file_url,
            file_path: attachment.file_path,
            mime_type: attachment.mime_type,
            original_name: attachment.original_name,
          }),
        ),
      );

      setShowEvidenceModal(false);
      await loadAll();
    } catch (err) {
      setError(err.message || "Failed to create evidence");
    } finally {
      setBusy(false);
    }
  }

  async function onVerifyEvidence(evidenceId) {
    setError("");
    try {
      await api.verifyEvidence(token, evidenceId);
      await loadAll();
    } catch (err) {
      setError(err.message || "Failed to verify evidence");
    }
  }

  async function addSuspect() {
    if (!detectiveView) {
      setError("Only detective users can add suspects.");
      return;
    }
    if (!newSuspect.name.trim()) return;
    setError("");
    try {
      await api.createSuspect(token, {
        case: Number(caseId),
        name: newSuspect.name,
        national_id: newSuspect.national_id,
      });
      setNewSuspect({ name: "", national_id: "" });
      await loadAll();
    } catch (err) {
      setError(err.message || "Failed to add suspect");
    }
  }

  async function applyTransition(actionKey, requiresComment = false) {
    setError("");
    if (requiresComment && !workflowComment.trim()) {
      setError("A workflow message is required for this action.");
      return;
    }
    try {
      const next = await api.transitionCase(token, caseId, {
        action: actionKey,
        role: roleName,
        comment: workflowComment.trim(),
      });
      setWorkflow(next);
      setWorkflowComment("");
      await loadAll();
    } catch (err) {
      setError(err.message || "Failed transition");
    }
  }

  const workflowActions = workflowActionsForUser({
    workflow,
    roleName,
    user,
    caseData,
  });
  const lifecycleStatus = normalizedCaseLifecycleStatus(caseData?.status, workflow);
  const validationSummary = validationResponsibilitySummary(workflow, caseData);
  const lifecycleStepRows = caseLifecycleSteps(lifecycleStatus);
  const validationStepRows = workflowStageChips(workflow);

  const workflowPanel = (
    <div className="mb-4 rounded-xl border border-zinc-700 bg-zinc-900/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Case Formation Validation</p>
          <h2 className="mt-1 text-base font-semibold text-paper">
            {workflowPathLabel(workflow?.path)}
          </h2>
          <p className="mt-1 text-xs text-zinc-400">
            Validation UI for case creation approval only (separate from investigation/trial progress).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge value={lifecycleStatus} />
          <StatusBadge value={workflow?.stage || workflow?.status} />
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded border border-zinc-800 bg-zinc-950/70 p-3">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Validation Stage</p>
          <p className="mt-1 text-sm font-medium text-paper">
            {workflowStageLabel(workflow?.stage || workflow?.status)}
          </p>
        </div>
        <div className="rounded border border-zinc-800 bg-zinc-950/70 p-3">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Responsible Now</p>
          <p className="mt-1 text-sm font-medium text-paper">{validationSummary.actor}</p>
        </div>
        <div className="rounded border border-zinc-800 bg-zinc-950/70 p-3">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Case Lifecycle</p>
          <p className="mt-1 text-sm font-medium text-paper">
            {lifecycleStatus.replaceAll("_", " ")}
          </p>
        </div>
        <div className="rounded border border-zinc-800 bg-zinc-950/70 p-3">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Revisions</p>
          <p className="mt-1 text-sm font-medium text-paper">
            {normalizeText(workflow?.path) === "complaint"
              ? `${workflow?.complainant_revision_count ?? workflow?.rejection_count ?? 0} / 3 complainant retries`
              : `${workflow?.rejection_count ?? 0} revision return(s)`}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded border border-zinc-800 bg-zinc-950/70 p-3">
        <p className="text-xs uppercase tracking-wide text-zinc-500">Who Should Act Next</p>
        <p className="mt-1 text-sm text-paper">{validationSummary.message}</p>
        {workflow?.formed && (
          <p className="mt-2 text-xs text-emerald-300">Formation approved. No validation action is pending.</p>
        )}
        {workflow?.is_voided && (
          <p className="mt-2 text-xs text-rose-300">This complaint is invalidated and cannot proceed further.</p>
        )}
      </div>

      {!!lifecycleStepRows.length && (
        <div className="mt-4">
          <p className="mb-2 text-xs uppercase tracking-wide text-zinc-500">Case Status Progress (Backend-aligned)</p>
          <div className="grid gap-2 md:grid-cols-5">
            {lifecycleStepRows.map((step) => (
              <div
                key={`lifecycle-${step.key}`}
                className={`rounded border px-2 py-2 text-xs ${
                  step.active
                    ? "border-sky-500/60 bg-sky-500/10 text-sky-200"
                    : step.done
                      ? "border-emerald-700/60 bg-emerald-700/10 text-emerald-200"
                      : step.muted
                        ? "border-zinc-800 bg-zinc-950/80 text-zinc-500"
                        : "border-zinc-800 bg-zinc-950/80 text-zinc-400"
                }`}
              >
                {step.label}
              </div>
            ))}
          </div>
        </div>
      )}

      {!!validationStepRows.length && (
        <div className="mt-4">
          <p className="mb-2 text-xs uppercase tracking-wide text-zinc-500">Validation Flow Progress</p>
          <div className={`grid gap-2 ${validationStepRows.length >= 4 ? "md:grid-cols-4" : "md:grid-cols-3"}`}>
            {validationStepRows.map((step) => (
              <div
                key={`validation-${step.key}`}
                className={`rounded border px-2 py-2 text-xs ${
                  step.active
                    ? "border-brass/70 bg-brass/10 text-brass"
                    : step.done
                      ? "border-emerald-700/60 bg-emerald-700/10 text-emerald-200"
                      : "border-zinc-800 bg-zinc-950/80 text-zinc-400"
                }`}
              >
                {step.label}
              </div>
            ))}
          </div>
        </div>
      )}

      {workflow?.rejection_count > 0 && workflow?.rejection_count < 3 && (
        <div className="mt-4 rounded border border-amber-600/40 bg-amber-600/10 p-3 text-sm text-amber-200">
          There are previous validation returns on this case. Review the last message before approving.
        </div>
      )}

      {workflow?.last_comment && (
        <div className="mt-4 rounded border border-zinc-800 bg-zinc-950/70 p-3">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Last Validation Message</p>
          <p className="mt-1 text-sm text-zinc-200">{workflow.last_comment}</p>
        </div>
      )}

      <div className="mt-4 rounded border border-zinc-800 bg-zinc-950/70 p-3">
        <p className="text-xs uppercase tracking-wide text-zinc-500">Available Validation Actions</p>
        {!!workflowActions.length ? (
          <div className="mt-2">
            <label className="mb-2 block text-xs uppercase tracking-wide text-zinc-500">
              Validation Message (required for return/revision actions)
            </label>
            <textarea
              className="input min-h-20"
              placeholder="Write the reason for return / revision request"
              value={workflowComment}
              onChange={(e) => setWorkflowComment(e.target.value)}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {workflowActions.map((item) => (
                <button
                  key={item.key}
                  className={item.tone === "primary" ? "btn-primary" : "btn-secondary"}
                  onClick={() => applyTransition(item.key, item.requiresComment)}
                  disabled={workflow?.is_voided}
                  title={item.requiresComment ? "Requires a validation message" : ""}
                >
                  {item.label}
                  {item.requiresComment ? " *" : ""}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="mt-2 text-sm text-zinc-500">
            Your role has no validation action at the current stage.
          </p>
        )}
      </div>
    </div>
  );

  const tabContent = useMemo(() => {
    if (activeTab === "info") {
      return (
        <div className="space-y-3">
          {workflowPanel}
          <p><span className="text-zinc-400">Title:</span> {caseData?.title}</p>
          <p>
            <span className="text-zinc-400">Case Status:</span>{" "}
            <StatusBadge value={lifecycleStatus} />
            {normalizeText(caseData?.status) !== normalizeText(lifecycleStatus) && (
              <span className="ml-2 text-xs text-zinc-500">
                (raw status: {String(caseData?.status || "-").replaceAll("_", " ")})
              </span>
            )}
          </p>
          <p><span className="text-zinc-400">Level:</span> {caseData?.level}</p>
          <p><span className="text-zinc-400">Description:</span> {caseData?.description || "-"}</p>
          <Link to={`/reports?caseId=${caseId}`} className="text-sm text-brass underline">
            Open printable report for this case
          </Link>
        </div>
      );
    }

    if (activeTab === "evidence") {
      return (
        <div className="space-y-3">
          {canCreateEvidence && (
            <button className="btn-primary" onClick={() => setShowEvidenceModal(true)}>
              Add Evidence
            </button>
          )}
          {!canCreateEvidence && (
            <p className="text-sm text-zinc-500">Only detectives can register evidence.</p>
          )}
          {evidence.map((item) => {
            const type = normalizeText(item.type);
            const metadata = evidenceMetadata(item);
            const attachments = evidenceAttachments(item);
            const registeredAt = evidenceRegisteredAt(item);
            const submitter = evidenceSubmitter(item);
            const vehicleModel = String(metadata.model ?? metadata.model_name ?? "").trim();
            const vehicleColor = String(metadata.color || "").trim();
            const vehiclePlate = String(metadata.plate ?? metadata.license_plate ?? "").trim();
            const vehicleSerial = String(metadata.serial_number || "").trim();
            const ownerFullName = String(metadata.owner_full_name ?? metadata.owner_name ?? "").trim();
            const idDetails = identityDetailsRows(metadata);
            const bioSampleType = String(metadata.sample_type || "").trim();
            const bioDoctorNotes = String(metadata.doctor_notes || "").trim();
            const bioIdentityDbNotes = String(metadata.identity_db_notes || "").trim();
            const testimonyTranscript = String(metadata.transcript || "").trim();
            const otherNotes = String(metadata.notes || "").trim();

            return (
              <article key={item.id} className="rounded border border-zinc-700 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-base font-semibold">{evidenceTitle(item)}</h3>
                    <p className="text-xs text-zinc-400">Evidence #{item.id}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge value={item.status} />
                    {detectiveView && normalizeText(item.type) !== "bio_medical" && item.status !== "verified" && (
                      <button className="btn-secondary" onClick={() => onVerifyEvidence(item.id)}>
                        Verify
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <p className="text-sm">
                    <span className="text-zinc-400">Type:</span> {evidenceTypeLabel(item.type)}
                  </p>
                  <p className="text-sm">
                    <span className="text-zinc-400">Registered At:</span> {formatDateTime(registeredAt)}
                  </p>
                  <p className="text-sm">
                    <span className="text-zinc-400">Recorder:</span> {submitter}
                  </p>
                </div>

                <p className="mt-2 text-sm">
                  <span className="text-zinc-400">Description:</span> {evidenceDescription(item)}
                </p>

                {type === "testimony" && (
                  <div className="mt-3 rounded border border-zinc-800 bg-zinc-900/50 p-3">
                    <p className="text-xs uppercase tracking-wide text-zinc-400">Witness / Local Statement</p>
                    <p className="mt-1 text-sm">
                      <span className="text-zinc-400">Transcript:</span> {testimonyTranscript || "-"}
                    </p>
                  </div>
                )}

                {type === "bio_medical" && (
                  <div className="mt-3 rounded border border-zinc-800 bg-zinc-900/50 p-3">
                    <p className="text-xs uppercase tracking-wide text-zinc-400">Biological / Medical</p>
                    <p className="mt-1 text-sm">
                      <span className="text-zinc-400">Sample Type:</span> {bioSampleType || "-"}
                    </p>
                    <p className="mt-1 text-sm">
                      <span className="text-zinc-400">Doctor Follow-up:</span> {bioDoctorNotes || "(pending)"}
                    </p>
                    <p className="mt-1 text-sm">
                      <span className="text-zinc-400">Identity DB Follow-up:</span> {bioIdentityDbNotes || "(pending)"}
                    </p>
                  </div>
                )}

                {type === "vehicle" && (
                  <div className="mt-3 rounded border border-zinc-800 bg-zinc-900/50 p-3">
                    <p className="text-xs uppercase tracking-wide text-zinc-400">Vehicle Evidence</p>
                    <p className="mt-1 text-sm">
                      <span className="text-zinc-400">Model:</span> {vehicleModel || "-"}
                    </p>
                    <p className="mt-1 text-sm">
                      <span className="text-zinc-400">Color:</span> {vehicleColor || "-"}
                    </p>
                    <p className="mt-1 text-sm">
                      <span className="text-zinc-400">Plate:</span> {vehiclePlate || "-"}
                    </p>
                    <p className="mt-1 text-sm">
                      <span className="text-zinc-400">Serial Number:</span> {vehicleSerial || "-"}
                    </p>
                  </div>
                )}

                {type === "identity" && (
                  <div className="mt-3 rounded border border-zinc-800 bg-zinc-900/50 p-3">
                    <p className="text-xs uppercase tracking-wide text-zinc-400">Identification Document</p>
                    <p className="mt-1 text-sm">
                      <span className="text-zinc-400">Owner Full Name:</span> {ownerFullName || "-"}
                    </p>
                    {!!idDetails.length && (
                      <div className="mt-2 grid gap-1">
                        {idDetails.map(([key, value]) => (
                          <p key={`${item.id}-${key}`} className="text-sm">
                            <span className="text-zinc-400">{key}:</span> {value || "-"}
                          </p>
                        ))}
                      </div>
                    )}
                    {!idDetails.length && (
                      <p className="mt-2 text-sm text-zinc-500">No extra key-value details.</p>
                    )}
                  </div>
                )}

                {type === "other" && (
                  <div className="mt-3 rounded border border-zinc-800 bg-zinc-900/50 p-3">
                    <p className="text-xs uppercase tracking-wide text-zinc-400">Other Evidence</p>
                    <p className="mt-1 text-sm">
                      <span className="text-zinc-400">Additional Notes:</span> {otherNotes || "-"}
                    </p>
                  </div>
                )}

                {!["testimony", "bio_medical", "vehicle", "identity", "other"].includes(type) && (
                  <div className="mt-3 rounded border border-zinc-800 bg-zinc-900/50 p-3">
                    <p className="text-xs uppercase tracking-wide text-zinc-400">Raw Metadata</p>
                    <pre className="mt-2 overflow-auto rounded bg-zinc-950 p-2 text-xs">
                      {JSON.stringify(metadata, null, 2)}
                    </pre>
                  </div>
                )}

                <div className="mt-3 rounded border border-zinc-800 bg-zinc-900/50 p-3">
                  <p className="text-xs uppercase tracking-wide text-zinc-400">Attachments</p>
                  {attachments.length ? (
                    <div className="mt-2 space-y-2">
                      {attachments.map((attachment, index) => (
                        <div key={`${item.id}-attachment-${attachment.id || index}`} className="rounded bg-zinc-950 p-2">
                          <p className="text-sm">
                            <span className="text-zinc-400">Name:</span>{" "}
                            {attachment.original_name || `Attachment #${index + 1}`}
                          </p>
                          <p className="text-sm">
                            <span className="text-zinc-400">MIME:</span> {attachment.mime_type || "-"}
                          </p>
                          <p className="text-sm">
                            <span className="text-zinc-400">Path:</span> {attachment.file_path || "-"}
                          </p>
                          <p className="text-sm">
                            <span className="text-zinc-400">URL:</span>{" "}
                            {attachment.file_url ? (
                              <a
                                href={attachment.file_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-brass underline"
                              >
                                {attachment.file_url}
                              </a>
                            ) : (
                              "-"
                            )}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-zinc-500">No attachment.</p>
                  )}
                </div>
              </article>
            );
          })}
          {!evidence.length && <p className="text-zinc-400">No evidence entries.</p>}
        </div>
      );
    }

    if (activeTab === "suspects") {
      return (
        <div className="space-y-3">
          {detectiveView ? (
            <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
              <input
                className="input"
                placeholder="Suspect name"
                value={newSuspect.name}
                onChange={(e) => setNewSuspect((prev) => ({ ...prev, name: e.target.value }))}
              />
              <input
                className="input"
                placeholder="National ID (optional)"
                value={newSuspect.national_id}
                onChange={(e) => setNewSuspect((prev) => ({ ...prev, national_id: e.target.value }))}
              />
              <button className="btn-primary" onClick={addSuspect}>Add</button>
            </div>
          ) : <p className="text-sm text-zinc-500">Suspect records are read-only for this role.</p>}

          {suspects.map((item) => (
            <div key={item.id} className="rounded border border-zinc-700 p-3">
              <p className="font-medium">{item.name}</p>
              <p className="text-sm text-zinc-400">Status: {item.status} | Score: {item.score}</p>
            </div>
          ))}
          {!suspects.length && <p className="text-zinc-400">No suspects yet.</p>}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {logs.map((item) => (
          <div key={item.id} className="rounded border border-zinc-700 p-3">
            <p className="font-medium">{item.action_type}</p>
            <p className="text-xs text-zinc-400">{new Date(item.created_at).toLocaleString()}</p>
            <pre className="mt-2 overflow-auto rounded bg-zinc-950 p-2 text-xs">{JSON.stringify(item.payload, null, 2)}</pre>
          </div>
        ))}
        {!logs.length && <p className="text-zinc-400">No logs yet.</p>}
      </div>
    );
  }, [
    activeTab,
    caseData,
    evidence,
    suspects,
    logs,
    workflow,
    workflowActions,
    workflowComment,
    newSuspect,
    readOnlyCaseView,
    caseId,
    detectiveView,
    canCreateEvidence,
  ]);

  return (
    <section>
      <h1 className="font-display text-3xl uppercase text-brass">Case #{caseId}</h1>
      <p className="mb-4 mt-1 text-zinc-400">Folder view with tabs</p>

      {error && <p className="mb-4 text-danger">{error}</p>}

      <div className="mb-4 flex gap-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={`btn ${activeTab === tab ? "bg-brass text-ink" : "bg-zinc-900 text-paper"}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="card p-4">{tabContent}</div>

      <EvidenceEntryModal
        open={showEvidenceModal}
        onClose={() => setShowEvidenceModal(false)}
        onSubmit={onCreateEvidence}
        busy={busy}
      />
    </section>
  );
}
