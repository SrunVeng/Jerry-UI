"use client";

// src/app/football/page.jsx
import React, { useEffect, useState } from "react";
import MatchForm from "../../components/MatchForm.jsx";
import MatchCard from "../../components/MatchCard.jsx";
import { loadMatches, saveMatches, uid } from "../../lib/match";

export default function FootballSignupApp() {
    const [myName, setMyName] = useState("");
    const [matches, setMatches] = useState([]);
    const [form, setForm] = useState({
        title: "Jerry FC Match",
        date: new Date().toISOString().slice(0, 10),
        time: "18:00",
        location: "Local Stadium",
        locationUrl: "",
        maxPlayers: 12,
        notes: "Bring water and wear turf shoes.",
    });
    const [locations, setLocations] = useState([
        "Local Stadium",
        "Community Field",
        "School Ground",
    ]);

    useEffect(() => {
        setMatches(loadMatches());
        setMyName("Player" + Math.floor(Math.random() * 1000));

        // support magic join link: ?match=ID&join=Name
        const params = new URLSearchParams(window.location.search);
        const joinName = params.get("join");
        const matchId = params.get("match");
        if (joinName && matchId) {
            handleJoin(matchId, joinName);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        saveMatches(matches);
    }, [matches]);

    const isJoined = (m) =>
        myName && m.players.some((p) => p.toLowerCase() === (myName || "").toLowerCase());

    function createMatch() {
        const m = {
            id: uid(),
            title: (form.title || "").trim() || "Jerry FC Match",
            date: form.date,
            time: form.time,
            location: (form.location || "").trim(),
            locationUrl: (form.locationUrl || "").trim(),
            maxPlayers: Math.max(2, Number(form.maxPlayers) || 12),
            notes: (form.notes || "").trim(),
            players: [],
            createdAt: Date.now(),
        };
        setMatches((prev) => [...prev, m]);
    }

    function addLocation(newLoc) {
        if (newLoc && !locations.includes(newLoc)) {
            setLocations((prev) => [...prev, newLoc]);
        }
    }

    function deleteMatch(id) {
        setMatches((prev) => prev.filter((m) => m.id !== id));
    }

    function handleJoin(matchId, name) {
        const cleanName = (name ?? myName).trim();
        if (!cleanName) return;

        setMatches((prev) =>
            prev.map((m) => {
                if (m.id !== matchId) return m;
                if (m.players.some((p) => p.toLowerCase() === cleanName.toLowerCase())) return m;
                return { ...m, players: [...m.players, cleanName] };
            })
        );
    }

    function handleLeave(matchId) {
        const cleanName = (myName || "").trim();
        if (!cleanName) return;

        setMatches((prev) =>
            prev.map((m) =>
                m.id === matchId
                    ? {
                        ...m,
                        players: m.players.filter(
                            (p) => p.toLowerCase() !== cleanName.toLowerCase()
                        ),
                    }
                    : m
            )
        );
    }

    function shareJoinLink(m) {
        const url = new URL(window.location.href);
        url.searchParams.set("match", m.id);
        url.searchParams.set("join", myName || "YourName");

        // clipboard with fallback
        if (navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(url.toString());
            alert("Sharable join link copied! Paste it in Telegram.");
        } else {
            const ta = document.createElement("textarea");
            ta.value = url.toString();
            document.body.appendChild(ta);
            ta.select();
            document.execCommand("copy");
            document.body.removeChild(ta);
            alert("Sharable join link copied! Paste it in Telegram.");
        }
    }

    return (
        <div className="min-h-screen w-full overflow-x-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-900">
            <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8 py-6 md:py-10">

                <div className="mt-8 grid grid-cols-1 gap-6 md:gap-8 md:grid-cols-3">
                    {/* Create Match */}
                    <div className="md:col-span-1 w-full max-w-full">
                        <MatchForm
                            form={form}
                            setForm={setForm}
                            locations={locations}
                            addLocation={addLocation}
                            onCreate={createMatch}
                        />
                    </div>

                    {/* Match List */}
                    <div className="md:col-span-2 space-y-6 w-full max-w-full">
                        {matches.length === 0 ? (
                            <div className="rounded-2xl border border-slate-700 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 shadow-lg">
                                <div className="py-10 sm:py-12 text-center text-base sm:text-lg text-slate-300 px-4 break-words">
                                    No matches yet — create one to get started.
                                </div>
                            </div>
                        ) : (
                            matches.map((m) => (
                                <div key={m.id} className="w-full max-w-full">
                                    <MatchCard
                                        match={m}
                                        isJoined={isJoined}
                                        onJoin={handleJoin}
                                        onLeave={handleLeave}
                                        onDelete={deleteMatch}
                                        onShare={shareJoinLink}
                                    />
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
