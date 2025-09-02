8// Example .env for Next.js:
// NEXT_PUBLIC_API_BASE_URL=http://localhost:8080/api

const BASE_URL = (
    // eslint-disable-next-line no-undef
    (typeof process !== "undefined" && process.env && process.env.NEXT_PUBLIC_API_BASE_URL) ||
     "https://jerry-server-dm4m.onrender.com/api"
    // "http://localhost:8080/api"
).replace(/\/+$/, "");

const USE_COOKIES = false; // set true only if your backend uses cookie sessions
const LOGIN_PATH = "/auth"; // where to send users to re-auth

/* ---------------- helpers ---------------- */
function fullUrl(path) {
    const p = path.startsWith("/") ? path : `/${path}`;
    return `${BASE_URL}${p}`;
}

function normalizeRoleString(input) {
    // accept "ADMIN", "ROLE_ADMIN", ["ROLE_ADMIN"], ["ADMIN"], "user", etc.
    let r = input;
    if (Array.isArray(r)) r = r[0];
    r = String(r || "").trim().toUpperCase();
    if (r.startsWith("ROLE_")) r = r.replace(/^ROLE_/, "");
    return r === "ADMIN" ? "ADMIN" : "USER";
}



function pickDefined(obj) {
    const out = {};
    for (const k of Object.keys(obj)) {
        const v = obj[k];
        if (v !== undefined && v !== null && !(typeof v === "string" && v.trim() === "")) {
            out[k] = v;
        }
    }
    return out;
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
    } catch { /* empty */ }
    return null;
}

function getRefreshToken() {
    try {
        const raw = localStorage.getItem("refreshToken");
        if (raw) return String(raw).replace(/^"|"$/g, "");
    } catch { /* empty */ }
    return null;
}

function setAccessToken(tok) { try { if (tok) localStorage.setItem("accessToken", tok); } catch { /* empty */ } }
function setRefreshToken(tok) { try { if (tok) localStorage.setItem("refreshToken", tok); } catch { /* empty */ } }

function setTokensFromLoginResponse(res) {
    try {
        const at = res?.accessToken || res?.token || res?.data?.accessToken || res?.data?.token;
        const rt = res?.refreshToken || res?.data?.refreshToken;
        if (at) setAccessToken(at);
        if (rt) setRefreshToken(rt);
    } catch { /* empty */ }
}

function clearAuth() {
    try {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("AccessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("authIdentity");
    } catch { /* empty */ }
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
    } catch { /* empty */ }
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
                    } catch { /* empty */ }
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

    createMatch(data) {
        const body = {
            opponentName: data.opponentName || data.title || "Jerry FC Match",
            pitchNumber: data.pitchNumber ?? data.pitch ?? "",     // <-- FIXED
            matchDate: data.matchDate || data.date,
            time: data.time,
            location: data.location,
            numberPlayer: Number(data.numberPlayer ?? data.maxPlayers) || 12,
            notes: data.notes,
        };
        return request("/match/create", { method: "POST", body });
    },


    updateMatch(data) {
        const body = {
            id: data.id,
            opponentName: data.opponentName || data.title || "Jerry FC Match",
            pitchNumber: data.pitchNumber ?? data.pitch ?? "",     // <-- FIXED
            matchDate: data.matchDate || data.date,
            time: data.time,
            location: data.location,
            numberPlayer: Number(data.numberPlayer ?? data.maxPlayers) || 12,
            notes: data.notes,
        };
        return request("/match/update", { method: "PATCH", body });
    },

    updateMatchResult(data) {
        const body = {
            id: data.id,
            ...(data.teamScore !== undefined ? { teamScore: data.teamScore } : {}),
            ...(data.opponentScore !== undefined ? { opponentScore: data.opponentScore } : {}),
            // optional override if you ever want to force it:
            ...(data.result ? { result: data.result } : {}),
        };
        return request("/match/update-result", { method: "POST", body });
    },

    createLocation(name) {
        return request(`/match/location/create/${encodeURIComponent(name)}`, { method: "POST" });
    },

    getAllLocation() {
        return request("/match/location/getAll", { method: "GET" });
    },




    deleteMatch(id) {
        return request(`/match/delete/${encodeURIComponent(id)}`, { method: "POST" });
    },

    join(id) {
        return request(`/match/join/${encodeURIComponent(id)}`, { method: "POST" });
    },
    leave(id) {
        return request(`/match/leave/${encodeURIComponent(id)}`, { method: "POST" });
    },

    guestAuth(data) {
        return request("/auth/guest/login", { method: "POST", body: data });
    },


    // for Admin
    createUser(data = {}) {
        const body = pickDefined({
            firstName: data.firstName,
            lastName: data.lastName,
            username: data.username,
            password: data.password,                // server encodes
            displayName: data.displayName,
            role: normalizeRoleString(data.role ?? data.roles), // <-- STRING
            email: data.email,
            phoneNumber: data.phoneNumber,
            chatId: data.chatId,
        });
        return request("/auth/user/register", { method: "POST", body });
    },


    /** Get all users */
    getAllUsers() {
        return request("/auth/user/getAll", { method: "GET" });
    },

    /** Delete user by id (POST to path param) */
    DeleteUser(id) {
        return request(`/auth/user/delete/${encodeURIComponent(id)}`, { method: "POST" });
    },

    /**
     * Update a user
     * Required: id, firstName, lastName, username, password, displayName, roles
     * Optional: email, phoneNumber, chatId
     */
    UpdateUser(data = {}) {
        const body = pickDefined({
            id: data.id,
            firstName: data.firstName,
            lastName: data.lastName,
            username: data.username,
            password: data.password,                // server encodes
            displayName: data.displayName,
            role: normalizeRoleString(data.role ?? data.roles), // <-- STRING
            email: data.email,
            phoneNumber: data.phoneNumber,
            chatId: data.chatId,
        });
        return request("/auth/user/update", { method: "POST", body });
    },


};
