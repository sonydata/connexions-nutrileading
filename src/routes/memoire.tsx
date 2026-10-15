import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { GAMES, MemoryGame, Preview, type Game } from "@/components/memory-games";

// Small, gentle memory games. No timer, no score, nothing saved: the pleasure of finding comes first.
// Pictures come only from the curated library, always with their name written underneath.

export const Route = createFileRoute("/memoire")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({ jeu: ["paires", "disparu", "courses"].includes(s["jeu"] as string) ? (s["jeu"] as Game) : undefined }),
  head: () => ({
    meta: [
      { title: "Jeux de mémoire — Connexions" },
      { name: "description", content: "Petits jeux de mémoire, sans chronomètre ni score : paires, objet disparu, liste de courses." },
      { property: "og:title", content: "Jeux de mémoire — Connexions" },
      { property: "og:description", content: "Petits jeux de mémoire, doux et sans score." },
    ],
  }),
  component: Memoire,
});

function Memoire() {
  const { jeu } = Route.useSearch();
  const [game, setGame] = useState<Game | null>(jeu ?? null);
  return (
    <main className="paper-grain min-h-screen px-6 py-8 md:px-12">
      <header className="mx-auto flex max-w-5xl items-center justify-between">
        <Link to="/" className="font-serif text-2xl">Connexions</Link>
        <Link to="/" className="flex items-center gap-2 rounded-full px-4 py-2 text-lg text-muted-foreground hover:bg-muted">
          <ArrowLeft className="size-5" /> Accueil
        </Link>
      </header>
      {/* Inside a game, the other games stay one tap away. */}
      {game && (
        <nav className="mx-auto mt-6 grid max-w-5xl grid-cols-3 gap-3" aria-label="Changer de jeu">
          {GAMES.map((g) => (
            <button
              key={g.id}
              onClick={() => setGame(g.id)}
              aria-current={game === g.id}
              className={`flex items-center justify-center gap-2 rounded-2xl border-2 px-3 py-3 text-lg font-medium transition md:text-xl ${game === g.id ? `${g.tone} border-primary` : "border-border bg-card text-muted-foreground hover:border-primary"}`}
            >
              <span className="text-2xl" aria-hidden>{g.emoji}</span>
              <span className="hidden sm:inline">{g.title}</span>
            </button>
          ))}
        </nav>
      )}
      <section className="mx-auto mt-8 max-w-5xl animate-rise">
        {!game && (
          <>
            <p className="text-sm font-medium uppercase tracking-[0.25em] text-brand">Stimulation de la mémoire</p>
            <h1 className="mt-4 text-5xl leading-tight md:text-6xl">Jeux de mémoire</h1>
            <p className="mt-5 max-w-2xl text-xl text-muted-foreground">Quelques minutes, à son rythme. Pas de chronomètre, pas de score.</p>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {GAMES.map(({ id, title, text, emoji, preview, tone }) => (
                <button key={id} onClick={() => setGame(id)} className={`flex flex-col items-start gap-4 rounded-3xl border-2 p-7 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary ${tone}`}>
                  <Preview ids={preview} size="size-20" />
                  <span className="font-serif text-3xl"><span aria-hidden>{emoji}</span> {title}</span>
                  <span className="text-lg text-muted-foreground">{text}</span>
                  <span className="mt-auto rounded-full bg-primary px-6 py-2 text-lg text-primary-foreground">Jouer</span>
                </button>
              ))}
            </div>
          </>
        )}
        {game && <MemoryGame game={game} />}
      </section>
    </main>
  );
}

