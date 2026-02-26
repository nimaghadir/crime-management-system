import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { formatUiApiError } from "../lib/uiApiError";
import { Skeleton, SkeletonLines } from "../components/Skeleton";
import { getNotificationMeta } from "../lib/notificationMeta";
import { usePolling } from "../hooks/usePolling";

export function NotificationsPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [markingId, setMarkingId] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState("");
  const unreadCount = useMemo(() => items.filter((item) => !item.is_read).length, [items]);

  async function load(options = {}) {
    const silent = Boolean(options?.silent);
    if (!silent) {
      setLoading(true);
    }
    setError("");
    try {
      const data = await api.listNotifications(token);
      setItems(data);
    } catch (err) {
      setItems([]);
      setError(formatUiApiError(err, "Failed to load notifications."));
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    load();
  }, [token]);

  usePolling(() => load({ silent: true }), 10000, [token], { immediate: false });

  async function markRead(itemId) {
    setError("");
    try {
      setMarkingId(Number(itemId));
      await api.markNotificationRead(token, itemId);
      setItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, is_read: true } : item)));
    } catch (err) {
      setError(formatUiApiError(err, "Failed to mark notification as read."));
    } finally {
      setMarkingId(null);
    }
  }

  async function markAllRead() {
    setError("");
    try {
      setMarkingAll(true);
      await api.markAllNotificationsRead(token, true);
      setItems((prev) => prev.map((item) => ({ ...item, is_read: true })));
    } catch (err) {
      setError(formatUiApiError(err, "Failed to mark all notifications as read."));
    } finally {
      setMarkingAll(false);
    }
  }

  async function openNotification(item) {
    const meta = getNotificationMeta(item);
    if (!meta.link) return;
    if (!item.is_read) {
      await markRead(item.id);
    }
    navigate(meta.link.replace(/\/+$/, "") || "/");
  }

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl uppercase text-brass">Notifications</h1>
          <p className="mt-1 text-zinc-400">Polling every 10 seconds • {unreadCount} unread</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {unreadCount > 0 && (
            <button className="btn-secondary" onClick={markAllRead} disabled={loading || markingId !== null || markingAll}>
              {markingAll ? "Saving..." : "Mark all read"}
            </button>
          )}
          <button className="btn-secondary" onClick={load} disabled={loading || markingId !== null || markingAll}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>
      {error && <p className="mb-4 text-danger">{error}</p>}

      <div className="space-y-2">
        {loading &&
          Array.from({ length: 4 }).map((_, index) => (
            <div key={`notification-skeleton-${index}`} className="card p-3">
              <SkeletonLines lines={2} widths={["w-full", "w-40"]} />
              <Skeleton className="mt-2 h-9 w-24 rounded" />
            </div>
          ))}
        {items.map((item) => {
          const meta = getNotificationMeta(item);
          return (
            <div key={item.id} className={`card p-3 ${item.is_read ? "opacity-70" : "border-brass"}`}>
              <p>{item.message}</p>
              {meta.label && <p className="mt-1 text-xs text-zinc-400">{meta.label}</p>}
              <div className="mt-2 flex flex-wrap gap-2">
                {meta.link && (
                  <button className="btn-secondary" onClick={() => openNotification(item)} disabled={markingId !== null || markingAll}>
                    Open
                  </button>
                )}
                {!item.is_read && (
                  <button
                    className="btn-secondary"
                    onClick={() => markRead(item.id)}
                    disabled={markingId === Number(item.id) || markingAll}
                  >
                    {markingId === Number(item.id) ? "Saving..." : "Mark as read"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {!loading && !items.length && <p className="text-zinc-400">No notifications.</p>}
      </div>
    </section>
  );
}
