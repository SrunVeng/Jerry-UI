// app/football/header.jsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { api } from "../../api/real.js";
import { PlusCircle, UserCog, LogOut, Menu, X } from "lucide-react";

/* ---------------- tiny utils ---------------- */
const norm = (s) => String(s || "").trim().replace(/\s+/g, " ").toLowerCase();

function getMeFromStorage() {
    try {
        const raw = localStorage.getItem("authIdentity");
        if (!raw) return { id: "", username: "", displayName: "", roles: [], isGuest: false };
        const a = JSON.parse(raw);
        const roles =
            a?.roles ?? a?.authorities ?? a?.scopes ?? a?.user?.roles ?? a?.user?.authorities ?? [];
        return {
            id: String(a?.id ?? a?.userId ?? a?.user?.id ?? ""),
            username: String(a?.username ?? a?.user?.username ?? ""),
            displayName: String(a?.displayName ?? a?.name ?? a?.user?.displayName ?? a?.user?.name ?? ""),
            roles: Array.isArray(roles) ? roles : String(roles || "").split(/\s+/).filter(Boolean),
            isGuest: a?.isGuest === true,
        };
    } catch {
        return { id: "", username: "", displayName: "", roles: [], isGuest: false };
    }
}
function getRolesFromToken() {
    try {
        const token = localStorage.getItem("accessToken");
        if (!token) return [];
        const [, payloadB64] = token.split(".");
        if (!payloadB64) return [];
        const json = JSON.parse(atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/")));
        const scopes = json?.scope || json?.scopes || json?.authorities || json?.roles || [];
        const arr = Array.isArray(scopes) ? scopes : String(scopes || "").split(/\s+/);
        return arr.filter(Boolean);
    } catch {
        return [];
    }
}

/* ---------------- Toasts ---------------- */
function Toast({ t, onClose }) {
    useEffect(() => {
        const id = setTimeout(onClose, t.duration ?? 2600);
        return () => clearTimeout(id);
    }, [t, onClose]);

    const color = t.type === "error" ? "bg-red-600" : t.type === "info" ? "bg-blue-600" : "bg-emerald-600";
    const bar = t.type === "error" ? "bg-red-400" : t.type === "info" ? "bg-blue-400" : "bg-emerald-400";

    return (
        <div
            className="w-full max-w-sm rounded-2xl shadow-lg border border-slate-700 bg-slate-900/95 backdrop-blur px-4 py-3 text-slate-100 transition-all duration-300 transform animate-[fadeInUp_.24s_ease-out]"
            role="status"
        >
            <div className="flex items-start gap-3">
                <div className={`mt-0.5 h-6 w-6 rounded-full ${color} grid place-items-center text-white text-sm`}>
                    {t.type === "error" ? "!" : t.type === "info" ? "ℹ︎" : "✓"}
                </div>
                <div className="min-w-0">
                    {t.title && <div className="font-semibold text-sm">{t.title}</div>}
                    {t.message && <div className="text-xs text-slate-300 mt-0.5">{t.message}</div>}
                </div>
            </div>
            <div className="mt-3 h-1 w-full rounded-full bg-slate-700 overflow-hidden">
                <div
                    className={`${bar} h-full w-full origin-left animate-[toastBar_2.4s_linear]`}
                    style={{ animationDuration: `${(t.duration ?? 2400) - 200}ms` }}
                />
            </div>
            <style jsx>{`
                @keyframes toastBar { from { transform: scaleX(1);} to { transform: scaleX(0);} }
                @keyframes fadeInUp { from { opacity: 0; transform: translateY(6px);} to { opacity: 1; transform: translateY(0);} }
            `}</style>
        </div>
    );
}
function ToastHost({ toasts, setToasts }) {
    return (
        <div className="fixed bottom-4 left-0 right-0 z-[60] pointer-events-none">
            <div className="mx-auto w-full max-w-sm px-4 space-y-3">
                {toasts.map((t) => (
                    <div key={t.id} className="pointer-events-auto">
                        <Toast t={t} onClose={() => setToasts((arr) => arr.filter((x) => x.id !== t.id))} />
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ---------------- Small atoms ---------------- */
function Sheet({ title, subtitle, open, onClose, children, side = "center", size = "md" }) {
    if (!open) return null;
    const maxW = size === "lg" ? "md:max-w-2xl" : "md:max-w-xl";
    const sidePos =
        side === "right"
            ? "md:items-stretch justify-end"
            : side === "left"
                ? "md:items-stretch justify-start"
                : "items-end md:items-center justify-center";

    return (
        <div className={`fixed inset-0 z-50 flex ${sidePos} bg-black/60`}>
            <div
                className={`w-full ${maxW} bg-slate-900 border border-slate-700 shadow-2xl rounded-t-2xl md:rounded-2xl max-h-[92svh] md:max-h-[85vh] overflow-hidden`}
                role="dialog"
                aria-modal="true"
            >
                <div className="md:hidden flex justify-center pt-2 pb-1 bg-slate-900">
                    <div className="h-1.5 w-12 rounded-full bg-slate-600" />
                </div>

                <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-slate-900/95 backdrop-blur">
                    <div>
                        <h4 className="text-base md:text-lg font-semibold text-white">{title}</h4>
                        {subtitle && <p className="text-[12px] md:text-xs text-slate-400">{subtitle}</p>}
                    </div>
                    <button
                        onClick={onClose}
                        className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-200 hover:bg-slate-800 flex items-center gap-1"
                    >
                        <X className="h-4 w-4" />
                        Close
                    </button>
                </div>

                {children}
            </div>
        </div>
    );
}
function Field({ label, children }) {
    return (
        <label className="block">
            <span className="block text-xs text-slate-300 mb-1">{label}</span>
            {children}
        </label>
    );
}
function Input(props) {
    return (
        <input
            {...props}
            className={`w-full rounded-xl bg-slate-900/60 border border-slate-700 text-slate-100 px-3 py-2 outline-none focus:border-slate-500 focus:ring-2 focus:ring-yellow-400/30 ${props.className || ""}`}
        />
    );
}
function Select(props) {
    return (
        <select
            {...props}
            className={`w-full rounded-xl bg-slate-900/60 border border-slate-700 text-slate-100 px-3 py-2 outline-none focus:border-slate-500 focus:ring-2 focus:ring-yellow-400/30 [color-scheme:dark] ${props.className || ""}`}
        />
    );
}

/* ---------------- Create Match Sheet (with Locations) ---------------- */
function CreateMatchSheet({ open, onClose, onDone, pushToast }) {
    const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
    const [draft, setDraft] = useState({
        opponentName: "",
        date: today,
        time: "18:00",
        location: "",
        numberPlayer: 12,
        notes: "",
        pitchNumber: "",
    });
    const [busy, setBusy] = useState(false);

    // locations
    const [locs, setLocs] = useState([]);
    const [locLoading, setLocLoading] = useState(false);
    const [locError, setLocError] = useState("");
    const [addMode, setAddMode] = useState(false);
    const [newLoc, setNewLoc] = useState("");

    const normalizeLocationList = (raw) => {
        const arr = Array.isArray(raw) ? raw : raw?.data ?? [];
        const names = arr
            .map((x) => {
                if (typeof x === "string") return x;
                if (!x || typeof x !== "object") return "";
                return String(x.name ?? x.location ?? x.title ?? "");
            })
            .filter(Boolean);

        const seen = new Set();
        const unique = [];
        for (const n of names) {
            const k = norm(n);
            if (!seen.has(k)) {
                seen.add(k);
                unique.push(n);
            }
        }
        return unique.sort((a, b) => a.localeCompare(b));
    };

    async function fetchLocations() {
        setLocLoading(true);
        setLocError("");
        try {
            const res = await api.getAllLocation?.();
            setLocs(normalizeLocationList(res));
        } catch (e) {
            setLocError(e?.message || "Failed to load locations");
        } finally {
            setLocLoading(false);
        }
    }

    useEffect(() => {
        if (open) fetchLocations();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    async function handleAddLocation() {
        const name = String(newLoc || "").trim();
        if (!name) return;
        try {
            await api.createLocation?.(name);
            await fetchLocations();
            setDraft((d) => ({ ...d, location: name }));
            setNewLoc("");
            setAddMode(false);
            pushToast({ type: "success", title: "Location added", message: name });
        } catch (e) {
            pushToast({ type: "error", title: "Add location failed", message: e?.message || "Something went wrong." });
        }
    }

    async function handleCreate() {
        if (!draft.opponentName.trim()) { /* ... */ }
        if (!draft.date) { /* ... */ }
        setBusy(true);
        try {
            const res = await api.createMatch({
                opponentName: draft.opponentName,
                matchDate: draft.date,
                time: draft.time,
                location: draft.location,
                numberPlayer: draft.numberPlayer,
                notes: draft.notes,
                pitchNumber:
                    String(draft.pitchNumber || "").trim() || undefined,
            });

            const created = res?.data ?? res ?? null;  // capture created match
            onDone?.(created);

            // 🔔 Notify any page that cares (like /matches) to refresh
            if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("matches:refresh", { detail: created }));
            }

            pushToast({
                type: "success",
                title: "Match created",
                message: `${draft.opponentName} • ${draft.date}${draft.time ? " " + draft.time : ""}`,
            });
            onClose?.();
        } catch (e) {
            pushToast({ type: "error", title: "Create failed", message: e?.message || "Something went wrong." });
        } finally {
            setBusy(false);
        }
    }

    return (
        <Sheet open={open} onClose={onClose} title="Create Match" subtitle="Schedule a new game">
            <div className="overflow-y-auto px-4 pb-28 pt-3">
                <div className="grid grid-cols-1 gap-3">
                    <Field label="Opponent">
                        <Input
                            placeholder="e.g., Blue Tigers"
                            value={draft.opponentName}
                            onChange={(e) => setDraft((d) => ({ ...d, opponentName: e.target.value }))}
                            autoFocus
                        />
                    </Field>

                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Date">
                            <Input type="date" value={draft.date} onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))} />
                        </Field>
                        <Field label="Kickoff">
                            <Input type="time" value={draft.time} onChange={(e) => setDraft((d) => ({ ...d, time: e.target.value }))} />
                        </Field>
                    </div>

                    {/* 👇 Add this new row for Pitch Number (or move it wherever you prefer) */}
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Pitch Number">
                            <Input
                                placeholder="e.g., 3"
                                value={draft.pitchNumber}
                                onChange={(e) =>
                                    setDraft((d) => ({ ...d, pitchNumber: e.target.value }))
                                }
                            />
                        </Field>
                        <div /> {/* spacer to keep grid balanced */}
                    </div>

                    {/* Location picker + add new */}
                    <div className="grid grid-cols-1 gap-2">
                        <Field label="Location">
                            {!addMode ? (
                                <div className="flex gap-2">
                                    <Select value={draft.location} onChange={(e) => setDraft((d) => ({ ...d, location: e.target.value }))}>
                                        <option className="bg-slate-900 text-slate-100" value="">
                                            {locLoading ? "Loading..." : "— Select location —"}
                                        </option>
                                        {locs.map((name) => (
                                            <option key={name} value={name} className="bg-slate-900 text-slate-100">
                                                {name}
                                            </option>
                                        ))}
                                    </Select>
                                    <button
                                        type="button"
                                        onClick={() => setAddMode(true)}
                                        className="shrink-0 rounded-xl border border-slate-700 text-slate-200 hover:bg-slate-800 px-3"
                                        title="Add new location"
                                    >
                                        Add
                                    </button>
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <Input placeholder="New location name" value={newLoc} onChange={(e) => setNewLoc(e.target.value)} />
                                    <button
                                        type="button"
                                        onClick={handleAddLocation}
                                        className="shrink-0 rounded-xl bg-yellow-400 text-slate-900 font-semibold hover:bg-yellow-300 px-3"
                                    >
                                        Save
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setAddMode(false);
                                            setNewLoc("");
                                        }}
                                        className="shrink-0 rounded-xl border border-slate-700 text-slate-200 hover:bg-slate-800 px-3"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            )}
                            {!!locError && <div className="text-xs text-red-300 mt-1">{locError}</div>}
                        </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Players">
                            <Input
                                type="number"
                                min={5}
                                max={30}
                                value={draft.numberPlayer}
                                onChange={(e) => setDraft((d) => ({ ...d, numberPlayer: Number(e.target.value || 12) }))}
                            />
                        </Field>
                        <Field label="Notes">
                            <Input placeholder="Optional" value={draft.notes} onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))} />
                        </Field>
                    </div>
                </div>
            </div>

            <div className="sticky bottom-0 z-10 p-3 md:p-4 border-t border-slate-700 bg-slate-900/95 backdrop-blur [padding-bottom:calc(env(safe-area-inset-bottom)+10px)]">
                <div className="flex gap-2">
                    <button onClick={onClose} className="flex-1 rounded-xl border border-slate-700 text-slate-200 hover:bg-slate-800 py-2">
                        Cancel
                    </button>
                    <button
                        onClick={handleCreate}
                        disabled={busy}
                        className="flex-1 rounded-xl bg-yellow-400 text-slate-900 font-semibold hover:bg-yellow-300 py-2 active:scale-[.99] transition disabled:opacity-60"
                    >
                        {busy ? "Creating…" : "Create"}
                    </button>
                </div>
            </div>
        </Sheet>
    );
}

/* ---------------- Admin: Users Sheet (List / Create / Update) ---------------- */
function AdminUsersSheet({ open, onClose, onDone, pushToast }) {
    const [mode, setMode] = useState("list"); // "list" | "create" | "update"
    const [busy, setBusy] = useState(false);

    // Create form
    const [c, setC] = useState({
        firstName: "",
        lastName: "",
        username: "",
        password: "",
        displayName: "",
        role: "USER",
        email: "",
        phoneNumber: "",
        chatId: "",
    });

    // Update/Delete form
    const [u, setU] = useState({
        id: "",
        firstName: "",
        lastName: "",
        username: "",
        password: "",
        displayName: "",
        role: "USER",
        email: "",
        phoneNumber: "",
        chatId: "",
    });

    // Users list
    const [users, setUsers] = useState([]);
    const [usersLoading, setUsersLoading] = useState(false);
    const [usersError, setUsersError] = useState("");
    const [q, setQ] = useState("");

    const filtered = useMemo(() => {
        const needle = q.trim().toLowerCase();
        if (!needle) return users;
        return users.filter((x) =>
            [x.id, x.username, x.displayName, x.firstName, x.lastName, x.role, x.email, x.phoneNumber]
                .map((v) => String(v || "").toLowerCase())
                .some((t) => t.includes(needle))
        );
    }, [users, q]);

    async function fetchUsers() {
        setUsersLoading(true);
        setUsersError("");
        try {
            const res = await api.getAllUsers(); // GET /auth/user/getAll
            const arr = Array.isArray(res) ? res : res?.data ?? [];
            const normed = arr.map((r) => ({
                id: String(r?.id ?? r?.userId ?? ""),
                username: String(r?.username ?? ""),
                displayName: String(r?.displayName ?? r?.name ?? ""),
                firstName: String(r?.firstName ?? ""),
                lastName: String(r?.lastName ?? ""),
                role: String(r?.role ?? r?.roles ?? "USER").toUpperCase().replace(/^ROLE_/, ""),
                email: String(r?.email ?? ""),
                phoneNumber: String(r?.phoneNumber ?? ""),
                chatId: String(r?.chatId ?? ""),
            }));
            normed.sort((a, b) => a.username.localeCompare(b.username));
            setUsers(normed);
        } catch (e) {
            setUsersError(e?.message || "Failed to load users");
        } finally {
            setUsersLoading(false);
        }
    }

    useEffect(() => {
        if (open && mode === "list") fetchUsers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, mode]);

    function editUser(row) {
        setU({
            id: row.id || "",
            firstName: row.firstName || "",
            lastName: row.lastName || "",
            username: row.username || "",
            password: "",
            displayName: row.displayName || "",
            role: row.role || "USER",
            email: row.email || "",
            phoneNumber: row.phoneNumber || "",
            chatId: row.chatId || "",
        });
        setMode("update");
    }

    async function handleCreate() {
        const need = ["firstName", "lastName", "username", "password", "displayName"];
        for (const k of need)
            if (!String(c[k] || "").trim())
                return pushToast({ type: "error", title: "Missing field", message: `${k} is required` });
        setBusy(true);
        try {
            await api.createUser({
                firstName: c.firstName.trim(),
                lastName: c.lastName.trim(),
                username: c.username.trim(),
                password: c.password,
                displayName: c.displayName.trim(),
                role: c.role,
                email: c.email.trim() || undefined,
                phoneNumber: c.phoneNumber.trim() || undefined,
                chatId: c.chatId.trim() || undefined,
            });
            pushToast({ type: "success", title: "User created", message: c.username });
            setC({
                firstName: "",
                lastName: "",
                username: "",
                password: "",
                displayName: "",
                role: "USER",
                email: "",
                phoneNumber: "",
                chatId: "",
            });
            if (mode === "list") fetchUsers();
            onDone?.();
        } catch (e) {
            pushToast({ type: "error", title: "Create failed", message: e?.message || "Something went wrong." });
        } finally {
            setBusy(false);
        }
    }

    async function handleUpdate() {
        const need = ["id", "firstName", "lastName", "username", "displayName"];
        for (const k of need)
            if (!String(u[k] || "").trim())
                return pushToast({ type: "error", title: "Missing field", message: `${k} is required` });
        setBusy(true);
        try {
            await api.UpdateUser({
                id: String(u.id).trim(),
                firstName: u.firstName.trim(),
                lastName: u.lastName.trim(),
                username: u.username.trim(),
                password: u.password || undefined,
                displayName: u.displayName.trim(),
                role: u.role,
                email: u.email.trim() || undefined,
                phoneNumber: u.phoneNumber.trim() || undefined,
                chatId: u.chatId.trim() || undefined,
            });
            pushToast({ type: "success", title: "User updated", message: u.username });
            fetchUsers();
            onDone?.();
        } catch (e) {
            pushToast({ type: "error", title: "Update failed", message: e?.message || "Something went wrong." });
        } finally {
            setBusy(false);
        }
    }

    async function handleDelete() {
        if (!String(u.id || "").trim())
            return pushToast({ type: "error", title: "Missing ID", message: "User ID is required." });
        if (!confirm("Delete this user?")) return;
        setBusy(true);
        try {
            await api.DeleteUser(String(u.id).trim());
            pushToast({ type: "success", title: "User deleted", message: `ID ${u.id}` });
            setU({ ...u, id: "" });
            fetchUsers();
            setMode("list");
            onDone?.();
        } catch (e) {
            pushToast({ type: "error", title: "Delete failed", message: e?.message || "Something went wrong." });
        } finally {
            setBusy(false);
        }
    }

    return (
        <Sheet open={open} onClose={onClose} title="Admin • Users" subtitle="Manage users" size="lg">
            {/* Tabs */}
            <div className="px-4 pt-3">
                <div className="flex gap-2">
                    <button
                        onClick={() => setMode("list")}
                        className={`px-3 py-1.5 rounded-xl border ${
                            mode === "list"
                                ? "bg-yellow-400 text-slate-900 border-yellow-300"
                                : "border-slate-700 text-slate-200 hover:bg-slate-800"
                        }`}
                    >
                        Users
                    </button>
                    <button
                        onClick={() => setMode("create")}
                        className={`px-3 py-1.5 rounded-xl border ${
                            mode === "create"
                                ? "bg-yellow-400 text-slate-900 border-yellow-300"
                                : "border-slate-700 text-slate-200 hover:bg-slate-800"
                        }`}
                    >
                        Create
                    </button>
                    <button
                        onClick={() => setMode("update")}
                        className={`px-3 py-1.5 rounded-xl border ${
                            mode === "update"
                                ? "bg-yellow-400 text-slate-900 border-yellow-300"
                                : "border-slate-700 text-slate-200 hover:bg-slate-800"
                        }`}
                    >
                        Update / Delete
                    </button>
                </div>
            </div>

            {/* Body */}
            <div className="overflow-y-auto px-4 pb-28 pt-3">
                {mode === "list" && (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <Input placeholder="Search users…" value={q} onChange={(e) => setQ(e.target.value)} />
                            <button
                                onClick={fetchUsers}
                                className="px-3 py-2 rounded-xl border border-slate-700 text-slate-200 hover:bg-slate-800"
                                disabled={usersLoading}
                            >
                                {usersLoading ? "Refreshing…" : "Refresh"}
                            </button>
                        </div>

                        {!!usersError && (
                            <div className="text-sm text-red-300 bg-red-900/30 border border-red-800 rounded-xl px-3 py-2">
                                {usersError}
                            </div>
                        )}

                        <div className="overflow-auto rounded-xl border border-slate-700">
                            <table className="min-w-full text-sm text-white">
                                <thead className="bg-slate-800 text-white">
                                <tr>
                                    <th className="px-3 py-2 text-left">Username</th>
                                    <th className="px-3 py-2 text-left">Display</th>
                                    <th className="px-3 py-2 text-left">Role</th>
                                    <th className="px-3 py-2 text-left">Email</th>
                                    <th className="px-3 py-2 text-left">Phone</th>
                                    <th className="px-3 py-2 text-left">ID</th>
                                    <th className="px-3 py-2"></th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800 text-white">
                                {filtered.map((row) => (
                                    <tr key={row.id} className="hover:bg-slate-800/60">
                                        <td className="px-3 py-2 text-white">{row.username}</td>
                                        <td className="px-3 py-2 text-white">{row.displayName}</td>
                                        <td className="px-3 py-2 text-white">{row.role}</td>
                                        <td className="px-3 py-2 text-white">{row.email}</td>
                                        <td className="px-3 py-2 text-white">{row.phoneNumber}</td>
                                        <td className="px-3 py-2 text-white">{row.id}</td>
                                        <td className="px-3 py-2">
                                            <button
                                                onClick={() => editUser(row)}
                                                className="px-2 py-1.5 rounded-lg border border-slate-700 text-slate-200 hover:bg-slate-800 text-xs"
                                                title="Edit"
                                            >
                                                Edit
                                            </button>
                                        </td>
                                    </tr>
                                ))}

                                {!usersLoading && filtered.length === 0 && (
                                    <tr>
                                        <td className="px-3 py-6 text-center text-white" colSpan={7}>
                                            No users found.
                                        </td>
                                    </tr>
                                )}
                                </tbody>
                            </table>
                        </div>

                        <p className="text-[11px] text-slate-500">
                            Tip: Click <span className="font-semibold">Edit</span> to prefill the Update tab.
                        </p>
                    </div>
                )}

                {mode === "create" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Field label="First name*">
                            <Input value={c.firstName} onChange={(e) => setC({ ...c, firstName: e.target.value })} />
                        </Field>
                        <Field label="Last name*">
                            <Input value={c.lastName} onChange={(e) => setC({ ...c, lastName: e.target.value })} />
                        </Field>
                        <Field label="Username*">
                            <Input value={c.username} onChange={(e) => setC({ ...c, username: e.target.value })} />
                        </Field>
                        <Field label="Password*">
                            <Input type="password" value={c.password} onChange={(e) => setC({ ...c, password: e.target.value })} />
                        </Field>
                        <Field label="Display name*">
                            <Input value={c.displayName} onChange={(e) => setC({ ...c, displayName: e.target.value })} />
                        </Field>
                        <Field label="Role">
                            <Select value={c.role} onChange={(e) => setC({ ...c, role: e.target.value })}>
                                <option value="USER" className="bg-slate-900 text-slate-100">USER</option>
                                <option value="ADMIN" className="bg-slate-900 text-slate-100">ADMIN</option>
                            </Select>
                        </Field>
                        <Field label="Email">
                            <Input value={c.email} onChange={(e) => setC({ ...c, email: e.target.value })} />
                        </Field>
                        <Field label="Phone">
                            <Input value={c.phoneNumber} onChange={(e) => setC({ ...c, phoneNumber: e.target.value })} />
                        </Field>
                        <Field label="Chat ID">
                            <Input value={c.chatId} onChange={(e) => setC({ ...c, chatId: e.target.value })} />
                        </Field>
                    </div>
                )}

                {mode === "update" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Field label="User ID*">
                            <Input value={u.id} onChange={(e) => setU({ ...u, id: e.target.value })} />
                        </Field>
                        <div />
                        <Field label="First name*">
                            <Input value={u.firstName} onChange={(e) => setU({ ...u, firstName: e.target.value })} />
                        </Field>
                        <Field label="Last name*">
                            <Input value={u.lastName} onChange={(e) => setU({ ...u, lastName: e.target.value })} />
                        </Field>
                        <Field label="Username*">
                            <Input value={u.username} onChange={(e) => setU({ ...u, username: e.target.value })} />
                        </Field>
                        <Field label="Password (leave blank to keep)">
                            <Input type="password" value={u.password} onChange={(e) => setU({ ...u, password: e.target.value })} />
                        </Field>
                        <Field label="Display name*">
                            <Input value={u.displayName} onChange={(e) => setU({ ...u, displayName: e.target.value })} />
                        </Field>
                        <Field label="Role">
                            <Select value={u.role} onChange={(e) => setU({ ...u, role: e.target.value })}>
                                <option value="USER" className="bg-slate-900 text-slate-100">USER</option>
                                <option value="ADMIN" className="bg-slate-900 text-slate-100">ADMIN</option>
                            </Select>
                        </Field>
                        <Field label="Email">
                            <Input value={u.email} onChange={(e) => setU({ ...u, email: e.target.value })} />
                        </Field>
                        <Field label="Phone">
                            <Input value={u.phoneNumber} onChange={(e) => setU({ ...u, phoneNumber: e.target.value })} />
                        </Field>
                        <Field label="Chat ID">
                            <Input value={u.chatId} onChange={(e) => setU({ ...u, chatId: e.target.value })} />
                        </Field>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 z-10 p-3 md:p-4 border-t border-slate-700 bg-slate-900/95 backdrop-blur [padding-bottom:calc(env(safe-area-inset-bottom)+10px)]">
                {mode === "create" && (
                    <div className="flex gap-2">
                        <button onClick={onClose} className="flex-1 rounded-xl border border-slate-700 text-slate-200 hover:bg-slate-800 py-2">
                            Close
                        </button>
                        <button
                            onClick={handleCreate}
                            disabled={busy}
                            className="flex-1 rounded-xl bg-yellow-400 text-slate-900 font-semibold hover:bg-yellow-300 py-2 active:scale-[.99] transition disabled:opacity-60"
                        >
                            {busy ? "Working…" : "Create User"}
                        </button>
                    </div>
                )}

                {mode === "update" && (
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={handleDelete}
                            disabled={busy}
                            className="rounded-xl bg-red-600 text-white font-semibold hover:bg-red-500 py-2 disabled:opacity-60"
                        >
                            Delete
                        </button>
                        <button
                            onClick={handleUpdate}
                            disabled={busy}
                            className="rounded-xl bg-yellow-400 text-slate-900 font-semibold hover:bg-yellow-300 py-2 active:scale-[.99] transition disabled:opacity-60"
                        >
                            {busy ? "Working…" : "Update User"}
                        </button>
                    </div>
                )}

                {mode === "list" && (
                    <div className="flex justify-end">
                        <button onClick={onClose} className="rounded-xl border border-slate-700 text-slate-200 hover:bg-slate-800 px-4 py-2">
                            Close
                        </button>
                    </div>
                )}
            </div>
        </Sheet>
    );
}

/* ---------------- Header (desktop buttons + mobile hamburger) ---------------- */
export default function Header({ isAdmin, currentUser, onRefresh }) {
    // derive admin if prop not provided
    const [me, setMe] = useState({ id: "", username: "", displayName: "", roles: [], isGuest: false });
    useEffect(() => {
        setMe(getMeFromStorage());
        const onStorage = () => setMe(getMeFromStorage());
        window.addEventListener("storage", onStorage);
        return () => window.removeEventListener("storage", onStorage);
    }, []);
    const jwtRoles = useMemo(() => getRolesFromToken(), []);
    const allRoles = useMemo(() => {
        const s = new Set([...(me.roles || []), ...(jwtRoles || [])].map(String));
        return Array.from(s);
    }, [me.roles, jwtRoles]);
    const derivedIsAdmin = useMemo(() => {
        const R = allRoles.map((r) => r.toUpperCase());
        return R.includes("ROLE_ADMIN") || R.includes("ADMIN");
    }, [allRoles]);
    const effectiveIsAdmin = Boolean(isAdmin ?? derivedIsAdmin);

    const hasJwt = Boolean(typeof window !== "undefined" && localStorage.getItem("accessToken"));
    const isGuest = me.isGuest || (me.roles || []).includes("GUEST");

    const user = currentUser || {
        id: me.id,
        username: me.username,
        displayName: me.displayName || me.username || "Player",
    };

    const [openCreate, setOpenCreate] = useState(false);
    const [openAdminUsers, setOpenAdminUsers] = useState(false);

    const [openMobileMenu, setOpenMobileMenu] = useState(false);
    const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false);

    const [toasts, setToasts] = useState([]);
    const pushToast = (t) =>
        setToasts((arr) => [...arr, { id: Math.random().toString(36).slice(2), duration: 2600, ...t }]);

    async function handleLogout() {
        try {
            await api.logout?.();
        } catch {}
    }

    // IMPORTANT: forward created entity to parent page so it can insert or refetch
    const handleRefresh = (created) => onRefresh?.(created);

    // visibility rules
    const showCreateMatch = hasJwt && !isGuest;
    const showAdmin = hasJwt && effectiveIsAdmin;
    const showLogout = hasJwt && !isGuest;

    return (
        <>
            <header className="w-full bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-yellow-500/20 shadow-lg shadow-black/30 sticky top-0 z-30">
                <div className="mx-auto max-w-screen-xl flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
                    {/* Left: Logo + Title */}
                    <div className="flex items-center gap-3">
                        <img
                            src="https://res.cloudinary.com/dayrc0f7r/image/upload/v1755757391/IMG_1547_tejn31.png"
                            alt="Jerry FT Logo"
                            className="h-10 sm:h-12 w-auto object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]"
                        />
                        <span className="text-xl sm:text-2xl font-extrabold tracking-wider text-yellow-400 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
              Jerry FT
            </span>
                    </div>

                    {/* Desktop actions */}
                    <div className="hidden sm:flex items-center gap-2">
                        {showCreateMatch && (
                            <button
                                onClick={() => setOpenCreate(true)}
                                className="rounded-lg bg-yellow-400 hover:bg-yellow-300 text-slate-900 px-3 py-1.5 text-sm font-semibold flex items-center gap-1.5"
                                title="Create Match"
                            >
                                <PlusCircle className="h-4 w-4" />
                                Create Match
                            </button>
                        )}

                        {showAdmin && (
                            <button
                                onClick={() => setOpenAdminUsers(true)}
                                className="rounded-lg border border-slate-700 hover:bg-slate-800 text-white px-3 py-1.5 text-sm font-semibold flex items-center gap-1.5"
                                title="Admin panel"
                            >
                                <UserCog className="h-4 w-4" />
                                Admin
                            </button>
                        )}

                        {showLogout && (
                            <button
                                onClick={() => setConfirmLogoutOpen(true)}
                                className="rounded-lg bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 text-sm font-semibold flex items-center gap-1.5"
                                title="Logout"
                            >
                                <LogOut className="h-4 w-4" />
                                Logout
                            </button>
                        )}
                    </div>

                    {/* Mobile hamburger */}
                    <div className="sm:hidden">
                        <button
                            aria-label="Open menu"
                            onClick={() => setOpenMobileMenu(true)}
                            className="rounded-xl border border-slate-700 text-slate-200 px-3 py-2 active:scale-[.98] flex items-center gap-1.5"
                        >
                            <Menu className="h-5 w-5" />
                            <span className="sr-only">Menu</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Mobile Menu Sheet */}
            <Sheet
                open={openMobileMenu}
                onClose={() => setOpenMobileMenu(false)}
                title={user.displayName || "Menu"}
                subtitle="Quick actions"
                side="center"
            >
                <div className="px-4 py-3">
                    <div className="divide-y divide-slate-800 rounded-2xl overflow-hidden border border-slate-700">
                        {showCreateMatch && (
                            <button
                                onClick={() => {
                                    setOpenMobileMenu(false);
                                    setOpenCreate(true);
                                }}
                                className="w-full text-left px-4 py-3 hover:bg-slate-800 text-slate-100 flex items-center gap-2"
                            >
                                <PlusCircle className="h-5 w-5" />
                                <span>Create Match</span>
                            </button>
                        )}

                        {showAdmin && (
                            <button
                                onClick={() => {
                                    setOpenMobileMenu(false);
                                    setOpenAdminUsers(true);
                                }}
                                className="w-full text-left px-4 py-3 hover:bg-slate-800 text-slate-100 flex items-center gap-2"
                            >
                                <UserCog className="h-5 w-5" />
                                <span>Admin</span>
                            </button>
                        )}

                        {showLogout && (
                            <button
                                onClick={() => {
                                    setOpenMobileMenu(false);
                                    setConfirmLogoutOpen(true);
                                }}
                                className="w-full text-left px-4 py-3 hover:bg-slate-800 text-red-300 flex items-center gap-2"
                            >
                                <LogOut className="h-5 w-5" />
                                <span>Logout</span>
                            </button>
                        )}
                    </div>
                </div>
            </Sheet>

            {/* Sheets */}
            <CreateMatchSheet
                open={openCreate}
                onClose={() => setOpenCreate(false)}
                onDone={handleRefresh}
                pushToast={pushToast}
            />
            <AdminUsersSheet
                open={Boolean(showAdmin && openAdminUsers)}
                onClose={() => setOpenAdminUsers(false)}
                onDone={handleRefresh}
                pushToast={pushToast}
            />

            {/* Logout confirmation */}
            {confirmLogoutOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                    <div className="bg-slate-800 border border-slate-600 rounded-2xl shadow-xl p-6 w-[90%] max-w-sm">
                        <h4 className="text-lg font-semibold text-white">Log out?</h4>
                        <p className="text-sm text-slate-300 mt-1">You’ll be signed out of Jerry FT on this device.</p>
                        <div className="mt-5 flex justify-end gap-3">
                            <button
                                onClick={() => setConfirmLogoutOpen(false)}
                                className="px-4 py-2 rounded-xl bg-slate-700 text-slate-200 hover:bg-slate-600 transition"
                            >
                                Cancel
                            </button>
                            <button onClick={handleLogout} className="px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-500 transition flex items-center gap-1.5">
                                <LogOut className="h-4 w-4" />
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toasts */}
            <ToastHost toasts={toasts} setToasts={setToasts} />
        </>
    );
}
