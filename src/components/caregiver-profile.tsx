import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { INTERESTS } from "@/lib/interests";
import { topicOfId } from "@/lib/builder";
import { QUESTIONS, deriveParams, summariseSignals, turnInfo, type ProfileAnswers } from "@/lib/adaptive-profile";
import { useServerFn } from "@tanstack/react-start";
import { speak } from "@/lib/session.functions";
import { VOICE_TEST } from "@/lib/voice-texts";
import { MAX_TARGETS, cleanTargets, targetProgress, type PersonalTarget } from "@/lib/spaced-retrieval";

type Row = { item_id: string | null; session_id: string | null; kind: string | null; option_count: number; word_count: number; created_at: string; outcome?: string | null };
type Session = { started_at: string; completed_at: string | null };

/** "Espace proche": functional profile questionnaire + cautious weekly observations. */
export function CaregiverProfile({ userId, attempts, sessions }: { userId: string; attempts: Row[]; sessions: Session[] }) {
  const [answers, setAnswers] = useState<ProfileAnswers>({});
  const [expertise, setExpertise] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [saved, setSaved] = useState(false);
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [noteOpen, setNoteOpen] = useState(false);

  useEffect(() => {
    supabase.from("adaptive_profiles").select("answers, expertise, diagnosis").eq("user_id", userId).maybeSingle().then(({ data }) => {
      if (data) {
        setAnswers((data.answers ?? {}) as ProfileAnswers);
        setExpertise(data.expertise ?? "");
        setDiagnosis(data.diagnosis ?? "");
      } else setOpen(true);
    });
  }, [userId]);

  async function save(next: ProfileAnswers = answers) {
    await supabase.from("adaptive_profiles").upsert({ user_id: userId, answers: next, expertise: expertise.trim(), diagnosis: diagnosis.trim() || null, updated_at: new Date().toISOString() });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  // Personal targets (spaced retrieval) — text only, no photos.
  const targets: PersonalTarget[] = answers.personal ?? [];
  const [targetsSaved, setTargetsSaved] = useState(false);
  const setTargets = (list: PersonalTarget[]) => setAnswers({ ...answers, personal: list });
  const editTarget = (id: string, patch: Partial<PersonalTarget>) => setTargets(targets.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  async function saveTargets() {
    const next = { ...answers, personal: cleanTargets(targets) };
    setAnswers(next);
    await save(next);
    setTargetsSaved(true);
    setTimeout(() => setTargetsSaved(false), 2000);
  }
  const STATUS: Record<string, string> = { new: "Pas encore travaillé", learning: "En cours", paused: "En pause quelques jours", known: "Retenu · revu chaque semaine" };

  const monday = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d; })();
  async function sendFeedback(answer: string, text?: string) {
    setFeedback(answer);
    await supabase.from("caregiver_feedback").insert({ user_id: userId, week_start: monday.toISOString().slice(0, 10), answer, note: text ?? null });
  }

  const week = useMemo(() => {
    const since = Date.now() - 7 * 864e5;
    const rows = attempts.filter((a) => new Date(a.created_at).getTime() >= since);
    const turns = rows.filter((r) => turnInfo(r).turn);
    const sig = summariseSignals([...rows].reverse());
    const obs: { title: string; text: string }[] = [];
    if (turns.length < 4) return { obs, topics: [] as string[], few: true };

    const trouble = (sig.repeats + sig.notUnderstood) / turns.length;
    const repeatRows = rows.filter((r) => r.kind === "signal:repeat" || r.kind === "signal:notunderstood");
    const longAsked = repeatRows.filter((r) => r.word_count > 10).length;
    obs.push({ title: "Compréhension", text: trouble > 0.3 ? (longAsked > repeatRows.length / 2 ? "Les phrases longues semblent demander plus de réécoutes ; les phrases courtes semblent mieux comprises." : "Les réécoutes ont été assez fréquentes ; un rythme plus posé semble aider.") : "Les échanges semblent compris sans beaucoup de réécoutes." });

    const byTopic = new Map<string, { n: number; w: number; shared: number }>();
    for (const t of turns) {
      const tp = topicOfId(t.item_id);
      if (!tp || tp === "general") continue;
      const x = byTopic.get(tp) ?? { n: 0, w: 0, shared: 0 };
      x.n++;
      if (turnInfo(t).shared) { x.shared++; if (t.kind?.startsWith("discussion:")) x.w += t.option_count; }
      byTopic.set(tp, x);
    }
    const ranked = [...byTopic].filter(([, v]) => v.n >= 2).sort((a, b) => b[1].shared / b[1].n - a[1].shared / a[1].n || b[1].w - a[1].w);
    const top = ranked[0];
    if (sig.shared) obs.push({ title: "Expression", text: top && top[1].shared ? `Les réponses semblent plus développées sur ${INTERESTS.find((i) => i.id === top[0])?.label.toLowerCase() ?? top[0]}.` : "Des réponses orales ont été partagées cette semaine." });

    const done = sessions.filter((s) => s.completed_at && new Date(s.started_at).getTime() >= since);
    const mins = done.map((s) => Math.min(40, (new Date(s.completed_at!).getTime() - new Date(s.started_at).getTime()) / 60000)).sort((a, b) => a - b);
    const abandons = rows.filter((r) => r.kind === "signal:abandon").length;
    if (mins.length) {
      const m = Math.round(mins[Math.floor(mins.length / 2)]!);
      obs.push({ title: "Attention", text: abandons > done.length ? `Plusieurs séances ont été interrompues ; des séances plus courtes que ${m} minutes pourraient être plus confortables.` : `Des séances d'environ ${m} minutes semblent confortables.` });
    }
    const supported = turns.filter((t) => turnInfo(t).supported).length;
    if (supported / turns.length > 0.5) obs.push({ title: "Observation utile", text: "Les indices et pistes ont souvent été utilisés ; les questions contenant plusieurs informations semblent plus difficiles." });
    return { obs, topics: ranked.slice(0, 3).map(([k]) => INTERESTS.find((i) => i.id === k)?.label ?? k), few: false };
  }, [attempts, sessions]);

  const p = deriveParams(answers);

  // Voice check for the caregiver: plays the natural voice, or says exactly why it can't be produced.
  const speakFn = useServerFn(speak);
  const [voiceCheck, setVoiceCheck] = useState<string | null>(null);
  async function testVoice() {
    setVoiceCheck("Test en cours…");
    try {
      const r = await speakFn({ data: { text: VOICE_TEST } });
      if (!r.audio) return setVoiceCheck(`La voix naturelle ne peut pas être produite : ${r.reason ?? "raison inconnue"}`);
      const bytes = Uint8Array.from(atob(r.audio), (c) => c.charCodeAt(0));
      await new Audio(URL.createObjectURL(new Blob([bytes], { type: "audio/wav" }))).play();
      setVoiceCheck("La voix naturelle fonctionne.");
    } catch (e) {
      setVoiceCheck(`Le test a échoué : ${(e as Error).message}`);
    }
  }

  return (
    <>
      <section className="mt-10 rounded-3xl border bg-card p-7">
        <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Espace proche</p>
        <h2 className="mt-2 text-3xl">Cette semaine</h2>
        <p className="mt-2 text-sm text-muted-foreground">Observé pendant les séances Connexions. Ce ne sont pas des mesures cliniques.</p>
        {week.few ? (
          <p className="mt-5 text-lg text-muted-foreground">Les observations apparaîtront après quelques échanges.</p>
        ) : (
          <>
            <dl className="mt-6 grid gap-5 md:grid-cols-2">
              {week.obs.map((o) => (
                <div key={o.title}>
                  <dt className="text-sm font-semibold uppercase text-primary">{o.title}</dt>
                  <dd className="mt-1 text-lg">{o.text}</dd>
                </div>
              ))}
              {week.topics.length > 0 && (
                <div>
                  <dt className="text-sm font-semibold uppercase text-primary">Sujets appréciés</dt>
                  <dd className="mt-1 text-lg">{week.topics.map((t, i) => `${i + 1}. ${t}`).join("  ")}</dd>
                </div>
              )}
            </dl>
            <div className="mt-7 border-t pt-5">
              <p className="text-lg">Est-ce que cela correspond à ce que vous observez ?</p>
              {feedback ? (
                <p className="mt-3 text-primary">Merci, c'est noté.</p>
              ) : (
                <div className="mt-3 flex flex-wrap gap-3">
                  <button onClick={() => sendFeedback("oui")} className="rounded-full border px-6 py-2">Oui</button>
                  <button onClick={() => sendFeedback("pas_vraiment")} className="rounded-full border px-6 py-2">Pas vraiment</button>
                  <button onClick={() => setNoteOpen(true)} className="rounded-full border px-6 py-2">Ajouter une observation</button>
                </div>
              )}
              {noteOpen && !feedback && (
                <div className="mt-3 flex max-w-xl gap-3">
                  <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="Votre observation" className="flex-1 rounded-xl border bg-background px-4 py-2" />
                  <button disabled={!note.trim()} onClick={() => sendFeedback("observation", note.trim())} className="rounded-full bg-primary px-6 py-2 text-primary-foreground">Envoyer</button>
                </div>
              )}
            </div>
          </>
        )}
      </section>

      <section className="mt-5 rounded-3xl border bg-card p-7">
        <h2 className="text-2xl">Ses repères personnels</h2>
        <p className="mt-1 max-w-3xl text-muted-foreground">
          Quelques informations de sa vie à retrouver : prénoms de la famille, sa rue, son médecin, un objet de la maison. Choisissez ce qu'il connaît encore un peu ; 5 à 10 suffisent. Chaque séance en travaille une : la phrase est dite, puis la question revient de plus en plus espacée. S'il ne trouve pas, la réponse est donnée tout de suite. Texte seulement, aucune photo.
        </p>
        <div className="mt-5 space-y-4">
          {targets.map((t) => {
            const pr = targetProgress(t, attempts.map((a) => ({ ...a, outcome: a.outcome ?? "" })));
            return (
              <div key={t.id} className="grid gap-2 rounded-2xl border bg-background p-4 md:grid-cols-[1.4fr_1.2fr_0.7fr_auto] md:items-end">
                <label className="block text-sm text-muted-foreground">
                  Phrase à retenir
                  <input value={t.sentence} maxLength={160} onChange={(e) => editTarget(t.id, { sentence: e.target.value })} placeholder="Votre petite-fille s'appelle Léa." className="mt-1 w-full rounded-xl border bg-card px-3 py-2 text-base text-foreground" />
                </label>
                <label className="block text-sm text-muted-foreground">
                  Question
                  <input value={t.question} maxLength={160} onChange={(e) => editTarget(t.id, { question: e.target.value })} placeholder="Comment s'appelle votre petite-fille ?" className="mt-1 w-full rounded-xl border bg-card px-3 py-2 text-base text-foreground" />
                </label>
                <label className="block text-sm text-muted-foreground">
                  Réponse
                  <input value={t.answer} maxLength={60} onChange={(e) => editTarget(t.id, { answer: e.target.value })} placeholder="Léa" className="mt-1 w-full rounded-xl border bg-card px-3 py-2 text-base text-foreground" />
                </label>
                <div className="flex items-center gap-3 md:flex-col md:items-end">
                  <span className="text-sm text-muted-foreground">{STATUS[pr.status]}{pr.status === "learning" ? ` (${pr.sessions} séance${pr.sessions > 1 ? "s" : ""})` : ""}</span>
                  <button onClick={() => setTargets(targets.filter((x) => x.id !== t.id))} className="text-sm text-muted-foreground underline underline-offset-4">Retirer</button>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {targets.length < MAX_TARGETS && (
            <button onClick={() => setTargets([...targets, { id: Math.random().toString(36).slice(2, 10), sentence: "", question: "", answer: "" }])} className="rounded-full border px-6 py-2">
              Ajouter un repère
            </button>
          )}
          <button onClick={saveTargets} className="rounded-full bg-primary px-8 py-2 text-primary-foreground">{targetsSaved ? "Enregistré" : "Enregistrer"}</button>
        </div>
      </section>

      <section className="mt-5 rounded-3xl border bg-card p-7">
        <h2 className="text-2xl">Voix</h2>
        <p className="mt-1 text-muted-foreground">Vérifiez que la voix naturelle fonctionne sur cet appareil.</p>
        <button onClick={testVoice} className="mt-4 rounded-full border px-6 py-2">Tester la voix</button>
        {voiceCheck && <p role="status" className="mt-3 text-lg">{voiceCheck}</p>}
      </section>

      <section className="mt-5 rounded-3xl border bg-card p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl">Son profil au quotidien</h2>
            <p className="mt-1 text-muted-foreground">Quelques repères pour adapter la façon de parler, pas le niveau des sujets. Ce n'est pas un test.</p>
          </div>
          <button onClick={() => setOpen((o) => !o)} className="rounded-full border px-5 py-2 text-sm">{open ? "Replier" : "Modifier"}</button>
        </div>
        {!open && (
          <p className="mt-4 text-sm text-muted-foreground">
            Séances d'environ {p.sessionMinutes} min · {p.ideasPerUtterance === 1 ? "une idée à la fois" : "phrases naturelles"} · {p.optionCount} pistes{p.repetition >= 2 ? " · question répétée" : ""}{p.reinforced ? " · accompagnement renforcé" : ""}
          </p>
        )}
        {open && (
          <div className="mt-6 space-y-7">
            {QUESTIONS.map((q) => (
              <fieldset key={q.key}>
                <legend className="text-lg font-medium">{q.title}</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {q.options.map((label, i) => (
                    <button key={label} type="button" aria-pressed={answers[q.key] === i + 1} onClick={() => setAnswers({ ...answers, [q.key]: i + 1 })}
                      className={`rounded-xl border px-4 py-2 text-left ${answers[q.key] === i + 1 ? "border-primary bg-primary text-primary-foreground" : "bg-background"}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </fieldset>
            ))}
            <fieldset>
              <legend className="text-lg font-medium">Audition et vue</legend>
              <div className="mt-2 flex flex-wrap gap-5">
                <label className="flex items-center gap-2"><input type="checkbox" className="h-5 w-5" checked={!!answers.hearing} onChange={(e) => setAnswers({ ...answers, hearing: e.target.checked })} />Entend moins bien</label>
                <label className="flex items-center gap-2"><input type="checkbox" className="h-5 w-5" checked={!!answers.vision} onChange={(e) => setAnswers({ ...answers, vision: e.target.checked })} />Voit moins bien</label>
              </div>
            </fieldset>
            <fieldset>
              <legend className="text-lg font-medium">Accompagnement renforcé</legend>
              <p className="mt-1 text-sm text-muted-foreground">Choix et indices affichés d'emblée, une seule consigne courte. Automatique : activé quand comprendre reste souvent difficile.</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {([["Automatique", undefined], ["Oui", true], ["Non", false]] as const).map(([label, value]) => (
                  <button key={label} type="button" aria-pressed={answers.reinforced === value} onClick={() => setAnswers({ ...answers, reinforced: value })}
                    className={`rounded-xl border px-4 py-2 text-left ${answers.reinforced === value ? "border-primary bg-primary text-primary-foreground" : "bg-background"}`}>
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>
            <label className="block max-w-2xl">
              <span className="text-lg font-medium">Quels sujets connaît-il/elle particulièrement bien ?</span>
              <textarea value={expertise} onChange={(e) => setExpertise(e.target.value)} maxLength={500} rows={2} placeholder="Par exemple : nutrition clinique, médecine générale" className="mt-2 w-full rounded-xl border bg-background px-4 py-3" />
            </label>
            <label className="block max-w-md">
              <span className="text-sm text-muted-foreground">Diagnostic, si connu (facultatif — ne règle pas la difficulté)</span>
              <input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} maxLength={120} className="mt-2 w-full rounded-xl border bg-background px-4 py-3" />
            </label>
            <button onClick={() => save()} className="rounded-full bg-primary px-10 py-3 text-primary-foreground">{saved ? "Enregistré" : "Enregistrer"}</button>
          </div>
        )}
      </section>
    </>
  );
}
