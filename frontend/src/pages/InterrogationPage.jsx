import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { StatusBadge } from "../components/StatusBadge";
import {
  isCaptainRole,
  isChiefRole,
  isDetectiveRole,
  isSergeantRole,
} from "../lib/roleRouting";

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function isActiveCaseStatus(status) {
  return !["closed", "resolved", "voided", "invalidated"].includes(normalizeText(status));
}

function isCriticalCase(caseItem) {
  if (!caseItem) return false;
  return Number(caseItem.level) === 4 || normalizeText(caseItem.crime_level) === "critical";
}

function formatCaseLabel(caseItem) {
  if (!caseItem) return "";
  return `Case #${caseItem.id} - ${caseItem.title}`;
}

function byNewest(items = []) {
  return [...items].sort((a, b) => String(b?.created_at || "").localeCompare(String(a?.created_at || "")));
}

function latestSuspectAction(actions, suspectId, types = []) {
  const wanted = new Set(types.map((item) => normalizeText(item)));
  const rows = (actions || []).filter(
    (item) =>
      Number(item?.payload?.suspect_id) === Number(suspectId) &&
      wanted.has(normalizeText(item?.action_type)),
  );
  return byNewest(rows)[0] || null;
}

function actionTimestamp(action) {
  return String(action?.created_at || "");
}

function isNewer(left, right) {
  return actionTimestamp(left) > actionTimestamp(right);
}

function latestScoreSnapshot(actions, suspectId, role) {
  const normalizedRole = normalizeText(role);
  const specificType =
    normalizedRole === "detective" ? "detective_interrogation_score" : "sergeant_interrogation_score";
  const specific = latestSuspectAction(actions, suspectId, [specificType]);
  const legacy = latestSuspectAction(actions, suspectId, ["interrogation_scored"]);

  if (specific && (!legacy || isNewer(specific, legacy))) {
    return {
      action: specific,
      score: Number(specific?.payload?.score) || null,
      source: "specific",
    };
  }

  if (legacy) {
    const key = normalizedRole === "detective" ? "detective_score" : "sergeant_score";
    return {
      action: legacy,
      score: Number(legacy?.payload?.[key]) || null,
      source: "legacy",
    };
  }

  return {
    action: null,
    score: null,
    source: "",
  };
}

function averageFromScores(detectiveScore, sergeantScore) {
  const d = Number(detectiveScore);
  const s = Number(sergeantScore);
  if (!(d > 0) || !(s > 0)) return null;
  return Number(((d + s) / 2).toFixed(1));
}

function decisionIsApproved(action) {
  return ["approved", "approve", "accept", "accepted"].includes(
    normalizeText(action?.payload?.decision),
  );
}

function decisionIsRejected(action) {
  return ["rejected", "reject", "deny", "denied"].includes(
    normalizeText(action?.payload?.decision),
  );
}

function suspectWorkflowRow(suspect, actions, caseItem) {
  const referralAction = latestSuspectAction(actions, suspect.id, ["suspect_referred_to_sergeant"]);
  const sergeantDecisionAction = latestSuspectAction(actions, suspect.id, ["sergeant_referral_decision"]);
  const detectiveScore = latestScoreSnapshot(actions, suspect.id, "detective");
  const sergeantScore = latestScoreSnapshot(actions, suspect.id, "sergeant");
  const captainVerdictAction = latestSuspectAction(actions, suspect.id, [
    "captain_suspect_verdict",
    "captain_verdict_mock",
  ]);
  const chiefReviewAction = latestSuspectAction(actions, suspect.id, ["chief_captain_verdict_review"]);

  const referralPending =
    Boolean(referralAction) &&
    (!sergeantDecisionAction || isNewer(referralAction, sergeantDecisionAction));
  const referralApproved =
    Boolean(sergeantDecisionAction) &&
    decisionIsApproved(sergeantDecisionAction) &&
    (!referralAction || !isNewer(referralAction, sergeantDecisionAction));
  const referralRejected =
    Boolean(sergeantDecisionAction) &&
    decisionIsRejected(sergeantDecisionAction) &&
    (!referralAction || !isNewer(referralAction, sergeantDecisionAction));

  const bothScoresReady = Number(detectiveScore.score) > 0 && Number(sergeantScore.score) > 0;
  const newestScoreAction =
    !detectiveScore.action
      ? sergeantScore.action
      : !sergeantScore.action
        ? detectiveScore.action
        : isNewer(detectiveScore.action, sergeantScore.action)
          ? detectiveScore.action
          : sergeantScore.action;
  const captainNeedsDecision =
    bothScoresReady &&
    (!captainVerdictAction || (newestScoreAction && isNewer(newestScoreAction, captainVerdictAction)));
  const captainVerdictRequiresChief =
    Boolean(captainVerdictAction) &&
    (Object.prototype.hasOwnProperty.call(captainVerdictAction?.payload || {}, "requires_chief_review")
      ? Boolean(captainVerdictAction?.payload?.requires_chief_review)
      : isCriticalCase(caseItem));
  const chiefNeedsDecision =
    isCriticalCase(caseItem) &&
    captainVerdictRequiresChief &&
    (!chiefReviewAction || isNewer(captainVerdictAction, chiefReviewAction));

  return {
    suspect,
    referralAction,
    sergeantDecisionAction,
    detectiveScore,
    sergeantScore,
    captainVerdictAction,
    chiefReviewAction,
    referralPending,
    referralApproved,
    referralRejected,
    bothScoresReady,
    captainNeedsDecision,
    chiefNeedsDecision,
    captainVerdictRequiresChief,
    averageScore: averageFromScores(detectiveScore.score, sergeantScore.score),
  };
}

function actionTimeLabel(action) {
  if (!action?.created_at) return "-";
  try {
    return new Date(action.created_at).toLocaleString();
  } catch {
    return String(action.created_at);
  }
}

function readableVerdict(value) {
  const normalized = normalizeText(value);
  if (normalized === "arrest_warrant") return "Arrest Warrant";
  if (normalized === "dismiss") return "Dismiss / Continue Investigation";
  return String(value || "-").replaceAll("_", " ");
}

function rolePageTitle({ detectiveView, sergeantView, captainView, chiefView }) {
  if (detectiveView) return "Interrogation - Detective";
  if (sergeantView) return "Interrogation - Sergeant Review";
  if (captainView) return "Interrogation - Captain Decision";
  if (chiefView) return "Interrogation - Chief Critical Review";
  return "Interrogation";
}

function rolePageSubtitle({ detectiveView, sergeantView, captainView, chiefView }) {
  if (detectiveView) {
    return "Submit detective interrogation scores and track sergeant feedback on suspect referrals.";
  }
  if (sergeantView) {
    return "Review detective suspect referrals, authorize progression, and submit sergeant interrogation scores.";
  }
  if (captainView) {
    return "Review detective + sergeant scores and issue captain verdicts per suspect.";
  }
  if (chiefView) {
    return "Approve or reject captain verdicts for critical-level cases.";
  }
  return "Role-based interrogation and command workflow.";
}

export function InterrogationPage() {
  const { token, roleName, user } = useAuth();
  const detectiveView = isDetectiveRole(roleName);
  const sergeantView = isSergeantRole(roleName);
  const captainView = isCaptainRole(roleName);
  const chiefView = isChiefRole(roleName);
  const supportedRole = detectiveView || sergeantView || captainView || chiefView;

  const [cases, setCases] = useState([]);
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [suspects, setSuspects] = useState([]);
  const [actions, setActions] = useState([]);
  const [loadingCases, setLoadingCases] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [busyKey, setBusyKey] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [detectiveScoreDraft, setDetectiveScoreDraft] = useState({
    suspectId: "",
    score: "5",
    note: "",
  });
  const [sergeantScoreDraft, setSergeantScoreDraft] = useState({
    suspectId: "",
    score: "5",
    note: "",
  });
  const [referralNotesBySuspect, setReferralNotesBySuspect] = useState({});
  const [captainVerdictBySuspect, setCaptainVerdictBySuspect] = useState({});
  const [captainNotesBySuspect, setCaptainNotesBySuspect] = useState({});
  const [chiefNotesBySuspect, setChiefNotesBySuspect] = useState({});

  const selectedCase = useMemo(
    () => cases.find((item) => Number(item.id) === Number(selectedCaseId)) || null,
    [cases, selectedCaseId],
  );

  const suspectRows = useMemo(
    () => (suspects || []).map((suspect) => suspectWorkflowRow(suspect, actions, selectedCase)),
    [suspects, actions, selectedCase],
  );

  const pendingReferralRows = useMemo(
    () => suspectRows.filter((row) => row.referralPending),
    [suspectRows],
  );
  const detectiveScoringCandidates = useMemo(
    () => suspectRows.filter((row) => row.referralApproved || !row.referralAction),
    [suspectRows],
  );
  const sergeantScoringCandidates = useMemo(
    () => suspectRows.filter((row) => row.referralApproved),
    [suspectRows],
  );
  const captainDecisionRows = useMemo(
    () => suspectRows.filter((row) => row.captainNeedsDecision),
    [suspectRows],
  );
  const chiefDecisionRows = useMemo(
    () => suspectRows.filter((row) => row.chiefNeedsDecision),
    [suspectRows],
  );

  async function loadCases() {
    if (!supportedRole) return;
    setLoadingCases(true);
    setError("");
    try {
      const allCases = await api.listCases(token);
      const rows = (allCases || []).filter((item) => isActiveCaseStatus(item?.status));
      const userId = Number(user?.id);
      const mine = rows.filter((item) => {
        if (!userId) return false;
        if (detectiveView) return Number(item?.detective_id ?? item?.assigned_to) === userId;
        if (sergeantView) return Number(item?.sergeant_id ?? item?.supervisor_id) === userId;
        if (captainView) return Number(item?.captain_id) === userId;
        if (chiefView) return Number(item?.chief_id) === userId && isCriticalCase(item);
        return false;
      });

      const sorted = [...mine].sort((a, b) => String(b.updated_at || "").localeCompare(String(a.updated_at || "")));
      setCases(sorted);
      setSelectedCaseId((prev) => {
        if (sorted.some((item) => Number(item.id) === Number(prev))) return prev;
        return sorted.length ? String(sorted[0].id) : "";
      });
    } catch (err) {
      setError(err.message || "Failed to load role cases.");
    } finally {
      setLoadingCases(false);
    }
  }

  async function loadCaseDetails(caseId) {
    const id = Number(caseId);
    if (!id) {
      setSuspects([]);
      setActions([]);
      return;
    }
    setLoadingDetails(true);
    setError("");
    try {
      const [suspectRowsData, actionRowsData] = await Promise.all([
        api.listSuspects(token, id),
        api.listInvestigationActions(token, id),
      ]);
      const sortedActions = [...(Array.isArray(actionRowsData) ? actionRowsData : [])].sort((a, b) =>
        String(b.created_at || "").localeCompare(String(a.created_at || "")),
      );
      setSuspects(Array.isArray(suspectRowsData) ? suspectRowsData : []);
      setActions(sortedActions);
    } catch (err) {
      setError(err.message || "Failed to load case interrogation details.");
    } finally {
      setLoadingDetails(false);
    }
  }

  useEffect(() => {
    setMessage("");
    loadCases();
  }, [token, roleName, user?.id]);

  useEffect(() => {
    loadCaseDetails(selectedCaseId);
  }, [token, selectedCaseId]);

  useEffect(() => {
    if (!detectiveScoreDraft.suspectId && detectiveScoringCandidates.length) {
      setDetectiveScoreDraft((prev) => ({ ...prev, suspectId: String(detectiveScoringCandidates[0].suspect.id) }));
    }
  }, [detectiveScoringCandidates, detectiveScoreDraft.suspectId]);

  useEffect(() => {
    if (!sergeantScoreDraft.suspectId && sergeantScoringCandidates.length) {
      setSergeantScoreDraft((prev) => ({ ...prev, suspectId: String(sergeantScoringCandidates[0].suspect.id) }));
    }
  }, [sergeantScoringCandidates, sergeantScoreDraft.suspectId]);

  async function refreshAll({ keepMessage = true } = {}) {
    if (!keepMessage) setMessage("");
    await loadCases();
    await loadCaseDetails(selectedCaseId);
  }

  async function runAction(key, fn) {
    setBusyKey(key);
    setError("");
    setMessage("");
    try {
      await fn();
      await refreshAll();
    } catch (err) {
      setError(err.message || "Action failed.");
    } finally {
      setBusyKey("");
    }
  }

  async function submitDetectiveScore() {
    if (!selectedCaseId || !detectiveScoreDraft.suspectId) {
      setError("Select case and suspect.");
      return;
    }
    const row = suspectRows.find((item) => Number(item.suspect.id) === Number(detectiveScoreDraft.suspectId));
    if (row?.referralAction && !row?.referralApproved) {
      setError("Wait for sergeant approval before detective interrogation scoring.");
      return;
    }
    const score = Number(detectiveScoreDraft.score);
    if (!(score >= 1 && score <= 10)) {
      setError("Score must be between 1 and 10.");
      return;
    }

    await runAction("detective-score", async () => {
      await api.createInvestigationAction(token, {
        case: Number(selectedCaseId),
        action_type: "detective_interrogation_score",
        payload: {
          suspect_id: Number(detectiveScoreDraft.suspectId),
          score,
          note: String(detectiveScoreDraft.note || "").trim(),
          by_user_id: Number(user?.id) || null,
          by_role: roleName,
        },
      });
      setMessage("Detective score submitted.");
      setDetectiveScoreDraft((prev) => ({ ...prev, note: "" }));
    });
  }

  async function submitSergeantReferralDecision(row, decision) {
    const note = String(referralNotesBySuspect[row.suspect.id] || "").trim();
    if (decision === "REJECTED" && !note) {
      setError("A rejection message is required for sergeant referral rejection.");
      return;
    }

    await runAction(`sergeant-referral-${row.suspect.id}`, async () => {
      await api.createInvestigationAction(token, {
        case: Number(selectedCaseId),
        action_type: "sergeant_referral_decision",
        payload: {
          suspect_id: Number(row.suspect.id),
          decision,
          note,
          detective_id: Number(selectedCase?.detective_id ?? selectedCase?.assigned_to) || null,
          warrant_issued: decision === "APPROVED",
          interrogation_authorized: decision === "APPROVED",
          by_user_id: Number(user?.id) || null,
          by_role: roleName,
        },
      });
      setReferralNotesBySuspect((prev) => ({ ...prev, [row.suspect.id]: "" }));
      setMessage(
        decision === "APPROVED"
          ? `Suspect #${row.suspect.id} approved by sergeant.`
          : `Suspect #${row.suspect.id} returned to detective with feedback.`,
      );
    });
  }

  async function submitSergeantScore() {
    if (!selectedCaseId || !sergeantScoreDraft.suspectId) {
      setError("Select case and suspect.");
      return;
    }
    const row = suspectRows.find((item) => Number(item.suspect.id) === Number(sergeantScoreDraft.suspectId));
    if (!row?.referralApproved) {
      setError("Sergeant score requires an approved suspect referral.");
      return;
    }
    const score = Number(sergeantScoreDraft.score);
    if (!(score >= 1 && score <= 10)) {
      setError("Score must be between 1 and 10.");
      return;
    }

    await runAction("sergeant-score", async () => {
      await api.createInvestigationAction(token, {
        case: Number(selectedCaseId),
        action_type: "sergeant_interrogation_score",
        payload: {
          suspect_id: Number(sergeantScoreDraft.suspectId),
          score,
          note: String(sergeantScoreDraft.note || "").trim(),
          by_user_id: Number(user?.id) || null,
          by_role: roleName,
        },
      });
      setMessage("Sergeant score submitted.");
      setSergeantScoreDraft((prev) => ({ ...prev, note: "" }));
    });
  }

  async function submitCaptainVerdict(row) {
    const suspectId = Number(row?.suspect?.id);
    const verdict = String(captainVerdictBySuspect[suspectId] || "ARREST_WARRANT");
    const note = String(captainNotesBySuspect[suspectId] || "").trim();
    if (!row?.bothScoresReady) {
      setError("Captain verdict requires both detective and sergeant scores.");
      return;
    }

    await runAction(`captain-verdict-${suspectId}`, async () => {
      await api.createInvestigationAction(token, {
        case: Number(selectedCaseId),
        action_type: "captain_suspect_verdict",
        payload: {
          suspect_id: suspectId,
          verdict,
          note,
          detective_score: Number(row.detectiveScore.score) || null,
          sergeant_score: Number(row.sergeantScore.score) || null,
          average_score: Number(row.averageScore) || null,
          requires_chief_review: isCriticalCase(selectedCase),
          by_user_id: Number(user?.id) || null,
          by_role: roleName,
        },
      });
      setMessage(
        isCriticalCase(selectedCase)
          ? "Captain verdict submitted and forwarded to police chief (critical case)."
          : "Captain verdict submitted.",
      );
    });
  }

  async function submitChiefDecision(row, decision) {
    const suspectId = Number(row?.suspect?.id);
    const note = String(chiefNotesBySuspect[suspectId] || "").trim();
    if (!note) {
      setError("Please enter chief review note.");
      return;
    }
    await runAction(`chief-review-${suspectId}`, async () => {
      await api.createInvestigationAction(token, {
        case: Number(selectedCaseId),
        action_type: "chief_captain_verdict_review",
        payload: {
          suspect_id: suspectId,
          decision,
          note,
          by_user_id: Number(user?.id) || null,
          by_role: roleName,
        },
      });
      setMessage(
        decision === "APPROVED"
          ? "Police chief approved captain verdict."
          : "Police chief rejected captain verdict and returned case to investigation.",
      );
    });
  }

  const visibleLogs = useMemo(() => {
    const relevantTypes = new Set([
      "suspect_referred_to_sergeant",
      "sergeant_referral_decision",
      "detective_interrogation_score",
      "sergeant_interrogation_score",
      "interrogation_scored",
      "captain_suspect_verdict",
      "captain_verdict_mock",
      "chief_captain_verdict_review",
    ]);
    return (actions || []).filter((item) => relevantTypes.has(normalizeText(item.action_type))).slice(0, 20);
  }, [actions]);

  if (!supportedRole) {
    return (
      <section>
        <h1 className="font-display text-3xl uppercase text-brass">Interrogation</h1>
        <p className="mt-2 text-zinc-400">
          This page is only available for Detective, Sergeant, Captain, and Police Chief roles.
        </p>
      </section>
    );
  }

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl uppercase text-brass">
            {rolePageTitle({ detectiveView, sergeantView, captainView, chiefView })}
          </h1>
          <p className="mt-1 text-zinc-400">
            {rolePageSubtitle({ detectiveView, sergeantView, captainView, chiefView })}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {detectiveView && (
            <>
              <Link className="btn-secondary" to="/suspect-referrals">
                Suspect Referrals
              </Link>
              <Link className="btn-secondary" to="/evidence-review">
                Evidence Review
              </Link>
            </>
          )}
          {(captainView || chiefView) && (
            <Link className="btn-secondary" to="/reports">
              Reports
            </Link>
          )}
          <button className="btn-secondary" onClick={() => refreshAll({ keepMessage: false })} disabled={loadingCases || loadingDetails || Boolean(busyKey)}>
            {(loadingCases || loadingDetails) ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {error && <p className="mb-4 text-danger">{error}</p>}
      {message && <p className="mb-4 text-emerald-400">{message}</p>}

      <div className="mb-4 card p-4">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <select
            className="input"
            value={selectedCaseId}
            onChange={(event) => setSelectedCaseId(event.target.value)}
            disabled={loadingCases || !cases.length}
          >
            {!cases.length && <option value="">No role-assigned cases available</option>}
            {cases.map((item) => (
              <option key={item.id} value={item.id}>
                {formatCaseLabel(item)}
              </option>
            ))}
          </select>
          <p className="rounded border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-sm text-zinc-300">
            {loadingCases ? "Loading cases..." : `${cases.length} case(s)`}
          </p>
        </div>

        {selectedCase && (
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded border border-zinc-800 bg-zinc-950/70 p-3 text-sm">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Case Status</p>
              <div className="mt-2"><StatusBadge value={selectedCase.status} /></div>
            </div>
            <div className="rounded border border-zinc-800 bg-zinc-950/70 p-3 text-sm">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Crime Level</p>
              <p className="mt-2 text-paper">{selectedCase.level ?? "-"}</p>
              {isCriticalCase(selectedCase) && <p className="text-xs text-amber-300">Critical case (chief review required)</p>}
            </div>
            <div className="rounded border border-zinc-800 bg-zinc-950/70 p-3 text-sm">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Assignments</p>
              <p className="mt-2 text-zinc-300">Detective: {selectedCase.detective_id ? `#${selectedCase.detective_id}` : "Unassigned"}</p>
              <p className="text-zinc-300">Sergeant: {selectedCase.sergeant_id ?? selectedCase.supervisor_id ? `#${selectedCase.sergeant_id ?? selectedCase.supervisor_id}` : "Unassigned"}</p>
              <p className="text-zinc-300">Captain: {selectedCase.captain_id ? `#${selectedCase.captain_id}` : "Unassigned"}</p>
              <p className="text-zinc-300">Chief: {selectedCase.chief_id ? `#${selectedCase.chief_id}` : "Unassigned"}</p>
            </div>
            <div className="rounded border border-zinc-800 bg-zinc-950/70 p-3 text-sm">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Selected Case Queues</p>
              <p className="mt-2 text-zinc-300">Pending referrals: {pendingReferralRows.length}</p>
              <p className="text-zinc-300">Captain decisions: {captainDecisionRows.length}</p>
              <p className="text-zinc-300">Chief critical reviews: {chiefDecisionRows.length}</p>
            </div>
          </div>
        )}
      </div>

      {!!selectedCase && (
        <div className="space-y-4">
          {detectiveView && (
            <>
              <div className="card p-4">
                <p className="mb-3 font-semibold">Detective Interrogation Score</p>
                <p className="mb-3 text-sm text-zinc-400">
                  Detective can score suspects after sergeant approves the referral. Score range is 1 to 10.
                </p>
                <div className="grid gap-3 md:grid-cols-3">
                  <select
                    className="input"
                    value={detectiveScoreDraft.suspectId}
                    onChange={(event) =>
                      setDetectiveScoreDraft((prev) => ({ ...prev, suspectId: event.target.value }))
                    }
                    disabled={!detectiveScoringCandidates.length || loadingDetails}
                  >
                    {!detectiveScoringCandidates.length && <option value="">No eligible suspects</option>}
                    {detectiveScoringCandidates.map((row) => (
                      <option key={row.suspect.id} value={row.suspect.id}>
                        #{row.suspect.id} - {row.suspect.name}
                      </option>
                    ))}
                  </select>
                  <input
                    className="input"
                    type="number"
                    min={1}
                    max={10}
                    value={detectiveScoreDraft.score}
                    onChange={(event) =>
                      setDetectiveScoreDraft((prev) => ({ ...prev, score: event.target.value }))
                    }
                  />
                  <button className="btn-primary" onClick={submitDetectiveScore} disabled={busyKey === "detective-score" || loadingDetails}>
                    {busyKey === "detective-score" ? "Submitting..." : "Submit Detective Score"}
                  </button>
                </div>
                <textarea
                  className="input mt-3 min-h-20"
                  placeholder="Detective interrogation note (optional)"
                  value={detectiveScoreDraft.note}
                  onChange={(event) =>
                    setDetectiveScoreDraft((prev) => ({ ...prev, note: event.target.value }))
                  }
                />
              </div>

              <div className="card p-4">
                <p className="mb-3 font-semibold">Referral & Approval Status (Selected Case)</p>
                <div className="overflow-x-auto rounded border border-zinc-800">
                  <table className="min-w-full text-sm">
                    <thead className="bg-zinc-900/80 text-zinc-300">
                      <tr>
                        <th className="px-3 py-2 text-left">Suspect</th>
                        <th className="px-3 py-2 text-left">Referral</th>
                        <th className="px-3 py-2 text-left">Sergeant Decision</th>
                        <th className="px-3 py-2 text-left">Detective Score</th>
                        <th className="px-3 py-2 text-left">Sergeant Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!loadingDetails &&
                        suspectRows.map((row) => (
                          <tr key={row.suspect.id} className="border-t border-zinc-800">
                            <td className="px-3 py-2">
                              #{row.suspect.id} - {row.suspect.name}
                              <div className="mt-1 text-xs text-zinc-500">Status: {row.suspect.status || "-"}</div>
                            </td>
                            <td className="px-3 py-2 text-zinc-300">
                              {row.referralAction ? (
                                <>
                                  Sent
                                  <div className="text-xs text-zinc-500">{actionTimeLabel(row.referralAction)}</div>
                                </>
                              ) : (
                                <span className="text-zinc-500">Not referred yet</span>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              {row.referralPending && <span className="text-amber-300">Pending sergeant review</span>}
                              {row.referralApproved && <span className="text-emerald-300">Approved</span>}
                              {row.referralRejected && <span className="text-rose-300">Rejected</span>}
                              {!row.referralAction && <span className="text-zinc-500">-</span>}
                              {row.sergeantDecisionAction?.payload?.note && (
                                <div className="mt-1 text-xs text-zinc-500">{row.sergeantDecisionAction.payload.note}</div>
                              )}
                            </td>
                            <td className="px-3 py-2">{row.detectiveScore.score ?? "-"}</td>
                            <td className="px-3 py-2">{row.sergeantScore.score ?? "-"}</td>
                          </tr>
                        ))}
                      {!loadingDetails && !suspectRows.length && (
                        <tr>
                          <td className="px-3 py-5 text-zinc-400" colSpan={5}>No suspects found for this case.</td>
                        </tr>
                      )}
                      {loadingDetails && (
                        <tr>
                          <td className="px-3 py-5 text-zinc-400" colSpan={5}>Loading case data...</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {sergeantView && (
            <>
              <div className="card p-4">
                <p className="mb-3 font-semibold">Detective Referrals Waiting for Sergeant Review</p>
                <p className="mb-3 text-sm text-zinc-400">
                  Review referred suspects, approve to authorize arrest/interrogation progression, or reject with feedback.
                </p>
                <div className="space-y-3">
                  {pendingReferralRows.map((row) => (
                    <div key={`referral-${row.suspect.id}`} className="rounded border border-zinc-700 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium text-paper">
                          Suspect #{row.suspect.id} - {row.suspect.name}
                        </p>
                        <p className="text-xs text-zinc-500">
                          Referred: {actionTimeLabel(row.referralAction)}
                        </p>
                      </div>
                      <p className="mt-2 text-sm text-zinc-300">
                        Referral Note: {String(row.referralAction?.payload?.note || "").trim() || "-"}
                      </p>
                      <textarea
                        className="input mt-3 min-h-20"
                        placeholder="Sergeant response / instruction"
                        value={referralNotesBySuspect[row.suspect.id] || ""}
                        onChange={(event) =>
                          setReferralNotesBySuspect((prev) => ({ ...prev, [row.suspect.id]: event.target.value }))
                        }
                      />
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          className="btn-primary"
                          onClick={() => submitSergeantReferralDecision(row, "APPROVED")}
                          disabled={busyKey === `sergeant-referral-${row.suspect.id}`}
                        >
                          {busyKey === `sergeant-referral-${row.suspect.id}` ? "Saving..." : "Approve Referral"}
                        </button>
                        <button
                          className="btn-secondary"
                          onClick={() => submitSergeantReferralDecision(row, "REJECTED")}
                          disabled={busyKey === `sergeant-referral-${row.suspect.id}`}
                        >
                          {busyKey === `sergeant-referral-${row.suspect.id}` ? "Saving..." : "Reject / Return"}
                        </button>
                      </div>
                    </div>
                  ))}
                  {!loadingDetails && !pendingReferralRows.length && (
                    <p className="text-sm text-zinc-500">No pending detective referrals for the selected case.</p>
                  )}
                </div>
              </div>

              <div className="card p-4">
                <p className="mb-3 font-semibold">Sergeant Interrogation Score</p>
                <p className="mb-3 text-sm text-zinc-400">
                  Sergeant submits an independent 1-10 suspicion score after referral approval.
                </p>
                <div className="grid gap-3 md:grid-cols-3">
                  <select
                    className="input"
                    value={sergeantScoreDraft.suspectId}
                    onChange={(event) =>
                      setSergeantScoreDraft((prev) => ({ ...prev, suspectId: event.target.value }))
                    }
                    disabled={!sergeantScoringCandidates.length || loadingDetails}
                  >
                    {!sergeantScoringCandidates.length && <option value="">No approved suspects</option>}
                    {sergeantScoringCandidates.map((row) => (
                      <option key={row.suspect.id} value={row.suspect.id}>
                        #{row.suspect.id} - {row.suspect.name}
                      </option>
                    ))}
                  </select>
                  <input
                    className="input"
                    type="number"
                    min={1}
                    max={10}
                    value={sergeantScoreDraft.score}
                    onChange={(event) =>
                      setSergeantScoreDraft((prev) => ({ ...prev, score: event.target.value }))
                    }
                  />
                  <button className="btn-primary" onClick={submitSergeantScore} disabled={busyKey === "sergeant-score" || loadingDetails}>
                    {busyKey === "sergeant-score" ? "Submitting..." : "Submit Sergeant Score"}
                  </button>
                </div>
                <textarea
                  className="input mt-3 min-h-20"
                  placeholder="Sergeant interrogation note (optional)"
                  value={sergeantScoreDraft.note}
                  onChange={(event) =>
                    setSergeantScoreDraft((prev) => ({ ...prev, note: event.target.value }))
                  }
                />
              </div>
            </>
          )}

          {captainView && (
            <div className="card p-4">
              <p className="mb-3 font-semibold">Captain Verdict Queue (Selected Case)</p>
              <p className="mb-3 text-sm text-zinc-400">
                Captain reviews detective + sergeant scores and issues final operational verdict. Critical cases are forwarded to chief.
              </p>
              <div className="space-y-3">
                {captainDecisionRows.map((row) => (
                  <div key={`captain-${row.suspect.id}`} className="rounded border border-zinc-700 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">
                        Suspect #{row.suspect.id} - {row.suspect.name}
                      </p>
                      <p className="text-xs text-zinc-400">
                        Avg: <span className="text-brass">{row.averageScore ?? "-"}</span>
                      </p>
                    </div>
                    <div className="mt-2 grid gap-2 text-sm md:grid-cols-3">
                      <p><span className="text-zinc-400">Detective:</span> {row.detectiveScore.score ?? "-"}</p>
                      <p><span className="text-zinc-400">Sergeant:</span> {row.sergeantScore.score ?? "-"}</p>
                      <p><span className="text-zinc-400">Critical:</span> {isCriticalCase(selectedCase) ? "Yes" : "No"}</p>
                    </div>

                    <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
                      <select
                        className="input"
                        value={captainVerdictBySuspect[row.suspect.id] || "ARREST_WARRANT"}
                        onChange={(event) =>
                          setCaptainVerdictBySuspect((prev) => ({ ...prev, [row.suspect.id]: event.target.value }))
                        }
                      >
                        <option value="ARREST_WARRANT">ARREST_WARRANT</option>
                        <option value="DISMISS">DISMISS</option>
                      </select>
                      <input
                        className="input"
                        placeholder="Captain note / rationale (optional)"
                        value={captainNotesBySuspect[row.suspect.id] || ""}
                        onChange={(event) =>
                          setCaptainNotesBySuspect((prev) => ({ ...prev, [row.suspect.id]: event.target.value }))
                        }
                      />
                    </div>
                    <button
                      className="btn-primary mt-3"
                      onClick={() => submitCaptainVerdict(row)}
                      disabled={busyKey === `captain-verdict-${row.suspect.id}`}
                    >
                      {busyKey === `captain-verdict-${row.suspect.id}` ? "Submitting..." : "Submit Captain Verdict"}
                    </button>
                  </div>
                ))}
                {!loadingDetails && !captainDecisionRows.length && (
                  <p className="text-sm text-zinc-500">
                    No suspect is currently waiting for captain decision in the selected case.
                  </p>
                )}
              </div>
            </div>
          )}

          {chiefView && (
            <div className="card p-4">
              <p className="mb-3 font-semibold">Critical Captain Verdict Review (Selected Case)</p>
              <p className="mb-3 text-sm text-zinc-400">
                Police chief reviews captain verdicts only for critical cases before case can move to trial.
              </p>
              <div className="space-y-3">
                {chiefDecisionRows.map((row) => (
                  <div key={`chief-${row.suspect.id}`} className="rounded border border-zinc-700 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">
                        Suspect #{row.suspect.id} - {row.suspect.name}
                      </p>
                      <p className="text-xs text-zinc-400">
                        Captain verdict: {readableVerdict(row.captainVerdictAction?.payload?.verdict)}
                      </p>
                    </div>
                    <div className="mt-2 grid gap-2 text-sm md:grid-cols-3">
                      <p><span className="text-zinc-400">Detective:</span> {row.detectiveScore.score ?? "-"}</p>
                      <p><span className="text-zinc-400">Sergeant:</span> {row.sergeantScore.score ?? "-"}</p>
                      <p><span className="text-zinc-400">Average:</span> {row.averageScore ?? "-"}</p>
                    </div>
                    <p className="mt-2 text-sm text-zinc-300">
                      <span className="text-zinc-400">Captain note:</span>{" "}
                      {String(row.captainVerdictAction?.payload?.note || "").trim() || "-"}
                    </p>
                    <textarea
                      className="input mt-3 min-h-20"
                      placeholder="Chief review note (required)"
                      value={chiefNotesBySuspect[row.suspect.id] || ""}
                      onChange={(event) =>
                        setChiefNotesBySuspect((prev) => ({ ...prev, [row.suspect.id]: event.target.value }))
                      }
                    />
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        className="btn-primary"
                        onClick={() => submitChiefDecision(row, "APPROVED")}
                        disabled={busyKey === `chief-review-${row.suspect.id}`}
                      >
                        {busyKey === `chief-review-${row.suspect.id}` ? "Saving..." : "Approve Captain Verdict"}
                      </button>
                      <button
                        className="btn-secondary"
                        onClick={() => submitChiefDecision(row, "REJECTED")}
                        disabled={busyKey === `chief-review-${row.suspect.id}`}
                      >
                        {busyKey === `chief-review-${row.suspect.id}` ? "Saving..." : "Reject / Return To Investigation"}
                      </button>
                    </div>
                  </div>
                ))}
                {!loadingDetails && !chiefDecisionRows.length && (
                  <p className="text-sm text-zinc-500">
                    No captain verdict is currently waiting for chief approval in this critical case.
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="card p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-semibold">Selected Case Workflow Audit (Interrogation Chain)</p>
              <p className="text-xs text-zinc-500">{loadingDetails ? "Updating..." : `${visibleLogs.length} item(s)`}</p>
            </div>
            <div className="space-y-2">
              {visibleLogs.map((item) => (
                <div key={item.id} className="rounded border border-zinc-800 p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-paper">{item.action_type}</p>
                    <p className="text-xs text-zinc-500">{actionTimeLabel(item)}</p>
                  </div>
                  <pre className="mt-2 overflow-auto rounded bg-zinc-950 p-2 text-xs">
                    {JSON.stringify(item.payload || {}, null, 2)}
                  </pre>
                </div>
              ))}
              {!loadingDetails && !visibleLogs.length && (
                <p className="text-sm text-zinc-500">No interrogation-chain actions recorded for this case yet.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
