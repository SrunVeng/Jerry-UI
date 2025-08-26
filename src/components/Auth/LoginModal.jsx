import React, { useState, useEffect } from "react";

export default function LoginModal({ open, onClose, onSubmit, loading = false }) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    // reset fields when opened/closed
    useEffect(() => {
        if (!open) { setUsername(""); setPassword(""); }
    }, [open]);

    if (!open) return null;

    const submit = (e) => {
        e?.preventDefault?.();
        if (!username || !password || loading) return;
        onSubmit?.({ username, password });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* overlay */}
            <div className="absolute inset-0 bg-black/60" onClick={onClose} />
            {/* dialog */}
            <form
                onSubmit={submit}
                className="relative z-10 w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-xl"
            >
                <h3 className="text-lg font-bold text-white">Sign in</h3>
                <p className="mt-1 text-sm text-slate-400">Use your username and password.</p>

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
                        disabled={!username || !password || loading}
                        className="flex-1 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-4 py-2"
                    >
                        {loading ? "Signing in…" : "Sign in"}
                    </button>
                </div>
            </form>
        </div>
    );
}
