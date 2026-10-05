import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/aidant")({
  head: () => ({
    meta: [
      { title: "Espace aidant — Écoute" },
      { name: "description", content: "Suivi de la compréhension et réglages des séances." },
      { property: "og:title", content: "Espace aidant — Écoute" },
      { property: "og:description", content: "Suivi de la compréhension et réglages des séances." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Aidant,
});

const TOPICS = [
  { id: "nutrition", label: "Nutrition" },
  { id: "daily", label: "Vie pratique" },
  { id: "time", label: "Temps et orientation" },
  { id: "culture", label: "Culture" },
  { id: "science", label: "Science et nature" },
];
const SKILL_LABELS: Record<string, string> = {
  word: "Mots isolés",
  sentence: "Phrases courtes",
  temporal: "Notions de temps",
  practical: "Langage pratique",
  memory: "Mémoire auditive",
  semantic: "Compréhension du sens",
};
const CAT_LABELS: Record<string, string> = { nutrition: "Nutrition", daily: "Vie pratique", time: "Temps", culture: "Culture", science: "Science" };

type Attempt = { skill: string; category: string; outcome: string; word_count: number; response_ms: number | null; created_at: string; prompt: string };

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

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setUserId(u.user.id);
      const since = new Date(Date.now() - 60 * 864e5).toISOString();
      const [s, a, p] = await Promise.all([
        supabase.from("caregiver_settings").select("*").eq("user_id", u.user.id).maybeSingle(),
        supabase.from("attempts").select("skill, category, outcome, word_count, response_ms, created_at, prompt").gte("created_at", since).order("created_at"),
        supabase.from("practice_sessions").select("started_at, completed_at").gte("started_at", since),
      ]);
      if (s.data) {
        setName(s.data.patient_name);
        setTopics(s.data.topics);
        setDifficulty(s.data.difficulty);
      }
      setAttempts((a.data as Attempt[]) ?? []);
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

    return { total, spont: pct(spont, total), helped: pct(spont + helped, total), afterRepeat: pct(afterRepeat, total), afterCue: pct(afterCue, total), avgTime, avgLen, bySkill, byCat, trend, difficult };
  }, [attempts]);

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
        <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Espace aidant</p>
        <h1 className="mt-2 text-5xl">Suivi de {name}</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">60 derniers jours. Ces indicateurs servent au suivi de l'entraînement ; ils ne constituent pas un diagnostic médical.</p>

        <div className="mt-10 grid gap-5 md:grid-cols-4">
          <Metric big label="Compréhension spontanée" value={stats.spont} suffix="%" note="Correct avant toute aide" />
          <Metric big label="Compréhension avec aide" value={stats.helped} suffix="%" note="Après répétition ou indice écrit" />
          <Metric label="Temps de réponse moyen" value={stats.avgTime} suffix=" s" note="Réponses spontanées" />
          <Metric label="Longueur de phrase comprise" value={stats.avgLen} suffix=" mots" note="Moyenne, spontanément" />
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-3">
          <Card title="Régularité (14 jours)">
            <div className="flex gap-1.5">
              {last14.map((d) => (
                <span key={d} title={d} className={`h-8 flex-1 rounded-md ${days.includes(d) ? "bg-calm" : "bg-border"}`} />
              ))}
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{days.filter((d) => last14.includes(d)).length} séances terminées</p>
          </Card>
          <Card title="Après répétition">
            <p className="font-serif text-4xl">{stats.afterRepeat ?? "—"}{stats.afterRepeat !== null && "%"}</p>
          </Card>
          <Card title="Après indice écrit">
            <p className="font-serif text-4xl">{stats.afterCue ?? "—"}{stats.afterCue !== null && "%"}</p>
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
                <Bar key={s.key} label={SKILL_LABELS[s.key]} value={s.spont} n={s.n} />
              ))}
            </ul>
          </Card>
          <Card title="Par thème">
            <ul className="space-y-3">
              {stats.byCat.length ? stats.byCat.map((c) => <Bar key={c.key} label={CAT_LABELS[c.key]} value={c.spont} n={c.n} />) : <p className="text-muted-foreground">Pas encore de données.</p>}
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
