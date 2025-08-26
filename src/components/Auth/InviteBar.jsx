import React from "react";

export default function InviteBar() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const copy = async () => {
        try { await navigator.clipboard.writeText(url); alert("Link copied!"); }
        catch { alert("Copy failed"); }
    };

    return (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/60 p-3">
            <div className="text-xs text-slate-300 truncate">Invite link</div>
            <div className="flex-1 truncate text-slate-100 text-xs sm:text-sm">{url}</div>
            <button
                onClick={copy}
                className="shrink-0 rounded-lg bg-slate-800 border border-slate-700 px-3 py-1.5 text-slate-100 hover:bg-slate-700"
            >
                Copy
            </button>
        </div>
    );
}
