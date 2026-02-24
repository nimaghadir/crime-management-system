const statusMap = {
  open: "bg-violet-600/20 text-violet-300 border-violet-600/70",
  in_progress: "bg-purple-600/20 text-purple-300 border-purple-600/70",
  resolved: "bg-emerald-700/20 text-emerald-300 border-emerald-700",
  closed: "bg-zinc-700/30 text-zinc-300 border-zinc-700",
  pending: "bg-purple-600/20 text-purple-300 border-purple-600/70",
  pending_cadet_review: "bg-indigo-600/20 text-indigo-300 border-indigo-600/70",
  pending_cadet_recheck: "bg-indigo-500/20 text-indigo-300 border-indigo-500/70",
  needs_complainant_revision: "bg-amber-600/20 text-amber-300 border-amber-600/70",
  pending_officer_review: "bg-sky-600/20 text-sky-300 border-sky-600/70",
  pending_superior_approval: "bg-cyan-600/20 text-cyan-300 border-cyan-600/70",
  needs_creator_revision: "bg-amber-700/20 text-amber-300 border-amber-700/70",
  formed: "bg-emerald-600/20 text-emerald-300 border-emerald-600/70",
  verified: "bg-emerald-700/20 text-emerald-300 border-emerald-700",
  pending_forensic: "bg-fuchsia-600/20 text-fuchsia-300 border-fuchsia-600/70",
  forensic_rejected: "bg-rose-700/20 text-rose-300 border-rose-700",
  rejected_by_officer: "bg-rose-700/20 text-rose-300 border-rose-700",
  pending_detective: "bg-blue-600/20 text-blue-300 border-blue-600/70",
  rejected_by_detective: "bg-rose-700/20 text-rose-300 border-rose-700",
  approved_rewarded: "bg-emerald-700/20 text-emerald-300 border-emerald-700",
  rejected: "bg-rose-700/20 text-rose-300 border-rose-700",
};

export function StatusBadge({ value }) {
  const normalized = String(value || "").toLowerCase();
  const classes = statusMap[normalized] || "bg-zinc-800 text-zinc-200 border-zinc-600";

  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${classes}`}>
      {normalized.replaceAll("_", " ") || "unknown"}
    </span>
  );
}
