import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Lightbulb, Mic, Play, Square, Volume2 } from "lucide-react";
import { completeSession, recordAttempt, speak, speakCached, startSession, type PlayItem } from "@/lib/session.functions";
import { buildPlan } from "@/lib/builder";
import { supabase } from "@/integrations/supabase/client";
import { imageSrc } from "@/lib/library";
import { visualHintFor, type VisualHint } from "@/lib/visual-hints";
import { responseInstruction } from "@/lib/response-guidance";
import { GuidedSession } from "@/components/guided-session";
import { accentOf } from "@/lib/accents";
import { heardWord, useVoiceInput, wordCount } from "@/lib/voice-input";
import { praise, praiseChoice } from "@/lib/praise";
import { todayGoal } from "@/lib/week";
import { DEFAULT_INTERESTS, GUEST_KEY, INTERESTS, PREFIX, interestsOf } from "@/lib/interests";

export const Route = createFileRoute("/seance")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Séance du jour — Connexions" },
      { name: "description", content: "Conversation ou Votre regard : une séance de découverte et d'expression, avec des aides facultatives." },
      { property: "og:title", content: "Séance du jour — Connexions" },
      { property: "og:description", content: "Conversation ou Votre regard : une séance de découverte et d'expression, avec des aides facultatives." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GuidedSession,
});

type Outcome = "spontaneous" | "after_repeat" | "after_cue" | "revealed";
type Done = { theme: string; topic: string; skill: string; kind: string; outcome: Outcome; spoken: boolean; recall: boolean };
const FOCUS_KEY = "connexions.focus";
const WITH_SEQ = ["sante", "medecine", "sciences", "histoire", "art", "geographie", "nature", "litterature", "technologie", "cuisine", "sport"];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Browser/device French voice — no network, no cost. Used only if the server voice fails. */
function speakLocally(text: string, rate: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;
    if (!synth) return reject(new Error("no speech"));
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "fr-FR";
    u.rate = 0.9 * rate;
    // Always the same female French voice, so the voice never changes between sentences.
    const frs = synth.getVoices().filter((v) => v.lang?.toLowerCase().startsWith("fr"));
    const FEMALE = /am[ée]lie|audrey|aur[ée]lie|marie|virginie|julie|denise|hortense|c[ée]line|eloise|vivienne|google fran/i;
    const MALE = /thomas|daniel|paul|henri|nicolas|claude|jacques|remy|antoine|jean/i;
    const fr = frs.find((v) => FEMALE.test(v.name)) ?? frs.find((v) => !MALE.test(v.name)) ?? frs[0];
    if (fr) u.voice = fr;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    synth.cancel();
    synth.speak(u);
  });
}

const MODE_TITLE: Record<string, string> = { expliquer: "Votre avis", lire: "Formulation", reformuler: "Avec vos mots", nommer: "Regard d'expert" };
const TOPIC_TITLE: Record<string, string> = { ...Object.fromEntries(INTERESTS.map((x) => [x.id, x.label])), sante: "Santé & nutrition", general: "Organisation" };
const THEME_TITLE: Record<string, string> = { nutrition: "Nutrition", avis: "Cas pratique", sciences: "Culture scientifique", temps: "Organisation" };
const THEME_FR: Record<string, string> = { nutrition: "de nutrition", avis: "les cas pratiques", sciences: "de culture scientifique", temps: "d'organisation" };

function Seance() {
  const start = useServerFn(startSession);
  const speakFn = useServerFn(speak);
  const cachedFn = useServerFn(speakCached);
  const record = useServerFn(recordAttempt);
  const complete = useServerFn(completeSession);
  const voice = useVoiceInput();
  const guest = useRef(false);
  const [isGuest, setIsGuest] = useState(false);

  const [phase, setPhase] = useState<"loading" | "choose" | "play" | "done" | "error">("loading");
  const [teaser, setTeaser] = useState("");
  const [focusOpts, setFocusOpts] = useState<string[]>([]);
  const begin = useRef<(focus: string | null) => void>(() => {});
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
  const [reading, setReading] = useState(-1); // option index being read aloud
  const [cue, setCue] = useState<string | null>(null);

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
        p = (guest.current ? cachedFn({ data: { text } }) : speakFn({ data: { text } })).then(({ audio: b64 }) => {
          if (!b64) throw new Error("not cached");
          const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
          return URL.createObjectURL(new Blob([bytes], { type: "audio/wav" }));
        });
        p.catch(() => cache.current.delete(text));
        cache.current.set(text, p);
      }
      return p;
    },
    [speakFn, cachedFn],
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
    async (texts: (string | null)[], slow = false, onStep?: (k: number) => void) => {
      const id = ++playId.current;
      audio.current?.pause();
      setSpeaking(true);
      let completed = false;
      try {
        let prev: string | null = null;
        for (let k = 0; k < texts.length; k++) {
          const t = texts[k];
          if (!t) continue;
          if (id !== playId.current) return false;
          if (prev) await sleep(700);
          if (id !== playId.current) return false;
          onStep?.(k);
          await playOne(t, slow ? 0.85 : 1);
          prev = t;
        }
        completed = id === playId.current;
        setNeedsTap(false);
      } catch {
        setNeedsTap(true);
      } finally {
        if (id === playId.current) {
          setSpeaking(false);
          setReading(-1);
          shownAt.current = Date.now();
        }
      }
      return completed;
    },
    [playOne],
  );

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      let mine: string[] = DEFAULT_INTERESTS.map((x) => PREFIX + x);
      if (data.session) {
        const { data: st } = await supabase.from("caregiver_settings").select("topics").eq("user_id", data.session.user.id).maybeSingle();
        if (st?.topics?.length) mine = st.topics;
      } else {
        // Discovery mode: built locally, nothing saved.
        guest.current = true;
        setIsGuest(true);
        try {
          const saved = JSON.parse(localStorage.getItem(GUEST_KEY) ?? "null");
          if (Array.isArray(saved) && saved.length) mine = saved;
        } catch {}
      }
      begin.current = (focus) => {
        setPhase("loading");
        (data.session ? start({ data: { focus } }) : Promise.resolve({ sessionId: "", ...buildPlan([], mine, 1, focus) }))
          .then((r) => {
            if (!r.items.length) throw new Error("empty");
            setSessionId(r.sessionId);
            setItems(r.items);
            setTeaser(r.teaser);
            startedAt.current = Date.now();
            const f = r.items[0]!;
            Promise.allSettled([clip(f.audio), f.question ? clip(f.question) : null]).finally(() => setPhase("play"));
          })
          .catch(() => setPhase("error"));
      };
      // Occasional choice (Tuesday and Friday, once that day): he picks the main subject.
      const day = new Date().toISOString().slice(0, 10);
      const opts = interestsOf(mine).filter((x) => WITH_SEQ.includes(x)).slice(0, 3);
      if ([2, 5].includes(new Date().getDay()) && opts.length >= 2 && localStorage.getItem(FOCUS_KEY) !== day) {
        setFocusOpts(opts);
        setPhase("choose");
      } else begin.current(null);
    })().catch(() => setPhase("error"));
  }, [start, clip]);

  function pickFocus(f: string | null) {
    localStorage.setItem(FOCUS_KEY, new Date().toISOString().slice(0, 10));
    begin.current(f);
  }

  const it = items[i] as PlayItem;
  /** Full prompt read aloud: sentence, question, then each answer. */
  const intro = (x: PlayItem) => [...(x.recall ? [x.recall] : []), ...(x.stage === "comprendre" ? ["Écoutez cette information."] : [])];
  const isChoiceItem = (x: PlayItem) => x.kind === "mcq" || x.kind === "tf";
  const spoken = (x: PlayItem) => [...intro(x), x.audio, x.question, ...(isChoiceItem(x) ? [responseInstruction(x), ...x.options.map((o) => o.label)] : [])];
  /** Read the prompt; highlight each answer while it is read; then say clearly when it is his turn to speak. */
  const readItem = async (x: PlayItem, slow = false, questionOnly = false) => {
    setCue(null);
    const full = spoken(x);
    const texts = questionOnly ? [x.audio, x.question] : full;
    const h = isChoiceItem(x) && !questionOnly ? texts.length - x.options.length : -1;
    const done = await play(texts, slow, (k) => {
      setReading(h >= 0 && k >= h ? k - h : -1);
    });
    const open = x.kind === "oral" || x.kind === "evoke" || x.kind === "complete";
    if (done && open && !questionOnly) {
      const c = responseInstruction(x);
      setCue(c);
      const ok = await play([c]);
      if (ok && !(x.kind === "oral" && x.mode === "lire")) voice.start();
    }
  };

  useEffect(() => {
    if (phase !== "play" || !it) return;
    setCanHint(false);
    const t = setTimeout(() => setCanHint(true), 5000);
    readItem(it);
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
    if (!guest.current) record({
      data: { sessionId, itemId: it.id, kind, category: it.theme, skill: it.skill, prompt: it.audio, optionCount: it.kind === "oral" ? p.spoken : it.options.length, outcome: p.outcome, responseMs: p.responseMs, repeated },
    }).catch(() => {});
    log.current.push({ theme: it.theme, topic: it.topic, skill: it.skill, kind, outcome: p.outcome, spoken: p.spoken > 0, recall: !!it.recall });
    // A concept that needed the answer comes back once, later in the same session.
    let added = 0;
    if (p.outcome === "revealed" && it.kind !== "oral" && !requeued.current.has(it.id) && items.length < 12) {
      requeued.current.add(it.id);
      added = 1;
      setItems((xs) => [...xs, { ...it, recall: null }]);
    }
    pending.current = null;
    voice.clear();
    setStage(0);
    setWrong([]);
    setChosen(null);
    setMessage(null);
    setSuccess(false);
    setStep("ask");
    setCue(null);
    setReading(-1);
    setHeard("");
    setRepeated(false);
    if (i + 1 >= items.length + added) {
      if (!guest.current) complete({ data: { sessionId } }).catch(() => {});
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
      const p = praiseChoice(stage === 0, it.skill === "conseil");
      setMessage(p);
      settle(stage === 0 ? "spontaneous" : stage === 1 ? "after_repeat" : "after_cue");
      await play([p]);
      await sleep(900);
      goNext();
      return;
    }
    setWrong((w) => [...w, idx]);
    if (stage === 0) {
      setStage(1);
      setMessage("Écoutons encore.");
      await play(["Écoutons encore."]);
      readItem(it, true);
    } else if (stage === 1) {
      setStage(2);
      setMessage("Voici un indice.");
      await play(["Voici un indice."]);
      readItem(it, true);
    } else {
      setStage(3);
      setChosen(it.correctIndex);
      setMessage("Voici la réponse.");
      settle("revealed");
      play(["Voici la réponse.", it.options[it.correctIndex]?.label ?? null]);
    }
  }

  // ——— Word retrieval (evoke, complete, nommer) ———
  function found(viaVoice: boolean, spoken = "") {
    setSuccess(true);
    const m = stage === 0 ? praise("found") : praise("foundAfterCue");
    setMessage(m);
    settle(stage === 0 ? "spontaneous" : "after_cue", viaVoice ? wordCount(spoken) : 1);
    setStage(3);
    setStep("model");
    play([m, it.model]);
  }
  function nextCue() {
    const s = stage + 1;
    setStage(s);
    if (s === 1) {
      setMessage("Voici un indice.");
      if (it.hint) play([it.hint]);
    } else if (s === 2) {
      setMessage("Regardons cela autrement.");
      play(["Regardons cela autrement."]);
    }
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
      const m = praise("oral");
      setMessage(m);
      setSuccess(true);
      setStep("model");
      setCue(null);
      await sleep(400);
      play([m, it.model ? "Voici une formulation possible." : null, it.model]);
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
      const m = praise("repeat");
      setMessage(m);
      play([m]);
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
  if (phase === "choose")
    return (
      <Center>
        <div className="w-full max-w-3xl rounded-[2rem] border border-border bg-card px-8 py-14 shadow-sm md:px-14">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-primary">Séance du jour</p>
        <h1 className="mt-4 font-serif text-5xl md:text-6xl">Aujourd'hui, vous préférez :</h1>
        <div className="mt-12 flex flex-wrap justify-center gap-4">
          {focusOpts.map((f) => (
            <button key={f} onClick={() => pickFocus(f)} className="rounded-full border-2 border-border bg-card px-9 py-5 text-2xl font-semibold shadow-sm transition hover:-translate-y-0.5 hover:border-primary hover:bg-sage-soft">
              {TOPIC_TITLE[f] ?? f}
            </button>
          ))}
        </div>
        <button onClick={() => pickFocus(null)} className="mt-10 text-lg font-medium text-primary underline underline-offset-4">Comme d'habitude</button>
        </div>
      </Center>
    );
  if (phase === "done") return <Summary guest={isGuest} log={log.current} teaser={teaser} minutes={Math.max(1, Math.round((Date.now() - startedAt.current) / 60000))} />;

  const isChoice = it.kind === "mcq" || it.kind === "tf";
  const isRecall = it.kind === "evoke" || it.kind === "complete" || (it.kind === "oral" && it.mode === "nommer");
  const isOpen = it.kind === "oral" && (it.mode === "expliquer" || it.mode === "reformuler");
  const isLire = it.kind === "oral" && it.mode === "lire";
  const STAGE_LABEL = { comprendre: "Comprendre", retrouver: "Retrouver", exprimer: "S'exprimer", reformuler: "Reformuler" } as const;
  const title = it.stage ? `${STAGE_LABEL[it.stage]} · ${it.seqTitle}` : it.kind === "oral" ? MODE_TITLE[it.mode ?? ""] : it.kind === "complete" ? "Notion à compléter" : it.kind === "evoke" ? "Le terme juste" : it.kind === "tf" ? "Affirmation" : (TOPIC_TITLE[it.topic] ?? THEME_TITLE[it.theme]);
  /** Colour of this step's activity — identity only, never a level or a score. */
  const accent = accentOf(it);

  return (
    <main className="paper-grain flex min-h-screen flex-col px-6 py-6 md:px-12">
      <header className="flex items-center justify-between">
        <Link to="/" className="font-serif text-2xl">Connexions</Link>
        <div className="flex items-center gap-4" aria-label={`${i + 1} sur ${items.length}`}>
          <div className="hidden gap-1.5 sm:flex" aria-hidden>
            {items.map((_, k) => (
              <span key={k} className={`h-2.5 w-2.5 rounded-full transition ${k < i ? accent.solid : k === i ? `bg-primary ring-4 ${accent.ring}` : "bg-foreground/40"}`} />
            ))}
          </div>
          <span className="font-serif text-xl text-muted-foreground">{i + 1} / {items.length}</span>
        </div>
      </header>

      <section key={i} className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center animate-rise">
        <p className="mb-6 flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.25em]">
          <span className={`h-2 w-2 rounded-full ${accent.solid}`} aria-hidden />
          <span className={accent.text}>{title}</span>
        </p>
        <button
          onClick={() => (step === "model" && it.model ? play([it.model]) : readItem(it, stage > 0))}
          disabled={speaking || voice.listening}
          aria-label="Réécouter"
          className="relative flex h-24 w-24 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl transition hover:scale-105 disabled:opacity-90"
        >
          {speaking && <span className="absolute inset-0 rounded-full bg-calm animate-breathe" />}
          <Volume2 className="relative h-10 w-10" />
        </button>
        <p className="mt-3 h-7 text-lg text-muted-foreground">{needsTap ? "Touchez pour écouter" : speaking ? "" : "Réécouter"}</p>
        {isChoice && !speaking && it.question && chosen === null && (
          <button onClick={() => readItem(it, false, true)} className="mt-1 text-sm text-muted-foreground underline underline-offset-4">Question seulement</button>
        )}
        {!isChoice && step === "ask" && <TurnCue text={cue ?? responseInstruction(it)} listening={voice.listening} />}

        {isChoice && <ChoiceBody it={it} accent={accent} reading={reading} stage={stage} wrong={wrong} chosen={chosen} message={message} success={success} onChoose={choose} onNext={goNext} />}

        {isRecall && (
          <div className="mt-4 w-full text-center">
            {it.image && (it.mode === "nommer" || it.image !== visualHintFor(it)?.image) && (
              <div className={`mx-auto w-full max-w-xs overflow-hidden rounded-3xl shadow-lg transition ${success ? "ring-4 ring-calm-soft" : ""}`}>
                <img src={imageSrc(it.image) ?? ""} alt="" className={`w-full ${it.image === "legumes" ? "aspect-[3/2] object-contain" : "aspect-square object-cover"}`} />
              </div>
            )}
            {it.kind === "complete" ? (
              <p className="mx-auto mt-4 max-w-3xl font-serif text-2xl leading-snug md:text-3xl">
                {it.audio.replace(/…$/, "")} <span className="text-calm">{stage >= 3 ? it.answerText : stage === 2 ? it.syllable : "…"}</span>
              </p>
            ) : (
              <>
                {it.kind === "evoke" && <p className="mx-auto mt-2 max-w-3xl font-serif text-2xl leading-snug md:text-3xl">{it.audio}</p>}
                <p className="mt-6 h-14 font-serif text-5xl text-calm">{stage >= 3 ? it.answerText : stage === 2 ? it.syllable : ""}</p>
              </>
            )}
            {stage >= 1 && step === "ask" && <HintPhoto hint={visualHintFor(it)} />}
            <Feedback message={message} success={success} />
            {step === "model" && it.model && it.kind !== "oral" && <p className="mx-auto mt-2 max-w-3xl font-serif text-2xl italic text-muted-foreground">{it.model}</p>}
            <Heard text={voice.listening ? voice.transcript : step === "ask" ? heard : ""} />
            <Actions>
              {step === "ask" ? (
                <>
                  <MicBtn listening={voice.listening} onClick={answerRecall} label="Répondre" />
                  {!voice.listening && <Btn subtle onClick={nextCue}><Lightbulb className="h-6 w-6 text-u-retrouver" aria-hidden />{stage === 0 ? "Indice" : stage === 1 ? "Le premier son" : "Voir le mot"}</Btn>}
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
            {it.image && it.image !== visualHintFor(it)?.image && <img src={imageSrc(it.image) ?? ""} alt="" className="mx-auto mb-5 max-h-56 w-auto max-w-full rounded-3xl shadow-md" />}
            <p className="mx-auto max-w-3xl font-serif text-2xl leading-snug md:text-3xl">{it.audio}</p>
            {step === "ask" && <OptionalVisualHint key={it.id} hint={visualHintFor(it)} />}
            {step === "ask" ? (
              <>
                <Heard text={voice.transcript} />
                <Actions>
                  <MicBtn listening={voice.listening} onClick={answerOpen} label="Répondre" doneLabel="Terminer ma réponse" />
                  {!voice.listening && canHint && <Btn subtle onClick={skipToModel}>Voir une formulation</Btn>}
                </Actions>
              </>
            ) : (
              <>
                <Feedback message={message} success={success} />
                {heard && <p className="mx-auto mt-1 max-w-2xl text-base text-muted-foreground">Ce que j'ai entendu : « {heard} »</p>}
                <p className="mt-6 text-sm uppercase tracking-[0.2em] text-muted-foreground">Une formulation possible</p>
                <p className={`mx-auto mt-2 max-w-3xl font-serif text-3xl leading-snug ${accent.text}`}>{it.model}</p>
                <Actions>
                  <RepeatActions voice={voice} repeated={repeated} onListen={() => play([it.model])} onRepeat={repeatModel} onNext={goNext} />
                </Actions>
              </>
            )}
          </div>
        )}

        {isLire && (
          <div className="mt-4 w-full text-center">
            <p className="mx-auto max-w-3xl font-serif text-2xl leading-snug md:text-3xl">{it.audio}</p>
            {step === "ask" && <OptionalVisualHint key={it.id} hint={visualHintFor(it)} />}
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
  if (voice.listening) return <MicBtn listening onClick={onRepeat} label="Répéter" doneLabel="Terminer ma réponse" />;
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

function ChoiceBody({ it, accent, reading, stage, wrong, chosen, message, success, onChoose, onNext }: { it: PlayItem; accent: ReturnType<typeof accentOf>; reading: number; stage: number; wrong: number[]; chosen: number | null; message: string | null; success: boolean; onChoose: (k: number) => void; onNext: () => void }) {
  const hasImages = it.options.length > 0 && it.options.every((o) => o.image);
  const n = it.options.length;
  const cols = n === 4 ? "grid-cols-2 lg:grid-cols-4" : n === 3 ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2";
  return (
    <>
      <div className="mt-2 min-h-24 text-center">
        {it.image && it.image !== visualHintFor(it).image && (
          <img src={imageSrc(it.image) ?? ""} alt="" className="mx-auto mb-5 max-h-64 w-auto max-w-full rounded-3xl shadow-md" />
        )}
        <p className="mx-auto max-w-3xl font-serif text-2xl leading-snug md:text-3xl">{it.audio}</p>
        {it.question && <p className={`mt-3 font-serif text-2xl ${accent.text}`}>{it.question}</p>}
        {chosen === null && <p className="mt-4 text-xl font-medium text-foreground">{responseInstruction(it)}</p>}
        {stage >= 2 && it.keyword && <span className="mt-3 inline-block rounded-full bg-gold/25 px-5 py-1.5 text-xl">{it.keyword}</span>}
        {chosen === null && <OptionalVisualHint key={it.id} hint={visualHintFor(it)} />}
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
              className={`relative overflow-hidden rounded-3xl border-2 bg-card text-card-foreground shadow-sm transition ${right ? "border-calm ring-4 ring-calm-soft animate-glow" : reading === k ? "border-foreground/50 ring-4 ring-border scale-[1.02]" : "border-foreground/25 hover:border-foreground/50 hover:-translate-y-1 hover:shadow-lg"} ${dim ? "opacity-60" : ""}`}
            >
              {hasImages && <div className="aspect-square w-full bg-muted">{src && <img src={src} alt={o.label} className="h-full w-full object-cover" />}</div>}
              <div className={`px-4 text-center ${hasImages ? "py-4 text-2xl" : "py-8 font-serif text-2xl"}`}>{o.label}</div>
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

function TurnCue({ text, listening }: { text: string; listening: boolean }) {
  return (
    <div className="mt-4 flex flex-col items-center gap-1 animate-rise">
      <p className="font-serif text-2xl text-calm">{text}</p>
      <p className="flex h-7 items-center gap-2 text-lg text-muted-foreground">
        {listening && (
          <>
            <span className="flex items-end gap-0.5" aria-hidden>
              {[0, 1, 2, 3].map((b) => (
                <span key={b} className="w-1 rounded-full bg-calm animate-breathe" style={{ height: 8 + (b % 2) * 8, animationDelay: `${b * 0.2}s` }} />
              ))}
            </span>
            Je vous écoute
          </>
        )}
      </p>
    </div>
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

function MicBtn({ listening, onClick, label, doneLabel = "Terminer ma réponse", subtle }: { listening: boolean; onClick: () => void; label: string; doneLabel?: string; subtle?: boolean }) {
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

function HintPhoto({ hint }: { hint: VisualHint | null }) {
  if (!hint) return null;
  return (
    <figure className="mx-auto mt-4 max-w-56" aria-live="polite">
      {hint.image && <img src={imageSrc(hint.image) ?? ""} alt={hint.alt} width={480} height={480} className="max-h-56 w-full rounded-lg object-contain" />}
      {hint.caption && <figcaption className="mt-2 text-lg text-foreground">{hint.caption}</figcaption>}
    </figure>
  );
}

function OptionalVisualHint({ hint }: { hint: VisualHint | null }) {
  const [visible, setVisible] = useState(false);
  if (!hint) return null;
  return (
    <div className="mt-5">
      <Btn subtle onClick={() => setVisible((v) => !v)} expanded={visible} controls="visual-hint">
        <Lightbulb className="h-6 w-6 text-u-retrouver" aria-hidden />
        {visible ? "Masquer l’indice" : "Indice"}
      </Btn>
      {visible && (
        <div id="visual-hint"><HintPhoto hint={hint} /></div>
      )}
    </div>
  );
}

function Btn({ children, onClick, subtle, expanded, controls }: { children: React.ReactNode; onClick: () => void; subtle?: boolean; expanded?: boolean; controls?: string }) {
  return (
    <button onClick={onClick} aria-expanded={expanded} aria-controls={controls} className={`inline-flex items-center gap-2 rounded-full px-7 py-4 text-lg transition ${subtle ? "border bg-card text-foreground hover:bg-muted" : "bg-primary text-primary-foreground hover:opacity-90"}`}>
      {children}
    </button>
  );
}

/** One single highlight, chosen by simple rules — never a list of statistics. */
function highlight(log: Done[]): string {
  const found = log.filter((l) => (l.kind === "evoke" || l.kind === "complete") && l.outcome === "spontaneous").length;
  const oral = log.filter((l) => l.spoken).length;
  if (log.some((l) => l.recall && l.outcome !== "revealed")) return "Vous avez repris un sujet déjà abordé, et retrouvé l'essentiel.";
  if (found >= 2) return `Vous avez retrouvé ${found} mots sans aide.`;
  if (oral >= 2) return "Vous avez formulé plusieurs réponses à voix haute.";
  const by = new Map<string, number>();
  for (const l of log) if (l.outcome === "spontaneous" && l.topic !== "general") by.set(l.topic, (by.get(l.topic) ?? 0) + 1);
  const best = [...by].sort((a, b) => b[1] - a[1])[0];
  if (best && best[1] >= 2) return `Très belle compréhension sur le thème ${TOPIC_TITLE[best[0]] ?? best[0]}.`;
  return "Vous avez bien mobilisé vos connaissances et votre expression.";
}

function Summary({ log, minutes, teaser }: { log: Done[]; minutes: number; guest?: boolean; teaser: string }) {
  const oral = log.filter((l) => l.spoken).length;
  const cases = log.filter((l) => l.skill === "conseil").length;
  const goal = todayGoal();
  const reached = goal.id === "oral" ? oral >= goal.target : goal.id === "cases" ? cases >= goal.target : minutes >= goal.target;
  return (
    <Center>
      <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Séance terminée</p>
      <h1 className="mt-3 text-6xl text-primary animate-pop">Très belle séance aujourd'hui.</h1>
      <div className="mx-auto mt-10 max-w-2xl rounded-3xl border bg-card px-8 py-7 shadow-sm animate-rise [animation-delay:300ms]">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand">Moment fort aujourd'hui</p>
        <p className="mt-3 font-serif text-3xl leading-snug">{highlight(log)}</p>
      </div>
      {reached && (
        <p className="mt-6 inline-flex items-center gap-2 text-lg text-muted-foreground animate-rise [animation-delay:500ms]">
          Objectif atteint <Check className="h-5 w-5 text-calm" />
        </p>
      )}
      {teaser && <p className="mt-10 text-xl text-muted-foreground animate-rise [animation-delay:700ms]">{teaser}</p>}
      <p className="mt-6 font-serif text-3xl italic text-muted-foreground">À demain.</p>
      <Link to="/" className="mt-10 inline-block rounded-full border bg-card px-10 py-4 text-lg">Accueil</Link>
    </Center>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <main className="paper-grain flex min-h-screen flex-col items-center justify-center px-8 py-10 text-center animate-rise">{children}</main>;
}
