"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import MatchForm from "../../components/MatchForm.jsx";
import MatchCard from "../../components/MatchCard.jsx";
import FootballLoader from "../../components/FootballLoader.jsx";
import { api } from "../../api/real.js";

/* ---------- helpers ---------- */
const randKey = () => Math.random().toString(36).slice(2);

function prettyError(e, fallback = "Something went wrong") {
    if (!e) return fallback;
    if (typeof e === "string") return e;
    if (e.message) return e.message;
    try { return JSON.stringify(e); } catch { return fallback; }
}

// Coerce server item -> UI model (never invent ids for API calls)
function coerceMatch(serverItem) {
    if (!serverItem || typeof serverItem !== "object" || Array.isArray(serverItem)) return null;

    const rawId = serverItem.id ?? serverItem.matchId ?? null;
    const id = rawId != null && /^\d+$/.test(String(rawId)) ? String(rawId) : null;

    const key = serverItem._key || id || randKey();

    const title = serverItem.title ?? serverItem.name ?? serverItem.opponentName ?? "Jerry FC Match";
    const date = serverItem.date ?? serverItem.matchDate ?? "";
    const time = serverItem.time ?? serverItem.kickoffTime ?? "";
    const location = serverItem.location ?? serverItem.venue ?? "";
    const locationUrl = serverItem.locationUrl ?? serverItem.mapUrl ?? "";
    const maxPlayers = Number(serverItem.maxPlayers ?? serverItem.numberPlayer ?? serverItem.capacity) || 12;

    let players = serverItem.players ?? serverItem.attendees ?? [];
    if (!Array.isArray(players)) players = [];
    players = players.map((p, i) => {
        const u = p && typeof p === "object" ? (p.user || {}) : {};
        const userId = u.id ?? p?.userId ?? p?.user_id ?? p?.id;
        const display =
            u.displayName ?? u.fullName ?? u.username ?? u.firstName ??
            p?.name ?? p?.username ?? p?.displayName ?? "Unknown";
        const source = u.source ?? p?.source ?? p?.provider;
        return { id: userId ?? `tmp-${i + 1}`, name: display, source, status: p?.status };
    });

    const notes = serverItem.notes ?? serverItem.description ?? serverItem.remark ?? "";

    return {
        _key: key,         // React key only
        id,                // numeric string if from server; otherwise null
        ephemeral: !id,    // true => not persisted yet; block join/share
        title, date, time, location, locationUrl, maxPlayers, players, notes,
        createdBy: serverItem.createdBy ?? null,
    };
}

export default function Page() {
    // --- session/user ---
    const [me, setMe] = useState(null);
    const [authed, setAuthed] = useState(false);
    const currentUserId = useMemo(() => (me?.id ? String(me.id) : ""), [me]);
    const currentUserSource = me?.source === "telegram" ? "telegram" : "guest";
    const displayName = me?.displayName || me?.username || "";

    // --- matches & ui ---
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [pending, setPending] = useState({}); // { [matchId]: true } while join/create in-flight

    const [form, setForm] = useState({
        title: "Jerry FC Match",
        date: new Date().toISOString().slice(0, 10),
        time: "18:00",
        location: "Local Stadium",
        locationUrl: "",
        maxPlayers: 12,
        notes: "Bring water and wear turf shoes.",
    });

    const [locations, setLocations] = useState(["Local Stadium", "Community Field", "School Ground"]);

    // Load current user + matches
    const fetchMatches = useCallback(async () => {
        setLoading(true);
        setLoadError("");
        try {
            setAuthed(api.isAuthenticated());
            const [meRes, res] = await Promise.all([api.me().catch(() => null), api.getMatchAll()]);
            setMe(meRes || null);
            const raw = Array.isArray(res) ? res : res?.data ?? [];
            const mapped = raw.map(coerceMatch).filter(Boolean);
            setMatches(mapped);
        } catch (e) {
            setLoadError(prettyError(e, "Failed to load matches"));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchMatches(); }, [fetchMatches]);

    // Magic join link: only attempt if numeric (?match=<id> or ?mid=<id>)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const matchId = params.get("match") || params.get("mid");
        if (!matchId || !/^\d+$/.test(matchId)) return; // numeric only

        (async () => {
            try {
                setPending((p) => ({ ...p, [matchId]: true }));
                const updated = await api.join(matchId);
                if (!updated) { await fetchMatches(); return; }
                const coerced = coerceMatch(updated?.data ?? updated);
                if (!coerced) { await fetchMatches(); return; }

                setMatches((prev) => {
                    const idx = prev.findIndex((m) => String(m.id) === String(coerced.id));
                    if (idx === -1) return prev;
                    const next = prev.slice();
                    next[idx] = coerced;
                    return next;
                });
            } catch {
                // ignore deep-link errors for smoother UX
            } finally {
                setPending((p) => { const n = { ...p }; delete n[matchId]; return n; });
            }
        })();
    }, [fetchMatches]);

    /* ---------- helpers ---------- */
    const isJoined = useCallback(
        (m) => {
            if (!m || !Array.isArray(m.players)) return false;
            if (currentUserId) {
                return m.players.some((p) => String(p.id) === String(currentUserId));
            }
            const you = (displayName || "").toLowerCase();
            return you && m.players.some((p) => (p.name || "").toLowerCase() === you);
        },
        [currentUserId, displayName]
    );

    function addLocation(newLoc) {
        if (newLoc && !locations.includes(newLoc)) {
            setLocations((prev) => [...prev, newLoc]);
        }
    }

    // Create match using backend; if backend returns no body (non-JSON), refetch
    async function createMatch() {
        try {
            setPending((p) => ({ ...p, __create__: true }));
            const created = await api.createMatch({
                title: (form.title || "").trim() || "Jerry FC Match",
                date: form.date,
                time: form.time,
                location: (form.location || "").trim(),
                maxPlayers: Number(form.maxPlayers) || 12,
                notes: (form.notes || "").trim(),
            });

            if (!created) { await fetchMatches(); return; }
            const coerced = coerceMatch(created?.data ?? created);
            if (!coerced) { await fetchMatches(); return; }

            setMatches((prev) => [coerced, ...prev]);
        } catch (e) {
            alert(prettyError(e, "Failed to create match"));
        } finally {
            setPending((p) => { const n = { ...p }; delete n.__create__; return n; });
        }
    }

    // Join only if we have a numeric server id; otherwise block
    async function handleJoin(matchId) {
        if (!matchId || !/^\d+$/.test(String(matchId))) {
            alert("This match has no server id yet. Create/save it first.");
            return;
        }
        try {
            setPending((p) => ({ ...p, [matchId]: true }));
            const updated = await api.join(matchId);

            if (!updated) { await fetchMatches(); return; }

            const coerced = coerceMatch(updated?.data ?? updated);
            if (!coerced) { await fetchMatches(); return; }

            setMatches((prev) => {
                const idx = prev.findIndex((m) => String(m.id) === String(matchId));
                if (idx === -1) return prev;
                const next = prev.slice();
                next[idx] = coerced;
                return next;
            });
        } catch (e) {
            alert(prettyError(e, "Failed to join match"));
        } finally {
            setPending((p) => { const n = { ...p }; delete n[matchId]; return n; });
        }
    }

    async function handleLogout() {
        try { await api.logout(); } catch {}
    }

    /* ---------- UI ---------- */
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
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-xl font-bold text-yellow-400">⚽ Jerry FC Matches</h1>

                    {/* Always show Logout button */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={fetchMatches}
                            className="rounded-lg border border-slate-700 bg-slate-900/60 text-slate-200 hover:bg-slate-800 px-3 py-1.5 text-sm"
                        >
                            Refresh
                        </button>
                        <button
                            onClick={handleLogout}
                            className="rounded-lg bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 text-sm font-semibold"
                            title={authed ? "Logout" : "Clear session / go to login"}
                        >
                            Logout
                        </button>
                    </div>
                </div>

                {!!loadError && (
                    <div className="rounded-2xl border border-red-700/40 bg-red-900/30 p-4 text-red-100 mb-6">
                        {loadError}
                    </div>
                )}

                <div className="mt-8 grid grid-cols-1 gap-6 md:gap-8 md:grid-cols-3">
                    {/* Create Match */}
                    <div className="md:col-span-1 w-full max-w-full">
                        <MatchForm
                            form={form}
                            setForm={setForm}
                            locations={locations}
                            addLocation={addLocation}
                            onCreate={createMatch}
                        />
                    </div>

                    {/* Match List */}
                    <div className="md:col-span-2 space-y-6 w-full max-w-full">
                        {matches.length === 0 ? (
                            <div className="rounded-2xl border border-slate-700 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 shadow-lg">
                                <div className="py-10 sm:py-12 text-center text-base sm:text-lg text-slate-300 px-4 break-words">
                                    No matches yet — create one to get started.
                                </div>
                            </div>
                        ) : (
                            matches.map((m) => (
                                <div key={m._key} className="w-full max-w-full">
                                    <MatchCard
                                        match={{ ...m, _pending: !!pending[m.id] }}
                                        currentUserId={currentUserId}
                                        currentUserSource={currentUserSource}
                                        isJoined={isJoined}
                                        onJoin={(idFromCard) => {
                                            const id = idFromCard || m.id;
                                            if (!m.ephemeral && !pending[id]) handleJoin(id);
                                            else if (m.ephemeral) alert("Save the match first");
                                        }}
                                        onLeave={() => alert("Implement leave() on backend and hook here")}
                                        onDelete={() => alert("Implement delete() on backend and hook here")}
                                        onShare={() => {
                                            if (!m.id || !/^\d+$/.test(String(m.id))) {
                                                alert("Save the match first to get a shareable link.");
                                                return;
                                            }
                                            const url = new URL(window.location.href);
                                            url.searchParams.set("match", m.id); // numeric id only
                                            if (displayName) url.searchParams.set("join", displayName);
                                            navigator.clipboard?.writeText(url.toString());
                                            alert("Sharable join link copied! Paste it in Telegram.");
                                        }}
                                        onKick={() => alert("Implement kick() on backend and hook here")}
                                    />
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
