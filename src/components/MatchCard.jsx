"use client";

import React from "react";
// TODO: change to your actual path
import Modal from "../components/Modal.jsx";
// If you want the card to call the API directly. Or pass onUpdate prop instead.
import { api } from "../api/real.js";

/**
 * Props:
 *  - match: {
 *      id, opponentName/title, matchDate/date, time, location, locationUrl?,
 *      maxPlayers/numberPlayer, players, notes?, pitchNumber?
 *    }
 *  - currentUserId?: string
 *  - isJoined?: (match) => boolean
 *  - onJoin?: (matchId) => void|Promise<void>
 *  - onLeave?: (matchId) => void|Promise<void>
 *  - onDelete?: (matchId) => void|Promise<void>
 *  - onShare?: (match) => void
 *  - onKick?: (matchId, playerId) => void|Promise<void>
 *  - onUpdate?: (payload) => Promise<any>      // optional: parent handles update
 *  - onEdited?: (updatedMatch) => void         // optional: notify parent after save
 */

// ---------- helpers (date/time normalization for native inputs) ----------
function toDateInputValue(v) {
    if (!v) return "";
    try {
        if (typeof v === "string") {
            if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v; // already yyyy-MM-dd
            const m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); // mm/dd/yyyy
            if (m) {
                const [, mm, dd, yyyy] = m;
                return `${yyyy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
            }
            const d = new Date(v);
            if (!isNaN(d)) {
                const yyyy = d.getFullYear();
                const mm = String(d.getMonth() + 1).padStart(2, "0");
                const dd = String(d.getDate()).padStart(2, "0");
                return `${yyyy}-${mm}-${dd}`;
            }
        } else if (v instanceof Date) {
            const yyyy = v.getFullYear();
            const mm = String(v.getMonth() + 1).padStart(2, "0");
            const dd = String(v.getDate()).padStart(2, "0");
            return `${yyyy}-${mm}-${dd}`;
        }
    } catch {}
    return "";
}

function toTimeInputValue(v) {
    if (!v) return "";
    try {
        if (typeof v === "string") {
            if (/^\d{2}:\d{2}$/.test(v)) return v;      // HH:mm
            const m = v.match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/); // 6:05 PM
            if (m) {
                let [, hh, mm, ap] = m;
                hh = parseInt(hh, 10);
                if (/pm/i.test(ap) && hh < 12) hh += 12;
                if (/am/i.test(ap) && hh === 12) hh = 0;
                return `${String(hh).padStart(2, "0")}:${mm}`;
            }
            const d = new Date(`1970-01-01T${v}`);
            if (!isNaN(d)) {
                const hh = String(d.getHours()).padStart(2, "0");
                const mm = String(d.getMinutes()).padStart(2, "0");
                return `${hh}:${mm}`;
            }
        } else if (v instanceof Date) {
            const hh = String(v.getHours()).padStart(2, "0");
            const mm = String(v.getMinutes()).padStart(2, "0");
            return `${hh}:${mm}`;
        }
    } catch {}
    return "";
}

export default function MatchCard({
                                      match,
                                      currentUserId,
                                      isJoined,
                                      onJoin,
                                      onLeave,
                                      onDelete,
                                      onShare,
                                      onKick,
                                      onUpdate,
                                      onEdited,
                                  }) {
    const [confirmDeleteOpen, setConfirmDeleteOpen] = React.useState(false);
    const [kickTarget, setKickTarget] = React.useState(null); // { id, name }
    const [editOpen, setEditOpen] = React.useState(false);
    const [saving, setSaving] = React.useState(false);

    // Normalize players to objects (supports legacy string array)
    const players = React.useMemo(() => {
        if (!Array.isArray(match.players) || match.players.length === 0) return [];
        const first = match.players[0];
        if (typeof first === "string") {
            return match.players.map((name, i) => ({
                id: `tmp-${i + 1}`,
                name: String(name),
                status: undefined,
            }));
        }
        return match.players.map((p, i) => ({
            id: String(p.id ?? `tmp-${i + 1}`),
            name: String(p.name ?? p.username ?? p.displayName ?? "Unknown"),
            status: p.status,
        }));
    }, [match.players]);

    // join state helpers
    const joined = typeof isJoined === "function" ? isJoined(match) : false;
    const count = players.length;
    const cap = Math.max(2, Number(match.maxPlayers ?? match.numberPlayer) || 12);
    const percent = Math.min(100, Math.round((count / cap) * 100));
    const disabled = !!match._pending || saving;

    // --------- edit form state ----------
    const [form, setForm] = React.useState(() => ({
        opponentName: match.opponentName || match.title || "Jerry FC Match",
        pitchNumber: match.pitchNumber ?? "",
        date: toDateInputValue(match.matchDate || match.date),
        time: toTimeInputValue(match.time || match.kickOffTime),
        location: match.location || "",
        maxPlayers: Number(match.maxPlayers ?? match.numberPlayer ?? 12),
        notes: match.notes || "",
    }));
    React.useEffect(() => {
        setForm({
            opponentName: match.opponentName || match.title || "Jerry FC Match",
            pitchNumber: match.pitchNumber ?? "",
            date: toDateInputValue(match.matchDate || match.date),
            time: toTimeInputValue(match.time || match.kickOffTime),
            location: match.location || "",
            maxPlayers: Number(match.maxPlayers ?? match.numberPlayer ?? 12),
            notes: match.notes || "",
        });
    }, [match]);

    const updateForm = (k, v) => setForm((f) => ({ ...f, [k]: v }));

    async function handleSaveEdit() {
        const payload = {
            id: match.id, // REQUIRED
            opponentName: form.opponentName?.trim() || "Jerry FC Match",
            pitchNumber: form.pitchNumber?.toString().trim() || undefined,
            matchDate: form.date || undefined, // yyyy-MM-dd
            time: form.time || undefined,       // HH:mm
            location: form.location?.trim() || undefined,
            numberPlayer: Number(form.maxPlayers) || 12,
            notes: form.notes?.trim() || undefined,
        };

        setSaving(true);
        try {
            const result =
                typeof onUpdate === "function"
                    ? await onUpdate(payload)
                    : await api.updateMatch(payload);

            // inform parent and close
            onEdited?.(result?.data || { ...match, ...payload });
            setEditOpen(false);
        } catch (e) {
            alert(e?.message || "Failed to update match");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="rounded-2xl border border-slate-700 bg-gradient-to-b from-slate-800/80 via-slate-800/70 to-slate-900 shadow-xl backdrop-blur-md overflow-hidden">
            {/* accent */}
            <div className="h-1.5 w-full bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-500" />

            <div className="p-5 md:p-6">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h3 className="text-lg md:text-xl font-bold text-white truncate">
                            {match.title || match.opponentName || "Jerry FC Match"}
                        </h3>

                        <div className="mt-1 text-sm text-slate-100 flex flex-wrap items-center gap-x-4 gap-y-1">
                            {/* Date */}
                            <span className="inline-flex items-center gap-1">
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-white" fill="currentColor">
                  <path d="M7 2a1 1 0 0 1 1 1v1h8V3a1 1 0 1 1 2 0v1h1a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1V3a1 1 0 0 1 1-1zm12 9H5v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8zM6 7h12V6H6v1z" />
                </svg>
                <span>{match.date || match.matchDate || form.date}</span>
              </span>

                            {/* Time */}
                            <span className="inline-flex items-center gap-1">
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-white" fill="currentColor">
                  <path d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm1 10V7a1 1 0 1 0-2 0v6a1 1 0 0 0 .293.707l3 3a1 1 0 1 0 1.414-1.414L13 12z" />
                </svg>
                <span>{match.time || form.time}</span>
              </span>

                            {/* Location */}
                            <span className="inline-flex items-center gap-1 text-slate-300">
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-white" fill="currentColor">
                  <path d="M12 2C8.14 2 5 5.14 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.86-3.14-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" />
                </svg>
                <span className="truncate max-w-[18rem]">{match.location || form.location}</span>
                                {match.locationUrl?.trim() ? (
                                    <a
                                        href={match.locationUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="ml-2 text-yellow-300 hover:text-yellow-200 underline decoration-yellow-400/60"
                                    >
                                        Map
                                    </a>
                                ) : null}
              </span>
                        </div>
                    </div>

                    {/* Share / Edit / Delete */}
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={() => onShare?.(match)}
                            disabled={disabled}
                            className={`rounded-xl border border-slate-700 px-3 py-2 text-slate-100 transition ${
                                disabled ? "bg-slate-800/40 cursor-not-allowed" : "bg-slate-900/60 hover:bg-slate-800"
                            }`}
                            title="Copy join link"
                        >
                            Share
                        </button>

                        <button
                            onClick={() => setEditOpen(true)}
                            disabled={disabled}
                            className={`rounded-xl border px-3 py-2 transition ${
                                disabled
                                    ? "bg-blue-900/20 border-blue-700/20 text-blue-300/60 cursor-not-allowed"
                                    : "border-blue-700/40 bg-blue-900/30 text-blue-200 hover:bg-blue-900/40"
                            }`}
                            title="Edit match"
                        >
                            Edit
                        </button>

                        <button
                            onClick={() => setConfirmDeleteOpen(true)}
                            disabled={disabled}
                            className={`rounded-xl border px-3 py-2 transition ${
                                disabled
                                    ? "bg-red-900/20 border-red-700/20 text-red-300/60 cursor-not-allowed"
                                    : "border-red-700/40 bg-red-900/30 text-red-200 hover:bg-red-900/40"
                            }`}
                            title="Delete match"
                        >
                            Delete
                        </button>
                    </div>
                </div>

                {/* Players header */}
                <div className="mt-4">
                    <div className="flex justify-between text-xs text-slate-300">
                        <span>Players</span>
                        <span>{count} / {cap}</span>
                    </div>
                </div>

                {/* Progress bar */}
                <div className="mt-3 h-2 rounded-full bg-slate-700 overflow-hidden">
                    <div className="h-full bg-yellow-400" style={{ width: `${percent}%` }} />
                </div>

                {/* Players list */}
                <div className="mt-3 flex flex-wrap gap-2">
                    {players.length === 0 ? (
                        <span className="text-sm text-slate-400">No one joined yet.</span>
                    ) : (
                        players.map((pl, idx) => {
                            const inLimit = idx + 1 <= cap;
                            const isYou = !!currentUserId && String(pl.id) === String(currentUserId);
                            const isWaitlist = !inLimit || pl.status === "WAITLIST";
                            return (
                                <span
                                    key={`${pl.id}-${idx}`}
                                    className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs bg-slate-900/70 border-slate-700 text-slate-100"
                                    title={pl.name}
                                >
                  <span
                      className={`h-5 w-5 grid place-items-center rounded-full text-slate-900 text-[10px] font-extrabold ${
                          inLimit ? "bg-green-400" : "bg-yellow-400"
                      }`}
                  >
                    {idx + 1}
                  </span>
                  <span className={`truncate max-w-[9rem] ${isYou ? "font-semibold text-white" : ""}`}>
                    {pl.name}{isYou ? " (you)" : ""}
                  </span>
                                    {isWaitlist && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded-full border bg-slate-800/60 border-slate-600 text-slate-200">
                      Waitlist
                    </span>
                                    )}
                                    {!!onKick && (
                                        <button
                                            onClick={() => setKickTarget({ id: pl.id, name: pl.name })}
                                            className="ml-1 text-red-300 hover:text-red-200"
                                            title="Remove player"
                                        >
                                            ×
                                        </button>
                                    )}
                </span>
                            );
                        })
                    )}
                </div>

                {/* Notes */}
                {match.notes?.trim() ? (
                    <p className="mt-3 text-sm text-slate-300 break-words">{match.notes}</p>
                ) : null}

                {/* Join / Leave */}
                <div className="mt-5 flex flex-wrap items-center gap-3">
                    {!joined ? (
                        <button
                            onClick={() => onJoin?.(match.id)}
                            disabled={disabled}
                            className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 font-semibold transition active:scale-[.99] shadow-md shadow-yellow-500/10 ${
                                disabled
                                    ? "bg-yellow-300/40 text-slate-800/60 cursor-not-allowed"
                                    : "bg-yellow-400 text-slate-900 hover:bg-yellow-300"
                            }`}
                            title="Join"
                        >
                            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                                <path d="M11 11V5a1 1 0 1 1 2 0v6h6a1 1 0 1 1 0 2h-6v6a1 1 0 1 1-2 0v-6H5a1 1 0 1 1 0-2h6z" />
                            </svg>
                            Join
                        </button>
                    ) : (
                        <button
                            onClick={() => onLeave?.(match.id)}
                            disabled={disabled}
                            className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-2.5 font-semibold transition active:scale-[.99] ${
                                disabled
                                    ? "border-yellow-400/30 bg-slate-900/30 text-yellow-300/60 cursor-not-allowed"
                                    : "border-yellow-400/60 bg-slate-900/60 text-yellow-300 hover:bg-slate-800"
                            }`}
                            title="Leave"
                        >
                            Leave
                        </button>
                    )}
                </div>
            </div>

            {/* ---------- Modals (rendered in a Portal) ---------- */}

            {/* Confirm delete */}
            <Modal open={confirmDeleteOpen} onClose={() => setConfirmDeleteOpen(false)}>
                <div className="bg-slate-800 border border-slate-600 rounded-2xl shadow-xl p-6 w-[90%] max-w-sm">
                    <h4 className="text-lg font-semibold text-white">Are you sure you want to delete?</h4>
                    <p className="text-sm text-slate-300 mt-1">This action cannot be undone.</p>
                    <div className="mt-5 flex justify-end gap-3">
                        <button
                            onClick={() => setConfirmDeleteOpen(false)}
                            className="px-4 py-2 rounded-xl bg-slate-700 text-slate-200 hover:bg-slate-600 transition"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => { onDelete?.(match.id); setConfirmDeleteOpen(false); }}
                            className="px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-500 transition"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Edit modal */}
            <Modal open={editOpen} onClose={() => !saving && setEditOpen(false)}>
                <div className="bg-slate-800 border border-slate-600 rounded-2xl shadow-xl p-6 w-[92%] max-w-lg">
                    <h4 className="text-lg font-semibold text-white">Edit match</h4>

                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className="text-sm text-slate-200">
                            Opponent / Title
                            <input
                                className="mt-1 w-full rounded-xl border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100"
                                value={form.opponentName}
                                onChange={(e) => updateForm("opponentName", e.target.value)}
                                placeholder="e.g., Tiger FC"
                            />
                        </label>

                        <label className="text-sm text-slate-200">
                            Pitch Number
                            <input
                                className="mt-1 w-full rounded-xl border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100"
                                value={form.pitchNumber}
                                onChange={(e) => updateForm("pitchNumber", e.target.value)}
                                placeholder="e.g., 3"
                            />
                        </label>

                        <label className="text-sm text-slate-200">
                            Date
                            <input
                                type="date"
                                className="mt-1 w-full rounded-xl border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100"
                                value={form.date}
                                onChange={(e) => updateForm("date", e.target.value)}
                            />
                        </label>

                        <label className="text-sm text-slate-200">
                            Time
                            <input
                                type="time"
                                step="60"
                                className="mt-1 w-full rounded-xl border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100"
                                value={form.time}
                                onChange={(e) => updateForm("time", e.target.value)}
                            />
                        </label>

                        <label className="text-sm text-slate-200 md:col-span-2">
                            Location
                            <input
                                className="mt-1 w-full rounded-xl border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100"
                                value={form.location}
                                onChange={(e) => updateForm("location", e.target.value)}
                                placeholder="e.g., National Stadium"
                            />
                        </label>

                        <label className="text-sm text-slate-200">
                            Max Players
                            <input
                                type="number"
                                min={2}
                                className="mt-1 w-full rounded-xl border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100"
                                value={form.maxPlayers}
                                onChange={(e) => updateForm("maxPlayers", e.target.value)}
                            />
                        </label>

                        <label className="text-sm text-slate-200 md:col-span-2">
                            Notes
                            <textarea
                                rows={3}
                                className="mt-1 w-full rounded-xl border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100"
                                value={form.notes}
                                onChange={(e) => updateForm("notes", e.target.value)}
                                placeholder="Optional notes…"
                            />
                        </label>
                    </div>

                    <div className="mt-5 flex justify-end gap-3">
                        <button
                            onClick={() => setEditOpen(false)}
                            disabled={saving}
                            className="px-4 py-2 rounded-xl bg-slate-700 text-slate-200 hover:bg-slate-600 transition disabled:opacity-60"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSaveEdit}
                            disabled={saving}
                            className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-500 transition disabled:opacity-60"
                        >
                            {saving ? "Saving..." : "Save"}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Kick modal */}
            <Modal open={!!kickTarget} onClose={() => setKickTarget(null)}>
                <div className="bg-slate-800 border border-slate-600 rounded-2xl shadow-xl p-6 w-[90%] max-w-sm">
                    <h4 className="text-lg font-semibold text-white">Remove player?</h4>
                    <p className="text-sm text-slate-300 mt-1">
                        {kickTarget?.name} will be removed from this match.
                    </p>
                    <div className="mt-5 flex justify-end gap-3">
                        <button
                            onClick={() => setKickTarget(null)}
                            className="px-4 py-2 rounded-xl bg-slate-700 text-slate-200 hover:bg-slate-600 transition"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={async () => {
                                try { await onKick?.(match.id, kickTarget.id); } finally { setKickTarget(null); }
                            }}
                            className="px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-500 transition"
                        >
                            Remove
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
