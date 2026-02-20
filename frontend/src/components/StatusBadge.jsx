const statusMap = {
  open: "bg-sky-700/30 text-sky-300 border-sky-700",
  in_progress: "bg-amber-700/20 text-amber-300 border-amber-700",
  resolved: "bg-emerald-700/20 text-emerald-300 border-emerald-700",
  closed: "bg-zinc-700/30 text-zinc-300 border-zinc-700",
  pending: "bg-amber-700/20 text-amber-300 border-amber-700",
  verified: "bg-emerald-700/20 text-emerald-300 border-emerald-700",
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
