import React from "react";

export default function Footer() {
    return (
        <footer className="w-full bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-t border-yellow-500/20">
            <div className="mx-auto max-w-screen-xl px-4 py-4 text-center">
                <p className="text-xs text-slate-400">
                    © {new Date().getFullYear()}{" "}
                    <span className="font-semibold text-yellow-400">Jerry FC</span> • Local Match Signup
                </p>
            </div>
        </footer>
    );
}
