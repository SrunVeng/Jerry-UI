// Chooses mock or real API at runtime based on .env
const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";

export const api = USE_MOCK
    ? await import("./mock.js").then(m => m.api)
    : await import("./real.js").then(m => m.api);
