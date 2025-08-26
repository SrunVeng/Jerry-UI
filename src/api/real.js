// src/api/client/real.js

// Example .env:
// VITE_API_BASE=http://localhost:8080/api
const BASE_URL = (import.meta.env.VITE_API_BASE || "http://localhost:8080/api").replace(/\/+$/, "");

// Set true only if your backend uses cookie sessions (HTTP-only cookies).
// If you use JWT via Authorization header (recommended), keep false.
const USE_COOKIES = false;

// Where to send users when they need to re-auth
const LOGIN_PATH = "/auth"; // change if your login route differs

/* ---------------- internal helpers ---------------- */

function fullUrl(path) {
    const p = path.startsWith("/") ? path : `/${path}`;
    return `${BASE_URL}${p}`;
}

function getToken() {
    try {
        // prefer lowercase (new)
        let raw = localStorage.getItem("accessToken");
        if (raw) return String(raw).replace(/^"|"$/g, "");
        // legacy fallback
        raw = localStorage.getItem("AccessToken");
        if (raw) return String(raw).replace(/^"|"$/g, "");
        // optional fallback if embedded somewhere else
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

function setAccessToken(tok) {
    try {
        if (tok) localStorage.setItem("accessToken", tok);
    } catch {}
}

function setRefreshToken(tok) {
    try {
        if (tok) localStorage.setItem("refreshToken", tok);
    } catch {}
}

function setTokensFromLoginResponse(res) {
    try {
        // very forgiving shape extraction
        const at =
            res?.accessToken ||
            res?.token ||
            res?.data?.accessToken ||
            res?.data?.token;
        const rt =
            res?.refreshToken ||
            res?.data?.refreshToken;
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
            (typeof window !== "undefined" && window.location && window.location.pathname + window.location.search) ||
            "/";
        // avoid redirect-loop if already on login page
        if (typeof window !== "undefined" && !here.startsWith(LOGIN_PATH)) {
            const to = `${LOGIN_PATH}?next=${encodeURIComponent(here)}`;
            window.location.replace(to);
        }
    } catch {
        // swallow
    }
}

// ---- core request with refresh-once ----
async function request(path, options = {}) {
    const {
        method = "GET",
        body,
        headers = {},
        credentials = USE_COOKIES ? "include" : "omit",
        timeout = 15000,
        _retry // internal flag to avoid infinite loops
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
                // let browser set multipart/form-data or blob content-type
                init.body = body;
            } else {
                init.body = JSON.stringify(body);
                init.headers["Content-Type"] ||= "application/json";
            }
        }

        const res = await fetch(fullUrl(path), init);

        const contentType = res.headers.get("content-type") || "";
        const isJson = contentType.includes("application/json");
        const payload = isJson ? await res.json().catch(() => null) : await res.text().catch(() => "");

        // ----- handle non-OK -----
        if (!res.ok) {
            // 401 → try refresh once (if we have a refresh token)
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
                            const refreshCT = refreshRes.headers.get("content-type") || "";
                            const refreshJson = refreshCT.includes("application/json")
                                ? await refreshRes.json().catch(() => null)
                                : null;

                            const newAccess =
                                refreshJson?.accessToken ||
                                refreshJson?.token ||
                                refreshJson?.data?.accessToken ||
                                refreshJson?.data?.token;

                            const newRefresh =
                                refreshJson?.refreshToken ||
                                refreshJson?.data?.refreshToken;

                            if (newAccess) {
                                setAccessToken(newAccess);
                                if (newRefresh) setRefreshToken(newRefresh);

                                // retry original request with the new token
                                const retryHeaders = { ...headers, Authorization: `Bearer ${newAccess}` };
                                return await request(path, { ...options, headers: retryHeaders, _retry: true });
                            }
                        }
                    } catch {
                        // ignore and fall through
                    }
                }

                // refresh failed or no refresh available → clear and redirect to login
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
        return payload; // return as-is (you can unwrap .data in specific API methods if desired)
    } finally {
        clearTimeout(timer);
    }
}

// Build absolute share URL using current origin
function shareUrl(matchId) {
    const base =
        (typeof window !== "undefined" && window.location && window.location.origin) || "";
    return `${base}/join?mid=${encodeURIComponent(matchId)}`;
}

/* ---------------- public api ---------------- */

export const api = {
    /* ----- Auth ----- */

    async me() {
        try {
            const me = await request("/auth/me", { method: "GET" });
            return me || null;
        } catch (e) {
            if (e?.status === 404) return null;
            throw e;
        }
    },

    guestAuth(guest) {
        return request("/auth/guest/login", {
            method: "POST",
            body: { uuid: guest.uuid, displayName: guest.displayName },
        });
    },

    async logout() {
        try {
            await request("/auth/logout", { method: "POST" });
        } finally {
            clearAuth();
            redirectToLogin();
        }
    },

    // username/password login
    async LoginAuth(payload) {
        const out = await request("/auth/user/login", { method: "POST", body: payload });
        // persist tokens so subsequent calls include Authorization
        setTokensFromLoginResponse(out);
        return out;
    },

    /* ----- Matches ----- */
    // If your backend prefers /match/create keep as-is; recommend moving to /football/matches for consistency.

    listMatches() {
        return request("/football/matches", { method: "GET" });
    },

    getMatch(id) {
        return request(`/football/matches/${encodeURIComponent(id)}`, { method: "GET" });
    },

    getMatchAll() {
        return request(`/match/getAll`, { method: "GET" });
    },

    // /match/create expects { opponentName, matchDate, time, location, numberPlayer, notes }
    createMatch(data) {
        return request("/match/create", {
            method: "POST",
            body: {
                opponentName: data.opponentName,
                matchDate: data.matchDate,
                time: data.time,
                location: data.location,
                numberPlayer: data.numberPlayer,
                notes: data.notes,
            },
        });
    },

    updateMatch(id, patch) {
        // if your backend truly uses /match/create/:id, keep it; otherwise consider /football/matches/:id
        return request(`/match/create/${encodeURIComponent(id)}`, {
            method: "PATCH",
            body: patch,
        });
    },

    deleteMatch(id) {
        return request(`/football/matches/${encodeURIComponent(id)}`, { method: "DELETE" });
    },

    join(id) {
        return request(`/football/matches/${encodeURIComponent(id)}/join`, { method: "POST" });
    },

    leave(id) {
        return request(`/football/matches/${encodeURIComponent(id)}/leave`, { method: "POST" });
    },

    kick(id, playerId) {
        return request(
            `/football/matches/${encodeURIComponent(id)}/kick/${encodeURIComponent(playerId)}`,
            { method: "POST" },
        );
    },

    shareUrl,
};
