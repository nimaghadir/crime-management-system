import { useMemo, useState } from "react";
import { EVIDENCE_TYPES } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { formatUiApiError } from "../lib/uiApiError";

const nowLocalIso = () => {
  const value = new Date();
  value.setMinutes(value.getMinutes() - value.getTimezoneOffset());
  return value.toISOString().slice(0, 16);
};

const makeAttachmentRow = () => ({
  file: null,
  file_url: "",
  file_path: "",
  mime_type: "",
  original_name: "",
});

const makeDetailRow = () => ({ key: "", value: "" });

const defaultState = {
  type: EVIDENCE_TYPES.TESTIMONY,
  title: "",
  description: "",
  registered_at: nowLocalIso(),

  testimony_transcript: "",

  bio_sample_type: "",
  bio_doctor_notes: "",
  bio_identity_db_notes: "",

  vehicle_model: "",
  vehicle_color: "",
  vehicle_plate: "",
  vehicle_serial_number: "",

  id_owner_full_name: "",
  id_details: [makeDetailRow()],

  other_notes: "",

  attachments: [makeAttachmentRow()],
};

function compactAttachments(rows = []) {
  return rows
    .map((item) => ({
      file: item.file || null,
      file_url: String(item.file_url || "").trim(),
      file_path: String(item.file_path || "").trim(),
      mime_type: String(item.mime_type || item.file?.type || "").trim(),
      original_name: String(item.original_name || item.file?.name || "").trim(),
    }))
    .filter((item) => item.file || item.file_url || item.file_path);
}

function detailsToObject(rows = []) {
  return rows.reduce((acc, item) => {
    const key = String(item?.key || "").trim();
    const value = String(item?.value || "").trim();
    if (!key) return acc;
    acc[key] = value;
    return acc;
  }, {});
}

function buildMetadata(form) {
  switch (form.type) {
    case EVIDENCE_TYPES.TESTIMONY:
      return {
        category: "witness_or_local_statement",
        transcript: String(form.testimony_transcript || "").trim(),
      };

    case EVIDENCE_TYPES.BIO_MEDICAL:
      return {
        category: "found_biological_or_medical",
        sample_type: String(form.bio_sample_type || "").trim(),
        doctor_notes: String(form.bio_doctor_notes || "").trim(),
        identity_db_notes: String(form.bio_identity_db_notes || "").trim(),
      };

    case EVIDENCE_TYPES.VEHICLE:
      return {
        category: "found_vehicle",
        model: String(form.vehicle_model || "").trim(),
        color: String(form.vehicle_color || "").trim(),
        plate: String(form.vehicle_plate || "").trim(),
        serial_number: String(form.vehicle_serial_number || "").trim(),
      };

    case EVIDENCE_TYPES.IDENTITY:
      return {
        category: "found_identification_document",
        owner_full_name: String(form.id_owner_full_name || "").trim(),
        details: detailsToObject(form.id_details),
      };

    case EVIDENCE_TYPES.OTHER:
    default:
      return {
        category: "found_other",
        notes: String(form.other_notes || "").trim(),
      };
  }
}

function attachmentAcceptByEvidenceType(type) {
  switch (type) {
    case EVIDENCE_TYPES.TESTIMONY:
      return "image/*,video/*,audio/*";
    case EVIDENCE_TYPES.BIO_MEDICAL:
      return "image/*";
    case EVIDENCE_TYPES.VEHICLE:
      return "image/*";
    case EVIDENCE_TYPES.IDENTITY:
      return "image/*,application/pdf";
    default:
      return "*/*";
  }
}

function attachmentRuleText(type) {
  switch (type) {
    case EVIDENCE_TYPES.TESTIMONY:
      return "Allowed attachments: image / video / audio.";
    case EVIDENCE_TYPES.BIO_MEDICAL:
      return "Allowed attachments: image only (at least one required).";
    case EVIDENCE_TYPES.VEHICLE:
      return "Allowed attachments: image (vehicle photos).";
    case EVIDENCE_TYPES.IDENTITY:
      return "Allowed attachments: image or PDF.";
    default:
      return "Allowed attachments: any file type.";
  }
}

function fileAllowedForEvidenceType(type, file) {
  if (!file) return true;
  const mime = String(file.type || "").toLowerCase();
  const name = String(file.name || "").toLowerCase();

  if (type === EVIDENCE_TYPES.TESTIMONY) {
    return mime.startsWith("image/") || mime.startsWith("video/") || mime.startsWith("audio/");
  }
  if (type === EVIDENCE_TYPES.BIO_MEDICAL || type === EVIDENCE_TYPES.VEHICLE) {
    return mime.startsWith("image/");
  }
  if (type === EVIDENCE_TYPES.IDENTITY) {
    return mime.startsWith("image/") || mime === "application/pdf" || name.endsWith(".pdf");
  }
  return true;
}

export function EvidenceEntryModal({ open, onClose, onSubmit, busy }) {
  const { user, roleName } = useAuth();
  const [form, setForm] = useState(defaultState);
  const [error, setError] = useState("");

  const metadataPreview = useMemo(() => buildMetadata(form), [form]);
  const recorderLabel = `${user?.username || "Unknown"}${roleName ? ` (${roleName})` : ""}`;
  const attachmentAccept = attachmentAcceptByEvidenceType(form.type);

  if (!open) return null;

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setAttachment(index, key, value) {
    setForm((prev) => {
      const next = [...prev.attachments];
      next[index] = {
        ...next[index],
        [key]: value,
      };
      return { ...prev, attachments: next };
    });
  }

  function setAttachmentFile(index, file) {
    setForm((prev) => {
      const next = [...prev.attachments];
      next[index] = {
        ...next[index],
        file: file || null,
        mime_type: file?.type || next[index]?.mime_type || "",
        original_name: file?.name || next[index]?.original_name || "",
      };
      return { ...prev, attachments: next };
    });
  }

  function addAttachmentRow() {
    setForm((prev) => ({ ...prev, attachments: [...prev.attachments, makeAttachmentRow()] }));
  }

  function removeAttachmentRow(index) {
    setForm((prev) => {
      const next = prev.attachments.filter((_, idx) => idx !== index);
      return {
        ...prev,
        attachments: next.length ? next : [makeAttachmentRow()],
      };
    });
  }

  function setIdDetail(index, key, value) {
    setForm((prev) => {
      const next = [...prev.id_details];
      next[index] = {
        ...next[index],
        [key]: value,
      };
      return { ...prev, id_details: next };
    });
  }

  function addIdDetailRow() {
    setForm((prev) => ({ ...prev, id_details: [...prev.id_details, makeDetailRow()] }));
  }

  function removeIdDetailRow(index) {
    setForm((prev) => {
      const next = prev.id_details.filter((_, idx) => idx !== index);
      return {
        ...prev,
        id_details: next.length ? next : [makeDetailRow()],
      };
    });
  }

  function validate() {
    const title = String(form.title || "").trim();
    const description = String(form.description || "").trim();
    const registeredAt = String(form.registered_at || "").trim();
    const attachments = compactAttachments(form.attachments);

    if (!title) {
      throw new Error("Title is required for all evidence.");
    }
    if (!description) {
      throw new Error("Description is required for all evidence.");
    }
    if (!registeredAt) {
      throw new Error("Registration date/time is required for all evidence.");
    }

    if (form.type === EVIDENCE_TYPES.TESTIMONY) {
      const transcript = String(form.testimony_transcript || "").trim();
      if (!transcript && !attachments.length) {
        throw new Error("Testimony evidence requires transcript or at least one media file.");
      }
    }

    if (form.type === EVIDENCE_TYPES.BIO_MEDICAL) {
      if (!attachments.length) {
        throw new Error("Bio/Medical evidence must include at least one image/file.");
      }
    }

    if (form.type === EVIDENCE_TYPES.VEHICLE) {
      const model = String(form.vehicle_model || "").trim();
      const color = String(form.vehicle_color || "").trim();
      const hasPlate = Boolean(String(form.vehicle_plate || "").trim());
      const hasSerial = Boolean(String(form.vehicle_serial_number || "").trim());

      if (!model || !color) {
        throw new Error("Vehicle evidence requires model and color.");
      }
      if (hasPlate === hasSerial) {
        throw new Error("Vehicle evidence requires plate OR serial number (not both).");
      }
    }

    if (form.type === EVIDENCE_TYPES.IDENTITY) {
      const owner = String(form.id_owner_full_name || "").trim();
      if (!owner) {
        throw new Error("Identification document evidence requires owner full name.");
      }
    }

    const invalidFile = attachments.find((item) => item.file && !fileAllowedForEvidenceType(form.type, item.file));
    if (invalidFile) {
      throw new Error("One or more uploaded files are not allowed for the selected evidence type.");
    }
  }

  async function submit(event) {
    event.preventDefault();
    setError("");

    try {
      validate();

      const attachments = compactAttachments(form.attachments);
      const registeredIso = new Date(form.registered_at).toISOString();

      await onSubmit({
        type: form.type,
        title: String(form.title || "").trim(),
        description: String(form.description || "").trim(),
        registered_at: registeredIso,
        submitter_name: String(user?.username || ""),
        submitter_role: String(roleName || ""),
        metadata: buildMetadata(form),
        attachments,
      });
    } catch (err) {
      setError(formatUiApiError(err, "Failed to create evidence"));
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
      <form className="card max-h-[90vh] w-full max-w-3xl overflow-y-auto p-5" onSubmit={submit}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-2xl uppercase text-brass">Register Evidence</h2>
          <button className="btn-secondary" type="button" onClick={onClose}>Close</button>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm">Evidence Type</label>
            <select className="input" value={form.type} onChange={(e) => setField("type", e.target.value)}>
              <option value={EVIDENCE_TYPES.TESTIMONY}>Witness / Local Statement</option>
              <option value={EVIDENCE_TYPES.BIO_MEDICAL}>Found: Biological / Medical</option>
              <option value={EVIDENCE_TYPES.VEHICLE}>Found: Vehicle</option>
              <option value={EVIDENCE_TYPES.IDENTITY}>Found: Identification Document</option>
              <option value={EVIDENCE_TYPES.OTHER}>Found: Other</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm">Registered At</label>
            <input
              className="input"
              type="datetime-local"
              value={form.registered_at}
              onChange={(e) => setField("registered_at", e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm">Title</label>
            <input
              className="input"
              value={form.title}
              onChange={(e) => setField("title", e.target.value)}
              placeholder="Evidence title"
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm">Description</label>
            <textarea
              className="input min-h-24"
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
              placeholder="Evidence description"
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm">Recorder</label>
            <input className="input" value={recorderLabel} readOnly />
          </div>
        </div>

        {form.type === EVIDENCE_TYPES.TESTIMONY && (
          <div className="mt-4 rounded border border-zinc-700 p-3">
            <p className="mb-2 text-sm font-medium text-zinc-200">Witness / Local Statement Details</p>
            <label className="mb-2 block text-sm">Transcript</label>
            <textarea
              className="input min-h-24"
              value={form.testimony_transcript}
              onChange={(e) => setField("testimony_transcript", e.target.value)}
              placeholder="Statement transcript"
            />
            <p className="mt-2 text-xs text-zinc-500">
              You can also attach related image/video/audio files below.
            </p>
          </div>
        )}

        {form.type === EVIDENCE_TYPES.BIO_MEDICAL && (
          <div className="mt-4 rounded border border-zinc-700 p-3">
            <p className="mb-2 text-sm font-medium text-zinc-200">Biological / Medical Details</p>
            <label className="mb-2 block text-sm">Sample Type</label>
            <input
              className="input"
              value={form.bio_sample_type}
              onChange={(e) => setField("bio_sample_type", e.target.value)}
              placeholder="e.g. blood stain, hair, fingerprint"
            />
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm">Doctor Follow-up (optional, can be empty)</label>
                <textarea
                  className="input min-h-20"
                  value={form.bio_doctor_notes}
                  onChange={(e) => setField("bio_doctor_notes", e.target.value)}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm">Identity DB Follow-up (optional, can be empty)</label>
                <textarea
                  className="input min-h-20"
                  value={form.bio_identity_db_notes}
                  onChange={(e) => setField("bio_identity_db_notes", e.target.value)}
                />
              </div>
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              At least one image/file attachment is required for bio/medical evidence.
            </p>
          </div>
        )}

        {form.type === EVIDENCE_TYPES.VEHICLE && (
          <div className="mt-4 rounded border border-zinc-700 p-3">
            <p className="mb-2 text-sm font-medium text-zinc-200">Vehicle Details</p>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm">Model</label>
                <input
                  className="input"
                  value={form.vehicle_model}
                  onChange={(e) => setField("vehicle_model", e.target.value)}
                  placeholder="Vehicle model"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm">Color</label>
                <input
                  className="input"
                  value={form.vehicle_color}
                  onChange={(e) => setField("vehicle_color", e.target.value)}
                  placeholder="Vehicle color"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm">License Plate</label>
                <input
                  className="input"
                  value={form.vehicle_plate}
                  onChange={(e) => setField("vehicle_plate", e.target.value)}
                  placeholder="Fill this OR serial number"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm">Serial Number</label>
                <input
                  className="input"
                  value={form.vehicle_serial_number}
                  onChange={(e) => setField("vehicle_serial_number", e.target.value)}
                  placeholder="Fill this OR plate"
                />
              </div>
            </div>
            <p className="mt-2 text-xs text-zinc-500">Plate and serial number cannot both be set at the same time.</p>
          </div>
        )}

        {form.type === EVIDENCE_TYPES.IDENTITY && (
          <div className="mt-4 rounded border border-zinc-700 p-3">
            <p className="mb-2 text-sm font-medium text-zinc-200">Identification Document Details</p>
            <label className="mb-2 block text-sm">Owner Full Name</label>
            <input
              className="input"
              value={form.id_owner_full_name}
              onChange={(e) => setField("id_owner_full_name", e.target.value)}
              placeholder="Document owner"
            />

            <div className="mt-3 space-y-2">
              <p className="text-sm text-zinc-300">Optional key-value details</p>
              {form.id_details.map((row, index) => (
                <div key={`id-detail-${index}`} className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                  <input
                    className="input"
                    placeholder="Key"
                    value={row.key}
                    onChange={(e) => setIdDetail(index, "key", e.target.value)}
                  />
                  <input
                    className="input"
                    placeholder="Value"
                    value={row.value}
                    onChange={(e) => setIdDetail(index, "value", e.target.value)}
                  />
                  <button
                    className="btn-secondary"
                    type="button"
                    onClick={() => removeIdDetailRow(index)}
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button className="btn-secondary" type="button" onClick={addIdDetailRow}>
                Add Detail Row
              </button>
            </div>
          </div>
        )}

        {form.type === EVIDENCE_TYPES.OTHER && (
          <div className="mt-4 rounded border border-zinc-700 p-3">
            <p className="mb-2 text-sm font-medium text-zinc-200">Other Evidence Details</p>
            <label className="mb-2 block text-sm">Additional Notes (optional)</label>
            <textarea
              className="input min-h-20"
              value={form.other_notes}
              onChange={(e) => setField("other_notes", e.target.value)}
            />
          </div>
        )}

        <div className="mt-5 rounded border border-zinc-700 p-3">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-zinc-200">Attachments</p>
            <button className="btn-secondary" type="button" onClick={addAttachmentRow}>
              Add Attachment
            </button>
          </div>

          <div className="space-y-3">
            {form.attachments.map((item, index) => (
              <div key={`attachment-${index}`} className="rounded border border-zinc-800 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs text-zinc-400">Attachment #{index + 1}</p>
                  <button className="btn-secondary" type="button" onClick={() => removeAttachmentRow(index)}>
                    Remove
                  </button>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-xs text-zinc-400">Upload File</label>
                    <input
                      className="input"
                      type="file"
                      accept={attachmentAccept}
                      onChange={(e) => setAttachmentFile(index, e.target.files?.[0] || null)}
                    />
                    {item.file && (
                      <p className="mt-2 text-xs text-zinc-500">
                        Selected: {item.file.name} ({item.file.type || "unknown"})
                      </p>
                    )}
                  </div>
                  <input
                    className="input"
                    placeholder="File URL"
                    value={item.file_url}
                    onChange={(e) => setAttachment(index, "file_url", e.target.value)}
                  />
                  <input
                    className="input"
                    placeholder="File path"
                    value={item.file_path}
                    onChange={(e) => setAttachment(index, "file_path", e.target.value)}
                  />
                  <input
                    className="input"
                    placeholder="MIME type"
                    value={item.mime_type}
                    onChange={(e) => setAttachment(index, "mime_type", e.target.value)}
                  />
                  <input
                    className="input"
                    placeholder="Original name"
                    value={item.original_name}
                    onChange={(e) => setAttachment(index, "original_name", e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>

          <p className="mt-2 text-xs text-zinc-500">
            Keep an attachment row empty if you do not need it. Bio/Medical evidence needs at least one attachment.
          </p>
          <p className="mt-1 text-xs text-zinc-500">{attachmentRuleText(form.type)}</p>
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
