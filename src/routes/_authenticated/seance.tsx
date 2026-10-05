import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import { Volume2 } from "lucide-react";
import { completeSession, recordAttempt, speak, startSession, type Exercise } from "@/lib/session.functions";
import { imageSrc } from "@/lib/library";

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

type Stage = 0 | 1 | 2 | 3; // 0 first try, 1 after repeat, 2 keyword shown, 3 revealed
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function Seance() {
  const start = useServerFn(startSession);
  const speakFn = useServerFn(speak);
  const record = useServerFn(recordAttempt);
  const complete = useServerFn(completeSession);

  const [phase, setPhase] = useState<"loading" | "play" | "done" | "error">("loading");
  const [error, setError] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [items, setItems] = useState<Exercise[]>([]);
  const [i, setI] = useState(0);
  const [stage, setStage] = useState<Stage>(0);
  const [wrong, setWrong] = useState<number[]>([]);
  const [chosen, setChosen] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);

  const cache = useRef(new Map<string, Promise<string>>());
  const audio = useRef<HTMLAudioElement | null>(null);
  const shownAt = useRef(Date.now());
  const started = useRef(false);

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
      const url = await clip(text);
      const el = audio.current ?? (audio.current = new Audio());
      el.src = url;
      el.playbackRate = rate;
      (el as any).preservesPitch = true;
      await el.play();
      await new Promise<void>((res) => {
        el.onended = () => res();
        el.onerror = () => res();
      });
    },
    [clip],
  );

  const playExercise = useCallback(
    async (ex: Exercise, slow = false) => {
      setSpeaking(true);
      try {
        await playOne(ex.audio_text, slow ? 0.85 : 1);
        if (ex.question_text) {
          await sleep(700);
          await playOne(ex.question_text, slow ? 0.9 : 1);
        }
        setNeedsTap(false);
      } catch {
        setNeedsTap(true);
      } finally {
        setSpeaking(false);
        shownAt.current = Date.now();
      }
    },
    [playOne],
  );

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    start()
      .then((r) => {
        if (!r.exercises.length) throw new Error("empty");
        setSessionId(r.sessionId);
        setItems(r.exercises);
        // Warm up the first clips while the screen appears.
        const first = r.exercises[0];
        Promise.all([clip(first.audio_text), first.question_text ? clip(first.question_text) : null]).finally(() => setPhase("play"));
      })
      .catch((e) => {
        setError(String(e?.message ?? ""));
        setPhase("error");
      });
  }, [start, clip]);

  const ex = items[i];

  useEffect(() => {
    if (phase !== "play" || !ex) return;
    playExercise(ex);
    const next = items[i + 1];
    if (next) {
      clip(next.audio_text).catch(() => {});
      if (next.question_text) clip(next.question_text).catch(() => {});
    }
  }, [phase, i]); // eslint-disable-line react-hooks/exhaustive-deps

  async function finish(outcome: "spontaneous" | "after_repeat" | "after_cue" | "revealed") {
    record({
      data: {
        sessionId,
        category: ex.category,
        skill: ex.skill,
        prompt: ex.audio_text,
        concept: ex.concept || null,
        optionCount: ex.options.length,
        outcome,
        responseMs: stage === 0 ? Date.now() - shownAt.current : null,
      },
    }).catch(() => {});
  }

  function goNext() {
    setStage(0);
    setWrong([]);
    setChosen(null);
    setMessage(null);
    if (i + 1 >= items.length) {
      complete({ data: { sessionId } }).catch(() => {});
      setPhase("done");
    } else setI(i + 1);
  }

  async function choose(idx: number) {
    if (speaking || chosen !== null || wrong.includes(idx) || stage === 3) return;
    if (idx === ex.correct_index) {
      setChosen(idx);
      setMessage("Oui, c'est cela.");
      finish(stage === 0 ? "spontaneous" : stage === 1 ? "after_repeat" : "after_cue");
      await sleep(1600);
      goNext();
      return;
    }
    setWrong((w) => [...w, idx]);
    if (stage === 0) {
      setStage(1);
      setMessage("Écoutons encore.");
      await sleep(900);
      playExercise(ex, true);
    } else if (stage === 1) {
      setStage(2);
      setMessage("Un indice.");
      await sleep(600);
      playExercise(ex, true);
    } else {
      setStage(3);
      setChosen(ex.correct_index);
      setMessage("Voici la réponse.");
      finish("revealed");
    }
  }

  if (phase === "loading")
    return (
      <Center>
        <div className="mx-auto h-16 w-16 rounded-full bg-calm-soft animate-breathe" />
        <p className="mt-10 font-serif text-3xl italic text-muted-foreground">Je prépare la séance du jour…</p>
      </Center>
    );

  if (phase === "error")
    return (
      <Center>
        <p className="font-serif text-3xl">La séance n'a pas pu être préparée.</p>
        <p className="mt-3 text-muted-foreground">{error.includes("rédit") ? error : "Veuillez réessayer dans un instant."}</p>
        <Link to="/" className="mt-10 inline-block rounded-full bg-primary px-10 py-4 text-lg text-primary-foreground">Retour</Link>
      </Center>
    );

  if (phase === "done")
    return (
      <Center>
        <h1 className="text-6xl">C'est terminé pour aujourd'hui.</h1>
        <p className="mt-6 font-serif text-3xl italic text-muted-foreground">À demain.</p>
        <Link to="/" className="mt-14 inline-block rounded-full border bg-card px-10 py-4 text-lg">Accueil</Link>
      </Center>
    );

  const hasImages = ex.options.some((o) => o.image_id);
  const cols = ex.options.length === 4 ? "md:grid-cols-4 grid-cols-2" : ex.options.length === 3 ? "grid-cols-3" : "grid-cols-2";

  return (
    <main className="paper-grain flex min-h-screen flex-col px-6 py-6 md:px-12">
      <header className="flex items-center justify-between">
        <Link to="/" className="font-serif text-2xl">Écoute</Link>
        <div className="flex gap-1.5" aria-hidden>
          {items.map((_, k) => (
            <span key={k} className={`h-1.5 w-6 rounded-full ${k <= i ? "bg-calm" : "bg-border"}`} />
          ))}
        </div>
      </header>

      <section key={i} className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center animate-rise">
        <button
          onClick={() => playExercise(ex, stage > 0)}
          disabled={speaking}
          aria-label="Réécouter"
          className={`relative flex h-28 w-28 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl transition hover:scale-105 ${speaking ? "opacity-90" : ""}`}
        >
          {speaking && <span className="absolute inset-0 rounded-full bg-calm animate-breathe" />}
          <Volume2 className="relative h-12 w-12" />
        </button>
        <p className="mt-4 h-8 text-lg text-muted-foreground">{needsTap ? "Touchez pour écouter" : speaking ? "J'écoute…" : "Réécouter"}</p>

        <div className="mt-4 h-16 text-center">
          {stage >= 2 && <span className="rounded-full bg-gold/25 px-6 py-2 font-serif text-3xl">{ex.keyword}</span>}
          {message && stage < 2 && <p className="font-serif text-3xl italic text-muted-foreground">{message}</p>}
          {message && stage >= 2 && <p className="mt-3 text-lg text-muted-foreground">{message}</p>}
        </div>

        <div className={`mt-6 grid w-full gap-5 ${cols}`}>
          {ex.options.map((o, k) => {
            const src = imageSrc(o.image_id);
            const isRight = chosen === k;
            const dim = wrong.includes(k) || (stage === 3 && k !== ex.correct_index);
            return (
              <button
                key={k}
                onClick={() => choose(k)}
                className={`group overflow-hidden rounded-3xl border-2 bg-card text-left shadow-sm transition ${
                  isRight ? "border-calm ring-4 ring-calm-soft" : "border-transparent hover:-translate-y-1 hover:shadow-lg"
                } ${dim ? "opacity-35" : ""}`}
              >
                {hasImages && (
                  <div className="aspect-square w-full bg-muted">
                    {src && <img src={src} alt={o.label} className="h-full w-full object-cover" />}
                  </div>
                )}
                <div className={`px-5 text-center ${hasImages ? "py-4 text-2xl" : "py-10 font-serif text-4xl"}`}>{o.label}</div>
              </button>
            );
          })}
        </div>

        <div className="mt-8 h-16">
          {stage === 3 && (
            <button onClick={goNext} className="rounded-full bg-primary px-12 py-4 text-xl text-primary-foreground">Continuer</button>
          )}
        </div>
      </section>
    </main>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <main className="paper-grain flex min-h-screen flex-col items-center justify-center px-8 text-center animate-rise">{children}</main>;
}
