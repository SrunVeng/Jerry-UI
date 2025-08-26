import React from "react";
import Header from "./header.jsx";
import UserPage from "./page.jsx";
import Footer from "./footer.jsx";

export default function Home() {
    return (
        <div className="min-h-screen">
            <Header />
            <UserPage />
            <Footer />
        </div>
    );
}
