// src/auth/PrivateRoute.jsx
import { Navigate, Outlet } from "react-router-dom";
import FootballLoader from "../../components/FootballLoader";
import { useAuth } from "./AuthContext";

export default function PrivateRoute() {
    const { loading, user } = useAuth();

    if (loading) return <FootballLoader fullscreen label="" hint="" />;
    if (!user) return <Navigate to="/auth" replace />;

    return <Outlet />;
}
