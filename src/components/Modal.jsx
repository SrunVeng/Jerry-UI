// components/Modal.jsx
'use client';

import React from "react";
import { createPortal } from "react-dom";

export default function Modal({ open, onClose, children }) {
    const [mounted, setMounted] = React.useState(false);
    React.useEffect(() => setMounted(true), []);
    if (!mounted || !open) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60"
            onClick={onClose}
        >
            <div
                className="max-h-[90vh] overflow-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {children}
            </div>
        </div>,
        document.body
    );
}
