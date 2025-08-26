import React from "react";
import Header from "./header.jsx";
import Footer from "./footer.jsx";
import JoinPage from "./JoinPage.jsx";

export default function AuthPage() {
    return (
        <div className="min-h-screen">
            <Header />
            <JoinPage />
            <Footer />
        </div>
    );
}
