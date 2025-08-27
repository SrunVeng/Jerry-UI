// src/components/F footballLoader.jsx
import React from "react";

/**
 * FootballLoader
 * Props:
 *  - fullscreen: boolean (default false)
 *  - label: string (accessible text under the spinner)
 *  - hint: string (small helper text)
 */
export default function FootballLoader({
                                           fullscreen = false,
                                           label = "Loading…",
                                           hint = "Please wait while we set up your match data",
                                       }) {
    const Wrapper = ({ children }) =>
        fullscreen ? (
            <div className="fixed inset-0 z-50 grid place-items-center bg-gradient-to-b from-slate-950 via-slate-900 to-black/95 backdrop-blur-sm">
                {children}
            </div>
        ) : (
            <div className="flex items-center gap-3">{children}</div>
        );

    return (
        <Wrapper>
            <div className="flex flex-col items-center text-center">
                {/* spinning football */}
                <div
                    className="
            grid place-items-center
            h-20 w-20 sm:h-24 sm:w-24
            rounded-full bg-slate-900/60
            ring-1 ring-slate-700/60 shadow-xl
          "
                >
          <span
              className="
              text-5xl sm:text-6xl
              animate-[spin_1.25s_linear_infinite]
              motion-reduce:animate-none
              drop-shadow
            "
              role="img"
              aria-label="spinning football"
          >
            ⚽
          </span>
                </div>

                {/* label + hint */}
                <div className={fullscreen ? "mt-5" : "ml-1"}>
                    <p className="text-slate-100 font-semibold tracking-wide">
                        {label}
                    </p>
                    {hint ? (
                        <p className="text-xs text-slate-400 mt-1">
                            {hint}
                        </p>
                    ) : null}
                </div>

                {/* subtle progress bar shimmer (pure cosmetic) */}
                {fullscreen && (
                    <div className="mt-6 h-1 w-56 overflow-hidden rounded-full bg-slate-800/60">
                        <div className="h-full w-1/3 rounded-full bg-yellow-400/80 animate-[progress_1.8s_ease-in-out_infinite]"></div>
                    </div>
                )}
            </div>

            {/* keyframes for the progress shimmer */}
            <style>{`
        @keyframes progress {
          0%   { transform: translateX(-120%); }
          50%  { transform: translateX(80%); }
          100% { transform: translateX(220%); }
        }
      `}</style>
        </Wrapper>
    );
}
