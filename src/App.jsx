import { useEffect, useState } from "react";
import FootballLoader from "./FootballLoader.jsx";


export default function App() {
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setLoaded(true), 800);
        return () => clearTimeout(timer);
    }, []);

    return (
        <main className="min-h-screen flex items-center justify-center bg-zinc-900 text-white">
            {!loaded ? (
                <FootballLoader fullscreen label="Loading Please Wait" hint="Fetching data from the server" />
            ) : (
                <figure className="relative w-full max-w-2xl aspect-[4/5] bg-black/30 rounded-2xl overflow-hidden shadow-2xl">
                    <img
                        src="https://en.meming.world/images/en/thumb/7/7f/Polish_Jerry.jpg/300px-Polish_Jerry.jpg"
                        alt="Meme"
                        className="w-full h-full object-cover"
                        draggable={false}
                    />
                    <figcaption className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center text-3xl md:text-5xl font-extrabold uppercase drop-shadow-lg" style={{ WebkitTextStroke: "2px black" }}>
                        HELLO
                    </figcaption>
                </figure>
            )}
        </main>
    );
}
