import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../lib/api";

function normalizeRoleName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ");
}

function roleMatches(roleName, keywords = []) {
  const normalized = normalizeRoleName(roleName);
  return keywords.some((keyword) => normalized.includes(normalizeRoleName(keyword)));
}

function pickAssignableUsers(users, roleKeywords) {
  return (users || [])
    .filter((user) => roleMatches(user.role_name, roleKeywords))
    .sort((left, right) => String(left.username || "").localeCompare(String(right.username || "")));
}

function userLabel(user) {
  if (!user) return "Unknown user";
  return `${user.username} (${user.role_name || "No role"})`;
}

function formatDate(value) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "-";
  }
}

export function AdminAssignmentQueuePage({
  title,
  description,
  queueType,
  assignmentFields,
  emptyMessage,
  backPath = "/admin/case-queues",
}) {
  const { token } = useAuth();
  const [cases, setCases] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedByCase, setSelectedByCase] = useState({});
  const [loading, setLoading] = useState(false);
  const [savingCaseId, setSavingCaseId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const usersById = useMemo(
    () => new Map((users || []).map((user) => [Number(user.id), user])),
    [users],
  );

  const optionsByField = useMemo(() => {
    return assignmentFields.reduce((acc, field) => {
      acc[field.key] = pickAssignableUsers(users, field.roleKeywords || []);
      return acc;
    }, {});
  }, [assignmentFields, users]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [queueCases, systemUsers] = await Promise.all([
        api.listAdminCaseQueue(token, queueType),
        api.listUsers(token),
      ]);
      setCases(Array.isArray(queueCases) ? queueCases : []);
      setUsers(Array.isArray(systemUsers) ? systemUsers : []);
    } catch (err) {
      setError(err.message || "Failed to load queue data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [token, queueType]);

  function setFieldValue(caseId, fieldKey, value) {
    setSelectedByCase((prev) => ({
      ...prev,
      [caseId]: {
        ...(prev[caseId] || {}),
        [fieldKey]: value,
      },
    }));
  }

  function resolveCurrentAssignee(caseItem, fieldKey) {
    const id = Number(caseItem?.[fieldKey]);
    if (!id) return "Unassigned";
    const user = usersById.get(id);
    return user ? userLabel(user) : `User #${id}`;
  }

  async function saveAssignments(caseItem) {
    const caseId = Number(caseItem.id);
    const selected = selectedByCase[caseId] || {};
    const payload = {};

    assignmentFields.forEach((field) => {
      if (!Object.prototype.hasOwnProperty.call(selected, field.key)) {
        return;
      }
      const rawValue = selected[field.key];
      if (rawValue === "") {
        return;
      }
      const numericValue = Number(rawValue);
      payload[field.key] = numericValue > 0 ? numericValue : null;
    });

    if (!Object.keys(payload).length) {
      setError("Pick at least one assignment change first.");
      return;
    }

    setSavingCaseId(caseId);
    setError("");
    setMessage("");
    try {
      await api.assignCasePersonnel(token, caseId, payload);
      setMessage(`Case #${caseId} assignment updated.`);
      setSelectedByCase((prev) => {
        const next = { ...prev };
        delete next[caseId];
        return next;
      });
      await load();
    } catch (err) {
      setError(err.message || `Failed to update case #${caseId}.`);
    } finally {
      setSavingCaseId(null);
    }
  }

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl uppercase text-brass">{title}</h1>
          <p className="mt-1 text-zinc-400">{description}</p>
        </div>
        <div className="flex gap-2">
          <Link to={backPath} className="btn-secondary">
            Queue Index
          </Link>
          <button className="btn-secondary" onClick={load} disabled={loading || Boolean(savingCaseId)}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {error && <p className="mb-4 text-danger">{error}</p>}
      {message && <p className="mb-4 text-emerald-400">{message}</p>}

      <div className="space-y-3">
        {cases.map((caseItem) => (
          <article key={caseItem.id} className="card p-4">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm text-zinc-400">Case #{caseItem.id}</p>
                <p className="font-semibold text-paper">{caseItem.title}</p>
              </div>
              <div className="text-right text-xs text-zinc-400">
                <p>Status: {caseItem.status || "-"}</p>
                <p>Level: {caseItem.level || "-"}</p>
                <p>Updated: {formatDate(caseItem.updated_at)}</p>
              </div>
            </div>

            <div className="mb-3 grid gap-2 text-xs text-zinc-400 md:grid-cols-2 xl:grid-cols-3">
              <p>
                <span className="text-zinc-500">Created by:</span>{" "}
                {Number(caseItem.created_by) ? `#${caseItem.created_by}` : "-"}
              </p>
              <p>
                <span className="text-zinc-500">Creator role:</span>{" "}
                {caseItem.created_by_role || usersById.get(Number(caseItem.created_by))?.role_name || "-"}
              </p>
              {assignmentFields.slice(0, 4).map((field) => (
                <p key={`${caseItem.id}-summary-${field.key}`}>
                  <span className="text-zinc-500">{field.label}:</span>{" "}
                  {resolveCurrentAssignee(caseItem, field.key)}
                </p>
              ))}
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {assignmentFields.map((field) => {
                const options = optionsByField[field.key] || [];
                const selectedValue = selectedByCase[caseItem.id]?.[field.key] ?? "";
                return (
                  <div key={`${caseItem.id}-${field.key}`}>
                    <p className="mb-1 text-xs uppercase tracking-wide text-zinc-500">{field.label}</p>
                    <p className="mb-1 text-xs text-zinc-400">
                      Current: {resolveCurrentAssignee(caseItem, field.key)}
                    </p>
                    <select
                      className="input"
                      value={selectedValue}
                      onChange={(event) => setFieldValue(caseItem.id, field.key, event.target.value)}
                    >
                      <option value="">No change</option>
                      <option value="0">Unassign</option>
                      {options.map((user) => (
                        <option key={`${field.key}-${user.id}`} value={user.id}>
                          {userLabel(user)}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <Link to={`/cases/${caseItem.id}`} className="text-sm text-brass hover:underline">
                Open case details
              </Link>
              <button
                className="btn-primary"
                onClick={() => saveAssignments(caseItem)}
                disabled={loading || savingCaseId === Number(caseItem.id)}
              >
                {savingCaseId === Number(caseItem.id) ? "Saving..." : "Apply Assignment"}
              </button>
            </div>
          </article>
        ))}

        {!loading && !cases.length && <p className="card p-4 text-sm text-zinc-400">{emptyMessage}</p>}
      </div>
    </section>
  );
}
