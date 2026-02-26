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
  mockCreateCase,
  mockCreateEvidence,
  mockCreateEvidenceAttachment,
  mockCreateInvestigationAction,
  mockCreateRole,
  mockCreateSuspect,
  mockDetectiveReviewTip,
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
  mockListForensicEvidenceQueue,
  mockListInvestigationActions,
  mockListDetectiveTipQueue,
  mockListIntenseTrackingSuspects,
  mockListMyCases,
  mockListMyTips,
  mockListOfficerTipQueue,
  mockListRoles,
  mockListSuspects,
  mockListUsers,
  mockLogin,
  mockLookupReward,
  mockOfficerReviewTip,
  mockRegister,
  mockReviewForensicEvidence,
  mockResetStore,
  mockSubmitTip,
  mockUpdateCasePartial,
  mockVerifyEvidence,
  reorderMockNotes,
  setAllMockNotificationsRead,
  setMockNotificationRead,
} from "./mockData";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";
const API_BASE_ORIGIN = (() => {
  try {
    return new URL(API_BASE_URL).origin;
  } catch {
    return "";
  }
})();
const LEGACY_MOCK_RUNTIME_ENABLED = false;
const USE_MOCK_API = LEGACY_MOCK_RUNTIME_ENABLED && readBoolEnv("VITE_USE_MOCK_API", false);
const USE_MOCK_FALLBACK = LEGACY_MOCK_RUNTIME_ENABLED && readBoolEnv("VITE_USE_MOCK_FALLBACK", false);
const MOCK_DELAY_MS = readNumberEnv("VITE_MOCK_DELAY_MS", 120);
const loggedFallbacks = new Set();

const AUTH_LOGIN_PATHS = ["/accounts/login/", "/auth/login/"];
const AUTH_REGISTER_PATHS = ["/accounts/register/", "/auth/register/"];
const CASE_LIST_PATHS = ["/cases/"];
const REAL_BOARD_CACHE_KEY = "caseflow_real_board_cache";
const REAL_EVIDENCE_UI_CACHE_KEY = "caseflow_real_evidence_ui_cache";
const REAL_INVESTIGATION_ACTIONS_CACHE_KEY = "caseflow_real_investigation_actions_cache";
const REAL_WORKFLOW_CACHE_KEY = "caseflow_real_workflow_cache";

export const ADMIN_QUEUE_TYPES = {
  INTERN_UNASSIGNED: "intern_unassigned",
  OFFICER_UNASSIGNED: "officer_unassigned",
  COMMAND_CHAIN_UNASSIGNED: "command_chain_unassigned",
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
  mockRuntimeEnabled: LEGACY_MOCK_RUNTIME_ENABLED,
};

function resolvePublicAssetUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw.startsWith("blob:") || raw.startsWith("data:")) return raw;

  const browserOrigin =
    typeof window !== "undefined" && window.location && window.location.origin
      ? window.location.origin
      : "";

  try {
    const parsed = new URL(raw, browserOrigin || API_BASE_ORIGIN || "http://localhost");
    if (parsed.pathname.startsWith("/media/")) {
      // Prefer same-origin relative path so Vite's /media proxy (dev) and same-origin deploys both work.
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
    return parsed.toString();
  } catch {
    return raw;
  }
}

function createMissingEndpointError(feature, endpoints = []) {
  const list = (Array.isArray(endpoints) ? endpoints : [endpoints]).filter(Boolean);
  const suffix = list.length ? ` Missing backend endpoint(s): ${list.join(", ")}` : "";
  const error = new Error(`Backend API not implemented for "${feature}".${suffix}`);
  error.code = "BACKEND_API_NOT_IMPLEMENTED";
  error.feature = feature;
  error.endpoints = list;
  return error;
}

function unsupportedApi(feature, endpoints = []) {
  return Promise.reject(createMissingEndpointError(feature, endpoints));
}

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
  const rawNodePositions =
    data?.node_positions && typeof data.node_positions === "object" && !Array.isArray(data.node_positions)
      ? data.node_positions
      : data?.positions && typeof data.positions === "object" && !Array.isArray(data.positions)
        ? data.positions
        : {};

  const node_positions = Object.fromEntries(
    Object.entries(rawNodePositions)
      .map(([key, value]) => {
        const x = Number(value?.x);
        const y = Number(value?.y);
        if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
        return [String(key), { x, y }];
      })
      .filter(Boolean),
  );

  return {
    case_id: Number(data?.case_id ?? fallbackCaseId),
    evidence: normalizeListResponse(data?.evidence),
    suspects: normalizeListResponse(data?.suspects),
    relations: normalizeListResponse(data?.relations),
    notes: normalizeListResponse(data?.notes),
    node_positions,
    mocked_relations: Boolean(data?.mocked_relations),
    mocked_notes: Boolean(data?.mocked_notes),
  };
}

function readObjectCache(key) {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeObjectCache(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value || {}));
  } catch {
    // Ignore storage quota/private mode failures.
  }
}

function readRealBoardCache() {
  return readObjectCache(REAL_BOARD_CACHE_KEY);
}

function writeRealBoardCache(cache) {
  writeObjectCache(REAL_BOARD_CACHE_KEY, cache);
}

function getRealBoardBucket(caseId) {
  const cache = readRealBoardCache();
  const key = String(Number(caseId) || caseId || "");
  const bucket = cache[key] && typeof cache[key] === "object" ? cache[key] : {};
  return {
    cache,
    key,
    bucket: {
      notes: Array.isArray(bucket.notes) ? bucket.notes : [],
      relations: Array.isArray(bucket.relations) ? bucket.relations : [],
      node_positions:
        bucket.node_positions && typeof bucket.node_positions === "object" && !Array.isArray(bucket.node_positions)
          ? bucket.node_positions
          : {},
    },
  };
}

function nextLocalId(items = []) {
  const numeric = items.map((item) => Number(item?.id) || 0);
  return (numeric.length ? Math.max(...numeric) : 0) + 1;
}

function localBoardSnapshot(caseId) {
  const { bucket } = getRealBoardBucket(caseId);
  return {
    notes: [...bucket.notes].sort((a, b) => Number(a?.order_index ?? 0) - Number(b?.order_index ?? 0)),
    relations: [...bucket.relations],
    node_positions: { ...bucket.node_positions },
  };
}

function localBoardSavePositions(caseId, nodePositions = {}) {
  const { cache, key, bucket } = getRealBoardBucket(caseId);
  const cleaned = {};
  for (const [nodeKey, pos] of Object.entries(nodePositions || {})) {
    const x = Number(pos?.x);
    const y = Number(pos?.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    cleaned[String(nodeKey)] = { x, y };
  }
  cache[key] = { ...bucket, node_positions: cleaned };
  writeRealBoardCache(cache);
  return { case_id: Number(caseId), node_positions: cleaned, local_only: true };
}

function localBoardCreateRelation(caseId, payload = {}) {
  const { cache, key, bucket } = getRealBoardBucket(caseId);
  const created = {
    id: nextLocalId(bucket.relations),
    source_evidence: Number(payload.source_evidence) || null,
    source_suspect: Number(payload.source_suspect) || null,
    target_evidence: Number(payload.target_evidence) || null,
    target_suspect: Number(payload.target_suspect) || null,
    source_note: Number(payload.source_note) || null,
    target_note: Number(payload.target_note) || null,
    annotation: String(payload.annotation || "").trim(),
  };
  cache[key] = {
    ...bucket,
    relations: [...bucket.relations, created],
  };
  writeRealBoardCache(cache);
  return created;
}

function localBoardDeleteRelation(caseId, relationId) {
  const { cache, key, bucket } = getRealBoardBucket(caseId);
  const next = bucket.relations.filter((item) => Number(item.id) !== Number(relationId));
  if (next.length === bucket.relations.length) {
    throw new Error(`Relation #${relationId} was not found.`);
  }
  cache[key] = { ...bucket, relations: next };
  writeRealBoardCache(cache);
  return { deleted: true };
}

function localBoardCreateNote(caseId, payload = {}) {
  const { cache, key, bucket } = getRealBoardBucket(caseId);
  const created = {
    id: nextLocalId(bucket.notes),
    text: String(payload.text || "").trim(),
    pinned: Boolean(payload.pinned),
    order_index: bucket.notes.length,
  };
  cache[key] = {
    ...bucket,
    notes: [...bucket.notes, created],
  };
  writeRealBoardCache(cache);
  return created;
}

function localBoardDeleteNote(noteId) {
  const cache = readRealBoardCache();
  let found = false;
  for (const key of Object.keys(cache)) {
    const bucket = cache[key] && typeof cache[key] === "object" ? cache[key] : {};
    const notes = Array.isArray(bucket.notes) ? bucket.notes : [];
    const relations = Array.isArray(bucket.relations) ? bucket.relations : [];
    const nextNotes = notes.filter((item) => Number(item.id) !== Number(noteId));
    if (nextNotes.length !== notes.length) {
      found = true;
      const normalizedNotes = nextNotes.map((item, index) => ({ ...item, order_index: index }));
      const nextRelations = relations.filter(
        (item) => Number(item.source_note) !== Number(noteId) && Number(item.target_note) !== Number(noteId),
      );
      cache[key] = { ...bucket, notes: normalizedNotes, relations: nextRelations };
      break;
    }
  }
  if (!found) {
    throw new Error(`Note #${noteId} was not found.`);
  }
  writeRealBoardCache(cache);
  return { deleted: true };
}

function localBoardReorderNotes(caseId, noteIds = []) {
  const { cache, key, bucket } = getRealBoardBucket(caseId);
  const byId = new Map(bucket.notes.map((item) => [Number(item.id), item]));
  const used = new Set();
  const reordered = [];

  for (const id of noteIds) {
    const numeric = Number(id);
    const note = byId.get(numeric);
    if (!note || used.has(numeric)) continue;
    used.add(numeric);
    reordered.push(note);
  }
  for (const note of bucket.notes) {
    const numeric = Number(note.id);
    if (used.has(numeric)) continue;
    reordered.push(note);
  }

  const normalizedNotes = reordered.map((item, index) => ({ ...item, order_index: index }));
  cache[key] = { ...bucket, notes: normalizedNotes };
  writeRealBoardCache(cache);
  return normalizedNotes;
}

function readRealEvidenceUiCache() {
  const cache = readObjectCache(REAL_EVIDENCE_UI_CACHE_KEY);
  return {
    verified_by_id:
      cache.verified_by_id && typeof cache.verified_by_id === "object" ? cache.verified_by_id : {},
    attachments_by_evidence_id:
      cache.attachments_by_evidence_id && typeof cache.attachments_by_evidence_id === "object"
        ? cache.attachments_by_evidence_id
        : {},
  };
}

function writeRealEvidenceUiCache(cache) {
  writeObjectCache(REAL_EVIDENCE_UI_CACHE_KEY, cache);
}

function localVerifyEvidence(evidenceId) {
  const id = Number(evidenceId);
  if (!id) {
    throw new Error("Valid evidence id is required.");
  }
  const cache = readRealEvidenceUiCache();
  cache.verified_by_id[String(id)] = {
    status: "verified",
    verified_at: new Date().toISOString(),
  };
  writeRealEvidenceUiCache(cache);
  return {
    id,
    status: "verified",
    verified_at: cache.verified_by_id[String(id)].verified_at,
    mocked: false,
    local_only: true,
  };
}

function localCreateEvidenceAttachment(payload = {}) {
  const evidenceId = Number(payload?.evidence);
  if (!evidenceId) {
    throw new Error("evidence: Valid evidence id is required.");
  }
  const cache = readRealEvidenceUiCache();
  const key = String(evidenceId);
  const current = Array.isArray(cache.attachments_by_evidence_id[key]) ? cache.attachments_by_evidence_id[key] : [];
  const created = {
    id: nextLocalId(current),
    evidence: evidenceId,
    file_url: resolvePublicAssetUrl(payload?.file_url),
    file_path: String(payload?.file_path || "").trim(),
    mime_type: String(payload?.mime_type || payload?.file?.type || "").trim(),
    original_name:
      String(payload?.original_name || payload?.file?.name || "").trim() || `attachment-${nextLocalId(current)}`,
  };
  cache.attachments_by_evidence_id[key] = [...current, created];
  writeRealEvidenceUiCache(cache);
  return created;
}

function applyLocalEvidenceUiOverlay(rows = []) {
  const cache = readRealEvidenceUiCache();
  return (Array.isArray(rows) ? rows : []).map((item) => {
    const id = Number(item?.id);
    const localVerify = cache.verified_by_id[String(id)] || null;
    const localAttachments = Array.isArray(cache.attachments_by_evidence_id[String(id)])
      ? cache.attachments_by_evidence_id[String(id)]
      : [];
    const existing = Array.isArray(item?.attachments) ? item.attachments : [];
    const seenKeys = new Set();
    const mergedAttachments = [...existing, ...localAttachments].filter((entry) => {
      const key = JSON.stringify([
        Number(entry?.id) || 0,
        String(entry?.file_url || ""),
        String(entry?.file_path || ""),
        String(entry?.original_name || ""),
      ]);
      if (seenKeys.has(key)) return false;
      seenKeys.add(key);
      return true;
    });
    return {
      ...item,
      status: localVerify?.status || item?.status,
      attachments: mergedAttachments,
    };
  });
}

function readRealInvestigationActionsCache() {
  const cache = readObjectCache(REAL_INVESTIGATION_ACTIONS_CACHE_KEY);
  return cache && typeof cache === "object" ? cache : {};
}

function writeRealInvestigationActionsCache(cache) {
  writeObjectCache(REAL_INVESTIGATION_ACTIONS_CACHE_KEY, cache);
}

function localListInvestigationActions(caseId) {
  const cache = readRealInvestigationActionsCache();
  const rows = Array.isArray(cache[String(Number(caseId) || caseId)]) ? cache[String(Number(caseId) || caseId)] : [];
  return [...rows].sort((a, b) => String(a?.created_at || "").localeCompare(String(b?.created_at || "")));
}

function localCreateInvestigationAction(payload = {}) {
  const caseId = Number(payload?.case);
  if (!caseId) {
    throw new Error("case: Valid case id is required.");
  }
  const cache = readRealInvestigationActionsCache();
  const key = String(caseId);
  const current = Array.isArray(cache[key]) ? cache[key] : [];
  const created = {
    id: nextLocalId(current),
    case: caseId,
    action_type: String(payload?.action_type || "").trim(),
    payload:
      payload?.payload && typeof payload.payload === "object" && !Array.isArray(payload.payload)
        ? payload.payload
        : {},
    created_at: new Date().toISOString(),
    source: "real_local",
  };
  cache[key] = [...current, created];
  writeRealInvestigationActionsCache(cache);
  return created;
}

function localDeleteInvestigationActionsForSuspect(caseId, suspectId) {
  const numericCaseId = Number(caseId);
  const numericSuspectId = Number(suspectId);
  if (!numericCaseId) {
    throw new Error("case: Valid case id is required.");
  }
  if (!numericSuspectId) {
    throw new Error("suspect: Valid suspect id is required.");
  }
  const cache = readRealInvestigationActionsCache();
  const key = String(numericCaseId);
  const current = Array.isArray(cache[key]) ? cache[key] : [];
  const next = current.filter((item) => Number(item?.payload?.suspect_id) !== numericSuspectId);
  const deletedCount = current.length - next.length;
  cache[key] = next;
  writeRealInvestigationActionsCache(cache);
  return { deleted: true, deleted_count: deletedCount, case: numericCaseId, suspect_id: numericSuspectId, local_only: true };
}

function localClearInvestigationActionsForCase(caseId) {
  const numericCaseId = Number(caseId);
  if (!numericCaseId) {
    throw new Error("case: Valid case id is required.");
  }
  const cache = readRealInvestigationActionsCache();
  const key = String(numericCaseId);
  const deletedCount = Array.isArray(cache[key]) ? cache[key].length : 0;
  cache[key] = [];
  writeRealInvestigationActionsCache(cache);
  return { deleted: true, deleted_count: deletedCount, case: numericCaseId, local_only: true };
}

function localDeleteJudgeVerdictActionsForCase(caseId) {
  const numericCaseId = Number(caseId);
  if (!numericCaseId) {
    throw new Error("case: Valid case id is required.");
  }
  const cache = readRealInvestigationActionsCache();
  const key = String(numericCaseId);
  const current = Array.isArray(cache[key]) ? cache[key] : [];
  const next = current.filter((item) => {
    const actionType = String(item?.action_type || "")
      .trim()
      .toLowerCase();
    return !(actionType === "judge_final_verdict" || actionType === "judge_verdict");
  });
  const deletedCount = current.length - next.length;
  cache[key] = next;
  writeRealInvestigationActionsCache(cache);
  return { deleted: true, deleted_count: deletedCount, case: numericCaseId, local_only: true };
}

function readRealWorkflowCache() {
  const cache = readObjectCache(REAL_WORKFLOW_CACHE_KEY);
  return cache && typeof cache === "object" ? cache : {};
}

function writeRealWorkflowCache(cache) {
  writeObjectCache(REAL_WORKFLOW_CACHE_KEY, cache);
}

function getCachedWorkflow(caseId) {
  const cache = readRealWorkflowCache();
  const row = cache[String(Number(caseId) || caseId)];
  return row && typeof row === "object" ? row : null;
}

function cacheWorkflow(caseId, workflow) {
  if (!workflow || typeof workflow !== "object") return;
  const cache = readRealWorkflowCache();
  cache[String(Number(caseId) || caseId)] = workflow;
  writeRealWorkflowCache(cache);
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
    officer_id: normalizeOptionalId(
      source.officer_id ?? source.assigned_officer_id ?? source.assigned_police_officer ?? fallback.officer_id,
    ),
    supervisor_id: normalizeOptionalId(
      source.supervisor_id ??
        source.assigned_supervisor ??
        source.higher_rank_id ??
        source.assigned_supervisor_id ??
        fallback.supervisor_id,
    ),
    intern_id: normalizeOptionalId(
      source.intern_id ??
        source.cadet_id ??
        source.assigned_cadet ??
        source.assigned_intern ??
        source.assigned_cadet_id ??
        fallback.intern_id,
    ),
    sergeant_id: normalizeOptionalId(
      source.sergeant_id ??
        source.assigned_sergeant ??
        source.assigned_sergeant_id ??
        fallback.sergeant_id ??
        fallback.supervisor_id,
    ),
    captain_id: normalizeOptionalId(
      source.captain_id ??
        source.assigned_captain ??
        source.assigned_captain_id ??
        fallback.captain_id,
    ),
    chief_id: normalizeOptionalId(
      source.chief_id ??
        source.assigned_chief ??
        source.assigned_police_chief ??
        source.assigned_chief_id ??
        fallback.chief_id,
    ),
    detective_id: detectiveId,
    coroner_id: normalizeOptionalId(
      source.coroner_id ??
        source.assigned_coroner ??
        source.assigned_forensic ??
        source.assigned_coroner_id ??
        source.assigned_forensic_id ??
        fallback.coroner_id,
    ),
    judge_id: normalizeOptionalId(source.judge_id ?? source.assigned_judge ?? source.assigned_judge_id ?? fallback.judge_id),
    complainant_ids: complaintIds.map((value) => Number(value)).filter((value) => value > 0),
    created_at: createdAt,
    updated_at: updatedAt,
  };
}

function normalizeTipAttachmentEntity(item = {}, fallbackIndex = 0) {
  const source = item && typeof item === "object" ? item : {};
  return {
    ...source,
    id: Number(source.id ?? fallbackIndex) || fallbackIndex,
    file_url: resolvePublicAssetUrl(source.file_url || source.url || ""),
    mime_type: String(source.mime_type || "").trim(),
    original_name: String(source.original_name || source.name || "").trim(),
    created_at: source.created_at || null,
  };
}

function normalizeTipEntity(item = {}) {
  const source = item && typeof item === "object" ? item : {};
  const attachments = Array.isArray(source.attachments)
    ? source.attachments.map((att, index) => normalizeTipAttachmentEntity(att, index + 1))
    : [];
  return {
    ...source,
    id: Number(source.id ?? 0) || null,
    attachments,
  };
}

async function realCreateTipAttachment(token, tipId, payload = {}) {
  const body = new FormData();
  if (payload?.file) body.append("file", payload.file);
  if (payload?.file_url) body.append("file_url", String(payload.file_url || "").trim());
  if (payload?.mime_type) body.append("mime_type", String(payload.mime_type || "").trim());
  if (payload?.original_name) body.append("original_name", String(payload.original_name || "").trim());
  return normalizeTipAttachmentEntity(
    await request(`/financials/tips/${tipId}/attachments/`, { method: "POST", body }, token),
  );
}

function normalizeSuspectEntity(item = {}) {
  const source = item && typeof item === "object" ? item : {};
  const suspectUserId = normalizeOptionalId(source.suspect_user_id ?? source.suspect ?? source.user_id);
  const suspectId = Number(source.id ?? 0) || null;
  const nationalId = String(
    source.national_id ??
      source.suspect_national_id ??
      source.suspect_user?.national_id ??
      "",
  ).trim();
  const name = String(
    source.name ??
      source.suspect_name ??
      source.display_name ??
      source.suspect_user?.full_name ??
      source.suspect_user?.username ??
      "",
  ).trim();
  const caseLevelRaw = source.case_level ?? source.case?.crime_level ?? source.case?.level ?? source.crime_level;

  return {
    ...source,
    id: suspectId,
    case: Number(source.case ?? source.case_id ?? 0) || null,
    case_id: Number(source.case_id ?? source.case ?? 0) || null,
    suspect_user_id: suspectUserId,
    suspect: suspectUserId ?? source.suspect ?? null,
    name,
    suspect_name: name,
    national_id: nationalId,
    suspect_national_id: nationalId,
    status: String(source.status || source.arrest_status || "").trim() || "under_pursuit",
    arrest_status: String(source.arrest_status || source.status || "").trim(),
    judicial_outcome: String(source.judicial_outcome || "").trim() || "pending",
    judicial_decided_at: source.judicial_decided_at || null,
    bail_amount:
      source.bail_amount === null || source.bail_amount === undefined || source.bail_amount === ""
        ? null
        : Number(source.bail_amount),
    bail_notes: String(source.bail_notes || "").trim(),
    bail_set_at: source.bail_set_at || null,
    bail_set_by: normalizeOptionalId(source.bail_set_by),
    bail_paid_at: source.bail_paid_at || null,
    released_on_bail: Boolean(source.released_on_bail),
    bail_eligibility:
      source.bail_eligibility && typeof source.bail_eligibility === "object"
        ? {
            ...source.bail_eligibility,
            eligible: Boolean(source.bail_eligibility.eligible),
            reasons: Array.isArray(source.bail_eligibility.reasons) ? source.bail_eligibility.reasons : [],
          }
        : null,
    can_pay: Boolean(source.can_pay),
    case_person_type:
      String(source.case_person_type || "").trim() ||
      (String(source.judicial_outcome || "").trim().toLowerCase() === "convicted" ? "convict" : "suspect"),
    detective_guilt_score:
      source.detective_guilt_score === null || source.detective_guilt_score === undefined
        ? null
        : Number(source.detective_guilt_score),
    sergeant_guilt_score:
      source.sergeant_guilt_score === null || source.sergeant_guilt_score === undefined
        ? null
        : Number(source.sergeant_guilt_score),
    identified_at: source.identified_at || source.tracking_started_at || source.created_at || null,
    tracking_started_at: source.tracking_started_at || source.identified_at || source.created_at || null,
    case_title: String(source.case_title || "").trim(),
    case_status: String(source.case_status || "").trim(),
    case_level: mapCrimeLevelToLevel(caseLevelRaw),
    level: mapCrimeLevelToLevel(caseLevelRaw),
    photo_url: resolvePublicAssetUrl(source.photo_url),
    last_known_location: String(source.last_known_location || "").trim(),
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
    const sergeantId = normalizeOptionalId(item?.sergeant_id ?? supervisorId);
    const captainId = normalizeOptionalId(item?.captain_id);
    const chiefId = normalizeOptionalId(item?.chief_id);
    const detectiveId = normalizeOptionalId(item?.detective_id ?? item?.assigned_to);
    const coronerId = normalizeOptionalId(item?.coroner_id);
    const judgeId = normalizeOptionalId(item?.judge_id);

    if (normalizedQueueType === ADMIN_QUEUE_TYPES.INTERN_UNASSIGNED) {
      return !internId;
    }
    if (normalizedQueueType === ADMIN_QUEUE_TYPES.OFFICER_UNASSIGNED) {
      return !officerId;
    }
    if (
      normalizedQueueType === ADMIN_QUEUE_TYPES.COMMAND_CHAIN_UNASSIGNED ||
      normalizedQueueType === ADMIN_QUEUE_TYPES.POLICE_WITHOUT_SUPERVISOR
    ) {
      return !sergeantId || !captainId || !chiefId;
    }
    if (normalizedQueueType === "sergeant_unassigned") {
      return !sergeantId;
    }
    if (normalizedQueueType === "captain_unassigned") {
      return !captainId;
    }
    if (normalizedQueueType === "chief_unassigned") {
      return !chiefId;
    }
    if (normalizedQueueType === ADMIN_QUEUE_TYPES.SPECIALISTS_UNASSIGNED) {
      return !detectiveId || !judgeId || !coronerId;
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
  const isFormDataBody =
    typeof FormData !== "undefined" && options?.body instanceof FormData;
  const mergedHeaders = {
    ...(authorization ? { Authorization: authorization } : {}),
    ...(options.headers || {}),
  };
  if (!isFormDataBody && !("Content-Type" in mergedHeaders)) {
    mergedHeaders["Content-Type"] = "application/json";
  }
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: mergedHeaders,
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
      file_url: resolvePublicAssetUrl(item?.file_url),
      file_path: String(item?.file_path || "").trim(),
      mime_type: String(item?.mime_type || "").trim(),
      original_name: String(item?.original_name || "").trim(),
      file: item?.file || null,
    }))
    .filter(
      (item) =>
        item.file_url ||
        item.file_path ||
        item.file,
    );
}

function normalizeEvidenceEntity(item) {
  const source = item && typeof item === "object" ? item : {};
  let type = normalizeEvidenceType(source.type || source.evidence_type || source.kind);
  if (!type) {
    if (Object.prototype.hasOwnProperty.call(source, "witness")) type = EVIDENCE_TYPES.TESTIMONY;
    else if (Object.prototype.hasOwnProperty.call(source, "review_status") || Array.isArray(source.images)) type = EVIDENCE_TYPES.BIO_MEDICAL;
    else if (Object.prototype.hasOwnProperty.call(source, "model_name")) type = EVIDENCE_TYPES.VEHICLE;
    else if (Object.prototype.hasOwnProperty.call(source, "owner_name")) type = EVIDENCE_TYPES.IDENTITY;
    else if (Object.prototype.hasOwnProperty.call(source, "additional_notes")) type = EVIDENCE_TYPES.OTHER;
  }

  const attachments = compactEvidenceAttachments([
    ...(Array.isArray(source.attachments) ? source.attachments : []),
    ...(Array.isArray(source.files) ? source.files : []),
    ...(Array.isArray(source.media) ? source.media : []),
    ...(Array.isArray(source.images)
      ? source.images.map((img) => ({
          file_url:
            typeof img?.image === "string"
              ? img.image
              : typeof img === "string"
                ? img
                : "",
          original_name: `biological-image-${img?.id || ""}`.trim(),
        }))
      : []),
    ...(source.media_file ? [{ file_url: source.media_file, original_name: "testimony-media" }] : []),
  ]);

  const metadata = (() => {
    if (source.metadata && typeof source.metadata === "object" && !Array.isArray(source.metadata)) {
      return source.metadata;
    }
    if (type === EVIDENCE_TYPES.TESTIMONY) {
      return {
        transcript: String(source.transcript || "").trim(),
        witness: source.witness ?? null,
      };
    }
    if (type === EVIDENCE_TYPES.BIO_MEDICAL) {
      return {
        doctor_notes: String(source.doctor_notes || "").trim(),
        identity_db_notes: String(source.identity_db_notes || "").trim(),
        review_status: String(source.review_status || "pending").trim(),
      };
    }
    if (type === EVIDENCE_TYPES.VEHICLE) {
      return {
        model: String(source.model_name || "").trim(),
        color: String(source.color || "").trim(),
        plate: String(source.license_plate || "").trim(),
        serial_number: String(source.serial_number || "").trim(),
      };
    }
    if (type === EVIDENCE_TYPES.IDENTITY) {
      return {
        owner_full_name: String(source.owner_name || "").trim(),
        details:
          source.document_details && typeof source.document_details === "object" && !Array.isArray(source.document_details)
            ? source.document_details
            : {},
      };
    }
    if (type === EVIDENCE_TYPES.OTHER) {
      return source.additional_notes && typeof source.additional_notes === "object" && !Array.isArray(source.additional_notes)
        ? source.additional_notes
        : {};
    }
    return {};
  })();

  const normalizedStatus = (() => {
    if (type === EVIDENCE_TYPES.BIO_MEDICAL) {
      const reviewStatus = String(source.review_status || metadata.review_status || "").trim().toLowerCase();
      if (reviewStatus === "confirmed") return "verified";
      if (reviewStatus === "rejected") return "forensic_rejected";
      return "pending_forensic";
    }
    return String(source.status || source.review_status || "pending").trim();
  })();

  return {
    ...source,
    id: Number(source.id),
    case: Number(source.case ?? source.case_id),
    type,
    metadata,
    attachments,
    title: String(source.title || "").trim(),
    description: String(source.description || "").trim(),
    status: normalizedStatus,
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

function evidenceListPathByType(type) {
  if (type === EVIDENCE_TYPES.TESTIMONY) return "/evidence/testimony/";
  if (type === EVIDENCE_TYPES.BIO_MEDICAL) return "/evidence/biological/";
  if (type === EVIDENCE_TYPES.VEHICLE) return "/evidence/vehicle/";
  if (type === EVIDENCE_TYPES.IDENTITY) return "/evidence/identification-document/";
  if (type === EVIDENCE_TYPES.OTHER) return "/evidence/other/";
  throw new Error(`Unsupported evidence type: ${type}`);
}

function evidenceDetailPath(type, evidenceId) {
  return `${evidenceListPathByType(type)}${Number(evidenceId)}/`;
}

function buildRealEvidenceCreateRequest(payload = {}) {
  const type = normalizeEvidenceType(payload.type);
  const metadata = normalizeEvidenceMetadata(payload);
  const path = evidenceListPathByType(type);
  const caseId = Number(payload.case);
  if (!caseId) {
    throw new Error("Case id is required.");
  }

  if (type === EVIDENCE_TYPES.TESTIMONY) {
    const body = new FormData();
    body.append("case", String(caseId));
    body.append("title", String(payload.title || ""));
    body.append("description", String(payload.description || ""));
    if (metadata.transcript) body.append("transcript", String(metadata.transcript));
    const witnessId = Number(metadata.witness || payload.witness);
    if (witnessId > 0) {
      body.append("witness", String(witnessId));
    } else {
      throw new Error("Testimony evidence requires witness user id from backend data.");
    }
    const firstAttachment = compactEvidenceAttachments(payload.attachments || [])[0];
    if (firstAttachment?.file) {
      body.append("media_file", firstAttachment.file);
    }
    return { path, options: { method: "POST", body } };
  }

  if (type === EVIDENCE_TYPES.BIO_MEDICAL) {
    const body = new FormData();
    body.append("case", String(caseId));
    body.append("title", String(payload.title || ""));
    body.append("description", String(payload.description || ""));
    const attachments = compactEvidenceAttachments(payload.attachments || []);
    attachments.forEach((attachment) => {
      if (attachment.file) {
        body.append("uploaded_images", attachment.file);
      }
    });
    return { path, options: { method: "POST", body } };
  }

  if (type === EVIDENCE_TYPES.VEHICLE) {
    return {
      path,
      options: {
        method: "POST",
        body: JSON.stringify({
          case: caseId,
          title: String(payload.title || ""),
          description: String(payload.description || ""),
          model_name: metadata.model,
          color: metadata.color,
          ...(metadata.plate ? { license_plate: metadata.plate } : {}),
          ...(metadata.serial_number ? { serial_number: metadata.serial_number } : {}),
        }),
      },
    };
  }

  if (type === EVIDENCE_TYPES.IDENTITY) {
    return {
      path,
      options: {
        method: "POST",
        body: JSON.stringify({
          case: caseId,
          title: String(payload.title || ""),
          description: String(payload.description || ""),
          owner_name: metadata.owner_full_name,
          document_details:
            metadata.details && typeof metadata.details === "object" && !Array.isArray(metadata.details)
              ? metadata.details
              : {},
        }),
      },
    };
  }

  return {
    path,
    options: {
      method: "POST",
      body: JSON.stringify({
        case: caseId,
        title: String(payload.title || ""),
        description: String(payload.description || ""),
        additional_notes:
          payload.metadata && typeof payload.metadata === "object" && !Array.isArray(payload.metadata)
            ? payload.metadata
            : {},
      }),
    },
  };
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
  const detailPaths = [`/cases/${id}/`, `/investigations/cases/${id}/`];
  try {
    const data = await requestFirstAvailable(detailPaths, {}, token, [403, 404, 405]);
    return normalizeCaseEntity(data);
  } catch (error) {
    if (![403, 404, 405].includes(Number(error?.status))) {
      throw error;
    }
  }

  let allCases = [];
  try {
    allCases = await realListMyCases(token);
  } catch {
    allCases = [];
  }
  if (!allCases.length) {
    allCases = await realListCases(token);
  }
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
  const backendQueueType =
    type === ADMIN_QUEUE_TYPES.COMMAND_CHAIN_UNASSIGNED ? ADMIN_QUEUE_TYPES.POLICE_WITHOUT_SUPERVISOR : type;

  try {
    const data = await request(`/custom-admin/admin/case-queues/${backendQueueType}/`, {}, token);
    return normalizeCaseCollection(data);
  } catch (error) {
    // Backend queue endpoint currently appears inconsistent with model field names for some installs.
    // Fallback to client-derived filtering so admin UI still works as long as /cases/ is available.
    if (![404, 500].includes(Number(error?.status))) {
      throw error;
    }
    const cases = await realListCases(token);
    return filterAdminQueueCases(cases, type, new Map());
  }
}

async function realAssignCasePersonnel(token, caseId, payload = {}) {
  const id = Number(caseId);
  if (!id) {
    throw new Error("Valid case id is required.");
  }
  const normalizedPayload = { ...payload };
  if (!Object.prototype.hasOwnProperty.call(normalizedPayload, "supervisor_id")) {
    if (Object.prototype.hasOwnProperty.call(normalizedPayload, "sergeant_id")) {
      normalizedPayload.supervisor_id = normalizedPayload.sergeant_id;
    }
  }
  const data = await request(
    `/custom-admin/admin/case-assignments/${id}/`,
    { method: "PATCH", body: JSON.stringify(normalizedPayload) },
    token,
  );
  return normalizeCaseEntity(data, { id, ...payload });
}

async function realDeleteAdminCase(token, caseId) {
  const id = Number(caseId);
  if (!id) {
    throw new Error("Valid case id is required.");
  }
  return request(`/custom-admin/admin/cases/${id}/`, { method: "DELETE" }, token);
}

async function realCreateEvidence(token, payload = {}) {
  const { path, options } = buildRealEvidenceCreateRequest(payload);
  const created = await request(path, options, token);
  return normalizeEvidenceEntity(created);
}

async function realCreateEvidenceAttachment(token, payload = {}) {
  const evidenceId = Number(payload?.evidence);
  const evidenceType = normalizeEvidenceType(payload?.type || payload?.evidence_type);
  if (!evidenceId) {
    throw new Error("Valid evidence id is required.");
  }
  if (!evidenceType) {
    throw new Error("Valid evidence type is required for attachment upload.");
  }

  const file = payload?.file || null;
  const hasBinaryFile = typeof File !== "undefined" && file instanceof File;
  if (hasBinaryFile) {
    const body = new FormData();
    body.append("evidence_type", evidenceType);
    body.append("evidence_id", String(evidenceId));
    body.append("file", file);
    if (payload?.file_url) body.append("file_url", String(payload.file_url));
    if (payload?.file_path) body.append("file_path", String(payload.file_path));
    if (payload?.mime_type) body.append("mime_type", String(payload.mime_type));
    if (payload?.original_name) body.append("original_name", String(payload.original_name));
    const created = await request("/evidence/attachments/", { method: "POST", body }, token);
    return {
      ...created,
      file_url: resolvePublicAssetUrl(created?.file_url),
    };
  }

  const created = await request(
    "/evidence/attachments/",
    {
      method: "POST",
      body: JSON.stringify({
        evidence_type: evidenceType,
        evidence_id: evidenceId,
        file_url: String(payload?.file_url || "").trim(),
        file_path: String(payload?.file_path || "").trim(),
        mime_type: String(payload?.mime_type || "").trim(),
        original_name: String(payload?.original_name || "").trim(),
      }),
    },
    token,
  );
  return {
    ...created,
    file_url: resolvePublicAssetUrl(created?.file_url),
  };
}

async function realListEvidenceByType(token, type, options = {}) {
  const query = new URLSearchParams();
  const caseId = Number(options?.caseId);
  if (caseId > 0) {
    query.set("case", String(caseId));
  }
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const data = await request(`${evidenceListPathByType(type)}${suffix}`, {}, token);
  return normalizeListResponse(data).map((item) => normalizeEvidenceEntity({ ...item, type }));
}

async function realListEvidence(token, caseId, options = {}) {
  const numericCaseId = Number(caseId);
  const requestedTypes = Array.isArray(options?.types) && options.types.length
    ? options.types.map((type) => normalizeEvidenceType(type)).filter(Boolean)
    : [
        EVIDENCE_TYPES.TESTIMONY,
        EVIDENCE_TYPES.BIO_MEDICAL,
        EVIDENCE_TYPES.VEHICLE,
        EVIDENCE_TYPES.IDENTITY,
        EVIDENCE_TYPES.OTHER,
      ];
  const uniqueTypes = [...new Set(requestedTypes)];
  const allRows = (
    await Promise.all([
      ...uniqueTypes.map((type) => realListEvidenceByType(token, type, { caseId: numericCaseId })),
    ])
  ).flat();

  return applyLocalEvidenceUiOverlay(
    allRows
    .filter((item) => Number(item.case) === numericCaseId)
    .sort((a, b) => String(b.registered_at || b.created_at || "").localeCompare(String(a.registered_at || a.created_at || ""))),
  );
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
        request(
          "/cases/complainants/",
          { method: "POST", body: JSON.stringify({ case: Number(caseId) }) },
          token,
        ),
      mock: () => mockJoinCaseAsComplainant(token, caseId),
      fallback: false,
    }),
  joinCaseAsWitness: (token, caseId) =>
    callEndpoint("joinCaseAsWitness", {
      real: () =>
        request(
          "/cases/witnesses/join/",
          { method: "POST", body: JSON.stringify({ case: Number(caseId) }) },
          token,
        ),
      mock: () => unsupportedApi("joinCaseAsWitness", ["/cases/witnesses/join/"]),
      fallback: false,
    }),
  listWitnessCandidates: (token, params = {}) =>
    callEndpoint("listWitnessCandidates", {
      real: async () => {
        const query = new URLSearchParams();
        if (params?.q) query.set("q", String(params.q).trim());
        const suffix = query.toString() ? `?${query.toString()}` : "";
        return normalizeListResponse(await request(`/cases/witness-candidates/${suffix}`, {}, token));
      },
      mock: () => unsupportedApi("listWitnessCandidates", ["/cases/witness-candidates/"]),
      fallback: false,
    }),
  listSuspectCandidates: (token, params = {}) =>
    callEndpoint("listSuspectCandidates", {
      real: async () => {
        const query = new URLSearchParams();
        if (params?.q) query.set("q", String(params.q).trim());
        if (Number(params?.caseId) > 0) query.set("case", String(Number(params.caseId)));
        const suffix = query.toString() ? `?${query.toString()}` : "";
        return normalizeListResponse(await request(`/investigations/suspect-candidates/${suffix}`, {}, token));
      },
      mock: async () => {
        const users = normalizeListResponse(await mockListUsers(token));
        const q = String(params?.q || "").trim().toLowerCase();
        const caseId = Number(params?.caseId);
        const linked = Number.isFinite(caseId) && caseId > 0
          ? new Set((await mockListSuspects(token, caseId)).map((row) => Number(row?.suspect || row?.suspect_user_id)).filter(Boolean))
          : new Set();
        return users.filter((user) => {
          const roles = Array.isArray(user?.roles) ? user.roles : Array.isArray(user?.groups) ? user.groups : [];
          const isSuspect = roles.some((role) => String(role || "").toLowerCase() === "suspect");
          if (!isSuspect) return false;
          if (linked.has(Number(user?.id))) return false;
          if (!q) return true;
          const haystack = [
            user?.username,
            user?.first_name,
            user?.last_name,
            user?.national_id,
          ].map((v) => String(v || "").toLowerCase()).join(" ");
          return haystack.includes(q);
        });
      },
      fallback: false,
    }),
  addCaseWitness: (token, caseId, witnessUserId) =>
    callEndpoint("addCaseWitness", {
      real: () =>
        request(
          "/cases/witnesses/",
          {
            method: "POST",
            body: JSON.stringify({
              case: Number(caseId),
              user_id: Number(witnessUserId),
            }),
          },
          token,
        ),
      mock: () => unsupportedApi("addCaseWitness", ["/cases/witnesses/"]),
      fallback: false,
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
      real: async () =>
        normalizeCaseEntity(
          await (async () => {
            const body = {};
            if (Object.prototype.hasOwnProperty.call(payload || {}, "title")) body.title = payload?.title;
            if (Object.prototype.hasOwnProperty.call(payload || {}, "description")) body.description = payload?.description;
            if (Object.prototype.hasOwnProperty.call(payload || {}, "level")) body.level = payload?.level;
            if (Object.prototype.hasOwnProperty.call(payload || {}, "status")) body.status = payload?.status;
            if (Object.prototype.hasOwnProperty.call(payload || {}, "judicial_outcome")) {
              body.judicial_outcome = payload?.judicial_outcome;
            }
            return request(
              `/cases/${id}/`,
              {
                method: "PATCH",
                body: JSON.stringify(body),
              },
              token,
            );
          })(),
        ),
      mock: () => mockUpdateCasePartial(token, id, payload),
      fallback: false,
    }),
  resetJudgeVerdict: (token, caseId) =>
    callEndpoint("resetJudgeVerdict", {
      real: async () => {
        const id = Number(caseId);
        if (!id) {
          throw new Error("Valid case id is required.");
        }
        const reopened = normalizeCaseEntity(
          await request(`/cases/${id}/judge-verdict-reset/`, { method: "POST" }, token),
        );
        const localCleanup = localDeleteJudgeVerdictActionsForCase(id);
        return { case: reopened, local_cleanup: localCleanup };
      },
      mock: () => unsupportedApi("resetJudgeVerdict", ["/cases/<id>/judge-verdict-reset/"]),
      fallback: false,
    }),

  listEvidence: (token, caseId, options = {}) =>
    callEndpoint("listEvidence", {
      real: () => realListEvidence(token, caseId, options),
      mock: () => mockListEvidence(token, caseId),
      fallback: false,
    }),
  createEvidence: (token, payload) => {
    validateEvidencePayload(payload);
    return callEndpoint("createEvidence", {
      real: () => realCreateEvidence(token, payload),
      mock: () => mockCreateEvidence(token, payload),
      fallback: false,
    });
  },
  verifyEvidence: (token, evidenceId) =>
    callEndpoint("verifyEvidence", {
      real: () => localVerifyEvidence(evidenceId),
      mock: () => mockVerifyEvidence(token, evidenceId),
      fallback: false,
    }),

  createEvidenceAttachment: (token, payload) =>
    callEndpoint("createEvidenceAttachment", {
      real: () => realCreateEvidenceAttachment(token, payload),
      mock: () => mockCreateEvidenceAttachment(token, payload),
      fallback: false,
    }),

  listSuspects: (token, caseId) =>
    callEndpoint("listSuspects", {
      real: async () =>
        normalizeListResponse(
          await request(`/investigations/suspects/?case=${encodeURIComponent(caseId)}`, {}, token),
        ).map((item) => normalizeSuspectEntity(item)),
      mock: () => mockListSuspects(token, caseId),
      fallback: false,
    }),
  listIntenseTrackingSuspects: (token) =>
    callEndpoint("listIntenseTrackingSuspects", {
      real: async () => normalizeListResponse(await request("/investigations/suspects/intense-tracking/", {}, token)),
      mock: () => mockListIntenseTrackingSuspects(token),
      fallback: false,
    }),
  listSergeantBailCandidates: (token, params = {}) =>
    callEndpoint("listSergeantBailCandidates", {
      real: async () => {
        const query = new URLSearchParams();
        if (Number(params?.caseId) > 0) query.set("case", String(Number(params.caseId)));
        return normalizeListResponse(
          await request(`/investigations/bail/sergeant-candidates/${query.toString() ? `?${query.toString()}` : ""}`, {}, token),
        ).map((item) => normalizeSuspectEntity(item));
      },
      mock: () => unsupportedApi("listSergeantBailCandidates", ["/investigations/bail/sergeant-candidates/"]),
      fallback: false,
    }),
  offerSuspectBail: (token, suspectRowId, payload = {}) =>
    callEndpoint("offerSuspectBail", {
      real: async () =>
        normalizeSuspectEntity(
          await request(
            `/investigations/suspects/${encodeURIComponent(suspectRowId)}/bail-offer/`,
            {
              method: "POST",
              body: JSON.stringify({
                amount: payload?.amount,
                note: payload?.note || "",
              }),
            },
            token,
          ),
        ),
      mock: () => unsupportedApi("offerSuspectBail", ["/investigations/suspects/<id>/bail-offer/"]),
      fallback: false,
    }),
  listMyBailOffers: (token) =>
    callEndpoint("listMyBailOffers", {
      real: async () =>
        normalizeListResponse(await request("/investigations/bail/my/", {}, token)).map((item) => normalizeSuspectEntity(item)),
      mock: () => unsupportedApi("listMyBailOffers", ["/investigations/bail/my/"]),
      fallback: false,
    }),
  paySuspectBail: (token, suspectRowId) =>
    callEndpoint("paySuspectBail", {
      real: async () =>
        normalizeSuspectEntity(
          await request(
            `/investigations/suspects/${encodeURIComponent(suspectRowId)}/bail-pay/`,
            { method: "POST" },
            token,
          ),
        ),
      mock: () => unsupportedApi("paySuspectBail", ["/investigations/suspects/<id>/bail-pay/"]),
      fallback: false,
    }),
  createSuspect: (token, payload) =>
    callEndpoint("createSuspect", {
      real: () => request("/investigations/suspects/", { method: "POST", body: JSON.stringify(payload) }, token),
      mock: () => mockCreateSuspect(token, payload),
      fallback: false,
    }),
  deleteSuspect: (token, suspectId) =>
    callEndpoint("deleteSuspect", {
      real: () => request(`/investigations/suspects/${encodeURIComponent(suspectId)}/`, { method: "DELETE" }, token),
      mock: () => unsupportedApi("deleteSuspect", ["/investigations/suspects/<id>/"]),
      fallback: false,
    }),
  updateSuspect: (token, suspectId, payload) =>
    callEndpoint("updateSuspect", {
      real: async () =>
        normalizeSuspectEntity(
          await request(
            `/investigations/suspects/${encodeURIComponent(suspectId)}/`,
            { method: "PATCH", body: JSON.stringify(payload) },
            token,
          ),
        ),
      mock: () => unsupportedApi("updateSuspect", ["/investigations/suspects/<id>/"]),
      fallback: false,
    }),
  deleteNote: (token, noteId) =>
    callEndpoint("deleteNote", {
      real: () => localBoardDeleteNote(noteId),
      mock: () => mockDeleteNote(token, noteId),
      fallback: false,
    }),

  listInvestigationActions: (token, caseId) =>
    callEndpoint("listInvestigationActions", {
      real: () => localListInvestigationActions(caseId),
      mock: () => mockListInvestigationActions(token, caseId),
      fallback: false,
    }),
  createInvestigationAction: (token, payload) =>
    callEndpoint("createInvestigationAction", {
      real: () => localCreateInvestigationAction(payload),
      mock: () => mockCreateInvestigationAction(token, payload),
      fallback: false,
    }),
  clearInvestigationActionsForSuspect: (token, caseId, suspectId) =>
    callEndpoint("clearInvestigationActionsForSuspect", {
      real: () => localDeleteInvestigationActionsForSuspect(caseId, suspectId),
      mock: () => unsupportedApi("clearInvestigationActionsForSuspect", []),
      fallback: false,
    }),
  clearInvestigationActionsForCase: (token, caseId) =>
    callEndpoint("clearInvestigationActionsForCase", {
      real: () => localClearInvestigationActionsForCase(caseId),
      mock: () => unsupportedApi("clearInvestigationActionsForCase", []),
      fallback: false,
    }),
  clearJudgeVerdictActionsForCase: (token, caseId) =>
    callEndpoint("clearJudgeVerdictActionsForCase", {
      real: () => localDeleteJudgeVerdictActionsForCase(caseId),
      mock: () => unsupportedApi("clearJudgeVerdictActionsForCase", []),
      fallback: false,
    }),
  getPublicOverview: () =>
    callEndpoint("getPublicOverview", {
      real: () => request("/cases/public-overview/"),
      mock: () => mockGetPublicOverview(),
      fallback: false,
    }),

  getAdminConsoleData: (token) =>
    callEndpoint("getAdminConsoleData", {
      real: () => request("/custom-admin/console-summary/", {}, token),
      mock: () => mockGetAdminConsoleData(token),
      fallback: false,
    }),

  listAdminCaseQueue: (token, queueType) =>
    callEndpoint("listAdminCaseQueue", {
      real: () => realListAdminCaseQueue(token, queueType),
      mock: () => mockListAdminCaseQueue(token, queueType),
      fallback: false,
    }),

  assignCasePersonnel: (token, caseId, payload) =>
    callEndpoint("assignCasePersonnel", {
      real: () => realAssignCasePersonnel(token, caseId, payload),
      mock: () => mockAssignCasePersonnel(token, caseId, payload),
      fallback: false,
    }),
  deleteAdminCase: (token, caseId) =>
    callEndpoint("deleteAdminCase", {
      real: () => realDeleteAdminCase(token, caseId),
      mock: () => unsupportedApi("deleteAdminCase", ["/custom-admin/admin/cases/<id>/"]),
      fallback: false,
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
      real: async () => {
        const cases = await realListCases(token);
        return {
          open_assigned_cases: (cases || []).filter((item) =>
            ["open", "under_investigation", "awaiting_trial"].includes(String(item.status || "").toLowerCase()),
          ).length,
          urgent_cases: (cases || []).filter((item) => {
            const status = String(item.status || "").toLowerCase();
            return Number(item.level) <= 2 && !["closed", "invalidated"].includes(status);
          }).length,
          pending_evidence: 0,
          unavailable_fields: ["pending_evidence"],
        };
      },
      mock: () => mockGetBoardSummary(token),
      fallback: false,
    }),

  listRoles: (token) =>
    callEndpoint("listRoles", {
      real: async () => normalizeListResponse(await request("/custom-admin/roles/", {}, token)),
      mock: () => mockListRoles(token),
      fallback: false,
    }),
  createRole: (token, payload) =>
    callEndpoint("createRole", {
      real: () => request("/custom-admin/roles/", { method: "POST", body: JSON.stringify(payload) }, token),
      mock: () => mockCreateRole(token, payload),
      fallback: false,
    }),
  deleteRole: (token, roleId) =>
    callEndpoint("deleteRole", {
      real: () => request(`/custom-admin/roles/${roleId}/`, { method: "DELETE" }, token),
      mock: () => mockDeleteRole(token, roleId),
      fallback: false,
    }),
  listUsers: (token) =>
    callEndpoint("listUsers", {
      real: async () => normalizeListResponse(await request("/custom-admin/users/", {}, token)),
      mock: () => mockListUsers(token),
      fallback: false,
    }),
  getAdminUserManagement: (token, userId) =>
    callEndpoint("getAdminUserManagement", {
      real: () => request(`/custom-admin/users/${userId}/`, {}, token),
      mock: () => unsupportedApi("getAdminUserManagement", [`/custom-admin/users/${userId}/`]),
      fallback: false,
    }),
  updateAdminUser: (token, userId, payload) =>
    callEndpoint("updateAdminUser", {
      real: () =>
        request(
          `/custom-admin/users/${userId}/`,
          { method: "PATCH", body: JSON.stringify(payload || {}) },
          token,
        ),
      mock: () => unsupportedApi("updateAdminUser", [`/custom-admin/users/${userId}/`]),
      fallback: false,
    }),
  deleteAdminUser: (token, userId) =>
    callEndpoint("deleteAdminUser", {
      real: () => request(`/custom-admin/users/${userId}/`, { method: "DELETE" }, token),
      mock: () => unsupportedApi("deleteAdminUser", [`/custom-admin/users/${userId}/`]),
      fallback: false,
    }),
  assignRole: (token, userId, role) =>
    callEndpoint("assignRole", {
      real: () =>
        request(
          `/custom-admin/users/${userId}/assign-role/`,
          { method: "POST", body: JSON.stringify({ role }) },
          token,
        ),
      mock: () => mockAssignRole(token, userId, role),
      fallback: false,
    }),

  async transitionCase(token, caseId, payload) {
    return callEndpoint("transitionCase", {
      real: async () => {
        const result = await request(
          `/cases/${caseId}/transition/`,
          { method: "POST", body: JSON.stringify(payload || {}) },
          token,
        );
        cacheWorkflow(caseId, result);
        return result;
      },
      mock: () => ({
        id: Number(caseId),
        mocked: true,
        ...applyMockWorkflow(token, caseId, payload),
      }),
      fallback: false,
    });
  },

  getCaseWorkflow: (token, caseId) =>
    callEndpoint("getCaseWorkflow", {
      real: async () => {
        const result = await request(`/cases/${caseId}/transition/`, {}, token);
        cacheWorkflow(caseId, result);
        return result;
      },
      mock: async () => getMockWorkflow(caseId),
      fallback: false,
    }),

  getMockWorkflowState(caseId) {
    if (!USE_MOCK_API && !USE_MOCK_FALLBACK) {
      return getCachedWorkflow(caseId);
    }
    return getMockWorkflow(caseId);
  },

  getDetectiveBoardLayout: (token, caseId) =>
    callEndpoint("getDetectiveBoardLayout", {
      real: () => request(`/investigations/board-layout/${Number(caseId)}/`, {}, token),
      mock: () => localBoardSnapshot(caseId),
      fallback: false,
    }),

  saveDetectiveBoardLayout: (token, caseId, nodePositions = {}) =>
    callEndpoint("saveDetectiveBoardLayout", {
      real: () =>
        request(
          `/investigations/board-layout/${Number(caseId)}/`,
          { method: "PATCH", body: JSON.stringify({ node_positions: nodePositions || {} }) },
          token,
        ),
      mock: () => localBoardSavePositions(caseId, nodePositions),
      fallback: false,
    }),

  async getDetectiveBoardState(token, caseId) {
    const state = await callEndpoint("getDetectiveBoardState", {
      real: async () => {
        const [evidence, suspects, layout] = await Promise.all([
          this.listEvidence(token, caseId),
          this.listSuspects(token, caseId).catch(() => []),
          this.getDetectiveBoardLayout(token, caseId).catch(() => ({ node_positions: {} })),
        ]);
        const localBoard = localBoardSnapshot(caseId);
        return {
          case_id: Number(caseId),
          evidence: Array.isArray(evidence) ? evidence : [],
          suspects: Array.isArray(suspects) ? suspects : [],
          notes: localBoard.notes,
          relations: localBoard.relations,
          node_positions: layout?.node_positions || {},
          mocked_notes: false,
          mocked_relations: false,
        };
      },
      mock: async () => {
        const evidence = await this.listEvidence(token, caseId);
        const suspects = await this.listSuspects(token, caseId).catch(() => []);

        const boardMock = getMockBoard(caseId);
        return {
          case_id: Number(caseId),
          evidence,
          suspects,
          notes: boardMock.notes,
          relations: boardMock.relations,
          node_positions: localBoardSnapshot(caseId).node_positions || {},
          mocked_relations: true,
          mocked_notes: true,
        };
      },
      fallback: false,
    });
    return normalizeBoardState(state, caseId);
  },

  async createBoardRelation(token, caseId, payload) {
    return callEndpoint("createBoardRelation", {
      real: () => localBoardCreateRelation(caseId, payload),
      mock: () => addMockRelation(caseId, payload),
      fallback: false,
    });
  },

  async deleteBoardRelation(token, caseId, relationId) {
    return callEndpoint("deleteBoardRelation", {
      real: () => localBoardDeleteRelation(caseId, relationId),
      mock: () => deleteMockRelation(caseId, relationId),
      fallback: false,
    });
  },

  async createBoardNote(token, caseId, payload) {
    const created = await callEndpoint("createBoardNote", {
      real: () => localBoardCreateNote(caseId, payload),
      mock: () => ({
        ...addMockNote(caseId, payload),
        mocked: true,
      }),
      fallback: false,
    });
    return created?.mocked ? created : { ...created, mocked: false };
  },

  async reorderBoardNotes(token, caseId, noteIds) {
    const result = await callEndpoint("reorderBoardNotes", {
      real: () => ({ notes: localBoardReorderNotes(caseId, noteIds), mocked: false }),
      mock: () => ({ notes: reorderMockNotes(caseId, noteIds), mocked: true }),
      fallback: false,
    });

    if (Array.isArray(result)) {
      return { notes: result, mocked: false };
    }
    return {
      notes: result?.notes || [],
      mocked: Boolean(result?.mocked),
    };
  },

  async listNotifications(token, options = {}) {
    return callEndpoint("listNotifications", {
      real: async () => {
        const query = new URLSearchParams();
        if (options?.unreadOnly) query.set("unread", "1");
        if (options?.limit) query.set("limit", String(options.limit));
        const suffix = query.toString() ? `?${query.toString()}` : "";
        return normalizeListResponse(await request(`/notifications/${suffix}`, {}, token));
      },
      mock: () => getMockNotifications(token),
      fallback: false,
    });
  },

  async markNotificationRead(token, notificationId, isRead = true) {
    return callEndpoint("markNotificationRead", {
      real: () =>
        request(
          `/notifications/${notificationId}/`,
          { method: "PATCH", body: JSON.stringify({ is_read: Boolean(isRead) }) },
          token,
        ),
      mock: () => ({ ...setMockNotificationRead(token, notificationId), mocked: true }),
      fallback: false,
    });
  },

  async markAllNotificationsRead(token, isRead = true) {
    return callEndpoint("markAllNotificationsRead", {
      real: () =>
        request(
          "/notifications/mark-all-read/",
          { method: "POST", body: JSON.stringify({ is_read: Boolean(isRead) }) },
          token,
        ),
      mock: () => ({ ...setAllMockNotificationsRead(token, isRead), mocked: true }),
      fallback: false,
    });
  },

  async listPaymentRecords(token) {
    return callEndpoint("listPaymentRecords", {
      real: async () => normalizeListResponse(await request("/payments/records/", {}, token)),
      mock: () => getMockPayments(),
      fallback: false,
    });
  },

  listForensicEvidenceQueue(token) {
    return callEndpoint("listForensicEvidenceQueue", {
      real: async () =>
        (await realListEvidenceByType(token, EVIDENCE_TYPES.BIO_MEDICAL)).filter((item) =>
          ["pending_forensic", "forensic_rejected", "verified"].includes(String(item.status || "").toLowerCase()),
        ),
      mock: () => mockListForensicEvidenceQueue(token),
      fallback: false,
    });
  },

  reviewForensicEvidence(token, evidenceId, payload = {}) {
    return callEndpoint("reviewForensicEvidence", {
      real: async () =>
        normalizeEvidenceEntity(
          await request(
            `/evidence/biological/${evidenceId}/`,
            {
              method: "PATCH",
              body: JSON.stringify({
                review_status: payload?.approved ? "confirmed" : "rejected",
                doctor_notes: String(payload?.doctor_notes || ""),
                identity_db_notes: String(payload?.identity_db_notes || ""),
              }),
            },
            token,
          ),
        ),
      mock: () => mockReviewForensicEvidence(token, evidenceId, payload),
      fallback: false,
    });
  },

  submitTip(token, payload = {}) {
    return callEndpoint("submitTip", {
      real: async () => {
        const attachmentRows = Array.isArray(payload.attachments) ? payload.attachments : [];
        const metadataOnlyAttachments = attachmentRows
          .filter((item) => !item?.file && String(item?.file_url || "").trim())
          .map((item) => ({
            file_url: String(item?.file_url || "").trim(),
            mime_type: String(item?.mime_type || "").trim(),
            original_name: String(item?.original_name || "").trim(),
          }));
        const fileAttachments = attachmentRows.filter((item) => item?.file);

        const created = normalizeTipEntity(
          await request(
            "/financials/tips/",
            {
              method: "POST",
              body: JSON.stringify({
                subject_type: String(payload.subject_type || "case"),
                case_id: payload.case_id ?? null,
                suspect_id: payload.suspect_id ?? null,
                title: String(payload.title || ""),
                description: String(payload.description || ""),
                suspect_hint: String(payload.suspect_hint || ""),
                attachments: metadataOnlyAttachments,
              }),
            },
            token,
          ),
        );

        if (created?.id && fileAttachments.length) {
          for (const attachment of fileAttachments) {
            await realCreateTipAttachment(token, created.id, attachment);
          }
        }
        return created;
      },
      mock: () => mockSubmitTip(token, payload),
      fallback: false,
    });
  },

  listMyTips(token) {
    return callEndpoint("listMyTips", {
      real: async () => normalizeListResponse(await request("/financials/tips/my/", {}, token)).map(normalizeTipEntity),
      mock: () => mockListMyTips(token),
      fallback: false,
    });
  },

  listOfficerTipQueue(token) {
    return callEndpoint("listOfficerTipQueue", {
      real: async () => normalizeListResponse(await request("/financials/tips/officer-queue/", {}, token)).map(normalizeTipEntity),
      mock: () => mockListOfficerTipQueue(token),
      fallback: false,
    });
  },

  officerReviewTip(token, tipId, payload = {}) {
    return callEndpoint("officerReviewTip", {
      real: async () =>
        normalizeTipEntity(
          await request(
          `/financials/tips/${tipId}/officer-review/`,
          {
            method: "POST",
            body: JSON.stringify({
              action: String(payload.action || ""),
              note: String(payload.note || ""),
            }),
          },
          token,
          ),
        ),
      mock: () => mockOfficerReviewTip(token, tipId, payload),
      fallback: false,
    });
  },

  listDetectiveTipQueue(token) {
    return callEndpoint("listDetectiveTipQueue", {
      real: async () => normalizeListResponse(await request("/financials/tips/detective-queue/", {}, token)).map(normalizeTipEntity),
      mock: () => mockListDetectiveTipQueue(token),
      fallback: false,
    });
  },

  detectiveReviewTip(token, tipId, payload = {}) {
    return callEndpoint("detectiveReviewTip", {
      real: async () =>
        normalizeTipEntity(
          await request(
          `/financials/tips/${tipId}/detective-review/`,
          {
            method: "POST",
            body: JSON.stringify({
              action: String(payload.action || ""),
              note: String(payload.note || ""),
              reward_amount:
                payload.reward_amount === undefined || payload.reward_amount === null || payload.reward_amount === ""
                  ? null
                  : Number(payload.reward_amount),
            }),
          },
          token,
          ),
        ),
      mock: () => mockDetectiveReviewTip(token, tipId, payload),
      fallback: false,
    });
  },

  lookupReward(token, payload = {}) {
    return callEndpoint("lookupReward", {
      real: () =>
        request(
          "/payments/rewards/lookup/",
          {
            method: "POST",
            body: JSON.stringify({
              national_id: String(payload.national_id || ""),
              reward_code: String(payload.reward_code || payload.code || ""),
            }),
          },
          token,
        ),
      mock: () => mockLookupReward(token, payload),
      fallback: false,
    });
  },
};
