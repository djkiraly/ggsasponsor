"use client";

import { useEffect, useState } from "react";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  email_verified: boolean;
  is_active: boolean;
  created_at: string;
};

type EditingUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  password: string;
};

const inputCls =
  "w-full rounded-md border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1C3FCF]";
const labelCls = "mb-1 block text-sm font-semibold text-slate-800";
const btnPrimary =
  "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-70";
const btnSecondary =
  "inline-flex items-center justify-center rounded-md border border-[#E2E8F0] px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-[#F8FAFF]";

function StatusBadge({ user }: { user: User }) {
  if (!user.email_verified) {
    return (
      <span className="inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
        Pending Verification
      </span>
    );
  }
  if (!user.is_active) {
    return (
      <span className="inline-block rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-800">
        Pending Activation
      </span>
    );
  }
  return (
    <span className="inline-block rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
      Active
    </span>
  );
}

export function UsersManager({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<EditingUser | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  async function fetchUsers() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Failed to load users");
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchUsers(); }, []);

  async function handleDelete(user: User) {
    if (user.id === currentUserId) return;
    if (!confirm(`Delete user "${user.name}" (${user.email})?`)) return;
    setActionMsg(null);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        setActionMsg(`Error: ${data.error || "Delete failed"}`);
        return;
      }
      setActionMsg(`User "${user.name}" deleted.`);
      fetchUsers();
    } catch {
      setActionMsg("Error: Delete failed.");
    }
  }

  async function handleToggleActive(user: User) {
    const newActive = !user.is_active;
    const action = newActive ? "activate" : "deactivate";
    setActionMsg(null);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: newActive }),
      });
      if (!res.ok) {
        const data = await res.json();
        setActionMsg(`Error: ${data.error || `Failed to ${action} user`}`);
        return;
      }
      setActionMsg(`User "${user.name}" ${newActive ? "activated" : "deactivated"}.`);
      fetchUsers();
    } catch {
      setActionMsg(`Error: Failed to ${action} user.`);
    }
  }

  return (
    <div className="space-y-4">
      {actionMsg && (
        <div className={`rounded-md px-4 py-2 text-sm ${actionMsg.startsWith("Error") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
          {actionMsg}
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-700">{users.length} user{users.length !== 1 ? "s" : ""}</span>
        <button
          type="button"
          onClick={() => { setShowCreate(true); setEditing(null); }}
          className={btnPrimary}
          style={{ background: "#1C3FCF" }}
        >
          Add User
        </button>
      </div>

      {showCreate && (
        <CreateUserForm
          onCreated={() => { setShowCreate(false); fetchUsers(); setActionMsg("User created."); }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {editing && (
        <EditUserForm
          user={editing}
          isSelf={editing.id === currentUserId}
          onUpdated={() => { setEditing(null); fetchUsers(); setActionMsg("User updated."); }}
          onCancel={() => setEditing(null)}
        />
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : (
        <>
        {/* Desktop table */}
        <div className="hidden overflow-hidden rounded-lg border border-[#E2E8F0] md:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F8FAFF] text-xs font-semibold uppercase tracking-wider text-slate-700">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] bg-white">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{u.name}</td>
                  <td className="px-4 py-3 text-slate-700">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      u.role === "admin"
                        ? "bg-[#1C3FCF]/10 text-[#1C3FCF]"
                        : "bg-slate-100 text-slate-700"
                    }`}>
                      {u.role === "admin" ? "Admin" : "User"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge user={u} />
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {u.email_verified && !u.is_active && (
                        <button
                          type="button"
                          onClick={() => handleToggleActive(u)}
                          className="text-sm font-medium text-green-700 hover:underline"
                        >
                          Activate
                        </button>
                      )}
                      {u.is_active && u.id !== currentUserId && (
                        <button
                          type="button"
                          onClick={() => handleToggleActive(u)}
                          className="text-sm font-medium text-orange-600 hover:underline"
                        >
                          Deactivate
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setEditing({ id: u.id, name: u.name, email: u.email, role: u.role, password: "" });
                          setShowCreate(false);
                        }}
                        className="text-sm font-medium text-[#1C3FCF] hover:underline"
                      >
                        Edit
                      </button>
                      {u.id !== currentUserId && (
                        <button
                          type="button"
                          onClick={() => handleDelete(u)}
                          className="text-sm font-medium text-red-600 hover:underline"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile card list */}
        <div className="divide-y divide-[#E2E8F0] overflow-hidden rounded-lg border border-[#E2E8F0] md:hidden">
          {users.map((u) => (
            <div key={u.id} className="bg-white px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-900">{u.name}</p>
                  <p className="truncate text-xs text-slate-500">{u.email}</p>
                </div>
                <StatusBadge user={u} />
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                  u.role === "admin"
                    ? "bg-[#1C3FCF]/10 text-[#1C3FCF]"
                    : "bg-slate-100 text-slate-700"
                }`}>
                  {u.role === "admin" ? "Admin" : "User"}
                </span>
                <span>&#183;</span>
                <span>{new Date(u.created_at).toLocaleDateString()}</span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                {u.email_verified && !u.is_active && (
                  <button
                    type="button"
                    onClick={() => handleToggleActive(u)}
                    className="min-h-[44px] text-sm font-medium text-green-700 hover:underline"
                  >
                    Activate
                  </button>
                )}
                {u.is_active && u.id !== currentUserId && (
                  <button
                    type="button"
                    onClick={() => handleToggleActive(u)}
                    className="min-h-[44px] text-sm font-medium text-orange-600 hover:underline"
                  >
                    Deactivate
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setEditing({ id: u.id, name: u.name, email: u.email, role: u.role, password: "" });
                    setShowCreate(false);
                  }}
                  className="min-h-[44px] text-sm font-medium text-[#1C3FCF] hover:underline"
                >
                  Edit
                </button>
                {u.id !== currentUserId && (
                  <button
                    type="button"
                    onClick={() => handleDelete(u)}
                    className="min-h-[44px] text-sm font-medium text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        </>
      )}
    </div>
  );
}

function CreateUserForm({
  onCreated,
  onCancel,
}: {
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create user");
        return;
      }
      onCreated();
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFF] p-5 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-slate-800">New User</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Name</label>
          <input required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Email</label>
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Password</label>
          <input required type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} placeholder="Min 8 characters" />
        </div>
        <div>
          <label className={labelCls}>Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value)} className={inputCls}>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <div className="mt-4 flex items-center gap-3">
        <button type="submit" disabled={saving} className={btnPrimary} style={{ background: "#1C3FCF" }}>
          {saving ? "Creating..." : "Create User"}
        </button>
        <button type="button" onClick={onCancel} className={btnSecondary}>Cancel</button>
      </div>
    </form>
  );
}

function EditUserForm({
  user,
  isSelf,
  onUpdated,
  onCancel,
}: {
  user: EditingUser;
  isSelf: boolean;
  onUpdated: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(user.role);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const updates: Record<string, string> = {};
    if (name !== user.name) updates.name = name;
    if (email !== user.email) updates.email = email;
    if (role !== user.role) updates.role = role;
    if (password) updates.password = password;

    if (Object.keys(updates).length === 0) {
      setError("No changes to save.");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to update user");
        return;
      }
      onUpdated();
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFF] p-5 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-slate-800">Edit User</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Name</label>
          <input required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Email</label>
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>New Password</label>
          <input type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} placeholder="Leave blank to keep current" />
        </div>
        <div>
          <label className={labelCls}>Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value)} className={inputCls} disabled={isSelf}>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
          {isSelf && <p className="mt-1 text-xs text-slate-500">You cannot change your own role.</p>}
        </div>
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <div className="mt-4 flex items-center gap-3">
        <button type="submit" disabled={saving} className={btnPrimary} style={{ background: "#1C3FCF" }}>
          {saving ? "Saving..." : "Save Changes"}
        </button>
        <button type="button" onClick={onCancel} className={btnSecondary}>Cancel</button>
      </div>
    </form>
  );
}
