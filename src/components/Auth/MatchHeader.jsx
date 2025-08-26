import React, { useEffect, useMemo, useState } from "react";

export default function MatchHeader({ me, match }) {
    // countdown
    const [now, setNow] = useState(Date.now());
    useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);

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

    const cap = Math.max(2, Number(match?.maxPlayers) || 12);
    const count = match?.players?.length || 0;
    const percent = Math.min(100, Math.round((count / cap) * 100));

    return (
        <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
                <h3 className="text-lg md:text-xl font-bold text-white truncate">
                    {match?.title || "Match"}
                </h3>

                <div className="mt-1 text-sm text-slate-100 flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="inline-flex items-center gap-1">
            <span>{match?.date}</span>
          </span>
                    <span className="inline-flex items-center gap-1">
            <span>{match?.time}</span>
          </span>
                    <span className="inline-flex items-center gap-1 text-slate-300">
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
                        <div className="text-[10px] text-slate-500">
                            (Your time zone: {Intl.DateTimeFormat().resolvedOptions().timeZone})
                        </div>
                    </div>
                )}
            </div>

            {/* capacity bar */}
            <div className="absolute left-0 right-0 -bottom-3 px-5 md:px-6">
                <div className="mt-6">
                    <div className="flex justify-between text-xs text-slate-300">
                        <span>Players</span>
                        <span>{count} / {cap}</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-slate-700 overflow-hidden">
                        <div className="h-full bg-yellow-400" style={{ width: `${percent}%` }} />
                    </div>
                </div>
            </div>
        </div>
    );
}
