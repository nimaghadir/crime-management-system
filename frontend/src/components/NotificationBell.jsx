import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export function NotificationBell() {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);

  async function load() {
    try {
      const data = await api.listNotifications(token);
      setItems(data);
    } catch {
      setItems([]);
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 10000);
    return () => clearInterval(id);
  }, [token]);

  const unread = useMemo(() => items.filter((item) => !item.is_read).length, [items]);

  async function markRead(itemId) {
    await api.markNotificationRead(token, itemId);
    setItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, is_read: true } : item)));
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
          <p className="mb-2 px-2 text-xs uppercase tracking-wide text-zinc-500">Notification Center</p>
          {items.map((item) => (
            <div key={item.id} className={`mb-2 rounded border p-2 ${item.is_read ? "border-zinc-700" : "border-brass"}`}>
              <p className="text-sm">{item.message}</p>
              <p className="text-xs text-zinc-500">Case #{item.related_case_id}</p>
              {!item.is_read && (
                <button className="btn-secondary mt-2" onClick={() => markRead(item.id)}>
                  Mark read
                </button>
              )}
            </div>
          ))}
          {!items.length && <p className="px-2 py-4 text-sm text-zinc-500">No notifications</p>}
        </div>
      )}
    </div>
  );
}
