import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  canAccessPath,
  getHomePathForRole,
} from "../lib/roleRouting";
import { NotificationBell } from "./NotificationBell";

const NAV_ITEMS = [
  { to: "/admin/console", label: "Admin Console" },
  { to: "/admin/roles", label: "Role Management" },
  { to: "/admin/case-queues", label: "Case Queues" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/cases", label: "Cases" },
  { to: "/complaint", label: "Complaint Wizard" },
  { to: "/crime-scene-case", label: "Crime Scene Case" },
  { to: "/tips/submit", label: "Submit Tip" },
  { to: "/tips/officer-review", label: "Officer Tip Review" },
  { to: "/tips/detective-review", label: "Detective Tip Review" },
  { to: "/intense-tracking", label: "Intense Tracking" },
  { to: "/forensic-review", label: "Forensic Review" },
  { to: "/rewards/lookup", label: "Reward Lookup" },
  { to: "/board", label: "Detective Board" },
  { to: "/interrogation", label: "Interrogation" },
  { to: "/suspect-referrals", label: "Suspect Referrals" },
  { to: "/evidence-review", label: "Evidence Review" },
  { to: "/reports", label: "Reports" },
  { to: "/notifications", label: "Notifications" },
  { to: "/profile", label: "Profile" },
];

function roleNav(roleName) {
  return NAV_ITEMS.filter((item) => canAccessPath(roleName, item.to));
}

export function AppLayout() {
  const { user, roleName, logout } = useAuth();
  const navItems = roleNav(roleName);
  const location = useLocation();
  const homePath = getHomePathForRole(roleName);

  return (
    <div className="min-h-screen bg-noir text-paper">
      <div className="grid min-h-screen w-full grid-cols-1 md:grid-cols-[235px_minmax(0,1fr)]">
        <aside className="border-r border-zinc-800 bg-zinc-950/70 px-3 py-4 md:px-4 md:py-5">
          <Link to={homePath} className="mb-6 block">
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

          <div className="mt-6 rounded-md border border-zinc-700 bg-zinc-900/70 p-3">
            <p className="text-sm font-semibold">{user?.username}</p>
            <p className="text-xs text-zinc-400">{roleName || "No role"}</p>
            <button className="btn-secondary mt-3 w-full" onClick={logout}>
              Logout
            </button>
          </div>
        </aside>

        <main className="p-3 md:p-4 lg:p-5">
          <header className="mb-3 flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-900/30 px-3 py-2.5 md:px-4">
            <p className="text-sm text-zinc-400">{location.pathname}</p>
            <NotificationBell />
          </header>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
