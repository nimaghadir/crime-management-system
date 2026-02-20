import {
  addMockNote,
  addMockRelation,
  applyMockWorkflow,
  getMockBoard,
  getMockNotifications,
  getMockPayments,
  getMockWorkflow,
  reorderMockNotes,
  setMockNotificationRead,
} from "./mockData";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";

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
  login: (payload) => request("/v1/auth/login/", { method: "POST", body: JSON.stringify(payload) }),
  register: (payload) =>
    request("/v1/auth/register/", { method: "POST", body: JSON.stringify(payload) }),
  getProtectedPing: (token) => request("/v1/protected/", {}, token),

  listCases: (token, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/v1/cases/${query ? `?${query}` : ""}`, {}, token);
  },
  getCase: (token, id) => request(`/v1/cases/${id}/`, {}, token),
  createCase: (token, payload) =>
    request("/v1/cases/", { method: "POST", body: JSON.stringify(payload) }, token),
  updateCasePartial: (token, id, payload) =>
    request(`/v1/cases/${id}/`, { method: "PATCH", body: JSON.stringify(payload) }, token),

  listTags: (token) => request("/v1/tags/", {}, token),

  listEvidence: (token, caseId) => request(`/v1/evidence/?case=${caseId}`, {}, token),
  createEvidence: (token, payload) => {
    validateEvidencePayload(payload);
    return request("/v1/evidence/", { method: "POST", body: JSON.stringify(payload) }, token);
  },
  verifyEvidence: (token, evidenceId) =>
    request(`/v1/evidence/${evidenceId}/verify/`, { method: "POST" }, token),

  createEvidenceAttachment: (token, payload) =>
    request(
      "/v1/evidence-attachments/",
      { method: "POST", body: JSON.stringify(payload) },
      token,
    ),

  listSuspects: (token, caseId) => request(`/v1/suspects/?case=${caseId}`, {}, token),
  createSuspect: (token, payload) =>
    request("/v1/suspects/", { method: "POST", body: JSON.stringify(payload) }, token),
  updateSuspect: (token, suspectId, payload) =>
    request(`/v1/suspects/${suspectId}/`, { method: "PATCH", body: JSON.stringify(payload) }, token),

  createNote: (token, payload) =>
    request("/v1/notes/", { method: "POST", body: JSON.stringify(payload) }, token),
  updateNote: (token, noteId, payload) =>
    request(`/v1/notes/${noteId}/`, { method: "PATCH", body: JSON.stringify(payload) }, token),
  deleteNote: (token, noteId) => request(`/v1/notes/${noteId}/`, { method: "DELETE" }, token),
  reorderNotes: (token, payload) =>
    request("/v1/notes/reorder/", { method: "POST", body: JSON.stringify(payload) }, token),

  listInvestigationActions: (token, caseId) =>
    request(`/v1/investigation-actions/?case=${caseId}`, {}, token),
  createInvestigationAction: (token, payload) =>
    request(
      "/v1/investigation-actions/",
      { method: "POST", body: JSON.stringify(payload) },
      token,
    ),
  startInterrogation: (token, payload) =>
    request(
      "/v1/investigation-actions/start-interrogation/",
      { method: "POST", body: JSON.stringify(payload) },
      token,
    ),

  getBoardSummary: (token) => request("/v1/reports/detective-board-summary/", {}, token),

  listRoles: (token) => request("/v1/roles/", {}, token),
  listUsers: (token) => request("/v1/users/", {}, token),
  assignRole: (token, userId, role) =>
    request(
      `/v1/users/${userId}/assign-role/`,
      { method: "POST", body: JSON.stringify({ role }) },
      token,
    ),

  convertComplaintToCase: (token, complaintId, payload) =>
    request(
      `/v1/cases/complaints/${complaintId}/convert/`,
      { method: "POST", body: JSON.stringify(payload) },
      token,
    ),

  async transitionCase(token, caseId, payload) {
    // TODO: Replace with backend workflow endpoint once implemented.
    // Probable API URL: POST /api/v1/cases/{caseId}/transition/
    // return request(`/v1/cases/${caseId}/transition/`, { method: "POST", body: JSON.stringify(payload) }, token);
    const mocked = applyMockWorkflow(caseId, payload);
    return {
      id: Number(caseId),
      mocked: true,
      ...mocked,
    };
  },

  getMockWorkflowState(caseId) {
    return getMockWorkflow(caseId);
  },

  async getDetectiveBoardState(token, caseId) {
    // TODO: Replace with backend board-state endpoint once implemented.
    // Probable API URL: GET /api/v1/investigations/board-state/?case={caseId}
    // return request(`/v1/investigations/board-state/?case=${caseId}`, {}, token);

    const [evidence, suspects] = await Promise.all([
      this.listEvidence(token, caseId),
      this.listSuspects(token, caseId),
    ]);

    const mock = getMockBoard(caseId);
    return {
      case_id: Number(caseId),
      evidence,
      suspects,
      notes: mock.notes,
      relations: mock.relations,
      mocked_relations: true,
      mocked_notes: true,
    };
  },

  async createBoardRelation(token, caseId, payload) {
    // TODO: Replace with backend evidence-relation endpoint once implemented.
    // Probable API URL: POST /api/v1/investigations/evidence-relations/
    // return request('/v1/investigations/evidence-relations/', { method: 'POST', body: JSON.stringify(payload) }, token);
    return addMockRelation(caseId, payload);
  },

  async createBoardNote(token, caseId, payload) {
    // Try backend note create first.
    try {
      const created = await this.createNote(token, { case: Number(caseId), text: payload.text, pinned: false });
      return { ...created, mocked: false };
    } catch {
      return { ...addMockNote(caseId, payload), mocked: true };
    }
  },

  async reorderBoardNotes(token, caseId, noteIds) {
    try {
      const reordered = await this.reorderNotes(token, { case: Number(caseId), note_ids: noteIds });
      return { notes: reordered, mocked: false };
    } catch {
      return { notes: reorderMockNotes(caseId, noteIds), mocked: true };
    }
  },

  async listNotifications(token) {
    // TODO: Replace with backend notifications API once implemented.
    // Probable API URL: GET /api/v1/notifications/
    // return request('/v1/notifications/', {}, token);
    return Promise.resolve(getMockNotifications());
  },

  async markNotificationRead(token, notificationId) {
    // TODO: Replace with backend notifications API once implemented.
    // Probable API URL: PATCH /api/v1/notifications/{notificationId}/
    // return request(`/v1/notifications/${notificationId}/`, { method: 'PATCH', body: JSON.stringify({ is_read: true }) }, token);
    return Promise.resolve({ ...setMockNotificationRead(notificationId), mocked: true });
  },

  async listPaymentRecords(token) {
    // TODO: Replace with backend payments API once implemented.
    // Probable API URL: GET /api/v1/payments/records/
    // return request('/v1/payments/records/', {}, token);
    return Promise.resolve(getMockPayments());
  },
};
