import { mapLevelToCrimeLevel } from "./apiCaseUtils.js";

function buildCaseCreatePayloadCandidates(payload = {}) {
  const title = String(payload.title || "").trim();
  const description = String(payload.description || "").trim();
  const creationMethod = String(payload.creation_method || "complaint").trim() || "complaint";
  const base = {
    title,
    description,
    crime_level: mapLevelToCrimeLevel(payload.crime_level ?? payload.level),
    creation_method: creationMethod,
    location: String(payload.location || "").trim(),
    incident_datetime: payload.incident_datetime || null,
    witnesses: Array.isArray(payload.witnesses) ? payload.witnesses : [],
  };

  const full = {
    title: base.title,
    description: base.description,
    crime_level: base.crime_level,
    creation_method: base.creation_method,
    ...(base.location ? { location: base.location } : {}),
    ...(base.incident_datetime ? { incident_datetime: base.incident_datetime } : {}),
    ...(base.witnesses.length ? { witnesses: base.witnesses } : {}),
  };

  const withoutDescription = {
    title: base.title,
    crime_level: base.crime_level,
    creation_method: base.creation_method,
    ...(base.location ? { location: base.location } : {}),
    ...(base.incident_datetime ? { incident_datetime: base.incident_datetime } : {}),
    ...(base.witnesses.length ? { witnesses: base.witnesses } : {}),
  };

  return [full, withoutDescription];
}

function buildRegisterPayloadCandidates(payload = {}) {
  const username = String(payload.username || "").trim();
  const password = String(payload.password || "");
  const email = String(payload.email || "").trim();
  const phone = String(payload.phone || payload.phone_number || "").trim();
  const nationalId = String(payload.national_id || "").trim();
  const firstName = String(payload.first_name || "").trim();
  const lastName = String(payload.last_name || "").trim();

  const primaryPayload = {
    username,
    password,
    email,
    phone,
    first_name: firstName,
    last_name: lastName,
    national_id: nationalId,
  };
  const accountsLike = {
    username,
    password,
    email,
    phone_number: phone,
    national_id: nationalId,
  };

  // Prefer backend's current serializer shape first (phone_number),
  // then fallback to legacy/alternate register payload shapes.
  return [accountsLike, primaryPayload];
}

export {
  buildCaseCreatePayloadCandidates,
  buildRegisterPayloadCandidates,
};
