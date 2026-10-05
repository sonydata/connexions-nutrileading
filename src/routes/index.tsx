import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/nutrileading-logo.png.asset.json";
import { weekSummary } from "@/lib/week";
import { DEFAULT_INTERESTS, GUEST_KEY, INTERESTS, hasInterests, interestsOf, otherInterest } from "@/lib/interests";

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
  const [week, setWeek] = useState<{ sessions: number; minutes: number } | null>(null);
  const [topics, setTopics] = useState<string[]>([]);
  const [configured, setConfigured] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        const g = localStorage.getItem(GUEST_KEY);
        setConfigured(!!g);
        try {
          setTopics(JSON.parse(g ?? "[]"));
        } catch {}
        return setState("out");
      }
      const { data: s } = await supabase.from("caregiver_settings").select("patient_name, topics").eq("user_id", data.user.id).maybeSingle();
      if (s?.patient_name) setName(s.patient_name);
      setConfigured(hasInterests(s?.topics ?? []));
      setTopics(s?.topics ?? []);
      setState("in");
      weekSummary().then(setWeek).catch(() => {});
    });
  }, []);

  const today = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  const label = (id: string) => INTERESTS.find((x) => x.id === id)?.label;
  const mine = [...interestsOf(topics).map(label).filter((x): x is string => !!x), otherInterest(topics)].filter(Boolean);
  const chips = mine.length ? mine : DEFAULT_INTERESTS.map(label).filter((x): x is string => !!x);
  const PILLARS = [
    ["Comprendre", "Écouter une idée et en saisir l'essentiel."],
    ["Retrouver", "Mobiliser ses connaissances et son vocabulaire."],
    ["S'exprimer", "Donner son avis, expliquer, reformuler."],
  ];
  const Eyebrow = ({ children }: { children: React.ReactNode }) => (
    <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.3em] text-brand">
      <span className="h-px w-8 bg-brand" />
      {children}
    </p>
  );

  return (
    <main className="paper-grain relative flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-8 py-6">
        <img src={logo.url} alt="Nutrileading" className="h-10 w-10" />
        <nav className="flex items-center gap-6 text-sm text-muted-foreground">
          <Link to="/interets" search={{ next: undefined }} className="underline-offset-4 hover:text-brand hover:underline">Vos centres d'intérêt</Link>
          <Link to={state === "in" ? "/aidant" : "/auth"} className="underline-offset-4 hover:text-brand hover:underline">Connexion</Link>
        </nav>
      </header>

      {/* HERO — éditorial, sans grande photo */}
      <section className="mx-auto w-full max-w-5xl px-8 pb-24 pt-14 md:pt-20 animate-rise">
        <p className="text-base capitalize text-muted-foreground">
          {today}
          {state === "in" && <span className="normal-case"> · Bonjour {name}</span>}
        </p>
        <h1 className="mt-8 text-7xl leading-[0.92] tracking-tight md:text-[8.5rem]">Connexions</h1>
        <p className="mt-4 flex items-center gap-3 text-lg font-medium text-brand">
          <span className="h-px w-10 bg-brand" />
          by Nutrileading
        </p>
        <p className="mt-12 max-w-3xl font-serif text-4xl leading-tight md:text-5xl">
          Comprendre. <span className="text-brand">Retrouver.</span> S'exprimer.
        </p>
        <p className="mt-6 max-w-2xl text-xl leading-relaxed text-muted-foreground">
          Des séances quotidiennes pour mobiliser vos connaissances, votre langage et votre curiosité à partir des sujets qui vous intéressent.
        </p>
        <div className="mt-12 flex flex-wrap items-center gap-6">
          <Link
            to={configured ? "/seance" : "/interets"}
            search={configured ? {} : { next: "seance" as const }}
            className="inline-flex items-center rounded-full bg-primary px-14 py-6 text-2xl font-medium text-primary-foreground shadow-lg transition hover:opacity-90"
          >
            Commencer
          </Link>
          <span className="flex items-center gap-2 text-lg text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-brand animate-breathe" />
            10 minutes aujourd'hui
          </span>
        </div>
        {state === "out" && <p className="mt-4 text-base text-muted-foreground">Sans compte, la séance n'est pas enregistrée.</p>}
      </section>

      {/* BLOC 2 — Comprendre / Retrouver / S'exprimer */}
      <section className="border-t border-border/70">
        <div className="mx-auto grid w-full max-w-5xl gap-px overflow-hidden px-8 py-20 md:grid-cols-3">
          {PILLARS.map(([title, text], k) => (
            <div key={title} className={`py-6 md:px-8 ${k > 0 ? "md:border-l md:border-border/70" : "md:pl-0"}`}>
              <span className="font-serif text-lg text-brand">0{k + 1}</span>
              <h2 className="mt-3 font-sans text-sm font-semibold uppercase tracking-[0.3em]">{title}</h2>
              <p className="mt-4 font-serif text-3xl leading-snug">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* BLOC 3 — Vos centres d'intérêt */}
      <section className="bg-card/70">
        <div className="mx-auto w-full max-w-5xl px-8 py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <Eyebrow>Vos centres d'intérêt</Eyebrow>
              <h2 className="mt-4 text-4xl leading-tight md:text-5xl">Vos séances partent de ce qui vous passionne.</h2>
            </div>
            <Link to="/interets" search={{ next: undefined }} className="text-lg font-medium text-brand underline-offset-4 hover:underline">Modifier</Link>
          </div>
          <ul className="mt-10 flex flex-wrap gap-3">
            {chips.map((c) => (
              <li key={c} className="rounded-full border border-brand/30 bg-background px-5 py-2.5 text-lg">{c}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* BLOC 4 — Cette semaine (discret) */}
      {state === "in" && week && (
        <section className="mx-auto w-full max-w-5xl px-8 pt-20">
          <div className="max-w-sm rounded-2xl border bg-card p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Cette semaine</p>
            <p className="mt-2 font-serif text-3xl">
              {week.sessions} séance{week.sessions > 1 ? "s" : ""} · {week.minutes} min
            </p>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${Math.min(100, (week.sessions / 7) * 100)}%` }} />
            </div>
          </div>
        </section>
      )}

      {/* BLOC 5 — Manifeste */}
      <section className="mx-auto w-full max-w-5xl px-8 py-28 text-center">
        <span className="mx-auto block h-px w-16 bg-brand" />
        <p className="mt-10 font-serif text-5xl italic leading-tight md:text-6xl">Faire vivre ses connaissances.</p>
      </section>

      <footer className="border-t border-border/70">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-4 px-8 py-12 text-center">
          <img src={logo.url} alt="" className="h-9 w-9 opacity-90" />
          <p className="font-serif text-lg italic text-muted-foreground">
            Une initiative Nutrileading, inspirée par le parcours du Dr Hafid Halhol.
          </p>
        </div>
      </footer>
    </main>
  );
}
