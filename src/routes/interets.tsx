import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_INTERESTS, GUEST_KEY, INTERESTS, PREFIX, interestsOf, otherInterest } from "@/lib/interests";

export const Route = createFileRoute("/interets")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({ next: s["next"] === "seance" ? ("seance" as const) : undefined }),
  head: () => ({
    meta: [
      { title: "Vos centres d'intérêt — Connexions" },
      { name: "description", content: "Choisissez les sujets que vous aimez : vos séances seront adaptées à vos centres d'intérêt." },
      { property: "og:title", content: "Vos centres d'intérêt — Connexions" },
      { property: "og:description", content: "Des séances adaptées aux sujets que vous aimez." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Interets,
});

function Interets() {
  const nav = useNavigate();
  const { next } = Route.useSearch();
  const [userId, setUserId] = useState<string | null>(null);
  const [base, setBase] = useState<string[]>([]);
  const [picked, setPicked] = useState<string[]>(DEFAULT_INTERESTS);
  const [other, setOther] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      let topics: string[] = [];
      if (data.user) {
        setUserId(data.user.id);
        const { data: s } = await supabase.from("caregiver_settings").select("topics").eq("user_id", data.user.id).maybeSingle();
        topics = s?.topics ?? [];
        setBase(topics.filter((t) => !t.startsWith(PREFIX)));
      } else {
        try {
          topics = JSON.parse(localStorage.getItem(GUEST_KEY) ?? "[]");
        } catch {}
      }
      setPicked(interestsOf(topics).filter((x) => !x.startsWith("autre:")));
      setOther(otherInterest(topics));
    })();
  }, []);

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  async function save() {
    setBusy(true);
    const mine = [...picked, ...(other.trim() ? [`autre:${other.trim()}`] : [])].map((x) => PREFIX + x);
    if (userId) {
      await supabase.from("caregiver_settings").upsert({ user_id: userId, topics: [...base, ...mine], updated_at: new Date().toISOString() });
    } else {
      localStorage.setItem(GUEST_KEY, JSON.stringify(mine));
    }
    nav({ to: next === "seance" ? "/seance" : "/" });
  }

  return (
    <main className="paper-grain min-h-screen px-6 py-8 md:px-12">
      <header className="mx-auto flex max-w-5xl items-center justify-between">
        <Link to="/" className="font-serif text-2xl">Connexions</Link>
      </header>
      <section className="mx-auto mt-12 max-w-5xl animate-rise">
        <p className="text-sm font-medium uppercase tracking-[0.25em] text-brand">Vos centres d'intérêt</p>
        <h1 className="mt-4 text-5xl leading-tight md:text-6xl">Quels sujets aimez-vous ?</h1>
        <p className="mt-5 max-w-2xl text-xl text-muted-foreground">
          Choisissez les sujets que vous aimez. Vos séances seront adaptées à vos centres d'intérêt.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {INTERESTS.map((t) => {
            const on = picked.includes(t.id) && !t.soon;
            return (
              <button
                key={t.id}
                disabled={t.soon}
                onClick={() => toggle(t.id)}
                aria-pressed={on}
                className={`flex items-center justify-between rounded-2xl border-2 px-6 py-5 text-left text-xl transition ${on ? "border-primary bg-accent" : "border-border bg-card hover:border-ring"} ${t.soon ? "opacity-50" : ""}`}
              >
                <span>
                  {t.label}
                  {t.soon && <span className="block text-sm text-muted-foreground">Bientôt disponible</span>}
                </span>
                <span className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${on ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
                  {on && <Check className="h-5 w-5" />}
                </span>
              </button>
            );
          })}
        </div>
        <label className="mt-8 block max-w-md">
          <span className="text-lg">Autre</span>
          <input value={other} onChange={(e) => setOther(e.target.value)} placeholder="Par exemple : architecture" className="mt-2 w-full rounded-xl border bg-card px-5 py-4 text-lg outline-none focus:ring-2 focus:ring-ring" />
        </label>
        <button
          onClick={save}
          disabled={busy || !picked.filter((p) => p !== "actualite").length}
          className="mt-12 rounded-full bg-primary px-14 py-5 text-2xl font-medium text-primary-foreground shadow-lg transition hover:opacity-90 disabled:opacity-50"
        >
          {next === "seance" ? "Commencer" : "Enregistrer"}
        </button>
        {!userId && <p className="mt-4 text-base text-muted-foreground">Sans compte, ce choix est gardé sur cet appareil.</p>}
      </section>
    </main>
  );
}
