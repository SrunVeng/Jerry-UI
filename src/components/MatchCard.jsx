// components/MatchCard.jsx
"use client";

import React from "react";
import Modal from "../components/Modal.jsx";
import { api } from "../api/real.js";

/* ---------------- small utils ---------------- */
const clampScore = (n) => {
    const x = Number(n);
    if (!Number.isFinite(x)) return 0;
    return Math.max(0, Math.min(99, Math.trunc(x)));
};
const nz = (v, d = "") => (v == null ? d : v);
const num = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);
const pickFirst = (...vals) => {
    for (const v of vals) {
        if (v == null) continue;
        const s = typeof v === "string" ? v.trim() : v;
        if (s !== "" && s !== undefined && s !== null) return v;
    }
    return "";
};

function isGuestNow() {
    try {
        const ai = JSON.parse(localStorage.getItem("authIdentity") || "{}");
        const roles = Array.isArray(ai?.roles) ? ai.roles : String(ai?.roles || "").split(/\s+/);
        const identityGuest =
            ai?.isGuest === true ||
            roles.some((r) => String(r).toUpperCase() === "ROLE_GUEST" || String(r).toUpperCase() === "GUEST");

        let tokenGuest = false;
        const token = localStorage.getItem("accessToken");
        if (token) {
            const [, payloadB64] = token.split(".");
            if (payloadB64) {
                const j = JSON.parse(atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/")));
                const scopes =
                    j?.scope || j?.scopes || j?.authorities || j?.roles || [];
                const arr = Array.isArray(scopes) ? scopes : String(scopes || "").split(/\s+/);
                tokenGuest =
                    j?.guest === true ||
                    arr.some((r) => String(r).toUpperCase() === "ROLE_GUEST" || String(r).toUpperCase() === "GUEST");
            }
        }
        return identityGuest || tokenGuest;
    } catch {
        return false;
    }
}

/* -------- date helpers -------- */
function parseYMD(s) {
    const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(String(s || ""));
    if (!m) return null;
    const [, y, mo, d] = m;
    const dt = new Date(Number(y), Number(mo) - 1, Number(d), 0, 0, 0, 0);
    return isNaN(dt) ? null : dt;
}
function parseDMY(s) {
    const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(s || ""));
    if (!m) return null;
    const [, d, mo, y] = m;
    const dt = new Date(Number(y), Number(mo) - 1, Number(d), 0, 0, 0, 0);
    return isNaN(dt) ? null : dt;
}
function parseTimeSmart(s) {
    const v = String(s || "").trim();
    if (!v) return { h: 0, m: 0, s: 0, has: false };
    let m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(v);
    if (m) {
        const H = Math.max(0, Math.min(23, Number(m[1] || 0)));
        const M = Math.max(0, Math.min(59, Number(m[2] || 0)));
        const S = Math.max(0, Math.min(59, Number(m[3] || 0)));
        return { h: H, m: M, s: S, has: true };
    }
    m = /^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/.exec(v);
    if (m) {
        let h = Number(m[1] || 0);
        const mm = Number(m[2] || 0);
        const ap = m[3];
        if (/pm/i.test(ap) && h < 12) h += 12;
        if (/am/i.test(ap) && h === 12) h = 0;
        return { h: Math.max(0, Math.min(23, h)), m: Math.max(0, Math.min(59, mm)), s: 0, has: true };
    }
    const d = new Date(`1970-01-01T${v}`);
    if (!isNaN(d)) return { h: d.getHours(), m: d.getMinutes(), s: d.getSeconds() || 0, has: true };
    return { h: 0, m: 0, s: 0, has: false };
}

function toDateInputValue(v) {
    if (!v) return "";
    try {
        if (typeof v === "string") {
            if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
            const m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
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
            if (/^\d{2}:\d{2}$/.test(v)) return v;
            const m = v.match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/);
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

/* -------- derive time/pitch from match or details -------- */
const pickTime = (m) =>
    pickFirst(m?.time, m?.kickoffTime, m?.kickOffTime, m?.kick_off_time, m?.startTime, m?.start_time);
const pickPitch = (m) =>
    pickFirst(m?.pitchNumber, m?.pitch, m?.pitchNo, m?.pitch_no, m?.fieldNumber, m?.field_no);

/* ---------- misc helpers ---------- */
function buildLocalDateTime(match) {
    const rawDate = match?.date ?? match?.matchDate ?? "";
    const rawTime = pickTime(match);
    let d =
        parseYMD(rawDate) ||
        parseDMY(rawDate) ||
        (isNaN(new Date(rawDate))
            ? null
            : new Date(new Date(rawDate).getFullYear(), new Date(rawDate).getMonth(), new Date(rawDate).getDate()));
    if (!d) return null;
    const t = parseTimeSmart(rawTime);
    if (t.has) d.setHours(t.h, t.m, t.s, 0);
    else d.setHours(23, 59, 0, 0);
    return d;
}

function accentClasses({ past, result }) {
    if (past) {
        switch (String(result || "").toUpperCase()) {
            case "WIN":
                return "from-green-400 via-green-300 to-green-500";
            case "LOSS":
                return "from-red-500 via-red-400 to-red-600";
            case "DRAW":
            default:
                return "from-slate-400 via-slate-300 to-slate-500";
        }
    }
    return "from-yellow-400 via-yellow-300 to-yellow-500";
}

/* -------- tiny UI -------- */
function Stepper({ label, value, setValue, disabled }) {
    return (
        <div className="flex items-center gap-2">
            <span className="text-sm text-slate-300">{label}</span>
            <div className="flex items-center rounded-xl border border-slate-600 bg-slate-900 overflow-hidden">
                <button
                    type="button"
                    className="px-3 py-2 text-slate-100 hover:bg-slate-800 disabled:opacity-50"
                    onClick={() => setValue((v) => clampScore(v) - 1)}
                    disabled={disabled || clampScore(value) <= 0}
                    aria-label={`Decrease ${label}`}
                >
                    −
                </button>
                <input
                    type="number"
                    min={0}
                    max={99}
                    className="w-16 text-center bg-transparent text-white px-2 py-2 outline-none"
                    value={value}
                    onChange={(e) => setValue(clampScore(e.target.value))}
                    disabled={disabled}
                />
                <button
                    type="button"
                    className="px-3 py-2 text-slate-100 hover:bg-slate-800 disabled:opacity-50"
                    onClick={() => setValue((v) => clampScore(v) + 1)}
                    disabled={disabled || clampScore(value) >= 99}
                    aria-label={`Increase ${label}`}
                >
                    +
                </button>
            </div>
        </div>
    );
}

/* -------- opponent label extractor -------- */
function extractOpponentName(m) {
    const rawOpp = (m?.opponentName || "").trim();
    if (rawOpp) return rawOpp;
    const t = (m?.title || "").trim();
    if (!t) return "Jerry FC Match";
    const re = /^(?:jerry\s*f[ct])\s*vs\.?\s*(.+)$/i;
    const mm = t.match(re);
    if (mm && mm[1]) return mm[1].trim();
    return t;
}

/* -------- safer player id/name getters -------- */
function getPlayerId(p) {
    // Support multiple possible shapes: {id}, {userId}, {user:{id}}, {playerId}
    return String(
        pickFirst(
            p?.id,
            p?.userId,
            p?.playerId,
            p?.user?.id
        )
    );
}
function getPlayerName(p) {
    return String(p?.name ?? p?.username ?? p?.displayName ?? p?.user?.displayName ?? "Unknown");
}

/* ===================== COMPONENT ===================== */
/* ===================== COMPONENT ===================== */
export default function MatchCard({
                                      match,
                                      currentUserId,
                                      isJoined,
                                      onJoin,
                                      onLeave,
                                      onDelete,
                                      onShare,
                                      onKick, // optional override
                                      onUpdate,
                                      onEdited,
                                      locations = [],
                                      onAddLocation,
                                  }) {
    const [localMatch, setLocalMatch] = React.useState(match);
    React.useEffect(() => setLocalMatch(match), [match]);

    // guest flag + keep in sync with storage
    const [guest, setGuest] = React.useState(false);
    React.useEffect(() => {
        setGuest(isGuestNow());
        const onStorage = () => setGuest(isGuestNow());
        window.addEventListener("storage", onStorage);
        return () => window.removeEventListener("storage", onStorage);
    }, []);

    // UI state
    const [confirmDeleteOpen, setConfirmDeleteOpen] = React.useState(false);
    const [kickTarget, setKickTarget] = React.useState(null);
    const [editOpen, setEditOpen] = React.useState(false);
    const [saving, setSaving] = React.useState(false);
    const [detailsLoading, setDetailsLoading] = React.useState(false);

    /* --- players --- */
    const players = React.useMemo(() => {
        const raw = Array.isArray(localMatch?.players) ? localMatch.players : [];
        if (raw.length === 0) return [];
        const first = raw[0];
        if (typeof first === "string") {
            return raw.map((name, i) => ({ id: `tmp-${i + 1}`, name: String(name), status: undefined }));
        }
        return raw.map((p, i) => ({
            id: getPlayerId(p) || `tmp-${i + 1}`,
            name: getPlayerName(p),
            status: p?.status,
        }));
    }, [localMatch?.players]);

    const joined = typeof isJoined === "function" ? !!isJoined(localMatch) : false;
    const count = players.length;
    const cap = Math.max(2, num(localMatch?.maxPlayers ?? localMatch?.numberPlayer, 12));
    const percent = Math.min(100, Math.round((count / cap) * 100));
    const disabled = !!localMatch?._pending || saving;

    const pastMode = React.useMemo(() => {
        const GRACE_MS = 15 * 60 * 1000;
        const now = Date.now();
        if (localMatch?._when) {
            const t = new Date(localMatch._when).getTime();
            if (Number.isFinite(t)) return t < now - GRACE_MS;
        }
        const dt = buildLocalDateTime(localMatch);
        return dt ? dt.getTime() < now - GRACE_MS : false;
    }, [localMatch]);

    /* ---------- DETAIL AUTO-HYDRATE (runs once per id) ---------- */
    const hydratedRef = React.useRef(false);

    function needsHydration(m) {
        if (!m) return false;
        const noTime = !pickTime(m);
        const noPitch = !pickPitch(m);
        const noLocUrl = !m?.locationUrl;
        const noCaps = m?.maxPlayers == null && m?.numberPlayer == null;
        const noNotes = m?.notes == null || m?.notes === "";
        const noScores = m?.teamScore == null && m?.opponentScore == null && m?.result == null;
        return noTime || noPitch || noLocUrl || noCaps || noNotes || noScores;
    }

    React.useEffect(() => {
        let cancelled = false;

        async function hydrate() {
            if (!localMatch?.id) return;
            if (hydratedRef.current) return;
            if (!needsHydration(localMatch)) {
                hydratedRef.current = true;
                return;
            }

            try {
                setDetailsLoading(true);
                const res = await api.getMatch(localMatch.id); // GET /match/getMatchDetailsById/{id}
                if (cancelled) return;
                const details = res?.data ?? res ?? {};

                setLocalMatch((base) => {
                    const b = base || {};
                    return {
                        ...b,
                        matchDate: pickFirst(details.matchDate, details.date, b.matchDate, b.date),
                        date: pickFirst(details.date, details.matchDate, b.date, b.matchDate),
                        kickOffTime: pickFirst(details.kickOffTime, details.time, b.kickOffTime, b.time),
                        time: pickFirst(details.time, details.kickOffTime, b.time, b.kickOffTime),
                        pitchNumber: pickFirst(details.pitchNumber, details.pitch, b.pitchNumber, b.pitch),
                        location: pickFirst(details.location, b.location),
                        locationUrl: pickFirst(details.locationUrl, details.mapUrl, b.locationUrl),
                        maxPlayers: pickFirst(details.maxPlayers, details.numberPlayer, b.maxPlayers, b.numberPlayer),
                        notes: pickFirst(details.notes, details.description, b.notes),
                        result: pickFirst(details.result, details.matchResult, b.result),
                        teamScore: pickFirst(details.teamScore, details.homeScore, b.teamScore),
                        opponentScore: pickFirst(details.opponentScore, details.awayScore, b.opponentScore),
                        status: pickFirst(details.status, details.matchStatus, b.status),
                        players: Array.isArray(details.players) ? details.players : b.players,
                    };
                });

                setForm((f) => ({
                    ...f,
                    date: toDateInputValue(pickFirst(details.matchDate, details.date, f.date)),
                    time: toTimeInputValue(pickFirst(details.time, details.kickOffTime, f.time)),
                    pitchNumber: nz(pickFirst(details.pitchNumber, details.pitch, f.pitchNumber), ""),
                    location: nz(pickFirst(details.location, f.location), ""),
                    maxPlayers: Number(pickFirst(details.maxPlayers, details.numberPlayer, f.maxPlayers)) || f.maxPlayers || 12,
                    notes: nz(pickFirst(details.notes, details.description, f.notes), ""),
                }));
            } catch (e) {
                console.warn("auto hydrate failed", e);
            } finally {
                if (!cancelled) {
                    setDetailsLoading(false);
                    hydratedRef.current = true;
                }
            }
        }

        hydrate();
        return () => {
            cancelled = true;
        };
    }, [localMatch?.id]);

    /* ---------- manual DETAILS on Edit open (backup) ---------- */
    async function fetchDetails(id) {
        try {
            setDetailsLoading(true);
            const res = await api.getMatch(id);
            const details = res?.data ?? res ?? {};
            setLocalMatch((prev) => {
                const base = prev || {};
                return {
                    ...base,
                    matchDate: pickFirst(details.matchDate, details.date, base.matchDate, base.date),
                    date: pickFirst(details.date, details.matchDate, base.date, base.matchDate),
                    kickOffTime: pickFirst(details.kickOffTime, details.time, base.kickOffTime, base.time),
                    time: pickFirst(details.time, details.kickOffTime, base.time, base.kickOffTime),
                    pitchNumber: pickFirst(details.pitchNumber, details.pitch, base.pitchNumber, base.pitch),
                    location: pickFirst(details.location, base.location),
                    locationUrl: pickFirst(details.locationUrl, details.mapUrl, base.locationUrl),
                    maxPlayers: pickFirst(details.maxPlayers, details.numberPlayer, base.maxPlayers, base.numberPlayer),
                    notes: pickFirst(details.notes, details.description, base.notes),
                    result: pickFirst(details.result, details.matchResult, base.result),
                    teamScore: pickFirst(details.teamScore, details.homeScore, base.teamScore),
                    opponentScore: pickFirst(details.opponentScore, details.awayScore, base.opponentScore),
                    status: pickFirst(details.status, details.matchStatus, base.status),
                    players: Array.isArray(details.players) ? details.players : base.players,
                };
            });
            setForm((f) => ({
                ...f,
                date: toDateInputValue(pickFirst(details.matchDate, details.date, f.date)),
                time: toTimeInputValue(pickFirst(details.time, details.kickOffTime, f.time)),
                pitchNumber: nz(pickFirst(details.pitchNumber, details.pitch, f.pitchNumber), ""),
                location: nz(pickFirst(details.location, f.location), ""),
                maxPlayers: Number(pickFirst(details.maxPlayers, details.numberPlayer, f.maxPlayers)) || f.maxPlayers || 12,
                notes: nz(pickFirst(details.notes, details.description, f.notes), ""),
            }));
        } catch (e) {
            console.warn("fetchDetails failed", e);
        } finally {
            setDetailsLoading(false);
        }
    }

    /* ---------- edit form ---------- */
    const [form, setForm] = React.useState(() => ({
        opponentName: extractOpponentName(localMatch),
        pitchNumber: nz(pickPitch(localMatch), ""),
        date: toDateInputValue(localMatch?.matchDate ?? localMatch?.date),
        time: toTimeInputValue(pickTime(localMatch) || localMatch?._when),
        location: nz(localMatch?.location, ""),
        maxPlayers: num(localMatch?.maxPlayers ?? localMatch?.numberPlayer, 12),
        notes: nz(localMatch?.notes, ""),
    }));
    React.useEffect(() => {
        setForm({
            opponentName: extractOpponentName(localMatch),
            pitchNumber: nz(pickPitch(localMatch), ""),
            date: toDateInputValue(localMatch?.matchDate ?? localMatch?.date),
            time: toTimeInputValue(pickTime(localMatch) || localMatch?._when),
            location: nz(localMatch?.location, ""),
            maxPlayers: num(localMatch?.maxPlayers ?? localMatch?.numberPlayer, 12),
            notes: nz(localMatch?.notes, ""),
        });
    }, [localMatch]);
    const updateForm = (k, v) => setForm((f) => ({ ...f, [k]: v }));

    React.useEffect(() => {
        if (editOpen && localMatch?.id) fetchDetails(localMatch.id);
    }, [editOpen, localMatch?.id]);

    async function refetchMatch() {
        if (!localMatch?.id) return null;
        try {
            await fetchDetails(localMatch.id);
            return localMatch;
        } catch {
            return null;
        }
    }

    async function handleJoin() {
        if (!localMatch?.id) return;
        try {
            if (typeof onJoin === "function") await onJoin(localMatch.id);
            else if (typeof api?.join === "function") await api.join(localMatch.id); // POST /match/join/{id}
        } catch (e) {
            alert(e?.message || "Failed to join");
        } finally {
            await refetchMatch();
        }
    }

    async function handleLeave() {
        if (!localMatch?.id) return;
        try {
            if (typeof onLeave === "function") await onLeave(localMatch.id);
            else if (typeof api?.leaveMatch === "function") await api.leaveMatch(localMatch.id);
        } catch (e) {
            alert(e?.message || "Failed to leave");
        } finally {
            await refetchMatch();
        }
    }

    async function handleKick(pid) {
        if (!localMatch?.id || !pid) return;
        try {
            if (typeof onKick === "function") await onKick(localMatch.id, pid);
            else if (typeof api?.kickPlayer === "function") await api.kickPlayer(localMatch.id, pid);
        } catch (e) {
            alert(e?.message || "Failed to remove player");
        } finally {
            await refetchMatch();
        }
    }

    async function handleDelete() {
        if (!localMatch?.id) return;
        try {
            if (typeof onDelete === "function") await onDelete(localMatch.id);
            else if (typeof api?.deleteMatch === "function") await api.deleteMatch(localMatch.id);
            setConfirmDeleteOpen(false);
        } catch (e) {
            alert(e?.message || "Failed to delete match");
        }
    }

    async function handleSaveEdit() {
        const payload = {
            id: localMatch.id,
            opponentName: (form.opponentName || "Jerry FC Match").trim(),
            pitchNumber: form.pitchNumber?.toString().trim() || undefined,
            matchDate: form.date || undefined,
            time: form.time || undefined,
            kickOffTime: form.time || undefined,
            location: form.location?.trim() || undefined,
            maxPlayers: num(form.maxPlayers, undefined),
            numberPlayer: num(form.maxPlayers, undefined),
            notes: form.notes?.trim() || undefined,
        };
        setSaving(true);
        try {
            const res =
                typeof onUpdate === "function" ? await onUpdate(payload) : await api.updateMatch(payload);
            await refetchMatch();
            const updated = res?.data ? { ...localMatch, ...res.data } : { ...localMatch, ...payload };
            onEdited?.(updated);
            setEditOpen(false);
        } catch (e) {
            alert(e?.message || "Failed to update match");
        } finally {
            setSaving(false);
        }
    }

    /* ---------- Past-mode result editor ---------- */
    const [resultSaving, setResultSaving] = React.useState(false);
    const [resultEditorOpen, setResultEditorOpen] = React.useState(false);
    const [teamScore, setTeamScore] = React.useState(
        localMatch?.teamScore != null ? clampScore(localMatch.teamScore) : 0
    );
    const [opponentScore, setOpponentScore] = React.useState(
        localMatch?.opponentScore != null ? clampScore(localMatch.opponentScore) : 0
    );
    React.useEffect(() => {
        setTeamScore(localMatch?.teamScore != null ? clampScore(localMatch.teamScore) : 0);
        setOpponentScore(localMatch?.opponentScore != null ? clampScore(localMatch.opponentScore) : 0);
    }, [localMatch?.teamScore, localMatch?.opponentScore]);

    const hasResult = !!localMatch?.result;
    const liveOutcome =
        teamScore != null && opponentScore != null
            ? teamScore > opponentScore
                ? "WIN"
                : teamScore < opponentScore
                    ? "LOSS"
                    : "DRAW"
            : null;

    async function handleUpdateResult() {
        if (!localMatch?.id) return;
        setResultSaving(true);
        try {
            await api.updateMatchResult({
                id: localMatch.id,
                teamScore,
                opponentScore,
            });
            await refetchMatch();
            setResultEditorOpen(false);
        } catch (e) {
            alert(e?.message || "Failed to update result");
        } finally {
            setResultSaving(false);
        }
    }

    const accent = accentClasses({
        past: pastMode,
        result: pastMode ? (localMatch?.result || liveOutcome || null) : null,
    });

    /* ---------- Add location inline ---------- */
    const [addingLoc, setAddingLoc] = React.useState(false);
    const [newLoc, setNewLoc] = React.useState("");
    async function handleAddLocationInline() {
        const name = newLoc.trim();
        if (!name) return;
        try {
            setAddingLoc(true);
            if (typeof onAddLocation === "function") {
                await onAddLocation(name);
            } else if (typeof api?.createLocation === "function") {
                await api.createLocation(name);
            }
            setForm((f) => ({ ...f, location: name }));
            setNewLoc("");
        } catch (e) {
            alert(e?.message || "Failed to add location");
        } finally {
            setAddingLoc(false);
        }
    }

    const opponentLabel = extractOpponentName(localMatch);
    const headerTime = toTimeInputValue(pickTime(localMatch) || localMatch?._when);

    return (
        <div className="rounded-2xl border border-slate-700 bg-gradient-to-b from-slate-800/80 via-slate-800/70 to-slate-900 shadow-xl backdrop-blur-md overflow-hidden">
            <div className={`h-1.5 w-full bg-gradient-to-r ${accent}`} />

            <div className="p-5 md:p-6">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h3 className="text-lg md:text-xl font-bold text-white truncate">{opponentLabel}</h3>

                        <div className="mt-1 text-sm text-slate-100 flex flex-wrap items-center gap-x-4 gap-y-1">
                            {/* Date */}
                            <span className="inline-flex items-center gap-1">
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-white" fill="currentColor" aria-hidden="true">
                  <path d="M7 2a1 1 0 0 1 1 1v1h8V3a1 1 0 1 1 2 0v1h1a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1V3a1 1 0 0 1 1-1zm12 9H5v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8zM6 7h12V6H6v1z" />
                </svg>
                <span>{localMatch?.date || localMatch?.matchDate || toDateInputValue(localMatch?._when)}</span>
              </span>

                            {/* Time */}
                            <span className="inline-flex items-center gap-1">
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-white" fill="currentColor" aria-hidden="true">
                  <path d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm1 10V7a1 1 0 1 0-2 0v6a1 1 0 0 0 .293.707l3 3a1 1 0 1 0 1.414-1.414L13 12z" />
                </svg>
                <span>{headerTime || "--:--"}</span>
              </span>

                            {/* Location */}
                            <span className="inline-flex items-center gap-1 text-slate-300">
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-white" fill="currentColor" aria-hidden="true">
                  <path d="M12 2C8.14 2 5 5.14 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.86-3.14-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" />
                </svg>
                <span className="truncate max-w-[18rem]">{localMatch?.location || ""}</span>
                                {localMatch?.locationUrl?.trim() ? (
                                    <a
                                        href={localMatch.locationUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="ml-2 text-yellow-300 hover:text-yellow-200 underline decoration-yellow-400/60"
                                    >
                                        Map
                                    </a>
                                ) : null}
              </span>

                            {/* Outcome badge (past) */}
                            {pastMode && (
                                <span
                                    className={`ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                        (localMatch?.result || liveOutcome) === "WIN"
                                            ? "bg-green-900/30 border-green-700/40 text-green-300"
                                            : (localMatch?.result || liveOutcome) === "LOSS"
                                                ? "bg-red-900/30 border-red-700/40 text-red-300"
                                                : "bg-slate-800/60 border-slate-600 text-slate-300"
                                    }`}
                                    title="Match Result"
                                >
                  {String(localMatch?.result || liveOutcome || "NO RESULT")}
                </span>
                            )}
                        </div>
                    </div>

                    {/* Share / Edit / Delete hidden for past and for guests */}
                    {!pastMode && !guest && (
                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                onClick={() => onShare?.(localMatch)}
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
                    )}
                </div>

                {/* Players header + progress */}
                <div className="mt-4">
                    <div className="flex justify-between text-xs text-slate-300">
                        <span>Players</span>
                        <span>
              {count} / {cap}
            </span>
                    </div>
                </div>
                <div className="mt-3 h-2 rounded-full bg-slate-700 overflow-hidden" aria-hidden="true">
                    <div className="h-full bg-yellow-400" style={{ width: `${percent}%` }} />
                </div>

                {/* Players list */}
                <div className="mt-3 flex flex-wrap gap-2">
                    {players.length === 0 ? (
                        <span className="text-sm text-slate-400">No one joined yet.</span>
                    ) : (
                        players.map((pl, idx) => {
                            const inLimit = idx + 1 <= cap;
                            const waitlisted = !inLimit || pl.status === "WAITLIST";
                            const isYou =
                                !!currentUserId &&
                                (String(pl.id) === String(currentUserId) || String(pl.userId) === String(currentUserId));
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
                    {pl.name}
                      {isYou ? " (you)" : ""}
                  </span>
                                    {waitlisted && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded-full border bg-slate-800/60 border-slate-600 text-slate-200">
                      Waitlist
                    </span>
                                    )}
                                    {/* Guests cannot kick */}
                                    {!pastMode && !guest && (
                                        <button
                                            onClick={() => setKickTarget({ id: pl.id, name: pl.name })}
                                            className="ml-1 text-red-300 hover:text-red-200"
                                            title="Remove player"
                                            aria-label={`Remove ${pl.name}`}
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
                {localMatch?.notes?.trim() ? (
                    <p className="mt-3 text-sm text-slate-300 break-words">{localMatch.notes}</p>
                ) : null}

                {/* Join/Leave (hide in past) */}
                {!pastMode && (
                    <div className="mt-5 flex flex-wrap items-center gap-3">
                        {!joined ? (
                            <button
                                onClick={handleJoin}
                                disabled={disabled}
                                className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 font-semibold transition active:scale-[.99] shadow-md shadow-yellow-500/10 ${
                                    disabled
                                        ? "bg-yellow-300/40 text-slate-800/60 cursor-not-allowed"
                                        : "bg-yellow-400 text-slate-900 hover:bg-yellow-300"
                                }`}
                                title="Join"
                            >
                                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                                    <path d="M11 11V5a1 1 0 1 1 2 0v6h6a1 1 0 1 1 0 2h-6v6a1 1 0 1 1-2 0v-6H5a1 1 0 1 1 0-2h6z" />
                                </svg>
                                Join
                            </button>
                        ) : (
                            <button
                                onClick={handleLeave}
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
                )}

                {/* PAST: result editor (hide for guests) */}
                {pastMode && !guest && (
                    <div className="mt-5 rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
                        <div className="flex items-center justify-between gap-3">
                            <div className="text-sm text-slate-300">
                                {hasResult ? (
                                    <>
                                        Result:&nbsp;
                                        <b className="text-slate-100">{String(localMatch.result)}</b>
                                        {Number.isFinite(localMatch.teamScore) && Number.isFinite(localMatch.opponentScore) ? (
                                            <> &nbsp;({localMatch.teamScore}–{localMatch.opponentScore})</>
                                        ) : null}
                                    </>
                                ) : (
                                    <>No result yet.</>
                                )}
                            </div>

                            <button
                                onClick={() => setResultEditorOpen((v) => !v)}
                                className="rounded-xl px-3 py-2 bg-blue-600 text-white hover:bg-blue-500 transition"
                            >
                                {hasResult ? (resultEditorOpen ? "Cancel" : "Re-Update") : resultEditorOpen ? "Cancel" : "Update Result"}
                            </button>
                        </div>

                        {resultEditorOpen && (
                            <div className="mt-4 flex flex-col gap-3">
                                <div className="flex flex-wrap items-center gap-4">
                                    <Stepper
                                        label="Team"
                                        value={teamScore}
                                        setValue={(v) => setTeamScore(clampScore(typeof v === "function" ? v(teamScore) : v))}
                                        disabled={resultSaving}
                                    />
                                    <span className="text-slate-400 text-sm">vs</span>
                                    <Stepper
                                        label="Opp"
                                        value={opponentScore}
                                        setValue={(v) => setOpponentScore(clampScore(typeof v === "function" ? v(opponentScore) : v))}
                                        disabled={resultSaving}
                                    />

                                    <span
                                        className={`ml-auto inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${
                                            (teamScore > opponentScore && "bg-green-900/30 border-green-700/40 text-green-300") ||
                                            (teamScore < opponentScore && "bg-red-900/30 border-red-700/40 text-red-300") ||
                                            (teamScore === opponentScore && "bg-slate-800/60 border-slate-600 text-slate-300") ||
                                            "bg-slate-900/40 border-slate-700 text-slate-300"
                                        }`}
                                        title="Live outcome"
                                    >
                    {teamScore > opponentScore ? "WIN" : teamScore < opponentScore ? "LOSS" : "DRAW"}
                  </span>
                                </div>

                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={handleUpdateResult}
                                        disabled={resultSaving}
                                        className={`rounded-xl px-4 py-2.5 font-semibold transition ${
                                            resultSaving
                                                ? "bg-blue-900/20 border border-blue-700/20 text-blue-300/60 cursor-not-allowed"
                                                : "bg-blue-600 text-white hover:bg-blue-500"
                                        }`}
                                    >
                                        {resultSaving ? "Saving…" : "Save Result"}
                                    </button>
                                    <span className="text-xs text-slate-400">Result is set automatically from scores.</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Confirm Delete */}
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
                            onClick={handleDelete}
                            className="px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-500 transition"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Edit modal */}
            <Modal open={!pastMode && editOpen} onClose={() => {}}>
                {!pastMode && (
                    <div className="bg-slate-800 border border-slate-600 rounded-2xl shadow-xl p-6 w-[92%] max-w-lg relative">
                        <div className="flex items-start justify-between">
                            <h4 className="text-lg font-semibold text-white">Edit match</h4>
                            <button
                                onClick={() => !saving && setEditOpen(false)}
                                className="rounded-lg px-2 py-1 text-slate-200 hover:bg-slate-700"
                                title="Close"
                            >
                                ✕
                            </button>
                        </div>

                        {detailsLoading && <div className="mt-2 text-xs text-slate-400">Loading match details…</div>}

                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <label className="text-sm text-slate-200">
                                Opponent
                                <input
                                    className="mt-1 w-full h-11 rounded-xl border border-slate-600 bg-slate-900 px-3.5 text-slate-100 text-base"
                                    value={form.opponentName}
                                    onChange={(e) => updateForm("opponentName", e.target.value)}
                                    placeholder="e.g., Tiger FC"
                                />
                            </label>

                            <label className="text-sm text-slate-200">
                                Pitch Number
                                <input
                                    className="mt-1 w-full h-11 rounded-xl border border-slate-600 bg-slate-900 px-3.5 text-slate-100 text-base"
                                    value={form.pitchNumber}
                                    onChange={(e) => updateForm("pitchNumber", e.target.value)}
                                    placeholder="e.g., 3"
                                />
                            </label>

                            <label className="text-sm text-slate-200">
                                Date
                                <input
                                    type="date"
                                    className="mt-1 w-full h-11 rounded-xl border border-slate-600 bg-slate-900 px-3.5 text-slate-100 text-base"
                                    value={form.date}
                                    onChange={(e) => updateForm("date", e.target.value)}
                                />
                            </label>

                            <label className="text-sm text-slate-200">
                                Time
                                <input
                                    type="time"
                                    step="60"
                                    className="mt-1 w-full h-11 rounded-xl border border-slate-600 bg-slate-900 px-3.5 text-slate-100 text-base"
                                    value={form.time}
                                    onChange={(e) => updateForm("time", e.target.value)}
                                />
                            </label>

                            {/* Location with dropdown + add new */}
                            <div className="md:col-span-2">
                                <label className="text-sm text-slate-200">Location</label>
                                <div className="mt-1 flex flex-col sm:flex-row sm:items-stretch gap-2">
                                    <select
                                        className="w-full sm:flex-1 h-11 rounded-xl border border-slate-600 bg-slate-900 px-3.5 text-slate-100 text-base"
                                        value={form.location}
                                        onChange={(e) => updateForm("location", e.target.value)}
                                    >
                                        <option value="">— Select —</option>
                                        {locations.map((loc) => (
                                            <option key={loc} value={loc}>
                                                {loc}
                                            </option>
                                        ))}
                                        {form.location && !locations.includes(form.location) ? (
                                            <option value={form.location}>{form.location} (custom)</option>
                                        ) : null}
                                    </select>

                                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                                        <input
                                            className="h-11 w-full sm:w-56 rounded-xl border border-slate-600 bg-slate-900 px-3.5 text-slate-100 text-base placeholder:text-slate-400"
                                            placeholder="Add new…"
                                            value={newLoc}
                                            onChange={(e) => setNewLoc(e.target.value)}
                                        />
                                        <button
                                            type="button"
                                            onClick={handleAddLocationInline}
                                            disabled={addingLoc || !newLoc.trim()}
                                            className={`h-11 w-full sm:w-auto text-base rounded-xl px-4 font-medium transition ${
                                                addingLoc ? "bg-slate-700 text-slate-300 cursor-not-allowed" : "bg-yellow-400 text-slate-900 hover:bg-yellow-300"
                                            }`}
                                        >
                                            {addingLoc ? "Adding…" : "Add"}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <label className="text-sm text-slate-200">
                                Max Players
                                <input
                                    type="number"
                                    min={2}
                                    className="mt-1 w-full h-11 rounded-xl border border-slate-600 bg-slate-900 px-3.5 text-slate-100 text-base"
                                    value={form.maxPlayers}
                                    onChange={(e) => updateForm("maxPlayers", e.target.value)}
                                />
                            </label>

                            <label className="text-sm text-slate-200 md:col-span-2">
                                Notes
                                <textarea
                                    rows={3}
                                    className="mt-1 w-full rounded-xl border border-slate-600 bg-slate-900 px-3.5 py-2 text-slate-100 text-base"
                                    value={form.notes}
                                    onChange={(e) => updateForm("notes", e.target.value)}
                                    placeholder="Optional notes…"
                                />
                            </label>
                        </div>

                        <div className="mt-5 flex justify-end gap-3">
                            <button
                                onClick={() => !saving && setEditOpen(false)}
                                disabled={saving}
                                className="px-4 py-2 rounded-xl bg-slate-700 text-slate-200 hover:bg-slate-600 transition disabled:opacity-60"
                            >
                                Close
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
                )}
            </Modal>

            {/* Kick */}
            <Modal open={!!kickTarget} onClose={() => setKickTarget(null)}>
                <div className="bg-slate-800 border border-slate-600 rounded-2xl shadow-xl p-6 w-[90%] max-w-sm">
                    <h4 className="text-lg font-semibold text-white">Remove player?</h4>
                    <p className="text-sm text-slate-300 mt-1">{kickTarget?.name} will be removed from this match.</p>
                    <div className="mt-5 flex justify-end gap-3">
                        <button
                            onClick={() => setKickTarget(null)}
                            className="px-4 py-2 rounded-xl bg-slate-700 text-slate-200 hover:bg-slate-600 transition"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={async () => {
                                try {
                                    await handleKick(kickTarget.id);
                                } finally {
                                    setKickTarget(null);
                                }
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


