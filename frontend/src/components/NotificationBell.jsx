import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { formatUiApiError } from "../lib/uiApiError";

function notificationMeta(item) {
  const caseId = Number(item?.related_case_id) || null;
  const link = String(item?.target_path || item?.link || "").trim();
  if (caseId) {
    return { label: `Case #${caseId}`, link: link || `/cases/${caseId}` };
  }
  if (link) {
    return { label: "Open notification target", link };
  }
  return { label: "", link: "" };
}

export function NotificationBell() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setError("");
    try {
      const data = await api.listNotifications(token, { limit: 15 });
      setItems(data);
    } catch (err) {
      setItems([]);
      setError(formatUiApiError(err, "Notifications are unavailable right now."));
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 10000);
    return () => clearInterval(id);
  }, [token]);

  const unread = useMemo(() => items.filter((item) => !item.is_read).length, [items]);

  async function markRead(itemId) {
    setError("");
    try {
      setBusy(true);
      await api.markNotificationRead(token, itemId);
      setItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, is_read: true } : item)));
    } catch (err) {
      setError(formatUiApiError(err, "Failed to mark notification as read."));
    } finally {
      setBusy(false);
    }
  }

  async function markAllRead() {
    setError("");
    try {
      setBusy(true);
      await api.markAllNotificationsRead(token, true);
      setItems((prev) => prev.map((item) => ({ ...item, is_read: true })));
    } catch (err) {
      setError(formatUiApiError(err, "Failed to mark all notifications as read."));
    } finally {
      setBusy(false);
    }
  }

  async function openNotification(item) {
    const meta = notificationMeta(item);
    if (!meta.link) return;
    if (!item.is_read) {
      await markRead(item.id);
    }
    const normalizedLink = meta.link.replace(/\/+$/, "") || "/";
    setOpen(false);
    navigate(normalizedLink);
  }

  return (
    <div className="relative">
      <button className="btn-secondary relative" onClick={() => setOpen((prev) => !prev)}>
        Notifications
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[10px] text-white">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 max-h-96 w-96 overflow-auto rounded border border-zinc-700 bg-zinc-950 p-2 shadow-md">
          <div className="mb-2 flex items-center justify-between gap-2 px-2">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Notification Center</p>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button className="btn-secondary !px-2 !py-1 text-xs" onClick={markAllRead} disabled={busy}>
                  Mark all
                </button>
              )}
              <button
                className="btn-secondary !px-2 !py-1 text-xs"
                onClick={() => {
                  setOpen(false);
                  navigate("/notifications");
                }}
              >
                View all
              </button>
            </div>
          </div>
          {error && <p className="mb-2 px-2 text-xs text-danger">{error}</p>}
          {items.map((item) => (
            <div key={item.id} className={`mb-2 rounded border p-2 ${item.is_read ? "border-zinc-700" : "border-brass"}`}>
              <p className="text-sm">{item.message}</p>
              {notificationMeta(item).label && <p className="text-xs text-zinc-500">{notificationMeta(item).label}</p>}
              <div className="mt-2 flex flex-wrap gap-2">
                {notificationMeta(item).link && (
                  <button className="btn-secondary" onClick={() => openNotification(item)} disabled={busy}>
                    Open
                  </button>
                )}
                {!item.is_read && (
                  <button className="btn-secondary" onClick={() => markRead(item.id)} disabled={busy}>
                    Mark read
                  </button>
                )}
              </div>
            </div>
          ))}
          {!items.length && <p className="px-2 py-4 text-sm text-zinc-500">No notifications</p>}
        </div>
      )}
    </div>
  );
}
