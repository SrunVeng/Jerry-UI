import React, { useMemo, useState } from "react";

export default function MatchForm({ form, setForm, locations, addLocation, onCreate }) {
    const [newLoc, setNewLoc] = useState("");
    const canCreate = useMemo(() => {
        return (form.title || "").trim() && (form.location || "").trim();
    }, [form]);

    function handleCreate(e) {
        e.preventDefault();
        onCreate();
    }

    return (
        <div className="rounded-2xl bg-slate-800/80 border border-slate-700 shadow-xl backdrop-blur-md">
            {/* Card Header */}
            <div className="flex items-center gap-3 px-5 pt-5">
                <div>
                    <h2 className="text-xl font-bold text-yellow-400 tracking-tight">Create New Match</h2>
                    <p className="text-slate-300 text-xs">Quickly set up a match and invite your friends</p>
                </div>
            </div>

            <form onSubmit={handleCreate} className="p-5 pb-6 space-y-4">
                {/* Title */}
                <div>
                    <label className="text-sm text-white font-medium">Title</label>
                    <input
                        className="mt-1 w-full rounded-xl bg-slate-900/60 border border-slate-700 px-3 py-2 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/40"
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        placeholder="e.g. Jerry FC vs Community"
                    />
                </div>

                {/* Date / Time */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm text-white font-medium">Date</label>
                        <input
                            type="date"
                            className="mt-1 w-full rounded-xl bg-slate-900/60 border border-slate-700 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-yellow-400/40"
                            value={form.date}
                            onChange={(e) => setForm({ ...form, date: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="text-sm text-white font-medium">Time</label>
                        <input
                            type="time"
                            className="mt-1 w-full rounded-xl bg-slate-900/60 border border-slate-700 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-yellow-400/40"
                            value={form.time}
                            onChange={(e) => setForm({ ...form, time: e.target.value })}
                        />
                    </div>
                </div>

                {/* Location select + add new */}
                <div className="space-y-2">
                    <label className="text-sm text-white font-medium">Location</label>
                    <select
                        className="w-full rounded-xl bg-slate-900/60 border border-slate-700 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-yellow-400/40"
                        value={form.location}
                        onChange={(e) => setForm({ ...form, location: e.target.value })}
                    >
                        {locations.map((loc) => (
                            <option key={loc} value={loc}>{loc}</option>
                        ))}
                    </select>

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
                                addLocation(v);
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

                {/* Google Map URL */}
                <div>
                    <label className="text-sm text-white font-medium">Google Map URL (optional)</label>
                    <div className="mt-1 flex gap-2">
                        <input
                            className="flex-1 rounded-xl bg-slate-900/60 border border-slate-700 px-3 py-2 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/40"
                            value={form.locationUrl}
                            onChange={(e) => setForm({ ...form, locationUrl: e.target.value })}
                            placeholder="https://maps.google.com/…"
                        />
                        {form.locationUrl?.trim() ? (
                            <a
                                href={form.locationUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-xl border border-yellow-500/50 bg-yellow-400 text-slate-900 px-3 py-2 font-medium hover:bg-yellow-300 active:scale-[.98] transition"
                            >
                                Open
                            </a>
                        ) : null}
                    </div>
                </div>

                {/* Players & Notes */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm text-white font-medium">Max Players</label>
                        <input
                            type="number"
                            min={2}
                            className="mt-1 w-full rounded-xl bg-slate-900/60 border border-slate-700 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-yellow-400/40"
                            value={form.maxPlayers}
                            onChange={(e) => setForm({ ...form, maxPlayers: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="text-sm text-white font-medium">Notes</label>
                        <input
                            className="mt-1 w-full rounded-xl bg-slate-900/60 border border-slate-700 px-3 py-2 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/40"
                            value={form.notes}
                            onChange={(e) => setForm({ ...form, notes: e.target.value })}
                            placeholder="Bring water…"
                        />
                    </div>
                </div>

                {/* Create Button */}
                <div className="pt-1">
                    <button
                        type="submit"
                        disabled={!canCreate}
                        className={`w-full inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 font-semibold transition active:scale-[.99] ${
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
                </div>
            </form>
        </div>
    );
}
