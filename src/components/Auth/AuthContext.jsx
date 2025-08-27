// src/auth/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../../api/real.js";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null); // null=unknown, false=guest/unauth

    const refresh = async () => {
        setLoading(true);
        try {
            const me = await api.me();
            setUser(me || false);
        } catch {
            setUser(false);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { refresh(); }, []);

    const value = {
        user,
        loading,
        login: async (credentials) => {
            const res = await api.login(credentials); // ✅ unified name
            await refresh();
            return res;
        },
        logout: async () => {
            try { await api.logout?.(); } catch { /* empty */ }
            try { localStorage.removeItem("accessToken"); } catch { /* empty */ }
            setUser(false);
        },
        refresh,
    };

    return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthCtx);
