import React, { useMemo } from "react";

export default function MatchCard({
                                      match,
                                      isJoined,
                                      onJoin,
                                      onLeave,
                                      onDelete,
                                      onShare,
                                  }) {
    const joined = isJoined(match);
    const count = match.players.length;
    const cap = Math.max(2, Number(match.maxPlayers) || 12);
    const percent = Math.min(100, Math.round((count / cap) * 100));

    const dateTime = useMemo(() => {
        try {
            return new Date(`${match.date}T${match.time}:00`);
        } catch {
            return null;
        }
    }, [match.date, match.time]);

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

                        {/* Date & Time row with WHITE icons */}
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

                            {/* Location (text stays readable; link optional) */}
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

                    {/* small actions */}
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={() => onShare(match)}
                            className="rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2 text-slate-100 hover:bg-slate-800 active:scale-[.98] transition"
                            title="Copy join link"
                        >
                            Share
                        </button>
                        <button
                            onClick={() => onDelete(match.id)}
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
                        <span>
              {count} / {cap}
            </span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-slate-700 overflow-hidden">
                        <div className="h-full bg-yellow-400" style={{ width: `${percent}%` }} />
                    </div>
                </div>

                {/* Numbered players list */}
                <div className="mt-3 flex flex-wrap gap-2">
                    {match.players.length === 0 ? (
                        <span className="text-sm text-slate-400">No one joined yet.</span>
                    ) : (
                        match.players.map((p, idx) => (
                            <span
                                key={p}
                                className="inline-flex items-center gap-2 rounded-full bg-slate-900/70 border border-slate-700 text-slate-100 px-3 py-1 text-xs"
                                title={p}
                            >
                {/* number bubble */}
                                <span className="h-5 w-5 grid place-items-center rounded-full bg-yellow-400 text-slate-900 text-[10px] font-extrabold">
                  {idx + 1}
                </span>
                <span className="truncate max-w-[9rem]">{p}</span>
              </span>
                        ))
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
                            onClick={() => onJoin(match.id)}
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
                            onClick={() => onLeave(match.id)}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-yellow-400/60 bg-slate-900/60 text-yellow-300 px-4 py-2.5 font-semibold hover:bg-slate-800 active:scale-[.99] transition"
                            title="Leave"
                        >
                            Leave
                        </button>
                    )}

                    <span className="text-xs text-slate-400">
            Magic link copies your name automatically.
          </span>
                </div>
            </div>
        </div>
    );
}
