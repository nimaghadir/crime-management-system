import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { isDetectiveRole } from "../lib/roleRouting";
import { formatUiApiError } from "../lib/uiApiError";
import { Skeleton } from "../components/Skeleton";

const ORDINARY_ROLE_KEYWORDS = [
  "complainant",
  "citizen",
  "witness",
  "suspect",
  "basic user",
  "shaki",
  "plaintiff",
];

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function includesAny(text, keywords = []) {
  const normalized = normalizeText(text);
  return keywords.some((keyword) => normalized.includes(normalizeText(keyword)));
}

function isActiveCaseStatus(status) {
  return !["resolved", "closed", "voided"].includes(normalizeText(status));
}

function isEvidenceFromOrdinaryUser(evidence, caseItem) {
  const candidates = [
    evidence?.submitted_by_role,
    evidence?.created_by_role,
    evidence?.uploader_role,
    evidence?.uploaded_by_role,
    evidence?.source_role,
    evidence?.metadata?.submitted_by_role,
    caseItem?.created_by_role,
  ];
  return candidates.some((item) => includesAny(item, ORDINARY_ROLE_KEYWORDS));
}

function formatDate(value) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "-";
  }
}

export function EvidenceReviewPage() {
  const { token, user, roleName } = useAuth();
  const detectiveView = isDetectiveRole(roleName);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [verifyingId, setVerifyingId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const visibleRows = useMemo(() => {
    if (statusFilter === "all") return rows;
    return rows.filter((item) => normalizeText(item.status) === normalizeText(statusFilter));
  }, [rows, statusFilter]);

  async function loadEvidenceQueue() {
    setLoading(true);
    setError("");
    try {
      const allCases = await api.listCases(token);
      const detectiveCases = (allCases || []).filter((item) => {
        const detectiveId = Number(item?.detective_id ?? item?.assigned_to);
        return detectiveId > 0 && detectiveId === Number(user?.id) && isActiveCaseStatus(item?.status);
      });

      const nestedEvidence = await Promise.all(
        detectiveCases.map(async (caseItem) => {
          const evidence = await api.listEvidence(token, caseItem.id);
          return (evidence || [])
            .filter((item) => isEvidenceFromOrdinaryUser(item, caseItem))
            .map((item) => ({
              ...item,
              case_id: Number(caseItem.id),
              case_title: caseItem.title,
              case_status: caseItem.status,
              submitter_role:
                item?.submitted_by_role ||
                item?.created_by_role ||
                item?.uploader_role ||
                item?.uploaded_by_role ||
                caseItem?.created_by_role ||
                "Unknown",
            }));
        }),
      );

      const flat = nestedEvidence
        .flat()
        .sort((left, right) => Number(right.id) - Number(left.id));

      setRows(flat);
    } catch (err) {
      setError(formatUiApiError(err, "Failed to load evidence review queue."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!detectiveView) return;
    loadEvidenceQueue();
  }, [detectiveView, token, user?.id]);

  async function verifyEvidence(evidenceId) {
    setVerifyingId(Number(evidenceId));
    setError("");
    setMessage("");
    try {
      const updated = await api.verifyEvidence(token, evidenceId);
      setRows((prev) =>
        prev.map((item) =>
          Number(item.id) === Number(evidenceId)
            ? {
                ...item,
                ...updated,
                status: updated?.status || "verified",
              }
            : item,
        ),
      );
      setMessage(`Evidence #${evidenceId} verified.`);
    } catch (err) {
      setError(formatUiApiError(err, "Failed to verify evidence."));
    } finally {
      setVerifyingId(null);
    }
  }

  if (!detectiveView) {
    return (
      <section>
        <h1 className="font-display text-3xl uppercase text-brass">Evidence Review</h1>
        <p className="mt-2 text-zinc-400">Only detective users can review this queue.</p>
      </section>
    );
  }

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl uppercase text-brass">Evidence Review</h1>
          <p className="mt-1 text-zinc-400">
            Review evidence submitted by ordinary users and verify valid entries.
          </p>
        </div>
        <div className="flex gap-2">
          <Link className="btn-secondary" to="/interrogation">
            Back to Interrogation
          </Link>
          <button className="btn-secondary" onClick={loadEvidenceQueue} disabled={loading || verifyingId !== null}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {error && <p className="mb-4 text-danger">{error}</p>}
      {message && <p className="mb-4 text-emerald-400">{message}</p>}

      <div className="mb-3 flex items-center gap-2">
        <span className="text-sm text-zinc-400">Filter:</span>
        <select className="input max-w-48" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="pending">Pending</option>
          <option value="verified">Verified</option>
          <option value="all">All</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-700">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-zinc-900 text-zinc-300">
            <tr>
              <th className="px-3 py-2">Evidence ID</th>
              <th className="px-3 py-2">Case</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Submitted By</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Created</th>
              <th className="px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {!loading &&
              visibleRows.map((item) => {
                const pending = normalizeText(item.status) !== "verified";
                return (
                  <tr key={`${item.case_id}-${item.id}`} className="border-t border-zinc-800 hover:bg-zinc-900/40">
                    <td className="px-3 py-2">#{item.id}</td>
                    <td className="px-3 py-2">
                      <Link className="text-brass hover:underline" to={`/cases/${item.case_id}`}>
                        #{item.case_id} - {item.case_title || "-"}
                      </Link>
                    </td>
                    <td className="px-3 py-2">{item.type || "-"}</td>
                    <td className="px-3 py-2">{item.submitter_role || "Unknown"}</td>
                    <td className="px-3 py-2">{item.status || "-"}</td>
                    <td className="px-3 py-2">{formatDate(item.created_at)}</td>
                    <td className="px-3 py-2">
                      <button
                        className="btn-primary"
                        onClick={() => verifyEvidence(item.id)}
                        disabled={!pending || verifyingId === Number(item.id)}
                      >
                        {verifyingId === Number(item.id)
                          ? "Verifying..."
                          : pending
                            ? "Verify"
                            : "Verified"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            {!loading && !visibleRows.length && (
              <tr>
                <td className="px-3 py-6 text-zinc-400" colSpan={7}>
                  No evidence item found for this filter.
                </td>
              </tr>
            )}
            {loading && (
              Array.from({ length: 4 }).map((_, index) => (
                <tr key={`evidence-skeleton-${index}`} className="border-t border-zinc-800">
                  <td className="px-3 py-3"><Skeleton className="h-4 w-12" /></td>
                  <td className="px-3 py-3"><Skeleton className="h-4 w-48" /></td>
                  <td className="px-3 py-3"><Skeleton className="h-4 w-20" /></td>
                  <td className="px-3 py-3"><Skeleton className="h-4 w-24" /></td>
                  <td className="px-3 py-3"><Skeleton className="h-4 w-20" /></td>
                  <td className="px-3 py-3"><Skeleton className="h-4 w-32" /></td>
                  <td className="px-3 py-3"><Skeleton className="h-9 w-20 rounded" /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
