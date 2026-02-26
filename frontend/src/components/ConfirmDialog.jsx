export function ConfirmDialog({
  open,
  title = "Confirm Action",
  subtitle = "",
  description = "",
  tone = "danger",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  busy = false,
  onConfirm,
  onClose,
  children,
}) {
  if (!open) return null;

  const toneStyles =
    tone === "danger"
      ? {
          badge: "border-danger/50 bg-danger/10 text-danger",
          panel: "border-danger/30 bg-danger/5",
          button: "border-danger/60 bg-danger/10 text-danger hover:bg-danger/20",
          badgeLabel: "Destructive Action",
        }
      : {
          badge: "border-brass/40 bg-brass/10 text-brass",
          panel: "border-brass/20 bg-brass/5",
          button: "border-brass/50 bg-brass/10 text-brass hover:bg-brass/20",
          badgeLabel: "Confirm Action",
        };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" onClick={busy ? undefined : onClose}>
      <div
        className="w-full max-w-xl rounded-xl border border-zinc-700 bg-zinc-950 p-4 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <span className={`inline-flex rounded-full border px-2 py-1 text-[11px] uppercase tracking-wide ${toneStyles.badge}`}>
              {toneStyles.badgeLabel}
            </span>
            <h3 className="mt-2 text-lg font-semibold text-paper">{title}</h3>
            {subtitle && <p className="mt-1 text-xs text-zinc-400">{subtitle}</p>}
          </div>
          <button className="btn-secondary" onClick={onClose} disabled={busy}>
            Close
          </button>
        </div>

        {description && (
          <div className={`mb-4 rounded-lg border p-3 text-sm text-zinc-200 ${toneStyles.panel}`}>
            {description}
          </div>
        )}

        {children ? <div className="mb-4">{children}</div> : null}

        <div className="flex flex-wrap justify-end gap-2">
          <button className="btn-secondary" onClick={onClose} disabled={busy}>
            {cancelLabel}
          </button>
          <button className={`rounded-md border px-4 py-2 text-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${toneStyles.button}`} onClick={onConfirm} disabled={busy}>
            {busy ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
