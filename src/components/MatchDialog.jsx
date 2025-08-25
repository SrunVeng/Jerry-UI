"use client";

import React, { useEffect } from "react";
import { fullDate } from "../lib/match.js";

export default function MatchDialog({ open, onClose, match }) {
    useEffect(() => {
        function onEsc(e) {
            if (e.key === "Escape") onClose();
        }
        if (open) window.addEventListener("keydown", onEsc);
        return () => window.removeEventListener("keydown", onEsc);
    }, [open, onClose]);

    if (!open) return null;

    // prevent body scroll when modal open
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => (document.body.style.overflow = prev);
    }, []);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <button
                className="absolute inset-0 bg-black/60"
                onClick={onClose}
                aria-label="Close dialog"
            />
            {/* Panel */}
            <div className="relative w-[94%] max-w-lg rounded-2xl bg-slate-900 border border-slate-700 p-6 text-slate-100 shadow-xl">
                <div className="flex items-start justify-between gap-6">
                    <h3 className="text-2xl font-bold text-yellow-400">{match.title}</h3>
                    <button
                        className="rounded-md bg-slate-800 px-3 py-1 text-sm hover:bg-slate-700"
                        onClick={onClose}
                    >
                        Close
                    </button>
                </div>

                <div className="mt-4 space-y-3">
                    <div className="text-slate-200">{fullDate(match.date, match.time)}</div>
                    <div className="text-slate-200">{match.location}</div>

                    {match.locationUrl ? (
                        <a
                            href={match.locationUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline text-blue-400"
                        >
                            Open in Google Maps
                        </a>
                    ) : null}

                    {match.notes ? (
                        <p className="italic text-slate-100">{match.notes}</p>
                    ) : null}

                    <div className="h-px bg-slate-700 my-4" />

                    <div className="space-y-2">
                        <div className="text-sm text-slate-300">Share this match</div>
                        <ShareBox match={match} />
                    </div>
                </div>
            </div>
        </div>
    );
}

function ShareBox({ match }) {
    const shareUrl =
        typeof window !== "undefined"
            ? `${window.location.origin}${window.location.pathname}?match=${match.id}`
            : "";

    function copy() {
        if (!shareUrl) return;
        navigator.clipboard.writeText(shareUrl);
    }

    return (
        <div className="flex items-center gap-2">
            <input
                readOnly
                value={shareUrl}
                className="flex-1 rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-white"
            />
            <button
                onClick={copy}
                className="rounded-md bg-yellow-500 px-3 py-2 font-semibold text-black hover:bg-yellow-600"
            >
                Copy
            </button>
        </div>
    );
}
