import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/nutrileading-logo.png.asset.json";
import symbol from "@/assets/connexions-symbol.png.asset.json";
import { weekPhrase, weekSummary, type Week } from "@/lib/week";
import { COLLECTIONS, isFresh } from "@/lib/sequences";
import { imageSrc } from "@/lib/library";
import litteratureImg from "@/assets/home/litterature.jpg";
import artImg from "@/assets/home/art.jpg";
import santeImg from "@/assets/home/sante.jpg";
import { Apple, ArrowRight, BookOpen, ChefHat, Cpu, Ear, Landmark, Leaf, Map as MapIcon, MessageCircle, Microscope, Newspaper, Palette, Pencil, Search, Stethoscope, Trophy } from "lucide-react";
import { DEFAULT_INTERESTS, GUEST_KEY, INTERESTS, PREFIX, hasInterests, interestsOf, otherInterest } from "@/lib/interests";

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
  const [week, setWeek] = useState<Week | null>(null);
  const [topics, setTopics] = useState<string[]>([]);
  const [configured, setConfigured] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

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
      setUserId(data.user.id);
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
  const QUOTES = ["Faire vivre ses connaissances.", "La curiosité se cultive.", "Réfléchir, comprendre, transmettre.", "Votre expérience reste une richesse."];
  const quote = QUOTES[Math.floor(Date.now() / 864e5) % QUOTES.length]!;
  const img = (id: string) => imageSrc(id) ?? "";
  const startLink = { to: configured ? "/seance" : "/interets", search: configured ? {} : { next: "seance" as const } } as const;

  async function toggleInterest(id: string) {
    const cur = interestsOf(topics).filter((x) => x !== "actualite");
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    if (!next.length) return;
    const mine = next.map((x) => PREFIX + x);
    const updated = userId ? [...topics.filter((t) => !t.startsWith(PREFIX)), ...mine] : mine;
    setTopics(updated);
    setConfigured(true);
    if (userId) {
      await supabase.from("caregiver_settings").upsert({ user_id: userId, topics: updated, updated_at: new Date().toISOString() });
    } else {
      localStorage.setItem(GUEST_KEY, JSON.stringify(mine));
    }
  }

  return (
    <main className="relative flex min-h-screen flex-col bg-background">
      <header className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-3 px-6 py-5 md:px-8">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-lg font-semibold capitalize text-foreground md:text-xl">
          <span className="h-2 w-2 rounded-full bg-brand" aria-hidden />
          {today}
        </p>
        <nav className="flex flex-wrap items-center justify-end gap-1 text-sm font-medium">
          {state === "in" && (
            <span className="mr-2 flex items-center gap-2 rounded-full border border-border bg-card py-1.5 pl-2 pr-4">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-brand text-xs font-bold text-primary-foreground">{name.charAt(0).toUpperCase()}</span>
              <span className="text-foreground">{name}</span>
            </span>
          )}
          {[
            { to: "/interets" as const, label: "Mes centres d'intérêt", search: { next: undefined } },
            { to: (state === "in" ? "/aidant" : "/auth") as "/aidant" | "/auth", label: state === "in" ? "Vos progrès" : "Mon espace", search: undefined },
          ].map((l) => (
            <Link key={l.label} to={l.to} search={l.search as never} className="rounded-full px-4 py-2 text-muted-foreground transition hover:bg-muted hover:text-primary">
              {l.label}
            </Link>
          ))}
        </nav>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-6 pb-14 pt-6 md:grid-cols-[1fr_1.15fr] md:px-8 md:pt-10">
          <div className="animate-rise">
            <div className="flex items-center gap-4">
              <img src={symbol.url} alt="" className="h-16 w-auto md:h-20" />
              <div>
                <h1 className="font-serif text-5xl leading-none tracking-tight md:text-6xl">Connexions</h1>
                <p className="mt-2 flex items-center gap-2 text-lg text-muted-foreground">
                  by <img src={logo.url} alt="" className="h-8 w-8" /> <span className="font-semibold text-foreground">Nutrileading</span>
                </p>
              </div>
            </div>
            <p className="mt-12 font-serif text-6xl leading-[0.95] tracking-tight md:text-7xl">
              Comprendre.<br />Retrouver.<br />S'exprimer.
            </p>
            <p className="mt-8 max-w-md text-lg leading-relaxed text-muted-foreground">
              Des séances quotidiennes pour mobiliser ses connaissances, exercer son langage et nourrir sa curiosité à partir de sujets qui vous intéressent.
            </p>
            {state === "in" && week?.away && <p className="mt-6 font-serif text-2xl italic">Heureux de vous retrouver.</p>}
            <Link {...startLink} className="mt-9 inline-flex items-center gap-4 rounded-full bg-primary px-12 py-5 text-xl font-semibold text-primary-foreground shadow-lg transition hover:-translate-y-0.5 hover:opacity-95">
              Commencer <ArrowRight className="h-5 w-5" />
            </Link>
            {state === "out" && <p className="mt-4 text-sm text-muted-foreground">Connectez-vous à votre espace, afin d'enregistrer vos progrès.</p>}
          </div>

          {/* Univers de connaissances reliés : anneau fin, nœuds, feuillages discrets */}
          <div className="relative hidden aspect-square md:block" aria-hidden>
            <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full overflow-visible">
              <circle cx="50" cy="52" r="40" fill="var(--sage-soft)" opacity="0.55" />
              <g fill="none" stroke="var(--primary)" strokeWidth="0.35" opacity="0.55">
                <circle cx="50" cy="52" r="44" />
                <path d="M18 32 C 34 40, 44 34, 58 44 S 80 50, 92 60" />
                <path d="M30 80 C 40 64, 56 66, 66 56 S 74 30, 84 22" />
              </g>
              {[[18, 32, 2.2, "var(--primary)"], [58, 44, 1.8, "var(--sage)"], [70, 58, 1.6, "var(--brand)"], [30, 80, 1.6, "var(--sage)"], [92, 60, 2, "var(--primary)"], [84, 22, 1.4, "var(--sage)"]].map(([x, y, r, f], i) => (
                <circle key={i} cx={x as number} cy={y as number} r={r as number} fill={f as string} />
              ))}
              <g fill="var(--sage)" opacity="0.8">
                <path d="M70 2 C 66 6, 66 11, 69 14 C 73 10, 73 6, 70 2 Z" />
                <path d="M76 5 C 72 7, 70 11, 71 14 C 75 12, 77 9, 76 5 Z" />
                <path d="M4 50 C 10 44, 18 44, 22 48 C 16 54, 9 54, 4 50 Z" />
                <path d="M6 60 C 12 57, 18 58, 20 62 C 14 66, 9 65, 6 60 Z" />
              </g>
            </svg>
            {[
              { src: artImg, label: "Art & culture", pos: "object-[60%_40%]", x: 22, y: 6, w: 46, a: "aspect-[3/2]", r: "-1deg" },
              { src: img("astronomy"), label: "Sciences", pos: "object-center", x: 72, y: 18, w: 26, a: "aspect-[3/4]", r: "1.5deg" },
              { src: img("rome"), label: "Histoire", pos: "object-center", x: 6, y: 42, w: 34, a: "aspect-[4/3]", r: "0.5deg" },
              { src: litteratureImg, label: "Littérature", pos: "object-[50%_70%]", x: 36, y: 62, w: 26, a: "aspect-[4/5]", r: "-1.5deg" },
              { src: santeImg, label: "Santé & nutrition", pos: "object-center", x: 64, y: 58, w: 32, a: "aspect-[4/3]", r: "1deg" },
            ].map((c) => (
              <figure key={c.label} className="absolute" style={{ left: `${c.x}%`, top: `${c.y}%`, width: `${c.w}%`, rotate: c.r }}>
                <div className={`relative overflow-hidden rounded-2xl shadow-xl ${c.a}`}>
                  <img src={c.src} alt="" className={`h-full w-full object-cover ${c.pos}`} />
                  <figcaption className="absolute bottom-3 left-3 rounded-full bg-card/95 px-4 py-1.5 text-sm font-semibold text-foreground shadow-sm">{c.label}</figcaption>
                </div>
              </figure>
            ))}
            <p className="absolute -bottom-6 left-0 w-56 rotate-[-4deg] font-serif text-lg italic leading-snug text-muted-foreground">
              {quote}
              <span className="mt-1 block h-px w-20 bg-brand/60" />
            </p>
          </div>
        </div>
      </section>

      {/* AUJOURD'HUI + trois piliers de poids égal */}
      <section className="mx-auto w-full max-w-6xl px-6 md:px-8">
        <div className="grid items-center gap-8 rounded-3xl border bg-card p-6 shadow-md md:grid-cols-[auto_1.3fr_1px_1fr] md:p-8">
          <div className="grid h-32 w-32 place-items-center rounded-2xl bg-sage-soft">
            <img src={symbol.url} alt="" className="h-20 w-auto" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary">Aujourd'hui · 10 minutes</p>
            <p className="mt-2 text-base text-muted-foreground">Votre séance explore</p>
            <p className="mt-1 font-serif text-3xl md:text-4xl">{myIds.slice(0, 3).map(short).join(" · ")}</p>
            <Link {...startLink} className="mt-5 inline-flex items-center gap-3 rounded-full bg-primary px-9 py-4 text-lg font-semibold text-primary-foreground transition hover:opacity-95">
              Commencer la séance <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
          <span className="hidden h-full w-px bg-border md:block" />
          <ul className="space-y-5">
            {[
              { I: Ear, t: "Comprendre", d: "Saisir une idée, une information ou une situation." },
              { I: Search, t: "Retrouver", d: "Mobiliser ses mots, ses connaissances et son expérience." },
              { I: MessageCircle, t: "S'exprimer", d: "Donner son avis, expliquer et reformuler." },
            ].map(({ I, t, d }) => (
              <li key={t} className="flex items-start gap-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sage-soft text-primary"><I className="h-5 w-5" /></span>
                <span>
                  <span className="block text-base font-semibold">{t}</span>
                  <span className="block text-sm text-muted-foreground">{d}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CENTRES D'INTÉRÊT — rappel sobre ; « Modifier » ouvre la sélection */}
      <section className="mx-auto w-full max-w-6xl px-6 py-14 md:px-8">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-serif text-3xl">Vos centres d'intérêt</h2>
          <button onClick={() => setEditing((e) => !e)} className="inline-flex items-center gap-2 text-base font-medium text-foreground hover:text-primary">
            {editing ? "Terminé" : "Modifier"} <Pencil className="h-4 w-4" />
          </button>
        </div>
        {!editing ? (
          <div className="mt-5 flex flex-wrap gap-3">
            {myIds.map((id) => {
              const I = ICON[id] ?? Leaf;
              return (
                <span key={id} className="inline-flex items-center gap-2 rounded-full bg-muted px-5 py-2.5 text-base text-foreground">
                  <I className="h-4 w-4 text-primary" /> {label(id)}
                </span>
              );
            })}
            {other && <span className="rounded-full bg-muted px-5 py-2.5 text-base text-muted-foreground">{other}</span>}
          </div>
        ) : (
          <div className="mt-5">
            <p className="text-base text-muted-foreground">Touchez un sujet pour l'ajouter ou le retirer. <Link to="/interets" search={{ next: undefined }} className="font-semibold text-primary underline underline-offset-4">Tous les sujets</Link></p>
            <div className="mt-4 flex flex-wrap gap-3">
              {INTERESTS.filter((t) => !t.soon).map((t) => {
                const on = myIds.includes(t.id);
                return (
                  <button key={t.id} onClick={() => toggleInterest(t.id)} aria-pressed={on} className={`rounded-full border px-5 py-2.5 text-base transition ${on ? "border-primary bg-sage-soft font-semibold text-primary" : "border-border bg-card hover:border-primary"}`}>
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* CETTE SEMAINE — chaleureux */}
      {state === "in" && week && week.sessions > 0 && (
        <section className="bg-card">
          <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-10 px-6 py-16 md:px-8">
            <div className="relative h-24 w-24">
              <svg viewBox="0 0 36 36" className="h-24 w-24 -rotate-90">
                <circle cx="18" cy="18" r="15.5" fill="none" className="stroke-muted" strokeWidth="3" />
                <circle cx="18" cy="18" r="15.5" fill="none" className="stroke-primary" strokeWidth="3" strokeLinecap="round" strokeDasharray={`${Math.min(100, (week.days / 7) * 100)} 100`} pathLength={100} />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-2xl font-semibold">{week.days}/7</span>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary">Cette semaine</p>
              <p className="mt-2 text-2xl font-semibold">
                {week.sessions} séance{week.sessions > 1 ? "s" : ""} · {week.minutes} minutes · {week.days} jour{week.days > 1 ? "s" : ""} actif{week.days > 1 ? "s" : ""}
              </p>
              <p className="mt-1 text-lg text-muted-foreground">
                {[week.oral && `${week.oral} réponse${week.oral > 1 ? "s" : ""} à voix haute`, week.found && `${week.found} mot${week.found > 1 ? "s" : ""} retrouvé${week.found > 1 ? "s" : ""}`, week.topics && (week.topics > 1 ? `${week.topics} sujets explorés` : "1 sujet exploré")].filter(Boolean).join(" · ")}
              </p>
              <p className="mt-2 font-serif text-xl italic">{weekPhrase(week)}</p>
            </div>
          </div>
        </section>
      )}

      {/* COLLECTIONS */}
      <section className="bg-background">
        <div className="mx-auto w-full max-w-6xl px-6 py-16 md:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary">Vos collections</p>
          <div className="mt-6 grid gap-x-12 gap-y-8 md:grid-cols-2">
            {COLLECTIONS.map((c) => {
              const n = c.ids.filter((id) => week?.explored.includes(id)).length;
              return (
                <div key={c.id}>
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="text-xl font-semibold">
                      {c.title}
                      {isFresh(c) && <span className="ml-3 align-middle text-xs font-bold uppercase tracking-[0.2em] text-primary">Nouveau</span>}
                    </p>
                    <p className="shrink-0 text-base text-muted-foreground">{n} / {c.ids.length} sujets explorés</p>
                  </div>
                  <div className="mt-3 h-1 rounded-full bg-border">
                    <div className="h-1 rounded-full bg-primary transition-all" style={{ width: `${(n / c.ids.length) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* MANIFESTE */}
      <section className="bg-sage-soft">
        <div className="mx-auto w-full max-w-6xl px-6 py-24 text-center md:px-8">
          <img src={symbol.url} alt="" className="mx-auto h-16 w-auto" />
          <p className="mt-6 font-serif text-4xl leading-tight md:text-6xl">
            <span className="italic text-primary">Relier</span> ce que l'on entend, ce que l'on sait et ce que l'on exprime.
          </p>
                    <p className="mt-8 text-sm font-semibold uppercase tracking-[0.25em] text-primary">Connexions by Nutrileading</p>
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
