import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import morning from "@/assets/library/morning.jpg";
import logo from "@/assets/nutrileading-logo.png.asset.json";
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
  const PILLARS = [
    ["Comprendre", "Écouter une idée et en saisir l'essentiel."],
    ["Retrouver", "Mobiliser ses connaissances et son vocabulaire."],
    ["S'exprimer", "Donner son avis, expliquer, reformuler."],
    ["Progresser", "Des séances qui s'ajustent, à votre rythme."],
  ];

  return (
    <main className="paper-grain relative flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-8 py-6">
        <img src={logo.url} alt="Nutrileading" className="h-11 w-11" />
        <Link to={state === "in" ? "/aidant" : "/auth"} className="text-sm text-muted-foreground underline-offset-4 hover:underline">
          Connexion
        </Link>
      </header>

      <section className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-14 px-8 pb-20 pt-6 md:grid-cols-[1.1fr_1fr]">
        <div className="animate-rise">
          <p className="text-base capitalize text-muted-foreground">
            {today}
            {state === "in" && <span className="normal-case"> · Bonjour {name}</span>}
          </p>
          <h1 className="mt-8 text-7xl leading-[0.95] tracking-tight md:text-8xl">Connexions</h1>
          <p className="mt-4 text-lg font-medium tracking-wide text-brand">by Nutrileading</p>
          <p className="mt-10 font-serif text-3xl leading-snug md:text-4xl">
            Comprendre. Retrouver.<br />S'exprimer.
          </p>
          <div className="mt-12">
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
        <div className="animate-rise overflow-hidden rounded-[2rem] shadow-2xl [animation-delay:150ms]">
          <img src={morning} alt="Lever du soleil sur les toits de Paris" className="aspect-[4/5] w-full object-cover" />
        </div>
      </section>

      <section className="bg-card/60">
        <div className="mx-auto w-full max-w-6xl px-8 py-28">
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-brand">Connexions</p>
          <h2 className="mt-5 max-w-3xl text-5xl leading-[1.05] md:text-6xl">Faire travailler l'esprit à partir de ce qui vous intéresse.</h2>
          <p className="mt-8 max-w-2xl text-xl leading-relaxed text-muted-foreground">
            Chaque jour, quelques activités courtes : écouter une information, retrouver un mot, donner son avis,
            expliquer un concept. Une seule à la fois, sans chronomètre, sans note et sans pression.
          </p>

          <ul className="mt-20 grid gap-5 sm:grid-cols-2">
            {PILLARS.map(([title, text]) => (
              <li key={title} className="rounded-3xl border bg-background p-10 shadow-sm">
                <h3 className="font-sans text-sm font-semibold uppercase tracking-[0.25em] text-brand">{title}</h3>
                <p className="mt-5 font-serif text-3xl leading-snug">{text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section>
        <div className="mx-auto w-full max-w-6xl px-8 py-28">
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-brand">Vos centres d'intérêt</p>
          <h2 className="mt-5 max-w-3xl text-5xl leading-[1.05] md:text-6xl">Entretenir sa curiosité.</h2>
          <p className="mt-8 max-w-2xl text-xl leading-relaxed text-muted-foreground">
            Les séances s'appuient sur les sujets que vous aimez, pour réactiver des connaissances familières et faire
            appel à votre expérience.
          </p>
          <ul className="mt-12 flex max-w-4xl flex-wrap gap-3">
            {INTEREST_LIST.map((t) => (
              <li key={t} className="rounded-full border bg-card px-5 py-2.5 text-lg">{t}</li>
            ))}
          </ul>
        </div>
      </section>

      <footer className="border-t border-border/70">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-4 px-8 py-12 text-center">
          <img src={logo.url} alt="" className="h-9 w-9 opacity-90" />
          <p className="font-serif text-lg italic text-muted-foreground">
            Une initiative Nutrileading, inspirée par le parcours du Dr Hafid Halhol.
          </p>
        </div>
      </footer>
    </main>
  );
}
