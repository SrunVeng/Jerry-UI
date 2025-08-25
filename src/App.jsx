import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./app/football/home.jsx";
import AuthPage from "./app/football/AuthPage.jsx";


export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/" element={<Home />} />
                {/* other routes */}
            </Routes>
        </BrowserRouter>
    );
}
