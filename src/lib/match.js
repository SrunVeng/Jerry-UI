export const KEY_MATCHES = "football.matches.v1";

export function loadMatches() {
    try {
        const raw = localStorage.getItem(KEY_MATCHES);
        if (!raw) return [];
        const list = JSON.parse(raw);
        return list.sort(
            (a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)
        );
    } catch {
        return [];
    }
}

export function saveMatches(list) {
    localStorage.setItem(KEY_MATCHES, JSON.stringify(list));
}

export function uid() {
    return Math.random().toString(36).slice(2, 10);
}

export function fullDate(date, time) {
    const d = new Date(`${date}T${time}:00`);
    return new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(d);
}