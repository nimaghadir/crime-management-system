import {
  addMockNote,
  addMockRelation,
  applyMockWorkflow,
  deleteMockRelation,
  getMockBoard,
  getMockNotifications,
  getMockPayments,
  getMockWorkflow,
  mockAssignRole,
  mockAssignCasePersonnel,
  mockConvertComplaintToCase,
  mockCreateCase,
  mockCreateEvidence,
  mockCreateEvidenceAttachment,
  mockCreateInvestigationAction,
  mockCreateRole,
  mockCreateNote,
  mockCreateSuspect,
  mockDeleteRole,
  mockDeleteNote,
  mockGetAdminConsoleData,
  mockGetBoardSummary,
  mockGetPublicOverview,
  mockGetCase,
  mockGetTestingAccounts,
  mockJoinCaseAsComplainant,
  mockListCases,
  mockListAdminCaseQueue,
  mockListEvidence,
  mockListInvestigationActions,
  mockListMyCases,
  mockListRoles,
  mockListSuspects,
  mockListTags,
  mockListUsers,
  mockLogin,
  mockRegister,
  mockReorderNotes,
  mockResetStore,
  mockUpdateCasePartial,
  mockUpdateNote,
  mockUpdateSuspect,
  mockVerifyEvidence,
  reorderMockNotes,
  setMockNotificationRead,
} from "./mockData";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";
const USE_MOCK_API = readBoolEnv("VITE_USE_MOCK_API", false);
const USE_MOCK_FALLBACK = readBoolEnv("VITE_USE_MOCK_FALLBACK", true);
const MOCK_DELAY_MS = readNumberEnv("VITE_MOCK_DELAY_MS", 120);
const loggedFallbacks = new Set();

const AUTH_LOGIN_PATHS = ["/accounts/login/", "/auth/login/"];
const AUTH_REGISTER_PATHS = ["/accounts/register/", "/auth/register/"];
const CASE_LIST_PATHS = ["/cases/"];

export const ADMIN_QUEUE_TYPES = {
  INTERN_UNASSIGNED: "intern_unassigned",
  OFFICER_UNASSIGNED: "officer_unassigned",
  POLICE_WITHOUT_SUPERVISOR: "police_without_supervisor",
  SPECIALISTS_UNASSIGNED: "specialists_unassigned",
};

function readBoolEnv(name, defaultValue = false) {
  const raw = import.meta.env[name];
  if (raw === undefined) return defaultValue;
  return ["1", "true", "yes", "on"].includes(String(raw).trim().toLowerCase());
}

function readNumberEnv(name, defaultValue = 0) {
  const raw = import.meta.env[name];
  if (raw === undefined) return defaultValue;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) return defaultValue;
  return parsed;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runMock(label, mockFn) {
  if (typeof mockFn !== "function") {
    throw new Error(`${label} does not have a mock implementation.`);
  }
  if (MOCK_DELAY_MS > 0) {
    await wait(MOCK_DELAY_MS);
  }
  return mockFn();
}

function logFallback(label, error) {
  if (loggedFallbacks.has(label)) return;
  loggedFallbacks.add(label);
  console.warn(`[api] ${label} failed, using mock fallback.`, error);
}

async function callEndpoint(label, { real, mock, fallback = false }) {
  if (USE_MOCK_API) {
    return runMock(label, mock);
  }

  try {
    return await real();
  } catch (error) {
    if (USE_MOCK_FALLBACK && fallback && typeof mock === "function") {
      logFallback(label, error);
      return runMock(label, mock);
    }
    throw error;
  }
}

export const apiRuntime = {
  baseUrl: API_BASE_URL,
  useMockApi: USE_MOCK_API,
  useMockFallback: USE_MOCK_FALLBACK,
};

function extractError(data) {
  if (!data) return "Request failed";
  if (typeof data === "string") return data;
  if (data.detail) return String(data.detail);
  if (data.message) return String(data.message);
  const firstKey = Object.keys(data)[0];
  if (!firstKey) return "Request failed";
  const value = data[firstKey];
  if (Array.isArray(value)) return `${firstKey}: ${value.join(", ")}`;
  if (typeof value === "string") return `${firstKey}: ${value}`;
  return JSON.stringify(data);
}

function normalizeListResponse(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

function normalizeBoardState(data, fallbackCaseId) {
  return {
    case_id: Number(data?.case_id ?? fallbackCaseId),
    evidence: normalizeListResponse(data?.evidence),
    suspects: normalizeListResponse(data?.suspects),
    relations: normalizeListResponse(data?.relations),
    notes: normalizeListResponse(data?.notes),
    mocked_relations: Boolean(data?.mocked_relations),
    mocked_notes: Boolean(data?.mocked_notes),
  };
}

function normalizeRoles(input) {
  if (Array.isArray(input)) {
    return input.map((item) => String(item || "").trim()).filter(Boolean);
  }
  if (typeof input === "string" && input.trim()) {
    return [input.trim()];
  }
  return [];
}

function pickRoleName(data, roles = []) {
  const candidates = [
    data?.user?.role_name,
    data?.user?.role,
    data?.role_name,
    roles[0],
  ];
  return String(candidates.find((item) => String(item || "").trim()) || "");
}

function normalizeAuthResponse(data, context = {}) {
  const roles = normalizeRoles(data?.roles || data?.user?.roles || data?.user?.role_names);
  const roleName = pickRoleName(data, roles);
  const token = String(data?.access_token || data?.token || "").trim();
  const userData = data?.user && typeof data.user === "object" ? data.user : {};

  const user = {
    ...userData,
    id: userData?.id ?? data?.user_id ?? null,
    username: String(
      userData?.username ||
        data?.username ||
        context?.username ||
        context?.identifier ||
        "",
    ).trim(),
    email: String(userData?.email || context?.email || "").trim(),
    phone: String(userData?.phone || userData?.phone_number || context?.phone || "").trim(),
    national_id: String(userData?.national_id || context?.national_id || "").trim(),
    role_name: roleName,
    roles,
  };

  if (!user.phone_number && user.phone) {
    user.phone_number = user.phone;
  }

  return {
    ...data,
    access_token: token,
    user,
    mocked: false,
  };
}

function mapLevelToCrimeLevel(level) {
  const raw = String(level || "").trim().toLowerCase();
  if (["critical", "level_1", "level_2", "level_3"].includes(raw)) return raw;
  const numeric = Number(level);
  if (numeric === 4) return "critical";
  if (numeric === 2) return "level_2";
  if (numeric === 1) return "level_1";
  return "level_3";
}

function mapCrimeLevelToLevel(crimeLevel) {
  const raw = String(crimeLevel || "").trim().toLowerCase();
  if (raw === "critical") return 4;
  if (raw === "level_1") return 1;
  if (raw === "level_2") return 2;
  if (raw === "level_3") return 3;
  const numeric = Number(crimeLevel);
  if (Number.isFinite(numeric) && numeric > 0) return numeric;
  return 3;
}

function normalizeOptionalId(value) {
  const numeric = Number(value);
  return numeric > 0 ? numeric : null;
}

function normalizeCaseEntity(item, fallback = {}) {
  const source = item && typeof item === "object" ? item : {};
  const updatedAt = source.updated_at || source.created_at || fallback.updated_at || new Date().toISOString();
  const createdAt = source.created_at || fallback.created_at || updatedAt;
  const complaintIds = Array.isArray(source.complainant_ids)
    ? source.complainant_ids
    : Array.isArray(fallback.complainant_ids)
      ? fallback.complainant_ids
      : [];

  const detectiveId = normalizeOptionalId(
    source.detective_id ??
      source.assigned_detective ??
      source.assigned_to ??
      fallback.detective_id ??
      fallback.assigned_to,
  );

  return {
    ...source,
    id: Number(source.id ?? fallback.id),
    title: String(source.title || fallback.title || "").trim(),
    description: source.description ?? fallback.description ?? "",
    level: mapCrimeLevelToLevel(source.level ?? source.crime_level ?? fallback.level),
    crime_level: mapLevelToCrimeLevel(source.crime_level ?? source.level ?? fallback.level),
    status: String(source.status || fallback.status || "open"),
    assigned_to: normalizeOptionalId(
      source.assigned_to ??
        source.assigned_detective ??
        detectiveId ??
        fallback.assigned_to,
    ),
    created_by: Number(source.created_by ?? source.registered_by ?? fallback.created_by ?? 0) || null,
    created_by_role: String(source.created_by_role || fallback.created_by_role || "").trim(),
    intern_id: normalizeOptionalId(source.intern_id ?? source.cadet_id ?? source.assigned_cadet_id ?? fallback.intern_id),
    officer_id: normalizeOptionalId(source.officer_id ?? source.assigned_officer_id ?? fallback.officer_id),
    supervisor_id: normalizeOptionalId(
      source.supervisor_id ??
        source.higher_rank_id ??
        source.assigned_supervisor_id ??
        fallback.supervisor_id,
    ),
    detective_id: detectiveId,
    judge_id: normalizeOptionalId(source.judge_id ?? source.assigned_judge_id ?? fallback.judge_id),
    complainant_ids: complaintIds.map((value) => Number(value)).filter((value) => value > 0),
    created_at: createdAt,
    updated_at: updatedAt,
  };
}

function normalizeCaseCollection(data) {
  return normalizeListResponse(data).map((item) => normalizeCaseEntity(item));
}

function normalizeRoleName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ");
}

function hasRoleKeyword(roleName, keywords = []) {
  const normalized = normalizeRoleName(roleName);
  return keywords.some((keyword) => normalized.includes(normalizeRoleName(keyword)));
}

function isActiveCaseStatus(status) {
  const normalized = String(status || "").trim().toLowerCase();
  return !["resolved", "closed", "voided"].includes(normalized);
}

function isPoliceCreatorRole(roleName) {
  return hasRoleKeyword(roleName, [
    "cadet",
    "intern",
    "officer",
    "patrol",
    "detective",
    "sergeant",
    "captain",
    "chief",
    "police",
  ]);
}

function caseCreatorRoleName(caseItem, usersById = new Map()) {
  const direct = String(caseItem?.created_by_role || "").trim();
  if (direct) return direct;
  const fallbackUser = usersById.get(Number(caseItem?.created_by));
  return String(fallbackUser?.role_name || fallbackUser?.role || "").trim();
}

function filterAdminQueueCases(cases, queueType, usersById = new Map()) {
  const normalizedQueueType = String(queueType || "").trim().toLowerCase();
  return (Array.isArray(cases) ? cases : []).filter((item) => {
    if (!isActiveCaseStatus(item?.status)) {
      return false;
    }

    const internId = normalizeOptionalId(item?.intern_id);
    const officerId = normalizeOptionalId(item?.officer_id);
    const supervisorId = normalizeOptionalId(item?.supervisor_id);
    const detectiveId = normalizeOptionalId(item?.detective_id ?? item?.assigned_to);
    const judgeId = normalizeOptionalId(item?.judge_id);

    if (normalizedQueueType === ADMIN_QUEUE_TYPES.INTERN_UNASSIGNED) {
      return !internId;
    }
    if (normalizedQueueType === ADMIN_QUEUE_TYPES.OFFICER_UNASSIGNED) {
      return !officerId;
    }
    if (normalizedQueueType === ADMIN_QUEUE_TYPES.POLICE_WITHOUT_SUPERVISOR) {
      return isPoliceCreatorRole(caseCreatorRoleName(item, usersById)) && !supervisorId;
    }
    if (normalizedQueueType === ADMIN_QUEUE_TYPES.SPECIALISTS_UNASSIGNED) {
      return !detectiveId || !judgeId;
    }
    return false;
  });
}

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
  };

  const full = {
    title: base.title,
    description: base.description,
    crime_level: base.crime_level,
    creation_method: base.creation_method,
    ...(base.location ? { location: base.location } : {}),
    ...(base.incident_datetime ? { incident_datetime: base.incident_datetime } : {}),
  };

  const withoutDescription = {
    title: base.title,
    crime_level: base.crime_level,
    creation_method: base.creation_method,
    ...(base.location ? { location: base.location } : {}),
    ...(base.incident_datetime ? { incident_datetime: base.incident_datetime } : {}),
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

  return [primaryPayload, accountsLike];
}

function buildAuthorizationHeader(token) {
  const raw = String(token || "").trim();
  if (!raw) return "";
  if (raw.startsWith("mock-token-")) return `Bearer ${raw}`;

  const customPrefix = String(import.meta.env.VITE_AUTH_TOKEN_PREFIX || "").trim();
  if (customPrefix) {
    return `${customPrefix} ${raw}`;
  }

  const looksLikeJwt = raw.split(".").length === 3;
  return `${looksLikeJwt ? "Bearer" : "Token"} ${raw}`;
}

async function request(path, options = {}, token) {
  const authorization = buildAuthorizationHeader(token);
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(authorization ? { Authorization: authorization } : {}),
      ...(options.headers || {}),
    },
  });

  const raw = await response.text();
  let data = null;

  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = raw;
    }
  }

  if (!response.ok) {
    const error = new Error(extractError(data));
    error.status = response.status;
    error.path = path;
    error.data = data;
    throw error;
  }

  return data;
}

async function requestFirstAvailable(paths, options = {}, token, retryStatuses = [404, 405]) {
  const list = (Array.isArray(paths) ? paths : [paths]).filter(Boolean);
  let lastError = null;

  for (let index = 0; index < list.length; index += 1) {
    const path = list[index];
    try {
      return await request(path, options, token);
    } catch (error) {
      lastError = error;
      const shouldRetry =
        retryStatuses.includes(Number(error?.status)) && index < list.length - 1;
      if (!shouldRetry) {
        throw error;
      }
    }
  }

  throw lastError || new Error("Request failed");
}

export const EVIDENCE_TYPES = {
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

function normalizeEvidenceMetadata(payload = {}) {
  const metadata =
    payload?.metadata && typeof payload.metadata === "object" && !Array.isArray(payload.metadata)
      ? payload.metadata
      : {};

  return {
    ...metadata,
    model: String(metadata.model ?? metadata.model_name ?? "").trim(),
    color: String(metadata.color || "").trim(),
    plate: String(metadata.plate ?? metadata.license_plate ?? "").trim(),
    serial_number: String(metadata.serial_number || "").trim(),
    owner_full_name: String(metadata.owner_full_name ?? metadata.owner_name ?? "").trim(),
    transcript: String(metadata.transcript || "").trim(),
  };
}

function compactEvidenceAttachments(rows = []) {
  return (Array.isArray(rows) ? rows : [])
    .map((item) => ({
      file_url: String(item?.file_url || "").trim(),
      file_path: String(item?.file_path || "").trim(),
      mime_type: String(item?.mime_type || "").trim(),
      original_name: String(item?.original_name || "").trim(),
    }))
    .filter(
      (item) =>
        item.file_url ||
        item.file_path,
    );
}

function normalizeEvidenceEntity(item) {
  const source = item && typeof item === "object" ? item : {};
  const metadata =
    source.metadata && typeof source.metadata === "object" && !Array.isArray(source.metadata)
      ? source.metadata
      : {};
  const attachments = compactEvidenceAttachments(
    source.attachments || source.files || source.media || [],
  );

  return {
    ...source,
    id: Number(source.id),
    case: Number(source.case ?? source.case_id),
    type: normalizeEvidenceType(source.type || source.evidence_type || source.kind),
    metadata,
    attachments,
    title: String(source.title || "").trim(),
    description: String(source.description || "").trim(),
    registered_at: source.registered_at || source.created_at || null,
    submitter_name:
      String(source.submitter_name || source.submitter_username || source.submitter?.username || "").trim(),
    submitter_role:
      String(
        source.submitter_role ||
          source.submitted_by_role ||
          source.created_by_role ||
          source.submitter?.role_name ||
          "",
      ).trim(),
  };
}

function normalizeEvidenceCollection(data) {
  return normalizeListResponse(data).map((item) => normalizeEvidenceEntity(item));
}

export function validateEvidencePayload(payload) {
  const type = normalizeEvidenceType(payload?.type);
  const metadata = normalizeEvidenceMetadata(payload);
  const title = String(payload?.title || "").trim();
  const description = String(payload?.description || "").trim();
  const registeredAt = String(payload?.registered_at || "").trim();
  const attachments = compactEvidenceAttachments(payload?.attachments || []);

  if (!type) {
    throw new Error("Evidence type is required.");
  }
  if (!title) {
    throw new Error("Evidence title is required.");
  }
  if (!description) {
    throw new Error("Evidence description is required.");
  }
  if (!registeredAt) {
    throw new Error("Evidence registration date is required.");
  }

  if (type === EVIDENCE_TYPES.VEHICLE) {
    const hasModel = Boolean(metadata.model);
    const hasColor = Boolean(metadata.color);
    const hasPlate = Boolean(metadata.plate);
    const hasSerial = Boolean(metadata.serial_number);

    if (!hasModel || !hasColor) {
      throw new Error("Vehicle evidence must include model and color.");
    }
    if (hasPlate === hasSerial) {
      throw new Error("Vehicle evidence must include plate OR serial_number, not both.");
    }
  }

  if (type === EVIDENCE_TYPES.IDENTITY) {
    if (!metadata.owner_full_name) {
      throw new Error("Identity evidence must include owner full name.");
    }
    const details = metadata.details;
    if (details !== undefined && (typeof details !== "object" || Array.isArray(details))) {
      throw new Error("Identity evidence details must be a key-value object.");
    }
  }

  if (type === EVIDENCE_TYPES.TESTIMONY) {
    if (!metadata.transcript && attachments.length === 0) {
      throw new Error("Testimony evidence needs transcript or at least one media attachment.");
    }
  }

  if (type === EVIDENCE_TYPES.BIO_MEDICAL) {
    if (attachments.length === 0) {
      throw new Error("Biological/medical evidence must include at least one attachment.");
    }
  }
}

function buildEvidencePayloadCandidates(payload = {}) {
  const type = normalizeEvidenceType(payload.type);
  const title = String(payload.title || "").trim();
  const description = String(payload.description || "").trim();
  const registeredAt = payload.registered_at || null;
  const metadata =
    payload.metadata && typeof payload.metadata === "object" && !Array.isArray(payload.metadata)
      ? payload.metadata
      : {};
  const submitterName = String(payload.submitter_name || "").trim();
  const submitterRole = String(payload.submitter_role || "").trim();

  const full = {
    case: Number(payload.case),
    type,
    title,
    description,
    registered_at: registeredAt,
    metadata,
    ...(submitterName ? { submitter_name: submitterName } : {}),
    ...(submitterRole ? { submitter_role: submitterRole } : {}),
  };

  const withoutSubmitter = {
    case: full.case,
    type: full.type,
    title: full.title,
    description: full.description,
    registered_at: full.registered_at,
    metadata: full.metadata,
  };

  const legacy = {
    case: full.case,
    type: full.type,
    metadata: full.metadata,
  };

  return [full, withoutSubmitter, legacy];
}

async function realLogin(payload = {}) {
  const loginPayload = {
    identifier: String(payload.identifier || "").trim(),
    password: String(payload.password || ""),
  };
  const data = await requestFirstAvailable(
    AUTH_LOGIN_PATHS,
    { method: "POST", body: JSON.stringify(loginPayload) },
  );
  return normalizeAuthResponse(data, { identifier: loginPayload.identifier });
}

async function realRegister(payload = {}) {
  const candidates = buildRegisterPayloadCandidates(payload);
  let registerResponse = null;
  let lastRegisterError = null;

  for (const candidate of candidates) {
    try {
      registerResponse = await requestFirstAvailable(
        AUTH_REGISTER_PATHS,
        { method: "POST", body: JSON.stringify(candidate) },
      );
      break;
    } catch (error) {
      lastRegisterError = error;
      if (Number(error?.status) !== 400) {
        throw error;
      }
    }
  }

  if (!registerResponse) {
    throw lastRegisterError || new Error("Registration failed.");
  }

  if (registerResponse?.access_token || registerResponse?.token) {
    return normalizeAuthResponse(registerResponse, {
      username: payload.username,
      email: payload.email,
      phone: payload.phone || payload.phone_number,
      national_id: payload.national_id,
    });
  }

  const loginPayload = {
    identifier: String(payload.username || payload.email || payload.phone || payload.national_id || "").trim(),
    password: String(payload.password || ""),
  };
  const loginResponse = await requestFirstAvailable(
    AUTH_LOGIN_PATHS,
    { method: "POST", body: JSON.stringify(loginPayload) },
  );
  return normalizeAuthResponse(loginResponse, {
    identifier: loginPayload.identifier,
    username: payload.username,
    email: payload.email,
    phone: payload.phone || payload.phone_number,
    national_id: payload.national_id,
  });
}

async function realListCases(token, params = {}) {
  const query = new URLSearchParams(params).toString();
  const paths = CASE_LIST_PATHS.map((path) => `${path}${query ? `?${query}` : ""}`);
  const data = await requestFirstAvailable(paths, {}, token);
  return normalizeCaseCollection(data);
}

async function realListMyCases(token, params = {}) {
  const query = new URLSearchParams(params).toString();
  const myPaths = ["/cases/my/"].map((path) => `${path}${query ? `?${query}` : ""}`);
  try {
    const data = await requestFirstAvailable(myPaths, {}, token);
    return normalizeCaseCollection(data);
  } catch (error) {
    if ([404, 405].includes(Number(error?.status))) {
      return realListCases(token, params);
    }
    throw error;
  }
}

async function realGetCase(token, id) {
  const detailPaths = [`/cases/${id}/`];
  try {
    const data = await requestFirstAvailable(detailPaths, {}, token);
    return normalizeCaseEntity(data);
  } catch (error) {
    if (![404, 405].includes(Number(error?.status))) {
      throw error;
    }
  }

  const allCases = await realListCases(token);
  const found = allCases.find((item) => Number(item.id) === Number(id));
  if (!found) {
    throw new Error(`Case #${id} was not found.`);
  }
  return found;
}

async function realCreateCase(token, payload = {}) {
  const payloadCandidates = buildCaseCreatePayloadCandidates(payload);
  let lastError = null;

  for (const candidate of payloadCandidates) {
    try {
      const data = await requestFirstAvailable(
        CASE_LIST_PATHS,
        { method: "POST", body: JSON.stringify(candidate) },
        token,
      );
      return normalizeCaseEntity(data, payload);
    } catch (error) {
      lastError = error;
      if (Number(error?.status) !== 400) {
        throw error;
      }
    }
  }

  throw lastError || new Error("Failed to create case.");
}

async function realListAdminCaseQueue(token, queueType) {
  const type = String(queueType || "").trim().toLowerCase();
  if (!Object.values(ADMIN_QUEUE_TYPES).includes(type)) {
    throw new Error("Unsupported admin queue type.");
  }

  // Queue filtering is intentionally frontend-derived from the full case list,
  // so backend does not need a dedicated /admin/case-queues/{type}/ endpoint.
  const cases = await realListCases(token);

  let usersById = new Map();
  const needsCreatorRoleLookup =
    type === ADMIN_QUEUE_TYPES.POLICE_WITHOUT_SUPERVISOR &&
    cases.some((item) => !String(item?.created_by_role || "").trim() && Number(item?.created_by) > 0);

  if (needsCreatorRoleLookup) {
    try {
      const usersData = await request("/users/", {}, token);
      const users = normalizeListResponse(usersData);
      usersById = new Map(
        users
          .map((user) => [Number(user?.id), user])
          .filter(([id]) => Number(id) > 0),
      );
    } catch {
      usersById = new Map();
    }
  }

  return filterAdminQueueCases(cases, type, usersById);
}

async function realAssignCasePersonnel(token, caseId, payload = {}) {
  const id = Number(caseId);
  if (!id) {
    throw new Error("Valid case id is required.");
  }

  const paths = [
    `/admin/case-assignments/${id}/`,
    `/cases/${id}/assignments/`,
    `/cases/${id}/`,
  ];
  const data = await requestFirstAvailable(
    paths,
    { method: "PATCH", body: JSON.stringify(payload) },
    token,
  );
  return normalizeCaseEntity(data, { id, ...payload });
}

async function realCreateEvidence(token, payload = {}) {
  const candidates = buildEvidencePayloadCandidates(payload);
  let lastError = null;

  for (const candidate of candidates) {
    try {
      const created = await request(
        "/evidence/",
        { method: "POST", body: JSON.stringify(candidate) },
        token,
      );
      return normalizeEvidenceEntity(created);
    } catch (error) {
      lastError = error;
      if (Number(error?.status) !== 400) {
        throw error;
      }
    }
  }

  throw lastError || new Error("Failed to create evidence.");
}

export const api = {
  login: (payload) =>
    callEndpoint("login", {
      real: () => realLogin(payload),
      mock: () => mockLogin(payload),
      fallback: false,
    }),
  register: (payload) =>
    callEndpoint("register", {
      real: () => realRegister(payload),
      mock: () => mockRegister(payload),
      fallback: false,
    }),
  getProtectedPing: (token) =>
    callEndpoint("getProtectedPing", {
      real: () => request("/protected/", {}, token),
      mock: () => ({ ok: true, mocked: true }),
      fallback: true,
    }),

  listCases: (token, params = {}) =>
    callEndpoint("listCases", {
      real: () => realListCases(token, params),
      mock: () => mockListCases(token, params),
      fallback: false,
    }),
  listMyCases: (token, params = {}) =>
    callEndpoint("listMyCases", {
      real: () => realListMyCases(token, params),
      mock: () => mockListMyCases(token, params),
      fallback: false,
    }),
  joinCaseAsComplainant: (token, caseId) =>
    callEndpoint("joinCaseAsComplainant", {
      real: () =>
        request("/case-complainants/", { method: "POST", body: JSON.stringify({ case: Number(caseId) }) }, token),
      mock: () => mockJoinCaseAsComplainant(token, caseId),
      fallback: true,
    }),
  getCase: (token, id) =>
    callEndpoint("getCase", {
      real: () => realGetCase(token, id),
      mock: () => mockGetCase(token, id),
      fallback: false,
    }),
  createCase: (token, payload) =>
    callEndpoint("createCase", {
      real: () => realCreateCase(token, payload),
      mock: () => mockCreateCase(token, payload),
      fallback: false,
    }),
  updateCasePartial: (token, id, payload) =>
    callEndpoint("updateCasePartial", {
      real: () =>
        request(`/cases/${id}/`, { method: "PATCH", body: JSON.stringify(payload) }, token),
      mock: () => mockUpdateCasePartial(token, id, payload),
      fallback: true,
    }),

  listTags: (token) =>
    callEndpoint("listTags", {
      real: async () => normalizeListResponse(await request("/tags/", {}, token)),
      mock: () => mockListTags(token),
      fallback: true,
    }),

  listEvidence: (token, caseId) =>
    callEndpoint("listEvidence", {
      real: async () => normalizeEvidenceCollection(await request(`/evidence/?case=${caseId}`, {}, token)),
      mock: () => mockListEvidence(token, caseId),
      fallback: true,
    }),
  createEvidence: (token, payload) => {
    validateEvidencePayload(payload);
    return callEndpoint("createEvidence", {
      real: () => realCreateEvidence(token, payload),
      mock: () => mockCreateEvidence(token, payload),
      fallback: true,
    });
  },
  verifyEvidence: (token, evidenceId) =>
    callEndpoint("verifyEvidence", {
      real: async () => normalizeEvidenceEntity(await request(`/evidence/${evidenceId}/verify/`, { method: "POST" }, token)),
      mock: () => mockVerifyEvidence(token, evidenceId),
      fallback: true,
    }),

  createEvidenceAttachment: (token, payload) =>
    callEndpoint("createEvidenceAttachment", {
      real: () =>
        request(
          "/evidence-attachments/",
          { method: "POST", body: JSON.stringify(payload) },
          token,
        ),
      mock: () => mockCreateEvidenceAttachment(token, payload),
      fallback: true,
    }),

  listSuspects: (token, caseId) =>
    callEndpoint("listSuspects", {
      real: async () => normalizeListResponse(await request(`/suspects/?case=${caseId}`, {}, token)),
      mock: () => mockListSuspects(token, caseId),
      fallback: true,
    }),
  createSuspect: (token, payload) =>
    callEndpoint("createSuspect", {
      real: () => request("/suspects/", { method: "POST", body: JSON.stringify(payload) }, token),
      mock: () => mockCreateSuspect(token, payload),
      fallback: true,
    }),
  updateSuspect: (token, suspectId, payload) =>
    callEndpoint("updateSuspect", {
      real: () =>
        request(`/suspects/${suspectId}/`, { method: "PATCH", body: JSON.stringify(payload) }, token),
      mock: () => mockUpdateSuspect(token, suspectId, payload),
      fallback: true,
    }),

  createNote: (token, payload) =>
    callEndpoint("createNote", {
      real: () => request("/notes/", { method: "POST", body: JSON.stringify(payload) }, token),
      mock: () => mockCreateNote(token, payload),
      fallback: true,
    }),
  updateNote: (token, noteId, payload) =>
    callEndpoint("updateNote", {
      real: () => request(`/notes/${noteId}/`, { method: "PATCH", body: JSON.stringify(payload) }, token),
      mock: () => mockUpdateNote(token, noteId, payload),
      fallback: true,
    }),
  deleteNote: (token, noteId) =>
    callEndpoint("deleteNote", {
      real: () => request(`/notes/${noteId}/`, { method: "DELETE" }, token),
      mock: () => mockDeleteNote(token, noteId),
      fallback: true,
    }),
  reorderNotes: (token, payload) =>
    callEndpoint("reorderNotes", {
      real: () =>
        request("/notes/reorder/", { method: "POST", body: JSON.stringify(payload) }, token),
      mock: () => mockReorderNotes(token, payload),
      fallback: true,
    }),

  listInvestigationActions: (token, caseId) =>
    callEndpoint("listInvestigationActions", {
      real: async () =>
        normalizeListResponse(await request(`/investigation-actions/?case=${caseId}`, {}, token)),
      mock: () => mockListInvestigationActions(token, caseId),
      fallback: true,
    }),
  createInvestigationAction: (token, payload) =>
    callEndpoint("createInvestigationAction", {
      real: () =>
        request(
          "/investigation-actions/",
          { method: "POST", body: JSON.stringify(payload) },
          token,
        ),
      mock: () => mockCreateInvestigationAction(token, payload),
      fallback: true,
    }),
  startInterrogation: (token, payload) =>
    callEndpoint("startInterrogation", {
      real: () =>
        request(
          "/investigation-actions/start-interrogation/",
          { method: "POST", body: JSON.stringify(payload) },
          token,
        ),
      mock: () => ({
        mocked: true,
        action_type: "start_interrogation",
        ...mockCreateInvestigationAction(token, payload),
      }),
      fallback: true,
    }),

  getPublicOverview: () =>
    callEndpoint("getPublicOverview", {
      real: () => request("/reports/public-overview/"),
      mock: () => mockGetPublicOverview(),
      fallback: true,
    }),

  getAdminConsoleData: (token) =>
    callEndpoint("getAdminConsoleData", {
      real: () => request("/admin/console-summary/", {}, token),
      mock: () => mockGetAdminConsoleData(token),
      fallback: true,
    }),

  listAdminCaseQueue: (token, queueType) =>
    callEndpoint("listAdminCaseQueue", {
      real: () => realListAdminCaseQueue(token, queueType),
      mock: () => mockListAdminCaseQueue(token, queueType),
      fallback: true,
    }),

  assignCasePersonnel: (token, caseId, payload) =>
    callEndpoint("assignCasePersonnel", {
      real: () => realAssignCasePersonnel(token, caseId, payload),
      mock: () => mockAssignCasePersonnel(token, caseId, payload),
      fallback: true,
    }),

  getMockTestingAccounts() {
    if (!USE_MOCK_API && !USE_MOCK_FALLBACK) {
      return Promise.resolve([]);
    }
    return runMock("getMockTestingAccounts", () => mockGetTestingAccounts());
  },

  resetMockStore: (token) =>
    callEndpoint("resetMockStore", {
      real: () => request("/admin/mock-reset/", { method: "POST" }, token),
      mock: () => mockResetStore(token),
      fallback: true,
    }),

  getBoardSummary: (token) =>
    callEndpoint("getBoardSummary", {
      real: () => request("/reports/detective-board-summary/", {}, token),
      mock: () => mockGetBoardSummary(token),
      fallback: true,
    }),

  listRoles: (token) =>
    callEndpoint("listRoles", {
      real: async () => normalizeListResponse(await request("/roles/", {}, token)),
      mock: () => mockListRoles(token),
      fallback: true,
    }),
  createRole: (token, payload) =>
    callEndpoint("createRole", {
      real: () => request("/roles/", { method: "POST", body: JSON.stringify(payload) }, token),
      mock: () => mockCreateRole(token, payload),
      fallback: true,
    }),
  deleteRole: (token, roleId) =>
    callEndpoint("deleteRole", {
      real: () => request(`/roles/${roleId}/`, { method: "DELETE" }, token),
      mock: () => mockDeleteRole(token, roleId),
      fallback: true,
    }),
  listUsers: (token) =>
    callEndpoint("listUsers", {
      real: async () => normalizeListResponse(await request("/users/", {}, token)),
      mock: () => mockListUsers(token),
      fallback: true,
    }),
  assignRole: (token, userId, role) =>
    callEndpoint("assignRole", {
      real: () =>
        request(
          `/users/${userId}/assign-role/`,
          { method: "POST", body: JSON.stringify({ role }) },
          token,
        ),
      mock: () => mockAssignRole(token, userId, role),
      fallback: true,
    }),

  convertComplaintToCase: (token, complaintId, payload) =>
    callEndpoint("convertComplaintToCase", {
      real: () =>
        request(
          `/cases/complaints/${complaintId}/convert/`,
          { method: "POST", body: JSON.stringify(payload) },
          token,
        ),
      mock: () => mockConvertComplaintToCase(token, complaintId, payload),
      fallback: true,
    }),

  async transitionCase(token, caseId, payload) {
    return callEndpoint("transitionCase", {
      real: () =>
        request(
          `/cases/${caseId}/transition/`,
          { method: "POST", body: JSON.stringify(payload) },
          token,
        ),
      mock: () => ({
        id: Number(caseId),
        mocked: true,
        ...applyMockWorkflow(caseId, payload),
      }),
      fallback: true,
    });
  },

  getMockWorkflowState(caseId) {
    return getMockWorkflow(caseId);
  },

  async getDetectiveBoardState(token, caseId) {
    const state = await callEndpoint("getDetectiveBoardState", {
      real: () => request(`/investigations/board-state/?case=${caseId}`, {}, token),
      mock: async () => {
        const evidence = await this.listEvidence(token, caseId);

        const boardMock = getMockBoard(caseId);
        return {
          case_id: Number(caseId),
          evidence,
          suspects: [],
          notes: boardMock.notes,
          relations: boardMock.relations,
          mocked_relations: true,
          mocked_notes: true,
        };
      },
      fallback: true,
    });
    return normalizeBoardState(state, caseId);
  },

  async createBoardRelation(token, caseId, payload) {
    return callEndpoint("createBoardRelation", {
      real: () =>
        request(
          "/investigations/evidence-relations/",
          {
            method: "POST",
            body: JSON.stringify({
              case: Number(caseId),
              ...payload,
            }),
          },
          token,
        ),
      mock: () => addMockRelation(caseId, payload),
      fallback: true,
    });
  },

  async deleteBoardRelation(token, caseId, relationId) {
    return callEndpoint("deleteBoardRelation", {
      real: () =>
        request(`/investigations/evidence-relations/${relationId}/`, { method: "DELETE" }, token),
      mock: () => deleteMockRelation(caseId, relationId),
      fallback: true,
    });
  },

  async createBoardNote(token, caseId, payload) {
    const created = await callEndpoint("createBoardNote", {
      real: () =>
        request(
          "/notes/",
          {
            method: "POST",
            body: JSON.stringify({
              case: Number(caseId),
              text: payload.text,
              pinned: false,
            }),
          },
          token,
        ),
      mock: () => ({
        ...addMockNote(caseId, payload),
        mocked: true,
      }),
      fallback: true,
    });
    return created?.mocked ? created : { ...created, mocked: false };
  },

  async reorderBoardNotes(token, caseId, noteIds) {
    const result = await callEndpoint("reorderBoardNotes", {
      real: () =>
        request(
          "/notes/reorder/",
          {
            method: "POST",
            body: JSON.stringify({
              case: Number(caseId),
              note_ids: noteIds,
            }),
          },
          token,
        ),
      mock: () => ({ notes: reorderMockNotes(caseId, noteIds), mocked: true }),
      fallback: true,
    });

    if (Array.isArray(result)) {
      return { notes: result, mocked: false };
    }
    return {
      notes: result?.notes || [],
      mocked: Boolean(result?.mocked),
    };
  },

  async listNotifications(token) {
    return callEndpoint("listNotifications", {
      real: async () => normalizeListResponse(await request("/notifications/", {}, token)),
      mock: () => getMockNotifications(token),
      fallback: true,
    });
  },

  async markNotificationRead(token, notificationId) {
    return callEndpoint("markNotificationRead", {
      real: () =>
        request(
          `/notifications/${notificationId}/`,
          { method: "PATCH", body: JSON.stringify({ is_read: true }) },
          token,
        ),
      mock: () => ({ ...setMockNotificationRead(token, notificationId), mocked: true }),
      fallback: true,
    });
  },

  async listPaymentRecords(token) {
    return callEndpoint("listPaymentRecords", {
      real: async () => normalizeListResponse(await request("/payments/records/", {}, token)),
      mock: () => getMockPayments(),
      fallback: true,
    });
  },
};
