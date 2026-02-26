import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { isDetectiveRole } from "../lib/roleRouting";
import { formatUiApiError } from "../lib/uiApiError";
import { Skeleton } from "../components/Skeleton";

function isActiveCaseStatus(status) {
  const value = String(status || "").trim().toLowerCase();
  return !["resolved", "closed", "voided", "awaiting_trial"].includes(value);
}

function isLockedForSuspectFlow(status) {
  const value = String(status || "").trim().toLowerCase();
  return ["awaiting_trial", "closed"].includes(value);
}

export function SuspectReferralPage() {
  const { token, user, roleName } = useAuth();
  const detectiveView = isDetectiveRole(roleName);

  const [cases, setCases] = useState([]);
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [suspects, setSuspects] = useState([]);
  const [newSuspect, setNewSuspect] = useState({ query: "", suspect_user_id: "" });
  const [suspectCandidates, setSuspectCandidates] = useState([]);
  const [referralSuspectId, setReferralSuspectId] = useState("");
  const [referralNote, setReferralNote] = useState("");
  const [loadingCases, setLoadingCases] = useState(false);
  const [loadingSuspects, setLoadingSuspects] = useState(false);
  const [loadingSuspectCandidates, setLoadingSuspectCandidates] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const selectedCase = useMemo(
    () => cases.find((item) => Number(item.id) === Number(selectedCaseId)) || null,
    [cases, selectedCaseId],
  );
  const selectedCaseLocked = isLockedForSuspectFlow(selectedCase?.status);
  const suspectFlowLockMessage =
    "This case is in trial stage or closed. Adding new suspects or sending suspect referrals is disabled.";

  async function loadCases() {
    setLoadingCases(true);
    setError("");
    try {
      const allCases = await api.listCases(token);
      const mine = (allCases || []).filter((item) => {
        const detectiveId = Number(item?.detective_id ?? item?.assigned_to);
        return detectiveId > 0 && detectiveId === Number(user?.id) && isActiveCaseStatus(item?.status);
      });
      setCases(mine);
      if (!mine.length) {
        setSelectedCaseId("");
        return;
      }
      setSelectedCaseId((prev) => {
        if (mine.some((item) => Number(item.id) === Number(prev))) return prev;
        return String(mine[0].id);
      });
    } catch (err) {
      setError(formatUiApiError(err, "Failed to load assigned cases."));
    } finally {
      setLoadingCases(false);
    }
  }

  async function loadSuspects(caseId) {
    const targetCaseId = Number(caseId);
    if (!targetCaseId) {
      setSuspects([]);
      return;
    }

    setLoadingSuspects(true);
    setError("");
    try {
      const data = await api.listSuspects(token, targetCaseId);
      const rows = Array.isArray(data) ? data : [];
      setSuspects(rows);
      setReferralSuspectId((prev) => {
        if (rows.some((item) => Number(item.id) === Number(prev))) return prev;
        return rows.length ? String(rows[0].id) : "";
      });
    } catch (err) {
      setError(formatUiApiError(err, "Failed to load suspects for this case."));
    } finally {
      setLoadingSuspects(false);
    }
  }

  async function loadSuspectCandidates(caseId, queryText = "") {
    const targetCaseId = Number(caseId);
    if (!targetCaseId) {
      setSuspectCandidates([]);
      return;
    }

    setLoadingSuspectCandidates(true);
    setError("");
    try {
      const rows = await api.listSuspectCandidates(token, {
        caseId: targetCaseId,
        q: queryText,
      });
      setSuspectCandidates(Array.isArray(rows) ? rows : []);
      setNewSuspect((prev) => {
        const stillExists = (rows || []).some((item) => Number(item.id) === Number(prev.suspect_user_id));
        return {
          ...prev,
          suspect_user_id: stillExists ? prev.suspect_user_id : "",
        };
      });
    } catch (err) {
      setSuspectCandidates([]);
      setError(formatUiApiError(err, "Failed to load suspect candidates."));
    } finally {
      setLoadingSuspectCandidates(false);
    }
  }

  useEffect(() => {
    if (!detectiveView) return;
    loadCases();
  }, [detectiveView, token, user?.id]);

  useEffect(() => {
    if (!detectiveView) return;
    loadSuspects(selectedCaseId);
  }, [detectiveView, token, selectedCaseId]);

  useEffect(() => {
    if (!detectiveView || !selectedCaseId) {
      setSuspectCandidates([]);
      return;
    }
    const timer = setTimeout(() => {
      loadSuspectCandidates(selectedCaseId, newSuspect.query);
    }, 250);
    return () => clearTimeout(timer);
  }, [detectiveView, token, selectedCaseId, newSuspect.query]);

  async function createSuspect() {
    if (!selectedCaseId) {
      setError("Select a case first.");
      return;
    }
    if (selectedCaseLocked) {
      setError(suspectFlowLockMessage);
      return;
    }
    const suspectUserId = Number(newSuspect.suspect_user_id);
    if (!suspectUserId) {
      setError("Select a suspect user from the system list.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");
    try {
      const created = await api.createSuspect(token, {
        case: Number(selectedCaseId),
        suspect: suspectUserId,
      });
      setSuspects((prev) => [...prev, created]);
      setReferralSuspectId(String(created.id));
      setNewSuspect((prev) => ({ ...prev, suspect_user_id: "" }));
      await loadSuspectCandidates(selectedCaseId, newSuspect.query);
      setMessage(`Suspect #${created.id} linked to the case. You can now refer it to sergeant.`);
    } catch (err) {
      setError(formatUiApiError(err, "Failed to create suspect."));
    } finally {
      setSaving(false);
    }
  }

  async function referToSergeant() {
    if (!selectedCaseId || !referralSuspectId) {
      setError("Case and suspect are required.");
      return;
    }
    if (selectedCaseLocked) {
      setError(suspectFlowLockMessage);
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");
    try {
      await api.createInvestigationAction(token, {
        case: Number(selectedCaseId),
        action_type: "suspect_referred_to_sergeant",
        payload: {
          suspect_id: Number(referralSuspectId),
          note: String(referralNote || "").trim(),
          referred_by: Number(user?.id) || null,
        },
      });
      setMessage(`Suspect #${referralSuspectId} was referred to sergeant for Case #${selectedCaseId}.`);
      setReferralNote("");
    } catch (err) {
      setError(formatUiApiError(err, "Failed to submit suspect referral."));
    } finally {
      setSaving(false);
    }
  }

  if (!detectiveView) {
    return (
      <section>
        <h1 className="font-display text-3xl uppercase text-brass">Suspect Referral</h1>
        <p className="mt-2 text-zinc-400">Only detective users can manage suspect referrals.</p>
      </section>
    );
  }

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl uppercase text-brass">Suspect Referral</h1>
          <p className="mt-1 text-zinc-400">
            Add suspects from system users and formally refer them to sergeant.
          </p>
        </div>
        <Link className="btn-secondary" to="/interrogation">
          Back to Interrogation
        </Link>
      </div>

      {error && <p className="mb-4 text-danger">{error}</p>}
      {message && <p className="mb-4 text-emerald-400">{message}</p>}

      <div className="mb-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
        <select
          className="input"
          value={selectedCaseId}
          onChange={(event) => setSelectedCaseId(event.target.value)}
          disabled={loadingCases || !cases.length}
        >
          {!cases.length && <option value="">No detective-assigned active cases</option>}
          {cases.map((item) => (
            <option key={item.id} value={item.id}>
              Case #{item.id} - {item.title}
            </option>
          ))}
        </select>
        <button className="btn-secondary" onClick={loadCases} disabled={loadingCases || saving}>
          {loadingCases ? "Refreshing..." : "Refresh Cases"}
        </button>
      </div>

      {selectedCase && (
        <div className="mb-4 card p-3 text-sm text-zinc-300">
          <p>
            <span className="text-zinc-500">Selected case:</span> #{selectedCase.id} - {selectedCase.title}
          </p>
          <p>
            <span className="text-zinc-500">Status:</span> {selectedCase.status} | <span className="text-zinc-500">Level:</span> {selectedCase.level}
          </p>
          {selectedCaseLocked && (
            <p className="mt-1 text-amber-300">{suspectFlowLockMessage}</p>
          )}
          <p>
            <span className="text-zinc-500">Sergeant slot:</span>{" "}
            {selectedCase.sergeant_id ?? selectedCase.supervisor_id
              ? `User #${selectedCase.sergeant_id ?? selectedCase.supervisor_id}`
              : "Unassigned"}
          </p>
        </div>
      )}
      {!selectedCase && loadingCases && (
        <div className="mb-4 card p-3">
          <Skeleton className="h-4 w-56" />
          <Skeleton className="mt-2 h-3 w-48" />
          <Skeleton className="mt-2 h-3 w-40" />
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="card p-4">
          <p className="mb-3 font-semibold">Add Suspect From System Users</p>
          {selectedCaseLocked && (
            <p className="mb-3 text-sm text-amber-300">{suspectFlowLockMessage}</p>
          )}
          <div className="space-y-2">
            <input
              className="input"
              placeholder="Search suspect users (username / name / national ID)"
              value={newSuspect.query}
              onChange={(event) => setNewSuspect((prev) => ({ ...prev, query: event.target.value }))}
              disabled={selectedCaseLocked}
            />
            <select
              className="input"
              value={newSuspect.suspect_user_id}
              onChange={(event) => setNewSuspect((prev) => ({ ...prev, suspect_user_id: event.target.value }))}
              disabled={!selectedCaseId || loadingSuspectCandidates || selectedCaseLocked}
            >
              <option value="">
                {loadingSuspectCandidates ? "Loading suspect users..." : "Select suspect user"}
              </option>
              {suspectCandidates.map((candidate) => {
                const fullName = `${candidate?.first_name || ""} ${candidate?.last_name || ""}`.trim();
                const baseLabel = fullName || candidate?.username || `User #${candidate?.id}`;
                const usernameSuffix =
                  candidate?.username && candidate.username !== baseLabel ? ` (@${candidate.username})` : "";
                const nationalId = String(candidate?.national_id || "").trim();
                return (
                  <option key={candidate.id} value={candidate.id}>
                    {baseLabel}{usernameSuffix}{nationalId ? ` - ${nationalId}` : ""}
                  </option>
                );
              })}
            </select>
            {!loadingSuspectCandidates && selectedCaseId && !suspectCandidates.length && (
              <p className="text-xs text-zinc-500">
                No available suspect users found{newSuspect.query.trim() ? " for this search" : ""}.
              </p>
            )}
            <button
              className="btn-primary"
              onClick={createSuspect}
              disabled={saving || !selectedCaseId || !newSuspect.suspect_user_id || loadingSuspectCandidates || selectedCaseLocked}
            >
              {saving ? "Saving..." : "Add Suspect To Case"}
            </button>
          </div>
        </div>

        <div className="card p-4">
          <p className="mb-3 font-semibold">Refer Suspect to Sergeant</p>
          <div className="space-y-2">
            <select
              className="input"
              value={referralSuspectId}
              onChange={(event) => setReferralSuspectId(event.target.value)}
              disabled={loadingSuspects || !suspects.length}
            >
              {!suspects.length && <option value="">No suspects in this case</option>}
              {suspects.map((item) => (
                <option key={item.id} value={item.id}>
                  Suspect #{item.id} - {item.name}
                </option>
              ))}
            </select>
            <textarea
              className="input min-h-24"
              placeholder="Referral note for sergeant"
              value={referralNote}
              onChange={(event) => setReferralNote(event.target.value)}
              disabled={selectedCaseLocked}
            />
            <button
              className="btn-primary"
              onClick={referToSergeant}
              disabled={saving || !selectedCaseId || !referralSuspectId || selectedCaseLocked}
            >
              {saving ? "Submitting..." : "Submit Referral"}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 card p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="font-semibold">Case Suspects</p>
          <button className="btn-secondary" onClick={() => loadSuspects(selectedCaseId)} disabled={loadingSuspects || saving}>
            {loadingSuspects ? "Refreshing..." : "Refresh Suspects"}
          </button>
        </div>
        <div className="overflow-x-auto rounded border border-zinc-800">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-900/80 text-zinc-300">
              <tr>
                <th className="px-3 py-2 text-left">ID</th>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">National ID</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Score</th>
              </tr>
            </thead>
            <tbody>
              {!loadingSuspects &&
                suspects.map((item) => (
                  <tr key={item.id} className="border-t border-zinc-800">
                    <td className="px-3 py-2">{item.id}</td>
                    <td className="px-3 py-2">{item.name || "-"}</td>
                    <td className="px-3 py-2">{item.national_id || "-"}</td>
                    <td className="px-3 py-2">{item.status || "-"}</td>
                    <td className="px-3 py-2">{item.score ?? "-"}</td>
                  </tr>
                ))}
              {!loadingSuspects && !suspects.length && (
                <tr>
                  <td className="px-3 py-5 text-zinc-400" colSpan={5}>
                    No suspects found for this case.
                  </td>
                </tr>
              )}
              {loadingSuspects && (
                Array.from({ length: 4 }).map((_, index) => (
                  <tr key={`suspect-row-skeleton-${index}`} className="border-t border-zinc-800">
                    <td className="px-3 py-3"><Skeleton className="h-4 w-8" /></td>
                    <td className="px-3 py-3"><Skeleton className="h-4 w-28" /></td>
                    <td className="px-3 py-3"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-3 py-3"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-3 py-3"><Skeleton className="h-4 w-10" /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
