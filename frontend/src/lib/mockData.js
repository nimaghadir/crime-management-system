const KEY = "caseflow_frontend_mocks_v1";

const DEFAULT_ROLES = [
  { id: 1, name: "System Administrator" },
  { id: 2, name: "Police Chief" },
  { id: 3, name: "Captain" },
  { id: 4, name: "Sergeant" },
  { id: 5, name: "Detective" },
  { id: 6, name: "Police Officer" },
  { id: 7, name: "Cadet" },
  { id: 8, name: "Complainant" },
  { id: 9, name: "Witness" },
  { id: 10, name: "Suspect" },
  { id: 11, name: "Judge" },
  { id: 12, name: "Coroner" },
  { id: 13, name: "Basic User" },
];

const DEFAULT_USERS = [
  {
    id: 1,
    username: "sysadmin",
    password: "admin123",
    email: "admin@caseflow.local",
    phone: "09000000001",
    first_name: "System",
    last_name: "Admin",
    national_id: "1000000001",
    role_id: 1,
    role_name: "System Administrator",
  },
  {
    id: 2,
    username: "chief",
    password: "chief123",
    email: "chief@caseflow.local",
    phone: "09000000002",
    first_name: "Parsa",
    last_name: "Radin",
    national_id: "1000000002",
    role_id: 2,
    role_name: "Police Chief",
  },
  {
    id: 3,
    username: "captain",
    password: "captain123",
    email: "captain@caseflow.local",
    phone: "09000000003",
    first_name: "Cyrus",
    last_name: "Borna",
    national_id: "1000000003",
    role_id: 3,
    role_name: "Captain",
  },
  {
    id: 4,
    username: "sergeant",
    password: "sergeant123",
    email: "sergeant@caseflow.local",
    phone: "09000000004",
    first_name: "Sina",
    last_name: "Mori",
    national_id: "1000000004",
    role_id: 4,
    role_name: "Sergeant",
  },
  {
    id: 5,
    username: "detective",
    password: "detective123",
    email: "detective@caseflow.local",
    phone: "09000000005",
    first_name: "Dina",
    last_name: "Kian",
    national_id: "1000000005",
    role_id: 5,
    role_name: "Detective",
  },
  {
    id: 6,
    username: "officer",
    password: "officer123",
    email: "officer@caseflow.local",
    phone: "09000000006",
    first_name: "Omid",
    last_name: "Nava",
    national_id: "1000000006",
    role_id: 6,
    role_name: "Police Officer",
  },
  {
    id: 7,
    username: "cadet",
    password: "cadet123",
    email: "cadet@caseflow.local",
    phone: "09000000007",
    first_name: "Cade",
    last_name: "Tari",
    national_id: "1000000007",
    role_id: 7,
    role_name: "Cadet",
  },
  {
    id: 8,
    username: "citizen",
    password: "citizen123",
    email: "citizen@caseflow.local",
    phone: "09000000008",
    first_name: "Sara",
    last_name: "Noor",
    national_id: "1000000008",
    role_id: 8,
    role_name: "Complainant",
  },
  {
    id: 9,
    username: "witness",
    password: "witness123",
    email: "witness@caseflow.local",
    phone: "09000000009",
    first_name: "Wendy",
    last_name: "Trace",
    national_id: "1000000009",
    role_id: 9,
    role_name: "Witness",
  },
  {
    id: 10,
    username: "suspect",
    password: "suspect123",
    email: "suspect@caseflow.local",
    phone: "09000000010",
    first_name: "Sam",
    last_name: "Doyle",
    national_id: "1000000010",
    role_id: 10,
    role_name: "Suspect",
  },
  {
    id: 11,
    username: "judge",
    password: "judge123",
    email: "judge@caseflow.local",
    phone: "09000000011",
    first_name: "Jana",
    last_name: "Kerr",
    national_id: "1000000011",
    role_id: 11,
    role_name: "Judge",
  },
  {
    id: 12,
    username: "coroner",
    password: "coroner123",
    email: "coroner@caseflow.local",
    phone: "09000000012",
    first_name: "Cora",
    last_name: "Neri",
    national_id: "1000000012",
    role_id: 12,
    role_name: "Coroner",
  },
  {
    id: 13,
    username: "basic",
    password: "basic123",
    email: "basic@caseflow.local",
    phone: "09000000013",
    first_name: "Bina",
    last_name: "Stone",
    national_id: "1000000013",
    role_id: 13,
    role_name: "Basic User",
  },
];

const DEFAULT_STORE = {
  roles: DEFAULT_ROLES,
  users: DEFAULT_USERS,
  tags: [
    { id: 1, name: "theft" },
    { id: 2, name: "fraud" },
    { id: 3, name: "assault" },
  ],
  cases: [
    {
      id: 1,
      title: "Warehouse Burglary",
      description: "Night break-in at district warehouse.",
      level: 2,
      status: "open",
      assigned_to: 5,
      updated_at: "2026-02-20T09:30:00.000Z",
      created_at: "2026-02-18T14:00:00.000Z",
    },
    {
      id: 4,
      title: "Night Pharmacy Robbery",
      description: "Armed robbery reported at 02:14.",
      level: 1,
      status: "in_progress",
      assigned_to: 5,
      updated_at: "2026-02-21T08:40:00.000Z",
      created_at: "2026-02-17T19:00:00.000Z",
    },
    {
      id: 7,
      title: "Digital Wallet Fraud",
      description: "Multiple victims reported unauthorized transfers.",
      level: 2,
      status: "open",
      assigned_to: 4,
      updated_at: "2026-02-19T16:10:00.000Z",
      created_at: "2026-02-15T11:30:00.000Z",
    },
    {
      id: 10,
      title: "Street Camera Vandalism",
      description: "Closed after suspect confession.",
      level: 4,
      status: "closed",
      assigned_to: 5,
      updated_at: "2026-02-11T08:00:00.000Z",
      created_at: "2026-02-09T08:00:00.000Z",
    },
  ],
  evidence: [
    {
      id: 1,
      case: 1,
      type: "vehicle",
      metadata: { plate: "13A442", model: "sedan", color: "white" },
      status: "pending",
      created_at: "2026-02-20T10:00:00.000Z",
    },
    {
      id: 2,
      case: 1,
      type: "identity",
      metadata: { owner_full_name: "Arman Rahimi", document: "id_card" },
      status: "verified",
      created_at: "2026-02-20T10:30:00.000Z",
    },
    {
      id: 12,
      case: 4,
      type: "bio_medical",
      metadata: { sample_code: "BM-991", source: "counter" },
      status: "pending",
      created_at: "2026-02-21T08:35:00.000Z",
    },
    {
      id: 13,
      case: 7,
      type: "testimony",
      metadata: { witness: "Anonymous", reliability: "medium" },
      status: "pending",
      created_at: "2026-02-19T16:20:00.000Z",
    },
  ],
  suspects: [
    {
      id: 3,
      case: 1,
      name: "Arman Rahimi",
      national_id: "2200000003",
      status: "under_review",
      score: 74,
    },
    {
      id: 5,
      case: 4,
      name: "Kaveh Noruzi",
      national_id: "2200000005",
      status: "under_review",
      score: 62,
    },
    {
      id: 6,
      case: 7,
      name: "Nima Far",
      national_id: "2200000006",
      status: "detained",
      score: 81,
    },
  ],
  actions: [
    {
      id: 1,
      case: 1,
      action_type: "complaint_received",
      payload: { source: "citizen_portal" },
      created_at: "2026-02-18T14:10:00.000Z",
    },
    {
      id: 2,
      case: 4,
      action_type: "interrogation_scored",
      payload: { suspect_id: 5, detective_score: 7, sergeant_score: 8, average_score: 7.5 },
      created_at: "2026-02-21T09:00:00.000Z",
    },
    {
      id: 3,
      case: 7,
      action_type: "evidence_collected",
      payload: { evidence_id: 13 },
      created_at: "2026-02-19T16:25:00.000Z",
    },
  ],
  attachments: [],
  notifications: [
    {
      id: 1,
      message: "Evidence #12 added to Case #4.",
      related_case_id: 4,
      is_read: false,
    },
    {
      id: 2,
      message: "Case #7 assigned to you.",
      related_case_id: 7,
      is_read: true,
    },
  ],
  payments: [
    {
      id: "pm_1",
      type: "reward",
      amount: 150,
      code: "RW-2026-001",
      status: "completed",
    },
  ],
  relationsByCase: {
    1: [
      {
        id: 1,
        source_evidence: 1,
        target_suspect: 3,
        target_evidence: null,
        annotation: "Witness pointed to this suspect's vehicle.",
      },
    ],
  },
  notesByCase: {},
  workflowByCase: {
    1: {
      rejection_count: 0,
      status: "open",
      last_comment: "",
      is_voided: false,
    },
    4: {
      rejection_count: 1,
      status: "open",
      last_comment: "Need clearer statement from complainant.",
      is_voided: false,
    },
    7: {
      rejection_count: 0,
      status: "in_progress",
      last_comment: "",
      is_voided: false,
    },
  },
};

function deepClone(value) {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function nextId(items) {
  if (!items.length) return 1;
  return Math.max(...items.map((item) => Number(item.id) || 0)) + 1;
}

function roleNameById(roles, roleId) {
  return roles.find((role) => role.id === Number(roleId))?.name || "";
}

function syncRolesWithDefaults(roles = []) {
  const roleAliases = {
    "system admin": "system administrator",
    chief: "police chief",
    officer: "police officer",
  };

  const normalizedDefaults = DEFAULT_ROLES.map((role) => ({
    ...role,
    key: normalizeText(role.name),
  }));

  const current = Array.isArray(roles) ? roles : [];
  const byNormalizedName = new Map(
    current.map((role) => [normalizeText(role?.name), role]).filter(([name]) => Boolean(name)),
  );

  const usedIds = new Set();
  const nextRoleId = () => {
    let next = 1;
    while (usedIds.has(next)) next += 1;
    return next;
  };

  const syncedDefaults = normalizedDefaults.map((role) => {
    const existingAlias = Object.entries(roleAliases).find(([, canonical]) => canonical === role.key)?.[0];
    const existing = byNormalizedName.get(role.key) || byNormalizedName.get(existingAlias);
    let id = Number(existing?.id) || role.id;
    if (usedIds.has(id) || id <= 0) {
      id = nextRoleId();
    }
    usedIds.add(id);
    return { id, name: role.name };
  });

  const known = new Set([...normalizedDefaults.map((role) => role.key), ...Object.keys(roleAliases)]);
  const customRolesRaw = current
    .filter((role) => !known.has(normalizeText(role?.name)))
    .map((role) => ({
      id: Number(role.id) || 0,
      name: String(role.name || "").trim(),
    }))
    .filter((role) => role.id > 0 && role.name);

  const customRoles = customRolesRaw.map((role) => {
    let id = role.id;
    if (usedIds.has(id) || id <= 0) {
      id = nextRoleId();
    }
    usedIds.add(id);
    return { ...role, id };
  });

  return [...syncedDefaults, ...customRoles];
}

function normalizeUser(user, roles) {
  const defaultRole =
    roles.find((role) => normalizeText(role.name) === "complainant") || roles[0] || { id: 1, name: "Complainant" };
  const roleName = user.role_name || roleNameById(roles, user.role_id) || defaultRole.name;
  const fallbackRoleId =
    roles.find((role) => normalizeText(role.name) === normalizeText(roleName))?.id || defaultRole.id;
  return {
    ...user,
    role_id: Number(user.role_id) || fallbackRoleId,
    role_name: roleName,
  };
}

function readStore() {
  const base = deepClone(DEFAULT_STORE);

  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return base;

    const parsed = JSON.parse(raw);
    const merged = {
      ...base,
      ...parsed,
      roles:
        Array.isArray(parsed.roles) && parsed.roles.length
          ? syncRolesWithDefaults(parsed.roles)
          : base.roles,
      users: Array.isArray(parsed.users) && parsed.users.length ? parsed.users : base.users,
      tags: Array.isArray(parsed.tags) ? parsed.tags : base.tags,
      cases: Array.isArray(parsed.cases) ? parsed.cases : base.cases,
      evidence: Array.isArray(parsed.evidence) ? parsed.evidence : base.evidence,
      suspects: Array.isArray(parsed.suspects) ? parsed.suspects : base.suspects,
      actions: Array.isArray(parsed.actions) ? parsed.actions : base.actions,
      attachments: Array.isArray(parsed.attachments) ? parsed.attachments : base.attachments,
      notifications: Array.isArray(parsed.notifications) ? parsed.notifications : base.notifications,
      payments: Array.isArray(parsed.payments) ? parsed.payments : base.payments,
      relationsByCase: {
        ...base.relationsByCase,
        ...(parsed.relationsByCase || {}),
      },
      notesByCase: {
        ...base.notesByCase,
        ...(parsed.notesByCase || {}),
      },
      workflowByCase: {
        ...base.workflowByCase,
        ...(parsed.workflowByCase || {}),
      },
    };

    merged.users = merged.users.map((user) => normalizeUser(user, merged.roles));
    return merged;
  } catch {
    return base;
  }
}

function writeStore(store) {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    // no-op: localStorage can be unavailable in some environments
  }
}

function sanitizeUser(user) {
  const { password, ...safe } = user;
  return safe;
}

function isMockToken(token) {
  return /^mock-token-\d+$/.test(String(token || "").trim());
}

function userFromToken(store, token) {
  const rawToken = String(token || "").trim();
  if (!rawToken) return null;

  if (!isMockToken(rawToken)) {
    return store.users[0] || null;
  }

  const id = Number(rawToken.replace("mock-token-", ""));
  return store.users.find((user) => user.id === id) || null;
}

function assertAuthenticated(store, token) {
  const user = userFromToken(store, token);
  if (!user) {
    throw new Error("Authentication required.");
  }
  return user;
}

function isSystemAdmin(user) {
  const role = normalizeText(user?.role_name);
  return role.includes("administrator") || role.includes("admin") || role.includes("chief");
}

function assertAdmin(store, token) {
  const user = assertAuthenticated(store, token);
  if (isMockToken(token) && !isSystemAdmin(user)) {
    throw new Error("Admin endpoints require system admin role.");
  }
  return user;
}

function findCaseOrThrow(store, caseId) {
  const id = Number(caseId);
  const found = store.cases.find((item) => item.id === id);
  if (!found) {
    throw new Error(`Case #${id} was not found.`);
  }
  return found;
}

function appendNotification(store, message, relatedCaseId) {
  const id = nextId(store.notifications);
  const item = {
    id,
    message,
    related_case_id: Number(relatedCaseId),
    is_read: false,
  };
  store.notifications = [item, ...store.notifications];
  return item;
}

function findNoteLocation(store, noteId) {
  const targetId = Number(noteId);
  const entries = Object.entries(store.notesByCase || {});
  for (const [caseKey, notes] of entries) {
    const index = (notes || []).findIndex((item) => Number(item.id) === targetId);
    if (index >= 0) {
      return { caseKey, index };
    }
  }
  return null;
}

export function mockLogin(payload = {}) {
  const store = readStore();
  const identifier = normalizeText(payload.identifier);
  const password = String(payload.password || "");

  if (!identifier || !password) {
    throw new Error("Identifier and password are required.");
  }

  const user = store.users.find((item) =>
    [item.username, item.email, item.phone, item.national_id].some(
      (value) => normalizeText(value) === identifier,
    ),
  );

  if (!user || String(user.password) !== password) {
    throw new Error("Invalid credentials.");
  }

  return {
    access_token: `mock-token-${user.id}`,
    user: sanitizeUser(user),
    mocked: true,
  };
}

export function mockRegister(payload = {}) {
  const store = readStore();
  const required = [
    "username",
    "password",
    "email",
    "phone",
    "first_name",
    "last_name",
    "national_id",
  ];
  const missing = required.filter((field) => !String(payload[field] || "").trim());
  if (missing.length) {
    throw new Error(`Missing required fields: ${missing.join(", ")}`);
  }

  const duplicateChecks = [
    ["username", "username"],
    ["email", "email"],
    ["phone", "phone"],
    ["national_id", "national_id"],
  ];

  for (const [field, label] of duplicateChecks) {
    const exists = store.users.some(
      (user) => normalizeText(user[field]) === normalizeText(payload[field]),
    );
    if (exists) {
      throw new Error(`${label} already exists.`);
    }
  }

  const complainantRole =
    store.roles.find((role) => normalizeText(role.name) === "complainant") || store.roles[0];
  const user = normalizeUser(
    {
      id: nextId(store.users),
      username: String(payload.username).trim(),
      password: String(payload.password),
      email: String(payload.email).trim(),
      phone: String(payload.phone).trim(),
      first_name: String(payload.first_name).trim(),
      last_name: String(payload.last_name).trim(),
      national_id: String(payload.national_id).trim(),
      role_id: complainantRole.id,
      role_name: complainantRole.name,
    },
    store.roles,
  );

  store.users.push(user);
  writeStore(store);

  return {
    access_token: `mock-token-${user.id}`,
    user: sanitizeUser(user),
    mocked: true,
  };
}

export function mockListCases(token, params = {}) {
  assertAuthenticated(readStore(), token);
  const store = readStore();
  const status = normalizeText(params.status);
  const items = store.cases
    .filter((item) => (status ? normalizeText(item.status) === status : true))
    .sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));
  return deepClone(items);
}

export function mockGetCase(token, caseId) {
  const store = readStore();
  assertAuthenticated(store, token);
  return deepClone(findCaseOrThrow(store, caseId));
}

export function mockCreateCase(token, payload = {}) {
  const store = readStore();
  const actor = assertAuthenticated(store, token);
  const title = String(payload.title || "").trim();
  if (!title) {
    throw new Error("title: This field is required.");
  }

  const created = {
    id: nextId(store.cases),
    title,
    description: String(payload.description || "").trim(),
    level: Number(payload.level) || 3,
    status: "open",
    assigned_to: Number(payload.assigned_to) || 2,
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    created_by: actor.id,
  };

  store.cases.push(created);
  store.workflowByCase[String(created.id)] = {
    rejection_count: 0,
    status: "open",
    last_comment: "",
    is_voided: false,
  };
  appendNotification(store, `New case #${created.id} created.`, created.id);
  writeStore(store);
  return deepClone(created);
}

export function mockUpdateCasePartial(token, caseId, payload = {}) {
  const store = readStore();
  assertAuthenticated(store, token);
  const target = findCaseOrThrow(store, caseId);

  const allowed = ["title", "description", "level", "status", "assigned_to"];
  for (const field of allowed) {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      target[field] = payload[field];
    }
  }
  target.updated_at = new Date().toISOString();

  writeStore(store);
  return deepClone(target);
}

export function mockListTags() {
  return deepClone(readStore().tags);
}

export function mockListEvidence(token, caseId) {
  const store = readStore();
  assertAuthenticated(store, token);
  const items = store.evidence
    .filter((item) => Number(item.case) === Number(caseId))
    .sort((a, b) => Number(a.id) - Number(b.id));
  return deepClone(items);
}

export function mockCreateEvidence(token, payload = {}) {
  const store = readStore();
  assertAuthenticated(store, token);

  const caseId = Number(payload.case);
  if (!caseId) {
    throw new Error("case: This field is required.");
  }
  findCaseOrThrow(store, caseId);

  const type = String(payload.type || "").trim();
  if (!type) {
    throw new Error("type: This field is required.");
  }

  const created = {
    id: nextId(store.evidence),
    case: caseId,
    type,
    metadata: payload.metadata && typeof payload.metadata === "object" ? payload.metadata : {},
    status: "pending",
    created_at: new Date().toISOString(),
  };
  store.evidence.push(created);
  appendNotification(store, `Evidence #${created.id} added to Case #${caseId}.`, caseId);
  writeStore(store);
  return deepClone(created);
}

export function mockVerifyEvidence(token, evidenceId) {
  const store = readStore();
  assertAuthenticated(store, token);

  const target = store.evidence.find((item) => Number(item.id) === Number(evidenceId));
  if (!target) {
    throw new Error(`Evidence #${evidenceId} was not found.`);
  }
  target.status = "verified";
  target.verified_at = new Date().toISOString();
  writeStore(store);
  return deepClone(target);
}

export function mockCreateEvidenceAttachment(token, payload = {}) {
  const store = readStore();
  assertAuthenticated(store, token);

  const evidenceId = Number(payload.evidence);
  const evidence = store.evidence.find((item) => Number(item.id) === evidenceId);
  if (!evidence) {
    throw new Error("evidence: Invalid evidence id.");
  }

  const created = {
    id: nextId(store.attachments),
    evidence: evidenceId,
    file_url: payload.file_url || "",
    file_path: payload.file_path || "",
    mime_type: payload.mime_type || "",
    original_name: payload.original_name || "",
    uploaded_at: new Date().toISOString(),
  };
  store.attachments.push(created);
  writeStore(store);
  return deepClone(created);
}

export function mockListSuspects(token, caseId) {
  const store = readStore();
  assertAuthenticated(store, token);
  const suspects = store.suspects.filter((item) => Number(item.case) === Number(caseId));
  return deepClone(suspects);
}

export function mockCreateSuspect(token, payload = {}) {
  const store = readStore();
  assertAuthenticated(store, token);

  const caseId = Number(payload.case);
  if (!caseId) throw new Error("case: This field is required.");
  findCaseOrThrow(store, caseId);

  const name = String(payload.name || "").trim();
  if (!name) throw new Error("name: This field is required.");

  const created = {
    id: nextId(store.suspects),
    case: caseId,
    name,
    national_id: String(payload.national_id || "").trim(),
    status: "under_review",
    score: Number(payload.score) || 50,
  };

  store.suspects.push(created);
  writeStore(store);
  return deepClone(created);
}

export function mockUpdateSuspect(token, suspectId, payload = {}) {
  const store = readStore();
  assertAuthenticated(store, token);

  const target = store.suspects.find((item) => Number(item.id) === Number(suspectId));
  if (!target) {
    throw new Error(`Suspect #${suspectId} was not found.`);
  }

  const allowed = ["name", "national_id", "status", "score"];
  for (const field of allowed) {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      target[field] = payload[field];
    }
  }

  writeStore(store);
  return deepClone(target);
}

export function mockCreateNote(token, payload = {}) {
  const store = readStore();
  assertAuthenticated(store, token);

  const caseId = Number(payload.case);
  if (!caseId) {
    throw new Error("case: This field is required.");
  }
  const text = String(payload.text || "").trim();
  if (!text) {
    throw new Error("text: This field is required.");
  }

  const created = addMockNote(caseId, {
    text,
    pinned: Boolean(payload.pinned),
  });
  return {
    ...created,
    case: caseId,
    pinned: Boolean(payload.pinned),
  };
}

export function mockUpdateNote(token, noteId, payload = {}) {
  const store = readStore();
  assertAuthenticated(store, token);
  const location = findNoteLocation(store, noteId);
  if (!location) {
    throw new Error(`Note #${noteId} was not found.`);
  }

  const notes = store.notesByCase[location.caseKey] || [];
  const current = notes[location.index];
  notes[location.index] = {
    ...current,
    ...payload,
  };
  store.notesByCase[location.caseKey] = notes;
  writeStore(store);
  return deepClone(notes[location.index]);
}

export function mockDeleteNote(token, noteId) {
  const store = readStore();
  assertAuthenticated(store, token);
  const location = findNoteLocation(store, noteId);
  if (!location) {
    throw new Error(`Note #${noteId} was not found.`);
  }

  const next = (store.notesByCase[location.caseKey] || []).filter(
    (note) => Number(note.id) !== Number(noteId),
  );
  store.notesByCase[location.caseKey] = next.map((note, index) => ({
    ...note,
    order_index: index,
  }));
  const relationList = store.relationsByCase[location.caseKey] || [];
  store.relationsByCase[location.caseKey] = relationList.filter(
    (item) =>
      Number(item.source_note) !== Number(noteId) &&
      Number(item.target_note) !== Number(noteId),
  );
  writeStore(store);
  return { deleted: true };
}

export function mockReorderNotes(token, payload = {}) {
  const store = readStore();
  assertAuthenticated(store, token);
  const caseId = Number(payload.case);
  if (!caseId) {
    throw new Error("case: This field is required.");
  }
  return reorderMockNotes(caseId, payload.note_ids || []);
}

export function mockListInvestigationActions(token, caseId) {
  const store = readStore();
  assertAuthenticated(store, token);
  const logs = store.actions
    .filter((item) => Number(item.case) === Number(caseId))
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  return deepClone(logs);
}

export function mockCreateInvestigationAction(token, payload = {}) {
  const store = readStore();
  assertAuthenticated(store, token);
  const caseId = Number(payload.case);
  if (!caseId) {
    throw new Error("case: This field is required.");
  }
  findCaseOrThrow(store, caseId);

  const created = {
    id: nextId(store.actions),
    case: caseId,
    action_type: String(payload.action_type || "action"),
    payload: payload.payload || {},
    created_at: new Date().toISOString(),
  };

  store.actions.push(created);
  if (created.action_type === "interrogation_scored") {
    appendNotification(
      store,
      `Interrogation score submitted for Case #${caseId}.`,
      caseId,
    );
  }
  if (created.action_type.includes("captain_verdict")) {
    appendNotification(store, `Captain verdict updated for Case #${caseId}.`, caseId);
  }
  writeStore(store);
  return deepClone(created);
}

export function mockGetBoardSummary(token) {
  const store = readStore();
  const user = assertAuthenticated(store, token);

  const openAssignedCases = store.cases.filter(
    (item) =>
      Number(item.assigned_to) === Number(user.id) &&
      ["open", "in_progress"].includes(normalizeText(item.status)),
  ).length;

  const urgentCases = store.cases.filter(
    (item) =>
      Number(item.level) <= 2 &&
      !["closed", "resolved", "voided"].includes(normalizeText(item.status)),
  ).length;

  const pendingEvidence = store.evidence.filter(
    (item) => normalizeText(item.status) !== "verified",
  ).length;

  return {
    open_assigned_cases: openAssignedCases,
    urgent_cases: urgentCases,
    pending_evidence: pendingEvidence,
    mocked: true,
  };
}

export function mockGetPublicOverview() {
  const store = readStore();
  const resolvedCases = store.cases.filter((item) =>
    ["resolved", "closed"].includes(normalizeText(item.status)),
  ).length;
  const activeCases = store.cases.filter(
    (item) => !["resolved", "closed", "voided"].includes(normalizeText(item.status)),
  ).length;
  const totalEmployees = store.users.filter((item) => {
    const role = normalizeText(item.role_name);
    return !["complainant", "citizen", "witness", "suspect", "basic user", "shaki"].includes(role);
  }).length;

  return {
    resolved_cases: resolvedCases,
    total_employees: totalEmployees,
    active_cases: activeCases,
    total_cases: store.cases.length,
    mocked: true,
  };
}

export function mockGetAdminConsoleData(token) {
  const store = readStore();
  assertAdmin(store, token);

  const cases = store.cases || [];
  const users = store.users || [];
  const evidence = store.evidence || [];
  const suspects = store.suspects || [];
  const actions = store.actions || [];
  const notifications = store.notifications || [];
  const attachments = store.attachments || [];
  const roles = store.roles || [];

  const openCases = cases.filter((item) =>
    ["open", "in_progress", "pending_officer"].includes(normalizeText(item.status)),
  ).length;
  const resolvedCases = cases.filter((item) =>
    ["resolved", "closed"].includes(normalizeText(item.status)),
  ).length;

  const roleDistribution = roles.map((role) => ({
    role_id: role.id,
    role_name: role.name,
    user_count: users.filter((user) => Number(user.role_id) === Number(role.id)).length,
  }));

  const recentCases = deepClone(cases)
    .sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)))
    .slice(0, 8);
  const recentUsers = deepClone(users)
    .sort((a, b) => Number(b.id) - Number(a.id))
    .slice(0, 8)
    .map((user) => sanitizeUser(user));

  return {
    summary: {
      users: users.length,
      roles: roles.length,
      cases: cases.length,
      open_cases: openCases,
      resolved_cases: resolvedCases,
      evidence: evidence.length,
      attachments: attachments.length,
      suspects: suspects.length,
      actions: actions.length,
      notifications: notifications.length,
      unread_notifications: notifications.filter((item) => !item.is_read).length,
    },
    recent_cases: recentCases,
    recent_users: recentUsers,
    role_distribution: roleDistribution,
    mocked: true,
  };
}

export function mockGetTestingAccounts() {
  return deepClone(
    DEFAULT_USERS.map((user) => ({
      role_name: user.role_name,
      identifier: user.username,
      password: user.password,
      email: user.email,
    })),
  );
}

export function mockResetStore(token) {
  const store = readStore();
  assertAdmin(store, token);

  const resetStore = deepClone(DEFAULT_STORE);
  writeStore(resetStore);
  return {
    ok: true,
    message: "Mock storage reset to default seed.",
    users: resetStore.users.length,
    cases: resetStore.cases.length,
    evidence: resetStore.evidence.length,
    mocked: true,
  };
}

export function mockListRoles(token) {
  const store = readStore();
  assertAdmin(store, token);
  return deepClone(store.roles);
}

export function mockCreateRole(token, payload = {}) {
  const store = readStore();
  assertAdmin(store, token);

  const name = String(payload.name || "").trim();
  if (!name) {
    throw new Error("name: This field is required.");
  }

  const exists = store.roles.some((role) => normalizeText(role.name) === normalizeText(name));
  if (exists) {
    throw new Error("name: Role already exists.");
  }

  const created = {
    id: nextId(store.roles),
    name,
  };

  store.roles.push(created);
  writeStore(store);
  return deepClone(created);
}

export function mockDeleteRole(token, roleId) {
  const store = readStore();
  assertAdmin(store, token);

  const id = Number(roleId);
  if (!id) {
    throw new Error("Invalid role id.");
  }

  const index = store.roles.findIndex((role) => Number(role.id) === id);
  if (index < 0) {
    throw new Error(`Role #${id} was not found.`);
  }

  const assignedCount = store.users.filter((user) => Number(user.role_id) === id).length;
  if (assignedCount > 0) {
    throw new Error(`Cannot delete role #${id} because it is assigned to ${assignedCount} user(s).`);
  }

  const [deleted] = store.roles.splice(index, 1);
  writeStore(store);
  return {
    ok: true,
    id: deleted.id,
    name: deleted.name,
    mocked: true,
  };
}

export function mockListUsers(token) {
  const store = readStore();
  assertAdmin(store, token);
  return deepClone(store.users.map((user) => sanitizeUser(user)));
}

export function mockAssignRole(token, userId, roleId) {
  const store = readStore();
  assertAdmin(store, token);

  const user = store.users.find((item) => Number(item.id) === Number(userId));
  if (!user) {
    throw new Error(`User #${userId} was not found.`);
  }

  const role = store.roles.find((item) => Number(item.id) === Number(roleId));
  if (!role) {
    throw new Error(`Role #${roleId} was not found.`);
  }

  user.role_id = role.id;
  user.role_name = role.name;
  writeStore(store);
  return deepClone(sanitizeUser(user));
}

export function mockConvertComplaintToCase(token, complaintId, payload = {}) {
  const created = mockCreateCase(token, {
    ...payload,
    title: payload.title || `Converted complaint #${complaintId}`,
    description: payload.description || "Converted from complaint.",
  });
  return {
    complaint_id: Number(complaintId),
    case: created,
    mocked: true,
  };
}

export function getMockNotifications() {
  return deepClone(readStore().notifications);
}

export function setMockNotificationRead(notificationId) {
  const store = readStore();
  store.notifications = store.notifications.map((item) =>
    item.id === Number(notificationId) ? { ...item, is_read: true } : item,
  );
  writeStore(store);
  return deepClone(
    store.notifications.find((item) => item.id === Number(notificationId)),
  );
}

export function getMockPayments() {
  return deepClone(readStore().payments);
}

export function getMockBoard(caseId) {
  const store = readStore();
  const caseKey = String(caseId);
  return {
    relations: deepClone(store.relationsByCase[caseKey] || []),
    notes: deepClone(store.notesByCase[caseKey] || []),
  };
}

export function addMockRelation(caseId, relation) {
  const store = readStore();
  const caseKey = String(caseId);
  const current = store.relationsByCase[caseKey] || [];
  const id = current.length ? Math.max(...current.map((item) => item.id)) + 1 : 1;
  const newItem = { id, ...relation };
  store.relationsByCase[caseKey] = [...current, newItem];
  writeStore(store);
  return deepClone(newItem);
}

export function deleteMockRelation(caseId, relationId) {
  const store = readStore();
  const caseKey = String(caseId);
  const current = store.relationsByCase[caseKey] || [];
  const next = current.filter((item) => Number(item.id) !== Number(relationId));
  if (next.length === current.length) {
    throw new Error(`Relation #${relationId} was not found.`);
  }
  store.relationsByCase[caseKey] = next;
  writeStore(store);
  return { deleted: true };
}

export function addMockNote(caseId, note) {
  const store = readStore();
  const caseKey = String(caseId);
  const current = store.notesByCase[caseKey] || [];
  const id = current.length ? Math.max(...current.map((item) => item.id)) + 1 : 1;
  const newItem = { id, order_index: current.length, ...note };
  store.notesByCase[caseKey] = [...current, newItem];
  writeStore(store);
  return deepClone(newItem);
}

export function reorderMockNotes(caseId, noteIds) {
  const store = readStore();
  const caseKey = String(caseId);
  const current = store.notesByCase[caseKey] || [];
  const byId = Object.fromEntries(current.map((item) => [item.id, item]));
  const reordered = noteIds
    .map((id, idx) => (byId[id] ? { ...byId[id], order_index: idx } : null))
    .filter(Boolean);
  store.notesByCase[caseKey] = reordered;
  writeStore(store);
  return deepClone(reordered);
}

export function getMockWorkflow(caseId) {
  const store = readStore();
  const caseKey = String(caseId);
  return (
    deepClone(store.workflowByCase[caseKey]) || {
      rejection_count: 0,
      status: "open",
      last_comment: "",
      is_voided: false,
    }
  );
}

export function applyMockWorkflow(caseId, payload) {
  const store = readStore();
  const caseKey = String(caseId);
  const current = getMockWorkflow(caseId);

  let rejectionCount = current.rejection_count;
  let status = current.status;
  const action = String(payload?.action || "").toLowerCase();
  const role = String(payload?.role || "").toLowerCase();

  if (action === "reject") {
    rejectionCount += 1;
    status = rejectionCount >= 3 ? "voided" : "open";
  }

  if (action === "accept") {
    if (role.includes("cadet")) status = "pending_officer";
    else if (role.includes("officer")) status = "in_progress";
    else status = "in_progress";
  }

  const next = {
    rejection_count: rejectionCount,
    status,
    last_comment: payload?.comment || "",
    is_voided: status === "voided",
  };

  store.workflowByCase[caseKey] = next;

  const mappedCaseStatus = next.is_voided ? "voided" : next.status;
  const caseItem = store.cases.find((item) => Number(item.id) === Number(caseId));
  if (caseItem) {
    caseItem.status = mappedCaseStatus;
    caseItem.updated_at = new Date().toISOString();
  }

  writeStore(store);
  return deepClone(next);
}
