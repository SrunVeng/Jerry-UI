// import { useEffect, useState } from "react";
//
// function getGuestIdentity() {
//     try {
//         return JSON.parse(localStorage.getItem("guestIdentity"));
//     } catch {
//         return null;
//     }
// }
//
// export default function GuestGate({ children }) {
//     const [guest, setGuest] = useState(getGuestIdentity());
//     const [input, setInput] = useState("");
//
//     useEffect(() => {
//         if (guest) {
//             // Optionally call backend to register guest identity
//             fetch("/api/auth/guest", {
//                 method: "POST",
//                 headers: {"Content-Type": "application/json"},
//                 credentials: "include", // so server can set cookie
//                 body: JSON.stringify(guest),
//             })
//                 .then((r) => {
//                     if (!r.ok) throw new Error("Guest auth failed");
//                     return r.json(); // or .text() if your backend just returns 200 OK with no body
//                 })
//                 .then((data) => {
//                     console.log("Guest registered:", data);
//                     // update local state, continue to main app
//                 })
//                 .catch((err) => {
//                     console.error("Guest auth error:", err);
//                 });
//
//             if (guest) {
//                 return children; // already identified → show main app
//             }
//
//             return (
//                 <div className="flex flex-col items-center justify-center h-screen bg-slate-900 text-white">
//                     <h1 className="text-lg font-bold mb-4">Enter your name to join as Guest</h1>
//                     <input
//                         className="rounded-xl px-3 py-2 text-black"
//                         value={input}
//                         onChange={(e) => setInput(e.target.value)}
//                         placeholder="Your name"
//                     />
//                     <button
//                         onClick={() => {
//                             if (!input.trim()) return;
//                             const g = {
//                                 id: crypto.randomUUID(),
//                                 displayName: input.trim(),
//                                 source: "guest"
//                             };
//                             localStorage.setItem("guestIdentity", JSON.stringify(g));
//                             setGuest(g);
//                         }}
//                         className="mt-3 px-4 py-2 bg-yellow-400 text-slate-900 rounded-xl"
//                     >
//                         Continue
//                     </button>
//                 </div>
//             );
//         }
//     }
// }
