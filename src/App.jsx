"use client";

import React from "react";
import FootballSignupApp from "./app/football/page.jsx";
import Header from "./app/football/header.jsx"
import Footer from "./app/football/footer.jsx"


export default function App() {
    return (
        <div className="min-h-screen">
            <Header />
            <FootballSignupApp />
            <Footer />
        </div>
    );
}
