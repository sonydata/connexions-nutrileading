import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, HelpCircle, Lightbulb, MessageCircle, Mic, Play, Square, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildPlan } from "@/lib/builder";
import { discussionTurns, type DiscussionTurn, type SessionMode } from "@/lib/discussion";
import { completeSession, recordAttempt, speak, speakCached, startSession } from "@/lib/session.functions";
import { deriveParams, segment, type SessionParams } from "@/lib/adaptive-profile";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_INTERESTS, GUEST_KEY, INTERESTS, PREFIX } from "@/lib/interests";
import { visualHintFor } from "@/lib/visual-hints";
import { imageSrc } from "@/lib/library";
import { useVoiceInput, wordCount } from "@/lib/voice-input";
import { accentOf } from "@/lib/accents";

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
  const [state, setState] = useState<"mode" | "loading" | "play" | "done" | "error">("mode");
  const [mode, setMode] = useState<SessionMode>("conversation");
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
  const [saving, setSaving] = useState(false);
  const sessionId = useRef("");
  const audio = useRef<HTMLAudioElement | null>(null);
  const playId = useRef(0);
  const clips = useRef(new Map<string, string>());
  const participated = useRef(false);
  const participationCount = useRef(0);
  const words = useRef(0);
  const supportUsed = useRef(false);
  const turn = turns[index];

  function stopAudio() {
    playId.current++;
    audio.current?.pause();
    setSpeaking(false);
  }
  async function read(texts: (string | null)[]) {
    stopAudio();
    voice.stop();
    const id = playId.current;
    setSpeaking(true);
    setAudioUnavailable(false);
    try {
      // Signed-in: one idea at a time with a pause (segments synthesised once, then cached).
      // Guests: whole sentences from the shared cache only.
      const unique = texts.filter((t, n) => t && texts.indexOf(t) === n);
      const parts = signedIn.current ? unique.flatMap((t) => segment(t, params)) : unique;
      for (const [n, text] of parts.entries()) {
        if (!text || id !== playId.current) continue;
        if (n > 0 && params.pauseMs) await new Promise((res) => setTimeout(res, params.pauseMs));
        if (id !== playId.current) return;
        let url = clips.current.get(text);
        if (!url) {
          const result = signedIn.current ? await synth({ data: { text } }) : await cached({ data: { text } });
          if (id !== playId.current) return;
          if (!result.audio) {
            setAudioUnavailable(true);
            continue;
          }
          const bytes = Uint8Array.from(atob(result.audio), (c) => c.charCodeAt(0));
          url = URL.createObjectURL(new Blob([bytes], { type: "audio/wav" }));
          clips.current.set(text, url);
        }
        const element = audio.current ?? new Audio();
        audio.current = element;
        element.src = url;
        await element.play();
        await new Promise<void>((resolve) => {
          element.onended = () => resolve();
          element.onerror = () => resolve();
        });
      }
    } catch {
      setAudioUnavailable(true);
    } finally {
      if (id === playId.current) setSpeaking(false);
    }
  }
  useEffect(
    () => () => {
      playId.current++;
      audio.current?.pause();
      for (const url of clips.current.values()) URL.revokeObjectURL(url);
    },
    [],
  );
  useEffect(() => {
    if (state === "play" && turn)
      read([turn.item.recall, turn.intro, turn.prompt, turn.instruction]);
    // Each new turn is read once; explicit controls handle rereading.
  }, [state, index]); // eslint-disable-line react-hooks/exhaustive-deps

  async function begin(chosenMode: SessionMode) {
    setMode(chosenMode);
    setState("loading");
    try {
      const { data } = await supabase.auth.getSession();
      let topics = DEFAULT_INTERESTS.map((t) => PREFIX + t);
      try {
        const saved = JSON.parse(localStorage.getItem(GUEST_KEY) ?? "null");
        if (Array.isArray(saved) && saved.every((t) => typeof t === "string")) topics = saved;
      } catch {}
      signedIn.current = !!data.session;
      const result = data.session
        ? await start({ data: {} })
        : { sessionId: "", ...buildPlan([], topics, 1), params: deriveParams({}) };
      sessionId.current = result.sessionId;
      setTeaser(result.teaser);
      setParams(result.params);
      const next = discussionTurns(result.items, chosenMode)
        .slice(0, result.params.maxTurns)
        .map((t) => ({ ...t, options: t.options.slice(0, result.params.optionCount) }));
      if (!next.length) throw new Error("empty");
      setTurns(next);
      setState("play");
    } catch {
      setState("error");
    }
  }
  async function answer() {
    stopAudio();
    if (voice.listening) {
      const text = voice.stop();
      setHeard(text);
      participated.current = true;
      words.current += wordCount(text);
      if (view === "develop" || view === "model" || turn?.phase === "repeat") showModel();
      else {
        setView("develop");
        read([turn?.followUp ?? null, "Donnez votre avis à voix haute."]);
      }
    } else await voice.start();
  }
  function signal(kind: "repeat" | "notunderstood" | "abandon") {
    if (!sessionId.current || !turn) return;
    record({ data: { sessionId: sessionId.current, itemId: turn.item.id, kind: `signal:${kind}`, category: turn.item.theme, skill: turn.item.skill, prompt: turn.prompt, optionCount: 0, outcome: "after_repeat", responseMs: null } }).catch(() => {});
  }
  function notUnderstood() {
    if (!turn) return;
    signal("notunderstood");
    supportUsed.current = true;
    confusion.current++;
    // Gentle, gradual: after two requests in this session, shorten what follows.
    let p = params;
    if (confusion.current === 2 && params.languageSupport < 3) {
      p = { ...params, languageSupport: params.languageSupport + 1, ideasPerUtterance: 1, maxSentenceWords: Math.max(8, params.maxSentenceWords - 4), pauseMs: params.pauseMs + 300 };
      setParams(p);
    }
    read([turn.prompt]);
  }
  function showModel() {
    voice.stop();
    setView("model");
    read(["Voici une formulation possible.", turn?.model ?? null]);
  }
  async function next() {
    if (!turn || saving) return;
    setSaving(true);
    stopAudio();
    voice.clear();
    if (participated.current) participationCount.current++;
    try {
      if (sessionId.current)
        await record({
          data: {
            sessionId: sessionId.current,
            itemId: turn.item.id,
            kind: `discussion:${mode}:${turn.phase}:${participated.current ? "shared" : "listened"}:${supportUsed.current ? "supported" : "independent"}`,
            category: turn.item.theme,
            skill: turn.item.skill,
            prompt: turn.prompt,
            optionCount: words.current,
            outcome: "after_repeat",
            responseMs: null,
            repeated: turn.phase === "repeat" && participated.current,
          },
        });
      if (index + 1 >= turns.length && sessionId.current)
        await complete({ data: { sessionId: sessionId.current } });
    } catch {
      setState("error");
      setSaving(false);
      return;
    }
    participated.current = false;
    supportUsed.current = false;
    words.current = 0;
    setView("prompt");
    setHeard("");
    setHintVisible(false);
    setOptionsVisible(false);
    setSelected(null);
    setSaving(false);
    if (index + 1 >= turns.length) setState("done");
    else setIndex((n) => n + 1);
  }
  if (state === "mode")
    return (
      <Frame>
        <p className="text-sm font-semibold uppercase text-primary">Connexions</p>
        <h1 className="mt-4 font-serif text-4xl">Aujourd'hui, vous préférez…</h1>
        <div className="mt-10 grid w-full max-w-2xl gap-5 sm:grid-cols-2">
          {(
            [
              { id: "conversation", label: "Conversation", Icon: MessageCircle },
              { id: "regard", label: "Votre regard", Icon: Mic },
            ] as const
          ).map(({ id, label, Icon }) => (
            <Button
              key={id}
              variant="outline"
              onClick={() => begin(id)}
              className="h-36 flex-col gap-4 whitespace-normal rounded-lg border-2 bg-card text-2xl text-foreground"
            >
              <Icon className="size-8" />
              {label}
            </Button>
          ))}
        </div>
        <Button asChild variant="link" className="mt-8">
          <Link to="/">Accueil</Link>
        </Button>
      </Frame>
    );
  if (state === "loading")
    return (
      <Frame>
        <p className="font-serif text-3xl">Un instant…</p>
      </Frame>
    );
  if (state === "error")
    return (
      <Frame>
        <p className="font-serif text-2xl">La séance n'a pas pu être poursuivie.</p>
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
  return (
    <main className="paper-grain flex min-h-screen flex-col px-6 py-6 md:px-12">
      <header className="flex items-center justify-between gap-4">
        <Link to="/" onClick={() => signal("abandon")} className="font-serif text-2xl">
          Connexions
        </Link>
        <span
          className="text-lg text-muted-foreground"
          aria-label={`${index + 1} sur ${turns.length}`}
        >
          {index + 1} / {turns.length}
        </span>
      </header>
      <section
        key={index}
        className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center py-10 text-center"
      >
        <p className={`mb-5 text-sm font-semibold uppercase ${accent.text}`}>
          {mode === "conversation" ? "Conversation" : "Votre regard"} · {title}
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
          onClick={() => {
            if (view === "prompt") return notUnderstood();
            signal("repeat");
            read(
              view === "model"
                ? [turn.model]
                : view === "develop"
                  ? [turn.followUp, "Donnez votre avis à voix haute."]
                  : [turn.intro, turn.prompt, turn.instruction],
            );
          }}
          className="mb-6 size-16 rounded-full"
        >
          <Volume2 className="size-7" />
        </Button>
        {audioUnavailable && (
          <p role="status" className="mb-3 text-base text-muted-foreground">
            L'audio est momentanément indisponible.
          </p>
        )}
        {view === "prompt" && turn.intro && (
          <p className="mb-5 max-w-2xl font-serif text-2xl leading-snug">{turn.intro}</p>
        )}
        <h1 className={`max-w-2xl font-serif leading-snug ${params.largeText ? "text-3xl md:text-4xl" : "text-2xl md:text-3xl"}`}>
          {view === "model" ? turn.model : view === "develop" ? turn.followUp : turn.prompt}
        </h1>
        <p className="mt-4 text-xl text-primary">
          {view === "model" ? "Une formulation possible" : view === "develop" ? "Donnez votre avis à voix haute." : turn.instruction}
        </p>
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
        {view !== "model" && (
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
        {hintVisible && view !== "model" && (
          <figure id="discussion-hint" className="mt-5 max-w-64" aria-live="polite">
            {hint.image && (
              <img
                src={imageSrc(hint.image) ?? ""}
                alt={hint.alt}
                className="max-h-48 w-full rounded-lg object-contain"
              />
            )}
            <figcaption className="mt-3 text-lg">{hint.caption}</figcaption>
            <Button variant="link" onClick={showModel} className="mt-1 text-lg">
              Entendre une réponse possible
            </Button>
          </figure>
        )}
        {optionsVisible && view !== "model" && (
          <div className="mt-5 w-full">
          <p className="mb-3 text-lg text-primary">Cliquez sur votre choix, puis donnez votre avis.</p>
          <div className="grid w-full gap-3 sm:grid-cols-2">
            {turn.options.map((option, n) => (
              <Button
                key={option.label}
                variant="outline"
                aria-pressed={selected === n}
                onClick={() => {
                  stopAudio();
                  setSelected(n);
                  setView("develop");
                  read([turn.followUp, "Donnez votre avis à voix haute."]);
                }}
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
            {voice.listening
              ? "Terminer ma réponse"
              : view === "model" || turn.phase === "repeat"
                ? "Répéter"
                : "Répondre"}
          </Button>
          {voice.recording && (
            <Button variant="ghost" onClick={voice.playRecording} className="h-14 text-lg">
              <Play />
              M'écouter
            </Button>
          )}
          <Button variant="outline" onClick={next} disabled={saving} className="h-14 text-xl">
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
