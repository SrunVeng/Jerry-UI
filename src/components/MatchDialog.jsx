"use client";

import React, { useEffect, useState, useMemo } from "react";
import { fullDate } from "../lib/match.js";

export default function MatchDialog({ open, onClose, match }) {
    // Copy feedback
    const [copied, setCopied] = useState(false);

    // Build share URL consistent with JoinPage (/join?mid=...)
    const shareUrl = useMemo(() => {
        if (typeof window === "undefined" || !match?.id) return "";
        return `${window.location.origin}/join?mid=${match.id}`;
    }, [match?.id]);

    // Telegram share deep-link
    const telegramShareUrl = useMemo(() => {
        const text = `Join this match: ${match?.title || "Match"}`;
        return `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(
            text
        )}`;
    }, [shareUrl, match?.title]);

    // One effect: handle Esc + body scroll lock when open
    useEffect(() => {
        if (!open) return;

        function onEsc(e) {
            if (e.key === "Escape") onClose?.();
        }

        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", onEsc);

        return () => {
            window.removeEventListener("keydown", onEsc);
            document.body.style.overflow = prevOverflow;
        };
    }, [open, onClose]);

    if (!open) return null;

    async function handleCopy() {
        if (!shareUrl) return;
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 1400);
        } catch {
            // noop
        }
    }

    async function handleNativeShare() {
        if (!shareUrl) return;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: match?.title || "Match",
                    text: "Join this match",
                    url: shareUrl,
                });
            } catch {
                // user cancelled or unsupported
            }
        } else {
            handleCopy();
        }
    }

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
                    <h3 className="text-2xl font-bold text-yellow-400 truncate">{match.title}</h3>
                    <button
                        className="rounded-md bg-slate-800 px-3 py-1 text-sm hover:bg-slate-700"
                        onClick={onClose}
                    >
                        Close
                    </button>
                </div>

                <div className="mt-4 space-y-3">
                    <div className="text-slate-200">{fullDate(match.date, match.time)}</div>
                    <div className="text-slate-200 truncate">{match.location}</div>

                    {match.locationUrl ? (
                        <a
                            href={match.locationUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline text-blue-400 break-all"
                        >
                            Open in Google Maps
                        </a>
                    ) : null}

                    {match.notes ? (
                        <p className="italic text-slate-100 break-words">{match.notes}</p>
                    ) : null}

                    <div className="h-px bg-slate-700 my-4" />

                    {/* Share */}
                    <div className="space-y-2">
                        <div className="text-sm text-slate-300">Share this match</div>
                        <ShareBox
                            shareUrl={shareUrl}
                            onCopy={handleCopy}
                            onNativeShare={handleNativeShare}
                            copied={copied}
                            telegramShareUrl={telegramShareUrl}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

function ShareBox({ shareUrl, onCopy, onNativeShare, copied, telegramShareUrl }) {
    const canNativeShare = typeof navigator !== "undefined" && !!navigator.share;

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
                <input
                    readOnly
                    value={shareUrl}
                    className="flex-1 rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-white"
                />
                <button
                    onClick={onCopy}
                    className="rounded-md bg-yellow-500 px-3 py-2 font-semibold text-black hover:bg-yellow-400"
                >
                    {copied ? "Copied!" : "Copy"}
                </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <button
                    onClick={onNativeShare}
                    className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 hover:bg-slate-700"
                >
                    {canNativeShare ? "Share…" : "Share (copy)"}
                </button>

                {/* Telegram share link (works on web + app) */}
                <a
                    href={telegramShareUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md border border-sky-700 bg-sky-900/40 px-3 py-2 text-sky-100 hover:bg-sky-900/60"
                >
                    Share to Telegram
                </a>
            </div>
        </div>
    );
}
