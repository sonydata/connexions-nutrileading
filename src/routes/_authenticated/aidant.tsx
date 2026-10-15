import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { DEFAULT_INTERESTS, INTERESTS, PREFIX, interestsOf, otherInterest } from "@/lib/interests";
import { supabase } from "@/integrations/supabase/client";
import { topicOfId } from "@/lib/builder";
import { CaregiverProfile } from "@/components/caregiver-profile";

export const Route = createFileRoute("/_authenticated/aidant")({
  head: () => ({
    meta: [
      { title: "Suivi — Connexions" },
      { name: "description", content: "Suivi de la compréhension et réglages des séances." },
      { property: "og:title", content: "Suivi — Connexions" },
      { property: "og:description", content: "Suivi de la compréhension et réglages des séances." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Aidant,
});

type Attempt = { item_id: string | null; session_id: string | null; skill: string; category: string; outcome: string; word_count: number; response_ms: number | null; created_at: string; prompt: string; kind: string | null; option_count: number; concept: string | null };
const KNOWLEDGE = new Set(["mcq", "tf", "evoke", "complete", "nommer"]);
const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : null);
const label = (id: string) => INTERESTS.find((x) => x.id === id)?.label ?? id;

// Kept short on purpose (feedback Sonia, 15 Oct): this week, a few key numbers, personal landmarks,
// settings. Detailed charts stay available but folded.
function Aidant() {
  const nav = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [name, setName] = useState("Hafid");
  const [base, setBase] = useState<string[]>([]); // other stored settings, kept as they are
  const [interests, setInterests] = useState<string[]>(DEFAULT_INTERESTS);
  const [other, setOther] = useState("");
  const [difficulty, setDifficulty] = useState(1);
  const [saved, setSaved] = useState(false);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [sessions, setSessions] = useState<{ started_at: string; completed_at: string | null }[]>([]);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setUserId(u.user.id);
      const since = new Date(Date.now() - 60 * 864e5).toISOString();
      const [s, a, p] = await Promise.all([
        supabase.from("caregiver_settings").select("*").eq("user_id", u.user.id).maybeSingle(),
        supabase.from("attempts").select("item_id, session_id, skill, category, outcome, word_count, response_ms, created_at, prompt, kind, option_count, concept").gte("created_at", since).order("created_at"),
        supabase.from("practice_sessions").select("started_at, completed_at").gte("started_at", since),
      ]);
      if (s.data) {
        setName(s.data.patient_name);
        setBase(s.data.topics.filter((t) => !t.startsWith(PREFIX)));
        setInterests(interestsOf(s.data.topics).filter((x) => !x.startsWith("autre:")));
        setOther(otherInterest(s.data.topics));
        setDifficulty(s.data.difficulty);
      }
      setAttempts((a.data as Attempt[]) ?? []);
      setSessions(p.data ?? []);
    })();
  }, []);

  async function save() {
    if (!userId) return;
    const picked = [...interests, ...(other.trim() ? [`autre:${other.trim()}`] : [])].map((x) => PREFIX + x);
    await supabase.from("caregiver_settings").upsert({ user_id: userId, patient_name: name.trim(), topics: [...base, ...picked], difficulty, updated_at: new Date().toISOString() });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const stats = useMemo(() => {
    const known = attempts.filter((a) => KNOWLEDGE.has(a.kind ?? ""));
    const found = pct(known.filter((a) => a.outcome === "spontaneous").length, known.length);
    const dayMap = new Map<string, Attempt[]>();
    for (const a of known) dayMap.set(a.created_at.slice(0, 10), [...(dayMap.get(a.created_at.slice(0, 10)) ?? []), a]);
    const trend = [...dayMap].map(([d, rows]) => ({
      day: new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
      seul: pct(rows.filter((r) => r.outcome === "spontaneous").length, rows.length),
    }));
    const byTopic = new Map<string, { n: number; s: number }>();
    for (const a of known) {
      const t = topicOfId(a.item_id);
      if (!t || t === "general") continue;
      const x = byTopic.get(t) ?? { n: 0, s: 0 };
      x.n++;
      if (a.outcome === "spontaneous") x.s++;
      byTopic.set(t, x);
    }
    const topics = [...byTopic].filter(([, v]) => v.n >= 3).sort((a, b) => b[1].n - a[1].n).map(([k, v]) => ({ key: k, n: v.n, value: pct(v.s, v.n) }));
    const difficult = known.filter((a) => a.outcome === "revealed").slice(-5).reverse();
    return { found, trend, topics, difficult };
  }, [attempts]);

  const done = sessions.filter((x) => x.completed_at);
  const totalMinutes = Math.round(done.reduce((t, x) => t + Math.min(40, (new Date(x.completed_at!).getTime() - new Date(x.started_at).getTime()) / 60000), 0));
  const days = new Set(done.map((x) => x.started_at.slice(0, 10)));
  const last14 = Array.from({ length: 14 }, (_, k) => new Date(Date.now() - (13 - k) * 864e5).toISOString().slice(0, 10));

  return (
    <main className="paper-grain min-h-screen px-6 py-8 md:px-12">
      <header className="mx-auto flex max-w-5xl items-center justify-between">
        <Link to="/" className="font-serif text-2xl">Connexions</Link>
        <div className="flex items-center gap-6 text-sm">
          <Link to="/" className="text-muted-foreground hover:text-foreground">Accueil</Link>
          <button onClick={async () => { await supabase.auth.signOut(); nav({ to: "/auth" }); }} className="text-muted-foreground hover:text-foreground">Se déconnecter</button>
        </div>
      </header>

      <div className="mx-auto mt-10 max-w-5xl">
        <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Espace aidant</p>
        <h1 className="mt-2 text-5xl">Suivi de {name}</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">Un repère pour accompagner l'entraînement, pas un diagnostic médical.</p>

        <Card title="En bref · 60 derniers jours" className="mt-10">
          <div className="grid gap-6 md:grid-cols-3">
            <Figure value={Math.round((done.length / 60) * 7 * 10) / 10} unit="séances / semaine" />
            <Figure value={totalMinutes} unit="minutes au total" />
            <Figure value={stats.found} unit="% de réponses trouvées seul" />
          </div>
          <div className="mt-6 flex gap-1.5" aria-label="Séances des 14 derniers jours">
            {last14.map((d) => <span key={d} title={d} className={`h-6 flex-1 rounded-md ${days.has(d) ? "bg-calm" : "bg-border"}`} />)}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">Les 14 derniers jours</p>

          <details className="mt-6 border-t pt-5">
            <summary className="cursor-pointer text-lg text-primary">Voir le détail</summary>
            {stats.trend.length > 1 ? (
              <div className="mt-5 h-56">
                <ResponsiveContainer>
                  <LineChart data={stats.trend}>
                    <CartesianGrid stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={12} />
                    <YAxis domain={[0, 100]} stroke="var(--muted-foreground)" fontSize={12} unit="%" />
                    <Tooltip />
                    <Line type="monotone" dataKey="seul" name="Trouvé seul" stroke="var(--chart-1)" strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="mt-4 text-muted-foreground">L'évolution apparaîtra après quelques séances.</p>
            )}
            {stats.topics.length > 0 && (
              <ul className="mt-6 space-y-3">
                {stats.topics.map((t) => <Bar key={t.key} label={label(t.key)} value={t.value} n={t.n} />)}
              </ul>
            )}
            {stats.difficult.length > 0 && (
              <>
                <h3 className="mt-6 text-lg">Questions récemment difficiles</h3>
                <ul className="mt-2 space-y-1 text-muted-foreground">{stats.difficult.map((d, k) => <li key={k}>« {d.prompt} »</li>)}</ul>
              </>
            )}
          </details>
        </Card>

        {userId && <CaregiverProfile userId={userId} attempts={attempts} sessions={sessions} />}

        <Card title="Réglages" className="mt-5">
          <label className="block max-w-sm">
            <span className="text-sm text-muted-foreground">Prénom affiché</span>
            <input value={name} onChange={(e) => setName(e.target.value)} className="mt-2 w-full rounded-xl border bg-background px-4 py-3 text-lg" />
          </label>
          <p className="mt-6 text-sm text-muted-foreground">Centres d'intérêt</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {INTERESTS.map((t) => {
              const on = interests.includes(t.id);
              return (
                <button key={t.id} type="button" aria-pressed={on} onClick={() => setInterests(on ? interests.filter((x) => x !== t.id) : [...interests, t.id])}
                  className={`rounded-full border px-4 py-2 ${on ? "border-primary bg-sage-soft font-semibold text-primary" : "bg-background text-muted-foreground"}`}>
                  {t.label}
                </button>
              );
            })}
          </div>
          <input value={other} onChange={(e) => setOther(e.target.value)} placeholder="Autre sujet, par exemple : architecture" className="mt-3 w-full max-w-sm rounded-xl border bg-background px-4 py-3" />
          <p className="mt-6 text-sm text-muted-foreground">Niveau de départ</p>
          <div className="mt-2 flex max-w-sm gap-2">
            {[1, 2, 3].map((d) => (
              <button key={d} onClick={() => setDifficulty(d)} className={`flex-1 rounded-xl border py-2.5 ${difficulty === d ? "border-primary bg-primary text-primary-foreground" : "bg-background"}`}>
                {["Doux", "Moyen", "Soutenu"][d - 1]}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Il s'ajuste ensuite tout seul.</p>
          <button onClick={save} className="mt-6 rounded-full bg-primary px-10 py-3 text-primary-foreground">{saved ? "Enregistré" : "Enregistrer"}</button>
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

function Figure({ value, unit }: { value: number | null; unit: string }) {
  return (
    <div>
      <p className="font-serif text-5xl">{value ?? "—"}</p>
      <p className="mt-1 text-muted-foreground">{unit}</p>
    </div>
  );
}

function Bar({ label, value, n }: { label: string; value: number | null; n: number }) {
  return (
    <li>
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="text-muted-foreground">{value === null ? "—" : `${value} % trouvé seul`} · {n} questions</span>
      </div>
      <div className="mt-1.5 h-2 rounded-full bg-muted">
        <div className="h-2 rounded-full bg-calm" style={{ width: `${value ?? 0}%` }} />
      </div>
    </li>
  );
}
