import React, { useEffect, useMemo, useState, useCallback } from "react";
import { api } from "../../api/client"; // adjust path if needed

export default function JoinPage() {
    const [me, setMe] = useState(null);          // { id, displayName, source: "telegram"|"guest" }
    const [authTried, setAuthTried] = useState(false);
    const [guestInput, setGuestInput] = useState("");
    const [toast, setToast] = useState(null);    // { type: "success"|"error", msg }

    const [match, setMatch] = useState(null);
    const [matchLoading, setMatchLoading] = useState(true);
    const [filter, setFilter] = useState("");

    const search = typeof window !== "undefined" ? window.location.search : "";
    const matchId = new URLSearchParams(search).get("mid") || "demo-123";

    // ===== Utilities =====
    const showToast = useCallback((msg, type = "success") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 2000);
    }, []);

    const copy = useCallback(async (text) => {
        try { await navigator.clipboard.writeText(text); showToast("Link copied!"); }
        catch { showToast("Copy failed", "error"); }
    }, [showToast]);

    // ===== Session check + Telegram finalize if query payload exists =====
    useEffect(() => {
        let dead = false;
        (async () => {
            try {
                // 1) If Telegram sent signed fields via query (?id=&hash=&auth_date=...)
                //    finalize with the server and establish session.
                if (api.telegramFinalizeFromLocation) {
                    try {
                        await api.telegramFinalizeFromLocation();
                    } catch (e) {
                        // Don't break the flow—just show a toast and continue to /auth/me
                        console.warn("Telegram finalize failed:", e);
                        showToast(e.message || "Telegram login failed", "error");
                    }
                }

                // 2) Fetch current session
                const user = await api.me();
                if (!dead && user) setMe(user);
            } finally {
                if (!dead) setAuthTried(true);
            }
        })();

        return () => { dead = true; };
    }, [showToast]);

    // ===== Load match =====
    const loadMatch = useCallback(async () => {
        setMatchLoading(true);
        try {
            const detail = await api.getMatch(matchId);
            setMatch(detail);
        } finally {
            setMatchLoading(false);
        }
    }, [matchId]);

    useEffect(() => { loadMatch(); }, [loadMatch]);

    // ===== Derived =====
    const isJoined = useMemo(() => {
        if (!me || !match?.players) return false;
        return match.players.some((p) => p.id === me.id || p.name === me.displayName);
    }, [me, match]);

    const cap = Math.max(2, Number(match?.maxPlayers) || 12);
    const count = match?.players?.length || 0;
    const percent = Math.min(100, Math.round((count / cap) * 100));

    const playersFiltered = useMemo(() => {
        if (!match?.players) return [];
        const q = filter.trim().toLowerCase();
        if (!q) return match.players;
        return match.players.filter(p => p.name.toLowerCase().includes(q));
    }, [match, filter]);

    // Countdown
    const [now, setNow] = useState(Date.now());
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);
    const kickoffMs = useMemo(() => {
        if (!match?.date || !match?.time) return null;
        const dt = new Date(`${match.date}T${match.time}:00`);
        const ms = dt.getTime() - now;
        return Number.isFinite(ms) ? ms : null;
    }, [match?.date, match?.time, now]);
    const countdown = useMemo(() => {
        if (kickoffMs == null) return null;
        if (kickoffMs <= 0) return "Kick-off! ⚽";
        const s = Math.floor(kickoffMs / 1000);
        const d = Math.floor(s / 86400);
        const h = Math.floor((s % 86400) / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = s % 60;
        return (d ? `${d}d ` : "") + `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
    }, [kickoffMs]);

    const IS_MOCK =
        String(import.meta.env.VITE_USE_MOCK || "").toLowerCase() === "true";

    // ===== Actions =====
    const handleTelegramLogin = () => {
        if (IS_MOCK) {
            window.location.href = "/";
            return;
        }
        // Redirect to backend login, include current page as return target
        window.location.href = api.telegramLoginUrl(matchId);
    };

    function InvitePill({ copy }) {
        const url = typeof window !== "undefined" ? window.location.href : "";
        return (
            <div className="fixed bottom-4 right-4 z-40">
                <button
                    onClick={() => copy(url)}
                    className="group inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs text-slate-200 shadow-lg hover:bg-slate-800 active:scale-[.99] transition"
                    title="Copy invite link"
                >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                        <path d="M10.59 13.41a1 1 0 010-1.41l3-3a1 1 0 111.41 1.41l-3 3a1 1 0 01-1.41 0z" />
                        <path d="M13.41 10.59a1 1 0 010 1.41l-3 3a1 1 0 01-1.41-1.41l3-3a1 1 0 011.41 0z" />
                    </svg>
                    <span className="hidden sm:inline">Copy invite</span>
                    <span className="sm:hidden">Invite</span>
                </button>
            </div>
        );
    }

    const handleLogout = async () => {
        try {
            await api.logout?.();
            localStorage.removeItem("guestIdentity");
            setMe(null);
            showToast("Signed out");
        } catch (e) {
            showToast(e.message || "Sign out failed", "error");
        }
    };

    const handleJoinAsGuest = async () => {
        const name = guestInput.trim();
        if (!name) return;
        const g = { id: crypto.randomUUID(), displayName: name, source: "guest" };
        localStorage.setItem("guestIdentity", JSON.stringify(g));
        const saved = await api.guestAuth(g);
        setMe(saved);
        showToast(`Welcome, ${saved.displayName}!`);
    };

    const onJoin = async () => {
        try {
            await api.join(matchId);
            await loadMatch();
            showToast("Joined the match!");
        } catch (e) {
            showToast(e.message || "Join failed", "error");
        }
    };

    const onLeave = async () => {
        try {
            await api.leave(matchId);
            await loadMatch();
            showToast("You left the match");
        } catch (e) {
            showToast(e.message || "Leave failed", "error");
        }
    };

    const canKick = me?.source === "telegram"; // telegram users can remove anyone; guests cannot
    const onKick = async (playerId) => {
        if (!canKick) return;
        if (!confirm("Remove this player?")) return;
        try {
            await api.kick?.(matchId, playerId);
            await loadMatch();
            showToast("Player removed");
        } catch (e) {
            showToast(e.message || "Remove failed", "error");
        }
    };

    // ===== UI bits =====
    const MatchSkeleton = () => (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 animate-pulse">
            <div className="h-5 w-48 bg-slate-700 rounded mb-3" />
            <div className="h-4 w-72 bg-slate-800 rounded mb-2" />
            <div className="h-2 w-full bg-slate-800 rounded mb-4" />
            <div className="flex gap-2">
                <div className="h-7 w-24 bg-slate-800 rounded" />
                <div className="h-7 w-24 bg-slate-800 rounded" />
            </div>
        </div>
    );

    const InviteBar = () => {
        const url = typeof window !== "undefined" ? window.location.href : "";
        return (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/60 p-3">
                <div className="text-xs text-slate-300 truncate">Invite link</div>
                <div className="flex-1 truncate text-slate-100 text-xs sm:text-sm">{url}</div>
                <button
                    onClick={() => copy(url)}
                    className="shrink-0 rounded-lg bg-slate-800 border border-slate-700 px-3 py-1.5 text-slate-100 hover:bg-slate-700"
                >
                    Copy
                </button>
            </div>
        );
    };

    const TopBar = () => (
        <div className="flex items-center justify-between gap-2">
            {me ? (
                <div className="flex w-full items-center gap-2">
                    {/* Left: Connect Telegram (only for guests) */}
                    {me?.source === "guest" && (
                        <button
                            onClick={handleTelegramLogin}
                            className="rounded-lg bg-sky-500 hover:bg-sky-400 text-white font-semibold px-3 py-1.5"
                            title="Connect Telegram to receive notifications"
                        >
                            Connect Telegram
                        </button>
                    )}

                    {/* Right: Sign out */}
                    <button
                        onClick={handleLogout}
                        className="ml-auto rounded-lg bg-slate-800/80 border border-slate-700 px-3 py-1.5 text-slate-100 hover:bg-slate-700"
                        title="Sign out and switch account"
                    >
                        Sign out
                    </button>
                </div>
            ) : null}
        </div>
    );

    const Badge = ({ kind, children }) => {
        const styles = kind === "telegram"
            ? "bg-sky-900/40 border-sky-600 text-sky-300"
            : kind === "guest"
                ? "bg-amber-900/30 border-amber-600 text-amber-300"
                : "bg-slate-800 border-slate-600 text-slate-300";
        return (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${styles}`}>{children}</span>
        );
    };

    const PlayerChip = ({ p, idx }) => {
        const inLimit = idx + 1 <= cap;
        const isGuest = p.source === "guest";
        const isYou = me && (p.id === me.id || p.name === me.displayName);
        return (
            <span
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs border ${
                    isGuest
                        ? "bg-amber-900/20 border-amber-600 text-amber-100"
                        : "bg-slate-900/70 border-slate-700 text-slate-100"
                }`}
                title={p.name}
            >
        <span className={`h-5 w-5 grid place-items-center rounded-full text-slate-900 text-[10px] font-extrabold ${
            inLimit ? "bg-green-400" : "bg-yellow-400"
        }`}>
          {idx + 1}
        </span>
        <span className={`h-5 w-5 grid place-items-center rounded-full text-[10px] font-bold ${
            isGuest ? "bg-amber-700/50 text-amber-100" : "bg-slate-700 text-slate-100"
        }`}>
          {(p.name || "?").slice(0,1).toUpperCase()}
        </span>
        <span className={`truncate max-w-[9rem] ${isYou ? "font-semibold text-white" : ""}`}>
          {p.name}{isYou ? " (you)" : ""}
        </span>
                {isGuest ? <Badge kind="guest">Guest</Badge> : <Badge kind="telegram">TG</Badge>}
                {!inLimit && <Badge>Waitlist</Badge>}
                {canKick && (
                    <button
                        onClick={() => onKick(p.id)}
                        className="ml-1 rounded-full hover:bg-slate-800 p-1"
                        title="Remove player"
                    >
                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                )}
      </span>
        );
    };

    // ===== Not signed in → Auth choice =====
    if (authTried && !me) {
        return (
            <div className="min-h-screen grid place-items-center bg-slate-950 text-slate-100 px-4">
                <div className="w-full max-w-lg space-y-6">
                    <TopBar />

                    <div className="text-center">
                        <h1 className="text-3xl font-extrabold tracking-tight">
              <span className="bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent">
                Sign in to join the match
              </span>
                        </h1>
                        <p className="mt-2 text-sm text-slate-400">
                            Use Telegram for notifications, or continue as a guest.
                        </p>
                    </div>

                    {matchLoading ? <MatchSkeleton /> : null}

                    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
                        <h2 className="text-lg font-bold text-white">Join Match</h2>
                        <p className="text-sm text-slate-300 mt-1">
                            Login with Telegram to receive notifications, or join as a guest.
                        </p>

                        <div className="mt-6 grid gap-4">
                            <button
                                onClick={handleTelegramLogin}
                                className="w-full rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-semibold px-4 py-3 active:scale-[.99] transition"
                            >
                                Login with Telegram
                            </button>

                            <div className="rounded-xl border border-slate-700 p-4 bg-slate-800/60">
                                <label className="text-sm text-slate-200 font-medium">Join as Guest</label>
                                <input
                                    className="mt-2 w-full rounded-xl bg-slate-900/60 border border-slate-700 px-3 py-2 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/40"
                                    placeholder="Your name"
                                    value={guestInput}
                                    onChange={(e) => setGuestInput(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === "Enter") handleJoinAsGuest(); }}
                                />
                                <button
                                    onClick={handleJoinAsGuest}
                                    className="mt-3 w-full rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-900 font-semibold px-4 py-2.5 active:scale-[.99] transition"
                                >
                                    Continue as Guest
                                </button>
                                <p className="mt-2 text-xs text-slate-400">
                                    Guests are highlighted in the players list.
                                </p>
                            </div>
                        </div>
                    </div>

                    {!matchLoading && match ? (
                        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                            <div className="text-sm text-slate-300">
                                <div className="font-semibold text-white">{match.title}</div>
                                <div>{match.date} • {match.time}</div>
                                <div className="truncate">{match.location}</div>
                            </div>
                        </div>
                    ) : null}
                </div>

                {!matchLoading && <InvitePill copy={copy} />}

                {toast && (
                    <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl text-sm shadow-lg border
            ${toast.type === "error" ? "bg-red-900/70 text-red-100 border-red-700" : "bg-slate-800/90 text-slate-100 border-slate-700"}`}>
                        {toast.msg}
                    </div>
                )}
            </div>
        );
    }

    // ===== Signed in → Full page =====
    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-8">
            <div className="mx-auto max-w-4xl space-y-4">
                <TopBar />
                <InviteBar />

                <div className="rounded-2xl border border-slate-700 bg-gradient-to-b from-slate-800/80 via-slate-800/70 to-slate-900 shadow-xl overflow-hidden">
                    {/* Top strip */}
                    <div className="h-1.5 w-full bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-500" />

                    <div className="p-5 md:p-6">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <h3 className="text-lg md:text-xl font-bold text-white truncate">
                                    {match?.title || "Match"}
                                </h3>
                                <div className="mt-1 text-sm text-slate-100 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="inline-flex items-center gap-1">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 text-white" fill="currentColor">
                      <path d="M7 2a1 1 0 0 1 1 1v1h8V3a1 1 0 1 1 2 0v1h1a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1V3a1 1 0 0 1 1-1zm12 9H5v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8zM6 7h12V6H6v1z" />
                    </svg>
                    <span>{match?.date}</span>
                  </span>
                                    <span className="inline-flex items-center gap-1">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 text-white" fill="currentColor">
                      <path d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm1 10V7a1 1 0 1 0-2 0v6a1 1 0 0 0 .293.707l3 3a1 1 0 1 0 1.414-1.414L13 12z" />
                    </svg>
                    <span>{match?.time}</span>
                  </span>
                                    <span className="inline-flex items-center gap-1 text-slate-300">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 text-white" fill="currentColor">
                      <path d="M12 2C8.14 2 5 5.14 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.86-3.14-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" />
                    </svg>
                    <span className="truncate max-w-[18rem]">{match?.location}</span>
                                        {match?.locationUrl ? (
                                            <a
                                                href={match.locationUrl}
                                                className="ml-2 text-yellow-300 hover:text-yellow-200 underline decoration-yellow-400/60"
                                                target="_blank" rel="noreferrer"
                                            >
                                                Map
                                            </a>
                                        ) : null}
                  </span>
                                </div>
                            </div>

                            {/* Signed in as + countdown */}
                            <div className="text-right shrink-0">
                                <div className="text-xs text-slate-400">Signed in as</div>
                                <div className="text-sm font-semibold">
                                    {me?.displayName}{" "}
                                    <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full border ${
                                        me?.source === "telegram"
                                            ? "bg-sky-900/40 border-sky-600 text-sky-300"
                                            : "bg-amber-900/30 border-amber-600 text-amber-300"
                                    }`}>
                    {me?.source === "telegram" ? "Telegram" : "Guest"}
                  </span>
                                </div>
                                {countdown && (
                                    <div className="mt-2 text-xs text-slate-300">
                                        Starts in: <span className="font-mono">{countdown}</span>
                                        <div className="text-[10px] text-slate-500">(Your time zone: {Intl.DateTimeFormat().resolvedOptions().timeZone})</div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Capacity */}
                        <div className="mt-4">
                            <div className="flex justify-between text-xs text-slate-300">
                                <span>Players</span>
                                <span>{count} / {cap}</span>
                            </div>
                            <div className="mt-1 h-2 rounded-full bg-slate-700 overflow-hidden">
                                <div className="h-full bg-yellow-400" style={{ width: `${percent}%` }} />
                            </div>
                        </div>

                        {/* Controls row */}
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                            <input
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                placeholder="Search players…"
                                className="rounded-xl bg-slate-900/60 border border-slate-700 px-3 py-2 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/40"
                            />
                            <div className="flex-1" />
                            {!isJoined ? (
                                <button
                                    onClick={onJoin}
                                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-yellow-400 text-slate-900 px-4 py-2.5 font-semibold hover:bg-yellow-300 active:scale-[.99] shadow-md shadow-yellow-500/10 transition"
                                >
                                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                                        <path d="M11 11V5a1 1 0 1 1 2 0v6h6a1 1 0 1 1 0 2h-6v6a1 1 0 1 1-2 0v-6H5a1 1 0 1 1 0-2h6z" />
                                    </svg>
                                    Join
                                </button>
                            ) : (
                                <button
                                    onClick={onLeave}
                                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-yellow-400/60 bg-slate-900/60 text-yellow-300 px-4 py-2.5 font-semibold hover:bg-slate-800 active:scale-[.99] transition"
                                >
                                    Leave
                                </button>
                            )}
                        </div>

                        {/* Players */}
                        <div className="mt-3 flex flex-wrap gap-2">
                            {!match?.players?.length ? (
                                <span className="text-sm text-slate-400">No one joined yet.</span>
                            ) : (
                                playersFiltered.map((p, idx) => (
                                    <PlayerChip key={`${p.id}-${idx}`} p={p} idx={idx} />
                                ))
                            )}
                        </div>

                        {/* Notes */}
                        {match?.notes?.trim() ? (
                            <p className="mt-4 text-sm text-slate-300 break-words">{match.notes}</p>
                        ) : null}
                    </div>
                </div>
            </div>

            {/* Toast */}
            {toast && (
                <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl text-sm shadow-lg border
          ${toast.type === "error" ? "bg-red-900/70 text-red-100 border-red-700" : "bg-slate-800/90 text-slate-100 border-slate-700"}`}>
                    {toast.msg}
                </div>
            )}
        </div>
    );
}
