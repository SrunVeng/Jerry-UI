import React, { useMemo, useState } from "react";

/**
 * Props:
 *  - match: {
 *      id, title, date, time, location, locationUrl, maxPlayers,
 *      createdBy,
 *      players: string[] | { id: string, name: string, source?: "telegram"|"guest", status?: "CONFIRMED"|"WAITLIST" }[],
 *      notes?: string
 *    }
 *  - currentUserId: string                   // from session (telegram user id or guest uuid)
 *  - currentUserSource: "telegram" | "guest" // identify permission
 *  - isJoined(match): boolean
 *  - onJoin(matchId)
 *  - onLeave(matchId)
 *  - onDelete(matchId)
 *  - onShare(match)
 *  - onKick(matchId, playerId)               // removal handler
 */
export default function MatchCard({
                                      match,
                                      currentUserId,
                                      currentUserSource,
                                      isJoined,
                                      onJoin,
                                      onLeave,
                                      onDelete,
                                      onShare,
                                      onKick,
                                  }) {
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    const [kickTarget, setKickTarget] = useState(null); // { id, name }

    // Normalize players to objects
    const players = useMemo(() => {
        if (!Array.isArray(match.players) || match.players.length === 0) return [];
        const first = match.players[0];
        if (typeof first === "string") {
            return match.players.map((name, i) => ({
                id: `tmp-${i + 1}`, // fallback id for legacy arrays; backend should send real ids
                name: String(name),
                source: undefined,
                status: undefined,
            }));
        }
        return match.players;
    }, [match.players]);

    const joined = isJoined(match);
    const count = players.length;
    const cap = Math.max(2, Number(match.maxPlayers) || 12);
    const percent = Math.min(100, Math.round((count / cap) * 100));

    // PERMISSION: Telegram users can remove anyone; guests cannot
    const canCurrentUserKick = currentUserSource === "telegram";

    return (
        <div className="rounded-2xl border border-slate-700 bg-gradient-to-b from-slate-800/80 via-slate-800/70 to-slate-900 shadow-xl backdrop-blur-md overflow-hidden">
            {/* Top strip */}
            <div className="h-1.5 w-full bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-500" />

            <div className="p-5 md:p-6">
                {/* Title & actions */}
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h3 className="text-lg md:text-xl font-bold text-white truncate">
                            {match.title || "Jerry FC Match"}
                        </h3>

                        {/* Date / Time / Location */}
                        <div className="mt-1 text-sm text-slate-100 flex flex-wrap items-center gap-x-4 gap-y-1">
                            {/* Calendar */}
                            <span className="inline-flex items-center gap-1">
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-white" fill="currentColor">
                  <path d="M7 2a1 1 0 0 1 1 1v1h8V3a1 1 0 1 1 2 0v1h1a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1V3a1 1 0 0 1 1-1zm12 9H5v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8zM6 7h12V6H6v1z" />
                </svg>
                <span>{match.date}</span>
              </span>

                            {/* Time */}
                            <span className="inline-flex items-center gap-1">
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-white" fill="currentColor">
                  <path d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm1 10V7a1 1 0 1 0-2 0v6a1 1 0 0 0 .293.707l3 3a1 1 0 1 0 1.414-1.414L13 12z" />
                </svg>
                <span>{match.time}</span>
              </span>

                            {/* Location */}
                            <span className="inline-flex items-center gap-1 text-slate-300">
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-white" fill="currentColor">
                  <path d="M12 2C8.14 2 5 5.14 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.86-3.14-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" />
                </svg>
                <span className="truncate max-w-[18rem]">{match.location}</span>
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

                    {/* Small actions */}
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={() => onShare && onShare(match)}
                            className="rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2 text-slate-100 hover:bg-slate-800 active:scale-[.98] transition"
                            title="Copy join link"
                        >
                            Share
                        </button>
                        <button
                            onClick={() => setConfirmDeleteOpen(true)}
                            className="rounded-xl border border-red-700/40 bg-red-900/30 px-3 py-2 text-red-200 hover:bg-red-900/40 active:scale-[.98] transition"
                            title="Delete match"
                        >
                            Delete
                        </button>
                    </div>
                </div>

                {/* Capacity bar */}
                <div className="mt-4">
                    <div className="flex justify-between text-xs text-slate-300">
                        <span>Players</span>
                        <span>{count} / {cap}</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-slate-700 overflow-hidden">
                        <div className="h-full bg-yellow-400" style={{ width: `${percent}%` }} />
                    </div>
                </div>

                {/* Players list (Guests highlighted, Waitlist badge, TG can kick) */}
                <div className="mt-3 flex flex-wrap gap-2">
                    {players.length === 0 ? (
                        <span className="text-sm text-slate-400">No one joined yet.</span>
                    ) : (
                        players.map((pl, idx) => {
                            const inLimit = idx + 1 <= cap;
                            const canKick = canCurrentUserKick && typeof onKick === "function";
                            const isGuest = pl.source === "guest";
                            const isYou =
                                !!currentUserId && (pl.id === currentUserId);

                            // derive waitlist if index overflow OR status says WAITLIST
                            const isWaitlist = !inLimit || pl.status === "WAITLIST";

                            return (
                                <span
                                    key={`${pl.id}-${idx}`}
                                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${
                                        isGuest
                                            ? "bg-amber-900/20 border-amber-600 text-amber-100"
                                            : "bg-slate-900/70 border-slate-700 text-slate-100"
                                    }`}
                                    title={pl.name}
                                >
                  {/* number bubble with conditional color */}
                                    <span
                                        className={`h-5 w-5 grid place-items-center rounded-full text-slate-900 text-[10px] font-extrabold ${
                                            inLimit ? "bg-green-400" : "bg-yellow-400"
                                        }`}
                                    >
                    {idx + 1}
                  </span>

                  <span
                      className={`truncate max-w-[9rem] ${isYou ? "font-semibold text-white" : ""}`}
                  >
                    {pl.name}{isYou ? " (you)" : ""}
                  </span>

                                    {/* source badge */}
                                    {pl.source && (
                                        <span
                                            className={`text-[10px] px-1.5 py-0.5 rounded-full border ${
                                                pl.source === "telegram"
                                                    ? "bg-sky-900/40 border-sky-600 text-sky-300"
                                                    : "bg-amber-800/40 border-amber-600 text-amber-100"
                                            }`}
                                        >
                      {pl.source === "telegram" ? "TG" : "Guest"}
                    </span>
                                    )}

                                    {/* waitlist badge */}
                                    {isWaitlist && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded-full border bg-slate-800/60 border-slate-600 text-slate-200">
                      Waitlist
                    </span>
                                    )}

                                    {/* Telegram users can remove anyone; guests see no remove */}
                                    {canKick && (
                                        <button
                                            onClick={() => setKickTarget({ id: pl.id, name: pl.name })}
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
                            onClick={() => onJoin && onJoin(match.id)}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-yellow-400 text-slate-900 px-4 py-2.5 font-semibold hover:bg-yellow-300 active:scale-[.99] shadow-md shadow-yellow-500/10 transition"
                            title="Join"
                        >
                            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                                <path d="M11 11V5a1 1 0 1 1 2 0v6h6a1 1 0 1 1 0 2h-6v6a1 1 0 1 1-2 0v-6H5a1 1 0 1 1 0-2h6z" />
                            </svg>
                            Join
                        </button>
                    ) : (
                        <button
                            onClick={() => onLeave && onLeave(match.id)}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-yellow-400/60 bg-slate-900/60 text-yellow-300 px-4 py-2.5 font-semibold hover:bg-slate-800 active:scale-[.99] transition"
                            title="Leave"
                        >
                            Leave
                        </button>
                    )}

                    <span className="text-xs text-slate-400">
            Telegram users can remove anyone. Guests can’t remove players.
          </span>
                </div>
            </div>

            {/* Delete confirmation modal */}
            {confirmDeleteOpen && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50">
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
                                onClick={() => {
                                    onDelete && onDelete(match.id);
                                    setConfirmDeleteOpen(false);
                                }}
                                className="px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-500 transition"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Kick confirmation modal */}
            {kickTarget && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50">
                    <div className="bg-slate-800 border border-slate-600 rounded-2xl shadow-xl p-6 w-[90%] max-w-sm">
                        <h4 className="text-lg font-semibold text-white">Remove player?</h4>
                        <p className="text-sm text-slate-300 mt-1">
                            {kickTarget.name} will be removed from this match.
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
                                    try {
                                        await onKick?.(match.id, kickTarget.id);
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
                </div>
            )}
        </div>
    );
}
