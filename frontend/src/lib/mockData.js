const KEY = "caseflow_frontend_mocks";
const LEGACY_KEYS = ["caseflow_frontend_mocks_v1"];

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
      assigned_to: null,
      created_by: 8,
      created_by_role: "Complainant",
      intern_id: null,
      officer_id: null,
      supervisor_id: null,
      detective_id: null,
      judge_id: null,
      complainant_ids: [8],
      updated_at: "2026-02-20T09:30:00.000Z",
      created_at: "2026-02-18T14:00:00.000Z",
    },
    {
      id: 4,
      title: "Night Pharmacy Robbery",
      description: "Armed robbery reported at 02:14.",
      level: 1,
      status: "in_progress",
      intern_id: 7,
      officer_id: null,
      supervisor_id: null,
      detective_id: 5,
      judge_id: null,
      assigned_to: 5,
      created_by: 9,
      created_by_role: "Witness",
      complainant_ids: [9],
      updated_at: "2026-02-21T08:40:00.000Z",
      created_at: "2026-02-17T19:00:00.000Z",
    },
    {
      id: 7,
      title: "Digital Wallet Fraud",
      description: "Multiple victims reported unauthorized transfers.",
      level: 2,
      status: "open",
      intern_id: 7,
      officer_id: 6,
      supervisor_id: null,
      detective_id: null,
      judge_id: null,
      assigned_to: null,
      created_by: 6,
      created_by_role: "Police Officer",
      complainant_ids: [8],
      updated_at: "2026-02-19T16:10:00.000Z",
      created_at: "2026-02-15T11:30:00.000Z",
    },
    {
      id: 10,
      title: "Street Camera Vandalism",
      description: "Closed after suspect confession.",
      level: 4,
      status: "closed",
      intern_id: 7,
      officer_id: 6,
      supervisor_id: 4,
      detective_id: 5,
      judge_id: 11,
      assigned_to: 5,
      created_by: 8,
      created_by_role: "Complainant",
      complainant_ids: [8],
      updated_at: "2026-02-11T08:00:00.000Z",
      created_at: "2026-02-09T08:00:00.000Z",
    },
  ],
  evidence: [
    {
      id: 1,
      case: 1,
      type: "vehicle",
      title: "White sedan near rear gate",
      description: "Vehicle parked near the loading dock during the burglary window.",
      registered_at: "2026-02-20T10:00:00.000Z",
      submitter_id: 8,
      submitter_name: "citizen",
      submitter_role: "Complainant",
      submitted_by_role: "Complainant",
      metadata: { plate: "13A442", model: "Sedan", color: "White" },
      status: "pending",
      created_at: "2026-02-20T10:00:00.000Z",
    },
    {
      id: 2,
      case: 1,
      type: "identity",
      title: "Recovered ID card fragment",
      description: "Partial identification card recovered near the office desk.",
      registered_at: "2026-02-20T10:30:00.000Z",
      submitter_id: 6,
      submitter_name: "officer",
      submitter_role: "Police Officer",
      submitted_by_role: "Police Officer",
      metadata: {
        owner_full_name: "Arman Rahimi",
        details: {
          document_type: "id_card",
          issuing_city: "Tehran",
        },
      },
      status: "verified",
      created_at: "2026-02-20T10:30:00.000Z",
    },
    {
      id: 12,
      case: 4,
      type: "bio_medical",
      title: "Blood trace on pharmacy counter",
      description: "Small blood stain found near the broken cash drawer.",
      registered_at: "2026-02-21T08:35:00.000Z",
      submitter_id: 9,
      submitter_name: "witness",
      submitter_role: "Witness",
      submitted_by_role: "Witness",
      metadata: {
        sample_type: "blood stain",
        doctor_notes: "",
        identity_db_notes: "",
      },
      status: "pending",
      created_at: "2026-02-21T08:35:00.000Z",
    },
    {
      id: 13,
      case: 7,
      type: "testimony",
      title: "Eyewitness statement near ATM",
      description: "A local resident reported a suspicious exchange near the ATM terminal.",
      registered_at: "2026-02-19T16:20:00.000Z",
      submitter_id: 13,
      submitter_name: "basic",
      submitter_role: "Basic User",
      submitted_by_role: "Basic User",
      metadata: {
        transcript: "Two individuals exchanged envelopes and left on a motorbike.",
      },
      status: "pending",
      created_at: "2026-02-19T16:20:00.000Z",
    },
    {
      id: 14,
      case: 7,
      type: "other",
      title: "Torn receipt near doorway",
      description: "A partially burned receipt was found at the entrance.",
      registered_at: "2026-02-19T17:00:00.000Z",
      submitter_id: 5,
      submitter_name: "detective",
      submitter_role: "Detective",
      submitted_by_role: "Detective",
      metadata: {
        notes: "Could be linked to suspect purchase timeline.",
      },
      status: "pending",
      created_at: "2026-02-19T17:00:00.000Z",
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
  attachments: [
    {
      id: 1,
      evidence: 12,
      file_url: "https://example.com/evidence/biological-12-1.jpg",
      file_path: "",
      mime_type: "image/jpeg",
      original_name: "counter_blood_trace.jpg",
      uploaded_at: "2026-02-21T08:37:00.000Z",
    },
    {
      id: 2,
      evidence: 13,
      file_url: "https://example.com/evidence/testimony-13-clip.mp4",
      file_path: "",
      mime_type: "video/mp4",
      original_name: "street_camera_clip.mp4",
      uploaded_at: "2026-02-19T16:23:00.000Z",
    },
  ],
  notifications: [
    {
      id: 1,
      message: "Evidence #12 added to Case #4.",
      related_case_id: 4,
      is_read: false,
      recipient_user_id: 5,
    },
    {
      id: 2,
      message: "Case #7 assigned to you.",
      related_case_id: 7,
      is_read: true,
      recipient_user_id: 4,
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
  relationsByCase: {},
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

function hasAnyKeyword(value, keywords = []) {
  const normalized = normalizeText(value);
  return keywords.some((keyword) => normalized.includes(normalizeText(keyword)));
}

function normalizeOptionalUserId(value) {
  const numeric = Number(value);
  return numeric > 0 ? numeric : null;
}

function isActiveCaseStatus(status) {
  return !["resolved", "closed", "voided"].includes(normalizeText(status));
}

function roleByUserId(store, userId) {
  const user = (store.users || []).find((item) => Number(item.id) === Number(userId));
  return String(user?.role_name || "");
}

function isPoliceRoleName(roleName) {
  return hasAnyKeyword(roleName, [
    "cadet",
    "officer",
    "detective",
    "sergeant",
    "captain",
    "chief",
    "police",
  ]);
}

function matchQueueCases(store, queueType) {
  const queue = normalizeText(queueType);
  return (store.cases || []).filter((item) => {
    const active = isActiveCaseStatus(item.status);
    if (!active) return false;

    const internId = normalizeOptionalUserId(item.intern_id ?? item.cadet_id);
    const officerId = normalizeOptionalUserId(item.officer_id);
    const supervisorId = normalizeOptionalUserId(item.supervisor_id);
    const detectiveId = normalizeOptionalUserId(item.detective_id ?? item.assigned_to);
    const judgeId = normalizeOptionalUserId(item.judge_id);
    const creatorRole = String(item.created_by_role || roleByUserId(store, item.created_by) || "");

    if (queue === "intern_unassigned") {
      return !internId;
    }
    if (queue === "officer_unassigned") {
      return !officerId;
    }
    if (queue === "police_without_supervisor") {
      return isPoliceRoleName(creatorRole) && !supervisorId;
    }
    if (queue === "specialists_unassigned") {
      return !detectiveId || !judgeId;
    }
    return false;
  });
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
    phone: user.phone || user.phone_number || "",
    role_id: Number(user.role_id) || fallbackRoleId,
    role_name: roleName,
  };
}

function isComplainantLikeRoleName(roleName) {
  const role = normalizeText(roleName);
  return [
    "complainant",
    "citizen",
    "witness",
    "suspect",
    "basic user",
    "shaki",
    "plaintiff",
  ].some((needle) => role.includes(needle));
}

function normalizeCaseComplainantIds(caseItem, fallbackCase, usersById) {
  const seedIds = Array.isArray(caseItem?.complainant_ids)
    ? caseItem.complainant_ids
    : Array.isArray(fallbackCase?.complainant_ids)
      ? fallbackCase.complainant_ids
      : [];

  const ids = [...seedIds];
  const createdBy = Number(caseItem?.created_by);
  if (createdBy > 0) {
    const creatorRole = usersById.get(createdBy)?.role_name || "";
    if (isComplainantLikeRoleName(creatorRole)) {
      ids.push(createdBy);
    }
  }

  return [...new Set(ids.map((id) => Number(id)).filter((id) => id > 0))];
}

function normalizeCases(cases, baseCases, usersById) {
  const baseById = new Map((baseCases || []).map((item) => [Number(item.id), item]));
  return (Array.isArray(cases) ? cases : []).map((item) => {
    const fallbackCase = baseById.get(Number(item.id));
    const createdBy = Number(item.created_by ?? fallbackCase?.created_by);
    const createdByRole =
      String(item.created_by_role || fallbackCase?.created_by_role || usersById.get(createdBy)?.role_name || "").trim();
    const detectiveId = normalizeOptionalUserId(
      item.detective_id ??
        item.assigned_detective ??
        item.assigned_to ??
        fallbackCase?.detective_id ??
        fallbackCase?.assigned_to,
    );

    return {
      ...item,
      created_by_role: createdByRole,
      intern_id: normalizeOptionalUserId(item.intern_id ?? item.cadet_id ?? fallbackCase?.intern_id),
      officer_id: normalizeOptionalUserId(item.officer_id ?? fallbackCase?.officer_id),
      supervisor_id: normalizeOptionalUserId(item.supervisor_id ?? fallbackCase?.supervisor_id),
      detective_id: detectiveId,
      judge_id: normalizeOptionalUserId(item.judge_id ?? fallbackCase?.judge_id),
      assigned_to: normalizeOptionalUserId(item.assigned_to ?? detectiveId ?? fallbackCase?.assigned_to),
      complainant_ids: normalizeCaseComplainantIds(item, fallbackCase, usersById),
    };
  });
}

function normalizeEvidenceType(type) {
  const normalized = normalizeText(type);
  if (
    ["testimony", "bio_medical", "vehicle", "identity", "other"].includes(normalized)
  ) {
    return normalized;
  }
  return "other";
}

function normalizeAttachmentItems(attachments, baseAttachments) {
  const fallback = Array.isArray(baseAttachments) ? baseAttachments : [];
  const source = Array.isArray(attachments) ? attachments : fallback;
  return source.map((item, index) => ({
    id: Number(item?.id) || index + 1,
    evidence: Number(item?.evidence) || null,
    file_url: String(item?.file_url || "").trim(),
    file_path: String(item?.file_path || "").trim(),
    mime_type: String(item?.mime_type || "").trim(),
    original_name: String(item?.original_name || "").trim(),
    uploaded_at: item?.uploaded_at || new Date().toISOString(),
  }));
}

function normalizeEvidenceItems(evidenceItems, baseEvidenceItems, usersById) {
  const baseById = new Map((baseEvidenceItems || []).map((item) => [Number(item.id), item]));
  return (Array.isArray(evidenceItems) ? evidenceItems : []).map((item) => {
    const fallback = baseById.get(Number(item?.id));
    const submitterId = Number(item?.submitter_id ?? fallback?.submitter_id) || null;
    const submitterUser = submitterId ? usersById.get(submitterId) : null;
    const metadata =
      item?.metadata && typeof item.metadata === "object" && !Array.isArray(item.metadata)
        ? item.metadata
        : fallback?.metadata && typeof fallback.metadata === "object" && !Array.isArray(fallback.metadata)
          ? fallback.metadata
          : {};

    const type = normalizeEvidenceType(item?.type ?? fallback?.type);
    const title = String(item?.title || fallback?.title || `Evidence #${item?.id || "-"}`).trim();
    const description = String(item?.description || fallback?.description || "").trim();
    const createdAt = item?.created_at || fallback?.created_at || new Date().toISOString();
    const registeredAt = item?.registered_at || fallback?.registered_at || createdAt;
    const submitterName = String(
      item?.submitter_name || fallback?.submitter_name || submitterUser?.username || "",
    ).trim();
    const submitterRole = String(
      item?.submitter_role ||
        item?.submitted_by_role ||
        fallback?.submitter_role ||
        fallback?.submitted_by_role ||
        submitterUser?.role_name ||
        "",
    ).trim();

    return {
      ...item,
      id: Number(item?.id),
      case: Number(item?.case ?? fallback?.case) || null,
      type,
      title,
      description,
      metadata,
      status: String(item?.status || fallback?.status || "pending").trim() || "pending",
      submitter_id: submitterId,
      submitter_name: submitterName,
      submitter_role: submitterRole,
      submitted_by_role: submitterRole,
      registered_at: registeredAt,
      created_at: createdAt,
    };
  });
}

function isMyComplainantCase(caseItem, userId) {
  const id = Number(userId);
  if (!id || !caseItem) return false;
  if (Number(caseItem.created_by) === id) return true;
  return (caseItem.complainant_ids || []).some((item) => Number(item) === id);
}

function sameUserIdentity(left, right) {
  return (
    normalizeText(left?.username) === normalizeText(right?.username) ||
    normalizeText(left?.email) === normalizeText(right?.email) ||
    normalizeText(left?.national_id) === normalizeText(right?.national_id)
  );
}

function syncUsersWithDefaults(users = [], roles = []) {
  const current = (Array.isArray(users) ? users : []).map((user) => normalizeUser(user, roles));
  const result = [...current];
  const usedIds = new Set(result.map((user) => Number(user.id)).filter((id) => id > 0));

  const nextUserId = () => {
    let next = 1;
    while (usedIds.has(next)) next += 1;
    return next;
  };

  for (const seedUser of DEFAULT_USERS) {
    const role =
      roles.find((item) => normalizeText(item.name) === normalizeText(seedUser.role_name)) ||
      roles.find((item) => Number(item.id) === Number(seedUser.role_id)) ||
      roles[0] ||
      { id: seedUser.role_id, name: seedUser.role_name };

    const seed = {
      ...seedUser,
      role_id: role.id,
      role_name: role.name,
    };

    const index = result.findIndex((item) => sameUserIdentity(item, seed));
    if (index < 0) {
      let id = Number(seed.id);
      if (!id || usedIds.has(id)) {
        id = nextUserId();
      }
      usedIds.add(id);
      result.push(
        normalizeUser(
          {
            ...seed,
            id,
          },
          roles,
        ),
      );
      continue;
    }

    const existing = result[index];
    const merged = normalizeUser(
      {
        ...seed,
        ...existing,
        id: Number(existing.id) || Number(seed.id),
        phone: existing.phone || existing.phone_number || seed.phone || "",
        password: existing.password || seed.password,
        role_id: Number(existing.role_id) || Number(seed.role_id),
        role_name: existing.role_name || seed.role_name,
      },
      roles,
    );
    result[index] = merged;
    const id = Number(merged.id);
    if (id > 0) {
      usedIds.add(id);
    }
  }

  return result.map((user) => normalizeUser(user, roles));
}

function readStore() {
  const base = deepClone(DEFAULT_STORE);

  try {
    const raw =
      localStorage.getItem(KEY) ||
      LEGACY_KEYS.map((legacyKey) => localStorage.getItem(legacyKey)).find(Boolean);
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

    const beforeUsers = merged.users.map((user) => normalizeUser(user, merged.roles));
    const syncedUsers = syncUsersWithDefaults(beforeUsers, merged.roles);
    merged.users = syncedUsers;

    const usersById = new Map(syncedUsers.map((user) => [Number(user.id), user]));
    const beforeCasesSnapshot = JSON.stringify(merged.cases || []);
    merged.cases = normalizeCases(merged.cases, base.cases, usersById);
    const afterCasesSnapshot = JSON.stringify(merged.cases || []);
    const beforeAttachmentsSnapshot = JSON.stringify(merged.attachments || []);
    merged.attachments = normalizeAttachmentItems(merged.attachments, base.attachments);
    const afterAttachmentsSnapshot = JSON.stringify(merged.attachments || []);
    const beforeEvidenceSnapshot = JSON.stringify(merged.evidence || []);
    merged.evidence = normalizeEvidenceItems(merged.evidence, base.evidence, usersById);
    const afterEvidenceSnapshot = JSON.stringify(merged.evidence || []);
    const beforeNotificationsSnapshot = JSON.stringify(merged.notifications || []);
    merged.notifications = normalizeNotifications(merged);
    const afterNotificationsSnapshot = JSON.stringify(merged.notifications || []);

    if (
      syncedUsers.length !== beforeUsers.length ||
      beforeCasesSnapshot !== afterCasesSnapshot ||
      beforeAttachmentsSnapshot !== afterAttachmentsSnapshot ||
      beforeEvidenceSnapshot !== afterEvidenceSnapshot ||
      beforeNotificationsSnapshot !== afterNotificationsSnapshot
    ) {
      writeStore(merged);
    }
    return merged;
  } catch {
    return base;
  }
}

function writeStore(store) {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
    LEGACY_KEYS.forEach((legacyKey) => localStorage.removeItem(legacyKey));
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

function caseParticipantIds(store, caseId) {
  const id = Number(caseId);
  if (!id) return [];

  const target = store.cases.find((item) => Number(item.id) === id);
  if (!target) return [];

  const validUserIds = new Set((store.users || []).map((user) => Number(user.id)));
  const complainants = Array.isArray(target.complainant_ids) ? target.complainant_ids : [];
  return [
    Number(target.assigned_to),
    Number(target.created_by),
    ...complainants.map((item) => Number(item)),
  ].filter((value, index, list) => value > 0 && validUserIds.has(value) && list.indexOf(value) === index);
}

function resolveNotificationRecipients(store, relatedCaseId, recipientIds = []) {
  const validUserIds = new Set((store.users || []).map((user) => Number(user.id)));
  const explicit = Array.isArray(recipientIds) ? recipientIds : [recipientIds];
  const normalizedExplicit = explicit
    .map((item) => Number(item))
    .filter((item, index, list) => item > 0 && validUserIds.has(item) && list.indexOf(item) === index);
  if (normalizedExplicit.length) {
    return normalizedExplicit;
  }

  const participants = caseParticipantIds(store, relatedCaseId);
  if (participants.length) {
    return participants;
  }

  const fallback = Number(store.users?.[0]?.id);
  return fallback > 0 ? [fallback] : [];
}

function normalizeNotifications(store) {
  const source = Array.isArray(store.notifications) ? store.notifications : [];
  const normalized = [];
  const usedIds = new Set();
  const maxRawId = Math.max(0, ...source.map((item) => Number(item?.id) || 0));
  let nextGeneratedId = maxRawId + 1;

  const takeId = (preferredId) => {
    const candidate = Number(preferredId);
    if (candidate > 0 && !usedIds.has(candidate)) {
      usedIds.add(candidate);
      return candidate;
    }

    while (usedIds.has(nextGeneratedId)) nextGeneratedId += 1;
    const generated = nextGeneratedId;
    usedIds.add(generated);
    nextGeneratedId += 1;
    return generated;
  };

  for (const item of source) {
    const base = {
      message: String(item?.message || ""),
      related_case_id: Number(item?.related_case_id) || null,
      is_read: Boolean(item?.is_read),
    };
    if (item?.created_at) {
      base.created_at = item.created_at;
    }

    const recipientSeed =
      item?.recipient_user_id != null
        ? [item.recipient_user_id]
        : Array.isArray(item?.recipient_user_ids)
          ? item.recipient_user_ids
          : [];
    const recipients = resolveNotificationRecipients(store, base.related_case_id, recipientSeed);
    if (!recipients.length) {
      continue;
    }

    recipients.forEach((recipientId, index) => {
      normalized.push({
        id: takeId(index === 0 ? item?.id : null),
        ...base,
        recipient_user_id: Number(recipientId),
      });
    });
  }

  normalized.sort((a, b) => Number(b.id) - Number(a.id));
  return normalized;
}

function isNotificationVisibleToUser(store, notification, userId) {
  const recipientId = Number(notification?.recipient_user_id);
  if (recipientId > 0) {
    return recipientId === Number(userId);
  }
  const fallbackRecipients = resolveNotificationRecipients(store, notification?.related_case_id, []);
  return fallbackRecipients.includes(Number(userId));
}

function appendNotification(store, message, relatedCaseId, recipientIds = []) {
  const recipients = resolveNotificationRecipients(store, relatedCaseId, recipientIds);
  if (!recipients.length) {
    return [];
  }

  let id = nextId(store.notifications);
  const created = recipients.map((recipientId) => {
    const item = {
      id,
      message,
      related_case_id: Number(relatedCaseId) || null,
      is_read: false,
      recipient_user_id: Number(recipientId),
    };
    id += 1;
    return item;
  });
  store.notifications = [...created, ...store.notifications];
  return created;
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

export function mockListMyCases(token, params = {}) {
  const store = readStore();
  const user = assertAuthenticated(store, token);
  const status = normalizeText(params.status);
  const items = store.cases
    .filter((item) => isMyComplainantCase(item, user.id))
    .filter((item) => (status ? normalizeText(item.status) === status : true))
    .sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));
  return deepClone(items);
}

export function mockJoinCaseAsComplainant(token, caseId) {
  const store = readStore();
  const user = assertAuthenticated(store, token);
  const target = findCaseOrThrow(store, caseId);

  if (!isComplainantLikeRoleName(user.role_name)) {
    throw new Error("Only complainant-side roles can join cases.");
  }

  const status = normalizeText(target.status);
  if (["closed", "resolved", "voided"].includes(status)) {
    throw new Error("Only active cases can accept new complainants.");
  }

  const currentIds = Array.isArray(target.complainant_ids) ? target.complainant_ids : [];
  if (currentIds.some((id) => Number(id) === Number(user.id))) {
    return { joined: false, case_id: Number(caseId), message: "You are already attached to this case.", mocked: true };
  }

  target.complainant_ids = [...currentIds, Number(user.id)];
  target.updated_at = new Date().toISOString();
  appendNotification(store, `Complainant ${user.username} joined Case #${target.id}.`, target.id);
  writeStore(store);
  return { joined: true, case_id: Number(caseId), message: "Added to case successfully.", mocked: true };
}

export function mockGetCase(token, caseId) {
  const store = readStore();
  assertAuthenticated(store, token);
  return deepClone(findCaseOrThrow(store, caseId));
}

export function mockCreateCase(token, payload = {}) {
  const store = readStore();
  const actor = assertAuthenticated(store, token);
  const actorIsComplainant = isComplainantLikeRoleName(actor.role_name);
  const actorRole = String(actor.role_name || "");
  const title = String(payload.title || "").trim();
  if (!title) {
    throw new Error("title: This field is required.");
  }

  const detectiveId = normalizeOptionalUserId(payload.detective_id ?? payload.assigned_to);
  const internId = normalizeOptionalUserId(
    payload.intern_id ??
      payload.cadet_id ??
      (hasAnyKeyword(actorRole, ["cadet", "intern"]) ? actor.id : null),
  );
  const officerId = normalizeOptionalUserId(
    payload.officer_id ?? (hasAnyKeyword(actorRole, ["officer"]) ? actor.id : null),
  );

  const created = {
    id: nextId(store.cases),
    title,
    description: String(payload.description || "").trim(),
    level: Number(payload.level) || 3,
    status: "open",
    intern_id: internId,
    officer_id: officerId,
    supervisor_id: normalizeOptionalUserId(payload.supervisor_id),
    detective_id: detectiveId,
    judge_id: normalizeOptionalUserId(payload.judge_id),
    assigned_to: detectiveId,
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    created_by: actor.id,
    created_by_role: actorRole,
    complainant_ids: actorIsComplainant ? [actor.id] : [],
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

  const allowed = [
    "title",
    "description",
    "level",
    "status",
    "assigned_to",
    "created_by_role",
    "intern_id",
    "officer_id",
    "supervisor_id",
    "detective_id",
    "judge_id",
  ];
  for (const field of allowed) {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      target[field] = payload[field];
    }
  }

  if (Object.prototype.hasOwnProperty.call(payload, "detective_id")) {
    target.detective_id = normalizeOptionalUserId(payload.detective_id);
    target.assigned_to = normalizeOptionalUserId(payload.detective_id);
  } else if (Object.prototype.hasOwnProperty.call(payload, "assigned_to")) {
    target.assigned_to = normalizeOptionalUserId(payload.assigned_to);
    target.detective_id = normalizeOptionalUserId(payload.assigned_to);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "intern_id")) {
    target.intern_id = normalizeOptionalUserId(payload.intern_id);
  }
  if (Object.prototype.hasOwnProperty.call(payload, "officer_id")) {
    target.officer_id = normalizeOptionalUserId(payload.officer_id);
  }
  if (Object.prototype.hasOwnProperty.call(payload, "supervisor_id")) {
    target.supervisor_id = normalizeOptionalUserId(payload.supervisor_id);
  }
  if (Object.prototype.hasOwnProperty.call(payload, "judge_id")) {
    target.judge_id = normalizeOptionalUserId(payload.judge_id);
  }

  target.updated_at = new Date().toISOString();

  writeStore(store);
  return deepClone(target);
}

export function mockListTags() {
  return deepClone(readStore().tags);
}

function evidenceAttachmentsMap(store) {
  const map = new Map();
  (store.attachments || []).forEach((item) => {
    const evidenceId = Number(item?.evidence);
    if (!evidenceId) return;
    const rows = map.get(evidenceId) || [];
    rows.push({
      id: Number(item?.id) || null,
      evidence: evidenceId,
      file_url: String(item?.file_url || "").trim(),
      file_path: String(item?.file_path || "").trim(),
      mime_type: String(item?.mime_type || "").trim(),
      original_name: String(item?.original_name || "").trim(),
      uploaded_at: item?.uploaded_at || null,
    });
    map.set(evidenceId, rows);
  });
  return map;
}

export function mockListEvidence(token, caseId) {
  const store = readStore();
  assertAuthenticated(store, token);
  const attachmentsByEvidence = evidenceAttachmentsMap(store);
  const items = store.evidence
    .filter((item) => Number(item.case) === Number(caseId))
    .sort((a, b) => Number(a.id) - Number(b.id))
    .map((item) => ({
      ...item,
      attachments: attachmentsByEvidence.get(Number(item.id)) || [],
    }));
  return deepClone(items);
}

export function mockCreateEvidence(token, payload = {}) {
  const store = readStore();
  const actor = assertAuthenticated(store, token);

  const caseId = Number(payload.case);
  if (!caseId) {
    throw new Error("case: This field is required.");
  }
  findCaseOrThrow(store, caseId);

  const type = String(payload.type || "").trim();
  if (!type) {
    throw new Error("type: This field is required.");
  }
  const title = String(payload.title || "").trim();
  if (!title) {
    throw new Error("title: This field is required.");
  }
  const description = String(payload.description || "").trim();
  if (!description) {
    throw new Error("description: This field is required.");
  }

  const parsedRegisteredAt = payload.registered_at ? new Date(payload.registered_at) : null;
  const registeredAt =
    parsedRegisteredAt && !Number.isNaN(parsedRegisteredAt.valueOf())
      ? parsedRegisteredAt.toISOString()
      : new Date().toISOString();

  const metadata =
    payload.metadata && typeof payload.metadata === "object" && !Array.isArray(payload.metadata)
      ? payload.metadata
      : {};
  const submitterName = String(payload.submitter_name || actor.username || "").trim();
  const submitterRole = String(payload.submitter_role || actor.role_name || "").trim();

  const created = {
    id: nextId(store.evidence),
    case: caseId,
    type,
    title,
    description,
    registered_at: registeredAt,
    metadata,
    submitter_id: Number(actor.id) || null,
    submitter_name: submitterName,
    submitter_role: submitterRole,
    submitted_by_role: submitterRole,
    status: "pending",
    created_at: new Date().toISOString(),
  };
  store.evidence.push(created);
  appendNotification(store, `Evidence #${created.id} (${title}) added to Case #${caseId}.`, caseId);
  writeStore(store);
  return deepClone({
    ...created,
    attachments: [],
  });
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
    file_url: String(payload.file_url || "").trim(),
    file_path: String(payload.file_path || "").trim(),
    mime_type: String(payload.mime_type || "").trim(),
    original_name: String(payload.original_name || "").trim(),
    uploaded_at: new Date().toISOString(),
  };
  if (!created.file_url && !created.file_path) {
    throw new Error("Attachment requires file_url or file_path.");
  }
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
  if (created.action_type.includes("suspect_referred_to_sergeant")) {
    const caseItem = store.cases.find((item) => Number(item.id) === caseId);
    const supervisorId = Number(caseItem?.supervisor_id) || null;
    const supervisorRole = roleByUserId(store, supervisorId);
    const recipients = supervisorId && hasAnyKeyword(supervisorRole, ["sergeant"]) ? [supervisorId] : [];
    appendNotification(
      store,
      `Detective referred a suspect to sergeant for Case #${caseId}.`,
      caseId,
      recipients,
    );
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
  const store = readStore();
  return deepClone(
    (store.users || []).map((user) => ({
      role_name: user.role_name,
      identifier: user.username,
      password: user.password,
      email: user.email,
    })),
  );
}

export function mockListAdminCaseQueue(token, queueType) {
  const store = readStore();
  assertAdmin(store, token);
  const matched = matchQueueCases(store, queueType).sort(
    (a, b) => String(b.updated_at).localeCompare(String(a.updated_at)),
  );
  return deepClone(matched);
}

function validateAssignmentUserRole(store, userId, allowedKeywords, fieldLabel) {
  const normalizedUserId = normalizeOptionalUserId(userId);
  if (!normalizedUserId) {
    return null;
  }

  const user = (store.users || []).find((item) => Number(item.id) === Number(normalizedUserId));
  if (!user) {
    throw new Error(`${fieldLabel}: User #${normalizedUserId} was not found.`);
  }

  if (!hasAnyKeyword(user.role_name, allowedKeywords)) {
    throw new Error(
      `${fieldLabel}: user role "${user.role_name}" is not allowed for this assignment.`,
    );
  }
  return normalizedUserId;
}

export function mockAssignCasePersonnel(token, caseId, payload = {}) {
  const store = readStore();
  assertAdmin(store, token);
  const target = findCaseOrThrow(store, caseId);

  const nextInternId = Object.prototype.hasOwnProperty.call(payload, "intern_id")
    ? validateAssignmentUserRole(store, payload.intern_id, ["cadet", "intern"], "intern_id")
    : target.intern_id ?? null;
  const nextOfficerId = Object.prototype.hasOwnProperty.call(payload, "officer_id")
    ? validateAssignmentUserRole(store, payload.officer_id, ["officer", "patrol"], "officer_id")
    : target.officer_id ?? null;
  const nextSupervisorId = Object.prototype.hasOwnProperty.call(payload, "supervisor_id")
    ? validateAssignmentUserRole(
      store,
      payload.supervisor_id,
      ["sergeant", "captain", "chief", "supervisor", "admin"],
      "supervisor_id",
    )
    : target.supervisor_id ?? null;
  const nextDetectiveId = Object.prototype.hasOwnProperty.call(payload, "detective_id")
    ? validateAssignmentUserRole(store, payload.detective_id, ["detective"], "detective_id")
    : target.detective_id ?? target.assigned_to ?? null;
  const nextJudgeId = Object.prototype.hasOwnProperty.call(payload, "judge_id")
    ? validateAssignmentUserRole(store, payload.judge_id, ["judge"], "judge_id")
    : target.judge_id ?? null;

  const changedPayload = {};
  const assignIfChanged = (field, nextValue, currentValue) => {
    const before = normalizeOptionalUserId(currentValue);
    const after = normalizeOptionalUserId(nextValue);
    if (before !== after) {
      changedPayload[field] = after;
    }
    target[field] = after;
  };

  assignIfChanged("intern_id", nextInternId, target.intern_id);
  assignIfChanged("officer_id", nextOfficerId, target.officer_id);
  assignIfChanged("supervisor_id", nextSupervisorId, target.supervisor_id);
  assignIfChanged("detective_id", nextDetectiveId, target.detective_id);
  assignIfChanged("judge_id", nextJudgeId, target.judge_id);

  const currentAssignedTo = normalizeOptionalUserId(target.assigned_to);
  const nextAssignedTo = normalizeOptionalUserId(nextDetectiveId);
  if (currentAssignedTo !== nextAssignedTo) {
    changedPayload.assigned_to = nextAssignedTo;
  }
  target.assigned_to = nextAssignedTo;
  target.updated_at = new Date().toISOString();

  const changedUserIds = Object.values(changedPayload)
    .map((value) => normalizeOptionalUserId(value))
    .filter((value) => value > 0);

  if (Object.keys(changedPayload).length) {
    store.actions.push({
      id: nextId(store.actions),
      case: Number(caseId),
      action_type: "admin_case_assignment",
      payload: changedPayload,
      created_at: new Date().toISOString(),
    });
  }

  if (changedUserIds.length) {
    appendNotification(
      store,
      `Case #${target.id} assignment updated by system admin.`,
      target.id,
      [...new Set(changedUserIds)],
    );
  }

  writeStore(store);
  return deepClone({
    ...target,
    mocked: true,
  });
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

export function getMockNotifications(token) {
  const store = readStore();
  const user = assertAuthenticated(store, token);
  const items = (store.notifications || [])
    .filter((item) => isNotificationVisibleToUser(store, item, user.id))
    .sort((a, b) => Number(b.id) - Number(a.id));
  return deepClone(items);
}

export function setMockNotificationRead(token, notificationId) {
  const store = readStore();
  const user = assertAuthenticated(store, token);
  const id = Number(notificationId);
  const index = (store.notifications || []).findIndex(
    (item) => Number(item.id) === id && isNotificationVisibleToUser(store, item, user.id),
  );
  if (index < 0) {
    throw new Error(`Notification #${notificationId} was not found.`);
  }
  store.notifications[index] = {
    ...store.notifications[index],
    is_read: true,
  };
  writeStore(store);
  return deepClone(store.notifications[index]);
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
