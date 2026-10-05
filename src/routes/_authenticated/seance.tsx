import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Mic, Play, Square, Volume2 } from "lucide-react";
import { completeSession, recordAttempt, speak, startSession, type PlayItem } from "@/lib/session.functions";
import { imageSrc } from "@/lib/library";
import { heardWord, useVoiceInput, wordCount } from "@/lib/voice-input";
import { praise, praiseChoice } from "@/lib/praise";
import { todayGoal, weekLine, weekSummary } from "@/lib/week";

export const Route = createFileRoute("/_authenticated/seance")({
  head: () => ({
    meta: [
      { title: "Séance du jour — Écoute" },
      { name: "description", content: "La séance d'écoute du jour." },
      { property: "og:title", content: "Séance du jour — Écoute" },
      { property: "og:description", content: "La séance d'écoute du jour." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Seance,
});

type Outcome = "spontaneous" | "after_repeat" | "after_cue" | "revealed";
type Done = { theme: string; skill: string; kind: string; outcome: Outcome; spoken: boolean };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Browser/device French voice — no network, no cost. Used only if the server voice fails. */
function speakLocally(text: string, rate: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;
    if (!synth) return reject(new Error("no speech"));
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "fr-FR";
    u.rate = 0.9 * rate;
    const fr = synth.getVoices().find((v) => v.lang?.toLowerCase().startsWith("fr"));
    if (fr) u.voice = fr;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    synth.cancel();
    synth.speak(u);
  });
}

const MODE_TITLE: Record<string, string> = { expliquer: "Votre avis", lire: "Formulation", reformuler: "Avec vos mots", nommer: "Regard d'expert" };
const THEME_TITLE: Record<string, string> = { nutrition: "Nutrition", avis: "Cas pratique", sciences: "Culture scientifique", temps: "Organisation" };
const THEME_FR: Record<string, string> = { nutrition: "de nutrition", avis: "les cas pratiques", sciences: "de culture scientifique", temps: "d'organisation" };

function Seance() {
  const start = useServerFn(startSession);
  const speakFn = useServerFn(speak);
  const record = useServerFn(recordAttempt);
  const complete = useServerFn(completeSession);
  const voice = useVoiceInput();

  const [phase, setPhase] = useState<"loading" | "play" | "done" | "error">("loading");
  const [sessionId, setSessionId] = useState("");
  const [items, setItems] = useState<PlayItem[]>([]);
  const [i, setI] = useState(0);
  const [stage, setStage] = useState(0);
  const [wrong, setWrong] = useState<number[]>([]);
  const [chosen, setChosen] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);
  const [canHint, setCanHint] = useState(false);
  // open-answer flow: ask → (listening) → model
  const [step, setStep] = useState<"ask" | "model">("ask");
  const [heard, setHeard] = useState("");
  const [repeated, setRepeated] = useState(false);

  const cache = useRef(new Map<string, Promise<string>>());
  const audio = useRef<HTMLAudioElement | null>(null);
  const shownAt = useRef(Date.now());
  const startedAt = useRef(Date.now());
  const started = useRef(false);
  const pending = useRef<{ outcome: Outcome; spoken: number; responseMs: number | null } | null>(null);
  const log = useRef<Done[]>([]);
  const requeued = useRef(new Set<string>());

  const clip = useCallback(
    (text: string) => {
      let p = cache.current.get(text);
      if (!p) {
        p = speakFn({ data: { text } }).then(({ audio: b64 }) => {
          const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
          return URL.createObjectURL(new Blob([bytes], { type: "audio/wav" }));
        });
        p.catch(() => cache.current.delete(text));
        cache.current.set(text, p);
      }
      return p;
    },
    [speakFn],
  );

  const playOne = useCallback(
    async (text: string, rate = 1) => {
      let url: string;
      try {
        url = await clip(text);
      } catch {
        await speakLocally(text, rate);
        return;
      }
      const el = audio.current ?? (audio.current = new Audio());
      el.src = url;
      el.playbackRate = rate;
      await el.play();
      await new Promise<void>((res) => {
        el.onended = () => res();
        el.onerror = () => res();
      });
    },
    [clip],
  );

  const playId = useRef(0);
  const stopAudio = useCallback(() => {
    playId.current++;
    audio.current?.pause();
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, []);
  const play = useCallback(
    async (texts: (string | null)[], slow = false) => {
      const id = ++playId.current;
      audio.current?.pause();
      setSpeaking(true);
      try {
        let first = true;
        for (const t of texts) {
          if (!t) continue;
          if (id !== playId.current) return;
          if (!first) await sleep(700);
          if (id !== playId.current) return;
          await playOne(t, slow ? 0.85 : 1);
          first = false;
        }
        setNeedsTap(false);
      } catch {
        setNeedsTap(true);
      } finally {
        if (id === playId.current) {
          setSpeaking(false);
          shownAt.current = Date.now();
        }
      }
    },
    [playOne],
  );

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    start()
      .then((r) => {
        if (!r.items.length) throw new Error("empty");
        setSessionId(r.sessionId);
        setItems(r.items);
        startedAt.current = Date.now();
        const f = r.items[0]!;
        Promise.allSettled([clip(f.audio), f.question ? clip(f.question) : null]).finally(() => setPhase("play"));
      })
      .catch(() => setPhase("error"));
  }, [start, clip]);

  const it = items[i] as PlayItem;
  /** Full prompt read aloud: sentence, question, then each answer. */
  const spoken = (x: PlayItem) => [x.audio, x.question, ...(x.kind === "mcq" ? x.options.map((o) => o.label) : [])];

  useEffect(() => {
    if (phase !== "play" || !it) return;
    setCanHint(false);
    const t = setTimeout(() => setCanHint(true), 5000);
    play(spoken(it));
    const next = items[i + 1];
    if (next) {
      clip(next.audio).catch(() => {});
      if (next.question) clip(next.question).catch(() => {});
    }
    return () => clearTimeout(t);
  }, [phase, i]); // eslint-disable-line react-hooks/exhaustive-deps

  const elapsed = () => (stage === 0 ? Date.now() - shownAt.current : null);
  function settle(outcome: Outcome, spoken = 0) {
    if (!pending.current) pending.current = { outcome, spoken, responseMs: elapsed() };
  }

  function goNext() {
    stopAudio();
    const p = pending.current ?? { outcome: "after_cue" as Outcome, spoken: 0, responseMs: null };
    const kind = it.kind === "oral" ? (it.mode ?? "oral") : it.kind;
    record({
      data: { sessionId, itemId: it.id, kind, category: it.theme, skill: it.skill, prompt: it.audio, optionCount: it.kind === "oral" ? p.spoken : it.options.length, outcome: p.outcome, responseMs: p.responseMs, repeated },
    }).catch(() => {});
    log.current.push({ theme: it.theme, skill: it.skill, kind, outcome: p.outcome, spoken: p.spoken > 0 });
    // A concept that needed the answer comes back once, later in the same session.
    let added = 0;
    if (p.outcome === "revealed" && it.kind !== "oral" && !requeued.current.has(it.id) && items.length < 13) {
      requeued.current.add(it.id);
      added = 1;
      setItems((xs) => [...xs, { ...it }]);
    }
    pending.current = null;
    voice.clear();
    setStage(0);
    setWrong([]);
    setChosen(null);
    setMessage(null);
    setSuccess(false);
    setStep("ask");
    setHeard("");
    setRepeated(false);
    if (i + 1 >= items.length + added) {
      complete({ data: { sessionId } }).catch(() => {});
      setPhase("done");
    } else setI(i + 1);
  }

  // ——— Multiple choice / true-false ———
  async function choose(idx: number) {
    if (chosen !== null || wrong.includes(idx) || stage === 3) return;
    stopAudio();
    if (idx === it.correctIndex) {
      setChosen(idx);
      setSuccess(true);
      setMessage(praiseChoice(stage === 0, it.skill === "conseil"));
      settle(stage === 0 ? "spontaneous" : stage === 1 ? "after_repeat" : "after_cue");
      await sleep(1800);
      goNext();
      return;
    }
    setWrong((w) => [...w, idx]);
    if (stage === 0) {
      setStage(1);
      setMessage("Écoutons encore.");
      await sleep(900);
      play(spoken(it), true);
    } else if (stage === 1) {
      setStage(2);
      setMessage("Voici un indice.");
      await sleep(500);
      play(spoken(it), true);
    } else {
      setStage(3);
      setChosen(it.correctIndex);
      setMessage("Voici la réponse.");
      settle("revealed");
      play([it.options[it.correctIndex]?.label ?? null]);
    }
  }

  // ——— Word retrieval (evoke, complete, nommer) ———
  function found(viaVoice: boolean, spoken = "") {
    setSuccess(true);
    setMessage(stage === 0 ? praise("found") : praise("foundAfterCue"));
    settle(stage === 0 ? "spontaneous" : "after_cue", viaVoice ? wordCount(spoken) : 1);
    setStage(3);
    setStep("model");
    play([it.model]);
  }
  function nextCue() {
    const s = stage + 1;
    setStage(s);
    if (s === 1) {
      setMessage("Voici un indice.");
      if (it.hint) play([it.hint]);
    } else if (s === 2) setMessage("Regardons cela autrement.");
    else {
      setMessage(null);
      settle("revealed");
      setStep("model");
      play([it.answerText, it.model]);
    }
  }
  async function answerRecall() {
    if (voice.listening) {
      const t = voice.stop();
      setHeard(t);
      if (t && it.answerText && heardWord(t, it.answerText)) found(true, t);
      return;
    }
    await voice.start();
  }

  // ——— Open answers (Votre avis, reformulation) ———
  async function answerOpen() {
    if (voice.listening) {
      const t = voice.stop();
      setHeard(t);
      settle("spontaneous", Math.max(1, wordCount(t)));
      setMessage(praise("oral"));
      setSuccess(true);
      setStep("model");
      await sleep(600);
      play([it.model]);
      return;
    }
    await voice.start();
  }
  function skipToModel() {
    settle("after_cue");
    setStep("model");
    play([it.model]);
  }

  // ——— Repeat the model (all spoken exercises) ———
  async function repeatModel() {
    if (voice.listening) {
      voice.stop();
      setRepeated(true);
      setSuccess(true);
      setMessage(praise("repeat"));
      if (it.kind === "oral" && it.mode === "lire") settle("spontaneous", 1);
      return;
    }
    setMessage(null);
    setSuccess(false);
    await voice.start();
  }

  if (phase === "loading")
    return (
      <Center>
        <div className="mx-auto h-16 w-16 rounded-full bg-calm-soft animate-breathe" />
        <p className="mt-10 font-serif text-3xl italic text-muted-foreground">Un instant…</p>
      </Center>
    );
  if (phase === "error")
    return (
      <Center>
        <p className="font-serif text-3xl">La séance n'a pas pu être préparée.</p>
        <p className="mt-3 text-muted-foreground">Veuillez réessayer dans un instant.</p>
        <Link to="/" className="mt-10 inline-block rounded-full bg-primary px-10 py-4 text-lg text-primary-foreground">Retour</Link>
      </Center>
    );
  if (phase === "done") return <Summary log={log.current} minutes={Math.max(1, Math.round((Date.now() - startedAt.current) / 60000))} />;

  const isChoice = it.kind === "mcq" || it.kind === "tf";
  const isRecall = it.kind === "evoke" || it.kind === "complete" || (it.kind === "oral" && it.mode === "nommer");
  const isOpen = it.kind === "oral" && (it.mode === "expliquer" || it.mode === "reformuler");
  const isLire = it.kind === "oral" && it.mode === "lire";
  const title = it.kind === "oral" ? MODE_TITLE[it.mode ?? ""] : it.kind === "complete" ? "Notion à compléter" : it.kind === "evoke" ? "Le terme juste" : it.kind === "tf" ? "Affirmation" : THEME_TITLE[it.theme];

  return (
    <main className="paper-grain flex min-h-screen flex-col px-6 py-6 md:px-12">
      <header className="flex items-center justify-between">
        <Link to="/" className="font-serif text-2xl">Écoute</Link>
        <div className="flex items-center gap-4" aria-label={`${i + 1} sur ${items.length}`}>
          <div className="hidden gap-1.5 sm:flex" aria-hidden>
            {items.map((_, k) => (
              <span key={k} className={`h-2 w-2 rounded-full transition ${k < i ? "bg-calm" : k === i ? "bg-primary ring-4 ring-calm-soft" : "bg-border"}`} />
            ))}
          </div>
          <span className="font-serif text-xl text-muted-foreground">{i + 1} / {items.length}</span>
        </div>
      </header>

      <section key={i} className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center animate-rise">
        <p className="mb-6 text-sm uppercase tracking-[0.25em] text-muted-foreground">{title}</p>
        <button
          onClick={() => play(step === "model" && it.model ? [it.model] : spoken(it), stage > 0)}
          disabled={speaking || voice.listening}
          aria-label="Réécouter"
          className="relative flex h-24 w-24 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl transition hover:scale-105 disabled:opacity-90"
        >
          {speaking && <span className="absolute inset-0 rounded-full bg-calm animate-breathe" />}
          <Volume2 className="relative h-10 w-10" />
        </button>
        <p className="mt-3 h-7 text-lg text-muted-foreground">{needsTap ? "Touchez pour écouter" : speaking ? "" : "Réécouter"}</p>

        {isChoice && <ChoiceBody it={it} stage={stage} wrong={wrong} chosen={chosen} message={message} success={success} onChoose={choose} onNext={goNext} />}

        {isRecall && (
          <div className="mt-4 w-full text-center">
            {it.image && (
              <div className={`mx-auto w-full max-w-xs overflow-hidden rounded-3xl shadow-lg transition ${success ? "ring-4 ring-calm-soft" : ""}`}>
                <img src={imageSrc(it.image) ?? ""} alt="" className="aspect-square w-full object-cover" />
              </div>
            )}
            {it.kind === "complete" ? (
              <p className="mx-auto mt-4 max-w-3xl font-serif text-5xl leading-tight">
                {it.audio.replace(/…$/, "")} <span className="text-calm">{stage >= 3 ? it.answerText : stage === 2 ? it.syllable : "…"}</span>
              </p>
            ) : (
              <>
                {it.kind === "evoke" && <p className="mx-auto mt-2 max-w-3xl font-serif text-4xl leading-tight">{it.audio}</p>}
                <p className="mt-6 h-14 font-serif text-5xl text-calm">{stage >= 3 ? it.answerText : stage === 2 ? it.syllable : ""}</p>
              </>
            )}
            {stage === 1 && it.hint && <p className="mt-4 font-serif text-2xl italic text-muted-foreground">{it.hint}</p>}
            <Feedback message={message} success={success} />
            {step === "model" && it.model && it.kind !== "oral" && <p className="mx-auto mt-2 max-w-3xl font-serif text-2xl italic text-muted-foreground">{it.model}</p>}
            <Heard text={voice.listening ? voice.transcript : step === "ask" ? heard : ""} />
            <Actions>
              {step === "ask" ? (
                <>
                  <MicBtn listening={voice.listening} onClick={answerRecall} label="Répondre" />
                  {!voice.listening && (canHint || stage > 0) && <Btn subtle onClick={nextCue}>{stage === 0 ? "Un indice" : stage === 1 ? "Le premier son" : "Voir le mot"}</Btn>}
                  {!voice.listening && <Btn subtle onClick={() => found(false)}>Je l'ai trouvé</Btn>}
                </>
              ) : (
                <RepeatActions voice={voice} repeated={repeated} onListen={() => play([it.model])} onRepeat={repeatModel} onNext={goNext} />
              )}
            </Actions>
          </div>
        )}

        {isOpen && (
          <div className="mt-4 w-full text-center">
            <p className="mx-auto max-w-3xl font-serif text-4xl leading-tight">{it.audio}</p>
            {step === "ask" ? (
              <>
                <Heard text={voice.transcript} />
                <Actions>
                  <MicBtn listening={voice.listening} onClick={answerOpen} label="Répondre" doneLabel="J'ai terminé" />
                  {!voice.listening && canHint && <Btn subtle onClick={skipToModel}>Voir une formulation</Btn>}
                </Actions>
              </>
            ) : (
              <>
                <Feedback message={message} success={success} />
                {heard && <p className="mx-auto mt-1 max-w-2xl text-base text-muted-foreground">Ce que j'ai entendu : « {heard} »</p>}
                <p className="mt-6 text-sm uppercase tracking-[0.2em] text-muted-foreground">Une formulation possible</p>
                <p className="mx-auto mt-2 max-w-3xl font-serif text-3xl leading-snug text-calm">{it.model}</p>
                <Actions>
                  <RepeatActions voice={voice} repeated={repeated} onListen={() => play([it.model])} onRepeat={repeatModel} onNext={goNext} />
                </Actions>
              </>
            )}
          </div>
        )}

        {isLire && (
          <div className="mt-4 w-full text-center">
            <p className="mx-auto max-w-3xl font-serif text-5xl leading-tight">{it.audio}</p>
            <p className="mt-4 text-2xl font-medium">{repeated ? "" : "Écoutez, puis répétez la phrase."}</p>
            <Feedback message={message} success={success} />
            <Actions>
              <RepeatActions voice={voice} repeated={repeated} onListen={() => play([it.audio])} onRepeat={repeatModel} onNext={goNext} />
            </Actions>
          </div>
        )}
      </section>
    </main>
  );
}

function RepeatActions({ voice, repeated, onListen, onRepeat, onNext }: { voice: ReturnType<typeof useVoiceInput>; repeated: boolean; onListen: () => void; onRepeat: () => void; onNext: () => void }) {
  if (voice.listening) return <MicBtn listening onClick={onRepeat} label="Répéter" doneLabel="J'ai terminé" />;
  return (
    <>
      {voice.recording && (
        <Btn subtle onClick={voice.playRecording}>
          <Play className="h-5 w-5" /> M'écouter
        </Btn>
      )}
      <Btn subtle onClick={onListen}>
        <Volume2 className="h-5 w-5" /> Écouter
      </Btn>
      <MicBtn listening={false} onClick={onRepeat} label={repeated ? "Réessayer" : "Répéter"} subtle={repeated} />
      <Btn onClick={onNext} subtle={!repeated}>Continuer</Btn>
    </>
  );
}

function ChoiceBody({ it, stage, wrong, chosen, message, success, onChoose, onNext }: { it: PlayItem; stage: number; wrong: number[]; chosen: number | null; message: string | null; success: boolean; onChoose: (k: number) => void; onNext: () => void }) {
  const hasImages = it.options.length > 0 && it.options.every((o) => o.image);
  const n = it.options.length;
  const cols = n === 4 ? "grid-cols-2 lg:grid-cols-4" : n === 3 ? "grid-cols-3" : "grid-cols-2";
  return (
    <>
      <div className="mt-2 min-h-24 text-center">
        {it.image && (
          <img src={imageSrc(it.image) ?? ""} alt="" className="mx-auto mb-5 max-h-64 w-auto max-w-full rounded-3xl shadow-md" />
        )}
        <p className="mx-auto max-w-3xl font-serif text-3xl leading-snug">{it.audio}</p>
        {it.question && <p className="mt-2 font-serif text-2xl italic text-muted-foreground">{it.question}</p>}
        {stage >= 2 && it.keyword && <span className="mt-3 inline-block rounded-full bg-gold/25 px-5 py-1.5 text-xl">{it.keyword}</span>}
        <Feedback message={message} success={success} />
      </div>
      <div className={`mt-4 grid w-full gap-5 ${cols} ${hasImages && n === 2 ? "max-w-2xl" : ""}`}>
        {it.options.map((o, k) => {
          const src = imageSrc(o.image);
          const right = chosen === k;
          const dim = wrong.includes(k) || (stage === 3 && k !== it.correctIndex);
          return (
            <button
              key={k}
              onClick={() => onChoose(k)}
              className={`relative overflow-hidden rounded-3xl border-2 bg-card shadow-sm transition ${right ? "border-calm ring-4 ring-calm-soft animate-glow" : "border-transparent hover:-translate-y-1 hover:shadow-lg"} ${dim ? "opacity-35" : ""}`}
            >
              {hasImages && <div className="aspect-square w-full bg-muted">{src && <img src={src} alt={o.label} className="h-full w-full object-cover" />}</div>}
              <div className={`px-4 text-center ${hasImages ? "py-4 text-2xl" : "py-9 font-serif text-3xl"}`}>{o.label}</div>
              {right && success && (
                <span className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-calm text-primary-foreground animate-pop">
                  <Check className="h-6 w-6" />
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-6 h-14">{stage === 3 && <button onClick={onNext} className="rounded-full bg-primary px-12 py-4 text-xl text-primary-foreground">Continuer</button>}</div>
    </>
  );
}

function Feedback({ message, success }: { message: string | null; success: boolean }) {
  return (
    <p className="mt-3 flex h-9 items-center justify-center gap-2 font-serif text-2xl text-muted-foreground">
      {message && success && (
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-calm-soft text-calm animate-pop">
          <Check className="h-5 w-5" />
        </span>
      )}
      <span key={message ?? ""} className={message ? "animate-rise" : ""}>{message}</span>
    </p>
  );
}

function Heard({ text }: { text: string }) {
  return <p className="mx-auto mt-3 min-h-7 max-w-2xl text-lg italic text-muted-foreground">{text ? `« ${text} »` : ""}</p>;
}

function Actions({ children }: { children: React.ReactNode }) {
  return <div className="mt-8 flex flex-wrap items-center justify-center gap-3">{children}</div>;
}

function MicBtn({ listening, onClick, label, doneLabel = "J'ai terminé", subtle }: { listening: boolean; onClick: () => void; label: string; doneLabel?: string; subtle?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`relative inline-flex items-center gap-3 rounded-full px-8 py-4 text-xl transition ${listening ? "bg-calm text-primary-foreground" : subtle ? "border bg-card text-foreground" : "bg-primary text-primary-foreground hover:opacity-90"}`}
    >
      {listening && <span className="absolute inset-0 rounded-full bg-calm animate-breathe" />}
      <span className="relative flex items-center gap-3">
        {listening ? <Square className="h-5 w-5" /> : <Mic className="h-6 w-6" />}
        {listening ? doneLabel : label}
      </span>
    </button>
  );
}

function Btn({ children, onClick, subtle }: { children: React.ReactNode; onClick: () => void; subtle?: boolean }) {
  return (
    <button onClick={onClick} className={`inline-flex items-center gap-2 rounded-full px-7 py-4 text-lg transition ${subtle ? "border bg-card text-foreground hover:bg-muted" : "bg-primary text-primary-foreground hover:opacity-90"}`}>
      {children}
    </button>
  );
}

function Summary({ log, minutes }: { log: Done[]; minutes: number }) {
  const [week, setWeek] = useState<string | null>(null);
  useEffect(() => {
    const t = setTimeout(() => weekSummary().then((w) => setWeek(weekLine(w))).catch(() => {}), 800);
    return () => clearTimeout(t);
  }, []);
  const spont = log.filter((l) => l.outcome === "spontaneous").length;
  const oral = log.filter((l) => l.spoken).length;
  const cases = log.filter((l) => l.skill === "conseil").length;
  const themes = ["nutrition", "avis", "sciences", "temps"].map((t) => ({ t, n: log.filter((l) => l.theme === t && l.outcome === "spontaneous").length })).sort((a, b) => b.n - a.n);
  const best = themes[0] && themes[0].n >= 2 ? themes[0].t : null;
  const goal = todayGoal();
  const reached = goal.id === "oral" ? oral >= goal.target : goal.id === "cases" ? cases >= goal.target : minutes >= goal.target;
  const lines = [
    spont > 0 && `${spont} réponse${spont > 1 ? "s" : ""} retrouvée${spont > 1 ? "s" : ""} spontanément.`,
    oral > 0 && `${oral} réponse${oral > 1 ? "s" : ""} formulée${oral > 1 ? "s" : ""} à l'oral.`,
  ].filter(Boolean) as string[];
  return (
    <Center>
      <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Séance terminée</p>
      <h1 className="mt-3 text-6xl text-primary animate-pop">Excellente séance aujourd'hui.</h1>
      <ul className="mx-auto mt-8 max-w-2xl space-y-2 font-serif text-2xl text-muted-foreground">
        {lines.map((l) => <li key={l}>{l}</li>)}
      </ul>
      {reached && (
        <p className="mt-8 inline-flex items-center gap-3 rounded-full bg-card px-6 py-3 text-lg shadow-sm animate-rise [animation-delay:400ms]">
          Objectif atteint <Check className="h-5 w-5 text-calm" /> Votre progression se confirme.
        </p>
      )}
      <p className="mt-8 font-serif text-3xl italic text-muted-foreground">À demain.</p>
      <Link to="/" className="mt-10 inline-block rounded-full border bg-card px-10 py-4 text-lg">Accueil</Link>
    </Center>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <main className="paper-grain flex min-h-screen flex-col items-center justify-center px-8 py-10 text-center animate-rise">{children}</main>;
}
