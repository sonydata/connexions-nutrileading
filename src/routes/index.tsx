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
            Espace aidant
          </Link>
        )}
      </header>
      <section className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-12 px-8 pb-16 md:grid-cols-2">
        <div className="animate-rise">
          <p className="text-lg capitalize text-muted-foreground">{today}</p>
          <h1 className="mt-4 text-6xl leading-[1.05] md:text-7xl">Bonjour {name}</h1>
          <p className="mt-6 font-serif text-3xl italic text-muted-foreground">On commence ?</p>
          {state === "in" && (
            <div className="mt-8 space-y-1 text-lg text-muted-foreground">
              <p>{todayGoal().label}</p>
              {week && <p>{week}</p>}
            </div>
          )}
          <div className="mt-10">
            {state === "in" && (
              <Link to="/seance" className="inline-flex items-center rounded-full bg-primary px-14 py-6 text-2xl font-medium text-primary-foreground shadow-lg transition hover:opacity-90">
                Commencer
              </Link>
            )}
            {state === "out" && (
              <Link to="/auth" className="inline-flex items-center rounded-full bg-primary px-10 py-5 text-xl text-primary-foreground transition hover:opacity-90">
                Connexion
              </Link>
            )}
          </div>
        </div>
        <div className="animate-rise overflow-hidden rounded-3xl shadow-2xl [animation-delay:150ms]">
          <img src={morning} alt="Lever du soleil sur les toits de Paris" className="aspect-[4/5] w-full object-cover" />
        </div>
      </section>
    </main>
  );
}
