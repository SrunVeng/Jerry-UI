import React, { useMemo, useState } from "react";

const HOME_TEAM = "Jerry FC";

export default function MatchForm({ form, setForm, locations = [], addLocation, onCreate }) {
    const [newLoc, setNewLoc] = useState("");
    const [touched, setTouched] = useState(false);

    const canCreate = useMemo(() => {
        const opponent = (form.opponent || "").trim();
        const location = (form.location || "").trim();
        const date = (form.date || "").trim();
        const time = (form.time || "").trim();
        return opponent && location && date && time;
    }, [form]);

    function handleCreate(e) {
        e.preventDefault();
        setTouched(true);
        if (!canCreate) return;

        const opponent = (form.opponent || "").trim();
        const clean = {
            // id can be added by parent if needed
            title: `${HOME_TEAM} vs ${opponent}`,
            date: (form.date || "").trim(),
            time: (form.time || "").trim(),
            location: (form.location || "").trim(),
            maxPlayers: Math.max(2, Number(form.maxPlayers) || 12),
            notes: (form.notes || "").trim(),
        };

        onCreate?.(clean);
    }

    const showErr = (field) => touched && !(form[field] || "").trim();

    return (
        <div className="rounded-2xl bg-slate-800/80 border border-slate-700 shadow-xl backdrop-blur-md">
            {/* Card Header */}
            <div className="px-5 pt-5 space-y-1">
                <h2 className="text-xl font-bold text-yellow-400 tracking-tight">Create New Match</h2>
                <p className="text-slate-300 text-xs">Quickly set up a match and invite your friends</p>

            </div>

            <form onSubmit={handleCreate} className="p-5 pb-6 space-y-4">
                {/* Opponent */}
                <div>
                    <label className="text-sm text-white font-medium">Opponent Team</label>
                    <input
                        className={`mt-1 w-full rounded-xl bg-slate-900/60 border px-3 py-2 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 ${
                            showErr("opponent")
                                ? "border-red-600 focus:ring-red-500/40"
                                : "border-slate-700 focus:ring-yellow-400/40"
                        }`}
                        value={form.opponent || ""}
                        onChange={(e) => setForm({ ...form, opponent: e.target.value })}
                        placeholder="e.g. Community United"
                    />
                    {showErr("opponent") && <p className="mt-1 text-xs text-red-300">Opponent is required.</p>}
                </div>

                {/* Date / Time */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm text-white font-medium">Date</label>
                        <input
                            type="date"
                            className={`mt-1 w-full rounded-xl bg-slate-900/60 border px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 ${
                                showErr("date")
                                    ? "border-red-600 focus:ring-red-500/40"
                                    : "border-slate-700 focus:ring-yellow-400/40"
                            }`}
                            value={form.date || ""}
                            onChange={(e) => setForm({ ...form, date: e.target.value })}
                        />
                        {showErr("date") && <p className="mt-1 text-xs text-red-300">Date is required.</p>}
                    </div>
                    <div>
                        <label className="text-sm text-white font-medium">Time</label>
                        <input
                            type="time"
                            className={`mt-1 w-full rounded-xl bg-slate-900/60 border px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 ${
                                showErr("time")
                                    ? "border-red-600 focus:ring-red-500/40"
                                    : "border-slate-700 focus:ring-yellow-400/40"
                            }`}
                            value={form.time || ""}
                            onChange={(e) => setForm({ ...form, time: e.target.value })}
                        />
                        {showErr("time") && <p className="mt-1 text-xs text-red-300">Time is required.</p>}
                    </div>
                </div>

                {/* Location select + add new */}
                <div className="space-y-2">
                    <label className="text-sm text-white font-medium">Location</label>
                    <select
                        className={`w-full rounded-xl bg-slate-900/60 border px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 ${
                            showErr("location")
                                ? "border-red-600 focus:ring-red-500/40"
                                : "border-slate-700 focus:ring-yellow-400/40"
                        }`}
                        value={form.location || ""}
                        onChange={(e) => setForm({ ...form, location: e.target.value })}
                    >
                        {form.location ? null : (
                            <option value="" disabled>
                                — Select a location —
                            </option>
                        )}
                        {locations.map((loc) => (
                            <option key={loc} value={loc}>
                                {loc}
                            </option>
                        ))}
                    </select>
                    {showErr("location") && <p className="text-xs text-red-300">Location is required.</p>}

                    <div className="flex gap-2">
                        <input
                            className="flex-1 rounded-xl bg-slate-900/60 border border-slate-700 px-3 py-2 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/40"
                            value={newLoc}
                            onChange={(e) => setNewLoc(e.target.value)}
                            placeholder="Add new location…"
                        />
                        <button
                            type="button"
                            onClick={() => {
                                const v = (newLoc || "").trim();
                                if (!v) return;
                                addLocation?.(v);
                                setForm({ ...form, location: v });
                                setNewLoc("");
                            }}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2 text-slate-100 hover:bg-slate-800 active:scale-[.98] transition"
                            title="Add location"
                        >
                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                                <path d="M11 11V5a1 1 0 1 1 2 0v6h6a1 1 0 1 1 0 2h-6v6a1 1 0 1 1-2 0v-6H5a1 1 0 1 1 0-2h6z" />
                            </svg>
                            Add
                        </button>
                    </div>
                </div>

                {/* Max Players */}
                <div>
                    <label className="text-sm text-white font-medium">Max Players</label>
                    <input
                        type="number"
                        min={2}
                        className="mt-1 w-full rounded-xl bg-slate-900/60 border border-slate-700 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-yellow-400/40"
                        value={form.maxPlayers ?? 12}
                        onChange={(e) => setForm({ ...form, maxPlayers: e.target.value })}
                    />
                    <p className="mt-1 text-[11px] text-slate-400">Minimum is 2. Default is 12.</p>
                </div>

                {/* Notes */}
                <div>
                    <label className="text-sm text-white font-medium">Notes</label>
                    <textarea
                        rows={4}
                        className="mt-1 w-full rounded-xl bg-slate-900/60 border border-slate-700 px-3 py-2 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/40 resize-y"
                        value={form.notes || ""}
                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                        placeholder="Bring water, extra balls, jerseys..."
                    />
                    <div className="mt-1 text-[11px] text-slate-500 text-right">
                        {(form.notes || "").length} chars
                    </div>
                </div>

                {/* Create / Reset */}
                <div className="pt-1 flex flex-wrap gap-2">
                    <button
                        type="submit"
                        disabled={!canCreate}
                        className={`flex-1 inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 font-semibold transition active:scale-[.99] ${
                            canCreate
                                ? "bg-yellow-400 text-slate-900 hover:bg-yellow-300 shadow-lg shadow-yellow-500/10"
                                : "bg-slate-700 text-slate-400 cursor-not-allowed"
                        }`}
                        title="Create match"
                    >
                        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                            <path d="M11 11V5a1 1 0 1 1 2 0v6h6a1 1 0 1 1 0 2h-6v6a1 1 0 1 1-2 0v-6H5a1 1 0 1 1 0-2h6z" />
                        </svg>
                        Create Match
                    </button>

                    <button
                        type="button"
                        onClick={() =>
                            setForm({
                                opponent: "",
                                date: "",
                                time: "",
                                location: "",
                                maxPlayers: 12,
                                notes: "",
                            })
                        }
                        className="px-4 py-3 rounded-2xl border border-slate-700 bg-slate-900/60 text-slate-100 hover:bg-slate-800 active:scale-[.99] transition"
                        title="Reset form"
                    >
                        Reset
                    </button>
                </div>
            </form>
        </div>
    );
}
