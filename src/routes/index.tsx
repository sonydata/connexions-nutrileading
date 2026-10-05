import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import morning from "@/assets/library/morning.jpg";
import { todayGoal, weekLine, weekSummary } from "@/lib/week";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Connexions by Nutrileading — Comprendre. Retrouver. S'exprimer." },
      { name: "description", content: "Une séance quotidienne pour comprendre, retrouver ses connaissances et s'exprimer, à partir de sujets qui vous intéressent." },
      { property: "og:title", content: "Connexions by Nutrileading — Comprendre. Retrouver. S'exprimer." },
      { property: "og:description", content: "Comprendre. Retrouver. S'exprimer. Des séances courtes adaptées à vos centres d'intérêt." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [state, setState] = useState<"loading" | "out" | "in">("loading");
  const [name, setName] = useState("Hafid");
  const [week, setWeek] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return setState("out");
      const { data: s } = await supabase.from("caregiver_settings").select("patient_name").eq("user_id", data.user.id).maybeSingle();
      if (s?.patient_name) setName(s.patient_name);
      setState("in");
      weekSummary().then((w) => setWeek(weekLine(w))).catch(() => {});
    });
  }, []);

  const today = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  const INTEREST_LIST = ["Santé & nutrition", "Sciences", "Médecine", "Histoire", "Art & culture", "Géographie & voyages", "Actualité", "Nature", "Littérature", "Technologie", "Cuisine", "Sport"];

  return (
    <main className="paper-grain relative flex min-h-screen flex-col">
      <header className="flex items-center justify-end px-8 py-6">
        {state === "in" && (
          <Link to="/aidant" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
            Connexion
          </Link>
        )}
        {state === "out" && (
          <Link to="/auth" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
            Connexion
          </Link>
        )}
      </header>
      <section className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-12 px-8 pb-16 md:grid-cols-2">
        <div className="animate-rise">
          <p className="text-lg capitalize text-muted-foreground">
            {today}
            {state === "in" && <span className="normal-case"> · Bonjour {name}</span>}
          </p>
          <h1 className="mt-6 text-6xl leading-none md:text-7xl">Connexions</h1>
          <p className="mt-3 font-serif text-2xl italic text-muted-foreground">by Nutrileading</p>
          <p className="mt-8 text-2xl">Comprendre. Retrouver. S'exprimer.</p>
          <div className="mt-10">
            <Link to="/seance" className="inline-flex items-center rounded-full bg-primary px-14 py-6 text-2xl font-medium text-primary-foreground shadow-lg transition hover:opacity-90">
              Commencer
            </Link>
            {state === "out" && <p className="mt-4 text-base text-muted-foreground">Sans compte, la séance n'est pas enregistrée.</p>}
            {state === "in" && (
              <div className="mt-6 space-y-1 text-lg text-muted-foreground">
                <p>{todayGoal().label}</p>
                {week && <p>{week}</p>}
              </div>
            )}
          </div>
        </div>
        <div className="animate-rise overflow-hidden rounded-3xl shadow-2xl [animation-delay:150ms]">
          <img src={morning} alt="Lever du soleil sur les toits de Paris" className="aspect-[4/5] w-full object-cover" />
        </div>
      </section>

      <section className="border-t border-border/70">
        <div className="mx-auto w-full max-w-6xl px-8 py-20">
          <h2 className="font-serif text-3xl leading-tight md:text-4xl">Connexions</h2>
          <p className="mt-6 max-w-3xl text-xl leading-relaxed text-muted-foreground">
            Une expérience quotidienne conçue pour stimuler la compréhension, la réflexion, la mémoire des connaissances
            et l'expression orale à partir de sujets qui vous intéressent réellement.
          </p>
          <p className="mt-4 max-w-3xl text-xl leading-relaxed text-muted-foreground">
            Chaque séance propose quelques activités courtes : écouter une information, comprendre une idée, retrouver un
            mot, donner son avis, expliquer un concept ou reformuler une réponse.
          </p>

          <h3 className="mt-14 text-2xl">Des séances adaptées à vos centres d'intérêt</h3>
          <ul className="mt-5 flex max-w-4xl flex-wrap gap-2">
            {INTEREST_LIST.map((t) => (
              <li key={t} className="rounded-full border bg-card px-4 py-2 text-base">{t}</li>
            ))}
          </ul>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted-foreground">
            Les exercices sont ensuite adaptés à ces thèmes afin de mobiliser des connaissances familières et de rendre
            les séances plus intéressantes et plus motivantes.
          </p>

          <ul className="mt-14 grid gap-x-10 gap-y-9 md:grid-cols-2">
            {[
              ["Comprendre", "Écouter une information, identifier son sens, suivre une idée ou comprendre une courte situation."],
              ["Retrouver ses connaissances", "Mobiliser son vocabulaire, ses connaissances et son expérience à travers des questions adaptées à ses centres d'intérêt."],
              ["S'exprimer", "Trouver le mot juste, donner son avis, expliquer une idée, reformuler et parler à voix haute."],
              ["Progresser", "Les séances s'adaptent progressivement aux réussites et aux difficultés, tout en valorisant l'effort, la participation et la régularité."],
            ].map(([title, text]) => (
              <li key={title} className="border-l border-border/70 pl-6">
                <h3 className="text-2xl">{title}</h3>
                <p className="mt-2 text-lg leading-relaxed text-muted-foreground">{text}</p>
              </li>
            ))}
          </ul>
          <p className="mt-12 max-w-3xl text-lg leading-relaxed text-muted-foreground">
            Une seule activité à la fois, sans chronomètre, sans note et sans pression.
          </p>
        </div>
      </section>

      <footer className="border-t border-border/70 px-8 py-10 text-center">
        <p className="font-serif text-lg italic text-muted-foreground">
          Une initiative Nutrileading, inspirée par le parcours du Dr Hafid Halhol.
        </p>
      </footer>
    </main>
  );
}
