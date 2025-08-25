// src/api/client/real.js

const BASE_RAW = import.meta.env.VITE_API_BASE || "";
const BASE = BASE_RAW.replace(/\/+$/, ""); // strip trailing slash

// ---------- helpers ----------
const absolutize = (u) => {
    const s = (u || "").trim();
    if (!s) return "";
    if (/^https?:\/\//i.test(s)) return s;
    if (s.startsWith("//")) return `https:${s}`;
    return `https://${s.replace(/^\/+/, "")}`;
};
const normalizeMatch = (m) => {
    const c = { ...m };
    if (c.locationUrl) c.locationUrl = absolutize(c.locationUrl);
    return c;
};

const buildUrl = (path) => `${BASE}${path.startsWith("/") ? path : `/${path}`}`;

const fetchJSON = async (path, options = {}) => {
    const url = buildUrl(path);
    const res = await fetch(url, {
        credentials: "include", // important: use cookie session
        ...options,
        headers: { ...(options.headers || {}) },
    });

    // Try parse body (json or text) for better errors
    const ct = res.headers.get("content-type") || "";
    let data = null;
    if (ct.includes("application/json")) {
        try { data = await res.json(); } catch {}
    } else {
        try { data = await res.text(); } catch {}
    }

    if (!res.ok) {
        const msg =
            (data && (data.message || data.error || (typeof data === "string" && data))) ||
            `${options.method || "GET"} ${path} failed (${res.status})`;
        throw new Error(msg);
    }
    return data;
};

// ---------- API surface ----------
export const api = {
    // ----- Auth -----
    me: () => fetchJSON("/api/me"),

    guestAuth: (guest) =>
        fetchJSON("/api/auth/guest", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(guest),
        }),

    logout: () => fetchJSON("/api/auth/logout", { method: "POST" }),

    telegramLoginUrl: (matchId) =>
        `${buildUrl("/api/auth/telegram/login")}?mid=${encodeURIComponent(matchId)}`,

    // ----- Matches -----
    listMatches: async () => {
        const arr = await fetchJSON("/api/matches");
        return Array.isArray(arr) ? arr.map(normalizeMatch) : [];
    },

    getMatch: async (id) =>
        normalizeMatch(await fetchJSON(`/api/matches/${encodeURIComponent(id)}`)),

    createMatch: (body) =>
        fetchJSON("/api/matches", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        }).then(normalizeMatch),

    updateMatch: (id, patch) =>
        fetchJSON(`/api/matches/${encodeURIComponent(id)}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(patch),
        }).then(normalizeMatch),

    deleteMatch: (id) =>
        fetchJSON(`/api/matches/${encodeURIComponent(id)}`, { method: "DELETE" }),

    shareUrl(matchId) {
        const origin =
            (typeof window !== "undefined" && window.location?.origin) || "";
        return `${origin}/join?mid=${encodeURIComponent(matchId)}`;
    },

    // ----- Attendance -----
    join: (id) =>
        fetchJSON(`/api/matches/${encodeURIComponent(id)}/join`, { method: "POST" }),

    leave: (id) =>
        fetchJSON(`/api/matches/${encodeURIComponent(id)}/leave`, { method: "POST" }),

    kick: (id, playerId) =>
        fetchJSON(`/api/matches/${encodeURIComponent(id)}/kick`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ playerId }),
        }),
};
