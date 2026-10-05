import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/nutrileading-logo.png.asset.json";
import symbol from "@/assets/connexions-symbol.png.asset.json";
import { weekSummary } from "@/lib/week";
import { imageSrc } from "@/lib/library";
import litteratureImg from "@/assets/home/litterature.jpg";
import santeImg from "@/assets/home/sante.jpg";
import { Apple, BookOpen, ChefHat, Cpu, Landmark, Leaf, Map as MapIcon, Microscope, Newspaper, Palette, Sparkles, Stethoscope, Trophy } from "lucide-react";
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
  const [week, setWeek] = useState<{ sessions: number; minutes: number; days: number } | null>(null);
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

  const ICON: Record<string, typeof Apple> = { sante: Apple, medecine: Stethoscope, sciences: Microscope, histoire: Landmark, art: Palette, geographie: MapIcon, actualite: Newspaper, nature: Leaf, litterature: BookOpen, technologie: Cpu, cuisine: ChefHat, sport: Trophy };
  const ids = interestsOf(topics).filter((x) => !x.startsWith("autre:") && x !== "actualite");
  const myIds = ids.length ? ids : DEFAULT_INTERESTS.filter((x) => x !== "actualite");
  const label = (id: string) => INTERESTS.find((x) => x.id === id)?.label ?? id;
  const short = (id: string) => label(id).split(" &")[0]!;
  const other = otherInterest(topics);
  const QUOTES = ["Faire vivre ses connaissances.", "La curiosité se cultive.", "Chaque mot retrouvé compte.", "Réfléchir, comprendre, transmettre.", "Votre expérience reste une richesse."];
  const quote = QUOTES[Math.floor(Date.now() / 864e5) % QUOTES.length]!;
  const img = (id: string) => imageSrc(id) ?? "";
  const startLink = { to: configured ? "/seance" : "/interets", search: configured ? {} : { next: "seance" as const } } as const;

  return (
    <main className="relative flex min-h-screen flex-col bg-background">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5 md:px-8">
        <Link to="/" className="flex items-center gap-3">
          <img src={symbol.url} alt="" className="h-10 w-auto" />
          <span className="font-serif text-2xl">Connexions</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm font-medium">
          {[
            { to: "/interets" as const, label: "Centres d'intérêt", search: { next: undefined } },
            { to: (state === "in" ? "/aidant" : "/auth") as "/aidant" | "/auth", label: state === "in" ? "Vos progrès" : "Mon espace", search: undefined },
          ].map((l) => (
            <Link key={l.label} to={l.to} search={l.search as never} className="rounded-full px-4 py-2 text-muted-foreground transition hover:bg-brand-soft hover:text-brand">
              {l.label}
            </Link>
          ))}
        </nav>
      </header>

      {/* HERO */}
      <section className="paper-grain">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-6 pb-20 pt-10 md:grid-cols-[1.15fr_1fr] md:px-8 md:pt-16">
          <div className="animate-rise">
            <p className="text-sm font-medium capitalize text-muted-foreground">
              {today}
              {state === "in" && <span className="normal-case"> · Bonjour {name}</span>}
            </p>
            <img src={symbol.url} alt="" className="mt-6 h-24 w-auto md:h-28" />
            <h1 className="mt-4 text-7xl leading-[0.9] tracking-tight md:text-8xl">Connexions</h1>
            <p className="mt-3 flex items-center gap-2 text-base text-muted-foreground">
              by <img src={logo.url} alt="" className="h-5 w-5" /> <span className="font-bold text-foreground">Nutrileading</span>
            </p>
            <p className="mt-10 text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
              Comprendre. <span className="text-brand">Retrouver.</span> S'exprimer.
            </p>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Des séances quotidiennes pour mobiliser ses connaissances, exercer son langage et nourrir sa curiosité à partir de sujets qui vous intéressent.
            </p>


            {/* Aujourd'hui */}
            <div className="mt-10 max-w-xl rounded-3xl border-l-4 border-brand bg-card p-6 shadow-lg">
              <div className="flex flex-wrap items-center justify-between gap-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand">Aujourd'hui · 10 minutes</p>
                  <p className="mt-2 text-base text-muted-foreground">Votre séance explorera</p>
                  <p className="mt-1 text-xl font-semibold">{myIds.slice(0, 3).map(short).join(" · ")}</p>
                </div>
                <Link {...startLink} className="inline-flex items-center rounded-full bg-primary px-10 py-5 text-xl font-semibold text-primary-foreground shadow-md transition hover:-translate-y-0.5 hover:opacity-95">
                  Commencer
                </Link>
              </div>
              {state === "out" && <p className="mt-4 text-sm text-muted-foreground">Sans compte, la séance n'est pas enregistrée.</p>}
            </div>
            <p className="mt-5 flex items-center gap-2 text-base font-medium text-muted-foreground">
              <Sparkles className="h-4 w-4 text-brand" /> {quote}
            </p>
          </div>

          {/* Sélection éditoriale : 1 carte principale + 4 secondaires alignées */}
          <div className="hidden md:block" aria-hidden>
            <div className="grid grid-cols-2 gap-4">
              {[
                { src: img("monet"), label: "Art", pos: "object-center", main: true },
                { src: img("astronomy"), label: "Sciences", pos: "object-center" },
                { src: img("rome"), label: "Histoire", pos: "object-center" },
                { src: litteratureImg, label: "Littérature", pos: "object-[50%_70%]" },
                { src: santeImg, label: "Santé", pos: "object-[35%_60%]" },
              ].map((c) => (
                <figure key={c.label} className={c.main ? "col-span-2" : ""}>
                  <div className={`overflow-hidden rounded-2xl bg-muted shadow-md ${c.main ? "aspect-[16/8]" : "aspect-[4/3]"}`}>
                    <img src={c.src} alt="" className={`h-full w-full object-cover ${c.pos} transition duration-500 hover:scale-[1.03]`} />
                  </div>
                  <figcaption className="mt-2.5 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-foreground">
                    <span className="h-px w-4 bg-brand" />
                    {c.label}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* COMPRENDRE / RETROUVER / S'EXPRIMER — magazine, asymétrique */}
      <section className="bg-card">
        <div className="mx-auto w-full max-w-6xl px-6 py-24 md:px-8">
          <div className="grid gap-6 md:grid-cols-12">
            <article className="group relative overflow-hidden rounded-3xl bg-background p-8 md:col-span-7 md:row-span-2">
              <span className="absolute left-0 top-8 h-14 w-1.5 rounded-r bg-brand" />
              <p className="text-sm font-bold text-brand">01</p>
              <h2 className="mt-2 font-serif text-6xl md:text-7xl">Comprendre</h2>
              <p className="mt-4 max-w-sm text-lg text-muted-foreground">Écouter une idée et en saisir l'essentiel.</p>
              <img src={img("newspaper")} alt="" className="mt-8 aspect-[16/9] w-full rounded-2xl object-cover transition duration-500 group-hover:scale-[1.02]" />
            </article>
            <article className="group flex gap-5 rounded-3xl border bg-background p-6 transition hover:border-brand md:col-span-5">
              <img src={img("glasses")} alt="" className="h-28 w-24 shrink-0 rounded-xl object-cover" />
              <div>
                <p className="text-sm font-bold text-brand">02</p>
                <h2 className="mt-1 text-3xl font-sans font-semibold tracking-tight">Retrouver</h2>
                <p className="mt-2 text-base text-muted-foreground">Mobiliser ses connaissances et son vocabulaire.</p>
              </div>
            </article>
            <article className="group rounded-3xl bg-brand-soft p-6 transition hover:-translate-y-1 md:col-span-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-brand">03</p>
                  <h2 className="mt-1 text-3xl font-sans font-semibold tracking-tight">S'exprimer</h2>
                  <p className="mt-2 text-base text-muted-foreground">Donner son avis, expliquer, reformuler.</p>
                </div>
                <img src={img("consultation")} alt="" className="h-24 w-24 shrink-0 rounded-full object-cover ring-4 ring-background" />
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* CENTRES D'INTÉRÊT — visuels */}
      <section className="paper-grain">
        <div className="mx-auto w-full max-w-6xl px-6 py-24 md:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand">Vos centres d'intérêt</p>
              <h2 className="mt-3 font-sans text-4xl font-semibold leading-tight tracking-tight md:text-5xl">Vos séances partent de ce qui vous passionne.</h2>
            </div>
            <Link to="/interets" search={{ next: undefined }} className="rounded-full border-2 border-brand px-6 py-2.5 text-base font-semibold text-brand transition hover:bg-brand hover:text-primary-foreground">
              Modifier
            </Link>
          </div>
          <ul className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {myIds.map((id) => {
              const Icon = ICON[id] ?? Sparkles;
              return (
                <li key={id} className="group rounded-2xl border bg-card p-5 transition hover:-translate-y-1 hover:border-brand hover:shadow-lg">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand transition group-hover:bg-brand group-hover:text-primary-foreground">
                    <Icon className="h-5 w-5" strokeWidth={1.75} />
                  </span>
                  <p className="mt-4 text-lg font-semibold">{label(id)}</p>
                </li>
              );
            })}
            {other && (
              <li className="rounded-2xl border border-dashed bg-card p-5">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted text-muted-foreground"><Sparkles className="h-5 w-5" /></span>
                <p className="mt-4 text-lg font-semibold">{other}</p>
              </li>
            )}
          </ul>
        </div>
      </section>

      {/* CETTE SEMAINE — chaleureux */}
      {state === "in" && week && week.sessions > 0 && (
        <section className="bg-card">
          <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-10 px-6 py-16 md:px-8">
            <div className="relative h-24 w-24">
              <svg viewBox="0 0 36 36" className="h-24 w-24 -rotate-90">
                <circle cx="18" cy="18" r="15.5" fill="none" className="stroke-muted" strokeWidth="3" />
                <circle cx="18" cy="18" r="15.5" fill="none" className="stroke-brand" strokeWidth="3" strokeLinecap="round" strokeDasharray={`${Math.min(100, (week.days / 7) * 100)} 100`} pathLength={100} />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-2xl font-semibold">{week.days}/7</span>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand">Cette semaine</p>
              <p className="mt-2 text-2xl font-semibold">
                {week.sessions} séance{week.sessions > 1 ? "s" : ""} · {week.minutes} minutes · {week.days} jour{week.days > 1 ? "s" : ""} actif{week.days > 1 ? "s" : ""}
              </p>
              {week.sessions >= 3 && <p className="mt-1 text-lg text-muted-foreground">Belle régularité.</p>}
            </div>
          </div>
        </section>
      )}

      {/* MANIFESTE */}
      <section className="bg-brand-soft">
        <div className="mx-auto w-full max-w-6xl px-6 py-24 text-center md:px-8">
          <img src={symbol.url} alt="" className="mx-auto h-16 w-auto" />
          <p className="mt-6 font-serif text-4xl leading-tight md:text-6xl">
            Relier ce que l'on <span className="text-brand">entend</span>, ce que l'on sait et ce que l'on exprime.
          </p>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">Comprendre, retrouver, s'exprimer — à partir de ce qui vous passionne.</p>
          <p className="mt-8 text-sm font-semibold uppercase tracking-[0.25em] text-brand">Connexions by Nutrileading</p>
        </div>
      </section>

      <footer className="bg-background">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-4 px-6 py-12 text-center md:px-8">
          <img src={logo.url} alt="Nutrileading" className="h-9 w-9" />
          <p className="text-base text-muted-foreground">Une initiative Nutrileading, inspirée par le parcours du Dr Hafid Halhol.</p>

        </div>
      </footer>
    </main>
  );
}
