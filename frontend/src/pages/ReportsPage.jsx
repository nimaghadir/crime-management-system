import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { formatUiApiError } from "../lib/uiApiError";
import {
  isCaptainRole,
  isChiefRole,
  isJudgeRole,
  isReportReviewerRole,
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

function caseVisibleToJudge(caseItem, judgeId) {
  return Number(caseItem?.judge_id) > 0 && Number(caseItem?.judge_id) === Number(judgeId);
}

function roleCanOpenAllReports(roleName) {
  return isCaptainRole(roleName) || isChiefRole(roleName);
}

function findLatestJudgeVerdict(logs = []) {
  const candidates = (Array.isArray(logs) ? logs : []).filter((item) =>
    normalizeText(item?.action_type).includes("judge_final_verdict") ||
    normalizeText(item?.action_type).includes("judge_verdict"),
  );
  if (!candidates.length) return null;
  return [...candidates].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0];
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
  add("Supervisor", caseData?.supervisor_id, "Supervisor");
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
    if (roleCanOpenAllReports(roleName)) {
      return source;
    }
    return [];
  }, [cases, judgeView, reportReviewerView, roleName, user?.id]);

  const latestVerdict = useMemo(() => findLatestJudgeVerdict(report?.logs || []), [report?.logs]);

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
      const [caseData, evidence, suspects, logs] = await Promise.all([
        api.getCase(token, caseId),
        api.listEvidence(token, caseId),
        api.listSuspects(token, caseId),
        api.listInvestigationActions(token, caseId),
      ]);

      let users = [];
      try {
        users = await api.listUsers(token);
      } catch {
        users = [];
      }

      setReport({
        caseData,
        evidence: Array.isArray(evidence) ? evidence : [],
        suspects: Array.isArray(suspects) ? suspects : [],
        logs: Array.isArray(logs) ? logs : [],
        users: Array.isArray(users) ? users : [],
      });
      setParams({ caseId: String(caseId) });
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
  }, [selectedCaseId, reportReviewerView]);

  async function submitJudgeVerdict() {
    if (!judgeView) return;
    if (!report?.caseData?.id) return;
    if (!punishmentTitle.trim() || !punishmentDescription.trim()) {
      setError("Punishment title and description are required.");
      return;
    }

    setSavingVerdict(true);
    setError("");
    setMessage("");
    try {
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

      setMessage("Final court verdict recorded successfully.");
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
          This page is available only for Judge, Captain, and Police Chief roles.
        </p>
      </section>
    );
  }

  const caseData = report?.caseData || null;
  const involvedMembers = caseData ? collectInvolvedMembers(caseData, userMap) : [];
  const complainantIds = Array.isArray(caseData?.complainant_ids) ? caseData.complainant_ids : [];

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

          {loadingReport && <p className="text-zinc-400">Loading report...</p>}

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
                <div className="space-y-2">
                  {report.logs.map((item) => (
                    <div key={item.id} className="rounded border border-zinc-800 bg-zinc-900/40 p-2">
                      <p className="text-sm font-medium">{item.action_type || "-"}</p>
                      <p className="text-xs text-zinc-400">{formatDate(item.created_at)}</p>
                      <pre className="mt-1 overflow-auto rounded bg-zinc-950 p-2 text-xs">
                        {JSON.stringify(item.payload || {}, null, 2)}
                      </pre>
                    </div>
                  ))}
                  {!report.logs.length && (
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

                  <div className="grid gap-3">
                    <div>
                      <label className="mb-1 block text-sm">Verdict</label>
                      <select className="input" value={verdict} onChange={(event) => setVerdict(event.target.value)}>
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
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm">Punishment Description</label>
                      <textarea
                        className="input min-h-28"
                        value={punishmentDescription}
                        onChange={(event) => setPunishmentDescription(event.target.value)}
                        placeholder="Detailed legal punishment notes"
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button className="btn-primary" onClick={submitJudgeVerdict} disabled={savingVerdict}>
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
