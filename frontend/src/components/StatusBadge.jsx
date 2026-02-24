const STATUS_META = {
  awaiting_validation: {
    label: "Awaiting Validation",
    classes: "bg-sky-600/15 text-sky-300 border-sky-500/60",
  },
  invalidated: {
    label: "Invalidated",
    classes: "bg-rose-600/15 text-rose-300 border-rose-500/60",
  },
  open: {
    label: "Open",
    classes: "bg-violet-600/15 text-violet-300 border-violet-500/60",
  },
  under_investigation: {
    label: "Under Investigation",
    classes: "bg-indigo-600/15 text-indigo-300 border-indigo-500/60",
  },
  awaiting_trial: {
    label: "Awaiting Trial",
    classes: "bg-amber-600/15 text-amber-300 border-amber-500/60",
  },
  closed: {
    label: "Closed",
    classes: "bg-zinc-700/30 text-zinc-300 border-zinc-600",
  },
  in_progress: {
    label: "In Progress",
    classes: "bg-indigo-600/15 text-indigo-300 border-indigo-500/60",
  },
  resolved: {
    label: "Resolved",
    classes: "bg-emerald-700/20 text-emerald-300 border-emerald-700",
  },
  pending: {
    label: "Pending",
    classes: "bg-sky-600/15 text-sky-300 border-sky-500/60",
  },

  // Internal formation workflow states (rendered as clearer case-state labels)
  pending_cadet_review: {
    label: "Awaiting Validation (Cadet Review)",
    classes: "bg-sky-600/15 text-sky-300 border-sky-500/60",
  },
  pending_cadet_recheck: {
    label: "Awaiting Validation (Cadet Recheck)",
    classes: "bg-sky-600/15 text-sky-300 border-sky-500/60",
  },
  pending_officer_review: {
    label: "Awaiting Validation (Officer Review)",
    classes: "bg-sky-600/15 text-sky-300 border-sky-500/60",
  },
  pending_superior_approval: {
    label: "Awaiting Validation (Superior Approval)",
    classes: "bg-sky-600/15 text-sky-300 border-sky-500/60",
  },
  needs_complainant_revision: {
    label: "Validation Revision Needed (Complainant)",
    classes: "bg-amber-600/15 text-amber-300 border-amber-500/60",
  },
  needs_creator_revision: {
    label: "Validation Revision Needed (Creator)",
    classes: "bg-amber-600/15 text-amber-300 border-amber-500/60",
  },
  formed: {
    label: "Formation Approved",
    classes: "bg-emerald-600/15 text-emerald-300 border-emerald-500/60",
  },
  voided: {
    label: "Invalidated",
    classes: "bg-rose-600/15 text-rose-300 border-rose-500/60",
  },

  verified: {
    label: "Verified",
    classes: "bg-emerald-700/20 text-emerald-300 border-emerald-700",
  },
  pending_forensic: {
    label: "Pending Forensic Review",
    classes: "bg-fuchsia-600/15 text-fuchsia-300 border-fuchsia-500/60",
  },
  forensic_rejected: {
    label: "Forensic Rejected",
    classes: "bg-rose-700/20 text-rose-300 border-rose-700",
  },
  rejected_by_officer: {
    label: "Rejected by Officer",
    classes: "bg-rose-700/20 text-rose-300 border-rose-700",
  },
  pending_detective: {
    label: "Pending Detective Review",
    classes: "bg-blue-600/15 text-blue-300 border-blue-500/60",
  },
  rejected_by_detective: {
    label: "Rejected by Detective",
    classes: "bg-rose-700/20 text-rose-300 border-rose-700",
  },
  approved_rewarded: {
    label: "Approved & Rewarded",
    classes: "bg-emerald-700/20 text-emerald-300 border-emerald-700",
  },
  rejected: {
    label: "Rejected",
    classes: "bg-rose-700/20 text-rose-300 border-rose-700",
  },
};

export function StatusBadge({ value }) {
  const normalized = String(value || "").toLowerCase();
  const meta = STATUS_META[normalized];
  const classes = meta?.classes || "bg-zinc-800 text-zinc-200 border-zinc-600";
  const label = meta?.label || normalized.replaceAll("_", " ") || "unknown";

  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${classes}`}>
      {label}
    </span>
  );
}
