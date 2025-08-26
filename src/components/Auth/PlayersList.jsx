import React, { useMemo } from "react";

function Badge({ kind, children }) {
    const styles =
        kind === "telegram"
            ? "bg-sky-900/40 border-sky-600 text-sky-300"
            : kind === "guest"
                ? "bg-amber-900/30 border-amber-600 text-amber-300"
                : "bg-slate-800 border-slate-600 text-slate-300";
    return <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${styles}`}>{children}</span>;
}

function PlayerChip({ p, idx, cap, isYou, canKick, onKick }) {
    const inLimit = idx + 1 <= cap;
    const isGuest = p.source === "guest";
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
}

export default function PlayersList({ me, players, filter, cap = 12, onKick }) {
    const canKick = me?.source === "telegram";
    const list = useMemo(() => {
        const q = (filter || "").trim().toLowerCase();
        const base = Array.isArray(players) ? players : [];
        return q ? base.filter(p => (p.name || "").toLowerCase().includes(q)) : base;
    }, [players, filter]);

    return (
        <div className="mt-10 flex flex-wrap gap-2">
            {!list.length ? (
                <span className="text-sm text-slate-400">No one joined yet.</span>
            ) : (
                list.map((p, idx) => (
                    <PlayerChip
                        key={`${p.id}-${idx}`}
                        p={p}
                        idx={idx}
                        cap={cap}
                        canKick={canKick}
                        onKick={onKick}
                        isYou={!!me && (p.id === me.id || p.name === me.displayName)}
                    />
                ))
            )}
        </div>
    );
}
