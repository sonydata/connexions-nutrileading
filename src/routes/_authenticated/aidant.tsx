import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/aidant")({
  head: () => ({
    meta: [
      { title: "Suivi — Écoute" },
      { name: "description", content: "Suivi de la compréhension et réglages des séances." },
      { property: "og:title", content: "Suivi — Écoute" },
      { property: "og:description", content: "Suivi de la compréhension et réglages des séances." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Aidant,
});

const TOPICS = [
  { id: "nutrition", label: "Nutrition et aliments" },
  { id: "avis", label: "Cas pratiques et « Votre avis »" },
  { id: "sciences", label: "Culture scientifique et médicale" },
  { id: "temps", label: "Organisation et temps" },
  { id: "expression", label: "Expression orale" },
];
const SKILL_LABELS: Record<string, string> = {
  lexique: "Connaissances alimentaires",
  conseil: "Conseil et cas pratiques",
  information: "Compréhension d'informations",
  temps: "Notions de temps",
  completion: "Complétion de phrases",
  expression: "Expression orale",
  evocation: "Évocation lexicale",
  elocution: "Élocution",
};
const CAT_LABELS: Record<string, string> = { nutrition: "Nutrition", avis: "Votre avis", sciences: "Sciences", temps: "Temps", expression: "Expression" };

type Attempt = { skill: string; category: string; outcome: string; word_count: number; response_ms: number | null; created_at: string; prompt: string; kind: string | null; option_count: number; concept: string | null };
const CHOICE = new Set(["mcq", "tf"]);
const OPEN = new Set(["expliquer", "reformuler", "oral"]);
const RECALL = new Set(["evoke", "complete", "nommer"]);

const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : null);

function Aidant() {
  const nav = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [name, setName] = useState("Hafid");
  const [topics, setTopics] = useState<string[]>(TOPICS.map((t) => t.id));
  const [difficulty, setDifficulty] = useState(1);
  const [saved, setSaved] = useState(false);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [days, setDays] = useState<string[]>([]);
  const [sessions, setSessions] = useState<{ started_at: string; completed_at: string | null }[]>([]);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setUserId(u.user.id);
      const since = new Date(Date.now() - 60 * 864e5).toISOString();
      const [s, a, p] = await Promise.all([
        supabase.from("caregiver_settings").select("*").eq("user_id", u.user.id).maybeSingle(),
        supabase.from("attempts").select("skill, category, outcome, word_count, response_ms, created_at, prompt, kind, option_count, concept").gte("created_at", since).order("created_at"),
        supabase.from("practice_sessions").select("started_at, completed_at").gte("started_at", since),
      ]);
      if (s.data) {
        setName(s.data.patient_name);
        setTopics(s.data.topics);
        setDifficulty(s.data.difficulty);
      }
      setAttempts((a.data as Attempt[]) ?? []);
      setSessions(p.data ?? []);
      setDays(Array.from(new Set((p.data ?? []).filter((x) => x.completed_at).map((x) => x.started_at.slice(0, 10)))));
    })();
  }, []);

  async function save() {
    if (!userId) return;
    await supabase.from("caregiver_settings").upsert({ user_id: userId, patient_name: name.trim() || "Hafid", topics, difficulty, updated_at: new Date().toISOString() });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const stats = useMemo(() => {
    const total = attempts.length;
    const spont = attempts.filter((a) => a.outcome === "spontaneous").length;
    const helped = attempts.filter((a) => a.outcome === "after_repeat" || a.outcome === "after_cue").length;
    const afterRepeat = attempts.filter((a) => a.outcome === "after_repeat").length;
    const afterCue = attempts.filter((a) => a.outcome === "after_cue").length;
    const times = attempts.filter((a) => a.outcome === "spontaneous" && a.response_ms).map((a) => a.response_ms!);
    const avgTime = times.length ? Math.round(times.reduce((x, y) => x + y, 0) / times.length / 100) / 10 : null;
    const understoodLens = attempts.filter((a) => a.outcome === "spontaneous").map((a) => a.word_count);
    const avgLen = understoodLens.length ? Math.round((understoodLens.reduce((x, y) => x + y, 0) / understoodLens.length) * 10) / 10 : null;

    const bySkill = Object.keys(SKILL_LABELS).map((k) => {
      const rows = attempts.filter((a) => a.skill === k);
      return { key: k, n: rows.length, spont: pct(rows.filter((r) => r.outcome === "spontaneous").length, rows.length), help: pct(rows.filter((r) => r.outcome !== "revealed").length, rows.length) };
    });
    const byCat = Object.keys(CAT_LABELS)
      .map((k) => {
        const rows = attempts.filter((a) => a.category === k);
        return { key: k, n: rows.length, spont: pct(rows.filter((r) => r.outcome === "spontaneous").length, rows.length) };
      })
      .filter((c) => c.n);

    const dayMap = new Map<string, Attempt[]>();
    for (const a of attempts) {
      const d = a.created_at.slice(0, 10);
      dayMap.set(d, [...(dayMap.get(d) ?? []), a]);
    }
    const trend = Array.from(dayMap.entries()).map(([d, rows]) => ({
      day: new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
      spontanee: pct(rows.filter((r) => r.outcome === "spontaneous").length, rows.length),
      avecAide: pct(rows.filter((r) => r.outcome !== "revealed").length, rows.length),
    }));
    const difficult = attempts.filter((a) => a.outcome === "revealed").slice(-6).reverse();

    const choice = attempts.filter((a) => !a.kind || CHOICE.has(a.kind));
    const sp = (rows: Attempt[]) => pct(rows.filter((r) => r.outcome === "spontaneous").length, rows.length);
    const comp = {
      spont: sp(choice),
      helped: pct(choice.filter((r) => r.outcome !== "revealed").length, choice.length),
      short: sp(choice.filter((r) => r.word_count <= 8)),
      long: sp(choice.filter((r) => r.word_count > 8)),
      temps: sp(choice.filter((r) => r.skill === "temps")),
      cases: sp(choice.filter((r) => r.skill === "conseil")),
    };
    const open = attempts.filter((a) => a.kind && OPEN.has(a.kind));
    const recall = attempts.filter((a) => a.kind && RECALL.has(a.kind));
    const spokenLens = attempts.filter((a) => a.kind && OPEN.has(a.kind) && a.option_count > 1).map((a) => a.option_count);
    const expr = {
      spont: sp(open),
      support: pct(open.filter((r) => r.outcome === "after_cue").length, open.length),
      tried: open.filter((r) => r.outcome === "spontaneous").length + attempts.filter((a) => a.kind === "lire" && a.outcome === "spontaneous").length,
      wordsSpont: recall.filter((r) => r.outcome === "spontaneous").length,
      wordsCue: recall.filter((r) => r.outcome === "after_cue").length,
      repeated: attempts.filter((a) => a.concept?.endsWith("#rep")).length,
      reformulated: attempts.filter((a) => a.kind === "reformuler" && a.outcome === "spontaneous").length,
      avgWords: spokenLens.length ? Math.round(spokenLens.reduce((x, y) => x + y, 0) / spokenLens.length) : null,
    };
    const ranked = byCat.filter((c) => c.n >= 3 && c.spont !== null).sort((a, b) => b.spont! - a.spont!);
    return { comp, expr, preferred: ranked[0]?.key ?? null, hardest: ranked.length > 1 ? ranked[ranked.length - 1]!.key : null, total, spont: pct(spont, total), helped: pct(spont + helped, total), afterRepeat: pct(afterRepeat, total), afterCue: pct(afterCue, total), avgTime, avgLen, bySkill, byCat, trend, difficult };
  }, [attempts]);

  const totalMinutes = Math.round(sessions.filter((x) => x.completed_at).reduce((t, x) => t + Math.min(40, (new Date(x.completed_at!).getTime() - new Date(x.started_at).getTime()) / 60000), 0));
  const last14 = Array.from({ length: 14 }, (_, k) => new Date(Date.now() - (13 - k) * 864e5).toISOString().slice(0, 10));

  return (
    <main className="paper-grain min-h-screen px-6 py-8 md:px-12">
      <header className="mx-auto flex max-w-6xl items-center justify-between">
        <Link to="/" className="font-serif text-2xl">Écoute</Link>
        <div className="flex items-center gap-6 text-sm">
          <Link to="/" className="text-muted-foreground hover:text-foreground">Accueil</Link>
          <button onClick={async () => { await supabase.auth.signOut(); nav({ to: "/auth" }); }} className="text-muted-foreground hover:text-foreground">Se déconnecter</button>
        </div>
      </header>

      <div className="mx-auto mt-10 max-w-6xl">
        <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Suivi</p>
        <h1 className="mt-2 text-5xl">Suivi de {name}</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">60 derniers jours. Ces indicateurs servent au suivi de l'entraînement ; ils ne constituent pas un diagnostic médical.</p>

        <h2 className="mt-10 text-3xl">Compréhension</h2>
        <div className="mt-4 grid gap-5 md:grid-cols-4">
          <Metric big label="Compréhension spontanée" value={stats.comp.spont} suffix="%" note="Correct avant toute aide" />
          <Metric big label="Compréhension avec aide" value={stats.comp.helped} suffix="%" note="Après répétition, indice ou mot écrit" />
          <Metric label="Phrases courtes" value={stats.comp.short} suffix="%" note="8 mots ou moins, spontanément" />
          <Metric label="Phrases plus longues" value={stats.comp.long} suffix="%" note="Plus de 8 mots, spontanément" />
          <Metric label="Notions temporelles" value={stats.comp.temps} suffix="%" note="Spontanément" />
          <Metric label="Mini-cas" value={stats.comp.cases} suffix="%" note="Réussis spontanément" />
          <Metric label="Temps de réponse moyen" value={stats.avgTime} suffix=" s" note="Réponses spontanées" />
          <Metric label="Après répétition" value={stats.afterRepeat} suffix="%" note="Part des réponses" />
        </div>

        <h2 className="mt-10 text-3xl">Expression</h2>
        <div className="mt-4 grid gap-5 md:grid-cols-4">
          <Metric big label="Expression spontanée" value={stats.expr.spont} suffix="%" note="Réponse orale sans indice ni modèle" />
          <Metric big label="Expression avec soutien" value={stats.expr.support} suffix="%" note="Après indice ou formulation modèle" />
          <Metric label="Réponses orales tentées" value={stats.expr.tried} suffix="" note="Votre avis, reformulation, élocution" />
          <Metric label="Longueur des réponses" value={stats.expr.avgWords} suffix=" mots" note="Approximative, quand la transcription est disponible" />
          <Metric label="Mots retrouvés spontanément" value={stats.expr.wordsSpont} suffix="" note="Évocation et complétion" />
          <Metric label="Mots retrouvés après indice" value={stats.expr.wordsCue} suffix="" note="Indice, premier son" />
          <Metric label="Phrases répétées" value={stats.expr.repeated} suffix="" note="Formulation modèle répétée" />
          <Metric label="Reformulations" value={stats.expr.reformulated} suffix="" note="Avec ses propres mots" />
        </div>

        <h2 className="mt-10 text-3xl">Engagement</h2>
        <div className="mt-4 grid gap-5 md:grid-cols-3">
          <Card title="Régularité (14 jours)">
            <div className="flex gap-1.5">
              {last14.map((d) => (
                <span key={d} title={d} className={`h-8 flex-1 rounded-md ${days.includes(d) ? "bg-calm" : "bg-border"}`} />
              ))}
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{days.filter((d) => last14.includes(d)).length} séances terminées · {Math.round((days.length / 60) * 7 * 10) / 10} par semaine en moyenne</p>
          </Card>
          <Card title="Temps total">
            <p className="font-serif text-4xl">{totalMinutes} <span className="text-2xl">min</span></p>
            <p className="mt-2 text-sm text-muted-foreground">{sessions.filter((x) => x.completed_at).length} séances terminées sur 60 jours</p>
          </Card>
          <Card title="Catégories">
            <p className="text-sm text-muted-foreground">La plus à l'aise</p>
            <p className="font-serif text-2xl">{stats.preferred ? CAT_LABELS[stats.preferred] : "—"}</p>
            <p className="mt-3 text-sm text-muted-foreground">Demande le plus de soutien</p>
            <p className="font-serif text-2xl">{stats.hardest ? CAT_LABELS[stats.hardest] : "—"}</p>
          </Card>
        </div>

        <Card title="Évolution" className="mt-5">
          {stats.trend.length ? (
            <div className="h-64">
              <ResponsiveContainer>
                <LineChart data={stats.trend}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis domain={[0, 100]} stroke="var(--muted-foreground)" fontSize={12} unit="%" />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="spontanee" name="Spontanée" stroke="var(--chart-1)" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="avecAide" name="Avec aide" stroke="var(--chart-2)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-muted-foreground">Les tendances apparaîtront après les premières séances.</p>
          )}
        </Card>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <Card title="Par compétence">
            <ul className="space-y-3">
              {stats.bySkill.map((s) => (
                <Bar key={s.key} label={SKILL_LABELS[s.key] ?? s.key} value={s.spont} n={s.n} />
              ))}
            </ul>
          </Card>
          <Card title="Par thème">
            <ul className="space-y-3">
              {stats.byCat.length ? stats.byCat.map((c) => <Bar key={c.key} label={CAT_LABELS[c.key] ?? c.key} value={c.spont} n={c.n} />) : <p className="text-muted-foreground">Pas encore de données.</p>}
            </ul>
            {stats.difficult.length > 0 && (
              <>
                <h3 className="mt-8 text-xl">Phrases récemment difficiles</h3>
                <ul className="mt-3 space-y-2 text-muted-foreground">
                  {stats.difficult.map((d, k) => <li key={k}>« {d.prompt} »</li>)}
                </ul>
              </>
            )}
          </Card>
        </div>

        <Card title="Réglages des séances" className="mt-5">
          <div className="grid gap-8 md:grid-cols-3">
            <label className="block">
              <span className="text-sm text-muted-foreground">Prénom affiché</span>
              <input value={name} onChange={(e) => setName(e.target.value)} className="mt-2 w-full rounded-xl border bg-background px-4 py-3 text-lg" />
            </label>
            <div>
              <span className="text-sm text-muted-foreground">Thèmes</span>
              <div className="mt-2 space-y-2">
                {TOPICS.map((t) => (
                  <label key={t.id} className="flex items-center gap-3">
                    <input type="checkbox" className="h-5 w-5 accent-[var(--primary)]" checked={topics.includes(t.id)} onChange={(e) => setTopics(e.target.checked ? [...topics, t.id] : topics.filter((x) => x !== t.id))} />
                    {t.label}
                  </label>
                ))}
                <p className="pt-2 text-xs text-muted-foreground">Actualités : non disponibles sans source d'information fiable connectée.</p>
              </div>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Niveau de départ</span>
              <div className="mt-2 flex gap-2">
                {[1, 2, 3].map((d) => (
                  <button key={d} onClick={() => setDifficulty(d)} className={`flex-1 rounded-xl border py-3 ${difficulty === d ? "border-primary bg-primary text-primary-foreground" : "bg-background"}`}>
                    {["Doux", "Moyen", "Soutenu"][d - 1]}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Le niveau s'ajuste ensuite automatiquement, compétence par compétence.</p>
            </div>
          </div>
          <button onClick={save} className="mt-8 rounded-full bg-primary px-10 py-3 text-primary-foreground">{saved ? "Enregistré" : "Enregistrer"}</button>
        </Card>
      </div>
    </main>
  );
}

function Card({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-3xl border bg-card p-7 ${className}`}>
      <h2 className="mb-5 text-2xl">{title}</h2>
      {children}
    </section>
  );
}

function Metric({ label, value, suffix, note, big }: { label: string; value: number | null; suffix: string; note: string; big?: boolean }) {
  return (
    <div className={`rounded-3xl border p-7 ${big ? "bg-primary text-primary-foreground" : "bg-card"}`}>
      <p className={`text-sm ${big ? "opacity-80" : "text-muted-foreground"}`}>{label}</p>
      <p className="mt-3 font-serif text-5xl">{value ?? "—"}{value !== null && <span className="text-2xl">{suffix}</span>}</p>
      <p className={`mt-2 text-xs ${big ? "opacity-70" : "text-muted-foreground"}`}>{note}</p>
    </div>
  );
}

function Bar({ label, value, n }: { label: string; value: number | null; n: number }) {
  return (
    <li>
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="text-muted-foreground">{value === null ? "—" : `${value}%`} · {n}</span>
      </div>
      <div className="mt-1.5 h-2 rounded-full bg-muted">
        <div className="h-2 rounded-full bg-calm" style={{ width: `${value ?? 0}%` }} />
      </div>
    </li>
  );
}
