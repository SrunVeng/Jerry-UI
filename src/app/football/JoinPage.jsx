"use client";

import React, { useEffect, useState, useCallback } from "react";
// If you re-export from an index, keep "../../api/client"; otherwise point to the real file:
import { api } from "../../api/real.js";

import AuthGate from "../../components/Auth/AuthGate.jsx";
import InviteBar from "../../components/Auth/InviteBar.jsx";
import Toast from "../../components/Auth/Toast.jsx";

export default function JoinPage() {
    const [toast, setToast] = useState(null);
    const showToast = useCallback((msg, type = "success") => {
        setToast({ msg, type });
        const id = setTimeout(() => setToast(null), 1800);
        return () => clearTimeout(id);
    }, []);

    const [me, setMe] = useState(null);
    const [authTried, setAuthTried] = useState(false);
    const [authSubmitting, setAuthSubmitting] = useState(false);

    // 1) Finalize Telegram (if query has tg params), then try to load current session
    useEffect(() => {
        let cancel = false;
        (async () => {
            try {
                if (api?.telegramFinalizeFromLocation) {
                    try {
                        await api.telegramFinalizeFromLocation();
                    } catch {
                        /* ignore finalize errors */
                    }
                }
                let user = null;
                try {
                    user = await api.me();
                } catch {
                    /* unauthenticated is fine */
                }
                if (!cancel) setMe(user);
            } finally {
                if (!cancel) setAuthTried(true);
            }
        })();
        return () => {
            cancel = true;
        };
    }, []);

// 2) User Login handler (username/password)
    const handleLogin = useCallback(
        async ({ username, password }) => {
            if (!username || !password) {
                showToast("Username and password required", "error");
                return;
            }

            setAuthSubmitting(true);
            try {
                // Persist lightweight identity (optional)
                try {
                    localStorage.setItem("authIdentity", JSON.stringify({ username }));
                } catch {
                    /* ignore */
                }

                // Call your API client (uses VITE_API_BASE and auto-attach Authorization later)
                const resp = await api.LoginAuth({ username, password });

                // Support both flat and enveloped responses
                const token =
                    resp?.accessToken || // flat
                    resp?.token ||
                    resp?.access_token ||
                    resp?.data?.accessToken || // enveloped
                    resp?.data?.token ||
                    resp?.data?.access_token;

                const refresh =
                    resp?.refreshToken ||
                    resp?.data?.refreshToken;

                if (!token) {
                    showToast("Login succeeded but no token returned", "error");
                    return;
                }

                // Persist tokens (prefer lower-case key name)
                try {
                    localStorage.setItem("accessToken", token);
                    if (refresh) localStorage.setItem("refreshToken", refresh);
                } catch {
                    /* ignore */
                }

                // Optional: refresh current user or just redirect
                try {
                    const user = await api.me();
                    setMe(user || null);
                } catch {
                    /* ignore */
                }

                // Go to home
                window.location.replace("/");
            } catch (err) {
                // Friendly error messages
                const status =
                    err?.status ??
                    err?.payload?.status ??
                    err?.payload?.status_code ??
                    err?.payload?.code;

                let msg;
                if (status === 401) {
                    msg = "Invalid username or password";
                } else if (status === 403) {
                    msg = "You don’t have permission to sign in here";
                } else if (err?.name === "AbortError") {
                    msg = "Login request timed out. Please try again.";
                } else if (err?.message === "Failed to fetch") {
                    msg = "Network error. Please check your connection.";
                } else {
                    msg =
                        err?.payload?.message ||
                        err?.message ||
                        "Login failed. Please try again.";
                }
                showToast(msg, "error");
            } finally {
                setAuthSubmitting(false);
            }
        },
        [showToast]
    );


    // 3) Guest login
    const handleGuestLogin = useCallback(
        async (name) => {
            const clean = (name || "").trim();
            if (!clean) return;
            const uuid =
                typeof crypto !== "undefined" && crypto.randomUUID
                    ? crypto.randomUUID()
                    : `g-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

            const payload = { uuid, displayName: clean };
            try {
                localStorage.setItem("guestIdentity", JSON.stringify({ ...payload, source: "guest" }));
            } catch {
                /* empty */
            }

            try {
                const saved = await api.guestAuth(payload); // expects { uuid, displayName }
                setMe(saved || { ...payload, source: "guest" });
                showToast(`Welcome, ${saved?.displayName || clean}!`);
            } catch (e) {
                showToast(e?.message || "Guest login failed", "error");
            }
        },
        [showToast]
    );

    // 4) Logout
    const handleLogout = useCallback(async () => {
        try {
            await api.logout?.();
        } catch {
            /* empty */
        }
        try {
            localStorage.removeItem("guestIdentity");
            localStorage.removeItem("accessToken");
            localStorage.removeItem("authIdentity");
        } catch {
            /* empty */
        }
        setMe(null);
        showToast("Signed out");
    }, [showToast]);

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100">
            <div className="mx-auto max-w-4xl p-4 space-y-4">
                <AuthGate
                    me={me}
                    authTried={authTried}
                    onLogin={handleLogin}
                    onGuestLogin={handleGuestLogin}
                    loading={false}    // no match loading here
                    match={null}
                    onLogout={handleLogout}
                    loginSubmitting={authSubmitting} // <- pass down so your form can disable the button/spinner
                />
                {me && <InviteBar />}
            </div>
            <Toast toast={toast} />
        </div>
    );
}
