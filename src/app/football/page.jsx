// app/matches/page.jsx
"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import MatchCard from "../../components/MatchCard.jsx";
import FootballLoader from "../../components/footballLoader.jsx";
import { api } from "../../api/real.js";

/* ---------------- utils ---------------- */
const randKey = () => Math.random().toString(36).slice(2);
const prettyError = (e, fallback = "Something went wrong") => {
    if (!e) return fallback;
    if (typeof e === "string") return e;
    if (e.message) return e.message;
    try { return JSON.stringify(e); } catch { return fallback; }
};

const norm = (s) => String(s || "").trim().replace(/\s+/g, " ").toLowerCase();

/* -------- Robust date/time parsing -------- */
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
function parseMDYorDMYSmart(s, now = new Date()) {
    const m = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/.exec(String(s || ""));
    if (!m) return null;
    let [, a, b, y] = m;
    const A = Number(a), B = Number(b), Y = Number(y);
    if (!isFinite(A) || !isFinite(B) || !isFinite(Y)) return null;

    let dmy = null, mdy = null;
    if (A > 12 && B <= 12) {
        dmy = new Date(Y, B - 1, A, 0, 0, 0, 0);
        return isNaN(dmy) ? null : dmy;
    }
    if (B > 12 && A <= 12) {
        mdy = new Date(Y, A - 1, B, 0, 0, 0, 0);
        return isNaN(mdy) ? null : mdy;
    }

    dmy = new Date(Y, B - 1, A, 0, 0, 0, 0);
    mdy = new Date(Y, A - 1, B, 0, 0, 0, 0);
    if (isNaN(dmy) && isNaN(mdy)) return null;
    if (isNaN(dmy)) return mdy;
    if (isNaN(mdy)) return dmy;

    const nowMonth = now.getMonth();
    const dmyMonthMatch = dmy.getMonth() === nowMonth;
    const mdyMonthMatch = mdy.getMonth() === nowMonth;
    if (dmyMonthMatch && !mdyMonthMatch) return dmy;
    if (mdyMonthMatch && !dmyMonthMatch) return mdy;

    const diffD = Math.abs(dmy.getTime() - now.getTime());
    const diffM = Math.abs(mdy.getTime() - now.getTime());
    return diffD <= diffM ? dmy : mdy;
}
function parseTimeSmart(s) {
    const v = String(s || "").trim();
    if (!v) return { h: 0, m: 0, s: 0 };

    let m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(v);
    if (m) {
        const H = Math.max(0, Math.min(23, Number(m[1] || 0)));
        const M = Math.max(0, Math.min(59, Number(m[2] || 0)));
        const S = Math.max(0, Math.min(59, Number(m[3] || 0)));
        return { h: H, m: M, s: S };
    }

    m = /^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/.exec(v);
    if (m) {
        let h = Number(m[1] || 0);
        const mm = Number(m[2] || 0);
        const ap = m[3];
        if (/pm/i.test(ap) && h < 12) h += 12;
        if (/am/i.test(ap) && h === 12) h = 0;
        return { h: Math.max(0, Math.min(23, h)), m: Math.max(0, Math.min(59, mm)), s: 0 };
    }

    const d = new Date(`1970-01-01T${v}`);
    if (!isNaN(d)) return { h: d.getHours(), m: d.getMinutes(), s: d.getSeconds() || 0 };

    return { h: 0, m: 0, s: 0 };
}
function buildDateTime(match) {
    const rawDate = match?.date ?? match?.matchDate ?? match?.match_date ?? "";
    const rawTime = match?.time ?? match?.kickoffTime ?? match?.kickOffTime ?? match?.kick_off_time ?? "";

    let d =
        parseYMD(rawDate) ||
        parseDMY(rawDate) ||
        parseMDYorDMYSmart(rawDate);

    if (!d) {
        const tryD = new Date(rawDate);
        d = isNaN(tryD) ? null : new Date(tryD.getFullYear(), tryD.getMonth(), tryD.getDate(), 0, 0, 0, 0);
    }
    if (!d) return null;

    const { h, m, s } = parseTimeSmart(rawTime);

    const H = (rawTime && (h || m || s)) ? h : 23;
    const M = (rawTime && (h || m || s)) ? m : 59;
    const S = (rawTime && (h || m || s)) ? s : 0;

    d.setHours(H, M, S, 0);
    return d;
}

/* -------- auth (local) -------- */
function getJwtPayload() {
    try {
        const tok = localStorage.getItem("accessToken");
        return safeDecodeJwt(tok);
    } catch {
        return null;
    }
}

function getMeFromStorage() {
    try {
        const raw = localStorage.getItem("authIdentity");
        let base = { id: "", username: "", displayName: "", roles: [], isGuest: false };

        if (raw) {
            const a = JSON.parse(raw);
            const roles =
                a?.roles ??
                a?.authorities ??
                a?.scopes ??
                a?.user?.roles ??
                a?.user?.authorities ??
                [];
            base = {
                id: String(a?.guestId ?? a?.id ?? a?.userId ?? a?.user?.id ?? ""),
                username: String(a?.username ?? a?.user?.username ?? ""),
                displayName: String(
                    a?.displayName ??
                    a?.name ??
                    a?.user?.displayName ??
                    a?.user?.name ??
                    ""
                ),
                roles: Array.isArray(roles)
                    ? roles
                    : String(roles || "").split(/\s+/).filter(Boolean),
                isGuest: !!a?.isGuest,
                source: "user",
            };
        }



        // Enhance from token (for guests we carry displayName + subject)
        const jwt = getJwtPayload();
        if (jwt) {
            const scopes = jwt.scope || jwt.scopes || jwt.roles || [];
            const roles = Array.isArray(scopes)
                ? scopes
                : String(scopes || "").split(/\s+/);
            const isGuest = !!jwt.guest || roles.includes("ROLE_GUEST");
            const displayName = base.displayName || jwt.displayName || "";
            return {
                ...base,
                isGuest,
                displayName,
                jwtSubject: jwt.sub || "",
            };
        }
        return base;
    } catch {
        return { id: "", username: "", displayName: "", roles: [], isGuest: false };
    }
}
function safeDecodeJwt(token) {
    try {
        if (!token || typeof token !== "string") return null;
        const parts = token.split(".");
        if (parts.length < 2) return null;
        const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        const json = atob(base64);
        return JSON.parse(json);
    } catch {
        return null;
    }
}

function getRolesFromToken() {
    try {
        const token = localStorage.getItem("accessToken");
        const jwt = safeDecodeJwt(token);
        if (!jwt) return [];
        const scopes =
            jwt.scope ||
            jwt.scopes ||
            jwt.authorities ||
            jwt.roles ||
            jwt.authorities_claim ||
            [];
        const arr = Array.isArray(scopes) ? scopes : String(scopes || "").split(/\s+/);
        return arr.filter(Boolean);
    } catch {
        return [];
    }
}

/* -------- server -> UI coercion (includes result/scores/status) -------- */
function coerceMatch(serverItem) {
    if (!serverItem || typeof serverItem !== "object" || Array.isArray(serverItem)) return null;

    const rawId =
        serverItem.id ??
        serverItem.matchId ??
        serverItem.match_id ??
        serverItem.uuid ??
        serverItem.matchUUID ??
        null;
    const id = rawId != null ? String(rawId) : null;

    const opponent = serverItem.opponentName ?? serverItem.name ?? "";
    const title = serverItem.title ?? (opponent ? `Jerry FT vs ${opponent}` : "Jerry FC Match");

    const date = serverItem.date ?? serverItem.matchDate ?? "";
    const time = serverItem.time ?? serverItem.kickoffTime ?? serverItem.kickOffTime ?? "";
    const location = serverItem.location ?? serverItem.venue ?? "";
    const locationUrl = serverItem.locationUrl ?? serverItem.mapUrl ?? "";
    const maxPlayers = Number(serverItem.maxPlayers ?? serverItem.numberPlayer ?? serverItem.capacity) || 12;

    let playersRaw =
        serverItem.players ??
        serverItem.attendees ??
        serverItem.playerNames ??
        serverItem.player_names ??
        [];

    let players = [];
    if (Array.isArray(playersRaw)) {
        if (playersRaw.length && typeof playersRaw[0] === "string") {
            players = playersRaw
                .filter(Boolean)
                .map((name, i) => ({ id: `name-${i + 1}`, name: String(name), username: "" }));
        } else {
            players = playersRaw.map((p, i) => {
                const u = p?.user || p || {};
                // If guest, prefer guestId as stable primary key
                const pid = p?.guestId ?? u?.id ?? p?.userId ?? p?.id ?? `tmp-${i + 1}`;
                const username = String(u?.username ?? p?.username ?? "");
                const name = String(
                    u?.displayName ??
                    u?.name ??
                    p?.guestDisplayName ??
                    p?.name ??
                    username ??
                    u?.username ??
                    "Player"
                );
                return { id: String(pid), name, username, status: p?.status, isGuest: !!p?.guestId };
            });
        }
    }

    const notes = serverItem.notes ?? serverItem.description ?? serverItem.remark ?? "";

    const status = (serverItem.status ?? serverItem.matchStatus ?? null) || null;
    const result =
        (serverItem.result != null ? String(serverItem.result) : null) ||
        (serverItem.matchResult != null ? String(serverItem.matchResult) : null) ||
        null;
    const teamScore =
        serverItem.teamScore != null ? Number(serverItem.teamScore)
            : (serverItem.homeScore != null ? Number(serverItem.homeScore) : null);
    const opponentScore =
        serverItem.opponentScore != null ? Number(serverItem.opponentScore)
            : (serverItem.awayScore != null ? Number(serverItem.awayScore) : null);

    return {
        _key: id || randKey(),
        id,
        ephemeral: !id,
        title,
        date,
        time,
        location,
        locationUrl,
        maxPlayers,
        players,
        notes,
        createdBy: serverItem.createdBy ?? null,

        status,
        result: result ? result.toUpperCase() : null,
        teamScore: Number.isFinite(teamScore) ? teamScore : null,
        opponentScore: Number.isFinite(opponentScore) ? opponentScore : null,
    };
}

export default function Page() {
    /* -------- me/session -------- */
    const [{
        id: myId,
        username: myUsername,
        displayName: myName,
        roles: storedRoles,
        isGuest,
        jwtSubject
    }, setMe] = useState({
        id: "", username: "", displayName: "", roles: [], isGuest: false, jwtSubject: ""
    });

    useEffect(() => { setMe(getMeFromStorage()); }, []);
    const jwtRoles = useMemo(() => getRolesFromToken(), []);
    const allRoles = useMemo(() => {
        const s = new Set([...(storedRoles || []), ...(jwtRoles || [])].map(r => String(r)));
        return Array.from(s);
    }, [storedRoles, jwtRoles]);

    const currentUserId = useMemo(() => (myId ? String(myId) : ""), [myId]);
    const effectiveUserId = isGuest ? (myId || jwtSubject || "") : currentUserId; // guests use subject ("guest:<uuid>")
    const greetingName = myName || myUsername || "Player";

    /* -------- matches & ui -------- */
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [pending, setPending] = useState({});      // {[matchId]: true}

    const [joinedByMe, setJoinedByMe] = useState({}); // {[matchId]: boolean}

    // Locations (for MatchCard / edit modal) — NOT used by guests
    const [locations, setLocations] = useState([]);
    const [locError, setLocError] = useState("");

    const normalizeLocationList = (raw) => {
        const arr = Array.isArray(raw) ? raw : (raw?.data ?? []);
        const names = arr.map((x) => {
            if (typeof x === "string") return x;
            if (!x || typeof x !== "object") return "";
            return String(x.name ?? x.location ?? x.title ?? "");
        }).filter(Boolean);

        const seen = new Set();
        const unique = [];
        for (const n of names) {
            const k = norm(n);
            if (!seen.has(k)) { seen.add(k); unique.push(n); }
        }
        return unique.sort((a, b) => a.localeCompare(b));
    };

    const fetchLocations = useCallback(async () => {
        setLocError("");
        try {
            let result = null;
            if (typeof api.getAllLocation === "function") {
                result = await api.getAllLocation();
            } else if (typeof api.request === "function") {
                result = await api.request("/match/location/getAll", { method: "GET" });
            } else {
                result = [];
            }
            setLocations(normalizeLocationList(result));
        } catch (e) {
            setLocError(prettyError(e, "Failed to load locations"));
        }
    }, []);

    const fetchMatches = useCallback(async () => {
        setLoading(true);
        setLoadError("");
        try {
            const res = await api.getMatchAll();
            const raw = Array.isArray(res) ? res : res?.data ?? [];
            const mapped = raw.map(coerceMatch).filter(Boolean);
            setMatches(mapped);

            const idMap = {};
            const myBestName = norm(myName || myUsername);
            for (const m of mapped) {
                const hasMeByEffectiveId = effectiveUserId && m.players.some((p) => String(p.id) === String(effectiveUserId));
                const hasMeByUsername = myUsername && m.players.some((p) => norm(p.username) === norm(myUsername));
                const hasMeByName = myBestName && m.players.some((p) => norm(p.name) === myBestName);
                if (hasMeByEffectiveId || hasMeByUsername || hasMeByName) idMap[m.id] = true;
            }
            setJoinedByMe((prev) => ({ ...prev, ...idMap }));
        } catch (e) {
            setLoadError(prettyError(e, "Failed to load matches"));
        } finally {
            setLoading(false);
        }
    }, [effectiveUserId, myUsername, myName]);

    useEffect(() => { fetchMatches(); }, [fetchMatches]);
    useEffect(() => {
        // Guests do not need locations (they can't edit)
        if (!isGuest) fetchLocations();
    }, [fetchLocations, isGuest]);

    /* -------- helpers -------- */
    const isJoined = useCallback(
        (m) => {
            if (!m) return false;
            if (m.id && joinedByMe[m.id] != null) return !!joinedByMe[m.id];
            if (!Array.isArray(m.players)) return false;

            const myBestName = norm(myName || myUsername);
            return (
                (effectiveUserId && m.players.some((p) => String(p.id) === String(effectiveUserId))) ||
                (myUsername && m.players.some((p) => norm(p.username) === norm(myUsername))) ||
                (myBestName && m.players.some((p) => norm(p.name) === myBestName))
            );
        },
        [joinedByMe, effectiveUserId, myUsername, myName]
    );

    const refreshOneMatch = useCallback(async (id) => {
        if (!id) return;
        try {
            const [baseRes, detailsRes] = await Promise.all([
                typeof api.getMatchById === "function" ? api.getMatchById(id) : null,
                typeof api.getMatch === "function" ? api.getMatch(id) : null,
            ]);

            const base = baseRes?.data ?? baseRes ?? {};
            const details = detailsRes?.data ?? detailsRes ?? {};

            const merged = coerceMatch({ ...base, ...details, id });
            if (!merged) return;

            setMatches((prev) =>
                prev.map((m) => (String(m.id) === String(id) ? { ...m, ...merged, _key: m._key } : m))
            );
        } catch (err) {
            console.warn("refreshOneMatch failed", err);
        }
    }, []);

    // Merge (patch) a single match back into the list when a card edits it
    const upsertMatchIntoList = useCallback((updated) => {
        if (!updated || !updated.id) return;

        setMatches((prev) => {
            const idx = prev.findIndex((m) => String(m.id) === String(updated.id));
            if (idx === -1) return prev;

            const before = prev[idx];
            const next = prev.slice();
            next[idx] = {
                ...before,
                result: updated.result ?? before.result ?? null,
                teamScore: (updated.teamScore ?? before.teamScore) ?? null,
                opponentScore: (updated.opponentScore ?? before.opponentScore) ?? null,
                status: updated.status ?? before.status ?? null,
                ...(updated.date ? { date: updated.date } : {}),
                ...(updated.time || updated.kickOffTime ? { time: updated.time || updated.kickOffTime } : {}),
                ...(updated.location ? { location: updated.location } : {}),
                ...(updated.maxPlayers ? { maxPlayers: updated.maxPlayers } : {}),
                ...(updated.notes !== undefined ? { notes: updated.notes } : {}),
                ...(updated.pitchNumber ? { pitchNumber: updated.pitchNumber } : {}),
            };
            return next;
        });

        // then hydrate from server so card reflects canonical fields immediately
        refreshOneMatch(updated.id);
    }, [refreshOneMatch]);

    function applyLocalMembership(matchId, action) {
        setMatches((prev) => {
            const idx = prev.findIndex((m) => String(m.id) === String(matchId));
            if (idx === -1) return prev;
            const target = prev[idx];

            const next = prev.slice();
            const clone = { ...target, players: [...(target.players || [])] };

            if (action === "add") {
                const already =
                    clone.players.some((p) => String(p.id) === String(effectiveUserId)) ||
                    clone.players.some((p) => norm(p.username) === norm(myUsername)) ||
                    clone.players.some((p) => norm(p.name) === norm(myName || myUsername));
                if (!already) {
                    clone.players.push({
                        id: effectiveUserId || `me-${randKey()}`, // guest uses jwt subject ("guest:<uuid>")
                        name: myName || myUsername || "You",
                        username: myUsername || "",
                        status: "JOINED",
                    });
                }
            } else {
                clone.players = clone.players.filter(
                    (p) =>
                        String(p.id) !== String(effectiveUserId) &&
                        norm(p.username) !== norm(myUsername) &&
                        norm(p.name) !== norm(myName || myUsername)
                );
            }

            next[idx] = clone;
            return next;
        });

        setJoinedByMe((prev) => ({ ...prev, [matchId]: action === "add" }));
    }

    async function handleJoin(matchId) {
        if (!matchId || !/^\w+$/.test(String(matchId))) {
            alert("This match has no server id yet. Save it first.");
            return;
        }
        if (pending[matchId]) return;
        setPending((p) => ({ ...p, [matchId]: true }));

        applyLocalMembership(matchId, "add");

        try {
            await api.join(matchId);
            await fetchMatches();
        } catch (e) {
            if (e?.status === 409) {
                await fetchMatches();
            } else {
                if (e?.status === 401) {
                    const next = encodeURIComponent(window.location.pathname + window.location.search);
                    window.location.href = `/join?next=${next}`;
                    return;
                }
                applyLocalMembership(matchId, "remove");
                alert(prettyError(e, "Failed to join match"));
            }
        } finally {
            setPending((p) => { const n = { ...p }; delete n[matchId]; return n; });
        }
    }

    async function handleLeave(matchId) {
        if (!matchId || !/^\w+$/.test(String(matchId))) {
            alert("This match has no server id yet.");
            return;
        }
        if (pending[matchId]) return;
        setPending((p) => ({ ...p, [matchId]: true }));

        applyLocalMembership(matchId, "remove");

        try {
            await api.leave(matchId);
            await fetchMatches();
        } catch (e) {
            applyLocalMembership(matchId, "add");
            alert(prettyError(e, "Failed to leave match"));
        } finally {
            setPending((p) => { const n = { ...p }; delete n[matchId]; return n; });
        }
    }

    async function deleteMatch(data) {
        const raw =
            (typeof data === "object" && data !== null)
                ? (data.id ?? data.matchId ?? data.match_id ?? data.uuid ?? data.matchUUID)
                : data;

        const id = raw != null ? String(raw) : "";
        if (!id) {
            alert("Missing match id.");
            return;
        }

        if (pending[id]) return;
        setPending((p) => ({ ...p, [id]: true }));

        try {
            await api.deleteMatch(id);
            setMatches((prev) => prev.filter((m) => String(m.id) !== id));
        } catch (e) {
            alert(prettyError(e, "Failed to delete match"));
        } finally {
            setPending((p) => { const n = { ...p }; delete n[id]; return n; });
        }
    }

    /* ====== GROUPING: Upcoming vs Past (with 15-minute grace) ====== */
    const GRACE_MS = 15 * 60 * 1000;
    const now = new Date();

    const { upcoming, past } = useMemo(() => {
        const u = [];
        const p = [];
        for (const m of matches) {
            const dt = buildDateTime(m);
            if (!dt) {
                u.push({ ...m, _when: null });
                continue;
            }
            const cutoff = dt.getTime() + GRACE_MS;
            (cutoff >= now.getTime() ? u : p).push({ ...m, _when: dt });
        }
        u.sort((a, b) => (a._when?.getTime() ?? Infinity) - (b._when?.getTime() ?? Infinity));
        p.sort((a, b) => (b._when?.getTime() ?? -Infinity) - (a._when?.getTime() ?? -Infinity));
        return { upcoming: u, past: p };
    }, [matches, now]);

    /* ====== Header -> onRefresh(created) ======
       - If `created` exists, coerce + insert at top of Upcoming immediately.
       - Otherwise, do a normal fetch. */
    const handleHeaderRefresh = useCallback(async (created) => {
        if (created && (created.id || created.matchId)) {
            const ui = coerceMatch(created);
            if (ui) {
                setMatches((prev) => {
                    // avoid dupes if server push landed already
                    const exists = prev.some((m) => String(m.id) === String(ui.id));
                    const next = exists
                        ? prev.map((m) => (String(m.id) === String(ui.id) ? { ...m, ...ui } : m))
                        : [ui, ...prev];
                    return next;
                });
                // hydrate the new one to ensure consistency with DB
                if (ui.id) refreshOneMatch(ui.id);
                return;
            }
        }
        await fetchMatches();
    }, [fetchMatches, refreshOneMatch]);

    useEffect(() => {
        const onHdr = (e) => {
            // e.detail is the created match (if provided)
            handleHeaderRefresh(e.detail);
        };
        window.addEventListener("matches:refresh", onHdr);
        return () => window.removeEventListener("matches:refresh", onHdr);
    }, [handleHeaderRefresh]);

    /* -------- UI -------- */
    if (loading) {
        return (
            <FootballLoader
                fullscreen
                label="Loading matches…"
                hint="Fetching latest from server"
            />
        );
    }

    return (
        <div className="min-h-screen w-full overflow-x-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-900">

            <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8 py-6 md:py-10">
                {/* Greeting */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 flex items-center justify-center rounded-full bg-yellow-400 text-slate-900 font-bold shadow-md">
                            👋
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                            Welcome back,
                            <span className="text-yellow-400 ml-2">{greetingName}</span>
                        </h1>
                    </div>
                </div>

                {!!loadError && (
                    <div className="rounded-2xl border border-red-700/40 bg-red-900/30 p-4 text-red-100 mb-6">
                        {loadError}
                    </div>
                )}

                {!!locError && !isGuest && (
                    <div className="rounded-xl border border-yellow-700/30 bg-yellow-900/20 p-3 text-yellow-100 mb-4 text-sm">
                        {locError}
                    </div>
                )}

                {/* ==================== Upcoming ==================== */}
                <section className="mb-10">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                            Upcoming Matches
                        </h2>
                        <span className="text-xs font-semibold bg-green-500/20 text-green-300 border border-green-600/40 px-2.5 py-1 rounded-full">
              {upcoming.length}
            </span>
                    </div>

                    {upcoming.length === 0 ? (
                        <div className="rounded-2xl border border-slate-700 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 shadow-lg">
                            <div className="py-10 sm:py-12 text-center text-base sm:text-lg text-slate-300 px-4 break-words">
                                No upcoming matches — create one to get started.
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                            {upcoming.map((m) => (
                                <div key={m._key} className="relative">
                                    <MatchCard
                                        match={{ ...m, _pending: !!pending[m.id] }}
                                        currentUserId={effectiveUserId}
                                        isJoined={(x) => isJoined(x)}
                                        onJoin={(idFromCard) => {
                                            const id = idFromCard || m.id;
                                            if (!m.ephemeral) handleJoin(id);
                                            else alert("Save the match first");
                                        }}
                                        onLeave={(idFromCard) => {
                                            const id = idFromCard || m.id;
                                            handleLeave(id);
                                        }}
                                        {...(!isGuest && {
                                            onDelete: () => deleteMatch(m.id),
                                            onShare: () => {
                                                if (!m.id) {
                                                    alert("Save the match first to get a shareable link.");
                                                    return;
                                                }
                                                const url = new URL(window.location.href);
                                                url.searchParams.set("match", m.id);
                                                navigator.clipboard?.writeText?.(url.toString());
                                                alert("Sharable join link copied!");
                                            },
                                            onKick: async (matchId, playerId) => {
                                                if (!matchId || !playerId) return;
                                                setPending((p) => ({ ...p, [matchId]: true }));
                                                try { await api.kickPlayer(matchId, playerId); }
                                                catch (e) { alert(e?.message || "Failed to remove player"); }
                                                finally {
                                                    setPending((p) => {
                                                        const next = { ...p };
                                                        delete next[matchId];
                                                        return next;
                                                    });
                                                }
                                            },
                                            onEdited: upsertMatchIntoList,
                                            locations,
                                            onAddLocation: async (name) => {
                                                await api.createLocation(name);
                                                await fetchLocations();
                                            }
                                        })}
                                        // If your MatchCard supports it, you can also pass readOnly={isGuest}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* ==================== Past ==================== */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                            Past Matches
                        </h2>
                        <span className="text-xs font-semibold bg-slate-500/20 text-slate-300 border border-slate-600/40 px-2.5 py-1 rounded-full">
              {past.length}
            </span>
                    </div>

                    {past.length === 0 ? (
                        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 shadow-lg">
                            <div className="py-8 text-center text-slate-400 px-4">
                                No past matches yet.
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                            {past.map((m) => (
                                <div key={m._key} className="relative">
                                    <div className="absolute -top-2 -left-2 z-10">
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-800 border border-slate-600 text-slate-200">
                      PAST
                    </span>
                                    </div>

                                    <div className="opacity-85 hover:opacity-100 transition-opacity">
                                        <MatchCard
                                            match={{ ...m, _pending: !!pending[m.id] }}
                                            currentUserId={effectiveUserId}
                                            isJoined={(x) => isJoined(x)}
                                            {...(!isGuest && {
                                                onEdited: upsertMatchIntoList,
                                                locations,
                                                onAddLocation: async (name) => {
                                                    await api.createLocation(name);
                                                    await fetchLocations();
                                                }
                                            })}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>

            {/* small css helpers for inputs */}
            <style jsx>{`
                .input {
                    border-radius: 0.75rem;
                    background: rgba(2,6,23,0.7);
                    border: 1px solid rgb(51 65 85);
                    padding: 0.5rem 0.75rem;
                    color: #e5e7eb;
                    outline: none;
                    width: 100%;
                }
                .input:focus {
                    box-shadow: 0 0 0 2px rgba(250,204,21,0.35);
                    border-color: rgb(148 163 184);
                }
            `}</style>
        </div>
    );
}
