import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import { Volume2 } from "lucide-react";
import { completeSession, recordAttempt, speak, startSession, type PlayItem } from "@/lib/session.functions";
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

type Outcome = "spontaneous" | "after_repeat" | "after_cue" | "revealed";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const MODE_TITLE: Record<string, string> = { expliquer: "Votre avis", lire: "À voix haute", reformuler: "Avec vos mots", nommer: "Regard d'expert" };
const THEME_TITLE: Record<string, string> = { nutrition: "Nutrition", avis: "Votre avis", sciences: "Culture scientifique", temps: "Organisation" };

function Seance() {
  const start = useServerFn(startSession);
  const speakFn = useServerFn(speak);
  const record = useServerFn(recordAttempt);
  const complete = useServerFn(completeSession);

  const [phase, setPhase] = useState<"loading" | "play" | "done" | "error">("loading");
  const [sessionId, setSessionId] = useState("");
  const [items, setItems] = useState<PlayItem[]>([]);
  const [i, setI] = useState(0);
  const [stage, setStage] = useState(0);
  const [wrong, setWrong] = useState<number[]>([]);
  const [chosen, setChosen] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);
  const [canHint, setCanHint] = useState(false);

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
      await el.play();
      await new Promise<void>((res) => {
        el.onended = () => res();
        el.onerror = () => res();
      });
    },
    [clip],
  );

  const play = useCallback(
    async (texts: (string | null)[], slow = false) => {
      setSpeaking(true);
      try {
        let first = true;
        for (const t of texts) {
          if (!t) continue;
          if (!first) await sleep(700);
          await playOne(t, slow ? 0.85 : 1);
          first = false;
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
        if (!r.items.length) throw new Error("empty");
        setSessionId(r.sessionId);
        setItems(r.items);
        const f = r.items[0]!;
        Promise.all([clip(f.audio), f.question ? clip(f.question) : null]).finally(() => setPhase("play"));
      })
      .catch(() => setPhase("error"));
  }, [start, clip]);

  const it = items[i] as PlayItem;

  useEffect(() => {
    if (phase !== "play" || !it) return;
    setCanHint(false);
    const t = setTimeout(() => setCanHint(true), 5000);
    play([it.audio, it.question]);
    const next = items[i + 1];
    if (next) {
      clip(next.audio).catch(() => {});
      if (next.question) clip(next.question).catch(() => {});
    }
    return () => clearTimeout(t);
  }, [phase, i]); // eslint-disable-line react-hooks/exhaustive-deps

  function save(outcome: Outcome) {
    record({
      data: {
        sessionId,
        itemId: it.id,
        kind: it.kind,
        category: it.theme,
        skill: it.skill,
        prompt: it.audio,
        optionCount: it.options.length,
        outcome,
        responseMs: stage === 0 ? Date.now() - shownAt.current : null,
      },
    }).catch(() => {});
  }

  function goNext() {
    audio.current?.pause();
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
    if (idx === it.correctIndex) {
      setChosen(idx);
      setMessage(stage === 0 ? "Tout à fait." : "C'est cela.");
      save(stage === 0 ? "spontaneous" : stage === 1 ? "after_repeat" : "after_cue");
      await sleep(1600);
      goNext();
      return;
    }
    setWrong((w) => [...w, idx]);
    if (stage === 0) {
      setStage(1);
      setMessage("Écoutons encore.");
      await sleep(900);
      play([it.audio, it.question], true);
    } else if (stage === 1) {
      setStage(2);
      setMessage(null);
      await sleep(500);
      play([it.audio, it.question], true);
    } else {
      setStage(3);
      setChosen(it.correctIndex);
      setMessage("Voici la réponse.");
      save("revealed");
    }
  }

  // Completion: progressive cues
  function nextCue() {
    const s = stage + 1;
    setStage(s);
    if (s === 1 && it.hint) play([it.hint]);
    if (s === 3) save("revealed");
  }
  function found() {
    save(stage === 0 ? "spontaneous" : stage === 1 ? "after_repeat" : "after_cue");
    goNext();
  }
  function rate(r: "fluide" | "aide" | "difficile") {
    save(r === "fluide" ? (stage > 0 ? "after_cue" : "spontaneous") : r === "aide" ? "after_cue" : "revealed");
    goNext();
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
  if (phase === "done")
    return (
      <Center>
        <h1 className="text-6xl">C'est terminé pour aujourd'hui.</h1>
        <p className="mt-6 font-serif text-3xl italic text-muted-foreground">Merci pour votre éclairage. À demain.</p>
        <Link to="/" className="mt-14 inline-block rounded-full border bg-card px-10 py-4 text-lg">Accueil</Link>
      </Center>
    );

  const isChoice = it.kind === "mcq" || it.kind === "tf";
  const title = it.kind === "oral" ? MODE_TITLE[it.mode ?? ""] : it.kind === "complete" ? "Notion à compléter" : it.kind === "tf" ? "Affirmation" : THEME_TITLE[it.theme];

  return (
    <main className="paper-grain flex min-h-screen flex-col px-6 py-6 md:px-12">
      <header className="flex items-center justify-between">
        <Link to="/" className="font-serif text-2xl">Écoute</Link>
        <div className="flex gap-1.5" aria-hidden>
          {items.map((_, k) => (
            <span key={k} className={`h-1.5 w-5 rounded-full ${k <= i ? "bg-calm" : "bg-border"}`} />
          ))}
        </div>
      </header>

      <section key={i} className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center animate-rise">
        <p className="mb-6 text-sm uppercase tracking-[0.25em] text-muted-foreground">{title}</p>
        <button
          onClick={() => play([it.audio, it.question], stage > 0)}
          disabled={speaking}
          aria-label="Réécouter"
          className="relative flex h-24 w-24 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl transition hover:scale-105"
        >
          {speaking && <span className="absolute inset-0 rounded-full bg-calm animate-breathe" />}
          <Volume2 className="relative h-10 w-10" />
        </button>
        <p className="mt-3 h-7 text-lg text-muted-foreground">{needsTap ? "Touchez pour écouter" : speaking ? "" : "Réécouter"}</p>

        {isChoice && <ChoiceBody it={it} stage={stage} wrong={wrong} chosen={chosen} message={message} onChoose={choose} onNext={goNext} />}

        {it.kind === "complete" && (
          <div className="mt-6 w-full text-center">
            <p className="font-serif text-5xl leading-tight">
              {it.audio.replace(/…$/, "")}{" "}
              <span className="text-calm">{stage >= 3 ? it.answerText : stage === 2 ? `${it.answerText!.slice(0, Math.max(1, Math.ceil(it.answerText!.length / 3)))}…` : "…"}</span>
            </p>
            {stage >= 1 && <p className="mt-6 font-serif text-2xl italic text-muted-foreground">{it.hint}</p>}
            <Companion>
              {stage < 3 ? (
                <>
                  <CBtn onClick={found}>Trouvé</CBtn>
                  {(canHint || stage > 0) && <CBtn subtle onClick={nextCue}>{stage === 0 ? "Indice" : stage === 1 ? "Premier son" : "Afficher le mot"}</CBtn>}
                </>
              ) : (
                <CBtn onClick={goNext}>Continuer</CBtn>
              )}
            </Companion>
          </div>
        )}

        {it.kind === "oral" && (
          <div className="mt-6 w-full text-center">
            {it.image && (
              <div className="mx-auto w-full max-w-sm overflow-hidden rounded-3xl shadow-lg">
                <img src={imageSrc(it.image) ?? ""} alt="" className="aspect-square w-full object-cover" />
              </div>
            )}
            <p className={`mx-auto mt-6 max-w-3xl font-serif leading-tight ${it.mode === "lire" ? "text-5xl" : "text-4xl"}`}>{it.audio}</p>
            {it.mode === "lire" && <p className="mt-4 text-lg text-muted-foreground">À vous de la dire.</p>}
            {it.mode === "nommer" && stage > 0 && <p className="mt-4 font-serif text-3xl text-calm">{it.answerText}</p>}
            <Companion>
              <CBtn onClick={() => rate("fluide")}>Réponse fluide</CBtn>
              <CBtn subtle onClick={() => rate("aide")}>A eu besoin d'aide</CBtn>
              <CBtn subtle onClick={() => rate("difficile")}>Difficile aujourd'hui</CBtn>
              {it.mode === "nommer" && stage === 0 && <CBtn subtle onClick={() => setStage(1)}>Afficher le nom</CBtn>}
            </Companion>
          </div>
        )}
      </section>
    </main>
  );
}

function ChoiceBody({ it, stage, wrong, chosen, message, onChoose, onNext }: { it: PlayItem; stage: number; wrong: number[]; chosen: number | null; message: string | null; onChoose: (k: number) => void; onNext: () => void }) {
  const hasImages = it.options.some((o) => o.image);
  const n = it.options.length;
  const cols = n === 4 ? "grid-cols-2 md:grid-cols-4" : n === 3 ? "grid-cols-3" : "grid-cols-2";
  return (
    <>
      <div className="mt-2 min-h-24 text-center">
        <p className="mx-auto max-w-3xl font-serif text-3xl leading-snug">{stage >= 1 || !it.question ? it.audio : ""}</p>
        {it.question && <p className="mt-2 font-serif text-2xl italic text-muted-foreground">{it.question}</p>}
        {stage >= 2 && it.keyword && <span className="mt-3 inline-block rounded-full bg-gold/25 px-5 py-1.5 text-xl">{it.keyword}</span>}
        <p className="mt-2 h-7 text-lg text-muted-foreground">{message}</p>
      </div>
      <div className={`mt-4 grid w-full gap-5 ${cols}`}>
        {it.options.map((o, k) => {
          const src = imageSrc(o.image);
          const right = chosen === k;
          const dim = wrong.includes(k) || (stage === 3 && k !== it.correctIndex);
          return (
            <button
              key={k}
              onClick={() => onChoose(k)}
              className={`overflow-hidden rounded-3xl border-2 bg-card shadow-sm transition ${right ? "border-calm ring-4 ring-calm-soft" : "border-transparent hover:-translate-y-1 hover:shadow-lg"} ${dim ? "opacity-35" : ""}`}
            >
              {hasImages && <div className="aspect-[4/3] w-full bg-muted">{src && <img src={src} alt={o.label} className="h-full w-full object-cover" />}</div>}
              <div className={`px-4 text-center ${hasImages ? "py-4 text-2xl" : "py-9 font-serif text-3xl"}`}>{o.label}</div>
            </button>
          );
        })}
      </div>
      <div className="mt-6 h-14">{stage === 3 && <button onClick={onNext} className="rounded-full bg-primary px-12 py-4 text-xl text-primary-foreground">Continuer</button>}</div>
    </>
  );
}

function Companion({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-12 border-t pt-5">
      <p className="mb-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">Pour l'accompagnant</p>
      <div className="flex flex-wrap justify-center gap-3">{children}</div>
    </div>
  );
}
function CBtn({ children, onClick, subtle }: { children: React.ReactNode; onClick: () => void; subtle?: boolean }) {
  return (
    <button onClick={onClick} className={`rounded-full px-6 py-3 text-base transition ${subtle ? "border bg-card text-muted-foreground hover:text-foreground" : "bg-primary text-primary-foreground hover:opacity-90"}`}>
      {children}
    </button>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <main className="paper-grain flex min-h-screen flex-col items-center justify-center px-8 text-center animate-rise">{children}</main>;
}
