// Example .env for Next.js:
// NEXT_PUBLIC_API_BASE_URL=http://localhost:8080/api

const BASE_URL = (
    (typeof process !== "undefined" && process.env && process.env.NEXT_PUBLIC_API_BASE_URL) ||
    "http://localhost:8080/api"
).replace(/\/+$/, "");

const USE_COOKIES = false; // set true only if your backend uses cookie sessions
const LOGIN_PATH = "/auth"; // where to send users to re-auth

/* ---------------- helpers ---------------- */
function fullUrl(path) {
    const p = path.startsWith("/") ? path : `/${path}`;
    return `${BASE_URL}${p}`;
}

function getToken() {
    try {
        let raw = localStorage.getItem("accessToken");
        if (raw) return String(raw).replace(/^"|"$/g, "");
        raw = localStorage.getItem("AccessToken");
        if (raw) return String(raw).replace(/^"|"$/g, "");
        const auth = localStorage.getItem("authIdentity");
        if (auth) {
            const obj = JSON.parse(auth);
            if (obj?.token) return String(obj.token);
        }
    } catch {}
    return null;
}

function getRefreshToken() {
    try {
        const raw = localStorage.getItem("refreshToken");
        if (raw) return String(raw).replace(/^"|"$/g, "");
    } catch {}
    return null;
}

function setAccessToken(tok) { try { if (tok) localStorage.setItem("accessToken", tok); } catch {} }
function setRefreshToken(tok) { try { if (tok) localStorage.setItem("refreshToken", tok); } catch {} }

function setTokensFromLoginResponse(res) {
    try {
        const at = res?.accessToken || res?.token || res?.data?.accessToken || res?.data?.token;
        const rt = res?.refreshToken || res?.data?.refreshToken;
        if (at) setAccessToken(at);
        if (rt) setRefreshToken(rt);
    } catch {}
}

function clearAuth() {
    try {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("AccessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("authIdentity");
    } catch {}
}

function redirectToLogin() {
    try {
        const here =
            (typeof window !== "undefined" &&
                window.location &&
                window.location.pathname + window.location.search) || "/";
        if (typeof window !== "undefined" && !here.startsWith(LOGIN_PATH)) {
            const to = `${LOGIN_PATH}?next=${encodeURIComponent(here)}`;
            window.location.replace(to);
        }
    } catch {}
}

/* --------------- core request (refresh-once) --------------- */
async function request(path, options = {}) {
    const {
        method = "GET",
        body,
        headers = {},
        credentials = USE_COOKIES ? "include" : "omit",
        timeout = 15000,
        _retry
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

        if (!USE_COOKIES) {
            const token = getToken();
            if (token) init.headers["Authorization"] ||= `Bearer ${token}`;
        }

        if (body !== undefined) {
            if (typeof body === "string") {
                init.body = body;
                init.headers["Content-Type"] ||= "application/json";
            } else if (body instanceof FormData || body instanceof Blob) {
                init.body = body; // browser sets content-type
            } else {
                init.body = JSON.stringify(body);
                init.headers["Content-Type"] ||= "application/json";
            }
        }

        const res = await fetch(fullUrl(path), init);

        const contentType = (res.headers.get("content-type") || "").toLowerCase();
        const isJson = contentType.includes("json");
        const payload = isJson
            ? await res.json().catch(() => null)
            : await res.text().catch(() => "");

        if (!res.ok) {
            // 401 → try refresh once
            if (res.status === 401 && !_retry) {
                const rt = getRefreshToken();
                if (rt) {
                    try {
                        const refreshRes = await fetch(fullUrl("/auth/refresh"), {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            credentials,
                            body: JSON.stringify({ refreshToken: rt }),
                        });
                        if (refreshRes.ok) {
                            const ct = (refreshRes.headers.get("content-type") || "").toLowerCase();
                            const j = ct.includes("json") ? await refreshRes.json().catch(() => null) : null;

                            const newAccess =
                                j?.accessToken || j?.token || j?.data?.accessToken || j?.data?.token;
                            const newRefresh = j?.refreshToken || j?.data?.refreshToken;

                            if (newAccess) {
                                setAccessToken(newAccess);
                                if (newRefresh) setRefreshToken(newRefresh);
                                const retryHeaders = { ...headers, Authorization: `Bearer ${newAccess}` };
                                return await request(path, { ...options, headers: retryHeaders, _retry: true });
                            }
                        }
                    } catch {}
                }
                clearAuth();
                redirectToLogin();
            }

            const msg =
                (isJson && payload && (payload.message || payload.error || payload.error_code)) ||
                (typeof payload === "string" && payload) ||
                `${res.status} ${res.statusText}`;
            const err = Object.assign(new Error(msg), { status: res.status, payload });
            throw err;
        }

        if (res.status === 204) return null;
        // ✅ success: only accept JSON as data; any non-JSON is treated as "no body"
        if (!isJson) return null;

        return payload;
    } finally {
        clearTimeout(timer);
    }
}

/* ---------------- public api ---------------- */
export const api = {
    isAuthenticated() { return !!getToken(); },

    /* ----- Auth ----- */
    async me() {
        try { return await request("/auth/me", { method: "GET" }); }
        catch (e) { if (e?.status === 404) return null; throw e; }
    },

    async logout() {
        try { await request("/auth/logout", { method: "POST" }); }
        finally { clearAuth(); redirectToLogin(); }
    },

    async LoginAuth(payload) {
        const out = await request("/auth/user/login", { method: "POST", body: payload });
        setTokensFromLoginResponse(out);
        return out;
    },

    /* ----- Matches ----- */
    getMatchAll() { return request("/match/getAll", { method: "GET" }); },

    getMatch(id) {
        return request(`/match/getMatchDetailsById/${encodeURIComponent(id)}`, { method: "GET" });
    },

    // ✅ create match (maps form to your backend shape)
    createMatch(data) {
        const body = {
            opponentName: data.opponentName || data.title || "Jerry FC Match",
            matchDate: data.matchDate || data.date,
            time: data.time,
            location: data.location,
            numberPlayer: Number(data.numberPlayer ?? data.maxPlayers) || 12,
            notes: data.notes,
        };
        return request("/match/create", { method: "POST", body });
    },

    // ✅ join — backend expects numeric Long id; UI will ensure numeric only
    join(id) {
        return request(`/match/join/${encodeURIComponent(id)}`, { method: "POST" });
    },
};
