import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { StatusBadge } from "../components/StatusBadge";
import { EvidenceEntryModal } from "../components/EvidenceEntryModal";
import { isComplainantRole, isJudgeRole } from "../lib/roleRouting";

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

export function CaseDetailPage() {
  const { caseId } = useParams();
  const { token, roleName } = useAuth();
  const complainantView = isComplainantRole(roleName);
  const judgeView = isJudgeRole(roleName);
  const readOnlyCaseView = complainantView || judgeView;
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
    if (judgeView) {
      setError("Judge users cannot add evidence.");
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
    if (judgeView) {
      setError("Judge users cannot add suspects.");
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

  async function applyTransition(action) {
    setError("");
    if (readOnlyCaseView) {
      setError("This role cannot accept/reject case workflow.");
      return;
    }
    try {
      const next = await api.transitionCase(token, caseId, {
        action,
        role: roleName,
        comment: action === "reject" ? "Needs revision" : "Approved",
      });
      setWorkflow(next);
    } catch (err) {
      setError(err.message || "Failed transition");
    }
  }

  const workflowPanel = (
    <div className="mb-4 rounded border border-zinc-700 bg-zinc-900/50 p-3">
      <p className="text-sm text-zinc-300">
        Workflow status (mocked until backend transition endpoint exists): <span className="text-brass">{workflow.status}</span>
      </p>
      <p className="text-sm text-zinc-400">Rejection count: {workflow.rejection_count}/3</p>
      {workflow.rejection_count > 0 && workflow.rejection_count < 3 && (
        <p className="mt-2 text-sm text-brass">Warning: complaint has previous rejection(s), fix issues before re-submission.</p>
      )}
      {workflow.is_voided && (
        <p className="mt-2 text-sm text-danger">3-strikes reached: complaint is voided and cannot proceed.</p>
      )}
      {!readOnlyCaseView ? (
        <div className="mt-3 flex gap-2">
          <button className="btn-secondary" onClick={() => applyTransition("reject")} disabled={workflow.is_voided}>
            Reject
          </button>
          <button className="btn-primary" onClick={() => applyTransition("accept")} disabled={workflow.is_voided}>
            Accept
          </button>
        </div>
      ) : (
        <p className="mt-3 text-xs text-zinc-500">Read-only workflow view for this role.</p>
      )}
    </div>
  );

  const tabContent = useMemo(() => {
    if (activeTab === "info") {
      return (
        <div className="space-y-3">
          {workflowPanel}
          <p><span className="text-zinc-400">Title:</span> {caseData?.title}</p>
          <p><span className="text-zinc-400">Status:</span> <StatusBadge value={caseData?.status} /></p>
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
          {!readOnlyCaseView && (
            <button className="btn-primary" onClick={() => setShowEvidenceModal(true)}>
              Add Evidence
            </button>
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
                    {!readOnlyCaseView && item.status !== "verified" && (
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
          {!readOnlyCaseView ? (
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
          ) : (
            <p className="text-sm text-zinc-500">Suspect records are read-only for this role.</p>
          )}

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
  }, [activeTab, caseData, evidence, suspects, logs, workflow, newSuspect, readOnlyCaseView, caseId]);

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
