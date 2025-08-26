import React, { useEffect, useState, useCallback } from "react";
import { api } from "../../api/client";

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

    // 2)  User Login handler
    const handleLogin = useCallback(async ({ username, password }) => {
        if (!username || !password) {
            showToast("Username and password required", "error");
            return;
        }

        const payload = { username, password };

        try {
            // Store lightweight identity
            try {
                localStorage.setItem("authIdentity", JSON.stringify({ username }));
            } catch {
                /* ignore */
            }

            // Call your API (fetch version)
            const res = await fetch("http://localhost:8080/api/auth/user/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                if (res.status === 500) {
                    showToast("Invalid Username or Password", "error");
                } else {
                    showToast(`Login failed: ${res.status}`, "error");
                }
                return;
            }

            const saved = await res.json();

            if (saved?.token) {
                try {
                    localStorage.setItem("accessToken", saved.token);
                } catch {
                    /* ignore */
                }
            }

            window.location.replace("/");
        } catch (err) {
            showToast("Network error, please try again", "error");
        }
    }, []);




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
            } catch { /* empty */ }

            try {
                const saved = await api.guestAuth(payload); // expects { uuid, displayName }
                setMe(saved || { ...payload, source: "guest" });
                showToast(`Welcome, ${(saved?.displayName || clean)}!`);
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
        } catch { /* empty */ }
        try {
            localStorage.removeItem("guestIdentity");
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
                    onGuestLogin={handleGuestLogin}
                    loading={false}   // no match loading
                    match={null}      // match features not used
                    onLogout={handleLogout}
                />
                {me && <InviteBar />}
            </div>
            <Toast toast={toast} />
        </div>
    );
}
