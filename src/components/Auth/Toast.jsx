import React from "react";

export default function Toast({ toast }) {
    if (!toast) return null;
    return (
        <div
            className={`fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl text-sm shadow-lg border z-50
      ${toast.type === "error"
                ? "bg-red-900/70 text-red-100 border-red-700"
                : "bg-slate-800/90 text-slate-100 border-slate-700"}`}
        >
            {toast.msg}
        </div>
    );
}
