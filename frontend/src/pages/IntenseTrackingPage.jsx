import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { isBasicUserRole } from "../lib/roleRouting";
import { formatUiApiError } from "../lib/uiApiError";
import { Skeleton, SkeletonLines } from "../components/Skeleton";

function formatNumber(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "-";
  return new Intl.NumberFormat().format(numeric);
}

function formatDate(value) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return String(value);
  }
}

export function IntenseTrackingPage() {
  const { token, roleName } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadRows() {
    setLoading(true);
    setError("");
    try {
      const data = await api.listIntenseTrackingSuspects(token);
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(formatUiApiError(err, "Failed to load intense tracking suspects."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRows();
  }, [token]);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl uppercase text-brass">Under Intense Tracking</h1>
          <p className="mt-1 text-zinc-400">
            Public ranking for suspects/criminals under pursuit for more than one month.
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Ranking score = maxD x maxL | Reward (IRR) = 20,000,000 x maxD x maxL
          </p>
        </div>
        <div className="flex gap-2">
          {isBasicUserRole(roleName) && (
            <Link className="btn-primary" to="/tips/submit">
              Submit Information
            </Link>
          )}
          <button className="btn-secondary" onClick={loadRows} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {error && <p className="text-danger">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-400">Tracked Persons</p>
          <p className="mt-1 text-2xl font-semibold text-paper">
            {loading ? <Skeleton as="span" className="inline-block h-8 w-16 align-middle" /> : rows.length}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-400">Top Score</p>
          <p className="mt-1 text-2xl font-semibold text-paper">
            {loading ? (
              <Skeleton as="span" className="inline-block h-8 w-16 align-middle" />
            ) : (
              rows[0]?.ranking_score ?? 0
            )}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-400">Highest Reward</p>
          <p className="mt-1 text-xl font-semibold text-paper">
            {loading ? (
              <Skeleton as="span" className="inline-block h-7 w-40 align-middle" />
            ) : rows.length ? (
              `${formatNumber(rows[0]?.reward_amount_rial)} IRR`
            ) : (
              "-"
            )}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-400">Threshold</p>
          <p className="mt-1 text-2xl font-semibold text-paper">
            {loading ? <Skeleton as="span" className="inline-block h-8 w-24 align-middle" /> : <>&gt; 30 days</>}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {!loading &&
          rows.map((item) => (
            <article key={item.suspect_key} className="card p-4">
              <div className="flex flex-col gap-4 lg:flex-row">
                <div className="flex items-start gap-3 lg:w-[21rem]">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-zinc-700 bg-zinc-900">
                    {item.photo_url ? (
                      <img className="h-full w-full object-cover" src={item.photo_url} alt={item.display_name} />
                    ) : (
                      <span className="text-xs text-zinc-500">No Photo</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-brass">
                      #{item.rank} {item.display_name}
                    </p>
                    <p className="truncate text-xs text-zinc-500">
                      National ID: {item.national_id || "-"}
                    </p>
                    <p className="mt-1 text-sm text-zinc-300">Status: {item.current_status || "-"}</p>
                    {item.last_known_location && (
                      <p className="mt-1 text-xs text-zinc-400">Last known: {item.last_known_location}</p>
                    )}
                  </div>
                </div>

                <div className="grid flex-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded border border-zinc-800 bg-zinc-950/40 p-3">
                    <p className="text-xs uppercase tracking-wide text-zinc-500">maxD</p>
                    <p className="mt-1 text-xl font-semibold">{item.max_tracking_days}</p>
                    <p className="text-xs text-zinc-500">days under pursuit</p>
                  </div>
                  <div className="rounded border border-zinc-800 bg-zinc-950/40 p-3">
                    <p className="text-xs uppercase tracking-wide text-zinc-500">maxL</p>
                    <p className="mt-1 text-xl font-semibold">{item.max_level_weight}</p>
                    <p className="text-xs text-zinc-500">crime-level weight</p>
                  </div>
                  <div className="rounded border border-zinc-800 bg-zinc-950/40 p-3">
                    <p className="text-xs uppercase tracking-wide text-zinc-500">Ranking</p>
                    <p className="mt-1 text-xl font-semibold">{item.ranking_score}</p>
                    <p className="text-xs text-zinc-500">maxD x maxL</p>
                  </div>
                  <div className="rounded border border-emerald-500/20 bg-emerald-950/10 p-3">
                    <p className="text-xs uppercase tracking-wide text-zinc-500">Reward</p>
                    <p className="mt-1 text-lg font-semibold text-emerald-300">
                      {formatNumber(item.reward_amount_rial)} IRR
                    </p>
                    <p className="text-xs text-zinc-500">for useful information</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded border border-zinc-800 bg-zinc-950/30 p-3">
                <p className="mb-2 text-xs uppercase tracking-wide text-zinc-500">
                  Related Records Used In Ranking
                </p>
                <div className="max-h-52 overflow-y-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-xs uppercase tracking-wide text-zinc-500">
                      <tr>
                        <th className="px-2 py-1">Case</th>
                        <th className="px-2 py-1">Status</th>
                        <th className="px-2 py-1">Tracking Start</th>
                        <th className="px-2 py-1">Days</th>
                        <th className="px-2 py-1">L</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(item.records || []).map((record) => (
                        <tr key={`${item.suspect_key}-${record.suspect_id}-${record.case_id}`} className="border-t border-zinc-800">
                          <td className="px-2 py-2">
                            #{record.case_id} {record.case_title ? `- ${record.case_title}` : ""}
                          </td>
                          <td className="px-2 py-2">{record.status || "-"}</td>
                          <td className="px-2 py-2">{formatDate(record.tracking_started_at)}</td>
                          <td className="px-2 py-2">{record.tracking_days}</td>
                          <td className="px-2 py-2">{record.level_weight}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </article>
          ))}

        {!loading && !rows.length && (
          <div className="card p-4 text-zinc-500">
            No suspect currently matches the intense-tracking threshold.
          </div>
        )}
        {loading &&
          Array.from({ length: 2 }).map((_, index) => (
            <article key={`tracking-skeleton-${index}`} className="card p-4">
              <div className="flex flex-col gap-4 lg:flex-row">
                <div className="flex items-start gap-3 lg:w-[21rem]">
                  <Skeleton className="h-16 w-16 shrink-0 rounded-md" />
                  <div className="min-w-0 flex-1">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="mt-2 h-3 w-32" />
                    <Skeleton className="mt-2 h-3 w-24" />
                    <Skeleton className="mt-2 h-3 w-28" />
                  </div>
                </div>
                <div className="grid flex-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {Array.from({ length: 4 }).map((__, statIndex) => (
                    <div
                      key={`tracking-skeleton-stat-${index}-${statIndex}`}
                      className="rounded border border-zinc-800 bg-zinc-950/40 p-3"
                    >
                      <Skeleton className="h-3 w-14" />
                      <Skeleton className="mt-2 h-6 w-16" />
                      <Skeleton className="mt-2 h-3 w-20" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-4 rounded border border-zinc-800 bg-zinc-950/30 p-3">
                <Skeleton className="mb-2 h-3 w-44" />
                <SkeletonLines lines={4} widths={["w-full", "w-full", "w-5/6", "w-2/3"]} />
              </div>
            </article>
          ))}
      </div>
    </section>
  );
}
