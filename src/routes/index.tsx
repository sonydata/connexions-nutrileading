import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/nutrileading-logo.png.asset.json";
import symbol from "@/assets/connexions-symbol.png.asset.json";
import { weekSummary } from "@/lib/week";
import { imageSrc } from "@/lib/library";
import litteratureImg from "@/assets/home/litterature.jpg";
import artImg from "@/assets/home/art.jpg";
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
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-lg font-semibold capitalize text-foreground md:text-xl">
          <span className="h-2 w-2 rounded-full bg-brand" aria-hidden />
          {today}
          {state === "in" && <span className="normal-case font-medium text-muted-foreground"> · Bonjour {name}</span>}
        </p>
        <nav className="flex items-center gap-1 text-sm font-medium">
          {[
            { to: "/interets" as const, label: "Mes centres d'intérêt", search: { next: undefined } },
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
        <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-6 pb-20 pt-10 md:grid-cols-[1fr_1.1fr] md:px-8 md:pt-16">
          <div className="animate-rise">
            <img src={symbol.url} alt="" className="h-24 w-auto md:h-28" />
            <h1 className="mt-4 text-7xl leading-[0.9] tracking-tight md:text-8xl">Connexions</h1>
            <p className="mt-4 flex flex-wrap items-center gap-3 text-2xl text-muted-foreground md:text-3xl">
              by <img src={logo.url} alt="" className="h-11 w-11 md:h-12 md:w-12" /> <span className="font-bold text-foreground">Nutrileading</span>
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
              {state === "out" && <p className="mt-4 text-sm text-muted-foreground">Connectez-vous à votre espace, afin d'enregistrer vos progrès.</p>}
            </div>
            <p className="mt-5 flex items-center gap-2 text-base font-medium text-muted-foreground">
              <Sparkles className="h-4 w-4 text-brand" /> {quote}
            </p>
          </div>

          {/* Constellation de sujets reliés par des lignes fines, comme le symbole Connexions */}
          <div className="relative hidden aspect-[10/9] md:block" aria-hidden>
            <svg viewBox="0 0 100 90" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
              <g fill="none" stroke="var(--brand)" strokeWidth="1.1" strokeLinecap="round" opacity="0.6">
                {[
                  "M52 47 C 44 40, 36 34, 30 24",
                  "M52 47 C 62 38, 70 30, 78 20",
                  "M52 47 C 42 54, 30 58, 22 65",
                  "M52 47 C 54 52, 55 55, 56 56",
                  "M52 47 C 64 52, 74 58, 82 67",
                  "M30 24 C 50 6, 64 8, 78 20",
                  "M22 65 C 40 88, 66 90, 82 67",
                ].map((d, i) => (
                  <path key={i} d={d} vectorEffect="non-scaling-stroke" strokeDasharray={i > 4 ? "2 3" : undefined} />
                ))}
              </g>
            </svg>
            {[
              { x: 52, y: 52, s: 14 },
              { x: 41, y: 37, s: 6 }, { x: 66, y: 34, s: 6 }, { x: 36, y: 64, s: 6 },
              { x: 69, y: 64, s: 6 }, { x: 54, y: 9, s: 5 }, { x: 52, y: 96, s: 5 },
            ].map((n, i) => (
              <span
                key={i}
                className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full ${i === 0 ? "border border-brand/50 bg-background" : "bg-brand/70"}`}
                style={{ left: `${n.x}%`, top: `${n.y}%`, width: n.s, height: n.s }}
              >
                {i === 0 && <span className="absolute inset-[3px] rounded-full bg-brand" />}
              </span>
            ))}
            {[
              { src: artImg, label: "Art", pos: "object-[60%_40%]", x: 7, y: 6, w: 44, a: "aspect-[4/3]" },
              { src: img("astronomy"), label: "Sciences", pos: "object-center", x: 66, y: 0, w: 28, a: "aspect-[3/4]" },
              { src: img("rome"), label: "Histoire", pos: "object-center", x: 4, y: 60, w: 32, a: "aspect-[4/3]" },
              { src: litteratureImg, label: "Littérature", pos: "object-[50%_70%]", x: 45, y: 58, w: 21, a: "aspect-[4/5]" },
              { src: santeImg, label: "Santé", pos: "object-center", x: 70, y: 64, w: 28, a: "aspect-[4/3]" },
            ].map((c) => (
              <figure key={c.label} className="absolute transition duration-500 hover:-translate-y-1" style={{ left: `${c.x}%`, top: `${c.y}%`, width: `${c.w}%` }}>
                <div className={`overflow-hidden rounded-2xl bg-card p-1.5 shadow-xl ${c.a}`}>
                  <img src={c.src} alt="" className={`h-full w-full rounded-xl object-cover ${c.pos}`} />
                </div>
                <figcaption className="mt-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-brand">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                  {c.label}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* COMPRENDRE / RETROUVER / S'EXPRIMER — trois piliers de poids égal */}
      <section className="bg-card">
        <div className="mx-auto w-full max-w-6xl px-6 py-24 md:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand">Comment ça marche</p>
          <h2 className="mt-3 font-sans text-4xl font-semibold tracking-tight md:text-5xl">Une séance, trois gestes</h2>
          <p className="mt-3 max-w-2xl text-lg text-muted-foreground">Chaque sujet se déroule comme une courte conversation : on écoute, on retrouve, puis on s'exprime.</p>
          <div className="mt-10 grid items-stretch gap-6 md:grid-cols-[1fr_auto_1fr_auto_1fr]">
            {[
              { n: "01", t: "Écouter", d: "Une idée, une histoire, une situation.", ph: "newspaper" },
              { n: "02", t: "Retrouver", d: "Un mot, une connaissance, un lien.", ph: "glasses" },
              { n: "03", t: "S'exprimer", d: "Un avis, une explication, une formulation.", ph: "consultation" },
            ].flatMap((p, k) => [
              ...(k > 0 ? [<span key={`a${k}`} className="hidden items-center text-3xl text-brand md:flex">→</span>] : []),
              <article key={p.n} className="group flex flex-col rounded-3xl border bg-background p-7 transition hover:-translate-y-1 hover:border-brand hover:bg-brand-soft">
                <div className="flex items-center gap-3">
                  <p className="text-sm font-bold text-brand">{p.n}</p>
                  <span className="h-px flex-1 bg-border transition group-hover:bg-brand/40" />
                </div>
                <h3 className="mt-5 font-sans text-3xl font-semibold tracking-tight md:text-4xl">{p.t}</h3>
                <p className="mt-3 text-base text-muted-foreground">{p.d}</p>
                <img src={img(p.ph)} alt="" className="mt-auto aspect-[16/9] w-full rounded-2xl object-cover pt-7" />
              </article>,
            ])}
          </div>
        </div>
      </section>

      {/* CENTRES D'INTÉRÊT — simple rappel, seul « Modifier » est interactif */}
      <section className="paper-grain">
        <div className="mx-auto w-full max-w-6xl px-6 py-14 md:px-8">
          <div className="flex flex-col gap-5 border-t border-border pt-8 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-sans text-xl font-semibold tracking-tight">Vos centres d'intérêt</h2>
              <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-lg text-muted-foreground">
                {[...myIds.map(label), ...(other ? [other] : [])].map((t, i) => (
                  <span key={t} className="flex items-center gap-3">
                    {i > 0 && <span className="text-brand" aria-hidden>·</span>}
                    <span className="text-foreground">{t}</span>
                  </span>
                ))}
              </p>
            </div>
            <Link to="/interets" search={{ next: undefined }} className="shrink-0 self-start text-base font-semibold text-brand underline underline-offset-4 hover:opacity-80 md:self-center">
              Modifier
            </Link>
          </div>
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
          <img src={logo.url} alt="Nutrileading" className="h-16 w-16" />
          <p className="text-base text-muted-foreground">Une initiative Nutrileading, inspirée par le parcours du Dr Hafid Halhol.</p>

        </div>
      </footer>
    </main>
  );
}
