import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Lightbulb, Mic, Play, Square, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildPlan } from "@/lib/builder";
import { confirmText, discussionTurns, revealText, type DiscussionTurn } from "@/lib/discussion";
import { completeSession, recordAttempt, speak, speakCached, startSession } from "@/lib/session.functions";
import { deriveParams, type SessionParams } from "@/lib/adaptive-profile";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_INTERESTS, GUEST_KEY, INTERESTS, PREFIX } from "@/lib/interests";
import { visualHintFor } from "@/lib/visual-hints";
import { imageSrc } from "@/lib/library";
import { heardWord, useVoiceInput, wordCount } from "@/lib/voice-input";
import { accentOf } from "@/lib/accents";

type Outcome = "spontaneous" | "after_repeat" | "after_cue" | "revealed";
/** Simple mode (accompagnement renforcé): what the screen is waiting for. One thing at a time. */
type SimpleStep = "speaking" | "choose" | "listen" | "after";
const OPINION = "Donnez votre avis à voix haute.";
const WELL_SAID = "Très bien dit.";
const hasSpeechRecognition = () =>
  typeof window !== "undefined" && !!((window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition); // eslint-disable-line @typescript-eslint/no-explicit-any
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Device French voice — last resort only, when the natural voice cannot be produced (better than silence). */
function speakDevice(text: string, rate: number): Promise<boolean> {
  return new Promise((resolve) => {
    const s = typeof window !== "undefined" ? window.speechSynthesis : undefined;
    if (!s) return resolve(false);
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "fr-FR";
    u.rate = 0.9 * rate;
    const frs = s.getVoices().filter((v) => v.lang?.toLowerCase().startsWith("fr"));
    const fem = /am[ée]lie|audrey|aur[ée]lie|marie|virginie|julie|denise|hortense|c[ée]line|eloise|vivienne|google fran/i;
    const v = frs.find((x) => fem.test(x.name)) ?? frs[0];
    if (v) u.voice = v;
    u.onend = () => resolve(true);
    u.onerror = () => resolve(true);
    s.speak(u);
  });
}

export function GuidedSession() {
  const start = useServerFn(startSession);
  const cached = useServerFn(speakCached);
  const synth = useServerFn(speak);
  const [params, setParams] = useState<SessionParams>(() => deriveParams({}));
  const signedIn = useRef(false);
  const confusion = useRef(0);
  const record = useServerFn(recordAttempt);
  const complete = useServerFn(completeSession);
  const voice = useVoiceInput();
  const [state, setState] = useState<"loading" | "ready" | "play" | "done" | "error">("loading");
  const [turns, setTurns] = useState<DiscussionTurn[]>([]);
  const [index, setIndex] = useState(0);
  const [view, setView] = useState<"prompt" | "develop" | "model">("prompt");
  const [simpleStep, setSimpleStep] = useState<SimpleStep>("speaking");
  const [hintVisible, setHintVisible] = useState(false);
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [heard, setHeard] = useState("");
  const [teaser, setTeaser] = useState("");
  const [audioUnavailable, setAudioUnavailable] = useState(false);
  /** The expected answer once it has been said (confirmed or revealed) — a knowledge turn always ends with it. */
  const [answerLine, setAnswerLine] = useState<string | null>(null);
  // Set by the caregiver in the profile (or automatically when comprehension is difficult) — never toggled from the session.
  const simple = params.reinforced;
  const instr = (t: DiscussionTurn) =>
    simple ? (t.options.length ? "Touchez votre réponse." : "À vous de parler.") : t.instruction;
  const sessionId = useRef("");
  const audio = useRef<HTMLAudioElement | null>(null);
  const playId = useRef(0);
  const turnRun = useRef(0);
  const clips = useRef(new Map<string, Promise<string | null>>());
  const participated = useRef(false);
  const participationCount = useRef(0);
  const words = useRef(0);
  const supportUsed = useRef(false);
  /** Silent outcome of a knowledge turn — saved for adaptation and the caregiver, never shown. */
  const outcome = useRef<Outcome | null>(null);
  const readyAt = useRef(Date.now());
  const responseMs = useRef<number | null>(null);
  const started = useRef(false);
  const lastHeard = useRef({ text: "", at: 0 });
  const listening = useRef(false);
  const turn = turns[index];

  function stopAudio() {
    playId.current++;
    audio.current?.pause();
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    setSpeaking(false);
  }

  /** The natural voice: fetched (generated once if needed), with one retry. */
  function clip(text: string): Promise<string | null> {
    let p = clips.current.get(text);
    if (!p) {
      const fetchOnce = () => (signedIn.current ? synth({ data: { text } }) : cached({ data: { text } }));
      p = fetchOnce()
        .catch(() => fetchOnce())
        .then((r) => {
          if (!r.audio) return null;
          const bytes = Uint8Array.from(atob(r.audio), (c) => c.charCodeAt(0));
          return URL.createObjectURL(new Blob([bytes], { type: "audio/wav" }));
        })
        .catch(() => null);
      p.then((url) => {
        if (!url) clips.current.delete(text); // tried again next time
      });
      clips.current.set(text, p);
    }
    return p;
  }
  // Whole sentences only: they are the pre-recorded ones, so the voice stays natural and immediate.
  const partsOf = (texts: (string | null | undefined)[]) => texts.filter((t, n): t is string => !!t && texts.indexOf(t) === n);

  /** Reads sentences one after another. Resolves true if everything was read without being interrupted. */
  async function read(texts: (string | null | undefined)[], p = params): Promise<boolean> {
    stopAudio();
    voice.stop();
    const id = playId.current;
    setSpeaking(true);
    setAudioUnavailable(false);
    try {
      for (const [n, text] of partsOf(texts).entries()) {
        if (id !== playId.current) return false;
        if (n > 0 && p.pauseMs) await wait(p.pauseMs);
        if (id !== playId.current) return false;
        const url = await clip(text);
        if (id !== playId.current) return false;
        if (!url) {
          // Natural voice unavailable for this sentence: device voice rather than silence.
          if (!(await speakDevice(text, p.voiceRate))) setAudioUnavailable(true);
          continue;
        }
        const element = audio.current ?? new Audio();
        audio.current = element;
        element.src = url;
        element.playbackRate = p.voiceRate || 1;
        try {
          await element.play();
        } catch (e) {
          // Browser blocked sound before any tap: the start screen / speaker button unlocks it.
          if ((e as Error)?.name === "NotAllowedError") {
            setAudioUnavailable(true);
            return false;
          }
          throw e;
        }
        await new Promise<void>((resolve) => {
          element.onended = () => resolve();
          element.onerror = () => resolve();
        });
      }
      return id === playId.current;
    } catch {
      setAudioUnavailable(true);
      return false;
    } finally {
      if (id === playId.current) {
        setSpeaking(false);
        readyAt.current = Date.now();
      }
    }
  }
  useEffect(
    () => () => {
      playId.current++;
      turnRun.current++;
      audio.current?.pause();
      for (const p of clips.current.values()) p.then((url) => url && URL.revokeObjectURL(url));
    },
    [],
  );

  // ——— Each new turn ———
  useEffect(() => {
    if (state !== "play" || !turn) return;
    const run = ++turnRun.current;
    // Prepare the next turn's voice while this one plays, so it starts without waiting.
    const nextTurn = turns[index + 1];
    if (nextTurn) for (const t of partsOf([nextTurn.item.recall, nextTurn.intro, nextTurn.prompt, instr(nextTurn)])) clip(t);
    if (!simple) {
      read([turn.item.recall, turn.intro, turn.prompt, instr(turn)]);
      return;
    }
    // Simple mode: the screen leads, one step at a time — the person never has to find a button.
    (async () => {
      setSimpleStep("speaking");
      const ok = await read([turn.item.recall, turn.intro, turn.prompt, instr(turn)]);
      if (run !== turnRun.current) return;
      if (!ok && !audioUnavailable) return; // interrupted (Réécouter / Passer): that action takes over
      if (turn.options.length) setSimpleStep("choose");
      else startListening();
    })();
  }, [state, index]); // eslint-disable-line react-hooks/exhaustive-deps

  // ——— Simple mode: listening ends by itself after a pause (slow speakers get time) ———
  useEffect(() => {
    lastHeard.current = { text: voice.transcript, at: Date.now() };
  }, [voice.transcript]);
  useEffect(() => {
    if (!simple || simpleStep !== "listen") return;
    const run = turnRun.current;
    const since = Date.now();
    const silence = 3000 + params.pauseMs;
    const timer = setInterval(() => {
      if (run !== turnRun.current) return clearInterval(timer);
      const { text, at } = lastHeard.current;
      const elapsed = Date.now() - since;
      const doneTalking = !!text && Date.now() - at > silence;
      const nothing = !text && elapsed > (hasSpeechRecognition() ? 15000 : 12000);
      if (doneTalking || nothing || elapsed > 45000) {
        clearInterval(timer);
        finishListening();
      }
    }, 400);
    return () => clearInterval(timer);
  }, [simple, simpleStep]); // eslint-disable-line react-hooks/exhaustive-deps

  // ——— Simple mode: after the answer, move on by itself ———
  useEffect(() => {
    if (!simple || simpleStep !== "after" || state !== "play") return;
    const run = turnRun.current;
    const t = setTimeout(() => run === turnRun.current && next(), 1800 + params.pauseMs);
    return () => clearTimeout(t);
  }, [simple, simpleStep, state]); // eslint-disable-line react-hooks/exhaustive-deps

  function startListening() {
    lastHeard.current = { text: "", at: Date.now() };
    listening.current = true;
    setSimpleStep("listen");
    voice.start();
  }
  async function finishListening() {
    if (!turn || !listening.current) return;
    listening.current = false;
    const run = turnRun.current;
    const text = voice.stop();
    setHeard(text);
    if (text) {
      participated.current = true;
      words.current += wordCount(text);
    }
    setSimpleStep("speaking");
    if (turn.answer) {
      const found = !!text && heardWord(text, turn.answer);
      if (found) settle("spontaneous");
      else if (text) settle("after_repeat");
      else if (hasSpeechRecognition()) settle("revealed"); // without recognition on this device, nothing is inferred
      await closeKnowledge(found);
    } else if (text) await read([WELL_SAID]);
    if (run === turnRun.current) setSimpleStep("after");
  }

  async function begin() {
    try {
      const { data } = await supabase.auth.getSession();
      let topics = DEFAULT_INTERESTS.map((t) => PREFIX + t);
      try {
        const saved = JSON.parse(localStorage.getItem(GUEST_KEY) ?? "null");
        if (Array.isArray(saved) && saved.every((t) => typeof t === "string")) topics = saved;
      } catch {
        // no saved interests on this device
      }
      signedIn.current = !!data.session;
      const local = () => ({ sessionId: "", ...buildPlan([], topics, 1), params: deriveParams({}) });
      // If the server is unreachable, the session still runs (nothing saved) rather than an error screen.
      const result = data.session ? await start({ data: {} }).catch(local) : local();
      sessionId.current = result.sessionId;
      setTeaser(result.teaser);
      setParams(result.params);
      const list = discussionTurns(result.items, "regard")
        .slice(0, result.params.maxTurns)
        .map((t) => ({ ...t, options: t.options.slice(0, result.params.optionCount) }))
        // Keep the expected answer among the choices when options are trimmed.
        .map((t) =>
          t.answer && t.options.length && !t.options.some((o) => o.label === t.answer)
            ? { ...t, options: [...t.options.slice(0, -1), t.item.options.find((o) => o.label === t.answer) ?? { label: t.answer }].sort(() => Math.random() - 0.5) }
            : t,
        );
      if (!list.length) throw new Error("empty");
      setTurns(list);
      // Start the first sentences now, so the voice is ready when the person taps "Commencer".
      for (const t of list.slice(0, 2)) for (const x of partsOf([t.item.recall, t.intro, t.prompt])) clip(x);
      // A tap is needed before any sound in browsers: the start screen is that tap (skipped if one already happened).
      const activated = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation?.hasBeenActive;
      setState(result.params.reinforced || activated === false ? "ready" : "play");
    } catch {
      setState("error");
    }
  }
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    begin();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function go() {
    // Ask for the microphone now, with the caregiver present, rather than in the middle of a question.
    if (simple) navigator.mediaDevices?.getUserMedia({ audio: true }).then((s) => s.getTracks().forEach((t) => t.stop())).catch(() => {});
    setState("play");
  }

  /** First outcome of a knowledge turn wins; later actions never overwrite it. */
  function settle(o: Outcome) {
    if (outcome.current) return;
    outcome.current = o;
    if (o === "spontaneous") responseMs.current = Math.max(0, Date.now() - readyAt.current);
  }
  /** Close a knowledge turn: the answer is always heard and shown. */
  function closeKnowledge(found: boolean, andThen: (string | null)[] = []) {
    if (!turn?.answer) return Promise.resolve(false);
    const line = found ? confirmText(turn.answer) : revealText(turn.answer);
    setAnswerLine(line);
    return read([line, ...andThen]);
  }

  async function answer() {
    stopAudio();
    if (!voice.listening) return void (await voice.start());
    const text = voice.stop();
    setHeard(text);
    participated.current = true;
    words.current += wordCount(text);
    if (view === "develop" || view === "model" || turn?.phase === "repeat") return showModel();
    setView("develop");
    if (turn?.answer && !answerLine) {
      // Speech recognition is only a hint: a match confirms; anything else simply gives the answer, never "wrong".
      const found = !!text && heardWord(text, turn.answer);
      if (found) settle(supportUsed.current ? "after_cue" : "spontaneous");
      else if (text) settle("after_repeat");
      closeKnowledge(found, [turn.followUp, OPINION]);
      return;
    }
    read([turn?.followUp ?? null, OPINION]);
  }
  async function choose(n: number) {
    if (!turn || selected !== null) return;
    stopAudio();
    setSelected(n);
    participated.current = true;
    const run = turnRun.current;
    const label = turn.options[n]?.label;
    if (turn.answer) {
      const found = label === turn.answer;
      // Choices are a support (recognition rather than recall): a right choice counts as "with help".
      settle(found ? "after_cue" : "revealed");
      if (simple) {
        setSimpleStep("speaking");
        await closeKnowledge(found);
        if (run === turnRun.current) setSimpleStep("after");
        return;
      }
      setView("develop");
      closeKnowledge(found, [turn.followUp, OPINION]);
      return;
    }
    setView("develop");
    read([turn.followUp, OPINION]);
  }
  function signal(kind: "repeat" | "notunderstood" | "abandon") {
    if (!sessionId.current || !turn) return;
    record({ data: { sessionId: sessionId.current, itemId: turn.item.id, kind: `signal:${kind}`, category: turn.item.theme, skill: turn.item.skill, prompt: turn.prompt, optionCount: 0, outcome: "after_repeat", responseMs: null } }).catch(() => {});
  }
  /** Explicit "I didn't understand" — distinct from simply listening again. */
  function notUnderstood() {
    if (!turn) return;
    signal("notunderstood");
    supportUsed.current = true;
    confusion.current++;
    // Gentle, gradual: after two requests in this session, slow down and leave longer pauses.
    let p = params;
    if (confusion.current === 2 && params.languageSupport < 3) {
      const support = params.languageSupport + 1;
      p = { ...params, languageSupport: support, pauseMs: params.pauseMs + 300, voiceRate: Math.min(params.voiceRate, [1, 1, 0.92, 0.88][support]!) };
      setParams(p);
    }
    read([turn.prompt], p);
  }
  function relisten() {
    if (!turn) return;
    signal("repeat");
    if (simple) {
      // Read again, then return to what the screen was waiting for.
      const run = turnRun.current;
      listening.current = false;
      setSimpleStep("speaking");
      read(answerLine ? [answerLine] : [turn.prompt, instr(turn)]).then(() => {
        if (run !== turnRun.current) return;
        if (answerLine) setSimpleStep("after");
        else if (turn.options.length) setSimpleStep("choose");
        else startListening();
      });
      return;
    }
    read(
      view === "model"
        ? [turn.model]
        : view === "develop"
          ? [answerLine, turn.followUp, OPINION]
          : [turn.intro, turn.prompt, instr(turn)],
    );
  }
  function showModel() {
    voice.stop();
    if (turn?.answer && !answerLine) settle("revealed");
    setView("model");
    read(["Voici une formulation possible.", turn?.model ?? null]);
  }
  function save(t: DiscussionTurn) {
    if (!sessionId.current) return;
    const id = sessionId.current;
    // Knowledge turns carry their real outcome (for adaptation and the caregiver); other turns stay neutral.
    const evaluated = t.answer && outcome.current;
    const data = evaluated
      ? {
          sessionId: id,
          itemId: t.item.id,
          kind: t.item.kind === "oral" ? (t.item.mode ?? "oral") : t.item.kind,
          category: t.item.theme,
          skill: t.item.skill,
          prompt: t.prompt,
          optionCount: selected !== null ? t.options.length : words.current,
          outcome: outcome.current!,
          responseMs: responseMs.current,
          repeated: false,
        }
      : {
          sessionId: id,
          itemId: t.item.id,
          kind: `discussion:guided:${t.phase}:${participated.current ? "shared" : "listened"}:${supportUsed.current || simple ? "supported" : "independent"}`,
          category: t.item.theme,
          skill: t.item.skill,
          prompt: t.prompt,
          optionCount: words.current,
          outcome: "after_repeat" as Outcome,
          responseMs: null,
          repeated: t.phase === "repeat" && participated.current,
        };
    // Saved in the background, with one retry: a network hiccup must never interrupt the session.
    record({ data }).catch(() => record({ data }).catch(() => {}));
  }
  function next() {
    if (!turn) return;
    // A knowledge turn never ends without its answer: the first "Continuer" gives it, the second moves on.
    if (!simple && turn.answer && !answerLine) {
      settle("revealed");
      closeKnowledge(false);
      return;
    }
    turnRun.current++;
    listening.current = false;
    stopAudio();
    voice.clear();
    save(turn);
    if (participated.current) participationCount.current++;
    const last = index + 1 >= turns.length;
    if (last && sessionId.current) complete({ data: { sessionId: sessionId.current } }).catch(() => {});
    participated.current = false;
    supportUsed.current = false;
    outcome.current = null;
    responseMs.current = null;
    words.current = 0;
    setView("prompt");
    setSimpleStep("speaking");
    setHeard("");
    setHintVisible(false);
    setOptionsVisible(false);
    setSelected(null);
    setAnswerLine(null);
    if (last) setState("done");
    else setIndex((n) => n + 1);
  }

  if (state === "loading")
    return (
      <Frame>
        <p className="font-serif text-3xl">Un instant…</p>
      </Frame>
    );
  if (state === "error")
    return (
      <Frame>
        <p className="font-serif text-2xl">La séance n'a pas pu être préparée.</p>
        <Button asChild variant="outline" className="mt-8">
          <Link to="/">Accueil</Link>
        </Button>
      </Frame>
    );
  if (state === "ready")
    return (
      <Frame>
        <button
          onClick={go}
          aria-label="Commencer"
          className="flex size-48 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-2xl ring-8 ring-primary/20 transition animate-pulse hover:scale-105 md:size-56"
        >
          <Play className="size-24 translate-x-1 md:size-28" fill="currentColor" />
        </button>
        <p className="mt-10 font-serif text-4xl md:text-5xl">Commencer</p>
      </Frame>
    );
  if (state === "done")
    return (
      <Frame>
        <p className="text-sm uppercase text-primary">Séance terminée</p>
        <h1 className="mt-4 font-serif text-4xl">Merci pour ce moment partagé.</h1>
        <p className="mt-8 text-sm uppercase text-brand">Moment fort</p>
        <p className="mt-3 max-w-xl font-serif text-2xl">
          {participationCount.current
            ? "Vous avez pris le temps de partager votre regard."
            : "Vous avez découvert et revisité plusieurs sujets."}
        </p>
        {teaser && <p className="mt-8 max-w-xl text-xl text-muted-foreground">{teaser}</p>}
        <Button asChild variant="outline" className="mt-10 h-12 text-lg">
          <Link to="/">Accueil</Link>
        </Button>
      </Frame>
    );
  if (!turn) return null;
  const accent = accentOf(turn.item);
  const src = imageSrc(turn.image);
  const title =
    turn.item.seqTitle ??
    INTERESTS.find((t) => t.id === turn.item.topic)?.label ??
    "Un moment ensemble";

  // Plain render functions (not nested components), so the screen is never remounted on each update.
  return simple ? renderSimple() : renderStandard();

  // ——— Simple screen (accompagnement renforcé): picture, question, one obvious thing to do ———
  function renderSimple() {
    if (!turn) return null;
    const hint = visualHintFor(turn.item);
    const picture = src ?? (hint.image ? imageSrc(hint.image) : null);
    const withImages = turn.options.every((o) => o.image && imageSrc(o.image));
    return (
      <main className="paper-grain flex min-h-screen flex-col px-5 py-5 md:px-10">
        <section key={index} className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center gap-6 text-center">
          {picture && <img src={picture} alt="" className="max-h-[32vh] w-auto max-w-full rounded-2xl object-contain shadow-md" />}
          {turn.intro && simpleStep === "speaking" && !answerLine && <p className="max-w-3xl font-serif text-3xl leading-snug md:text-4xl">{turn.intro}</p>}
          <h1 className="max-w-3xl font-serif text-4xl leading-snug md:text-5xl">{turn.prompt}</h1>

          {answerLine && (
            <p role="status" className="max-w-3xl rounded-2xl bg-calm-soft px-8 py-5 font-serif text-3xl text-calm md:text-4xl">
              {answerLine}
            </p>
          )}

          {simpleStep === "choose" && !answerLine && (
            <div className={`grid w-full gap-5 ${turn.options.length > 2 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
              {turn.options.map((option, n) => (
                <button
                  key={option.label}
                  onClick={() => choose(n)}
                  className="flex min-h-28 flex-col items-center justify-center gap-3 rounded-3xl border-4 border-primary/60 bg-card px-5 py-6 text-3xl font-medium shadow-lg transition animate-pulse hover:scale-[1.02] hover:border-primary hover:animate-none focus:animate-none"
                >
                  {withImages && option.image && <img src={imageSrc(option.image) ?? ""} alt="" className="h-36 w-full object-contain" />}
                  {option.label}
                </button>
              ))}
            </div>
          )}

          {simpleStep === "listen" && (
            <div className="flex flex-col items-center gap-4" role="status">
              <span className="relative flex size-32 items-center justify-center rounded-full bg-calm text-primary-foreground">
                <span className="absolute inset-0 rounded-full bg-calm animate-ping opacity-40" />
                <Mic className="relative size-16" />
              </span>
              <p className="font-serif text-3xl text-calm">À vous de parler.</p>
              {(voice.transcript || heard) && <p className="max-w-2xl text-2xl italic text-muted-foreground">« {voice.transcript || heard} »</p>}
            </div>
          )}

          {simpleStep === "speaking" && !answerLine && (
            <span className="flex size-20 items-center justify-center rounded-full bg-primary/10 text-primary" aria-hidden>
              <Volume2 className={`size-10 ${speaking ? "animate-pulse" : ""}`} />
            </span>
          )}

          {audioUnavailable && (
            <button onClick={relisten} className="rounded-full bg-primary px-10 py-5 text-2xl text-primary-foreground shadow-lg animate-pulse">
              <Volume2 className="mr-3 inline size-8" />
              Écouter
            </button>
          )}
        </section>

        {/* Discreet controls for the person helping — kept away from the main area */}
        <footer className="mt-6 flex items-center justify-between gap-3 text-base text-muted-foreground">
          <button onClick={relisten} className="flex items-center gap-2 rounded-full px-4 py-2 hover:bg-muted" aria-label="Réécouter">
            <Volume2 className="size-5" /> Réécouter
          </button>
          <span aria-label={`${index + 1} sur ${turns.length}`}>
            {index + 1} / {turns.length}
          </span>
          <div className="flex items-center gap-2">
            {simpleStep === "listen" && (
              <button onClick={finishListening} className="rounded-full px-4 py-2 hover:bg-muted">
                J'ai fini
              </button>
            )}
            <button onClick={() => next()} className="flex items-center gap-1 rounded-full px-4 py-2 hover:bg-muted">
              Passer <ArrowRight className="size-4" />
            </button>
          </div>
        </footer>
      </main>
    );
  }

  // ——— Standard screen (person comfortable with the app) ———
  function renderStandard() {
    if (!turn) return null;
    const hint = visualHintFor(turn.item);
    const showHint = hintVisible && view !== "model" && !answerLine;
    const showOptions = optionsVisible && view !== "model" && !answerLine;
    return (
      <main className="paper-grain flex min-h-screen flex-col px-6 py-6 md:px-12">
        <header className="flex items-center justify-between gap-4">
          <Link to="/" onClick={() => signal("abandon")} className="font-serif text-2xl">
            Connexions
          </Link>
          <span className="text-lg text-muted-foreground" aria-label={`${index + 1} sur ${turns.length}`}>
            {index + 1} / {turns.length}
          </span>
        </header>
        <section key={index} className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center py-10 text-center">
          <p className={`mb-5 text-sm font-semibold uppercase ${accent.text}`}>{title}</p>
          {src && <img src={src} alt={title} className="mb-6 max-h-60 w-auto max-w-full rounded-lg object-contain" />}
          <Button variant="default" size="icon" aria-label="Réécouter" onClick={relisten} className="mb-2 size-16 rounded-full">
            <Volume2 className="size-7" />
          </Button>
          {view === "prompt" && (
            <Button variant="link" onClick={notUnderstood} className="mb-4 text-base text-muted-foreground">
              Je n'ai pas compris
            </Button>
          )}
          {audioUnavailable && (
            <p role="status" className="mb-3 text-base text-muted-foreground">
              Le son n'a pas pu être lu. Touchez le haut-parleur pour réessayer.
            </p>
          )}
          {view === "prompt" && turn.intro && <p className="mb-5 max-w-2xl font-serif text-2xl leading-snug">{turn.intro}</p>}
          <h1 className={`max-w-2xl font-serif leading-snug ${params.largeText ? "text-3xl md:text-4xl" : "text-2xl md:text-3xl"}`}>
            {view === "model" ? turn.model : view === "develop" ? turn.followUp : turn.prompt}
          </h1>
          {answerLine && view !== "model" && (
            <p role="status" className="mt-4 max-w-2xl font-serif text-2xl text-calm">
              {answerLine}
            </p>
          )}
          <p className="mt-4 text-xl text-primary">{view === "model" ? "Une formulation possible" : view === "develop" ? OPINION : instr(turn)}</p>
          {voice.listening && (
            <p className="mt-3 text-lg text-primary" role="status">
              Je vous écoute
            </p>
          )}
          {(voice.transcript || heard) && <p className="mt-3 max-w-2xl text-lg italic text-muted-foreground">« {voice.transcript || heard} »</p>}
          {view !== "model" && !answerLine && (
            <Button
              variant="ghost"
              onClick={() => {
                supportUsed.current = true;
                const open = !hintVisible;
                setHintVisible(open);
                setOptionsVisible(open && turn.options.length > 0);
                if (open && turn.options.length) read(turn.options.map((o) => o.label));
              }}
              aria-expanded={hintVisible}
              aria-controls="discussion-hint"
              className="mt-5 h-12 text-lg text-primary"
            >
              <Lightbulb />
              {hintVisible ? "Masquer l’aide" : "Besoin d’aide ?"}
            </Button>
          )}
          {showHint && (
            <figure id="discussion-hint" className="mt-5 max-w-64" aria-live="polite">
              {hint.image && <img src={imageSrc(hint.image) ?? ""} alt={hint.alt} className="max-h-48 w-full rounded-lg object-contain" />}
              <figcaption className="mt-3 text-lg">{hint.caption}</figcaption>
              <Button
                variant="link"
                onClick={() => {
                  supportUsed.current = true;
                  showModel();
                }}
                className="mt-1 text-lg"
              >
                Entendre une réponse possible
              </Button>
            </figure>
          )}
          {showOptions && (
            <div className="mt-5 w-full">
              <p className="mb-3 text-lg text-primary">Touchez votre choix.</p>
              <div className="grid w-full gap-3 sm:grid-cols-2">
                {turn.options.map((option, n) => (
                  <Button
                    key={option.label}
                    variant="outline"
                    aria-pressed={selected === n}
                    onClick={() => choose(n)}
                    className="h-auto min-h-16 flex-col whitespace-normal rounded-lg bg-card py-4 text-xl text-foreground"
                  >
                    {turn.options.every((o) => o.image && imageSrc(o.image)) && option.image && <img src={imageSrc(option.image) ?? ""} alt="" className="h-28 w-full object-contain" />}
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
          )}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button onClick={answer} className="h-14 whitespace-normal text-xl">
              {voice.listening ? <Square /> : <Mic />}
              {voice.listening ? "Terminer ma réponse" : view === "model" || turn.phase === "repeat" ? "Répéter" : "Répondre"}
            </Button>
            {voice.recording && (
              <Button variant="ghost" onClick={voice.playRecording} className="h-14 text-lg">
                <Play />
                M'écouter
              </Button>
            )}
            <Button variant="outline" onClick={() => next()} className="h-14 text-xl">
              Continuer
              <ArrowRight />
            </Button>
          </div>
        </section>
      </main>
    );
  }
}

function Frame({ children }: { children: React.ReactNode }) {
  return <main className="paper-grain flex min-h-screen flex-col items-center justify-center px-6 py-12 text-center">{children}</main>;
}
