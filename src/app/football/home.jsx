import React from "react";
import Header from "./header.jsx";
import FootballSignupApp from "./page.jsx";
import Footer from "./footer.jsx";

export default function Home() {
    return (
        <div className="min-h-screen">
            <Header />
            <FootballSignupApp />
            <Footer />
        </div>
    );
}
