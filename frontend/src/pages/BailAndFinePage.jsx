import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { isSergeantRole, isSuspectRole } from "../lib/roleRouting";
import { formatUiApiError } from "../lib/uiApiError";
import { Skeleton, SkeletonLines } from "../components/Skeleton";
import { ConfirmDialog } from "../components/ConfirmDialog";

function formatMoney(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "-";
  return `${new Intl.NumberFormat().format(amount)} IRR`;
}

function prettyStatus(value) {
  return String(value || "-")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function EligibilityBadge({ eligibility }) {
  if (!eligibility) {
    return <span className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-400">Unknown</span>;
  }
  if (eligibility.eligible) {
    return <span className="rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300">Eligible</span>;
  }
  return <span className="rounded border border-danger/40 bg-danger/10 px-2 py-1 text-xs text-danger">Not Eligible</span>;
}

function SergeantBailPanel({ token }) {
  const [cases, setCases] = useState([]);
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [rows, setRows] = useState([]);
  const [loadingCases, setLoadingCases] = useState(false);
  const [loadingRows, setLoadingRows] = useState(false);
  const [submittingRowId, setSubmittingRowId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [amountByRow, setAmountByRow] = useState({});
  const [noteByRow, setNoteByRow] = useState({});

  async function loadCases() {
    setLoadingCases(true);
    setError("");
    try {
      const data = await api.listMyCases(token);
      const list = Array.isArray(data) ? data : [];
      setCases(list);
      setSelectedCaseId((prev) => {
        if (prev && list.some((item) => String(item.id) === String(prev))) return prev;
        return list[0] ? String(list[0].id) : "";
      });
    } catch (err) {
      setError(formatUiApiError(err, "Failed to load your assigned cases."));
    } finally {
      setLoadingCases(false);
    }
  }

  async function loadRows(caseId = selectedCaseId) {
    const targetCaseId = Number(caseId);
    if (!targetCaseId) {
      setRows([]);
      return;
    }
    setLoadingRows(true);
    setError("");
    setMessage("");
    try {
      const data = await api.listSergeantBailCandidates(token, { caseId: targetCaseId });
      const list = Array.isArray(data) ? data : [];
      setRows(list);
      setAmountByRow((prev) => {
        const next = { ...prev };
        list.forEach((item) => {
          if (next[item.id] === undefined && item.bail_amount) next[item.id] = String(item.bail_amount);
        });
        return next;
      });
      setNoteByRow((prev) => {
        const next = { ...prev };
        list.forEach((item) => {
          if (next[item.id] === undefined && item.bail_notes) next[item.id] = item.bail_notes;
        });
        return next;
      });
    } catch (err) {
      setRows([]);
      setError(formatUiApiError(err, "Failed to load bail/fine candidates."));
    } finally {
      setLoadingRows(false);
    }
  }

  useEffect(() => {
    loadCases();
  }, [token]);

  useEffect(() => {
    if (selectedCaseId) loadRows(selectedCaseId);
    else setRows([]);
  }, [selectedCaseId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function submitOffer(row) {
    const amount = String(amountByRow[row.id] || "").trim();
    const note = String(noteByRow[row.id] || "").trim();
    if (!amount) {
      setError("Enter a bail/fine amount.");
      return;
    }
    setSubmittingRowId(row.id);
    setError("");
    setMessage("");
    try {
      const updated = await api.offerSuspectBail(token, row.id, { amount, note });
      setRows((prev) => prev.map((item) => (Number(item.id) === Number(updated.id) ? updated : item)));
      setMessage(`Bail/fine amount set for suspect #${row.id}.`);
    } catch (err) {
      setError(formatUiApiError(err, "Failed to set bail/fine amount."));
    } finally {
      setSubmittingRowId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <h2 className="font-display text-2xl uppercase text-brass">Sergeant Bail / Fine Setup</h2>
        <p className="mt-2 text-sm text-zinc-300">
          Select a suspect from one of your cases and set an amount only when the suspect is eligible.
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          Rule used now: suspect must not have any linked high-level case and must be in a valid detained/trial state. If already convicted, bail/fine is allowed only for the lowest crime level (Level 1).
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="min-w-[280px]">
            <label className="mb-1 block text-xs uppercase tracking-wide text-zinc-400">Assigned Case</label>
            <select
              className="input"
              value={selectedCaseId}
              onChange={(e) => setSelectedCaseId(e.target.value)}
              disabled={loadingCases || !cases.length}
            >
              {!cases.length ? (
                <option value="">{loadingCases ? "Loading cases..." : "No assigned case"}</option>
              ) : null}
              {cases.map((item) => (
                <option key={`bail-case-${item.id}`} value={String(item.id)}>
                  {`Case #${item.id}${item.title ? ` - ${item.title}` : ""}`}
                </option>
              ))}
            </select>
          </div>
          <button className="btn-secondary" onClick={() => loadRows(selectedCaseId)} disabled={!selectedCaseId || loadingRows}>
            {loadingRows ? "Refreshing..." : "Refresh Candidates"}
          </button>
        </div>
      </div>

      {error && <p className="text-danger">{error}</p>}
      {message && <p className="text-emerald-300">{message}</p>}

      <div className="card overflow-hidden p-0">
        <div className="border-b border-zinc-800 px-4 py-3">
          <p className="font-semibold">Case Suspects - Bail/Fine Eligibility</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-zinc-900/60 text-xs uppercase tracking-wide text-zinc-400">
              <tr>
                <th className="px-3 py-2">Suspect</th>
                <th className="px-3 py-2">Current Status</th>
                <th className="px-3 py-2">Case Person</th>
                <th className="px-3 py-2">Eligibility</th>
                <th className="px-3 py-2">Current Amount</th>
                <th className="px-3 py-2">Set Amount</th>
                <th className="px-3 py-2">Note</th>
                <th className="px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {loadingRows &&
                Array.from({ length: 3 }).map((_, idx) => (
                  <tr key={`bail-skel-${idx}`} className="border-t border-zinc-800">
                    <td className="px-3 py-3" colSpan={8}>
                      <SkeletonLines lines={2} widths={["w-full", "w-2/3"]} />
                    </td>
                  </tr>
                ))}

              {!loadingRows &&
                rows.map((row) => {
                  const eligibility = row.bail_eligibility;
                  const canSet = Boolean(eligibility?.eligible) && !row.bail_paid_at;
                  const reasons = Array.isArray(eligibility?.reasons) ? eligibility.reasons : [];
                  return (
                    <tr key={`bail-row-${row.id}`} className="border-t border-zinc-800 align-top">
                      <td className="px-3 py-3">
                        <p className="font-medium text-paper">{row.name || `Suspect #${row.id}`}</p>
                        <p className="text-xs text-zinc-500">#{row.id} | National ID: {row.national_id || "-"}</p>
                      </td>
                      <td className="px-3 py-3">
                        <p>{prettyStatus(row.arrest_status || row.status)}</p>
                        {row.released_on_bail && (
                          <p className="mt-1 text-xs text-emerald-300">Released on bail/fine</p>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <p>{prettyStatus(row.case_person_type)}</p>
                        <p className="mt-1 text-xs text-zinc-500">Judicial: {prettyStatus(row.judicial_outcome)}</p>
                      </td>
                      <td className="px-3 py-3">
                        <EligibilityBadge eligibility={eligibility} />
                        {!!reasons.length && (
                          <ul className="mt-2 space-y-1 text-xs text-zinc-500">
                            {reasons.map((reason, idx) => (
                              <li key={`reason-${row.id}-${idx}`}>- {reason}</li>
                            ))}
                          </ul>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {row.bail_amount ? (
                          <>
                            <p>{formatMoney(row.bail_amount)}</p>
                            <p className="mt-1 text-xs text-zinc-500">
                              {row.bail_paid_at ? `Paid: ${new Date(row.bail_paid_at).toLocaleString()}` : "Not paid yet"}
                            </p>
                          </>
                        ) : (
                          <span className="text-zinc-500">-</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <input
                          className="input min-w-[160px]"
                          inputMode="numeric"
                          placeholder="Amount (IRR)"
                          value={amountByRow[row.id] ?? ""}
                          onChange={(e) => setAmountByRow((prev) => ({ ...prev, [row.id]: e.target.value }))}
                          disabled={!canSet || submittingRowId === row.id}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <textarea
                          className="input min-h-[64px] w-full resize-y"
                          placeholder="Optional note"
                          value={noteByRow[row.id] ?? ""}
                          onChange={(e) => setNoteByRow((prev) => ({ ...prev, [row.id]: e.target.value }))}
                          disabled={!canSet || submittingRowId === row.id}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <button
                          className="btn-primary whitespace-nowrap"
                          onClick={() => submitOffer(row)}
                          disabled={!canSet || submittingRowId === row.id}
                        >
                          {submittingRowId === row.id ? "Saving..." : row.bail_amount && !row.bail_paid_at ? "Update Amount" : "Set Bail/Fine"}
                        </button>
                      </td>
                    </tr>
                  );
                })}

              {!loadingRows && !rows.length && (
                <tr className="border-t border-zinc-800">
                  <td className="px-3 py-6 text-zinc-500" colSpan={8}>
                    No suspect linked to this case yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SuspectBailPanel({ token }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pendingPayRow, setPendingPayRow] = useState(null);
  const [busyPayId, setBusyPayId] = useState(null);

  async function loadRows() {
    setLoading(true);
    setError("");
    try {
      const data = await api.listMyBailOffers(token);
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(formatUiApiError(err, "Failed to load your bail/fine payment items."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRows();
  }, [token]);

  async function confirmPay() {
    if (!pendingPayRow) return;
    setBusyPayId(pendingPayRow.id);
    setError("");
    setMessage("");
    try {
      const init = await api.paySuspectBail(token, pendingPayRow.id);
      const paymentUrl = String(init?.payment_url || "").trim();
      if (!paymentUrl) {
        throw new Error("Payment gateway did not return a redirect URL.");
      }
      setMessage("Redirecting to ZarinPal sandbox payment gateway...");
      setPendingPayRow(null);
      window.location.assign(paymentUrl);
    } catch (err) {
      setError(formatUiApiError(err, "Failed to start ZarinPal sandbox payment."));
    } finally {
      setBusyPayId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <h2 className="font-display text-2xl uppercase text-brass">Bail / Fine Payment</h2>
        <p className="mt-2 text-sm text-zinc-300">
          Payment is routed through the ZarinPal sandbox gateway. After simulated payment, you will return to the system and the bail/fine release flow will be finalized.
        </p>
        <button className="btn-secondary mt-3" onClick={loadRows} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && <p className="text-danger">{error}</p>}
      {message && <p className="text-emerald-300">{message}</p>}

      <div className="grid gap-4 lg:grid-cols-2">
        {loading &&
          Array.from({ length: 2 }).map((_, idx) => (
            <div key={`bail-pay-skel-${idx}`} className="card p-4">
              <Skeleton className="h-4 w-40" />
              <SkeletonLines lines={4} widths={["w-full", "w-5/6", "w-3/4", "w-1/2"]} />
              <Skeleton className="mt-3 h-10 w-44 rounded" />
            </div>
          ))}

        {!loading &&
          rows.map((row) => {
            const canPay = Boolean(row.can_pay && row.bail_amount && !row.bail_paid_at && !row.released_on_bail);
            return (
              <article key={`bail-offer-${row.id}`} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-paper">{row.case_title ? `Case #${row.case_id} - ${row.case_title}` : `Case #${row.case_id}`}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      Suspect record #{row.id} | Status: {prettyStatus(row.arrest_status || row.status)}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      Judicial: {prettyStatus(row.judicial_outcome)}{row.released_on_bail ? " | Released on bail/fine" : ""}
                    </p>
                  </div>
                  <EligibilityBadge eligibility={row.bail_eligibility} />
                </div>

                <div className="mt-4 rounded border border-zinc-800 bg-zinc-950/30 p-3">
                  <p className="text-xs uppercase tracking-wide text-zinc-500">Amount To Pay</p>
                  <p className="mt-1 text-xl font-semibold text-emerald-300">{formatMoney(row.bail_amount)}</p>
                  {row.bail_set_at && (
                    <p className="mt-1 text-xs text-zinc-500">Set at: {new Date(row.bail_set_at).toLocaleString()}</p>
                  )}
                  {row.bail_notes && (
                    <p className="mt-2 text-sm text-zinc-300">
                      <span className="text-zinc-400">Sergeant note:</span> {row.bail_notes}
                    </p>
                  )}
                  {row.bail_paid_at && (
                    <p className="mt-2 text-sm text-emerald-300">Paid at: {new Date(row.bail_paid_at).toLocaleString()}</p>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    className="btn-primary"
                    disabled={!canPay || busyPayId === row.id}
                    onClick={() => setPendingPayRow(row)}
                  >
                    {busyPayId === row.id ? "Processing..." : canPay ? "Pay (ZarinPal Sandbox)" : "Payment Not Available"}
                  </button>
                </div>
              </article>
            );
          })}

        {!loading && !rows.length && (
          <div className="card p-4 text-zinc-500">No bail / fine payment item is currently assigned to your suspect account.</div>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(pendingPayRow)}
        title={pendingPayRow ? `Pay Bail/Fine for Case #${pendingPayRow.case_id}` : "Pay Bail/Fine"}
        subtitle={pendingPayRow ? `Suspect record #${pendingPayRow.id}` : ""}
        description="You will be redirected to the ZarinPal sandbox gateway. After simulated payment, the gateway returns to the system callback page to verify and finalize the release."
        tone="default"
        confirmLabel="Go To Sandbox Gateway"
        busy={Boolean(pendingPayRow && busyPayId === pendingPayRow.id)}
        onClose={() => (busyPayId ? null : setPendingPayRow(null))}
        onConfirm={confirmPay}
      >
        {pendingPayRow && (
          <div className="rounded border border-zinc-800 bg-zinc-900/40 p-3 text-sm">
            <p><span className="text-zinc-400">Case:</span> #{pendingPayRow.case_id} {pendingPayRow.case_title ? `- ${pendingPayRow.case_title}` : ""}</p>
            <p className="mt-1"><span className="text-zinc-400">Amount:</span> {formatMoney(pendingPayRow.bail_amount)}</p>
            <p className="mt-1"><span className="text-zinc-400">Current status:</span> {prettyStatus(pendingPayRow.arrest_status || pendingPayRow.status)}</p>
            <p className="mt-2 text-xs text-zinc-500">Return page: <span className="text-zinc-300">/bail/return</span></p>
          </div>
        )}
      </ConfirmDialog>
    </div>
  );
}

export function BailAndFinePage() {
  const { token, roleName } = useAuth();
  const sergeantView = isSergeantRole(roleName);
  const suspectView = isSuspectRole(roleName);

  if (!sergeantView && !suspectView) {
    return (
      <section className="card p-4">
        <h1 className="font-display text-3xl uppercase text-brass">Bail & Fine</h1>
        <p className="mt-2 text-zinc-400">This module is available only for sergeants and suspect users.</p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div>
        <h1 className="font-display text-3xl uppercase text-brass">Bail & Fine (Optional)</h1>
        <p className="mt-1 text-zinc-400">
          {sergeantView
            ? "Set bail/fine amount for eligible suspects in your assigned cases."
            : "Review and pay assigned bail/fine amounts through the ZarinPal sandbox gateway."}
        </p>
      </div>

      {sergeantView ? <SergeantBailPanel token={token} /> : <SuspectBailPanel token={token} />}
    </section>
  );
}
