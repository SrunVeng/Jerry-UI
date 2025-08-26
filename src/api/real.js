// src/api/client/real.js

// Example .env:
// VITE_API_BASE=http://localhost:8080/api
const BASE_URL = (import.meta.env.VITE_API_BASE || "http://localhost:8080/api").replace(/\/+$/, "");

// Toggle only if your backend uses cookie sessions.
// If you use JWT in JSON + localStorage, leave false.
const USE_COOKIES = false;

/* ---------------- internal helpers ---------------- */

function fullUrl(path) {
    // ensure exactly one slash between base and path
    const p = path.startsWith("/") ? path : `/${path}`;
    return `${BASE_URL}${p}`;
}

/** Build a direct Telegram login URL on the backend with a redirect (default "/"). */


/** Unified fetch wrapper: timeout, (optional) cookies, JSON/text handling, better errors */
async function request(path, options = {}) {
    const {
        method = "GET",
        body,
        headers = {},
        credentials = USE_COOKIES ? "include" : "omit",
        timeout = 15000,
    } = options;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
        const init = {
            method,
            credentials,
            mode: "cors",
            headers: { ...headers },
            signal: controller.signal,
        };

        if (body !== undefined) {
            if (typeof body === "string") {
                init.body = body;
                init.headers["Content-Type"] ||= "application/json";
            } else {
                init.body = JSON.stringify(body);
                init.headers["Content-Type"] ||= "application/json";
            }
        }

        const res = await fetch(fullUrl(path), init);

        const contentType = res.headers.get("content-type") || "";
        const isJson = contentType.includes("application/json");
        const payload = isJson ? await res.json().catch(() => null) : await res.text().catch(() => "");

        if (!res.ok) {
            const msg =
                (isJson && payload && (payload.message || payload.error || payload.error_code)) ||
                (typeof payload === "string" && payload) ||
                `${res.status} ${res.statusText}`;
            throw new Error(msg);
        }

        if (res.status === 204) return null;
        return payload;
    } finally {
        clearTimeout(timer);
    }
}

/* ---------------- public api ---------------- */

export const api = {
    /* ----- Auth ----- */

    // GET /api/auth/me
    me() {
        return request("/auth/me");
    },

    // POST /api/auth/guest/login  (expects { uuid, displayName })
    guestAuth(guest) {
        return request("/api/auth/guest/login", {
            method: "POST",
            body: { uuid: guest.uuid, displayName: guest.displayName },
        });
    },

    // POST /api/auth/logout
    logout() {
        return request("/auth/logout", { method: "POST" });
    },

    /* ----- Telegram ----- */

    // POST /api/auth/telegram/login (snake_case fields from Telegram)
    LoginAuth(payload) {
        return request("/api/auth/user/login", {
            method: "POST",
            body: payload,
        });
    },

    /**
     * If Telegram redirects back with ?id=&hash=&auth_date=...
     * Call once on landing page to finalize; it POSTs to /auth/telegram/login.
     */
    async telegramFinalizeFromLocation() {
        if (typeof window === "undefined") return null;

        const sp = new URLSearchParams(window.location.search);
        const hasCore = sp.has("id") && sp.has("hash") && sp.has("auth_date");
        if (!hasCore) return null;

        const payload = {};
        ["id", "hash", "auth_date", "first_name", "last_name", "username", "photo_url"].forEach((k) => {
            if (sp.has(k)) payload[k] = sp.get(k);
        });

        const result = await request("/auth/telegram/login", {
            method: "POST",
            body: payload,
        });

        // Clean the URL completely (no match params anymore)
        const clean = `${window.location.pathname}`;
        window.history.replaceState({}, "", clean);

        return result;
    },

    // Build backend login URL for redirect flow (defaults to "/")

};
