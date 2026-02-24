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
      submitter_id: 5,
      submitter_name: "detective",
      submitter_role: "Detective",
      submitted_by_role: "Detective",
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
      submitter_id: 5,
      submitter_name: "detective",
      submitter_role: "Detective",
      submitted_by_role: "Detective",
      metadata: {
        sample_type: "blood stain",
        doctor_notes: "",
        identity_db_notes: "",
      },
      status: "pending_forensic",
      created_at: "2026-02-21T08:35:00.000Z",
    },
    {
      id: 13,
      case: 7,
      type: "testimony",
      title: "Eyewitness statement near ATM",
      description: "A local resident reported a suspicious exchange near the ATM terminal.",
      registered_at: "2026-02-19T16:20:00.000Z",
      submitter_id: 5,
      submitter_name: "detective",
      submitter_role: "Detective",
      submitted_by_role: "Detective",
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
  tips: [
    {
      id: 1,
      case_id: 7,
      title: "Suspicious scooter near ATM branch",
      description: "I saw a black scooter waiting around the ATM for more than an hour.",
      suspect_hint: "Rider had a dragon tattoo on left hand.",
      submitter_user_id: 13,
      submitter_name: "basic",
      submitter_national_id: "1000000013",
      status: "pending_officer",
      officer_id: 6,
      detective_id: null,
      officer_note: "",
      detective_note: "",
      reward_code: "",
      reward_amount: null,
      attachments: [],
      created_at: "2026-02-21T10:30:00.000Z",
      updated_at: "2026-02-21T10:30:00.000Z",
    },
    {
      id: 2,
      case_id: 4,
      title: "Local witness voice recording",
      description: "Neighbor recorded two voices arguing near the pharmacy back door.",
      suspect_hint: "",
      submitter_user_id: 13,
      submitter_name: "basic",
      submitter_national_id: "1000000013",
      status: "pending_detective",
      officer_id: 6,
      detective_id: 5,
      officer_note: "Initial check done. Seems relevant.",
      detective_note: "",
      reward_code: "",
      reward_amount: null,
      attachments: [
        {
          id: 1,
          file_url: "https://example.com/tips/audio-2.mp3",
          file_path: "",
          mime_type: "audio/mpeg",
          original_name: "voice_note.mp3",
          uploaded_at: "2026-02-21T11:02:00.000Z",
        },
      ],
      created_at: "2026-02-21T11:00:00.000Z",
      updated_at: "2026-02-21T11:05:00.000Z",
    },
  ],
  payments: [
    {
      id: "pm_1",
      type: "reward",
      amount: 150,
      code: "RW-2026-001",
      status: "completed",
      tip_id: 0,
      case_id: 4,
      user_id: 13,
      national_id: "1000000013",
      user_name: "basic",
      created_at: "2026-02-20T17:00:00.000Z",
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

function isBasicUserRoleName(roleName) {
  return hasAnyKeyword(roleName, ["basic user", "ordinary user", "normal user"]);
}

function isOfficerRoleName(roleName) {
  return hasAnyKeyword(roleName, ["officer", "patrol"]);
}

function isCadetRoleName(roleName) {
  return hasAnyKeyword(roleName, ["cadet", "intern"]);
}

function isDetectiveRoleName(roleName) {
  return hasAnyKeyword(roleName, ["detective"]);
}

function isSergeantRoleName(roleName) {
  return hasAnyKeyword(roleName, ["sergeant"]);
}

function isCaptainRoleName(roleName) {
  return hasAnyKeyword(roleName, ["captain"]);
}

function isChiefRoleName(roleName) {
  return hasAnyKeyword(roleName, ["chief", "police chief"]);
}

function isCoronerRoleName(roleName) {
  return hasAnyKeyword(roleName, ["coroner", "forensic", "medical examiner"]);
}

function isPoliceRankRoleName(roleName) {
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

function nowIsoString() {
  return new Date().toISOString();
}

function policeRoleRank(roleName) {
  if (isCadetRoleName(roleName)) return 1;
  if (isOfficerRoleName(roleName)) return 2;
  if (isDetectiveRoleName(roleName)) return 2;
  if (isCoronerRoleName(roleName)) return 2;
  if (isSergeantRoleName(roleName)) return 3;
  if (isCaptainRoleName(roleName)) return 4;
  if (isChiefRoleName(roleName)) return 5;
  return 0;
}

function nextPaymentId(payments = []) {
  const prefix = "pm_";
  const maxNumeric = (Array.isArray(payments) ? payments : []).reduce((max, item) => {
    const raw = String(item?.id || "");
    if (!raw.startsWith(prefix)) return max;
    const num = Number(raw.slice(prefix.length));
    if (!Number.isFinite(num)) return max;
    return Math.max(max, num);
  }, 0);
  return `${prefix}${maxNumeric + 1}`;
}

function nextAttachmentId(rows = []) {
  if (!Array.isArray(rows) || !rows.length) return 1;
  return Math.max(...rows.map((item) => Number(item?.id) || 0)) + 1;
}

function buildRewardCode(store) {
  const year = new Date().getUTCFullYear();
  const existingCodes = new Set(
    (store.payments || [])
      .map((item) => String(item?.code || "").trim().toUpperCase())
      .filter(Boolean),
  );

  let seq = 1;
  while (seq <= 999999) {
    const code = `RW-${year}-${String(seq).padStart(4, "0")}`;
    if (!existingCodes.has(code)) {
      return code;
    }
    seq += 1;
  }
  return `RW-${year}-${Date.now()}`;
}

function matchQueueCases(store, queueType) {
  const queue = normalizeText(queueType);
  return (store.cases || []).filter((item) => {
    const active = isActiveCaseStatus(item.status);
    if (!active) return false;

    const internId = normalizeOptionalUserId(item.intern_id ?? item.cadet_id);
    const officerId = normalizeOptionalUserId(item.officer_id);
    const supervisorId = normalizeOptionalUserId(item.supervisor_id);
    const sergeantId = normalizeOptionalUserId(item.sergeant_id ?? supervisorId);
    const captainId = normalizeOptionalUserId(item.captain_id);
    const chiefId = normalizeOptionalUserId(item.chief_id);
    const detectiveId = normalizeOptionalUserId(item.detective_id ?? item.assigned_to);
    const coronerId = normalizeOptionalUserId(item.coroner_id);
    const judgeId = normalizeOptionalUserId(item.judge_id);
    const creatorRole = String(item.created_by_role || roleByUserId(store, item.created_by) || "");

    if (queue === "intern_unassigned") {
      return !internId;
    }
    if (queue === "officer_unassigned") {
      return !officerId;
    }
    if (queue === "police_without_supervisor" || queue === "command_chain_unassigned") {
      return isPoliceRoleName(creatorRole) && (!sergeantId || !captainId || !chiefId);
    }
    if (queue === "specialists_unassigned") {
      return !detectiveId || !judgeId || !coronerId;
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
      sergeant_id: normalizeOptionalUserId(
        item.sergeant_id ?? item.supervisor_id ?? fallbackCase?.sergeant_id ?? fallbackCase?.supervisor_id,
      ),
      captain_id: normalizeOptionalUserId(item.captain_id ?? fallbackCase?.captain_id),
      chief_id: normalizeOptionalUserId(item.chief_id ?? fallbackCase?.chief_id),
      detective_id: detectiveId,
      coroner_id: normalizeOptionalUserId(item.coroner_id ?? fallbackCase?.coroner_id),
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
      tips: Array.isArray(parsed.tips) ? parsed.tips : base.tips,
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

function findEvidenceOrThrow(store, evidenceId) {
  const id = Number(evidenceId);
  const found = (store.evidence || []).find((item) => Number(item.id) === id);
  if (!found) {
    throw new Error(`Evidence #${id} was not found.`);
  }
  return found;
}

function findTipOrThrow(store, tipId) {
  const id = Number(tipId);
  const found = (store.tips || []).find((item) => Number(item.id) === id);
  if (!found) {
    throw new Error(`Tip #${id} was not found.`);
  }
  return found;
}

function userById(store, userId) {
  return (store.users || []).find((item) => Number(item.id) === Number(userId)) || null;
}

function caseOfficerId(caseItem) {
  return normalizeOptionalUserId(caseItem?.officer_id);
}

function caseDetectiveId(caseItem) {
  return normalizeOptionalUserId(caseItem?.detective_id ?? caseItem?.assigned_to);
}

function isTipStatusPendingOfficer(status) {
  return normalizeText(status) === "pending_officer";
}

function isTipStatusPendingDetective(status) {
  return normalizeText(status) === "pending_detective";
}

function createStoredAttachmentFromPayload(payload = {}, fallbackId = 1) {
  const file = payload?.file;
  let fileUrl = String(payload?.file_url || "").trim();
  const filePath = String(payload?.file_path || "").trim();
  let mimeType = String(payload?.mime_type || "").trim();
  let originalName = String(payload?.original_name || "").trim();

  if (file && typeof file === "object") {
    if (!mimeType && typeof file.type === "string") {
      mimeType = file.type;
    }
    if (!originalName && typeof file.name === "string") {
      originalName = file.name;
    }
    if (!fileUrl) {
      if (typeof URL !== "undefined" && typeof URL.createObjectURL === "function") {
        try {
          fileUrl = URL.createObjectURL(file);
        } catch {
          fileUrl = `mock://upload/${originalName || `file-${fallbackId}`}`;
        }
      } else {
        fileUrl = `mock://upload/${originalName || `file-${fallbackId}`}`;
      }
    }
  }

  return {
    id: Number(payload?.id) || fallbackId,
    file_url: fileUrl,
    file_path: filePath,
    mime_type: mimeType,
    original_name: originalName,
    uploaded_at: payload?.uploaded_at || nowIsoString(),
  };
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

function cadetReviewRecipients(store, caseItem) {
  const assignedCadetId = normalizeOptionalUserId(caseItem?.intern_id);
  if (assignedCadetId) return [assignedCadetId];
  return (store.users || [])
    .filter((user) => isCadetRoleName(user?.role_name))
    .map((user) => Number(user.id))
    .filter((id) => id > 0);
}

function officerReviewRecipients(store, caseItem) {
  const assignedOfficerId = normalizeOptionalUserId(caseItem?.officer_id);
  if (assignedOfficerId) return [assignedOfficerId];
  return (store.users || [])
    .filter((user) => isOfficerRoleName(user?.role_name))
    .map((user) => Number(user.id))
    .filter((id) => id > 0);
}

function superiorApprovalRecipients(store, caseItem) {
  const creatorRole = String(caseItem?.created_by_role || roleByUserId(store, caseItem?.created_by) || "");
  const creatorRank = policeRoleRank(creatorRole);
  return (store.users || [])
    .filter((user) => {
      if (Number(user?.id) === Number(caseItem?.created_by)) return false;
      const roleName = String(user?.role_name || "");
      if (isCadetRoleName(roleName)) return false;
      if (!(isPoliceRankRoleName(roleName) || isCoronerRoleName(roleName))) return false;
      const rank = policeRoleRank(roleName);
      if (isCoronerRoleName(roleName)) return true;
      return rank > creatorRank;
    })
    .map((user) => Number(user.id))
    .filter((id) => id > 0);
}

function buildInitialWorkflowForNewCase(store, caseItem, actor) {
  const actorRole = String(actor?.role_name || "");
  const actorIsComplainant = isComplainantLikeRoleName(actorRole);
  const actorIsPoliceSceneCreator =
    isPoliceRankRoleName(actorRole) &&
    !isCadetRoleName(actorRole) &&
    !actorIsComplainant;

  if (actorIsComplainant) {
    return {
      path: "complaint",
      stage: "pending_cadet_review",
      status: "pending_cadet_review",
      rejection_count: 0,
      complainant_revision_count: 0,
      last_comment: "",
      is_voided: false,
      formed: false,
      last_actor_role: actorRole,
      history: [
        {
          id: 1,
          at: nowIsoString(),
          action: "complaint_submitted",
          by_user_id: Number(actor.id) || null,
          by_role: actorRole,
          comment: "",
        },
      ],
    };
  }

  if (actorIsPoliceSceneCreator) {
    const chiefCreator = isChiefRoleName(actorRole);
    return {
      path: "crime_scene",
      stage: chiefCreator ? "formed" : "pending_superior_approval",
      status: chiefCreator ? "formed" : "pending_superior_approval",
      rejection_count: 0,
      complainant_revision_count: 0,
      last_comment: "",
      is_voided: false,
      formed: chiefCreator,
      last_actor_role: actorRole,
      history: [
        {
          id: 1,
          at: nowIsoString(),
          action: "scene_case_registered",
          by_user_id: Number(actor.id) || null,
          by_role: actorRole,
          comment: "",
        },
      ],
    };
  }

  return {
    path: "complaint",
    stage: "pending_cadet_review",
    status: "pending_cadet_review",
    rejection_count: 0,
    complainant_revision_count: 0,
    last_comment: "",
    is_voided: false,
    formed: false,
    last_actor_role: actorRole,
    history: [],
  };
}

function mapCaseStatusFromWorkflow(workflow) {
  if (!workflow) return "open";
  if (workflow.is_voided) return "voided";
  if (workflow.formed || workflow.stage === "formed" || workflow.status === "formed") {
    return "open";
  }
  return String(workflow.stage || workflow.status || "open");
}

export function mockCreateCase(token, payload = {}) {
  const store = readStore();
  const actor = assertAuthenticated(store, token);
  const actorIsComplainant = isComplainantLikeRoleName(actor.role_name);
  const actorRole = String(actor.role_name || "");
  const actorIsPoliceSceneCreator =
    isPoliceRankRoleName(actorRole) &&
    !isCadetRoleName(actorRole) &&
    !actorIsComplainant;
  const actorCanCreateCase = actorIsComplainant || actorIsPoliceSceneCreator || isSystemAdmin(actor);

  if (!actorCanCreateCase) {
    throw new Error("Only complainant users or police ranks (except cadet) can create cases.");
  }
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
  const sergeantId = normalizeOptionalUserId(payload.sergeant_id ?? payload.supervisor_id);
  const detectiveMedicalId = normalizeOptionalUserId(payload.coroner_id);

  const created = {
    id: nextId(store.cases),
    title,
    description: String(payload.description || "").trim(),
    creation_method: String(payload.creation_method || (actorIsComplainant ? "complaint" : "crime_scene")).trim(),
    location: String(payload.location || "").trim(),
    incident_datetime: payload.incident_datetime || null,
    witnesses: Array.isArray(payload.witnesses) ? payload.witnesses : [],
    level: Number(payload.level) || 3,
    status: "open",
    intern_id: internId,
    officer_id: officerId,
    supervisor_id: sergeantId,
    sergeant_id: sergeantId,
    captain_id: normalizeOptionalUserId(payload.captain_id),
    chief_id: normalizeOptionalUserId(payload.chief_id),
    detective_id: detectiveId,
    coroner_id: detectiveMedicalId,
    judge_id: normalizeOptionalUserId(payload.judge_id),
    assigned_to: detectiveId,
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    created_by: actor.id,
    created_by_role: actorRole,
    complainant_ids: actorIsComplainant ? [actor.id] : [],
  };

  const workflow = buildInitialWorkflowForNewCase(store, created, actor);
  created.status = mapCaseStatusFromWorkflow(workflow);
  store.cases.push(created);
  store.workflowByCase[String(created.id)] = workflow;

  if (workflow.path === "complaint") {
    appendNotification(
      store,
      `New complaint case #${created.id} submitted and waiting for cadet review.`,
      created.id,
      cadetReviewRecipients(store, created),
    );
    appendNotification(
      store,
      `Your complaint case #${created.id} was submitted for initial review.`,
      created.id,
      created.complainant_ids,
    );
  } else if (!workflow.formed) {
    appendNotification(
      store,
      `Crime scene case #${created.id} needs superior approval.`,
      created.id,
      superiorApprovalRecipients(store, created),
    );
    appendNotification(
      store,
      `Case #${created.id} registered and sent for superior approval.`,
      created.id,
      [created.created_by],
    );
  } else {
    appendNotification(
      store,
      `Case #${created.id} registered by chief and formed immediately.`,
      created.id,
      [created.created_by],
    );
  }
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
    "sergeant_id",
    "captain_id",
    "chief_id",
    "detective_id",
    "coroner_id",
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
    if (!Object.prototype.hasOwnProperty.call(payload, "sergeant_id")) {
      target.sergeant_id = normalizeOptionalUserId(payload.supervisor_id);
    }
  }
  if (Object.prototype.hasOwnProperty.call(payload, "sergeant_id")) {
    target.sergeant_id = normalizeOptionalUserId(payload.sergeant_id);
    target.supervisor_id = normalizeOptionalUserId(payload.sergeant_id);
  }
  if (Object.prototype.hasOwnProperty.call(payload, "captain_id")) {
    target.captain_id = normalizeOptionalUserId(payload.captain_id);
  }
  if (Object.prototype.hasOwnProperty.call(payload, "chief_id")) {
    target.chief_id = normalizeOptionalUserId(payload.chief_id);
  }
  if (Object.prototype.hasOwnProperty.call(payload, "judge_id")) {
    target.judge_id = normalizeOptionalUserId(payload.judge_id);
  }
  if (Object.prototype.hasOwnProperty.call(payload, "coroner_id")) {
    target.coroner_id = normalizeOptionalUserId(payload.coroner_id);
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
  if (!isDetectiveRoleName(actor.role_name)) {
    throw new Error("Only detective users can register evidence.");
  }

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
    status: normalizeText(type) === "bio_medical" ? "pending_forensic" : "pending",
    created_at: new Date().toISOString(),
  };
  store.evidence.push(created);
  if (normalizeText(type) === "bio_medical") {
    const coronerRecipients = (store.users || [])
      .filter((item) => isCoronerRoleName(item?.role_name))
      .map((item) => Number(item.id))
      .filter((id) => id > 0);
    appendNotification(
      store,
      `Biological evidence #${created.id} requires forensic review for Case #${caseId}.`,
      caseId,
      coronerRecipients,
    );
  } else {
    appendNotification(store, `Evidence #${created.id} (${title}) added to Case #${caseId}.`, caseId);
  }
  writeStore(store);
  return deepClone({
    ...created,
    attachments: [],
  });
}

export function mockVerifyEvidence(token, evidenceId) {
  const store = readStore();
  const actor = assertAuthenticated(store, token);

  const target = findEvidenceOrThrow(store, evidenceId);
  if (normalizeText(target.type) === "bio_medical") {
    if (!isCoronerRoleName(actor.role_name)) {
      throw new Error("Biological evidence must be reviewed by coroner / forensic role.");
    }
    target.status = "verified";
    target.verified_at = new Date().toISOString();
    target.metadata = {
      ...(target.metadata || {}),
      doctor_notes: String(target.metadata?.doctor_notes || "").trim(),
      identity_db_notes: String(target.metadata?.identity_db_notes || "").trim(),
    };
    appendNotification(
      store,
      `Biological evidence #${target.id} was approved by forensic review.`,
      target.case,
      [target.submitter_id].filter((id) => Number(id) > 0),
    );
    writeStore(store);
    return deepClone(target);
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

  const createdBase = createStoredAttachmentFromPayload(payload, nextId(store.attachments));
  const created = {
    id: createdBase.id,
    evidence: evidenceId,
    file_url: createdBase.file_url,
    file_path: createdBase.file_path,
    mime_type: createdBase.mime_type,
    original_name: createdBase.original_name,
    uploaded_at: createdBase.uploaded_at,
  };
  if (!created.file_url && !created.file_path) {
    throw new Error("Attachment requires file_url or file_path.");
  }
  store.attachments.push(created);
  writeStore(store);
  return deepClone(created);
}

export function mockListForensicEvidenceQueue(token) {
  const store = readStore();
  const actor = assertAuthenticated(store, token);
  if (!isCoronerRoleName(actor.role_name)) {
    throw new Error("Only coroner / forensic users can access this queue.");
  }

  const attachmentsByEvidence = evidenceAttachmentsMap(store);
  const queue = (store.evidence || [])
    .filter((item) => normalizeText(item.type) === "bio_medical")
    .filter((item) => ["pending_forensic", "forensic_rejected", "verified"].includes(normalizeText(item.status)))
    .map((item) => {
      const caseItem = (store.cases || []).find((c) => Number(c.id) === Number(item.case)) || null;
      const detectiveId = caseDetectiveId(caseItem);
      return {
        ...item,
        case_title: caseItem?.title || "",
        detective_id: detectiveId,
        attachments: attachmentsByEvidence.get(Number(item.id)) || [],
      };
    })
    .sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));

  return deepClone(queue);
}

export function mockReviewForensicEvidence(token, evidenceId, payload = {}) {
  const store = readStore();
  const actor = assertAuthenticated(store, token);
  if (!isCoronerRoleName(actor.role_name)) {
    throw new Error("Only coroner / forensic users can review biological evidence.");
  }

  const target = findEvidenceOrThrow(store, evidenceId);
  if (normalizeText(target.type) !== "bio_medical") {
    throw new Error("Forensic review is only for biological/medical evidence.");
  }

  const approved = Boolean(payload?.approved);
  const doctorNotes = String(payload?.doctor_notes || "").trim();
  const identityDbNotes = String(payload?.identity_db_notes || "").trim();
  const reviewComment = String(payload?.comment || "").trim();
  target.metadata = {
    ...(target.metadata || {}),
    doctor_notes: doctorNotes,
    identity_db_notes: identityDbNotes,
    forensic_comment: reviewComment,
    forensic_reviewer_id: Number(actor.id) || null,
    forensic_reviewer_name: String(actor.username || "").trim(),
    forensic_reviewed_at: nowIsoString(),
  };
  target.status = approved ? "verified" : "forensic_rejected";
  target.verified_at = approved ? nowIsoString() : null;

  const relatedCase = findCaseOrThrow(store, target.case);
  const detectiveId = caseDetectiveId(relatedCase);
  appendNotification(
    store,
    approved
      ? `Forensic approved biological evidence #${target.id} for Case #${target.case}.`
      : `Forensic rejected biological evidence #${target.id} for Case #${target.case}.`,
    target.case,
    [detectiveId].filter((id) => Number(id) > 0),
  );
  writeStore(store);
  return deepClone(target);
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
  const actor = assertAuthenticated(store, token);
  const caseId = Number(payload.case);
  if (!caseId) {
    throw new Error("case: This field is required.");
  }
  const caseItem = findCaseOrThrow(store, caseId);
  const actionType = normalizeText(payload.action_type || "action");
  const caseDetectiveUserId = caseDetectiveId(caseItem);
  const caseSergeantUserId = normalizeOptionalUserId(caseItem?.sergeant_id ?? caseItem?.supervisor_id);
  const caseCaptainUserId = normalizeOptionalUserId(caseItem?.captain_id);
  const caseChiefUserId = normalizeOptionalUserId(caseItem?.chief_id);

  if (["suspect_referred_to_sergeant", "detective_interrogation_score"].includes(actionType)) {
    if (!isDetectiveRoleName(actor.role_name)) {
      throw new Error("Only detective can perform this action.");
    }
    if (caseDetectiveUserId && Number(caseDetectiveUserId) !== Number(actor.id)) {
      throw new Error("This case is assigned to another detective.");
    }
  }
  if (["sergeant_referral_decision", "sergeant_interrogation_score"].includes(actionType)) {
    if (!isSergeantRoleName(actor.role_name)) {
      throw new Error("Only sergeant can perform this action.");
    }
    if (caseSergeantUserId && Number(caseSergeantUserId) !== Number(actor.id)) {
      throw new Error("This case is assigned to another sergeant.");
    }
  }
  if (["captain_suspect_verdict", "captain_verdict_mock"].includes(actionType)) {
    if (!isCaptainRoleName(actor.role_name)) {
      throw new Error("Only captain can perform this action.");
    }
    if (caseCaptainUserId && Number(caseCaptainUserId) !== Number(actor.id)) {
      throw new Error("This case is assigned to another captain.");
    }
  }
  if (actionType === "chief_captain_verdict_review") {
    if (!isChiefRoleName(actor.role_name)) {
      throw new Error("Only police chief can review captain verdicts on critical cases.");
    }
    if (caseChiefUserId && Number(caseChiefUserId) !== Number(actor.id)) {
      throw new Error("This case is assigned to another police chief.");
    }
  }

  const created = {
    id: nextId(store.actions),
    case: caseId,
    action_type: String(payload.action_type || "action"),
    payload: payload.payload || {},
    created_at: new Date().toISOString(),
  };

  store.actions.push(created);
  const actionTypeStored = normalizeText(created.action_type);
  const payloadData = created.payload && typeof created.payload === "object" ? created.payload : {};
  const suspectId = Number(payloadData.suspect_id) || null;
  const suspect = suspectId
    ? (store.suspects || []).find((item) => Number(item.id) === suspectId && Number(item.case) === caseId) || null
    : null;
  const detectiveId = caseDetectiveId(caseItem);
  const sergeantId = normalizeOptionalUserId(caseItem?.sergeant_id ?? caseItem?.supervisor_id);
  const captainId = normalizeOptionalUserId(caseItem?.captain_id);
  const chiefId = normalizeOptionalUserId(caseItem?.chief_id);
  const judgeId = normalizeOptionalUserId(caseItem?.judge_id);
  const isCriticalCase =
    Number(caseItem?.level) === 4 || normalizeText(caseItem?.crime_level) === "critical";

  const latestSuspectAction = (matcher) => {
    if (!suspectId) return null;
    const rows = (store.actions || [])
      .filter((item) => Number(item.case) === caseId)
      .filter((item) => Number(item?.payload?.suspect_id) === suspectId)
      .filter((item) => matcher(normalizeText(item.action_type), item))
      .sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
    return rows[0] || null;
  };

  const latestDetectiveScore = () =>
    latestSuspectAction((type) => type === "detective_interrogation_score");
  const latestSergeantScore = () =>
    latestSuspectAction((type) => type === "sergeant_interrogation_score");
  const latestCaptainVerdict = () =>
    latestSuspectAction((type) => type === "captain_suspect_verdict" || type === "captain_verdict_mock");

  const bumpCaseUpdatedAt = () => {
    caseItem.updated_at = nowIsoString();
  };

  if (actionTypeStored === "interrogation_scored") {
    if (suspect) {
      suspect.status = "scored_for_captain_review";
    }
    bumpCaseUpdatedAt();
    appendNotification(
      store,
      `Interrogation score submitted for Case #${caseId}.`,
      caseId,
      [captainId].filter((id) => Number(id) > 0),
    );
  }

  if (actionTypeStored === "suspect_referred_to_sergeant") {
    if (suspect) {
      suspect.status = "referred_to_sergeant";
    }
    bumpCaseUpdatedAt();
    const supervisorRole = roleByUserId(store, sergeantId);
    const recipients = sergeantId && hasAnyKeyword(supervisorRole, ["sergeant"]) ? [sergeantId] : [];
    appendNotification(
      store,
      `Detective referred a suspect to sergeant for Case #${caseId}.`,
      caseId,
      recipients,
    );
  }

  if (actionTypeStored === "sergeant_referral_decision") {
    const approved = ["approved", "approve", "accept", "accepted"].includes(
      normalizeText(payloadData.decision),
    );
    if (suspect) {
      suspect.status = approved ? "sergeant_approved" : "sergeant_rejected";
    }
    if (approved && normalizeText(caseItem.status) === "open") {
      caseItem.status = "under_investigation";
    }
    bumpCaseUpdatedAt();
    appendNotification(
      store,
      approved
        ? `Sergeant approved suspect referral for Case #${caseId}.`
        : `Sergeant rejected suspect referral for Case #${caseId}.`,
      caseId,
      [detectiveId].filter((id) => Number(id) > 0),
    );
  }

  if (actionTypeStored === "detective_interrogation_score") {
    if (suspect && !["awaiting_trial", "closed"].includes(normalizeText(suspect.status))) {
      suspect.status = "interrogation_scored_by_detective";
    }
    if (normalizeText(caseItem.status) === "open") {
      caseItem.status = "under_investigation";
    }
    bumpCaseUpdatedAt();
    appendNotification(
      store,
      `Detective submitted interrogation score for Case #${caseId}.`,
      caseId,
      [sergeantId].filter((id) => Number(id) > 0),
    );

    const sergeantScoreAction = latestSergeantScore();
    if (sergeantScoreAction) {
      appendNotification(
        store,
        `Detective and sergeant scores are ready for captain review in Case #${caseId}.`,
        caseId,
        [captainId].filter((id) => Number(id) > 0),
      );
    }
  }

  if (actionTypeStored === "sergeant_interrogation_score") {
    if (suspect && !["awaiting_trial", "closed"].includes(normalizeText(suspect.status))) {
      suspect.status = "interrogation_scored_by_sergeant";
    }
    if (normalizeText(caseItem.status) === "open") {
      caseItem.status = "under_investigation";
    }
    bumpCaseUpdatedAt();
    appendNotification(
      store,
      `Sergeant submitted interrogation score for Case #${caseId}.`,
      caseId,
      [detectiveId].filter((id) => Number(id) > 0),
    );

    const detectiveScoreAction = latestDetectiveScore();
    if (detectiveScoreAction) {
      appendNotification(
        store,
        `Detective and sergeant scores are ready for captain review in Case #${caseId}.`,
        caseId,
        [captainId].filter((id) => Number(id) > 0),
      );
    }
  }

  if (actionTypeStored === "captain_suspect_verdict" || actionTypeStored === "captain_verdict_mock") {
    const verdict = normalizeText(payloadData.verdict);
    const requiresChiefReview =
      Object.prototype.hasOwnProperty.call(payloadData, "requires_chief_review")
        ? Boolean(payloadData.requires_chief_review)
        : isCriticalCase;

    if (suspect) {
      if (requiresChiefReview) {
        suspect.status = "awaiting_chief_review";
      } else if (verdict === "dismiss") {
        suspect.status = "captain_rejected";
      } else {
        suspect.status = "awaiting_trial";
      }
    }

    if (!requiresChiefReview && verdict !== "dismiss") {
      caseItem.status = "awaiting_trial";
    } else if (normalizeText(caseItem.status) === "open") {
      caseItem.status = "under_investigation";
    }
    bumpCaseUpdatedAt();

    if (requiresChiefReview) {
      appendNotification(
        store,
        `Critical-case captain verdict for Case #${caseId} requires police chief review.`,
        caseId,
        [chiefId].filter((id) => Number(id) > 0),
      );
    } else {
      appendNotification(
        store,
        `Captain verdict recorded for Case #${caseId}.`,
        caseId,
        [judgeId, detectiveId, sergeantId].filter((id) => Number(id) > 0),
      );
    }
  }

  if (actionTypeStored === "chief_captain_verdict_review") {
    const approved = ["approved", "approve", "accept", "accepted"].includes(
      normalizeText(payloadData.decision),
    );
    if (suspect) {
      suspect.status = approved ? "awaiting_trial" : "chief_rejected";
    }
    caseItem.status = approved ? "awaiting_trial" : "under_investigation";
    bumpCaseUpdatedAt();
    appendNotification(
      store,
      approved
        ? `Police chief approved captain verdict for Case #${caseId}.`
        : `Police chief rejected captain verdict for Case #${caseId}.`,
      caseId,
      [captainId, detectiveId, sergeantId, judgeId].filter((id) => Number(id) > 0),
    );
  }

  if (actionTypeStored.includes("captain_verdict") && actionTypeStored !== "captain_suspect_verdict") {
    appendNotification(store, `Captain verdict updated for Case #${caseId}.`, caseId);
  }

  if (actionTypeStored === "sergeant_referral_decision") {
    const captainRecipients =
      isCriticalCase || normalizeText(payloadData.decision) === "approved"
        ? [captainId].filter((id) => Number(id) > 0)
        : [];
    if (captainRecipients.length) {
      appendNotification(
        store,
        `Sergeant reviewed a suspect referral in Case #${caseId}.`,
        caseId,
        captainRecipients,
      );
    }
  }

  if (
    (actionTypeStored === "detective_interrogation_score" || actionTypeStored === "sergeant_interrogation_score") &&
    suspect
  ) {
    const d = latestDetectiveScore();
    const s = latestSergeantScore();
    if (d && s) {
      const avg =
        ((Number(d?.payload?.score) || 0) + (Number(s?.payload?.score) || 0)) / 2;
      suspect.score = Number.isFinite(avg) && avg > 0 ? Math.round(avg * 10) : suspect.score;
      suspect.status =
        latestCaptainVerdict() ? suspect.status : "awaiting_captain_decision";
    }
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
  const nextSergeantId = Object.prototype.hasOwnProperty.call(payload, "sergeant_id")
    ? validateAssignmentUserRole(store, payload.sergeant_id, ["sergeant"], "sergeant_id")
    : target.sergeant_id ?? target.supervisor_id ?? null;
  const nextCaptainId = Object.prototype.hasOwnProperty.call(payload, "captain_id")
    ? validateAssignmentUserRole(store, payload.captain_id, ["captain"], "captain_id")
    : target.captain_id ?? null;
  const nextChiefId = Object.prototype.hasOwnProperty.call(payload, "chief_id")
    ? validateAssignmentUserRole(store, payload.chief_id, ["chief"], "chief_id")
    : target.chief_id ?? null;
  const nextDetectiveId = Object.prototype.hasOwnProperty.call(payload, "detective_id")
    ? validateAssignmentUserRole(store, payload.detective_id, ["detective"], "detective_id")
    : target.detective_id ?? target.assigned_to ?? null;
  const nextCoronerId = Object.prototype.hasOwnProperty.call(payload, "coroner_id")
    ? validateAssignmentUserRole(store, payload.coroner_id, ["coroner", "forensic", "doctor"], "coroner_id")
    : target.coroner_id ?? null;
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
  assignIfChanged("sergeant_id", nextSergeantId, target.sergeant_id);
  assignIfChanged("captain_id", nextCaptainId, target.captain_id);
  assignIfChanged("chief_id", nextChiefId, target.chief_id);
  assignIfChanged("detective_id", nextDetectiveId, target.detective_id);
  assignIfChanged("coroner_id", nextCoronerId, target.coroner_id);
  assignIfChanged("judge_id", nextJudgeId, target.judge_id);

  // Keep legacy supervisor_id alias aligned with sergeant slot for older UI/state paths.
  const effectiveSergeantId = normalizeOptionalUserId(target.sergeant_id);
  const currentSupervisorAlias = normalizeOptionalUserId(target.supervisor_id);
  if (currentSupervisorAlias !== effectiveSergeantId) {
    changedPayload.supervisor_id = effectiveSergeantId;
    target.supervisor_id = effectiveSergeantId;
  }

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

function normalizeTipAttachments(attachments = []) {
  const rows = Array.isArray(attachments) ? attachments : [];
  let idCursor = 1;
  return rows
    .map((item) => {
      const normalized = createStoredAttachmentFromPayload(item, idCursor);
      idCursor = Math.max(idCursor + 1, Number(normalized.id) + 1);
      return normalized;
    })
    .filter((item) => item.file_url || item.file_path);
}

export function mockSubmitTip(token, payload = {}) {
  const store = readStore();
  const actor = assertAuthenticated(store, token);
  if (!isBasicUserRoleName(actor.role_name)) {
    throw new Error("Only Basic User can submit reward/tip information.");
  }

  const caseId = Number(payload.case_id ?? payload.case);
  if (!caseId) {
    throw new Error("case_id: This field is required.");
  }
  const caseItem = findCaseOrThrow(store, caseId);
  if (!isActiveCaseStatus(caseItem.status)) {
    throw new Error("Tips can only be submitted for active cases.");
  }

  const title = String(payload.title || "").trim();
  const description = String(payload.description || "").trim();
  const suspectHint = String(payload.suspect_hint || "").trim();
  if (!title) {
    throw new Error("title: This field is required.");
  }
  if (!description) {
    throw new Error("description: This field is required.");
  }

  const officerId = caseOfficerId(caseItem);
  if (!officerId) {
    throw new Error("This case does not have an assigned police officer yet.");
  }

  const attachments = normalizeTipAttachments(payload.attachments || []);
  const created = {
    id: nextId(store.tips || []),
    case_id: caseId,
    title,
    description,
    suspect_hint: suspectHint,
    submitter_user_id: Number(actor.id),
    submitter_name: String(actor.username || "").trim(),
    submitter_national_id: String(actor.national_id || "").trim(),
    status: "pending_officer",
    officer_id: officerId,
    detective_id: caseDetectiveId(caseItem),
    officer_note: "",
    detective_note: "",
    reward_code: "",
    reward_amount: null,
    attachments,
    created_at: nowIsoString(),
    updated_at: nowIsoString(),
  };

  store.tips = [...(store.tips || []), created];
  appendNotification(
    store,
    `New public tip #${created.id} submitted for Case #${caseId}.`,
    caseId,
    [officerId],
  );
  writeStore(store);
  return deepClone(created);
}

export function mockListMyTips(token) {
  const store = readStore();
  const actor = assertAuthenticated(store, token);
  if (!isBasicUserRoleName(actor.role_name)) {
    throw new Error("Only Basic User can access my tips.");
  }
  return deepClone(
    (store.tips || [])
      .filter((item) => Number(item.submitter_user_id) === Number(actor.id))
      .sort((a, b) => String(b.updated_at || "").localeCompare(String(a.updated_at || ""))),
  );
}

export function mockListOfficerTipQueue(token) {
  const store = readStore();
  const actor = assertAuthenticated(store, token);
  if (!(isOfficerRoleName(actor.role_name) || hasAnyKeyword(actor.role_name, ["cadet", "sergeant", "captain", "chief"]))) {
    throw new Error("Police ranks only.");
  }

  const queue = (store.tips || [])
    .filter((item) => isTipStatusPendingOfficer(item.status))
    .filter((item) => {
      const assignedOfficerId = normalizeOptionalUserId(item.officer_id);
      return !assignedOfficerId || assignedOfficerId === Number(actor.id) || isPoliceRoleName(actor.role_name);
    })
    .map((item) => {
      const caseItem = (store.cases || []).find((c) => Number(c.id) === Number(item.case_id));
      return {
        ...item,
        case_title: caseItem?.title || "",
      };
    })
    .sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
  return deepClone(queue);
}

export function mockOfficerReviewTip(token, tipId, payload = {}) {
  const store = readStore();
  const actor = assertAuthenticated(store, token);
  if (!isOfficerRoleName(actor.role_name)) {
    throw new Error("Only Police Officer can perform officer review for tips.");
  }

  const tip = findTipOrThrow(store, tipId);
  if (!isTipStatusPendingOfficer(tip.status)) {
    throw new Error("Tip is not pending officer review.");
  }

  const caseItem = findCaseOrThrow(store, tip.case_id);
  const assignedOfficerId = caseOfficerId(caseItem);
  if (assignedOfficerId && assignedOfficerId !== Number(actor.id)) {
    throw new Error("This tip belongs to another officer's case.");
  }

  const action = normalizeText(payload.action);
  const note = String(payload.note || "").trim();
  tip.officer_id = Number(actor.id);
  tip.officer_note = note;
  tip.updated_at = nowIsoString();

  if (action === "reject") {
    tip.status = "rejected_by_officer";
    appendNotification(
      store,
      `Your tip #${tip.id} for Case #${tip.case_id} was rejected during officer review.`,
      tip.case_id,
      [tip.submitter_user_id],
    );
  } else if (action === "forward") {
    const detectiveId = caseDetectiveId(caseItem);
    if (!detectiveId) {
      throw new Error("Case has no detective assigned yet.");
    }
    tip.detective_id = detectiveId;
    tip.status = "pending_detective";
    appendNotification(
      store,
      `Tip #${tip.id} was forwarded to detective for Case #${tip.case_id}.`,
      tip.case_id,
      [detectiveId],
    );
    appendNotification(
      store,
      `Your tip #${tip.id} passed officer review and was forwarded to detective.`,
      tip.case_id,
      [tip.submitter_user_id],
    );
  } else {
    throw new Error("action must be 'reject' or 'forward'.");
  }

  writeStore(store);
  return deepClone(tip);
}

export function mockListDetectiveTipQueue(token) {
  const store = readStore();
  const actor = assertAuthenticated(store, token);
  if (!isDetectiveRoleName(actor.role_name)) {
    throw new Error("Only detective users can access detective tip queue.");
  }

  const queue = (store.tips || [])
    .filter((item) => isTipStatusPendingDetective(item.status))
    .filter((item) => {
      const tipDetectiveId = normalizeOptionalUserId(item.detective_id);
      if (tipDetectiveId) return tipDetectiveId === Number(actor.id);
      const caseItem = (store.cases || []).find((c) => Number(c.id) === Number(item.case_id));
      return caseDetectiveId(caseItem) === Number(actor.id);
    })
    .map((item) => {
      const caseItem = (store.cases || []).find((c) => Number(c.id) === Number(item.case_id));
      return {
        ...item,
        case_title: caseItem?.title || "",
      };
    })
    .sort((a, b) => String(b.updated_at || "").localeCompare(String(a.updated_at || "")));
  return deepClone(queue);
}

export function mockDetectiveReviewTip(token, tipId, payload = {}) {
  const store = readStore();
  const actor = assertAuthenticated(store, token);
  if (!isDetectiveRoleName(actor.role_name)) {
    throw new Error("Only detective users can review forwarded tips.");
  }

  const tip = findTipOrThrow(store, tipId);
  if (!isTipStatusPendingDetective(tip.status)) {
    throw new Error("Tip is not pending detective review.");
  }
  if (normalizeOptionalUserId(tip.detective_id) && Number(tip.detective_id) !== Number(actor.id)) {
    throw new Error("This tip belongs to another detective.");
  }

  const action = normalizeText(payload.action);
  const note = String(payload.note || "").trim();
  tip.detective_id = Number(actor.id);
  tip.detective_note = note;
  tip.updated_at = nowIsoString();

  if (action === "reject") {
    tip.status = "rejected_by_detective";
    appendNotification(
      store,
      `Your tip #${tip.id} for Case #${tip.case_id} was reviewed and marked not useful.`,
      tip.case_id,
      [tip.submitter_user_id],
    );
  } else if (action === "approve") {
    const amount = Number(payload.reward_amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("reward_amount must be a positive number.");
    }
    const rewardCode = buildRewardCode(store);
    tip.status = "approved_rewarded";
    tip.reward_amount = amount;
    tip.reward_code = rewardCode;

    const payment = {
      id: nextPaymentId(store.payments || []),
      type: "reward",
      amount,
      code: rewardCode,
      status: "approved_unclaimed",
      tip_id: Number(tip.id),
      case_id: Number(tip.case_id),
      user_id: Number(tip.submitter_user_id),
      national_id: String(tip.submitter_national_id || "").trim(),
      user_name: String(tip.submitter_name || "").trim(),
      created_at: nowIsoString(),
    };
    store.payments = [...(store.payments || []), payment];
    appendNotification(
      store,
      `Your tip #${tip.id} was approved. Reward code: ${rewardCode}`,
      tip.case_id,
      [tip.submitter_user_id],
    );
  } else {
    throw new Error("action must be 'reject' or 'approve'.");
  }

  writeStore(store);
  return deepClone(tip);
}

export function mockLookupReward(token, payload = {}) {
  const store = readStore();
  const actor = assertAuthenticated(store, token);
  if (!isPoliceRankRoleName(actor.role_name)) {
    throw new Error("Only police ranks can lookup reward information.");
  }

  const nationalId = String(payload.national_id || "").trim();
  const rewardCode = String(payload.reward_code || payload.code || "").trim().toUpperCase();
  if (!nationalId || !rewardCode) {
    throw new Error("national_id and reward_code are required.");
  }

  const payment = (store.payments || []).find(
    (item) =>
      normalizeText(item?.type) === "reward" &&
      String(item?.national_id || "").trim() === nationalId &&
      String(item?.code || "").trim().toUpperCase() === rewardCode,
  );
  if (!payment) {
    throw new Error("No reward record found for provided national ID and code.");
  }

  const user = userById(store, payment.user_id);
  const relatedTip = Number(payment.tip_id)
    ? (store.tips || []).find((item) => Number(item.id) === Number(payment.tip_id))
    : null;
  return deepClone({
    payment,
    user: user ? sanitizeUser(user) : null,
    tip: relatedTip || null,
    mocked: true,
  });
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
  const caseItem = (store.cases || []).find((item) => Number(item.id) === Number(caseId)) || null;
  const raw = store.workflowByCase[caseKey];
  const normalized = normalizeStoredWorkflow(store, caseItem, raw);
  if (JSON.stringify(raw || null) !== JSON.stringify(normalized)) {
    store.workflowByCase[caseKey] = deepClone(normalized);
    writeStore(store);
  }
  return deepClone(normalized);
}

function normalizeStoredWorkflow(store, caseItem, rawWorkflow) {
  const raw = rawWorkflow && typeof rawWorkflow === "object" ? rawWorkflow : {};
  const caseStatus = String(caseItem?.status || "").trim().toLowerCase();
  const creatorRole = String(caseItem?.created_by_role || roleByUserId(store, caseItem?.created_by) || "");
  const creatorIsComplainant = isComplainantLikeRoleName(creatorRole);
  const creatorIsPoliceScene =
    (isPoliceRankRoleName(creatorRole) || isCoronerRoleName(creatorRole)) && !isCadetRoleName(creatorRole) && !creatorIsComplainant;

  const pendingComplaintStages = new Set([
    "pending_cadet_review",
    "needs_complainant_revision",
    "pending_officer_review",
    "pending_cadet_recheck",
  ]);
  const pendingSceneStages = new Set(["pending_superior_approval", "needs_creator_revision"]);

  let path = String(raw.path || "").trim().toLowerCase();
  if (!path) {
    if (pendingComplaintStages.has(caseStatus)) path = "complaint";
    else if (pendingSceneStages.has(caseStatus)) path = "crime_scene";
    else if (creatorIsPoliceScene) path = "crime_scene";
    else path = "complaint";
  }

  let stage = String(raw.stage || raw.status || "").trim().toLowerCase();
  if (!stage) {
    if (caseStatus === "voided") stage = "voided";
    else if (pendingComplaintStages.has(caseStatus) || pendingSceneStages.has(caseStatus)) stage = caseStatus;
    else if (String(raw.status || "").trim().toLowerCase() === "pending_officer") stage = "pending_officer_review";
    else stage = "formed";
  }

  let isVoided = Boolean(raw.is_voided) || caseStatus === "voided" || stage === "voided";
  let formed =
    Boolean(raw.formed) ||
    (!isVoided &&
      !pendingComplaintStages.has(stage) &&
      !pendingSceneStages.has(stage) &&
      stage !== "voided");

  if (isVoided) {
    formed = false;
    stage = "voided";
  }

  if (stage === "formed") {
    formed = true;
  }

  const rejectionCount = Number(raw.rejection_count) || 0;
  const complainantRevisionCount =
    Number(raw.complainant_revision_count) ||
    rejectionCount;

  const history = Array.isArray(raw.history)
    ? raw.history
        .map((item, index) => ({
          id: Number(item?.id) || index + 1,
          at: item?.at || item?.created_at || nowIsoString(),
          action: String(item?.action || "workflow_event"),
          by_user_id: Number(item?.by_user_id) || null,
          by_role: String(item?.by_role || ""),
          comment: String(item?.comment || ""),
        }))
    : [];

  return {
    path,
    stage,
    status: stage,
    rejection_count: rejectionCount,
    complainant_revision_count: complainantRevisionCount,
    last_comment: String(raw.last_comment || ""),
    is_voided: isVoided,
    formed,
    last_actor_role: String(raw.last_actor_role || ""),
    history,
  };
}

function nextWorkflowHistoryId(history = []) {
  if (!history.length) return 1;
  return Math.max(...history.map((item) => Number(item?.id) || 0)) + 1;
}

function pushWorkflowHistory(workflow, event) {
  const history = Array.isArray(workflow.history) ? workflow.history : [];
  const item = {
    id: nextWorkflowHistoryId(history),
    at: nowIsoString(),
    action: String(event?.action || "workflow_event"),
    by_user_id: Number(event?.by_user_id) || null,
    by_role: String(event?.by_role || ""),
    comment: String(event?.comment || ""),
  };
  workflow.history = [...history, item];
  return item;
}

function canHandleComplaintCadetStage(roleName) {
  return isCadetRoleName(roleName);
}

function canHandleComplaintOfficerStage(roleName) {
  return (
    isOfficerRoleName(roleName) ||
    isSergeantRoleName(roleName) ||
    isCaptainRoleName(roleName) ||
    isChiefRoleName(roleName)
  );
}

function canApproveCrimeSceneAsSuperior(actorRoleName, creatorRoleName) {
  if (isCadetRoleName(actorRoleName)) return false;
  if (isCoronerRoleName(actorRoleName)) return true;
  if (!isPoliceRankRoleName(actorRoleName)) return false;
  return policeRoleRank(actorRoleName) > policeRoleRank(creatorRoleName);
}

function requireCommentForAction(action, comment) {
  const actionsNeedingComment = new Set([
    "cadet_request_revision",
    "officer_return_to_cadet",
    "superior_request_creator_revision",
  ]);
  if (actionsNeedingComment.has(action) && !String(comment || "").trim()) {
    throw new Error("A review message/comment is required for this action.");
  }
}

function mapLegacyWorkflowAction(action, roleName, workflowPath, workflowStage) {
  const rawAction = String(action || "").trim().toLowerCase();
  if (!["accept", "reject"].includes(rawAction)) return rawAction;

  if (workflowPath === "complaint") {
    if (rawAction === "accept") {
      if (canHandleComplaintCadetStage(roleName) && ["pending_cadet_review", "pending_cadet_recheck"].includes(workflowStage)) {
        return "cadet_forward_to_officer";
      }
      if (canHandleComplaintOfficerStage(roleName) && workflowStage === "pending_officer_review") {
        return "officer_approve_formation";
      }
    }
    if (rawAction === "reject") {
      if (canHandleComplaintCadetStage(roleName) && ["pending_cadet_review", "pending_cadet_recheck"].includes(workflowStage)) {
        return "cadet_request_revision";
      }
      if (canHandleComplaintOfficerStage(roleName) && workflowStage === "pending_officer_review") {
        return "officer_return_to_cadet";
      }
    }
  }

  if (workflowPath === "crime_scene") {
    if (rawAction === "accept") return "superior_approve_formation";
    if (rawAction === "reject") return "superior_request_creator_revision";
  }
  return rawAction;
}

function addWorkflowNotification(store, caseItem, workflow, action, comment) {
  const caseId = Number(caseItem?.id);
  const complainantIds = Array.isArray(caseItem?.complainant_ids) ? caseItem.complainant_ids : [];
  const creatorId = normalizeOptionalUserId(caseItem?.created_by);
  const trimmedComment = String(comment || "").trim();
  const messageSuffix = trimmedComment ? ` Message: ${trimmedComment}` : "";

  if (workflow.path === "complaint") {
    if (action === "cadet_request_revision") {
      appendNotification(
        store,
        `Case #${caseId} needs complainant revision.${messageSuffix}`,
        caseId,
        complainantIds,
      );
      return;
    }
    if (action === "complainant_resubmit") {
      appendNotification(
        store,
        `Case #${caseId} was re-submitted by complainant and is waiting for cadet review.`,
        caseId,
        cadetReviewRecipients(store, caseItem),
      );
      return;
    }
    if (action === "cadet_forward_to_officer") {
      appendNotification(
        store,
        `Case #${caseId} passed cadet review and is waiting for officer approval.`,
        caseId,
        officerReviewRecipients(store, caseItem),
      );
      return;
    }
    if (action === "officer_return_to_cadet") {
      appendNotification(
        store,
        `Case #${caseId} was returned by officer to cadet for re-check.${messageSuffix}`,
        caseId,
        cadetReviewRecipients(store, caseItem),
      );
      return;
    }
    if (action === "officer_approve_formation") {
      appendNotification(
        store,
        `Case #${caseId} formation approved and the case is now officially created.`,
        caseId,
        [creatorId, ...complainantIds],
      );
      return;
    }
    if (workflow.is_voided) {
      appendNotification(
        store,
        `Case #${caseId} was voided after 3 complainant revisions/rejections.`,
        caseId,
        [creatorId, ...complainantIds],
      );
    }
    return;
  }

  if (workflow.path === "crime_scene") {
    if (action === "superior_request_creator_revision") {
      appendNotification(
        store,
        `Crime scene case #${caseId} needs creator revision before approval.${messageSuffix}`,
        caseId,
        [creatorId],
      );
      return;
    }
    if (action === "creator_resubmit_for_approval") {
      appendNotification(
        store,
        `Crime scene case #${caseId} was re-submitted for superior approval.`,
        caseId,
        superiorApprovalRecipients(store, caseItem),
      );
      return;
    }
    if (action === "superior_approve_formation") {
      appendNotification(
        store,
        `Crime scene case #${caseId} formation approved.`,
        caseId,
        [creatorId],
      );
    }
  }
}

export function applyMockWorkflow(token, caseId, payload) {
  const store = readStore();
  const actor = assertAuthenticated(store, token);
  const caseKey = String(caseId);
  const caseItem = findCaseOrThrow(store, caseId);
  const current = normalizeStoredWorkflow(store, caseItem, store.workflowByCase[caseKey]);
  const actorRole = String(actor?.role_name || "");
  const creatorRole = String(caseItem?.created_by_role || roleByUserId(store, caseItem?.created_by) || "");
  const rawComment = String(payload?.comment || "").trim();

  if (current.is_voided) {
    throw new Error("This case workflow is voided and cannot be transitioned.");
  }

  let action = mapLegacyWorkflowAction(payload?.action, actorRole, current.path, current.stage);
  requireCommentForAction(action, rawComment);

  const next = deepClone(current);
  let performed = false;

  if (current.path === "complaint") {
    if (action === "complainant_resubmit" || action === "resubmit") {
      const actorIsComplainant =
        Number(actor.id) === Number(caseItem.created_by) ||
        (Array.isArray(caseItem.complainant_ids) &&
          caseItem.complainant_ids.some((id) => Number(id) === Number(actor.id)));
      if (!actorIsComplainant) {
        throw new Error("Only complainant(s) can re-submit this complaint.");
      }
      if (current.stage !== "needs_complainant_revision") {
        throw new Error("Complaint re-submission is only allowed after cadet revision request.");
      }
      next.stage = "pending_cadet_review";
      next.status = next.stage;
      next.last_comment = rawComment;
      next.last_actor_role = actorRole;
      performed = true;
      action = "complainant_resubmit";
    } else if (action === "cadet_request_revision") {
      if (!canHandleComplaintCadetStage(actorRole)) {
        throw new Error("Only cadet/intern can request complainant revision at this stage.");
      }
      if (!["pending_cadet_review", "pending_cadet_recheck"].includes(current.stage)) {
        throw new Error("Cadet revision request is not valid at this workflow stage.");
      }
      next.rejection_count = Number(next.rejection_count || 0) + 1;
      next.complainant_revision_count = Number(next.complainant_revision_count || 0) + 1;
      next.last_comment = rawComment;
      next.last_actor_role = actorRole;
      if (next.complainant_revision_count >= 3) {
        next.stage = "voided";
        next.status = "voided";
        next.is_voided = true;
        next.formed = false;
      } else {
        next.stage = "needs_complainant_revision";
        next.status = next.stage;
      }
      performed = true;
    } else if (action === "cadet_forward_to_officer") {
      if (!canHandleComplaintCadetStage(actorRole)) {
        throw new Error("Only cadet/intern can forward complaint to officer.");
      }
      if (!["pending_cadet_review", "pending_cadet_recheck"].includes(current.stage)) {
        throw new Error("Cadet approval is not valid at this stage.");
      }
      next.stage = "pending_officer_review";
      next.status = next.stage;
      next.last_comment = rawComment;
      next.last_actor_role = actorRole;
      performed = true;
    } else if (action === "officer_return_to_cadet") {
      if (!canHandleComplaintOfficerStage(actorRole)) {
        throw new Error("Only officer/supervisor police roles can return complaint to cadet.");
      }
      if (current.stage !== "pending_officer_review") {
        throw new Error("Officer recheck request is only valid in pending officer review stage.");
      }
      next.stage = "pending_cadet_recheck";
      next.status = next.stage;
      next.last_comment = rawComment;
      next.last_actor_role = actorRole;
      performed = true;
    } else if (action === "officer_approve_formation") {
      if (!canHandleComplaintOfficerStage(actorRole)) {
        throw new Error("Only officer/supervisor police roles can approve complaint formation.");
      }
      if (current.stage !== "pending_officer_review") {
        throw new Error("Complaint formation approval is only valid in pending officer review stage.");
      }
      next.stage = "formed";
      next.status = next.stage;
      next.formed = true;
      next.last_comment = rawComment;
      next.last_actor_role = actorRole;
      performed = true;
    }
  } else if (current.path === "crime_scene") {
    if (action === "creator_resubmit_for_approval" || action === "resubmit") {
      if (Number(actor.id) !== Number(caseItem.created_by)) {
        throw new Error("Only the case creator can re-submit this crime scene case.");
      }
      if (current.stage !== "needs_creator_revision") {
        throw new Error("Creator re-submission is only allowed after superior requests revision.");
      }
      next.stage = "pending_superior_approval";
      next.status = next.stage;
      next.last_comment = rawComment;
      next.last_actor_role = actorRole;
      performed = true;
      action = "creator_resubmit_for_approval";
    } else if (action === "superior_request_creator_revision") {
      if (!canApproveCrimeSceneAsSuperior(actorRole, creatorRole)) {
        throw new Error("This role is not allowed to review/approve this crime scene case.");
      }
      if (current.stage !== "pending_superior_approval") {
        throw new Error("Superior revision request is only valid in pending superior approval stage.");
      }
      next.stage = "needs_creator_revision";
      next.status = next.stage;
      next.last_comment = rawComment;
      next.last_actor_role = actorRole;
      performed = true;
    } else if (action === "superior_approve_formation") {
      if (!canApproveCrimeSceneAsSuperior(actorRole, creatorRole)) {
        throw new Error("This role is not allowed to approve this crime scene case.");
      }
      if (current.stage !== "pending_superior_approval") {
        throw new Error("Crime scene approval is only valid in pending superior approval stage.");
      }
      next.stage = "formed";
      next.status = next.stage;
      next.formed = true;
      next.last_comment = rawComment;
      next.last_actor_role = actorRole;
      performed = true;
    }
  }

  if (!performed) {
    throw new Error("Invalid workflow action for this role/stage.");
  }

  pushWorkflowHistory(next, {
    action,
    by_user_id: Number(actor.id) || null,
    by_role: actorRole,
    comment: rawComment,
  });

  caseItem.status = mapCaseStatusFromWorkflow(next);
  caseItem.updated_at = nowIsoString();
  store.workflowByCase[caseKey] = next;

  store.actions.push({
    id: nextId(store.actions),
    case: Number(caseId),
    action_type: "case_formation_workflow_transition",
    payload: {
      workflow_path: next.path,
      action,
      stage: next.stage,
      formed: next.formed,
      is_voided: next.is_voided,
      comment: rawComment,
      actor_user_id: Number(actor.id) || null,
      actor_role: actorRole,
      rejection_count: next.rejection_count,
    },
    created_at: nowIsoString(),
  });

  addWorkflowNotification(store, caseItem, next, action, rawComment);

  writeStore(store);
  return deepClone(next);
}
