import { useEffect } from "react";

const BOT = import.meta.env.VITE_TELEGRAM_BOT;

export default function TelegramWidget({ onAuth }) {
    useEffect(() => {
        if (!BOT) {
            console.error("VITE_TELEGRAM_BOT is missing");
            return;
        }

        // Global callback the widget calls with tgUser
        window.onTelegramAuth = (user) => {
            // user shape: { id, first_name, last_name, username, photo_url?, auth_date, hash }
            onAuth?.(user);
        };

        const container = document.getElementById("tg-login-container");
        if (!container) return;

        // inject the official widget
        const s = document.createElement("script");
        s.src = "https://telegram.org/js/telegram-widget.js?22";
        s.async = true;
        s.setAttribute("data-telegram-login", BOT);
        s.setAttribute("data-size", "large");
        s.setAttribute("data-userpic", "false");
        s.setAttribute("data-request-access", "write"); // optional
        s.setAttribute("data-onauth", "onTelegramAuth(user)"); // calls window.onTelegramAuth(user)
        container.appendChild(s);

        return () => {
            s.remove();
            delete window.onTelegramAuth;
        };
    }, [onAuth]);

    // The widget renders its own button inside
    return <div id="tg-login-container" />;
}
