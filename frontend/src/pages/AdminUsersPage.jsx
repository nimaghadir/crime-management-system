import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { formatUiApiError } from "../lib/uiApiError";
import { Skeleton, SkeletonLines } from "../components/Skeleton";

function formatDateTime(value) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

function sumCounts(mapLike) {
  if (!mapLike || typeof mapLike !== "object") return 0;
  return Object.values(mapLike).reduce((acc, value) => acc + (Number(value) || 0), 0);
}

function humanizeKey(key) {
  return String(key || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function emptyEditForm(user = {}) {
  return {
    username: String(user.username || ""),
    email: String(user.email || ""),
    first_name: String(user.first_name || ""),
    last_name: String(user.last_name || ""),
    phone_number: String(user.phone_number || ""),
    national_id: String(user.national_id || ""),
    is_active: Boolean(user.is_active),
    password: "",
  };
}

export function AdminUsersPage() {
  const { token, user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [showInactive, setShowInactive] = useState(true);

  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState(emptyEditForm());

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletePreviewLoading, setDeletePreviewLoading] = useState(false);
  const [deletePreview, setDeletePreview] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await api.listUsers(token);
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(formatUiApiError(err, "Failed to load users."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [token]);

  const roleOptions = useMemo(() => {
    const names = Array.from(
      new Set(
        (users || [])
          .map((item) => String(item.role_name || "").trim())
          .filter(Boolean),
      ),
    ).sort((a, b) => a.localeCompare(b));
    return names;
  }, [users]);

  const filteredUsers = useMemo(() => {
    const q = String(search || "").trim().toLowerCase();
    return (users || []).filter((item) => {
      if (!showInactive && item.is_active === false) return false;
      if (roleFilter !== "all" && String(item.role_name || "") !== roleFilter) return false;
      if (!q) return true;
      const haystack = [
        item.username,
        item.email,
        item.first_name,
        item.last_name,
        item.phone_number,
        item.national_id,
        item.role_name,
      ]
        .map((v) => String(v || "").toLowerCase())
        .join(" ");
      return haystack.includes(q);
    });
  }, [users, search, roleFilter, showInactive]);

  const summary = useMemo(() => {
    const rows = users || [];
    return {
      total: rows.length,
      active: rows.filter((u) => u.is_active !== false).length,
      admins: rows.filter((u) => String(u.role_name || "").toLowerCase().includes("admin")).length,
      inactive: rows.filter((u) => u.is_active === false).length,
    };
  }, [users]);

  function openEdit(user) {
    setEditingUser(user);
    setEditForm(emptyEditForm(user));
    setError("");
    setMessage("");
  }

  function closeEdit() {
    setEditingUser(null);
    setEditForm(emptyEditForm());
  }

  async function saveEdit() {
    if (!editingUser) return;
    const payload = {
      username: String(editForm.username || "").trim(),
      email: String(editForm.email || "").trim(),
      first_name: String(editForm.first_name || "").trim(),
      last_name: String(editForm.last_name || "").trim(),
      phone_number: String(editForm.phone_number || "").trim(),
      national_id: String(editForm.national_id || "").trim(),
      is_active: Boolean(editForm.is_active),
    };
    if (!payload.username) {
      setError("Username is required.");
      return;
    }
    if (String(editForm.password || "").trim()) {
      payload.password = editForm.password;
    }

    setSaving(true);
    setError("");
    setMessage("");
    try {
      const updated = await api.updateAdminUser(token, editingUser.id, payload);
      setUsers((prev) => prev.map((row) => (Number(row.id) === Number(updated.id) ? updated : row)));
      setMessage(`User "${updated.username}" updated successfully.`);
      closeEdit();
    } catch (err) {
      setError(formatUiApiError(err, "Failed to update user."));
    } finally {
      setSaving(false);
    }
  }

  async function openDelete(user) {
    setDeleteTarget(user);
    setDeleteConfirmText("");
    setDeletePreview(null);
    setDeletePreviewLoading(true);
    setError("");
    setMessage("");
    try {
      const data = await api.getAdminUserManagement(token, user.id);
      setDeletePreview(data?.delete_impact || null);
    } catch (err) {
      setError(formatUiApiError(err, "Failed to load delete impact preview."));
    } finally {
      setDeletePreviewLoading(false);
    }
  }

  function closeDelete() {
    setDeleteTarget(null);
    setDeletePreview(null);
    setDeletePreviewLoading(false);
    setDeleteConfirmText("");
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    if (deleteConfirmText !== deleteTarget.username) {
      setError("Type the exact username to confirm deletion.");
      return;
    }
    setDeleting(true);
    setError("");
    setMessage("");
    try {
      const result = await api.deleteAdminUser(token, deleteTarget.id);
      setUsers((prev) => prev.filter((row) => Number(row.id) !== Number(deleteTarget.id)));
      const deletedCount =
        sumCounts(result?.impact?.cascade_deletions) + sumCounts(result?.impact?.set_null_effects);
      setMessage(
        `User "${result?.deleted_username || deleteTarget.username}" deleted. ${deletedCount} related record effect(s) handled.`,
      );
      closeDelete();
    } catch (err) {
      setError(formatUiApiError(err, "Failed to delete user."));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl uppercase text-brass">User Management</h1>
          <p className="mt-1 text-zinc-400">
            Update account credentials or remove users with impact preview and safe cleanup.
          </p>
        </div>
        <div className="flex gap-2">
          <Link className="btn-secondary" to="/admin/roles">
            Role Management
          </Link>
          <button className="btn-secondary" onClick={load} disabled={loading || saving || deleting}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {error && <p className="text-danger">{error}</p>}
      {message && <p className="text-emerald-400">{message}</p>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card p-3">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Total Users</p>
          <p className="mt-1 text-2xl font-semibold">{loading ? <Skeleton as="span" className="inline-block h-8 w-14 align-middle" /> : summary.total}</p>
        </div>
        <div className="card p-3">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Active</p>
          <p className="mt-1 text-2xl font-semibold">{loading ? <Skeleton as="span" className="inline-block h-8 w-14 align-middle" /> : summary.active}</p>
        </div>
        <div className="card p-3">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Inactive</p>
          <p className="mt-1 text-2xl font-semibold">{loading ? <Skeleton as="span" className="inline-block h-8 w-14 align-middle" /> : summary.inactive}</p>
        </div>
        <div className="card p-3">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Admins</p>
          <p className="mt-1 text-2xl font-semibold">{loading ? <Skeleton as="span" className="inline-block h-8 w-14 align-middle" /> : summary.admins}</p>
        </div>
      </div>

      <div className="card p-4">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_14rem_auto]">
          <input
            className="input"
            placeholder="Search username, email, national id, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="input" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="all">All roles</option>
            {roleOptions.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 rounded border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
            />
            Show inactive
          </label>
        </div>
      </div>

      <div className="card p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="font-semibold">Accounts</p>
          <p className="text-xs text-zinc-500">{loading ? "Loading..." : `${filteredUsers.length} shown`}</p>
        </div>

        <div className="overflow-x-auto rounded border border-zinc-800">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-900/80 text-zinc-300">
              <tr>
                <th className="px-3 py-2 text-left">Username</th>
                <th className="px-3 py-2 text-left">Role</th>
                <th className="px-3 py-2 text-left">Contact</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Joined</th>
                <th className="px-3 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading &&
                Array.from({ length: 6 }).map((_, index) => (
                  <tr key={`admin-user-row-skeleton-${index}`} className="border-t border-zinc-800">
                    <td className="px-3 py-3"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-3 py-3"><Skeleton className="h-4 w-28" /></td>
                    <td className="px-3 py-3"><SkeletonLines lines={2} widths={["w-40", "w-24"]} /></td>
                    <td className="px-3 py-3"><Skeleton className="h-5 w-16 rounded-full" /></td>
                    <td className="px-3 py-3"><Skeleton className="h-4 w-32" /></td>
                    <td className="px-3 py-3"><div className="flex gap-2"><Skeleton className="h-9 w-16 rounded" /><Skeleton className="h-9 w-16 rounded" /></div></td>
                  </tr>
                ))}
              {!loading &&
                filteredUsers.map((row) => {
                  const isSelf = Number(row.id) === Number(currentUser?.id);
                  return (
                    <tr key={row.id} className="border-t border-zinc-800 align-top">
                      <td className="px-3 py-3">
                        <p className="font-medium">{row.username}</p>
                        <p className="mt-1 text-xs text-zinc-500">ID #{row.id}</p>
                      </td>
                      <td className="px-3 py-3">
                        <p>{row.role_name || "No role"}</p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {row.is_superuser ? "Django Superuser" : "Standard account"}
                        </p>
                      </td>
                      <td className="px-3 py-3">
                        <p className="text-zinc-300">{row.email || "-"}</p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {row.phone_number || "-"} | NID: {row.national_id || "-"}
                        </p>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`rounded-full px-2 py-1 text-xs ${
                            row.is_active === false
                              ? "border border-zinc-700 bg-zinc-900 text-zinc-400"
                              : "border border-emerald-700/60 bg-emerald-700/10 text-emerald-300"
                          }`}
                        >
                          {row.is_active === false ? "Inactive" : "Active"}
                        </span>
                        {isSelf && <p className="mt-1 text-xs text-zinc-500">Current session</p>}
                      </td>
                      <td className="px-3 py-3 text-zinc-400">{formatDateTime(row.date_joined)}</td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button className="btn-secondary" onClick={() => openEdit(row)}>
                            Edit
                          </button>
                          <button
                            className="rounded-md border border-red-400/60 bg-red-950/20 px-3 py-2 text-xs text-red-100 transition hover:bg-red-900/30 disabled:cursor-not-allowed disabled:opacity-50"
                            onClick={() => openDelete(row)}
                            disabled={isSelf}
                            title={isSelf ? "You cannot delete your own account." : ""}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              {!loading && !filteredUsers.length && (
                <tr>
                  <td className="px-3 py-6 text-zinc-400" colSpan={6}>
                    No users match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={closeEdit}>
          <div
            className="w-full max-w-2xl rounded-lg border border-zinc-700 bg-zinc-950 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-paper">Edit User</p>
                <p className="text-xs text-zinc-400">
                  {editingUser.username} | {editingUser.role_name || "No role"}
                </p>
              </div>
              <button className="btn-secondary" onClick={closeEdit} disabled={saving}>
                Close
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wide text-zinc-500">Username</label>
                <input
                  className="input"
                  value={editForm.username}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, username: e.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wide text-zinc-500">Email</label>
                <input
                  className="input"
                  value={editForm.email}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wide text-zinc-500">First Name</label>
                <input
                  className="input"
                  value={editForm.first_name}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, first_name: e.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wide text-zinc-500">Last Name</label>
                <input
                  className="input"
                  value={editForm.last_name}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, last_name: e.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wide text-zinc-500">Phone Number</label>
                <input
                  className="input"
                  value={editForm.phone_number}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, phone_number: e.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wide text-zinc-500">National ID</label>
                <input
                  className="input"
                  value={editForm.national_id}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, national_id: e.target.value }))}
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs uppercase tracking-wide text-zinc-500">
                  New Password (optional)
                </label>
                <input
                  className="input"
                  type="password"
                  value={editForm.password}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="Leave empty to keep current password"
                />
              </div>
            </div>

            <label className="mt-3 flex items-center gap-2 rounded border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={editForm.is_active}
                onChange={(e) => setEditForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                disabled={Number(editingUser.id) === Number(currentUser?.id)}
              />
              Account is active
              {Number(editingUser.id) === Number(currentUser?.id) && (
                <span className="text-xs text-zinc-500">(self deactivation blocked)</span>
              )}
            </label>

            <div className="mt-4 flex justify-end gap-2">
              <button className="btn-secondary" onClick={closeEdit} disabled={saving}>
                Cancel
              </button>
              <button className="btn-primary" onClick={saveEdit} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={closeDelete}>
          <div
            className="w-full max-w-2xl rounded-lg border border-zinc-700 bg-zinc-950 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-paper">Delete User</p>
                <p className="text-xs text-zinc-400">
                  {deleteTarget.username} | {deleteTarget.role_name || "No role"}
                </p>
              </div>
              <button className="btn-secondary" onClick={closeDelete} disabled={deleting}>
                Close
              </button>
            </div>

            {deletePreviewLoading ? (
              <div className="space-y-3">
                <SkeletonLines lines={3} />
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded border border-zinc-800 p-3"><SkeletonLines lines={4} /></div>
                  <div className="rounded border border-zinc-800 p-3"><SkeletonLines lines={4} /></div>
                </div>
                <Skeleton className="h-10 w-full rounded" />
              </div>
            ) : (
              <>
                <div className="rounded border border-amber-600/30 bg-amber-600/10 p-3 text-sm text-amber-100">
                  Deleting this user may remove or detach related records. Review impact before confirming.
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div className="rounded border border-zinc-800 p-3">
                    <p className="mb-2 text-xs uppercase tracking-wide text-zinc-500">Will Be Detached (Set Null)</p>
                    <div className="space-y-1 text-sm">
                      {Object.entries(deletePreview?.set_null_effects || {}).map(([key, value]) => (
                        <p key={`null-${key}`}>
                          <span className="text-zinc-400">{humanizeKey(key)}:</span> {Number(value) || 0}
                        </p>
                      ))}
                      {!Object.keys(deletePreview?.set_null_effects || {}).length && (
                        <p className="text-zinc-500">No set-null effects.</p>
                      )}
                    </div>
                  </div>

                  <div className="rounded border border-zinc-800 p-3">
                    <p className="mb-2 text-xs uppercase tracking-wide text-zinc-500">Will Be Deleted (Cascade)</p>
                    <div className="space-y-1 text-sm">
                      {Object.entries(deletePreview?.cascade_deletions || {}).map(([key, value]) => (
                        <p key={`cascade-${key}`}>
                          <span className="text-zinc-400">{humanizeKey(key)}:</span> {Number(value) || 0}
                        </p>
                      ))}
                      {!Object.keys(deletePreview?.cascade_deletions || {}).length && (
                        <p className="text-zinc-500">No cascade deletions.</p>
                      )}
                    </div>
                  </div>
                </div>

                {!!deletePreview?.warnings?.length && (
                  <div className="mt-3 rounded border border-red-500/30 bg-red-950/20 p-3">
                    <p className="mb-2 text-xs uppercase tracking-wide text-red-200">Warnings</p>
                    <ul className="list-disc space-y-1 pl-5 text-sm text-red-100">
                      {deletePreview.warnings.map((warning) => (
                        <li key={warning}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-3">
                  <label className="mb-2 block text-sm">
                    Type <span className="font-semibold text-brass">{deleteTarget.username}</span> to confirm deletion
                  </label>
                  <input
                    className="input"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder={deleteTarget.username}
                  />
                </div>
              </>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <button className="btn-secondary" onClick={closeDelete} disabled={deleting}>
                Cancel
              </button>
              <button
                className="rounded-md border border-red-400/70 bg-red-950/30 px-4 py-2 text-sm text-red-100 transition hover:bg-red-900/40 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={confirmDelete}
                disabled={deleting || deletePreviewLoading || deleteConfirmText !== deleteTarget.username}
              >
                {deleting ? "Deleting..." : "Delete User"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
