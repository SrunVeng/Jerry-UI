// App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "./app/football/home.jsx";
import AuthPage from "./app/football/AuthPage.jsx";
import { api } from "./api/real.js";

function PrivateRoute({ children }) {
    return api.isAuthenticated() ? children : <Navigate to="/" replace />;
}

// If already logged in, redirect to /home; else render children (AuthPage)
function PublicOnly({ children }) {
    return api.isAuthenticated() ? <Navigate to="/home" replace /> : children;
}

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                {/* Public login, hidden from logged-in users */}
                <Route
                    path="/"
                    element={
                        <PublicOnly>
                            <AuthPage />
                        </PublicOnly>
                    }
                />

                {/* Protected home */}
                <Route
                    path="/home"
                    element={
                        <PrivateRoute>
                            <Home />
                        </PrivateRoute>
                    }
                />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}
