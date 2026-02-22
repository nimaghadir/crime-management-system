import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { StatusBadge } from "../components/StatusBadge";
import { EvidenceEntryModal } from "../components/EvidenceEntryModal";
import { isComplainantRole } from "../lib/roleRouting";

const tabs = ["info", "evidence", "suspects", "logs"];

export function CaseDetailPage() {
  const { caseId } = useParams();
  const { token, roleName } = useAuth();
  const complainantView = isComplainantRole(roleName);
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
    setBusy(true);
    try {
      const created = await api.createEvidence(token, {
        case: Number(caseId),
        type: payload.type,
        metadata: payload.metadata,
      });

      if (payload.attachment?.file_url || payload.attachment?.file_path) {
        await api.createEvidenceAttachment(token, {
          evidence: created.id,
          ...payload.attachment,
        });
      }

      setShowEvidenceModal(false);
      await loadAll();
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
    if (complainantView) {
      setError("Complainant users cannot accept/reject case workflow.");
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
      {!complainantView ? (
        <div className="mt-3 flex gap-2">
          <button className="btn-secondary" onClick={() => applyTransition("reject")} disabled={workflow.is_voided}>
            Reject
          </button>
          <button className="btn-primary" onClick={() => applyTransition("accept")} disabled={workflow.is_voided}>
            Accept
          </button>
        </div>
      ) : (
        <p className="mt-3 text-xs text-zinc-500">Read-only workflow view for complainant users.</p>
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
          {!complainantView && (
            <button className="btn-primary" onClick={() => setShowEvidenceModal(true)}>
              Add Evidence
            </button>
          )}
          {evidence.map((item) => (
            <div key={item.id} className="rounded border border-zinc-700 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-zinc-400">Evidence #{item.id}</p>
                <div className="flex items-center gap-2">
                  <StatusBadge value={item.status} />
                  {!complainantView && item.status !== "verified" && (
                    <button className="btn-secondary" onClick={() => onVerifyEvidence(item.id)}>
                      Verify
                    </button>
                  )}
                </div>
              </div>
              <p className="mt-2">Type: {item.type}</p>
              <pre className="mt-2 overflow-auto rounded bg-zinc-950 p-2 text-xs">{JSON.stringify(item.metadata, null, 2)}</pre>
            </div>
          ))}
          {!evidence.length && <p className="text-zinc-400">No evidence entries.</p>}
        </div>
      );
    }

    if (activeTab === "suspects") {
      return (
        <div className="space-y-3">
          {!complainantView ? (
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
            <p className="text-sm text-zinc-500">Suspect records are read-only for complainant users.</p>
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
  }, [activeTab, caseData, evidence, suspects, logs, workflow, newSuspect, complainantView]);

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
