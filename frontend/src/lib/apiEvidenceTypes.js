const EVIDENCE_TYPES = {
  TESTIMONY: "testimony",
  BIO_MEDICAL: "bio_medical",
  VEHICLE: "vehicle",
  IDENTITY: "identity",
  OTHER: "other",
};

function normalizeEvidenceType(value) {
  const type = String(value || "")
    .trim()
    .toLowerCase();

  if (Object.values(EVIDENCE_TYPES).includes(type)) {
    return type;
  }
  return "";
}

function evidenceListPathByType(type) {
  if (type === EVIDENCE_TYPES.TESTIMONY) return "/evidence/testimony/";
  if (type === EVIDENCE_TYPES.BIO_MEDICAL) return "/evidence/biological/";
  if (type === EVIDENCE_TYPES.VEHICLE) return "/evidence/vehicle/";
  if (type === EVIDENCE_TYPES.IDENTITY) return "/evidence/identification-document/";
  if (type === EVIDENCE_TYPES.OTHER) return "/evidence/other/";
  throw new Error(`Unsupported evidence type: ${type}`);
}

export {
  EVIDENCE_TYPES,
  evidenceListPathByType,
  normalizeEvidenceType,
};
