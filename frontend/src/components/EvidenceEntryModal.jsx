import { useMemo, useState } from "react";
import { EVIDENCE_TYPES } from "../lib/api";

const defaultState = {
  type: EVIDENCE_TYPES.TESTIMONY,
  testimony_text: "",
  plate: "",
  serial_number: "",
  lab_result: "",
  id_name: "",
  id_num: "",
  other_json: "{}",
  attachment_url: "",
  attachment_path: "",
  mime_type: "",
  original_name: "",
};

function buildMetadata(form) {
  switch (form.type) {
    case EVIDENCE_TYPES.TESTIMONY:
      return { testimony: form.testimony_text };
    case EVIDENCE_TYPES.VEHICLE:
      return {
        plate: form.plate,
        serial_number: form.serial_number,
      };
    case EVIDENCE_TYPES.BIO_MEDICAL:
      return { lab_result: form.lab_result };
    case EVIDENCE_TYPES.IDENTITY:
      return {
        name: form.id_name,
        id_num: form.id_num,
      };
    case EVIDENCE_TYPES.OTHER:
    default:
      try {
        return JSON.parse(form.other_json || "{}");
      } catch {
        return form.other_json;
      }
  }
}

export function EvidenceEntryModal({ open, onClose, onSubmit, busy }) {
  const [form, setForm] = useState(defaultState);
  const [error, setError] = useState("");

  const metadataPreview = useMemo(() => buildMetadata(form), [form]);

  if (!open) return null;

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError("");

    if (form.type === EVIDENCE_TYPES.VEHICLE) {
      const hasPlate = Boolean(form.plate.trim());
      const hasSerial = Boolean(form.serial_number.trim());
      if (hasPlate === hasSerial) {
        setError("Vehicle evidence requires plate OR serial number.");
        return;
      }
    }

    if (form.type === EVIDENCE_TYPES.OTHER) {
      try {
        JSON.parse(form.other_json || "{}");
      } catch {
        setError("OTHER metadata must be valid JSON.");
        return;
      }
    }

    await onSubmit({
      type: form.type,
      metadata: buildMetadata(form),
      attachment: {
        file_url: form.attachment_url,
        file_path: form.attachment_path,
        mime_type: form.mime_type,
        original_name: form.original_name,
      },
    }).catch((err) => setError(err.message || "Failed to create evidence"));
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
      <form className="card max-h-[90vh] w-full max-w-2xl overflow-y-auto p-5" onSubmit={submit}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-2xl uppercase text-brass">Add Evidence</h2>
          <button className="btn-secondary" type="button" onClick={onClose}>Close</button>
        </div>

        <label className="mb-2 block text-sm">Type</label>
        <select className="input" value={form.type} onChange={(e) => setField("type", e.target.value)}>
          <option value={EVIDENCE_TYPES.TESTIMONY}>Witness/Testimony</option>
          <option value={EVIDENCE_TYPES.BIO_MEDICAL}>Bio/Medical</option>
          <option value={EVIDENCE_TYPES.VEHICLE}>Vehicle</option>
          <option value={EVIDENCE_TYPES.IDENTITY}>ID Card</option>
          <option value={EVIDENCE_TYPES.OTHER}>Other</option>
        </select>

        {form.type === EVIDENCE_TYPES.TESTIMONY && (
          <div className="mt-3">
            <label className="mb-2 block text-sm">Testimony text</label>
            <textarea className="input min-h-24" value={form.testimony_text} onChange={(e) => setField("testimony_text", e.target.value)} />
          </div>
        )}

        {form.type === EVIDENCE_TYPES.BIO_MEDICAL && (
          <div className="mt-3">
            <label className="mb-2 block text-sm">Lab result</label>
            <textarea className="input min-h-24" value={form.lab_result} onChange={(e) => setField("lab_result", e.target.value)} />
          </div>
        )}

        {form.type === EVIDENCE_TYPES.VEHICLE && (
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm">Plate</label>
              <input className="input" value={form.plate} onChange={(e) => setField("plate", e.target.value)} placeholder="Only one of plate/serial" />
            </div>
            <div>
              <label className="mb-2 block text-sm">Serial number</label>
              <input className="input" value={form.serial_number} onChange={(e) => setField("serial_number", e.target.value)} placeholder="Only one of plate/serial" />
            </div>
          </div>
        )}

        {form.type === EVIDENCE_TYPES.IDENTITY && (
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm">Name</label>
              <input className="input" value={form.id_name} onChange={(e) => setField("id_name", e.target.value)} />
            </div>
            <div>
              <label className="mb-2 block text-sm">ID Number</label>
              <input className="input" value={form.id_num} onChange={(e) => setField("id_num", e.target.value)} />
            </div>
          </div>
        )}

        {form.type === EVIDENCE_TYPES.OTHER && (
          <div className="mt-3">
            <label className="mb-2 block text-sm">Metadata JSON</label>
            <textarea className="input min-h-24 font-mono text-xs" value={form.other_json} onChange={(e) => setField("other_json", e.target.value)} />
          </div>
        )}

        <div className="mt-5 rounded border border-zinc-700 p-3">
          <p className="text-sm font-medium text-zinc-200">Attachment (optional)</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <input className="input" placeholder="File URL" value={form.attachment_url} onChange={(e) => setField("attachment_url", e.target.value)} />
            <input className="input" placeholder="File path" value={form.attachment_path} onChange={(e) => setField("attachment_path", e.target.value)} />
            <input className="input" placeholder="MIME type" value={form.mime_type} onChange={(e) => setField("mime_type", e.target.value)} />
            <input className="input" placeholder="Original name" value={form.original_name} onChange={(e) => setField("original_name", e.target.value)} />
          </div>
          <p className="mt-2 text-xs text-zinc-500">Backend requires either `file_url` or `file_path`.</p>
        </div>

        <div className="mt-5 rounded border border-zinc-700 p-3">
          <p className="mb-2 text-sm text-zinc-400">Metadata preview</p>
          <pre className="overflow-auto rounded bg-zinc-950 p-2 text-xs">{JSON.stringify(metadataPreview, null, 2)}</pre>
        </div>

        {error && <p className="mt-3 text-sm text-danger">{error}</p>}

        <div className="mt-5 flex gap-2">
          <button className="btn-primary" disabled={busy}>Create Evidence</button>
          <button className="btn-secondary" type="button" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
