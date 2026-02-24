import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { isCadetRole, isPoliceRankRole } from "../lib/roleRouting";
import { api } from "../lib/api";
import { formatUiApiError } from "../lib/uiApiError";

const STORAGE_KEY = "caseflow_scene_case_draft";

const emptyWitness = () => ({
  name: "",
  national_id: "",
  phone: "",
});

const initialForm = {
  title: "",
  description: "",
  level: 3,
  location: "",
  incident_datetime: "",
  witnesses: [emptyWitness()],
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
        Array.isArray(parsed?.witnesses) && parsed.witnesses.length
          ? parsed.witnesses
          : [emptyWitness()],
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

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
  }, [form]);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setWitness(index, key, value) {
    setForm((prev) => {
      const next = [...(Array.isArray(prev.witnesses) ? prev.witnesses : [emptyWitness()])];
      next[index] = {
        ...(next[index] || emptyWitness()),
        [key]: value,
      };
      return { ...prev, witnesses: next };
    });
  }

  function addWitness() {
    setForm((prev) => ({
      ...prev,
      witnesses: [...(Array.isArray(prev.witnesses) ? prev.witnesses : []), emptyWitness()],
    }));
  }

  function removeWitness(index) {
    setForm((prev) => {
      const next = (Array.isArray(prev.witnesses) ? prev.witnesses : []).filter((_, i) => i !== index);
      return {
        ...prev,
        witnesses: next.length ? next : [emptyWitness()],
      };
    });
  }

  async function submitCrimeSceneCase() {
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

    try {
      const payload = {
        title: String(form.title || "").trim(),
        description: String(form.description || "").trim(),
        level: Number(form.level) || 3,
        creation_method: "crime_scene",
        location: String(form.location || "").trim(),
        incident_datetime: new Date(form.incident_datetime).toISOString(),
        witnesses: (Array.isArray(form.witnesses) ? form.witnesses : [])
          .map((item) => ({
            name: String(item?.name || "").trim(),
            national_id: String(item?.national_id || "").trim(),
            phone: String(item?.phone || "").trim(),
          }))
          .filter((item) => item.name || item.national_id || item.phone),
      };

      const data = await api.createCase(token, payload);
      setResult(data);
      setStep(3);
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      setError(formatUiApiError(err, "Failed to register crime scene case."));
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
              <p className="text-sm font-medium text-zinc-200">Local Witnesses (optional)</p>
              <button className="btn-secondary" type="button" onClick={addWitness}>
                Add Witness
              </button>
            </div>

            <div className="space-y-3">
              {(Array.isArray(form.witnesses) ? form.witnesses : []).map((witness, index) => (
                <div key={`witness-${index}`} className="rounded border border-zinc-800 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs text-zinc-400">Witness #{index + 1}</p>
                    <button className="btn-secondary" type="button" onClick={() => removeWitness(index)}>
                      Remove
                    </button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <input
                      className="input"
                      placeholder="Name (optional)"
                      value={witness.name || ""}
                      onChange={(e) => setWitness(index, "name", e.target.value)}
                    />
                    <input
                      className="input"
                      placeholder="National ID"
                      value={witness.national_id || ""}
                      onChange={(e) => setWitness(index, "national_id", e.target.value)}
                    />
                    <input
                      className="input"
                      placeholder="Phone number"
                      value={witness.phone || ""}
                      onChange={(e) => setWitness(index, "phone", e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-2 text-xs text-zinc-500">
              Spec: witness phone and national ID can be stored for future follow-up.
            </p>
          </div>

          {error && <p className="mt-3 text-sm text-danger">{error}</p>}

          <div className="mt-4 flex gap-2">
            <button className="btn-secondary" onClick={() => setStep(1)}>Back</button>
            <button className="btn-primary" onClick={submitCrimeSceneCase}>Register Scene Case</button>
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
