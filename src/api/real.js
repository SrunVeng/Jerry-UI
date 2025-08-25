// src/api/client/real.js
const BASE_URL = import.meta.env.VITE_API_BASE || "http://localhost:8080/api";

async function request(path, options = {}) {
    const res = await fetch(`${BASE_URL}${path}`, {
        credentials: "include", // allow cookies/session
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {}),
        },
        ...options,
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || res.statusText);
    }
    return res.status === 204 ? null : res.json();
}

function currentOrigin() {
    if (typeof window === "undefined") return "";
    return window.location.origin || "";
}

function currentJoinUrl(matchId) {
    const origin = currentOrigin();
    return `${origin}/join?mid=${encodeURIComponent(matchId)}`;
}

export const api = {
    // ----- Auth -----
    async me() {
        return request("/auth/me");
    },

    async guestAuth(guest) {
        return request("/auth/guest", {
            method: "POST",
            body: JSON.stringify(guest),
        });
    },

    async logout() {
        return request("/auth/logout", { method: "POST" });
    },

    telegramLoginUrl(matchId) {
        // Prefer server-driven redirect, but include a return URL for a smooth bounce-back
        const url = new URL(`${BASE_URL}/auth/telegram/login`);
        if (matchId) url.searchParams.set("mid", matchId);
        if (typeof window !== "undefined") {
            url.searchParams.set("redirect", currentJoinUrl(matchId || "demo-123"));
        }
        return url.toString();
    },

    /**
     * Finalize Telegram login if Telegram (or your backend) sent the
     * signed payload back to this page via query params:
     *   id, hash, auth_date, first_name, last_name, username, photo_url
     * If present, we POST it to /auth/telegram, set the server session cookie,
     * then clean the URL (keep only ?mid=...).
     *
     * Returns the server response (e.g., { token, user } or just user/session),
     * or null if no Telegram params were found.
     */
    async telegramFinalizeFromLocation() {
        if (typeof window === "undefined") return null;

        const sp = new URLSearchParams(window.location.search);
        const hasCore =
            sp.has("id") && sp.has("hash") && sp.has("auth_date");

        if (!hasCore) return null;

        const payload = {};
        ["id", "hash", "auth_date", "first_name", "last_name", "username", "photo_url"]
            .forEach((k) => {
                if (sp.has(k)) payload[k] = sp.get(k);
            });

        // Send payload to server to verify + create session
        const result = await request("/auth/telegram", {
            method: "POST",
            body: JSON.stringify(payload),
        });

        // Clean sensitive params from the URL; keep ?mid=... if present
        const mid = sp.get("mid");
        const clean = `${window.location.pathname}${mid ? `?mid=${encodeURIComponent(mid)}` : ""}`;
        window.history.replaceState({}, "", clean);

        return result;
    },

    // ----- Matches -----
    async listMatches() {
        return request("/matches");
    },

    async getMatch(id) {
        return request(`/matches/${id}`);
    },

    async createMatch(data) {
        return request("/matches", {
            method: "POST",
            body: JSON.stringify(data),
        });
    },

    async updateMatch(id, patch) {
        return request(`/matches/${id}`, {
            method: "PATCH",
            body: JSON.stringify(patch),
        });
    },

    async deleteMatch(id) {
        return request(`/matches/${id}`, { method: "DELETE" });
    },

    shareUrl(matchId) {
        const base =
            (typeof window !== "undefined" &&
                window.location &&
                window.location.origin) ||
            "";
        return `${base}/join?mid=${encodeURIComponent(matchId)}`;
    },

    // ----- Attendance -----
    async join(matchId) {
        return request(`/matches/${matchId}/join`, { method: "POST" });
    },

    async leave(matchId) {
        return request(`/matches/${matchId}/leave`, { method: "POST" });
    },

    async kick(matchId, playerId) {
        return request(`/matches/${matchId}/kick/${playerId}`, { method: "POST" });
    },
};
