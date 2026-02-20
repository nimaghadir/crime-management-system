import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { NotificationBell } from "./NotificationBell";

function roleNav(roleName) {
  const role = String(roleName || "").toLowerCase();
  const common = [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/cases", label: "Cases" },
    { to: "/complaint", label: "Complaint Wizard" },
    { to: "/notifications", label: "Notifications" },
    { to: "/profile", label: "Profile" },
    { to: "/reports", label: "Reports" },
  ];

  if (["detective", "sergeant", "captain"].includes(role)) {
    common.splice(2, 0, { to: "/board", label: "Detective Board" });
    common.splice(3, 0, { to: "/interrogation", label: "Interrogation" });
  }

  if (["مدیر کل سامانه", "system admin", "chief"].includes(role)) {
    common.push({ to: "/admin/roles", label: "Role Management" });
  }

  return common;
}

export function AppLayout() {
  const { user, roleName, logout } = useAuth();
  const navItems = roleNav(roleName);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-noir text-paper">
      <div className="mx-auto grid min-h-screen max-w-[1400px] grid-cols-1 md:grid-cols-[250px_1fr]">
        <aside className="border-r border-zinc-800 bg-zinc-950/70 px-4 py-6">
          <Link to="/dashboard" className="mb-8 block">
            <p className="font-display text-2xl uppercase tracking-wide text-brass">CaseFlow</p>
            <p className="text-xs text-zinc-400">Crime Management Console</p>
          </Link>

          <nav className="space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `block rounded-md px-3 py-2 text-sm ${
                    isActive
                      ? "bg-brass/10 text-brass"
                      : "text-zinc-200 hover:bg-zinc-800/70 hover:text-paper"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-8 rounded-md border border-zinc-700 bg-zinc-900/70 p-3">
            <p className="text-sm font-semibold">{user?.username}</p>
            <p className="text-xs text-zinc-400">{roleName || "No role"}</p>
            <button className="btn-secondary mt-3 w-full" onClick={logout}>
              Logout
            </button>
          </div>
        </aside>

        <main className="p-4 md:p-8">
          <header className="mb-4 flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-900/30 px-4 py-3">
            <p className="text-sm text-zinc-400">{location.pathname}</p>
            <NotificationBell />
          </header>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
