"use client";

import React, { useEffect, useState, useCallback } from "react";
import { api } from "../../api/real.js";

import AuthGate from "../../components/Auth/AuthGate.jsx";
import InviteBar from "../../components/Auth/InviteBar.jsx";
import Toast from "../../components/Auth/Toast.jsx";

export default function JoinPage() {
    /* ---------- toast ---------- */
    const [toast, setToast] = useState(null);
    const showToast = useCallback((msg, type = "info") => {
        setToast({ msg, type });
        const id = setTimeout(() => setToast(null), 1800);
        return () => clearTimeout(id);
    }, []);

    /* ---------- auth state ---------- */
    const [me, setMe] = useState(null);
    const [authTried, setAuthTried] = useState(false);
    const [authSubmitting, setAuthSubmitting] = useState(false);

    // 1) Try Telegram finalize (if present), then try to load current session
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
        return () => { cancel = true; };
    }, []);

    // 2) Username/password login
    const handleLogin = useCallback(
        async ({ username, password }) => {
            if (!username || !password) {
                showToast("Username and password required", "error");
                return;
            }

            setAuthSubmitting(true);
            try {
                // persist lightweight identity (optional)
                try {
                    localStorage.setItem("authIdentity", JSON.stringify({ username }));
                } catch { /* empty */ }

                const resp = await api.LoginAuth({ username, password });

                // support flat & enveloped responses
                const token =
                    resp?.accessToken ||
                    resp?.token ||
                    resp?.access_token ||
                    resp?.data?.accessToken ||
                    resp?.data?.token ||
                    resp?.data?.access_token;

                const refresh =
                    resp?.refreshToken ||
                    resp?.data?.refreshToken;

                if (!token) {
                    showToast("Login succeeded but no token returned", "error");
                    return;
                }

                try {
                    localStorage.setItem("accessToken", token);
                    if (refresh) localStorage.setItem("refreshToken", refresh);
                } catch { /* empty */ }

                try {
                    const user = await api.me();
                    setMe(user || null);
                } catch { /* empty */ }

                window.location.replace("/");
            } catch (err) {
                const status =
                    err?.status ??
                    err?.payload?.status ??
                    err?.payload?.status_code ??
                    err?.payload?.code;

                let msg;
                if (status === 401) msg = "Invalid username or password";
                else if (status === 403) msg = "You don’t have permission to sign in here";
                else if (err?.name === "AbortError") msg = "Login request timed out. Please try again.";
                else if (err?.message === "Failed to fetch") msg = "Network error. Please check your connection.";
                else msg = err?.payload?.message || err?.message || "Login failed. Please try again.";

                showToast(msg, "error");
            } finally {
                setAuthSubmitting(false);
            }
        },
        [showToast]
    );

    // 3) Guest login (disabled)
    const handleGuestLogin = useCallback(
        async () => {
            showToast("Continue as guest — coming soon ✨", "info");
            // intentionally no API call, no localStorage, no navigation
        },
        [showToast]
    );

    // 4) Logout
    const handleLogout = useCallback(async () => {
        try { await api.logout?.(); } catch { /* empty */ }
        try {
            localStorage.removeItem("guestIdentity"); // in case legacy guest existed
            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");
            localStorage.removeItem("authIdentity");
        } catch { /* empty */ }
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
                    onGuestLogin={handleGuestLogin}   // still pass handler to show the toast
                    guestDisabled={true}              // if AuthGate supports this, it will gray out the button
                    loading={false}
                    match={null}
                    onLogout={handleLogout}
                    loginSubmitting={authSubmitting}
                />
                {me && <InviteBar />}
            </div>
            <Toast toast={toast} />
        </div>
    );
}
