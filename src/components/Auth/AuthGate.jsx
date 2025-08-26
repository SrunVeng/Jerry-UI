import React, { useMemo, useState, useEffect } from "react";

/** Fallback display name resolver for mixed sources (telegram/guest) */
function getDisplayName(me) {
    if (!me) return "";
    return (
        me.displayName ||
        me.first_name ||
        me.username ||
        me.fullName ||
        me.name ||
        "User"
    );
}

function Skeleton() {
    return (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 animate-pulse w-full max-w-lg">
            <div className="h-5 w-48 bg-slate-700 rounded mb-3" />
            <div className="h-4 w-72 bg-slate-800 rounded mb-2" />
            <div className="h-2 w-full bg-slate-800 rounded mb-4" />
            <div className="flex gap-2">
                <div className="h-7 w-24 bg-slate-800 rounded" />
                <div className="h-7 w-24 bg-slate-800 rounded" />
            </div>
        </div>
    );
}

/** Small login dialog shown when user clicks "Login" */
function LoginModal({ open, loading = false, onClose, onSubmit }) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    // reset fields when opened/closed
    useEffect(() => {
        if (!open) {
            setUsername("");
            setPassword("");
        }
    }, [open]);

    useEffect(() => {
        function onKey(e) {
            if (e.key === "Escape") onClose?.();
        }
        if (open) window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    if (!open) return null;

    const canSubmit = username.trim() && password;

    const submit = (e) => {
        e?.preventDefault?.();
        if (!canSubmit || loading) return;
        onSubmit?.({ username: username.trim(), password });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* overlay */}
            <div className="absolute inset-0 bg-black/60" onClick={onClose} />
            {/* dialog */}
            <form
                onSubmit={submit}
                role="dialog"
                aria-modal="true"
                className="relative z-10 w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-xl"
            >
                <h3 className="text-lg font-bold text-white">Sign in</h3>
                <p className="mt-1 text-sm text-slate-400">
                    Use your username and password.
                </p>

                <div className="mt-4 grid gap-3">
                    <input
                        autoFocus
                        placeholder="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full rounded-xl bg-slate-900/60 border border-slate-700 px-3 py-2 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/40"
                    />
                    <input
                        placeholder="Password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full rounded-xl bg-slate-900/60 border border-slate-700 px-3 py-2 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/40"
                    />
                </div>

                <div className="mt-5 flex gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-2 text-slate-200 hover:bg-slate-800"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={!canSubmit || loading}
                        className="flex-1 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-4 py-2"
                    >
                        {loading ? "Signing in…" : "Sign in"}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default function AuthGate({
                                     me,
                                     authTried,
                                     onLogin,       // expects ({ username, password }) => Promise<void>
                                     onGuestLogin,
                                     loading,
                                     match,
                                     onLogout,
                                 }) {
    const [guestName, setGuestName] = useState("");
    const [loginOpen, setLoginOpen] = useState(false);
    const cleanGuest = guestName.trim();

    const displayName = useMemo(() => getDisplayName(me), [me]);
    const sourceLabel =
        me?.source === "telegram" ? "Telegram" : me?.source === "guest" ? "Guest" : "User";
    const sourceBadgeClass =
        me?.source === "telegram"
            ? "bg-sky-900/40 border-sky-600 text-sky-300"
            : me?.source === "guest"
                ? "bg-amber-900/30 border-amber-600 text-amber-300"
                : "bg-slate-800/60 border-slate-600 text-slate-300";

    // Early skeleton while we haven't tried auth yet
    if (!authTried) {
        return (
            <div className="min-h-[40vh] grid place-items-center">
                <Skeleton />
            </div>
        );
    }

    // Signed-in header
    if (me) {
        return (
            <div className="flex items-center justify-between">
                <div className="text-sm text-slate-300">
                    Signed in as{" "}
                    <span className="font-semibold text-white">{displayName}</span>
                    <span
                        className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full border ${sourceBadgeClass}`}
                    >
            {sourceLabel}
          </span>
                </div>
                <button
                    type="button"
                    onClick={onLogout}
                    disabled={!!loading}
                    className="rounded-lg bg-slate-800/80 border border-slate-700 px-3 py-1.5 text-slate-100 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Sign out"
                >
                    Sign out
                </button>
            </div>
        );
    }

    // Sign-in screen
    return (
        <div className="w-full max-w-lg mx-auto space-y-6">
            <div className="text-center">
                <h1 className="text-3xl font-extrabold tracking-tight">
          <span className="bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent">
            Sign in to join the match
          </span>
                </h1>
                <p className="mt-2 text-sm text-slate-400">
                    Login in as user for notifications, or continue as a guest.
                </p>
            </div>

            {loading ? <Skeleton /> : null}

            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
                <h2 className="text-lg font-bold text-white">Join Match</h2>
                <p className="text-sm text-slate-300 mt-1">
                    Login as user to experience full feature, or join as a guest.
                </p>

                <div className="mt-6 grid gap-4">
                    {/* Login button (opens modal) */}
                    <button
                        type="button"
                        onClick={() => setLoginOpen(true)}
                        disabled={!!loading}
                        className="w-full rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-semibold px-4 py-3 active:scale-[.99] transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? "Connecting…" : "Login"}
                    </button>

                    {/* Guest block */}
                    <div className="rounded-xl border border-slate-700 p-4 bg-slate-800/60">
                        <label className="text-sm text-slate-200 font-medium">Join as Guest</label>
                        <input
                            className="mt-2 w-full rounded-xl bg-slate-900/60 border border-slate-700 px-3 py-2 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/40"
                            placeholder="Your name"
                            value={guestName}
                            onChange={(e) => setGuestName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && cleanGuest && !loading) onGuestLogin(cleanGuest);
                            }}
                            disabled={!!loading}
                            aria-label="Guest name"
                        />
                        <button
                            type="button"
                            onClick={() => cleanGuest && onGuestLogin(cleanGuest)}
                            disabled={!cleanGuest || !!loading}
                            className="mt-3 w-full rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-900 font-semibold px-4 py-2.5 active:scale-[.99] transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Continue as Guest
                        </button>
                        <p className="mt-2 text-xs text-slate-400">
                            Guests are highlighted in the players list.
                        </p>
                    </div>
                </div>
            </div>

            {/* Optional match preview (if provided) */}
            {!loading && match ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                    <div className="text-sm text-slate-300">
                        <div className="font-semibold text-white">{match.title}</div>
                        <div>
                            {match.date} • {match.time}
                        </div>
                        <div className="truncate">{match.location}</div>
                    </div>
                </div>
            ) : null}

            {/* Login modal mounted at the end so overlay covers everything */}
            <LoginModal
                open={loginOpen}
                loading={!!loading}
                onClose={() => setLoginOpen(false)}
                onSubmit={(creds) => {
                    setLoginOpen(false);
                    onLogin?.(creds); // { username, password }
                }}
            />
        </div>
    );
}
