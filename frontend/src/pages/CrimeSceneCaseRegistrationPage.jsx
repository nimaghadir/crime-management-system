import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { isCadetRole, isPoliceRankRole } from "../lib/roleRouting";
import { api } from "../lib/api";
import { formatUiApiError } from "../lib/uiApiError";

const STORAGE_KEY = "caseflow_scene_case_draft";

const emptyWitnessSelection = () => ({
  user_id: "",
  username: "",
  full_name: "",
  national_id: "",
  phone_number: "",
  role_name: "",
});

const initialForm = {
  title: "",
  description: "",
  level: 3,
  location: "",
  incident_datetime: "",
  witnesses: [],
};

function loadDraft() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialForm;
    const parsed = JSON.parse(raw);
    return {
      ...initialForm,
      ...parsed,
      witnesses:
        Array.isArray(parsed?.witnesses)
          ? parsed.witnesses
              .map((item) => ({
                ...emptyWitnessSelection(),
                ...item,
              }))
              .filter((item) => Number(item.user_id) > 0)
          : [],
    };
  } catch {
    return initialForm;
  }
}

function nowLocalDateTimeValue() {
  const value = new Date();
  value.setMinutes(value.getMinutes() - value.getTimezoneOffset());
  return value.toISOString().slice(0, 16);
}

export function CrimeSceneCaseRegistrationPage() {
  const { token, roleName } = useAuth();
  const policeNonCadetMode = isPoliceRankRole(roleName) && !isCadetRole(roleName);

  const [step, setStep] = useState(1);
  const [form, setForm] = useState(loadDraft);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [candidateQuery, setCandidateQuery] = useState("");
  const [witnessCandidates, setWitnessCandidates] = useState([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submitLockRef = useRef(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
  }, [form]);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function loadWitnessCandidates(query = "") {
    setLoadingCandidates(true);
    try {
      const rows = await api.listWitnessCandidates(token, { q: query });
      setWitnessCandidates(Array.isArray(rows) ? rows : []);
    } catch (err) {
      setWitnessCandidates([]);
      setError((prev) => prev || formatUiApiError(err, "Failed to load registered witness candidates."));
    } finally {
      setLoadingCandidates(false);
    }
  }

  useEffect(() => {
    if (!policeNonCadetMode) return;
    loadWitnessCandidates("");
  }, [policeNonCadetMode, token]);

  function addSelectedWitness() {
    const id = Number(selectedCandidateId);
    if (!id) return;
    const candidate = (witnessCandidates || []).find((item) => Number(item.id) === id);
    if (!candidate) return;

    setForm((prev) => {
      const existing = Array.isArray(prev.witnesses) ? prev.witnesses : [];
      if (existing.some((item) => Number(item.user_id) === id)) {
        return prev;
      }
      return {
        ...prev,
        witnesses: [
          ...existing,
          {
            user_id: id,
            username: String(candidate.username || "").trim(),
            full_name: String(candidate.full_name || "").trim(),
            national_id: String(candidate.national_id || "").trim(),
            phone_number: String(candidate.phone_number || "").trim(),
            role_name: String(candidate.role_name || "").trim(),
          },
        ],
      };
    });
    setSelectedCandidateId("");
  }

  function removeWitnessByUserId(userId) {
    setForm((prev) => ({
      ...prev,
      witnesses: (Array.isArray(prev.witnesses) ? prev.witnesses : []).filter(
        (item) => Number(item.user_id) !== Number(userId),
      ),
    }));
  }

  async function submitCrimeSceneCase() {
    if (submitting || submitLockRef.current) return;
    setError("");

    if (!String(form.title || "").trim()) {
      setError("Case title is required.");
      return;
    }
    if (!String(form.description || "").trim()) {
      setError("Description is required.");
      return;
    }
    if (!String(form.location || "").trim()) {
      setError("Crime scene location is required.");
      return;
    }
    if (!String(form.incident_datetime || "").trim()) {
      setError("Observed date/time is required.");
      return;
    }

    submitLockRef.current = true;
    setSubmitting(true);
    try {
      const payload = {
        title: String(form.title || "").trim(),
        description: String(form.description || "").trim(),
        level: Number(form.level) || 3,
        creation_method: "crime_scene",
        location: String(form.location || "").trim(),
        incident_datetime: new Date(form.incident_datetime).toISOString(),
        witnesses: (Array.isArray(form.witnesses) ? form.witnesses : [])
          .map((item) => ({ user_id: Number(item?.user_id) }))
          .filter((item) => item.user_id > 0),
      };

      const data = await api.createCase(token, payload);
      setResult(data);
      setStep(3);
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      setError(formatUiApiError(err, "Failed to register crime scene case."));
    } finally {
      setSubmitting(false);
      submitLockRef.current = false;
    }
  }

  if (!policeNonCadetMode) {
    return (
      <section>
        <h1 className="font-display text-3xl uppercase text-brass">Crime Scene Case Registration</h1>
        <p className="mt-2 text-zinc-400">Only police ranks except cadet can register crime-scene cases.</p>
      </section>
    );
  }

  return (
    <section>
      <h1 className="font-display text-3xl uppercase text-brass">Crime Scene Case Registration</h1>
      <p className="mb-6 mt-1 text-zinc-400">
        Register a case based on direct scene observation or local witness reports.
      </p>

      <div className="mb-4 flex gap-2 text-xs">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className={`rounded-full px-3 py-1 ${step === n ? "bg-brass text-ink" : "bg-zinc-800 text-zinc-400"}`}
          >
            Step {n}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="card max-w-3xl p-4">
          <label className="mb-2 block text-sm">Case title</label>
          <input
            className="input"
            value={form.title}
            onChange={(e) => updateField("title", e.target.value)}
            placeholder="Crime scene case title"
          />

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm">Crime scene location</label>
              <input
                className="input"
                value={form.location}
                onChange={(e) => updateField("location", e.target.value)}
                placeholder="Address / zone / district"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm">Observed date/time</label>
              <input
                className="input"
                type="datetime-local"
                value={form.incident_datetime}
                onChange={(e) => updateField("incident_datetime", e.target.value)}
                max={nowLocalDateTimeValue()}
              />
            </div>
          </div>

          <button className="btn-primary mt-4" onClick={() => setStep(2)} disabled={!form.title.trim()}>
            Next
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="card max-w-3xl p-4">
          <label className="mb-2 block text-sm">Description</label>
          <textarea
            className="input min-h-28"
            value={form.description}
            onChange={(e) => updateField("description", e.target.value)}
            placeholder="Describe what was observed and what witnesses reported."
          />

          <label className="mb-2 mt-4 block text-sm">Level</label>
          <select className="input" value={form.level} onChange={(e) => updateField("level", Number(e.target.value))}>
            <option value={3}>Level 3 (Normal)</option>
            <option value={2}>Level 2 (Major)</option>
            <option value={1}>Level 1 (Severe)</option>
            <option value={4}>Critical</option>
          </select>

          <div className="mt-4 rounded border border-zinc-700 p-3">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-zinc-200">Registered Witnesses (optional)</p>
                <p className="mt-1 text-xs text-zinc-500">
                  Select witness users already registered in the system. Other witnesses can join the case later.
                </p>
              </div>
            </div>

            <div className="grid gap-2 md:grid-cols-[1fr_auto]">
              <input
                className="input"
                placeholder="Search by username / name / national ID / phone"
                value={candidateQuery}
                onChange={(e) => setCandidateQuery(e.target.value)}
              />
              <button
                className="btn-secondary"
                type="button"
                onClick={() => loadWitnessCandidates(candidateQuery)}
                disabled={loadingCandidates}
              >
                {loadingCandidates ? "Searching..." : "Search"}
              </button>
            </div>

            <div className="mt-3 grid gap-2 md:grid-cols-[1fr_auto]">
              <select
                className="input"
                value={selectedCandidateId}
                onChange={(e) => setSelectedCandidateId(e.target.value)}
              >
                <option value="">Select a registered witness user...</option>
                {(witnessCandidates || []).map((candidate) => {
                  const disabled = (Array.isArray(form.witnesses) ? form.witnesses : []).some(
                    (item) => Number(item.user_id) === Number(candidate.id),
                  );
                  const labelParts = [
                    candidate.full_name || candidate.username,
                    candidate.username ? `@${candidate.username}` : "",
                    candidate.national_id ? `NID: ${candidate.national_id}` : "",
                  ].filter(Boolean);
                  return (
                    <option key={`candidate-${candidate.id}`} value={candidate.id} disabled={disabled}>
                      {labelParts.join(" • ")}{disabled ? " (Selected)" : ""}
                    </option>
                  );
                })}
              </select>
              <button className="btn-primary" type="button" onClick={addSelectedWitness} disabled={!selectedCandidateId}>
                Add Witness
              </button>
            </div>

            <div className="mt-3 space-y-2">
              {(Array.isArray(form.witnesses) ? form.witnesses : []).map((witness) => (
                <div key={`selected-witness-${witness.user_id}`} className="rounded border border-zinc-800 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-paper">
                        {witness.full_name || witness.username || `User #${witness.user_id}`}
                      </p>
                      <p className="mt-1 text-xs text-zinc-400">
                        {witness.username ? `@${witness.username}` : ""} {witness.role_name ? `• ${witness.role_name}` : ""}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        National ID: {witness.national_id || "-"} • Phone: {witness.phone_number || "-"}
                      </p>
                    </div>
                    <button
                      className="btn-secondary"
                      type="button"
                      onClick={() => removeWitnessByUserId(witness.user_id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
              {!loadingCandidates && !(Array.isArray(form.witnesses) ? form.witnesses.length : 0) && (
                <p className="text-xs text-zinc-500">
                  No witness selected. You can still register the case and witnesses can join later.
                </p>
              )}
            </div>
          </div>

          {error && <p className="mt-3 text-sm text-danger">{error}</p>}

          <div className="mt-4 flex gap-2">
            <button className="btn-secondary" onClick={() => setStep(1)}>Back</button>
            <button className="btn-primary" onClick={submitCrimeSceneCase} disabled={submitting}>
              {submitting ? "Registering..." : "Register Scene Case"}
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="card max-w-3xl p-4">
          <p className="text-emerald-400">Crime scene case registered successfully.</p>
          <p className="mt-2 text-sm text-zinc-300">Created Case ID: {result?.id}</p>
          {result?.status && (
            <p className="mt-1 text-sm text-zinc-400">Current workflow status: {result.status}</p>
          )}
          <p className="mt-1 text-sm text-zinc-400">
            Superior approval is required unless the creator is Police Chief.
          </p>
          <button
            className="btn-secondary mt-4"
            onClick={() => {
              setForm(initialForm);
              setStep(1);
              setResult(null);
              setError("");
            }}
          >
            Register another
          </button>
        </div>
      )}
    </section>
  );
}
