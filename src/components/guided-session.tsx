import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Lightbulb, Mic, Play, Square, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildPlan } from "@/lib/builder";
import { confirmText, discussionTurns, revealText, type DiscussionTurn } from "@/lib/discussion";
import { completeSession, recordAttempt, speak, speakCached, startSession } from "@/lib/session.functions";
import { deriveParams, segment, type SessionParams } from "@/lib/adaptive-profile";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_INTERESTS, GUEST_KEY, INTERESTS, PREFIX } from "@/lib/interests";
import { visualHintFor } from "@/lib/visual-hints";
import { imageSrc } from "@/lib/library";
import { heardWord, useVoiceInput, wordCount } from "@/lib/voice-input";
import { accentOf } from "@/lib/accents";

type Outcome = "spontaneous" | "after_repeat" | "after_cue" | "revealed";
const OPINION = "Donnez votre avis à voix haute.";

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
  const [state, setState] = useState<"loading" | "play" | "done" | "error">("loading");
  const [turns, setTurns] = useState<DiscussionTurn[]>([]);
  const [index, setIndex] = useState(0);
  const [view, setView] = useState<"prompt" | "develop" | "model">("prompt");
  const [hintVisible, setHintVisible] = useState(false);
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [heard, setHeard] = useState("");
  const [teaser, setTeaser] = useState("");
  const [audioUnavailable, setAudioUnavailable] = useState(false);
  const [introDone, setIntroDone] = useState(false);
  /** The expected answer once it has been said (confirmed or revealed) — a knowledge turn always ends with it. */
  const [answerLine, setAnswerLine] = useState<string | null>(null);
  // Set by the caregiver in the profile (or automatically when comprehension is difficult) — never toggled from the session.
  const reinforced = params.reinforced;
  const instr = (t: DiscussionTurn) =>
    reinforced ? (t.options.length ? "Touchez votre réponse." : "À vous de parler.") : t.instruction;
  const sessionId = useRef("");
  const audio = useRef<HTMLAudioElement | null>(null);
  const playId = useRef(0);
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
  const turn = turns[index];

  function stopAudio() {
    playId.current++;
    audio.current?.pause();
    setSpeaking(false);
  }

  /** One natural voice only: a clip is fetched (and generated once if needed), with one retry. Never a robot voice. */
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
        if (!url) clips.current.delete(text); // retried on the next play
      });
      clips.current.set(text, p);
    }
    return p;
  }
  const partsOf = (texts: (string | null | undefined)[], p = params) => {
    const unique = texts.filter((t, n): t is string => !!t && texts.indexOf(t) === n);
    return signedIn.current ? unique.flatMap((t) => segment(t, p)) : unique;
  };

  async function read(texts: (string | null | undefined)[], p = params) {
    stopAudio();
    voice.stop();
    const id = playId.current;
    setSpeaking(true);
    setAudioUnavailable(false);
    try {
      // One idea at a time with a pause when language support is high (segments are voiced like the rest).
      const parts = partsOf(texts, p);
      for (const [n, text] of parts.entries()) {
        if (id !== playId.current) return;
        if (n > 0 && p.pauseMs) await new Promise((res) => setTimeout(res, p.pauseMs));
        if (id !== playId.current) return;
        const url = await clip(text);
        if (id !== playId.current) return;
        if (!url) {
          // The text stays on screen; the person can tap the speaker to try again.
          setAudioUnavailable(true);
          continue;
        }
        const element = audio.current ?? new Audio();
        audio.current = element;
        element.src = url;
        element.playbackRate = p.voiceRate;
        try {
          await element.play();
        } catch (e) {
          // Browser blocked autoplay before any tap: the speaker button starts it.
          if ((e as Error)?.name === "NotAllowedError") return;
          throw e;
        }
        await new Promise<void>((resolve) => {
          element.onended = () => resolve();
          element.onerror = () => resolve();
        });
      }
    } catch {
      setAudioUnavailable(true);
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
      audio.current?.pause();
      for (const p of clips.current.values()) p.then((url) => url && URL.revokeObjectURL(url));
    },
    [],
  );
  useEffect(() => {
    if (state !== "play" || !turn) return;
    // Reinforced support: one idea at a time — intro first, question after "Continuer".
    if (reinforced && turn.intro && !introDone) read([turn.item.recall, turn.intro]);
    else if (reinforced && turn.intro) read([turn.prompt, instr(turn)]);
    else read([turn.item.recall, turn.intro, turn.prompt, instr(turn)]);
    // Prepare the next turn's voice while this one is played, so it starts without waiting.
    const next = turns[index + 1];
    if (next) for (const t of partsOf([next.item.recall, next.intro, next.prompt, instr(next)])) clip(t);
    // Each new turn is read once; explicit controls handle rereading.
  }, [state, index, introDone]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    begin();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function begin() {
    try {
      const { data } = await supabase.auth.getSession();
      let topics = DEFAULT_INTERESTS.map((t) => PREFIX + t);
      try {
        const saved = JSON.parse(localStorage.getItem(GUEST_KEY) ?? "null");
        if (Array.isArray(saved) && saved.every((t) => typeof t === "string")) topics = saved;
      } catch {}
      signedIn.current = !!data.session;
      const local = () => ({ sessionId: "", ...buildPlan([], topics, 1), params: deriveParams({}) });
      // If the server is unreachable, the session still runs (nothing saved) rather than an error screen.
      const result = data.session ? await start({ data: {} }).catch(local) : local();
      sessionId.current = result.sessionId;
      setTeaser(result.teaser);
      setParams(result.params);
      const next = discussionTurns(result.items, "regard")
        .slice(0, result.params.maxTurns)
        .map((t) => ({ ...t, options: t.options.slice(0, result.params.optionCount) }))
        // Keep the expected answer among the choices when options are trimmed.
        .map((t) =>
          t.answer && t.options.length && !t.options.some((o) => o.label === t.answer)
            ? { ...t, options: [...t.options.slice(0, -1), t.item.options.find((o) => o.label === t.answer) ?? { label: t.answer }].sort(() => Math.random() - 0.5) }
            : t,
        );
      if (!next.length) throw new Error("empty");
      setTurns(next);
      setState("play");
    } catch {
      setState("error");
    }
  }

  /** First outcome of a knowledge turn wins; later actions never overwrite it. */
  function settle(o: Outcome) {
    if (outcome.current) return;
    outcome.current = o;
    if (o === "spontaneous") responseMs.current = Math.max(0, Date.now() - readyAt.current);
  }
  /** Close a knowledge turn: the answer is always heard and shown, then the conversation goes on. */
  function closeKnowledge(found: boolean, andThen: (string | null)[] = []) {
    if (!turn?.answer) return;
    const line = found ? confirmText(turn.answer) : revealText(turn.answer);
    setAnswerLine(line);
    read([line, ...andThen]);
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
  function choose(n: number) {
    if (!turn || selected !== null) return;
    stopAudio();
    setSelected(n);
    participated.current = true;
    const label = turn.options[n]?.label;
    if (turn.answer) {
      const found = label === turn.answer;
      // Choices are a support (recognition rather than recall): a right choice counts as "with help".
      settle(found ? "after_cue" : "revealed");
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
    // Gentle, gradual: after two requests in this session, shorten and slow what follows.
    let p = params;
    if (confusion.current === 2 && params.languageSupport < 3) {
      const support = params.languageSupport + 1;
      p = { ...params, languageSupport: support, ideasPerUtterance: 1, maxSentenceWords: Math.max(8, params.maxSentenceWords - 4), pauseMs: params.pauseMs + 300, voiceRate: Math.min(params.voiceRate, [1, 1, 0.92, 0.88][support]!) };
      setParams(p);
    }
    read([turn.prompt], p);
  }
  function relisten() {
    if (!turn) return;
    signal("repeat");
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
          kind: `discussion:guided:${t.phase}:${participated.current ? "shared" : "listened"}:${supportUsed.current ? "supported" : "independent"}`,
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
    if (turn.answer && !answerLine) {
      settle("revealed");
      closeKnowledge(false);
      return;
    }
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
    setHeard("");
    setHintVisible(false);
    setOptionsVisible(false);
    setSelected(null);
    setIntroDone(false);
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
  const hint = visualHintFor(turn.item);
  const src = imageSrc(turn.image);
  const title =
    turn.item.seqTitle ??
    INTERESTS.find((t) => t.id === turn.item.topic)?.label ??
    "Un moment ensemble";
  const introStep = reinforced && !!turn.intro && !introDone;
  const showHint = (hintVisible || reinforced) && !introStep;
  const showOptions = (optionsVisible || (reinforced && turn.options.length > 0)) && !introStep && !answerLine;
  const factual = turn.phase !== "exchange";
  const modelWords = (turn.model ?? "").split(/\s+/).filter(Boolean);
  const starter = factual
    ? modelWords.length >= 4
      ? `${modelWords.slice(0, Math.ceil(modelWords.length / 2)).join(" ")} …`
      : null
    : "Je pense que…";
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
      <section
        key={index}
        className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center py-10 text-center"
      >
        <p className={`mb-5 text-sm font-semibold uppercase ${accent.text}`}>
          {title}
        </p>
        {src && (
          <img
            src={src}
            alt={title}
            className="mb-6 max-h-60 w-auto max-w-full rounded-lg object-contain"
          />
        )}
        <Button
          variant="default"
          size="icon"
          aria-label="Réécouter"
          onClick={relisten}
          className="mb-2 size-16 rounded-full"
        >
          <Volume2 className="size-7" />
        </Button>
        {view === "prompt" && !introStep && (
          <Button variant="link" onClick={notUnderstood} className="mb-4 text-base text-muted-foreground">
            Je n'ai pas compris
          </Button>
        )}
        {audioUnavailable && (
          <p role="status" className="mb-3 text-base text-muted-foreground">
            Le son n'a pas pu être lu. Touchez le haut-parleur pour réessayer.
          </p>
        )}
        {view === "prompt" && turn.intro && !reinforced && (
          <p className="mb-5 max-w-2xl font-serif text-2xl leading-snug">{turn.intro}</p>
        )}
        <h1 className={`max-w-2xl font-serif leading-snug ${params.largeText ? "text-3xl md:text-4xl" : "text-2xl md:text-3xl"}`}>
          {introStep ? turn.intro : view === "model" ? turn.model : view === "develop" ? turn.followUp : turn.prompt}
        </h1>
        {answerLine && view !== "model" && (
          <p role="status" className="mt-4 max-w-2xl font-serif text-2xl text-calm">
            {answerLine}
          </p>
        )}
        {!introStep && (
          <p className="mt-4 text-xl text-primary">
            {view === "model" ? "Une formulation possible" : view === "develop" ? OPINION : instr(turn)}
          </p>
        )}
        {voice.listening && (
          <p className="mt-3 text-lg text-primary" role="status">
            Je vous écoute
          </p>
        )}
        {(voice.transcript || heard) && (
          <p className="mt-3 max-w-2xl text-lg italic text-muted-foreground">
            « {voice.transcript || heard} »
          </p>
        )}
        {view !== "model" && !reinforced && !answerLine && (
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
        {showHint && view !== "model" && !answerLine && (
          <figure id="discussion-hint" className="mt-5 max-w-64" aria-live="polite">
            {hint.image && (
              <img
                src={imageSrc(hint.image) ?? ""}
                alt={hint.alt}
                className="max-h-48 w-full rounded-lg object-contain"
              />
            )}
            <figcaption className="mt-3 text-lg">{hint.caption}</figcaption>
            {reinforced && starter && (
              <p className="mt-2 text-lg italic text-muted-foreground">Pour commencer : « {starter} »</p>
            )}
            {(!reinforced || factual) && (
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
            )}
          </figure>
        )}
        {showOptions && view !== "model" && (
          <div className="mt-5 w-full">
            {!reinforced && <p className="mb-3 text-lg text-primary">Touchez votre choix.</p>}
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
          {!introStep && (
            <Button onClick={answer} className="h-14 whitespace-normal text-xl">
              {voice.listening ? <Square /> : <Mic />}
              {voice.listening
                ? "Terminer ma réponse"
                : view === "model" || turn.phase === "repeat"
                  ? "Répéter"
                  : "Répondre"}
            </Button>
          )}
          {voice.recording && (
            <Button variant="ghost" onClick={voice.playRecording} className="h-14 text-lg">
              <Play />
              M'écouter
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => (introStep ? setIntroDone(true) : next())}
            className="h-14 text-xl"
          >
            Continuer
            <ArrowRight />
          </Button>
        </div>
      </section>
    </main>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <main className="paper-grain flex min-h-screen flex-col items-center justify-center px-6 py-12 text-center">
      {children}
    </main>
  );
}
