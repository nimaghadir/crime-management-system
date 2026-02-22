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
  mockListCases,
  mockListEvidence,
  mockListInvestigationActions,
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

async function request(path, options = {}, token) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
    throw new Error(extractError(data));
  }

  return data;
}

export const EVIDENCE_TYPES = {
  TESTIMONY: "testimony",
  BIO_MEDICAL: "bio_medical",
  VEHICLE: "vehicle",
  IDENTITY: "identity",
  OTHER: "other",
};

export function validateEvidencePayload(payload) {
  const type = payload?.type;
  const metadata = payload?.metadata || {};

  if (type === EVIDENCE_TYPES.VEHICLE) {
    const hasPlate = Boolean(metadata.plate?.trim());
    const hasSerial = Boolean(metadata.serial_number?.trim());
    if (hasPlate === hasSerial) {
      throw new Error("Vehicle evidence must include plate OR serial_number, not both.");
    }
  }

  if (type === EVIDENCE_TYPES.IDENTITY) {
    if (typeof metadata !== "object" || Array.isArray(metadata)) {
      throw new Error("Identity evidence metadata must be key-value JSON.");
    }
  }
}

export const api = {
  login: (payload) =>
    callEndpoint("login", {
      real: () => request("/v1/auth/login/", { method: "POST", body: JSON.stringify(payload) }),
      mock: () => mockLogin(payload),
      fallback: true,
    }),
  register: (payload) =>
    callEndpoint("register", {
      real: () => request("/v1/auth/register/", { method: "POST", body: JSON.stringify(payload) }),
      mock: () => mockRegister(payload),
      fallback: true,
    }),
  getProtectedPing: (token) => request("/v1/protected/", {}, token),

  listCases: (token, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return callEndpoint("listCases", {
      real: async () => normalizeListResponse(await request(`/v1/cases/${query ? `?${query}` : ""}`, {}, token)),
      mock: () => mockListCases(token, params),
      fallback: true,
    });
  },
  getCase: (token, id) =>
    callEndpoint("getCase", {
      real: () => request(`/v1/cases/${id}/`, {}, token),
      mock: () => mockGetCase(token, id),
      fallback: true,
    }),
  createCase: (token, payload) =>
    callEndpoint("createCase", {
      real: () => request("/v1/cases/", { method: "POST", body: JSON.stringify(payload) }, token),
      mock: () => mockCreateCase(token, payload),
      fallback: true,
    }),
  updateCasePartial: (token, id, payload) =>
    callEndpoint("updateCasePartial", {
      real: () =>
        request(`/v1/cases/${id}/`, { method: "PATCH", body: JSON.stringify(payload) }, token),
      mock: () => mockUpdateCasePartial(token, id, payload),
      fallback: true,
    }),

  listTags: (token) =>
    callEndpoint("listTags", {
      real: async () => normalizeListResponse(await request("/v1/tags/", {}, token)),
      mock: () => mockListTags(token),
      fallback: true,
    }),

  listEvidence: (token, caseId) =>
    callEndpoint("listEvidence", {
      real: async () => normalizeListResponse(await request(`/v1/evidence/?case=${caseId}`, {}, token)),
      mock: () => mockListEvidence(token, caseId),
      fallback: true,
    }),
  createEvidence: (token, payload) => {
    validateEvidencePayload(payload);
    return callEndpoint("createEvidence", {
      real: () =>
        request("/v1/evidence/", { method: "POST", body: JSON.stringify(payload) }, token),
      mock: () => mockCreateEvidence(token, payload),
      fallback: true,
    });
  },
  verifyEvidence: (token, evidenceId) =>
    callEndpoint("verifyEvidence", {
      real: () => request(`/v1/evidence/${evidenceId}/verify/`, { method: "POST" }, token),
      mock: () => mockVerifyEvidence(token, evidenceId),
      fallback: true,
    }),

  createEvidenceAttachment: (token, payload) =>
    callEndpoint("createEvidenceAttachment", {
      real: () =>
        request(
          "/v1/evidence-attachments/",
          { method: "POST", body: JSON.stringify(payload) },
          token,
        ),
      mock: () => mockCreateEvidenceAttachment(token, payload),
      fallback: true,
    }),

  listSuspects: (token, caseId) =>
    callEndpoint("listSuspects", {
      real: async () => normalizeListResponse(await request(`/v1/suspects/?case=${caseId}`, {}, token)),
      mock: () => mockListSuspects(token, caseId),
      fallback: true,
    }),
  createSuspect: (token, payload) =>
    callEndpoint("createSuspect", {
      real: () => request("/v1/suspects/", { method: "POST", body: JSON.stringify(payload) }, token),
      mock: () => mockCreateSuspect(token, payload),
      fallback: true,
    }),
  updateSuspect: (token, suspectId, payload) =>
    callEndpoint("updateSuspect", {
      real: () =>
        request(`/v1/suspects/${suspectId}/`, { method: "PATCH", body: JSON.stringify(payload) }, token),
      mock: () => mockUpdateSuspect(token, suspectId, payload),
      fallback: true,
    }),

  createNote: (token, payload) =>
    callEndpoint("createNote", {
      real: () => request("/v1/notes/", { method: "POST", body: JSON.stringify(payload) }, token),
      mock: () => mockCreateNote(token, payload),
      fallback: true,
    }),
  updateNote: (token, noteId, payload) =>
    callEndpoint("updateNote", {
      real: () => request(`/v1/notes/${noteId}/`, { method: "PATCH", body: JSON.stringify(payload) }, token),
      mock: () => mockUpdateNote(token, noteId, payload),
      fallback: true,
    }),
  deleteNote: (token, noteId) =>
    callEndpoint("deleteNote", {
      real: () => request(`/v1/notes/${noteId}/`, { method: "DELETE" }, token),
      mock: () => mockDeleteNote(token, noteId),
      fallback: true,
    }),
  reorderNotes: (token, payload) =>
    callEndpoint("reorderNotes", {
      real: () =>
        request("/v1/notes/reorder/", { method: "POST", body: JSON.stringify(payload) }, token),
      mock: () => mockReorderNotes(token, payload),
      fallback: true,
    }),

  listInvestigationActions: (token, caseId) =>
    callEndpoint("listInvestigationActions", {
      real: async () =>
        normalizeListResponse(await request(`/v1/investigation-actions/?case=${caseId}`, {}, token)),
      mock: () => mockListInvestigationActions(token, caseId),
      fallback: true,
    }),
  createInvestigationAction: (token, payload) =>
    callEndpoint("createInvestigationAction", {
      real: () =>
        request(
          "/v1/investigation-actions/",
          { method: "POST", body: JSON.stringify(payload) },
          token,
        ),
      mock: () => mockCreateInvestigationAction(token, payload),
      fallback: true,
    }),
  startInterrogation: (token, payload) =>
    request(
      "/v1/investigation-actions/start-interrogation/",
      { method: "POST", body: JSON.stringify(payload) },
      token,
    ),

  getPublicOverview: () =>
    callEndpoint("getPublicOverview", {
      real: () => request("/v1/reports/public-overview/"),
      mock: () => mockGetPublicOverview(),
      fallback: true,
    }),

  getAdminConsoleData: (token) =>
    callEndpoint("getAdminConsoleData", {
      real: () => request("/v1/admin/console-summary/", {}, token),
      mock: () => mockGetAdminConsoleData(token),
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
      real: () => request("/v1/admin/mock-reset/", { method: "POST" }, token),
      mock: () => mockResetStore(token),
      fallback: true,
    }),

  getBoardSummary: (token) =>
    callEndpoint("getBoardSummary", {
      real: () => request("/v1/reports/detective-board-summary/", {}, token),
      mock: () => mockGetBoardSummary(token),
      fallback: true,
    }),

  listRoles: (token) =>
    callEndpoint("listRoles", {
      real: async () => normalizeListResponse(await request("/v1/roles/", {}, token)),
      mock: () => mockListRoles(token),
      fallback: true,
    }),
  createRole: (token, payload) =>
    callEndpoint("createRole", {
      real: () => request("/v1/roles/", { method: "POST", body: JSON.stringify(payload) }, token),
      mock: () => mockCreateRole(token, payload),
      fallback: true,
    }),
  deleteRole: (token, roleId) =>
    callEndpoint("deleteRole", {
      real: () => request(`/v1/roles/${roleId}/`, { method: "DELETE" }, token),
      mock: () => mockDeleteRole(token, roleId),
      fallback: true,
    }),
  listUsers: (token) =>
    callEndpoint("listUsers", {
      real: async () => normalizeListResponse(await request("/v1/users/", {}, token)),
      mock: () => mockListUsers(token),
      fallback: true,
    }),
  assignRole: (token, userId, role) =>
    callEndpoint("assignRole", {
      real: () =>
        request(
          `/v1/users/${userId}/assign-role/`,
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
          `/v1/cases/complaints/${complaintId}/convert/`,
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
          `/v1/cases/${caseId}/transition/`,
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
      real: () => request(`/v1/investigations/board-state/?case=${caseId}`, {}, token),
      mock: async () => {
        const [evidence, suspects] = await Promise.all([
          this.listEvidence(token, caseId),
          this.listSuspects(token, caseId),
        ]);

        const boardMock = getMockBoard(caseId);
        return {
          case_id: Number(caseId),
          evidence,
          suspects,
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
          "/v1/investigations/evidence-relations/",
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
        request(`/v1/investigations/evidence-relations/${relationId}/`, { method: "DELETE" }, token),
      mock: () => deleteMockRelation(caseId, relationId),
      fallback: true,
    });
  },

  async createBoardNote(token, caseId, payload) {
    const created = await callEndpoint("createBoardNote", {
      real: () =>
        request(
          "/v1/notes/",
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
          "/v1/notes/reorder/",
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
      real: async () => normalizeListResponse(await request("/v1/notifications/", {}, token)),
      mock: () => getMockNotifications(),
      fallback: true,
    });
  },

  async markNotificationRead(token, notificationId) {
    return callEndpoint("markNotificationRead", {
      real: () =>
        request(
          `/v1/notifications/${notificationId}/`,
          { method: "PATCH", body: JSON.stringify({ is_read: true }) },
          token,
        ),
      mock: () => ({ ...setMockNotificationRead(notificationId), mocked: true }),
      fallback: true,
    });
  },

  async listPaymentRecords(token) {
    return callEndpoint("listPaymentRecords", {
      real: async () => normalizeListResponse(await request("/v1/payments/records/", {}, token)),
      mock: () => getMockPayments(),
      fallback: true,
    });
  },
};
