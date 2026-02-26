import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { formatUiApiError } from "../lib/uiApiError";
import { Skeleton, SkeletonLines } from "../components/Skeleton";

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

export function BailPaymentReturnPage() {
  const { token } = useAuth();
  const [params] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const suspectRowId = useMemo(() => {
    const raw = params.get("suspectRowId");
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [params]);

  const authority = useMemo(
    () => String(params.get("Authority") || params.get("authority") || "").trim(),
    [params],
  );
  const gatewayStatus = useMemo(
    () => String(params.get("Status") || params.get("status") || "").trim().toUpperCase(),
    [params],
  );

  useEffect(() => {
    let alive = true;
    async function run() {
      setLoading(true);
      setError("");
      setResult(null);

      if (!suspectRowId) {
        setError("Missing suspect row id in payment callback URL.");
        setLoading(false);
        return;
      }
      if (!authority) {
        setError("Missing gateway authority in callback URL.");
        setLoading(false);
        return;
      }

      try {
        const data = await api.verifySuspectBailPayment(token, suspectRowId, {
          authority,
          status: gatewayStatus,
        });
        if (!alive) return;
        setResult(data);
      } catch (err) {
        if (!alive) return;
        setError(formatUiApiError(err, "Failed to verify bail/fine payment with the gateway."));
      } finally {
        if (alive) setLoading(false);
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, [authority, gatewayStatus, suspectRowId, token]);

  const row = result?.suspect_row || null;
  const paidSuccess = Boolean(result?.verified) && ["paid", "already_verified", "already_paid"].includes(String(result?.gateway_status || ""));
  const cancelled = String(result?.gateway_status || "").trim() === "cancelled";

  return (
    <section className="space-y-4">
      <div className="card p-4">
        <h1 className="font-display text-3xl uppercase text-brass">Payment Gateway Return</h1>
        <p className="mt-2 text-zinc-400">
          ZarinPal sandbox callback page for bail/fine payment verification.
        </p>
      </div>

      {loading && (
        <div className="card p-4">
          <Skeleton className="h-5 w-56" />
          <SkeletonLines lines={4} widths={["w-full", "w-4/5", "w-2/3", "w-3/5"]} />
        </div>
      )}

      {!loading && error && (
        <div className="card border border-danger/40 bg-danger/5 p-4">
          <p className="font-semibold text-danger">Payment Verification Failed</p>
          <p className="mt-2 text-sm text-zinc-200">{error}</p>
          <div className="mt-4 flex gap-2">
            <Link to="/bail" className="btn-secondary">Back To Bail & Fine</Link>
          </div>
        </div>
      )}

      {!loading && !error && result && (
        <div className="space-y-4">
          <div className={`card p-4 ${paidSuccess ? "border border-emerald-500/30 bg-emerald-500/5" : cancelled ? "border border-zinc-700" : "border border-danger/30 bg-danger/5"}`}>
            <p className={`font-semibold ${paidSuccess ? "text-emerald-300" : cancelled ? "text-zinc-200" : "text-danger"}`}>
              {paidSuccess
                ? "Payment Verified"
                : cancelled
                  ? "Payment Was Cancelled"
                  : "Payment Was Not Verified"}
            </p>
            <p className="mt-2 text-sm text-zinc-300">
              {paidSuccess
                ? "Bail/fine payment was verified and the suspect release flow has been finalized."
                : cancelled
                  ? "The gateway returned a cancelled/failed payment status. No release was applied."
                  : "The gateway callback was received, but verification did not complete successfully."}
            </p>
            <div className="mt-3 grid gap-2 text-sm text-zinc-300 sm:grid-cols-2">
              <p><span className="text-zinc-500">Authority:</span> {result.authority || authority || "-"}</p>
              <p><span className="text-zinc-500">Gateway Status:</span> {prettyStatus(result.gateway_status || gatewayStatus || "-")}</p>
              <p><span className="text-zinc-500">Ref ID:</span> {result.ref_id || "-"}</p>
              <p><span className="text-zinc-500">Gateway Code:</span> {result.gateway_code ?? "-"}</p>
            </div>
          </div>

          {row && (
            <div className="card p-4">
              <p className="font-semibold text-paper">
                {row.case_title ? `Case #${row.case_id} - ${row.case_title}` : `Case #${row.case_id}`}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Suspect record #{row.id} | Status: {prettyStatus(row.arrest_status || row.status)}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Judicial: {prettyStatus(row.judicial_outcome)}{row.released_on_bail ? " | Released on bail/fine" : ""}
              </p>
              <div className="mt-3 rounded border border-zinc-800 bg-zinc-950/30 p-3 text-sm">
                <p><span className="text-zinc-400">Bail/Fine Amount:</span> {formatMoney(row.bail_amount)}</p>
                <p className="mt-1"><span className="text-zinc-400">Paid At:</span> {row.bail_paid_at ? new Date(row.bail_paid_at).toLocaleString() : "-"}</p>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Link to="/bail" className="btn-primary">Back To Bail & Fine</Link>
          </div>
        </div>
      )}
    </section>
  );
}
