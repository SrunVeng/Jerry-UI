// src/api/client/mock.js
// Tiny in-memory mock to develop UI without a backend

// ----------------- Config -----------------
const MOCK_DELAY =
    (typeof import.meta !== "undefined" &&
        import.meta.env &&
        Number(import.meta.env.VITE_MOCK_DELAY)) ||
    200; // ms

// ----------------- Helpers ----------------
const clone = (obj) =>
    typeof structuredClone === "function"
        ? structuredClone(obj)
        : JSON.parse(JSON.stringify(obj));

const sleep = (ms = MOCK_DELAY) => new Promise((r) => setTimeout(r, ms));

const safeLocal = {
    get(key, fallback = null) {
        try {
            if (typeof window === "undefined") return fallback;
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch {
            return fallback;
        }
    },
    set(key, value) {
        try {
            if (typeof window === "undefined") return;
            if (value === undefined || value === null) {
                localStorage.removeItem(key);
            } else {
                localStorage.setItem(key, JSON.stringify(value));
            }
        } catch {
            /* noop */
        }
    },
    remove(key) {
        try {
            if (typeof window !== "undefined") localStorage.removeItem(key);
        } catch {
            /* noop */
        }
    },
};

const ME_KEY = "__mock_me__";
const ANON_KEY = "__anon_me__";
const MATCHES_KEY = "__mock_matches__";

const loadMe = () => {
    // Prefer explicit mock “me”; fallback to anon for nicer UX after logout
    const me = safeLocal.get(ME_KEY);
    if (me) return me;
    const anon = safeLocal.get(ANON_KEY);
    return anon || null;
};
const saveMe = (user) => safeLocal.set(ME_KEY, user);

const loadMatches = (fallback) => safeLocal.get(MATCHES_KEY, clone(fallback));
const saveMatches = (matches) => safeLocal.set(MATCHES_KEY, matches);

const genId = () => {
    try {
        return crypto.randomUUID();
    } catch {
        return "id-" + Math.random().toString(36).slice(2, 10);
    }
};

const absolutize = (u) => {
    const s = (u || "").trim();
    if (!s) return "";
    if (/^https?:\/\//i.test(s)) return s;
    if (s.startsWith("//")) return `https:${s}`;
    return `https://${s.replace(/^\/+/, "")}`;
};

const normalizeMatch = (m) => {
    const c = clone(m);
    if (c.locationUrl) c.locationUrl = absolutize(c.locationUrl);
    c.maxPlayers = Math.max(2, Number(c.maxPlayers) || 12);
    c.title = (c.title || "").trim();
    c.location = (c.location || "").trim();
    c.notes = (c.notes || "").trim();
    return c;
};

const capacity = (m) => Math.max(2, Number(m.maxPlayers) || 12);

// Promote first WAITLIST to CONFIRMED when capacity is available
const promoteWaitlist = (m) => {
    const cap = capacity(m);
    const confirmedCount = m.players.filter((p) => p.status !== "WAITLIST").length;
    if (confirmedCount < cap) {
        const next = m.players.find((p) => p.status === "WAITLIST");
        if (next) next.status = "CONFIRMED";
    }
};

// Create/replace a local anonymous identity (for mock-mode UX)
const seedAnon = () => {
    const id =
        (typeof crypto !== "undefined" && crypto.randomUUID?.()) ||
        "anon-" + Math.random().toString(36).slice(2, 10);

    const anon = {
        id,
        displayName: "Guest " + Math.floor(Math.random() * 900 + 100),
        source: "guest",
    };
    safeLocal.set(ANON_KEY, anon);
    return anon;
};

// ----------------- Initial Mock State -----------------
const INITIAL_MATCHES = {
    "demo-123": {
        id: "demo-123",
        title: "Jerry FC vs Community",
        date: "2025-09-01",
        time: "18:30",
        location: "Olympic Stadium",
        locationUrl: "",
        maxPlayers: 12,
        notes: "Bring water & bibs.",
        createdBy: "tg-111",
        players: [
            { id: "1001", name: "Tola", source: "telegram", status: "CONFIRMED" },
            { id: "1002", name: "Sreyneang", source: "telegram", status: "CONFIRMED" },
            { id: "g-1", name: "Guest Chan", source: "guest", status: "CONFIRMED" },
        ],
    },
};

// Persisted state (survives refresh via localStorage)
const state = {
    me: loadMe(), // { id, displayName, source: "telegram" | "guest" }
    matches: loadMatches(INITIAL_MATCHES), // { [id]: Match }
};

// ----------------- API Surface -----------------
export const api = {
    // ----- Auth -----
    async me() {
        await sleep();
        state.me = loadMe();
        return state.me ? clone(state.me) : null;
    },

    async guestAuth(guest) {
        await sleep();
        const g = {
            id: guest.id,
            displayName: guest.displayName,
            source: "guest",
        };
        state.me = g;
        saveMe(state.me);
        // Compatibility with UI that reads guestIdentity
        safeLocal.set("guestIdentity", g);
        return clone(state.me);
    },

    async logout() {
        await sleep();
        state.me = null;
        saveMe(null);
        safeLocal.remove(ANON_KEY);
        safeLocal.remove("guestIdentity");
        safeLocal.remove("__mock_me__"); // old compat key
        return { ok: true };
    },

    // Optional helper used by the app to keep home usable in mock mode
    ensureAnon() {
        if (!state.me) {
            const anon = seedAnon();
            state.me = anon;
            // note: we do NOT save anon into ME_KEY so app can still distinguish
        }
        return clone(state.me);
    },

    telegramLoginUrl(matchId) {
        // In mock, pretend there's a login endpoint
        return `/mock/telegram-login?mid=${encodeURIComponent(matchId)}`;
    },

    __setMockTelegramUser(
        user = { id: "tg-777", displayName: "TG Admin", source: "telegram" }
    ) {
        state.me = user;
        saveMe(state.me);
        return clone(state.me);
    },

    // ----- Matches -----
    async listMatches() {
        await sleep();
        const arr = Object.values(state.matches);
        arr.sort((a, b) => {
            const da = new Date(`${a.date}T${a.time || "00:00"}:00`);
            const db = new Date(`${b.date}T${b.time || "00:00"}:00`);
            return da - db;
        });
        return arr.map(normalizeMatch);
    },

    async getMatch(id) {
        await sleep();
        const m = state.matches[id];
        if (!m) throw new Error("Match not found");
        return normalizeMatch(m);
    },

    async createMatch(data) {
        await sleep();
        const id = data.id || genId();
        const m = normalizeMatch({
            id,
            title: data.title || "",
            date: data.date || "",
            time: data.time || "",
            location: data.location || "",
            locationUrl: data.locationUrl || "",
            maxPlayers: data.maxPlayers,
            notes: data.notes || "",
            createdBy: state.me?.id || "tg-unknown",
            players: Array.isArray(data.players) ? data.players : [],
        });
        state.matches[id] = m;
        saveMatches(state.matches);
        return clone(m);
    },

    async updateMatch(id, patch) {
        await sleep();
        const m = state.matches[id];
        if (!m) throw new Error("Match not found");
        const merged = normalizeMatch({ ...m, ...(patch || {}) });
        state.matches[id] = merged;
        saveMatches(state.matches);
        return clone(merged);
    },

    async deleteMatch(id) {
        await sleep();
        if (!state.matches[id]) throw new Error("Match not found");
        delete state.matches[id];
        saveMatches(state.matches);
        return { ok: true };
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
    async join(id) {
        await sleep();
        const me = state.me;
        if (!me) throw new Error("Not signed in");
        const m = state.matches[id];
        if (!m) throw new Error("Match not found");

        const exists = m.players.some((p) => p.id === me.id);
        if (!exists) {
            const cap = capacity(m);
            const status = m.players.length < cap ? "CONFIRMED" : "WAITLIST";
            m.players.push({
                id: me.id,
                name: me.displayName,
                source: me.source,
                status,
            });
            saveMatches(state.matches);
        }
        return normalizeMatch(m);
    },

    async leave(id) {
        await sleep();
        const me = state.me;
        if (!me) throw new Error("Not signed in");
        const m = state.matches[id];
        if (!m) throw new Error("Match not found");

        const beforeLen = m.players.length;
        m.players = m.players.filter((p) => p.id !== me.id);
        if (m.players.length !== beforeLen) {
            promoteWaitlist(m);
            saveMatches(state.matches);
        }
        return normalizeMatch(m);
    },

    async kick(id, playerId) {
        await sleep();
        const m = state.matches[id];
        if (!m) throw new Error("Match not found");

        // Only Telegram users can remove players (mock rule)
        if (state.me?.source !== "telegram") {
            throw new Error("Only Telegram users can remove players (mock rule).");
        }

        const beforeLen = m.players.length;
        m.players = m.players.filter((p) => p.id !== playerId);
        if (m.players.length !== beforeLen) {
            promoteWaitlist(m);
            saveMatches(state.matches);
        }
        return normalizeMatch(m);
    },
};

// ----------------- Dev Utilities (Global) -----------------
if (typeof window !== "undefined") {
    // Quick Telegram login
    window.__setMockTelegram = () =>
        api.__setMockTelegramUser({
            id: "tg-111",
            displayName: "Telegram User",
            source: "telegram",
        });

    // Reset mock DB
    window.__resetMock = () => {
        state.me = null;
        saveMe(null);
        safeLocal.remove(ANON_KEY);
        state.matches = clone(INITIAL_MATCHES);
        saveMatches(state.matches);
        return { ok: true };
    };

    // Seed a sample match quickly
    window.__seedMatch = (patch = {}) => {
        const id = patch.id || genId();
        const match = normalizeMatch({
            id,
            title: "Friendly 7v7",
            date: "2025-10-01",
            time: "19:00",
            location: "City Stadium",
            locationUrl: "",
            maxPlayers: 14,
            notes: "Bring both dark & light jersey.",
            createdBy: state.me?.id || "tg-111",
            players: [],
            ...patch,
        });
        state.matches[id] = match;
        saveMatches(state.matches);
        return clone(match);
    };

    // Convenience sign-out for console testing
    window.__logoutMock = () => api.logout();

    // Ensure anon handy while tinkering (optional)
    window.__ensureAnon = () => api.ensureAnon();
}
