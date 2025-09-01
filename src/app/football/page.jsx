// app/matches/page.jsx
"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import MatchForm from "../../components/MatchForm.jsx";
import MatchCard from "../../components/MatchCard.jsx";
import FootballLoader from "../../components/footballLoader.jsx";
import { api } from "../../api/real.js";

/* ---------------- utils ---------------- */
const randKey = () => Math.random().toString(36).slice(2);

const prettyError = (e, fallback = "Something went wrong") => {
    if (!e) return fallback;
    if (typeof e === "string") return e;
    if (e.message) return e.message;
    try { return JSON.stringify(e); } catch { return fallback; }
};

const norm = (s) => String(s || "").trim().replace(/\s+/g, " ").toLowerCase();

/* -------- auth (local) -------- */
function getMeFromStorage() {
    try {
        const raw = localStorage.getItem("authIdentity");
        if (!raw) return { id: "", username: "", displayName: "", roles: [] };

        const a = JSON.parse(raw);
        const roles =
            a?.roles ??
            a?.authorities ??
            a?.scopes ??
            a?.user?.roles ??
            a?.user?.authorities ??
            [];

        return {
            id: String(a?.id ?? a?.userId ?? a?.user?.id ?? ""),
            username: String(a?.username ?? a?.user?.username ?? ""),
            displayName: String(
                a?.displayName ??
                a?.name ??
                a?.user?.displayName ??
                a?.user?.name ??
                ""
            ),
            roles: Array.isArray(roles)
                ? roles
                : String(roles || "").split(/\s+/).filter(Boolean),
            source: "user",
        };
    } catch {
        return { id: "", username: "", displayName: "", roles: [] };
    }
}

function getRolesFromToken() {
    try {
        const token = localStorage.getItem("accessToken");
        if (!token) return [];
        const [, payloadB64] = token.split(".");
        if (!payloadB64) return [];
        const json = JSON.parse(atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/")));
        const scopes =
            json?.scope ||
            json?.scopes ||
            json?.authorities ||
            json?.roles ||
            json?.authorities_claim ||
            [];
        let arr = Array.isArray(scopes) ? scopes : String(scopes || "").split(/\s+/);
        return arr.filter(Boolean);
    } catch {
        return [];
    }
}

/* -------- server -> UI coercion -------- */
function coerceMatch(serverItem) {
    if (!serverItem || typeof serverItem !== "object" || Array.isArray(serverItem)) return null;

    const rawId =
        serverItem.id ??
        serverItem.matchId ??
        serverItem.match_id ??
        serverItem.uuid ??
        serverItem.matchUUID ??
        null;
    const id = rawId != null ? String(rawId) : null;

    const opponent = serverItem.opponentName ?? serverItem.name ?? "";
    const title = serverItem.title ?? (opponent ? `Jerry FT vs ${opponent}` : "Jerry FC Match");

    const date = serverItem.date ?? serverItem.matchDate ?? "";
    const time = serverItem.time ?? serverItem.kickoffTime ?? serverItem.kickOffTime ?? "";
    const location = serverItem.location ?? serverItem.venue ?? "";
    const locationUrl = serverItem.locationUrl ?? serverItem.mapUrl ?? "";
    const maxPlayers = Number(serverItem.maxPlayers ?? serverItem.numberPlayer ?? serverItem.capacity) || 12;

    let playersRaw =
        serverItem.players ??
        serverItem.attendees ??
        serverItem.playerNames ??
        serverItem.player_names ??
        [];

    let players = [];
    if (Array.isArray(playersRaw)) {
        if (playersRaw.length && typeof playersRaw[0] === "string") {
            players = playersRaw
                .filter(Boolean)
                .map((name, i) => ({ id: `name-${i + 1}`, name: String(name), username: "" }));
        } else {
            players = playersRaw.map((p, i) => {
                const u = p?.user || p || {};
                const pid = u?.id ?? p?.userId ?? p?.id ?? `tmp-${i + 1}`;
                const username = String(u?.username ?? p?.username ?? "");
                const name = String(u?.displayName ?? u?.name ?? p?.name ?? username ?? u.username);
                return { id: String(pid), name, username, status: p?.status };
            });
        }
    }

    const notes = serverItem.notes ?? serverItem.description ?? serverItem.remark ?? "";

    return {
        _key: id || randKey(),
        id,
        ephemeral: !id,
        title,
        date,
        time,
        location,
        locationUrl,
        maxPlayers,
        players,
        notes,
        createdBy: serverItem.createdBy ?? null,
    };
}

/* -------- role helpers (new) -------- */
function renderRoleCell(u) {
    const r = u?.role ?? u?.roles;
    if (Array.isArray(r)) return r.join(", ");
    if (!r) return "-";
    return String(r);
}

function toDropdownRole(u) {
    let r = u?.role ?? u?.roles;
    r = Array.isArray(r) ? r[0] : r;
    const up = String(r || "").toUpperCase();
    if (up.startsWith("ROLE_")) return up;
    if (up === "ADMIN") return "ADMIN";
    if (up === "USER") return "USER";
    return "USER";
}

export default function Page() {
    /* -------- me/session -------- */
    const [{ id: myId, username: myUsername, displayName: myName, roles: storedRoles }, setMe] = useState({
        id: "", username: "", displayName: "", roles: []
    });
    useEffect(() => { setMe(getMeFromStorage()); }, []);
    const jwtRoles = useMemo(() => getRolesFromToken(), []);
    const allRoles = useMemo(() => {
        const s = new Set([...(storedRoles || []), ...(jwtRoles || [])].map(r => String(r)));
        return Array.from(s);
    }, [storedRoles, jwtRoles]);

    const isAdmin = useMemo(() => {
        const R = allRoles.map(r => r.toUpperCase());
        return (
            R.includes("ROLE_ADMIN") ||
            R.includes("SCOPE_ROLE_ADMIN") ||
            R.includes("ADMIN")
        );
    }, [allRoles]);

    const currentUserId = useMemo(() => (myId ? String(myId) : ""), [myId]);
    const greetingName = myName || myUsername || "Player";

    /* -------- matches & ui -------- */
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [pending, setPending] = useState({});      // {[matchId]: true}

    // membership flags per match
    const [joinedByMe, setJoinedByMe] = useState({}); // {[matchId]: boolean}

    // Locations (for MatchForm)
    const [locations, setLocations] = useState([]);
    const [locError, setLocError] = useState("");

    const normalizeLocationList = (raw) => {
        const arr = Array.isArray(raw) ? raw : (raw?.data ?? []);
        const names = arr.map((x) => {
            if (typeof x === "string") return x;
            if (!x || typeof x !== "object") return "";
            return String(x.name ?? x.location ?? x.title ?? "");
        }).filter(Boolean);

        const seen = new Set();
        const unique = [];
        for (const n of names) {
            const k = norm(n);
            if (!seen.has(k)) { seen.add(k); unique.push(n); }
        }
        return unique.sort((a, b) => a.localeCompare(b));
    };

    const fetchLocations = useCallback(async () => {
        setLocError("");
        try {
            let result = null;
            if (typeof api.getAllLocation === "function") {
                result = await api.getAllLocation(); // GET /match/location/getAll
            } else if (typeof api.request === "function") {
                result = await api.request("/match/location/getAll", { method: "GET" });
            } else {
                result = [];
            }
            setLocations(normalizeLocationList(result));
        } catch (e) {
            setLocError(prettyError(e, "Failed to load locations"));
        }
    }, []);

    const addLocation = useCallback(async (newLoc) => {
        const name = String(newLoc || "").trim();
        if (!name) return;
        if (locations.some((x) => norm(x) === norm(name))) return;
        try {
            await api.createLocation(name); // POST /match/location/create/{name}
            await fetchLocations();         // refresh
        } catch (e) {
            alert(prettyError(e, "Failed to add location"));
        }
    }, [locations, fetchLocations]);

    const fetchMatches = useCallback(async () => {
        setLoading(true);
        setLoadError("");
        try {
            const res = await api.getMatchAll();
            const raw = Array.isArray(res) ? res : res?.data ?? [];
            const mapped = raw.map(coerceMatch).filter(Boolean);
            setMatches(mapped);

            const idMap = {};
            const myBestName = norm(myName || myUsername);
            for (const m of mapped) {
                const hasMeById = currentUserId && m.players.some((p) => String(p.id) === String(currentUserId));
                const hasMeByUsername = myUsername && m.players.some((p) => norm(p.username) === norm(myUsername));
                const hasMeByName = myBestName && m.players.some((p) => norm(p.name) === myBestName);
                if (hasMeById || hasMeByUsername || hasMeByName) idMap[m.id] = true;
            }
            setJoinedByMe((prev) => ({ ...prev, ...idMap }));
        } catch (e) {
            setLoadError(prettyError(e, "Failed to load matches"));
        } finally {
            setLoading(false);
        }
    }, [currentUserId, myUsername, myName]);

    useEffect(() => { fetchMatches(); }, [fetchMatches]);
    useEffect(() => { fetchLocations(); }, [fetchLocations]);

    /* -------- helpers -------- */
    const isJoined = useCallback(
        (m) => {
            if (!m) return false;
            if (m.id && joinedByMe[m.id] != null) return !!joinedByMe[m.id];
            if (!Array.isArray(m.players)) return false;
            const myBestName = norm(myName || myUsername);
            return (
                (currentUserId && m.players.some((p) => String(p.id) === String(currentUserId))) ||
                (myUsername && m.players.some((p) => norm(p.username) === norm(myUsername))) ||
                (myBestName && m.players.some((p) => norm(p.name) === myBestName))
            );
        },
        [joinedByMe, currentUserId, myUsername, myName]
    );

    function applyLocalMembership(matchId, action) {
        setMatches((prev) => {
            const idx = prev.findIndex((m) => String(m.id) === String(matchId));
            if (idx === -1) return prev;
            const target = prev[idx];

            const next = prev.slice();
            const clone = { ...target, players: [...(target.players || [])] };

            if (action === "add") {
                const already =
                    clone.players.some((p) => String(p.id) === String(currentUserId)) ||
                    clone.players.some((p) => norm(p.username) === norm(myUsername)) ||
                    clone.players.some((p) => norm(p.name) === norm(myName || myUsername));
                if (!already) {
                    clone.players.push({
                        id: currentUserId || `me-${randKey()}`,
                        name: myName || myUsername || "You",
                        username: myUsername || "",
                        status: "JOINED",
                    });
                }
            } else {
                clone.players = clone.players.filter(
                    (p) =>
                        String(p.id) !== String(currentUserId) &&
                        norm(p.username) !== norm(myUsername) &&
                        norm(p.name) !== norm(myName || myUsername)
                );
            }

            next[idx] = clone;
            return next;
        });

        setJoinedByMe((prev) => ({ ...prev, [matchId]: action === "add" }));
    }

    async function handleJoin(matchId) {
        if (!matchId || !/^\w+$/.test(String(matchId))) {
            alert("This match has no server id yet. Save it first.");
            return;
        }
        if (pending[matchId]) return;
        setPending((p) => ({ ...p, [matchId]: true }));

        applyLocalMembership(matchId, "add");

        try {
            await api.join(matchId);
            await fetchMatches();
        } catch (e) {
            if (e?.status === 409) {
                await fetchMatches();
            } else {
                // 👇 NEW: if not authorized, send to /join (preserve return URL)
                if (e?.status === 401) {
                    const next = encodeURIComponent(window.location.pathname + window.location.search);
                    window.location.href = `/join?next=${next}`;
                    return;
                }
                applyLocalMembership(matchId, "remove");
                alert(prettyError(e, "Failed to join match"));
            }
        } finally {
            setPending((p) => { const n = { ...p }; delete n[matchId]; return n; });
        }
    }


    async function handleLeave(matchId) {
        if (!matchId || !/^\w+$/.test(String(matchId))) {
            alert("This match has no server id yet.");
            return;
        }
        if (pending[matchId]) return;
        setPending((p) => ({ ...p, [matchId]: true }));

        applyLocalMembership(matchId, "remove");

        try {
            await api.leave(matchId);
            await fetchMatches();
        } catch (e) {
            applyLocalMembership(matchId, "add");
            alert(prettyError(e, "Failed to leave match"));
        } finally {
            setPending((p) => { const n = { ...p }; delete n[matchId]; return n; });
        }
    }

    async function deleteMatch(data) {
        const raw =
            (typeof data === "object" && data !== null)
                ? (data.id ?? data.matchId ?? data.match_id ?? data.uuid ?? data.matchUUID)
                : data;

        const id = raw != null ? String(raw) : "";
        if (!id) {
            alert("Missing match id.");
            return;
        }

        if (pending[id]) return;
        setPending((p) => ({ ...p, [id]: true }));

        try {
            await api.deleteMatch(id);
            setMatches((prev) => prev.filter((m) => String(m.id) !== id));
        } catch (e) {
            alert(prettyError(e, "Failed to delete match"));
        } finally {
            setPending((p) => { const n = { ...p }; delete n[id]; return n; });
        }
    }


    // Create fields (required + optional)
    const [cFirstName, setCFirstName] = useState("");
    const [cLastName, setCLastName] = useState("");
    const [cUsername, setCUsername] = useState("");
    const [cPassword, setCPassword] = useState("");
    const [cDisplayName, setCDisplayName] = useState("");
    const [cRole, setCRole] = useState("USER"); // dropdown
    const [cEmail, setCEmail] = useState("");
    const [cPhone, setCPhone] = useState("");
    const [cChatId, setCChatId] = useState("");

    // Update fields
    const [uId, setUId] = useState("");
    const [uFirstName, setUFirstName] = useState("");
    const [uLastName, setULastName] = useState("");
    const [uUsername, setUUsername] = useState("");
    const [uPassword, setUPassword] = useState("");
    const [uDisplayName, setUDisplayName] = useState("");
    const [uRole, setURole] = useState("ROLE_USER");
    const [uEmail, setUEmail] = useState("");
    const [uPhone, setUPhone] = useState("");
    const [uChatId, setUChatId] = useState("");

    const fetchUsers = useCallback(async () => {
        if (!isAdmin) return;
        setUsersLoading(true);
        setUsersError("");
        try {
            const res = await api.getAllUsers(); // GET /auth/user/getAll
            const list = Array.isArray(res) ? res : (res?.data ?? []);
            setUsers(list);
        } catch (e) {
            setUsersError(prettyError(e, "Failed to load users"));
        } finally {
            setUsersLoading(false);
        }
    }, [isAdmin]);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    function requireFields(list) {
        for (const [val, name] of list) {
            if (!String(val || "").trim()) return `${name} is required`;
        }
        return "";
    }

    function onSelectUser(u) {
        const id = String(u?.id ?? u?.userId ?? "");
        setUId(id);
        setUFirstName(u?.firstName ?? "");
        setULastName(u?.lastName ?? "");
        setUUsername(u?.username ?? "");
        setUPassword(""); // admin must set a new password explicitly
        setUDisplayName(u?.displayName ?? "");
        setURole(toDropdownRole(u));
        setUEmail(u?.email ?? "");
        setUPhone(u?.phoneNumber ?? "");
        setUChatId(u?.chatId ?? "");
    }

    async function onCreateUser() {
        setAdminMsg("");
        const missing = requireFields([
            [cFirstName, "First name"],
            [cLastName, "Last name"],
            [cUsername, "Username"],
            [cPassword, "Password"],
            [cDisplayName, "Display name"],
            [cRole, "Role"]
        ]);
        if (missing) { setAdminMsg(missing); return; }

        const body = {
            firstName: cFirstName.trim(),
            lastName: cLastName.trim(),
            username: cUsername.trim(),
            password: cPassword,              // backend encodes
            displayName: cDisplayName.trim(),
            roles: [cRole],                   // ["ROLE_USER"] or ["ROLE_ADMIN"]
            // optional:
            email: cEmail.trim() || undefined,
            phoneNumber: cPhone.trim() || undefined,
            chatId: cChatId.trim() || undefined,
        };

        setAdminBusy(true);
        try {
            await api.createUser(body);       // POST /auth/user/register
            setAdminMsg("User created successfully.");
            setCFirstName(""); setCLastName(""); setCUsername("");
            setCPassword(""); setCDisplayName(""); setCRole("ROLE_USER");
            setCEmail(""); setCPhone(""); setCChatId("");
            await fetchUsers();
        } catch (e) {
            setAdminMsg(prettyError(e, "Create user failed"));
        } finally {
            setAdminBusy(false);
        }
    }

    async function onDeleteUser(id) {
        setAdminMsg("");
        if (!String(id || "").trim()) { setAdminMsg("User ID is required"); return; }
        setAdminBusy(true);
        try {
            await api.DeleteUser(String(id).trim()); // POST /auth/user/delete/{id}
            setAdminMsg("User deleted successfully.");
            if (String(uId) === String(id)) {
                // clear update form if you deleted the same user
                setUId(""); setUFirstName(""); setULastName(""); setUUsername("");
                setUPassword(""); setUDisplayName(""); setURole("ROLE_USER");
                setUEmail(""); setUPhone(""); setUChatId("");
            }
            await fetchUsers();
        } catch (e) {
            setAdminMsg(prettyError(e, "Delete user failed"));
        } finally {
            setAdminBusy(false);
        }
    }

    async function onUpdateUser() {
        setAdminMsg("");
        const missing = requireFields([
            [uId, "User ID"],
            [uFirstName, "First name"],
            [uLastName, "Last name"],
            [uUsername, "Username"],
            [uPassword, "Password"],
            [uDisplayName, "Display name"],
            [uRole, "Role"]
        ]);
        if (missing) { setAdminMsg(missing); return; }

        const body = {
            id: String(uId).trim(),
            firstName: uFirstName.trim(),
            lastName: uLastName.trim(),
            username: uUsername.trim(),
            password: uPassword,                // backend encodes
            displayName: uDisplayName.trim(),
            roles: [uRole],                     // ["ROLE_USER"] or ["ROLE_ADMIN"]
            // optional:
            email: uEmail.trim() || undefined,
            phoneNumber: uPhone.trim() || undefined,
            chatId: uChatId.trim() || undefined,
        };

        setAdminBusy(true);
        try {
            await api.UpdateUser(body);         // POST /auth/user/update
            setAdminMsg("User updated successfully.");
            await fetchUsers();
        } catch (e) {
            setAdminMsg(prettyError(e, "Update user failed"));
        } finally {
            setAdminBusy(false);
        }
    }

    /* -------- UI -------- */
    if (loading) {
        return (
            <FootballLoader
                fullscreen
                label="Loading matches…"
                hint="Fetching latest from server"
            />
        );
    }

    return (
        <div className="min-h-screen w-full overflow-x-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-900">
            <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8 py-6 md:py-10">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 flex items-center justify-center rounded-full bg-yellow-400 text-slate-900 font-bold shadow-md">
                            👋
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                            Welcome back,
                            <span className="text-yellow-400 ml-2">{greetingName}</span>
                        </h1>
                    </div>
                </div>

                {!!loadError && (
                    <div className="rounded-2xl border border-red-700/40 bg-red-900/30 p-4 text-red-100 mb-6">
                        {loadError}
                    </div>
                )}

                {!!locError && (
                    <div className="rounded-xl border border-yellow-700/30 bg-yellow-900/20 p-3 text-yellow-100 mb-4 text-sm">
                        {locError}
                    </div>
                )}


                {/* ==================== Main Content ==================== */}
                    {/* Match List */}
                    <div className="md:col-span-2 space-y-6 w-full max-w-full">
                        {matches.length === 0 ? (
                            <div className="rounded-2xl border border-slate-700 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 shadow-lg">
                                <div className="py-10 sm:py-12 text-center text-base sm:text-lg text-slate-300 px-4 break-words">
                                    No matches yet — create one to get started.
                                </div>
                            </div>
                        ) : (
                            matches.map((m) => (
                                <div key={m._key} className="w-full max-w-full">
                                    <MatchCard
                                        match={{ ...m, _pending: !!pending[m.id] }}
                                        currentUserId={currentUserId}
                                        isJoined={isJoined}
                                        onJoin={(idFromCard) => {
                                            const id = idFromCard || m.id;
                                            if (!m.ephemeral) handleJoin(id);
                                            else alert("Save the match first");
                                        }}
                                        onLeave={(idFromCard) => {
                                            const id = idFromCard || m.id;
                                            handleLeave(id);
                                        }}
                                        onDelete={() => deleteMatch(m.id)}
                                        onShare={() => {
                                            if (!m.id) {
                                                alert("Save the match first to get a shareable link.");
                                                return;
                                            }
                                            const url = new URL(window.location.href);
                                            url.searchParams.set("match", m.id);
                                            navigator.clipboard?.writeText(url.toString());
                                            alert("Sharable join link copied!");
                                        }}
                                        onKick={() => alert("Implement kick() on backend and hook here")}
                                    />
                                </div>
                            ))
                        )}
                    </div>

            </div>


            {/* small css helpers for inputs */}
            <style jsx>{`
                .input {
                    border-radius: 0.75rem;
                    background: rgba(2,6,23,0.7);
                    border: 1px solid rgb(51 65 85);
                    padding: 0.5rem 0.75rem;
                    color: #e5e7eb;
                    outline: none;
                    width: 100%;
                }
                .input:focus {
                    box-shadow: 0 0 0 2px rgba(250,204,21,0.35);
                    border-color: rgb(148 163 184);
                }
            `}</style>
        </div>
    );
}
