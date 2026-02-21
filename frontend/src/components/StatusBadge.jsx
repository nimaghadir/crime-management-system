const statusMap = {
  open: "bg-violet-600/20 text-violet-300 border-violet-600/70",
  in_progress: "bg-purple-600/20 text-purple-300 border-purple-600/70",
  resolved: "bg-emerald-700/20 text-emerald-300 border-emerald-700",
  closed: "bg-zinc-700/30 text-zinc-300 border-zinc-700",
  pending: "bg-purple-600/20 text-purple-300 border-purple-600/70",
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
