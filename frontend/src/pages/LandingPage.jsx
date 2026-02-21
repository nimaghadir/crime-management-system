import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

const dutyItems = [
  "Receive, categorize, and route citizen reports to the correct police units.",
  "Manage evidence, suspects, and investigation flow for faster decision-making.",
  "Coordinate officers, detectives, and supervisors around a standardized case process.",
];

const defaultStats = {
  resolved_cases: 0,
  total_employees: 0,
  active_cases: 0,
};

export function LandingPage() {
  const { isAuthenticated } = useAuth();
  const [stats, setStats] = useState(defaultStats);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      try {
        const data = await api.getPublicOverview();
        if (!cancelled) {
          setStats({
            resolved_cases: Number(data?.resolved_cases) || 0,
            total_employees: Number(data?.total_employees) || 0,
            active_cases: Number(data?.active_cases) || 0,
          });
        }
      } catch {
        if (!cancelled) {
          setStats(defaultStats);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadStats();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-noir text-paper">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 md:px-8 md:py-10">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-display text-3xl uppercase tracking-wide text-brass">CaseFlow</p>
            <p className="text-sm text-zinc-300">Police Department Case Management System</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {isAuthenticated ? (
              <Link to="/dashboard" className="btn-primary">
                Go To Dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" className="btn-secondary">
                  Login
                </Link>
                <Link to="/register" className="btn-primary">
                  Register
                </Link>
              </>
            )}
          </div>
        </header>

        <main className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <section className="card p-5 md:p-7">
            <p className="mb-3 inline-flex rounded-full border border-brass/50 bg-brass/10 px-3 py-1 text-xs tracking-wide text-brass">
              System Overview
            </p>
            <h1 className="font-display text-3xl leading-tight text-paper md:text-4xl">
              Unified Crime Case Management
            </h1>
            <p className="mt-4 text-sm leading-7 text-zinc-300 md:text-base">
              This page provides a high-level introduction to the platform and the primary duties of
              the police department inside this workflow. The system is designed to standardize case
              intake, investigation tracking, and operational coordination.
            </p>

            <div className="mt-6 grid gap-3">
              {dutyItems.map((item) => (
                <div
                  key={item}
                  className="rounded-lg border border-zinc-700/80 bg-zinc-900/70 px-4 py-3 text-sm text-zinc-200"
                >
                  {item}
                </div>
              ))}
            </div>
          </section>

          <aside className="space-y-4">
            <div className="card p-5">
              <p className="text-sm text-zinc-400">Case Statistics</p>
              <h2 className="mt-1 font-display text-2xl uppercase text-brass">Live Snapshot</h2>
              <div className="mt-4 grid gap-3">
                <div className="rounded-lg border border-zinc-700 bg-zinc-950/70 p-3">
                  <p className="text-xs text-zinc-400">Total Resolved Cases</p>
                  <p className="mt-2 text-2xl font-bold text-paper">
                    {loading ? "..." : stats.resolved_cases}
                  </p>
                </div>
                <div className="rounded-lg border border-zinc-700 bg-zinc-950/70 p-3">
                  <p className="text-xs text-zinc-400">Total Organization Employees</p>
                  <p className="mt-2 text-2xl font-bold text-paper">
                    {loading ? "..." : stats.total_employees}
                  </p>
                </div>
                <div className="rounded-lg border border-zinc-700 bg-zinc-950/70 p-3">
                  <p className="text-xs text-zinc-400">Active Cases</p>
                  <p className="mt-2 text-2xl font-bold text-paper">
                    {loading ? "..." : stats.active_cases}
                  </p>
                </div>
              </div>
            </div>

            <div className="card p-5">
              <p className="text-sm text-zinc-300">
                Login to access full case details, workflow actions, and internal tools.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link to="/login" className="btn-primary">
                  Login
                </Link>
                {!isAuthenticated && (
                  <Link to="/register" className="btn-secondary">
                    Create Account
                  </Link>
                )}
              </div>
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
}
