const KEY = "caseflow_frontend_mocks_v1";

const DEFAULT_STORE = {
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
  workflowByCase: {},
};

function readStore() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULT_STORE);
    const parsed = JSON.parse(raw);
    return {
      ...structuredClone(DEFAULT_STORE),
      ...parsed,
    };
  } catch {
    return structuredClone(DEFAULT_STORE);
  }
}

function writeStore(store) {
  localStorage.setItem(KEY, JSON.stringify(store));
}

export function getMockNotifications() {
  return readStore().notifications;
}

export function setMockNotificationRead(notificationId) {
  const store = readStore();
  store.notifications = store.notifications.map((item) =>
    item.id === Number(notificationId) ? { ...item, is_read: true } : item,
  );
  writeStore(store);
  return store.notifications.find((item) => item.id === Number(notificationId));
}

export function getMockPayments() {
  return readStore().payments;
}

export function getMockBoard(caseId) {
  const store = readStore();
  const caseKey = String(caseId);
  return {
    relations: store.relationsByCase[caseKey] || [],
    notes: store.notesByCase[caseKey] || [],
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
  return newItem;
}

export function addMockNote(caseId, note) {
  const store = readStore();
  const caseKey = String(caseId);
  const current = store.notesByCase[caseKey] || [];
  const id = current.length ? Math.max(...current.map((item) => item.id)) + 1 : 1;
  const newItem = { id, order_index: current.length, ...note };
  store.notesByCase[caseKey] = [...current, newItem];
  writeStore(store);
  return newItem;
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
  return reordered;
}

export function getMockWorkflow(caseId) {
  const store = readStore();
  const caseKey = String(caseId);
  return (
    store.workflowByCase[caseKey] || {
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
  writeStore(store);
  return next;
}
