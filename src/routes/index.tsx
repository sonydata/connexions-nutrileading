import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import morning from "@/assets/library/morning.jpg";
import { todayGoal, weekLine, weekSummary } from "@/lib/week";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Écoute — un moment d'écoute chaque jour" },
      { name: "description", content: "Dix minutes d'écoute par jour : nutrition, culture, vie pratique et repères du temps, dans un cadre calme et adulte." },
      { property: "og:title", content: "Écoute — un moment d'écoute chaque jour" },
      { property: "og:description", content: "Dix minutes d'écoute par jour, calmes et intelligentes." },
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

  return (
    <main className="paper-grain relative flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-8 py-6">
        <span className="font-serif text-2xl">Écoute</span>
        {state === "in" && (
          <Link to="/aidant" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
            Suivi
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
          <p className="text-lg capitalize text-muted-foreground">{today}</p>
          <p className="mt-4 font-serif text-5xl italic text-muted-foreground md:text-6xl">Bonjour {name}</p>
          <h1 className="mt-3 text-4xl leading-[1.12] md:text-5xl">Une séance d'écoute chaque jour</h1>
          <p className="mt-6 font-serif text-3xl italic text-muted-foreground">On commence ?</p>
          {state === "in" && (
            <div className="mt-8 space-y-1 text-lg text-muted-foreground">
              <p>{todayGoal().label}</p>
              {week && <p>{week}</p>}
            </div>
          )}
          <div className="mt-10">
            <Link to="/seance" className="inline-flex items-center rounded-full bg-primary px-14 py-6 text-2xl font-medium text-primary-foreground shadow-lg transition hover:opacity-90">
              Commencer
            </Link>
            {state === "out" && <p className="mt-4 text-base text-muted-foreground">Sans compte, la séance n'est pas enregistrée.</p>}
          </div>
        </div>
        <div className="animate-rise overflow-hidden rounded-3xl shadow-2xl [animation-delay:150ms]">
          <img src={morning} alt="Lever du soleil sur les toits de Paris" className="aspect-[4/5] w-full object-cover" />
        </div>
      </section>

      <section className="border-t border-border/70">
        <div className="mx-auto w-full max-w-6xl px-8 py-20">
          <h2 className="font-serif text-3xl leading-tight md:text-4xl">Ce que propose Écoute</h2>
          <p className="mt-6 max-w-3xl text-xl leading-relaxed text-muted-foreground">
            Écoute est une application d'écoute quotidienne&nbsp;: chaque jour, une séance d'une quinzaine d'activités
            courtes, soit une dizaine de minutes. On écoute une phrase, on donne son avis, on retrouve un mot, puis on
            le redit à voix haute. Une seule activité à la fois, en grands caractères, sans chronomètre et sans note.
          </p>
          <ul className="mt-12 grid gap-x-10 gap-y-9 md:grid-cols-2">
            {[
              [
                "Nutrition et alimentation",
                "Protéines, fibres, glucides, lipides, micronutriments, hydratation, régime méditerranéen.",
              ],
              [
                "Votre avis de praticien",
                "Mini-cas du quotidien et conseils à donner à un patient fictif.",
              ],
              [
                "Sciences et culture médicale",
                "Ce qu'un terme désigne vraiment, son origine, la culture scientifique et générale.",
              ],
              [
                "Repères du temps et organisation",
                "Jours, saisons, horaires et organisation de la journée.",
              ],
              [
                "Mots et formulation",
                "Retrouver le mot juste, l'entendre, le reformuler, le répéter.",
              ],
            ].map(([title, text]) => (
              <li key={title} className="border-l border-border/70 pl-6">
                <h3 className="text-2xl">{title}</h3>
                <p className="mt-2 text-lg leading-relaxed text-muted-foreground">{text}</p>
              </li>
            ))}
          </ul>
          <p className="mt-12 max-w-3xl text-lg leading-relaxed text-muted-foreground">
            Une page discrète conserve une trace de la régularité et de l'évolution des réponses, sans jamais
            afficher de résultat pendant la séance.
          </p>
        </div>
      </section>
    </main>
  );
}
