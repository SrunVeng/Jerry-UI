import React from "react";

export default function Header() {
    return (
        <header className="w-full bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-yellow-500/20 shadow-lg shadow-black/30">
            <div className="mx-auto max-w-screen-xl flex items-center justify-between px-6 py-4">
                {/* Left: Logo + Title */}
                <div className="flex items-center gap-3">
                    <img
                        src="https://res.cloudinary.com/dayrc0f7r/image/upload/v1755757391/IMG_1547_tejn31.png"
                        alt="Jerry FC Logo"
                        className="h-12 sm:h-14 w-auto object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]"
                    />
                    <span className="text-2xl sm:text-3xl font-extrabold tracking-wider text-yellow-400 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
    Jerry FT
  </span>
                </div>

            </div>
        </header>
    );
}
