import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export function NotificationsPage() {
  const { token } = useAuth();
  const [items, setItems] = useState([]);

  async function load() {
    const data = await api.listNotifications(token);
    setItems(data);
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 10000);
    return () => clearInterval(id);
  }, [token]);

  async function markRead(itemId) {
    await api.markNotificationRead(token, itemId);
    setItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, is_read: true } : item)));
  }

  return (
    <section>
      <h1 className="font-display text-3xl uppercase text-brass">Notifications</h1>
      <p className="mb-5 mt-1 text-zinc-400">Polling every 10 seconds</p>

      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className={`card p-3 ${item.is_read ? "opacity-70" : "border-brass"}`}>
            <p>{item.message}</p>
            <p className="mt-1 text-xs text-zinc-400">Case #{item.related_case_id}</p>
            {!item.is_read && (
              <button className="btn-secondary mt-2" onClick={() => markRead(item.id)}>
                Mark as read
              </button>
            )}
          </div>
        ))}
        {!items.length && <p className="text-zinc-400">No notifications.</p>}
      </div>
    </section>
  );
}
