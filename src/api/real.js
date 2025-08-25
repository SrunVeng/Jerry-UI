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
        return `${BASE_URL}/auth/telegram/login?mid=${encodeURIComponent(matchId)}`;
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
