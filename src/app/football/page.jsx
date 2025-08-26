"use client";

import React, { useEffect, useState } from "react";
import MatchForm from "../../components/MatchForm.jsx";
import MatchCard from "../../components/MatchCard.jsx";
import { uid } from "../../lib/match";
// IMPORTANT: adjust this import to your real path:
import { api } from "../../api/real.js";

function coerceMatch(serverItem) {
    // Try to adapt flexible backend shapes into your UI model
    if (!serverItem) return null;

    // Common variants (adjust as needed to your backend keys)
    const id = serverItem.id ?? serverItem.matchId ?? serverItem.uuid ?? uid();
    const title = serverItem.title ?? serverItem.name ?? "Jerry FC Match";
    const date = serverItem.date ?? serverItem.matchDate ?? ""; // ISO yyyy-mm-dd preferred
    const time = serverItem.time ?? serverItem.kickoffTime ?? ""; // "HH:mm"
    const location = serverItem.location ?? serverItem.venue ?? "";
    const locationUrl = serverItem.locationUrl ?? serverItem.mapUrl ?? "";
    const maxPlayers =
        Number(
            serverItem.maxPlayers ??
            serverItem.numberPlayer ??
            serverItem.capacity
        ) || 12;

    // Players can be string[], or {id,name,source,status}[]
    let players = serverItem.players ?? serverItem.attendees ?? [];
    if (!Array.isArray(players)) players = [];
    // let MatchCard normalize, but ensure basic structure where possible
    players = players.map((p, i) =>
        typeof p === "string"
            ? { id: `tmp-${i + 1}`, name: p }
            : {
                id: p.id ?? p.userId ?? `tmp-${i + 1}`,
                name: p.name ?? p.username ?? p.displayName ?? "Unknown",
                source: p.source ?? p.provider, // "telegram" | "guest"
                status: p.status, // "CONFIRMED" | "WAITLIST"
            }
    );

    const notes =
        serverItem.notes ??
        serverItem.description ??
        serverItem.remark ??
        "";

    return {
        id,
        title,
        date,
        time,
        location,
        locationUrl,
        maxPlayers,
        players,
        notes,
        createdBy: serverItem.createdBy ?? null,
    };
}

export default function Page() {
    const [myName, setMyName] = useState("");
    const [currentUserId] = useState(""); // for isJoined by id, if you have it
    const [currentUserSource] = useState("guest"); // "telegram" | "guest"

    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");

    const [form, setForm] = useState({
        title: "Jerry FC Match",
        date: new Date().toISOString().slice(0, 10),
        time: "18:00",
        location: "Local Stadium",
        locationUrl: "",
        maxPlayers: 12,
        notes: "Bring water and wear turf shoes.",
    });

    const [locations, setLocations] = useState([
        "Local Stadium",
        "Community Field",
        "School Ground",
    ]);

    // --- session/user (replace with api.me if you have it) ---
    useEffect(() => {
        let pseudo = "Player" + Math.floor(Math.random() * 1000);
        setMyName(pseudo);
        // If you have a real identity, load it:
        // api.me().then(u => {
        //   setCurrentUserId(u?.id || "");
        //   setCurrentUserSource(u?.source === "TELEGRAM" ? "telegram" : "guest");
        //   setMyName(u?.displayName || u?.username || pseudo);
        // }).catch(() => {});
    }, []);

    // --- load from backend ---
    async function fetchMatches() {
        setLoading(true);
        setLoadError("");
        try {
            const res = await api.getMatchAll();
            // backend may return array OR { data: [] }
            const raw = Array.isArray(res) ? res : (res?.data ?? []);
            const mapped = raw
                .map(coerceMatch)
                .filter(Boolean);
            setMatches(mapped);
        } catch (e) {
            setLoadError(e?.message || "Failed to load matches");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchMatches();
        // support magic join link: ?match=ID&join=Name
        const params = new URLSearchParams(window.location.search);
        const joinName = params.get("join");
        const matchId = params.get("match");
        if (joinName && matchId) {
            handleJoin(matchId, joinName); // local optimistic only (see TODOs below)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // --- helpers ---
    const isJoined = (m) => {
        if (!m || !Array.isArray(m.players)) return false;
        // If you have real userId, compare ids; otherwise fallback to name
        if (currentUserId) {
            return m.players.some((p) => p.id === currentUserId);
        }
        const you = (myName || "").toLowerCase();
        return you && m.players.some((p) => (p.name || "").toLowerCase() === you);
    };

    function addLocation(newLoc) {
        if (newLoc && !locations.includes(newLoc)) {
            setLocations((prev) => [...prev, newLoc]);
        }
    }

    // --- actions (local optimistic now; add real API calls later) ---
    async function createMatch() {
        // TODO: call your real create endpoint here:
        // const created = await api.createMatch({...form});
        // const mapped = coerceMatch(created?.data ?? created);
        // setMatches(prev => [...prev, mapped]);

        // Temporary local optimistic create:
        const m = {
            id: uid(),
            title: (form.title || "").trim() || "Jerry FC Match",
            date: form.date,
            time: form.time,
            location: (form.location || "").trim(),
            locationUrl: (form.locationUrl || "").trim(),
            maxPlayers: Math.max(2, Number(form.maxPlayers) || 12),
            notes: (form.notes || "").trim(),
            players: [],
            createdAt: Date.now(),
        };
        setMatches((prev) => [m, ...prev]);
    }

    async function deleteMatch(id) {
        // TODO: await api.deleteMatch(id);
        setMatches((prev) => prev.filter((m) => m.id !== id));
    }

    async function handleJoin(matchId, name) {
        // TODO (real): await api.join(matchId);
        const cleanName = (name ?? myName).trim();
        if (!cleanName) return;

        setMatches((prev) =>
            prev.map((m) => {
                if (m.id !== matchId) return m;
                const exists = m.players.some(
                    (p) => (p.name || "").toLowerCase() === cleanName.toLowerCase()
                );
                if (exists) return m;
                return {
                    ...m,
                    players: [...m.players, { id: `tmp-${Date.now()}`, name: cleanName, source: currentUserSource }],
                };
            })
        );
    }

    async function handleLeave(matchId) {
        // TODO (real): await api.leave(matchId);
        const cleanName = (myName || "").trim();
        if (!cleanName) return;

        setMatches((prev) =>
            prev.map((m) =>
                m.id === matchId
                    ? {
                        ...m,
                        players: m.players.filter(
                            (p) => (p.name || "").toLowerCase() !== cleanName.toLowerCase()
                        ),
                    }
                    : m
            )
        );
    }

    function shareJoinLink(m) {
        try {
            // If you want to use backend sharable link logic:
            // const link = api.shareUrl(m.id);
            const url = new URL(window.location.href);
            url.searchParams.set("match", m.id);
            url.searchParams.set("join", myName || "YourName");
            const link = url.toString();

            if (navigator.clipboard?.writeText) {
                navigator.clipboard.writeText(link);
                alert("Sharable join link copied! Paste it in Telegram.");
            } else {
                const ta = document.createElement("textarea");
                ta.value = link;
                document.body.appendChild(ta);
                ta.select();
                document.execCommand("copy");
                document.body.removeChild(ta);
                alert("Sharable join link copied! Paste it in Telegram.");
            }
        } catch {
            /* no-op */
        }
    }

    // --- logout uses API + redirects (your client already handles redirect on logout) ---
    async function handleLogout() {
        try {
            await api.logout();
        } catch {
            // ignore network errors; local clear will still happen in api.logout
        }
    }

    // UI
    return (
        <div className="min-h-screen w-full overflow-x-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-900">
            <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8 py-6 md:py-10">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-xl font-bold text-yellow-400">⚽ Jerry FC Matches</h1>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={fetchMatches}
                            className="rounded-lg border border-slate-700 bg-slate-900/60 text-slate-200 hover:bg-slate-800 px-3 py-1.5 text-sm"
                        >
                            Refresh
                        </button>
                        {myName && (
                            <button
                                onClick={handleLogout}
                                className="rounded-lg bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 text-sm font-semibold"
                            >
                                Logout
                            </button>
                        )}
                    </div>
                </div>

                {/* loading / error */}
                {loading && (
                    <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-6 text-slate-300">
                        Loading matches…
                    </div>
                )}
                {!!loadError && !loading && (
                    <div className="rounded-2xl border border-red-700/40 bg-red-900/30 p-4 text-red-100">
                        {loadError}
                    </div>
                )}

                <div className="mt-8 grid grid-cols-1 gap-6 md:gap-8 md:grid-cols-3">
                    {/* Create Match (still local for now) */}
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
                        {!loading && matches.length === 0 ? (
                            <div className="rounded-2xl border border-slate-700 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 shadow-lg">
                                <div className="py-10 sm:py-12 text-center text-base sm:text-lg text-slate-300 px-4 break-words">
                                    No matches yet — create one to get started.
                                </div>
                            </div>
                        ) : (
                            matches.map((m) => (
                                <div key={m.id} className="w-full max-w-full">
                                    <MatchCard
                                        match={m}
                                        currentUserId={currentUserId}
                                        currentUserSource={currentUserSource}
                                        isJoined={isJoined}
                                        onJoin={handleJoin}
                                        onLeave={handleLeave}
                                        onDelete={deleteMatch}
                                        onShare={shareJoinLink}
                                        // Wire this after you add backend kick endpoint:
                                        onKick={async (matchId, playerId) => {
                                            // TODO: await api.kick(matchId, playerId);
                                            // after success, refresh or optimistic update:
                                            setMatches((prev) =>
                                                prev.map((x) =>
                                                    x.id !== matchId
                                                        ? x
                                                        : { ...x, players: x.players.filter((p) => p.id !== playerId) }
                                                )
                                            );
                                        }}
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
