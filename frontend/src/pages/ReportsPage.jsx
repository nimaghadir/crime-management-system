import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { formatUiApiError } from "../lib/uiApiError";
import { Skeleton, SkeletonLines } from "../components/Skeleton";
import {
  isCaptainRole,
  isChiefRole,
  isJudgeRole,
  isReportReviewerRole,
  isSystemAdminRole,
} from "../lib/roleRouting";

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function formatDate(value) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

function userLabel(userMap, userId, fallbackRole = "") {
  const id = Number(userId);
  if (!id) return "-";
  const user = userMap.get(id);
  if (user?.username && user?.role_name) return `${user.username} (${user.role_name})`;
  if (user?.username) return user.username;
  if (fallbackRole) return `User #${id} (${fallbackRole})`;
  return `User #${id}`;
}

function evidenceTypeLabel(type) {
  const normalized = normalizeText(type);
  if (normalized === "testimony") return "Witness / Local Statement";
  if (normalized === "bio_medical") return "Biological / Medical";
  if (normalized === "vehicle") return "Vehicle";
  if (normalized === "identity") return "Identification Document";
  if (normalized === "other") return "Other";
  return type || "-";
}

function isCriticalCaseForJudge(caseData) {
  if (!caseData) return false;
  const levelNum = Number(caseData?.level);
  if (levelNum === 4) return true;
  return normalizeText(caseData?.crime_level) === "critical";
}

function normalizeSuspectArrestStatus(item) {
  return normalizeText(item?.arrest_status || item?.status);
}

function buildJudgeVerdictGate(caseData, suspects = [], latestVerdict = null) {
  if (normalizeText(caseData?.status) === "closed") {
    return {
      ready: false,
      reason: "This case is already closed. Judge verdict can only be registered once.",
      blockers: [],
    };
  }

  if (latestVerdict) {
    return {
      ready: false,
      reason: "A final judge verdict is already recorded for this case. Verdict registration is a one-time action.",
      blockers: [],
    };
  }

  const rows = Array.isArray(suspects) ? suspects : [];
  const statuses = rows.map((item) => ({
    id: item?.id,
    name: item?.name || `Suspect #${item?.id}`,
    status: normalizeSuspectArrestStatus(item),
  }));

  if (!statuses.length) {
    return {
      ready: false,
      reason: "No suspect has been added to this case yet.",
      blockers: [],
    };
  }

  const blockingStatuses = new Set([
    "awaiting_sergeant",
    "warrant_issued",
    "arrested",
    "awaiting_captain",
    "awaiting_chief",
  ]);
  const blockers = statuses.filter((row) => blockingStatuses.has(row.status));

  if (blockers.length) {
    const hasChiefBlock = blockers.some((row) => row.status === "awaiting_chief");
    return {
      ready: false,
      reason: hasChiefBlock && isCriticalCaseForJudge(caseData)
        ? "Critical-case police workflow is not finished yet. Police Chief approval is still required before judge verdict."
        : "Police workflow is not finished yet. Judge verdict is the final stage after arrest/interrogation/command approvals.",
      blockers,
    };
  }

  const trialReady = statuses.some((row) => row.status === "on_trial");
  if (!trialReady) {
    return {
      ready: false,
      reason: "This case has not reached the trial stage yet (no suspect is ON_TRIAL).",
      blockers: [],
    };
  }

  return {
    ready: true,
    reason: "",
    blockers: [],
  };
}

function caseVisibleToJudge(caseItem, judgeId) {
  return Number(caseItem?.judge_id) > 0 && Number(caseItem?.judge_id) === Number(judgeId);
}

function caseVisibleToCaptain(caseItem, captainId) {
  return Number(caseItem?.captain_id) > 0 && Number(caseItem?.captain_id) === Number(captainId);
}

function caseVisibleToChief(caseItem, chiefId) {
  return Number(caseItem?.chief_id) > 0 && Number(caseItem?.chief_id) === Number(chiefId);
}

function findLatestJudgeVerdict(logs = []) {
  const candidates = (Array.isArray(logs) ? logs : []).filter((item) =>
    normalizeText(item?.action_type).includes("judge_final_verdict") ||
    normalizeText(item?.action_type).includes("judge_verdict"),
  );
  if (!candidates.length) return null;
  return [...candidates].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0];
}

function readableVerdict(value) {
  const normalized = normalizeText(value);
  if (normalized === "arrest_warrant") return "Arrest Warrant";
  if (normalized === "dismiss") return "Dismiss / Continue Investigation";
  return String(value || "-").replaceAll("_", " ");
}

function reportLogToneClasses(tone) {
  switch (tone) {
    case "emerald":
      return "border-emerald-700/50 bg-emerald-950/20";
    case "rose":
      return "border-rose-700/50 bg-rose-950/20";
    case "amber":
      return "border-amber-700/50 bg-amber-950/20";
    case "sky":
      return "border-sky-700/50 bg-sky-950/20";
    case "violet":
      return "border-violet-700/50 bg-violet-950/20";
    case "brass":
      return "border-brass/40 bg-brass/5";
    default:
      return "border-zinc-800 bg-zinc-950/30";
  }
}

function summarizeReportLogAction(item, suspectNameById = new Map()) {
  const actionType = normalizeText(item?.action_type);
  const payload = item?.payload && typeof item.payload === "object" ? item.payload : {};
  const suspectId = Number(payload?.suspect_id) || null;
  const suspectName = suspectId ? suspectNameById.get(suspectId) || `Suspect #${suspectId}` : "";
  const actorRole = String(payload?.by_role || "").trim();
  const actorUserId = Number(payload?.by_user_id) || null;
  const actorLabel = actorRole || (actorUserId ? `User #${actorUserId}` : "System");

  if (actionType === "suspect_referred_to_sergeant") {
    return {
      title: `${suspectName || "Suspect"} referred to sergeant`,
      tone: "amber",
      lines: [`Actor: ${actorLabel}`, `Referral note: ${String(payload?.note || "").trim() || "-"}`],
    };
  }
  if (actionType === "sergeant_referral_decision") {
    const approved = normalizeText(payload?.decision) === "approved";
    return {
      title: `${suspectName || "Suspect"} referral ${approved ? "approved" : "rejected"} by sergeant`,
      tone: approved ? "emerald" : "rose",
      lines: [`Decision: ${String(payload?.decision || "-")}`, `Note: ${String(payload?.note || "").trim() || "-"}`],
    };
  }
  if (actionType === "suspect_marked_arrested") {
    return {
      title: `${suspectName || "Suspect"} marked as arrested`,
      tone: "emerald",
      lines: [`Actor: ${actorLabel}`, "Interrogation scoring unlocked."],
    };
  }
  if (actionType === "detective_interrogation_score" || actionType === "sergeant_interrogation_score") {
    const roleLabel = actionType.startsWith("detective") ? "Detective" : "Sergeant";
    return {
      title: `${roleLabel} score submitted for ${suspectName || "suspect"}`,
      tone: actionType.startsWith("detective") ? "sky" : "violet",
      lines: [`Score: ${payload?.score ?? "-"}`, `Note: ${String(payload?.note || "").trim() || "-"}`],
    };
  }
  if (actionType === "captain_suspect_verdict" || actionType === "captain_verdict_mock") {
    return {
      title: `Captain verdict for ${suspectName || "suspect"}`,
      tone: "brass",
      lines: [
        `Verdict: ${readableVerdict(payload?.verdict)}`,
        `Avg score: ${payload?.average_score ?? "-"}`,
        `Note: ${String(payload?.note || "").trim() || "-"}`,
      ],
    };
  }
  if (actionType === "chief_captain_verdict_review") {
    const approved = normalizeText(payload?.decision) === "approved";
    return {
      title: `Chief review for ${suspectName || "suspect"}`,
      tone: approved ? "emerald" : "rose",
      lines: [`Decision: ${String(payload?.decision || "-")}`, `Note: ${String(payload?.note || "").trim() || "-"}`],
    };
  }
  if (actionType === "judge_final_verdict" || actionType === "judge_verdict") {
    return {
      title: "Final court verdict registered",
      tone: "emerald",
      lines: [
        `Verdict: ${String(payload?.verdict || "-").toUpperCase()}`,
        `Punishment: ${String(payload?.punishment_title || "").trim() || "-"}`,
        `Judge: ${String(payload?.judge_username || "").trim() || actorLabel || "-"}`,
      ],
    };
  }

  return {
    title: String(item?.action_type || "Action").replaceAll("_", " "),
    tone: "zinc",
    lines: actorLabel && actorLabel !== "System" ? [`Actor: ${actorLabel}`] : [],
  };
}

function collectInvolvedMembers(caseData, userMap) {
  const rows = [];
  const add = (roleLabelText, userId, fallbackRole) => {
    const id = Number(userId);
    if (!id) return;
    rows.push({
      role_label: roleLabelText,
      user_id: id,
      display: userLabel(userMap, id, fallbackRole),
    });
  };

  add("Case Creator", caseData?.created_by, caseData?.created_by_role);
  add("Cadet / Intern", caseData?.intern_id, "Cadet");
  add("Police Officer", caseData?.officer_id, "Police Officer");
  add("Sergeant / Supervisor", caseData?.supervisor_id ?? caseData?.sergeant_id, "Sergeant");
  add("Captain", caseData?.captain_id, "Captain");
  add("Police Chief", caseData?.chief_id, "Police Chief");
  add("Detective", caseData?.detective_id ?? caseData?.assigned_to, "Detective");
  add("Judge", caseData?.judge_id, "Judge");

  const dedup = new Set();
  return rows.filter((item) => {
    const key = `${item.role_label}:${item.user_id}`;
    if (dedup.has(key)) return false;
    dedup.add(key);
    return true;
  });
}

export function ReportsPage() {
  const { token, user, roleName } = useAuth();
  const judgeView = isJudgeRole(roleName);
  const reportReviewerView = isReportReviewerRole(roleName);

  const [params, setParams] = useSearchParams();
  const [cases, setCases] = useState([]);
  const [selectedCaseId, setSelectedCaseId] = useState(params.get("caseId") || "");
  const [report, setReport] = useState(null);
  const [loadingCases, setLoadingCases] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [verdict, setVerdict] = useState("GUILTY");
  const [punishmentTitle, setPunishmentTitle] = useState("");
  const [punishmentDescription, setPunishmentDescription] = useState("");
  const [savingVerdict, setSavingVerdict] = useState(false);
  const [closingWithExistingVerdict, setClosingWithExistingVerdict] = useState(false);

  const userMap = useMemo(() => {
    const map = new Map();
    (report?.users || []).forEach((item) => {
      if (Number(item?.id) > 0) {
        map.set(Number(item.id), item);
      }
    });
    return map;
  }, [report?.users]);

  const visibleCases = useMemo(() => {
    if (!reportReviewerView) return [];
    const source = Array.isArray(cases) ? cases : [];
    if (judgeView) {
      return source.filter((item) => caseVisibleToJudge(item, user?.id));
    }
    if (isCaptainRole(roleName)) {
      return source.filter((item) => caseVisibleToCaptain(item, user?.id));
    }
    if (isChiefRole(roleName)) {
      return source.filter((item) => caseVisibleToChief(item, user?.id));
    }
    return [];
  }, [cases, judgeView, reportReviewerView, roleName, user?.id]);

  const latestVerdict = useMemo(() => findLatestJudgeVerdict(report?.logs || []), [report?.logs]);
  const suspectNameById = useMemo(
    () =>
      new Map(
        (report?.suspects || []).map((row) => [Number(row?.id), String(row?.name || row?.suspect_name || `Suspect #${row?.id}`)]),
      ),
    [report?.suspects],
  );
  const sortedLogs = useMemo(
    () =>
      [...(Array.isArray(report?.logs) ? report.logs : [])].sort((a, b) =>
        String(b?.created_at || "").localeCompare(String(a?.created_at || "")),
      ),
    [report?.logs],
  );
  const judgeVerdictGate = useMemo(
    () => buildJudgeVerdictGate(report?.caseData || null, report?.suspects || [], latestVerdict),
    [report?.caseData, report?.suspects, latestVerdict],
  );

  async function loadCases() {
    if (!reportReviewerView) return;
    setLoadingCases(true);
    setError("");
    try {
      const data = await api.listCases(token);
      const ordered = [...(Array.isArray(data) ? data : [])].sort((a, b) =>
        String(b.updated_at || "").localeCompare(String(a.updated_at || "")),
      );
      setCases(ordered);
    } catch (err) {
      setError(formatUiApiError(err, "Failed to load case list."));
      setCases([]);
    } finally {
      setLoadingCases(false);
    }
  }

  async function loadReport(targetCaseId) {
    if (!targetCaseId) return;
    setLoadingReport(true);
    setError("");
    setMessage("");

    try {
      const caseId = Number(targetCaseId);
      const [caseResult, evidenceResult, suspectResult, logResult] = await Promise.allSettled([
        api.getCase(token, caseId),
        api.listEvidence(token, caseId),
        api.listSuspects(token, caseId),
        api.listInvestigationActions(token, caseId),
      ]);

      if (caseResult.status !== "fulfilled") {
        throw caseResult.reason;
      }

      const evidence = evidenceResult.status === "fulfilled" ? evidenceResult.value : [];
      const suspects = suspectResult.status === "fulfilled" ? suspectResult.value : [];
      const logs = logResult.status === "fulfilled" ? logResult.value : [];

      let users = [];
      if (isSystemAdminRole(roleName)) {
        try {
          users = await api.listUsers(token);
        } catch {
          users = [];
        }
      }

      setReport({
        caseData: caseResult.value,
        evidence: Array.isArray(evidence) ? evidence : [],
        suspects: Array.isArray(suspects) ? suspects : [],
        logs: Array.isArray(logs) ? logs : [],
        users: Array.isArray(users) ? users : [],
      });
      setParams({ caseId: String(caseId) });

      const softErrors = [evidenceResult, suspectResult, logResult]
        .filter((result) => result.status === "rejected")
        .map((result) => formatUiApiError(result.reason, "Some report sections could not be loaded."))
        .filter(Boolean);
      if (softErrors.length) {
        setError(softErrors[0]);
      }
    } catch (err) {
      setError(formatUiApiError(err, "Failed to load report data."));
      setReport(null);
    } finally {
      setLoadingReport(false);
    }
  }

  useEffect(() => {
    loadCases();
  }, [token, roleName]);

  useEffect(() => {
    if (!reportReviewerView || loadingCases) return;

    const queryCaseId = Number(params.get("caseId"));
    const hasQuery = queryCaseId > 0;
    const allowedSet = new Set(visibleCases.map((item) => Number(item.id)));

    if (hasQuery && allowedSet.has(queryCaseId)) {
      setSelectedCaseId(String(queryCaseId));
      return;
    }

    if (visibleCases.length) {
      setSelectedCaseId(String(visibleCases[0].id));
      return;
    }

    setSelectedCaseId("");
    setReport(null);
  }, [visibleCases, params, reportReviewerView, loadingCases]);

  useEffect(() => {
    if (!selectedCaseId || !reportReviewerView) return;
    loadReport(selectedCaseId);
  }, [selectedCaseId, reportReviewerView, roleName]);

  async function submitJudgeVerdict() {
    if (!judgeView) return;
    if (!report?.caseData?.id) return;
    if (latestVerdict || normalizeText(report?.caseData?.status) === "closed") {
      setError("A final verdict is already recorded for this case. Judge verdict can only be submitted once.");
      return;
    }
    if (!judgeVerdictGate.ready) {
      setError(judgeVerdictGate.reason || "Judge verdict is not available yet. Police workflow is still in progress.");
      return;
    }
    if (!punishmentTitle.trim() || !punishmentDescription.trim()) {
      setError("Punishment title and description are required.");
      return;
    }

    setSavingVerdict(true);
    setError("");
    setMessage("");
    try {
      const closedCase = await api.updateCasePartial(token, Number(report.caseData.id), { status: "closed" });
      if (normalizeText(closedCase?.status) !== "closed") {
        throw new Error("Case status was not updated to CLOSED by the backend.");
      }
      await api.createInvestigationAction(token, {
        case: Number(report.caseData.id),
        action_type: "judge_final_verdict",
        payload: {
          verdict,
          punishment_title: punishmentTitle.trim(),
          punishment_description: punishmentDescription.trim(),
          judge_id: Number(user?.id) || null,
          judge_username: String(user?.username || ""),
        },
      });

      setMessage("Final court verdict recorded successfully. Case closed.");
      await loadReport(report.caseData.id);
    } catch (err) {
      setError(formatUiApiError(err, "Failed to record judge verdict."));
    } finally {
      setSavingVerdict(false);
    }
  }

  function printSummary() {
    window.print();
  }

  if (!reportReviewerView) {
    return (
      <section>
        <h1 className="font-display text-3xl uppercase text-brass">General Case Report</h1>
        <p className="mt-2 text-zinc-400">
          This page is available only for Judge, Captain, and Police Chief roles, and only for cases assigned to them.
        </p>
      </section>
    );
  }

  const caseData = report?.caseData || null;
  const involvedMembers = caseData ? collectInvolvedMembers(caseData, userMap) : [];
  const complainantIds = Array.isArray(caseData?.complainant_ids) ? caseData.complainant_ids : [];
  const canCloseWithExistingVerdict =
    judgeView &&
    Boolean(latestVerdict) &&
    normalizeText(caseData?.status) !== "closed" &&
    Boolean(caseData?.id);

  async function closeCaseUsingExistingVerdict() {
    if (!canCloseWithExistingVerdict) return;
    setClosingWithExistingVerdict(true);
    setError("");
    setMessage("");
    try {
      const closedCase = await api.updateCasePartial(token, Number(caseData.id), { status: "closed" });
      if (normalizeText(closedCase?.status) !== "closed") {
        throw new Error("Case status was not updated to CLOSED by the backend.");
      }
      setMessage("Existing final verdict was kept. Case status was updated to CLOSED.");
      await loadReport(caseData.id);
    } catch (err) {
      setError(formatUiApiError(err, "Failed to close case using existing final verdict."));
    } finally {
      setClosingWithExistingVerdict(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl uppercase text-brass">General Case Report</h1>
          <p className="mt-1 text-zinc-400">
            Full case record for judicial and command review.
          </p>
        </div>
        <button className="btn-secondary" onClick={printSummary} disabled={!report}>
          Print / Export PDF
        </button>
      </div>

      {error && <p className="text-danger">{error}</p>}
      {message && <p className="text-emerald-400">{message}</p>}

      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="card p-3">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-semibold">Available Cases</p>
            <button className="btn-secondary" onClick={loadCases} disabled={loadingCases}>
              {loadingCases ? "..." : "Refresh"}
            </button>
          </div>

          <div className="max-h-[70vh] space-y-2 overflow-y-auto pr-1">
            {loadingCases &&
              Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={`report-case-skeleton-${index}`}
                  className="w-full rounded border border-zinc-700 px-3 py-2"
                >
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="mt-2 h-3 w-5/6" />
                </div>
              ))}
            {!loadingCases &&
              visibleCases.map((item) => (
                <button
                  key={item.id}
                  className={`w-full rounded border px-3 py-2 text-left text-sm ${
                    String(selectedCaseId) === String(item.id)
                      ? "border-brass bg-brass/10"
                      : "border-zinc-700 hover:border-zinc-500"
                  }`}
                  onClick={() => setSelectedCaseId(String(item.id))}
                >
                  <p className="font-medium text-brass">#{item.id} - {item.title}</p>
                  <p className="mt-1 text-xs text-zinc-400">
                    Status: {item.status} | Updated: {formatDate(item.updated_at)}
                  </p>
                </button>
              ))}

            {!loadingCases && !visibleCases.length && (
              <p className="text-sm text-zinc-500">
                {judgeView ? "No case is assigned to you as judge." : "No case found."}
              </p>
            )}
          </div>
        </aside>

        <article className="card p-4">
          {!report && !loadingReport && (
            <p className="text-zinc-500">Select a case to view full report details.</p>
          )}

          {loadingReport && (
            <div className="space-y-4" aria-hidden="true">
              <div className="rounded border border-zinc-700 bg-zinc-900/40 p-3">
                <Skeleton className="h-8 w-72" />
                <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <SkeletonLines className="mt-3" widths={["w-full", "w-11/12"]} />
              </div>
              <div className="rounded border border-zinc-700 p-3">
                <Skeleton className="mb-3 h-4 w-40" />
                <SkeletonLines widths={["w-1/2", "w-2/3", "w-7/12"]} />
              </div>
              <div className="rounded border border-zinc-700 p-3">
                <Skeleton className="mb-3 h-4 w-56" />
                <SkeletonLines widths={["w-3/4", "w-4/5", "w-2/3"]} />
              </div>
              <div className="rounded border border-zinc-700 p-3">
                <Skeleton className="mb-3 h-4 w-36" />
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={`report-row-skeleton-${index}`} className="h-10 w-full" />
                  ))}
                </div>
              </div>
            </div>
          )}

          {report && caseData && (
            <div className="space-y-4">
              <header className="rounded border border-zinc-700 bg-zinc-900/40 p-3">
                <h2 className="font-display text-2xl uppercase text-brass">
                  Case #{caseData.id} - {caseData.title}
                </h2>
                <div className="mt-2 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                  <p className="text-sm"><span className="text-zinc-400">Created:</span> {formatDate(caseData.created_at)}</p>
                  <p className="text-sm"><span className="text-zinc-400">Status:</span> {caseData.status || "-"}</p>
                  <p className="text-sm"><span className="text-zinc-400">Level:</span> {caseData.level ?? "-"}</p>
                </div>
                <p className="mt-2 text-sm">
                  <span className="text-zinc-400">Description:</span> {caseData.description || "-"}
                </p>
              </header>

              <section className="rounded border border-zinc-700 p-3">
                <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-300">
                  Complainant(s)
                </p>
                {complainantIds.length ? (
                  <div className="space-y-1">
                    {complainantIds.map((id) => (
                      <p key={`complainant-${id}`} className="text-sm">
                        {userLabel(userMap, id, "Complainant")}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500">No complainant data available.</p>
                )}
              </section>

              <section className="rounded border border-zinc-700 p-3">
                <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-300">
                  Police / Court Members Involved
                </p>
                {involvedMembers.length ? (
                  <div className="space-y-1">
                    {involvedMembers.map((item) => (
                      <p key={`${item.role_label}-${item.user_id}`} className="text-sm">
                        <span className="text-zinc-400">{item.role_label}:</span> {item.display}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500">No involved members recorded.</p>
                )}
              </section>

              <section className="rounded border border-zinc-700 p-3">
                <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-300">
                  Evidence & Testimonies ({report.evidence.length})
                </p>
                <div className="space-y-2">
                  {report.evidence.map((item) => (
                    <div key={item.id} className="rounded border border-zinc-800 bg-zinc-900/40 p-2">
                      <p className="text-sm font-medium">
                        #{item.id} - {item.title || "Evidence"} ({evidenceTypeLabel(item.type)})
                      </p>
                      <p className="text-xs text-zinc-400">
                        Status: {item.status || "-"} | Registered: {formatDate(item.registered_at || item.created_at)}
                      </p>
                      <p className="mt-1 text-sm">{item.description || "-"}</p>
                    </div>
                  ))}
                  {!report.evidence.length && (
                    <p className="text-sm text-zinc-500">No evidence records.</p>
                  )}
                </div>
              </section>

              <section className="rounded border border-zinc-700 p-3">
                <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-300">
                  Suspects ({report.suspects.length})
                </p>
                <div className="space-y-2">
                  {report.suspects.map((item) => (
                    <div key={item.id} className="rounded border border-zinc-800 bg-zinc-900/40 p-2 text-sm">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-zinc-400">Status: {item.status || "-"}</p>
                      <p className="text-zinc-400">National ID: {item.national_id || "-"}</p>
                      <p className="text-zinc-400">Suspicion score: {item.score ?? "-"}</p>
                    </div>
                  ))}
                  {!report.suspects.length && (
                    <p className="text-sm text-zinc-500">No suspect recorded.</p>
                  )}
                </div>
              </section>

              <section className="rounded border border-zinc-700 p-3">
                <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-300">
                  Full Investigation Log ({report.logs.length})
                </p>
                <p className="mb-3 text-xs text-zinc-500">
                  Chronological operational timeline for referral, interrogation, command approvals, and final court verdict.
                </p>
                <div className="space-y-2">
                  {sortedLogs.map((item) => {
                    const summary = summarizeReportLogAction(item, suspectNameById);
                    return (
                      <div key={item.id} className={`rounded border p-3 text-sm ${reportLogToneClasses(summary.tone)}`}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-medium text-paper">{summary.title}</p>
                          <p className="text-xs text-zinc-500">{formatDate(item.created_at)}</p>
                        </div>
                        {!!summary.lines.length && (
                          <div className="mt-2 space-y-1 text-sm text-zinc-300">
                            {summary.lines.map((line, index) => (
                              <p key={`${item.id}-report-log-line-${index}`}>{line}</p>
                            ))}
                          </div>
                        )}
                        <details className="mt-2">
                          <summary className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-300">
                            Raw payload
                          </summary>
                          <pre className="mt-2 overflow-auto rounded bg-zinc-950 p-2 text-xs">
                            {JSON.stringify(item.payload || {}, null, 2)}
                          </pre>
                        </details>
                      </div>
                    );
                  })}
                  {!sortedLogs.length && (
                    <p className="text-sm text-zinc-500">No investigation logs available.</p>
                  )}
                </div>
              </section>

              {!!latestVerdict && (
                <section className="rounded border border-emerald-700/40 bg-emerald-950/10 p-3">
                  <p className="text-sm font-semibold uppercase tracking-wide text-emerald-300">
                    Latest Final Verdict
                  </p>
                  <p className="mt-2 text-sm">
                    <span className="text-zinc-400">Verdict:</span>{" "}
                    {String(latestVerdict.payload?.verdict || "-").toUpperCase()}
                  </p>
                  <p className="text-sm">
                    <span className="text-zinc-400">Punishment Title:</span>{" "}
                    {latestVerdict.payload?.punishment_title || "-"}
                  </p>
                  <p className="text-sm">
                    <span className="text-zinc-400">Punishment Description:</span>{" "}
                    {latestVerdict.payload?.punishment_description || "-"}
                  </p>
                  <p className="text-xs text-zinc-400 mt-1">
                    Recorded at: {formatDate(latestVerdict.created_at)}
                  </p>
                  {normalizeText(caseData?.status) === "closed" && (
                    <p className="mt-1 text-xs text-emerald-300">Case status is closed.</p>
                  )}
                  {canCloseWithExistingVerdict && (
                    <div className="mt-3 rounded border border-amber-500/30 bg-amber-950/10 p-3">
                      <p className="text-sm font-medium text-amber-300">Recovery action needed</p>
                      <p className="mt-1 text-xs text-zinc-300">
                        A final verdict is already recorded, but the case status is still open (likely from the previous bug).
                        Use the button below to close the case without creating another verdict.
                      </p>
                      <button
                        className="btn-secondary mt-3"
                        onClick={closeCaseUsingExistingVerdict}
                        disabled={closingWithExistingVerdict || savingVerdict}
                      >
                        {closingWithExistingVerdict ? "Closing Case..." : "Close Case Using Existing Verdict"}
                      </button>
                    </div>
                  )}
                </section>
              )}

              {judgeView && (
                <section className="rounded border border-brass/40 bg-zinc-900/40 p-3">
                  <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-brass">
                    Register Final Court Verdict
                  </p>
                  <p className="mb-3 text-xs text-zinc-400">
                    Judge can only register final verdict and punishment details.
                  </p>

                  {!judgeVerdictGate.ready && (
                    <div className="mb-3 rounded border border-amber-500/30 bg-amber-950/10 p-3 text-sm">
                      <p className="font-medium text-amber-300">Verdict entry is locked</p>
                      <p className="mt-1 text-zinc-300">{judgeVerdictGate.reason}</p>
                      {!!judgeVerdictGate.blockers.length && (
                        <div className="mt-2 space-y-1 text-xs text-zinc-300">
                          {judgeVerdictGate.blockers.map((item) => (
                            <p key={`judge-blocker-${item.id}`}>
                              {item.name}: <span className="text-amber-300">{item.status || "-"}</span>
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid gap-3">
                    <div>
                      <label className="mb-1 block text-sm">Verdict</label>
                      <select
                        className="input"
                        value={verdict}
                        onChange={(event) => setVerdict(event.target.value)}
                        disabled={!judgeVerdictGate.ready || savingVerdict}
                      >
                        <option value="GUILTY">GUILTY</option>
                        <option value="NOT_GUILTY">NOT_GUILTY</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm">Punishment Title</label>
                      <input
                        className="input"
                        value={punishmentTitle}
                        onChange={(event) => setPunishmentTitle(event.target.value)}
                        placeholder="e.g. Prison sentence"
                        disabled={!judgeVerdictGate.ready || savingVerdict}
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm">Punishment Description</label>
                      <textarea
                        className="input min-h-28"
                        value={punishmentDescription}
                        onChange={(event) => setPunishmentDescription(event.target.value)}
                        placeholder="Detailed legal punishment notes"
                        disabled={!judgeVerdictGate.ready || savingVerdict}
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button className="btn-primary" onClick={submitJudgeVerdict} disabled={savingVerdict || !judgeVerdictGate.ready}>
                      {savingVerdict ? "Saving..." : "Save Final Verdict"}
                    </button>
                    <Link className="btn-secondary" to="/cases">
                      Back To My Cases
                    </Link>
                  </div>
                </section>
              )}
            </div>
          )}
        </article>
      </div>
    </section>
  );
}
