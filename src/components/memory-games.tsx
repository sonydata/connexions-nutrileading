import { useEffect, useState } from "react";
import { Check, Eye, LayoutGrid, ShoppingBasket } from "lucide-react";
import { imageSrc, LIBRARY } from "@/lib/library";

export type Game = "paires" | "disparu" | "courses";
/** Each game shows what it looks like: a few of its own pictures, plus an emoji and a colour of its own. */
export const GAMES: { id: Game; title: string; emoji: string; text: string; Icon: typeof Eye; preview: string[]; tone: string }[] = [
  { id: "paires", title: "Les paires", emoji: "🃏", text: "Retournez deux cartes et retrouvez les images identiques.", Icon: LayoutGrid, preview: ["keys", "?", "keys"], tone: "bg-u-retrouver-soft border-u-retrouver/40" },
  { id: "disparu", title: "L'objet disparu", emoji: "🔍", text: "Regardez quelques objets. L'un d'eux disparaît : lequel ?", Icon: Eye, preview: ["glasses", "umbrella", "?"], tone: "bg-u-comprendre-soft border-u-comprendre/40" },
  { id: "courses", title: "La liste de courses", emoji: "🛒", text: "Retenez trois produits, puis retrouvez-les parmi d'autres.", Icon: ShoppingBasket, preview: ["apple", "cheese", "bread"], tone: "bg-u-exprimer-soft border-u-exprimer/40" },
];

/** Three small pictures that show what the game is ("?" = a card face down). */
export function Preview({ ids, size = "size-16" }: { ids: string[]; size?: string }) {
  return (
    <span className="flex gap-2">
      {ids.map((id, k) =>
        id === "?" ? (
          <span key={k} className={`${size} grid place-items-center rounded-xl bg-primary/15 font-serif text-3xl text-primary/70`}>?</span>
        ) : (
          <img key={k} src={imageSrc(id) ?? ""} alt="" className={`${size} rounded-xl object-cover shadow-sm`} />
        ),
      )}
    </span>
  );
}


type Pic = { id: string; label: string };
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const label = (id: string) => cap(LIBRARY.find((l) => l.id === id)?.label ?? id);
const OBJECTS: Pic[] = ["phone", "keys", "glasses", "umbrella", "book", "watch", "toothbrush", "shoe", "coat", "pen", "fork", "newspaper"].map((id) => ({ id, label: label(id) }));
const FOODS: Pic[] = ["apple", "orange", "carrots", "eggs", "cheese", "bread", "croissant", "broccoli", "yogurt", "salmon", "coffee", "walnuts"].map((id) => ({ id, label: label(id) }));
const shuffle = <T,>(a: T[]) => {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j]!, b[i]!];
  }
  return b;
};
const pick = <T,>(a: T[], n: number) => shuffle(a).slice(0, n);


/** One game, by name — used on the games page and inside a session. */
export function MemoryGame({ game }: { game: Game }) {
  return game === "paires" ? <Pairs /> : game === "disparu" ? <Missing /> : <Shopping />;
}

function Picture({ pic, className = "h-28" }: { pic: Pic; className?: string }) {
  return (
    <span className="flex flex-col items-center gap-2">
      <img src={imageSrc(pic.id) ?? ""} alt="" className={`${className} w-full rounded-xl object-cover`} />
      <span className="text-xl font-medium">{pic.label}</span>
    </span>
  );
}

function Title({ children, sub }: { children: React.ReactNode; sub: string }) {
  return (
    <>
      <h1 className="font-serif text-4xl md:text-5xl">{children}</h1>
      <p className="mt-3 text-2xl text-primary">{sub}</p>
    </>
  );
}

function Again({ onClick, children = "Encore une fois" }: { onClick: () => void; children?: React.ReactNode }) {
  return (
    <button onClick={onClick} className="mt-8 rounded-full bg-primary px-12 py-4 text-2xl font-medium text-primary-foreground shadow-lg transition hover:opacity-90">
      {children}
    </button>
  );
}

// ——— 1. Paires : 3 paires pour commencer, 4 si l'on veut plus ———
function Pairs() {
  const [pairs, setPairs] = useState(3);
  const [cards, setCards] = useState<{ key: number; pic: Pic }[]>([]);
  const [open, setOpen] = useState<number[]>([]);
  const [found, setFound] = useState<Set<string>>(new Set());
  const deal = (n = pairs) => {
    const pics = pick(OBJECTS, n);
    setCards(shuffle([...pics, ...pics]).map((pic, key) => ({ key, pic })));
    setOpen([]);
    setFound(new Set());
  };
  useEffect(() => deal(), []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (open.length !== 2) return;
    const [a, b] = open.map((k) => cards[k]!);
    if (a!.pic.id === b!.pic.id) {
      setFound((f) => new Set(f).add(a!.pic.id));
      setOpen([]);
      return;
    }
    const t = setTimeout(() => setOpen([]), 1400);
    return () => clearTimeout(t);
  }, [open, cards]);
  const done = cards.length > 0 && found.size === cards.length / 2;
  return (
    <div className="text-center">
      <Title sub={done ? "Bravo, toutes les paires sont trouvées !" : "Touchez deux cartes pour les retourner."}>Les paires</Title>
      <div className={`mx-auto mt-8 grid max-w-3xl gap-4 ${cards.length > 6 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-3"}`}>
        {cards.map(({ key, pic }) => {
          const shown = open.includes(key) || found.has(pic.id);
          return (
            <button
              key={key}
              onClick={() => !shown && open.length < 2 && setOpen((o) => [...o, key])}
              aria-label={shown ? pic.label : "Carte retournée"}
              className={`min-h-44 rounded-2xl border-2 p-3 shadow-sm transition ${found.has(pic.id) ? "border-calm bg-calm-soft" : shown ? "border-primary bg-card" : "border-primary/40 bg-primary/10 hover:bg-primary/20"}`}
            >
              {shown ? <Picture pic={pic} /> : <span className="font-serif text-5xl text-primary/60">?</span>}
            </button>
          );
        })}
      </div>
      {done && (
        <div className="flex flex-wrap justify-center gap-4">
          <Again onClick={() => deal()} />
          {pairs === 3 && (
            <Again onClick={() => { setPairs(4); deal(4); }}>Avec plus de cartes</Again>
          )}
        </div>
      )}
    </div>
  );
}

// ——— 2. L'objet disparu ———
function Missing() {
  const [shown, setShown] = useState<Pic[]>([]);
  const [gone, setGone] = useState<Pic | null>(null);
  const [choices, setChoices] = useState<Pic[]>([]);
  const [step, setStep] = useState<"look" | "guess" | "after">("look");
  const [picked, setPicked] = useState<string | null>(null);
  const deal = () => {
    const all = pick(OBJECTS, 6);
    const four = all.slice(0, 4);
    const missing = four[Math.floor(Math.random() * 4)]!;
    setShown(four);
    setGone(missing);
    setChoices(shuffle([missing, ...all.slice(4, 6)]));
    setPicked(null);
    setStep("look");
  };
  useEffect(deal, []);
  if (!gone) return null;
  const left = shown.filter((p) => p !== gone);
  return (
    <div className="text-center">
      <Title sub={step === "look" ? "Regardez bien ces objets." : step === "guess" ? "Quel objet a disparu ?" : picked === gone.id ? `Oui, c'était : ${gone.label.toLowerCase()}.` : `C'était : ${gone.label.toLowerCase()}.`}>
        L'objet disparu
      </Title>
      <div className={`mx-auto mt-8 grid max-w-3xl gap-4 ${step === "look" ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"}`}>
        {(step === "look" ? shown : left).map((p) => (
          <div key={p.id} className="rounded-2xl border-2 border-border bg-card p-3"><Picture pic={p} /></div>
        ))}
      </div>
      {step === "look" && <Again onClick={() => setStep("guess")}>J'ai bien regardé</Again>}
      {step !== "look" && (
        <div className="mx-auto mt-8 grid max-w-3xl grid-cols-3 gap-4">
          {choices.map((p) => {
            const right = step === "after" && p.id === gone.id;
            return (
              <button
                key={p.id}
                disabled={step === "after"}
                onClick={() => { setPicked(p.id); setStep("after"); }}
                className={`rounded-2xl border-2 p-3 transition ${right ? "border-calm bg-calm-soft" : picked === p.id ? "border-primary" : "border-border bg-card hover:border-primary"} ${step === "after" && !right ? "opacity-60" : ""}`}
              >
                <span className="text-2xl font-medium">{p.label}</span>
                {right && <Check className="mx-auto mt-2 size-7 text-calm" />}
              </button>
            );
          })}
        </div>
      )}
      {step === "after" && (
        <>
          <div className="mx-auto mt-6 max-w-48"><Picture pic={gone} /></div>
          <Again onClick={deal} />
        </>
      )}
    </div>
  );
}

// ——— 3. La liste de courses : retenir 3 produits, les retrouver parmi 6 ———
function Shopping() {
  const [list, setList] = useState<Pic[]>([]);
  const [grid, setGrid] = useState<Pic[]>([]);
  const [chosen, setChosen] = useState<string[]>([]);
  const [step, setStep] = useState<"look" | "find" | "after">("look");
  const deal = () => {
    const six = pick(FOODS, 6);
    setList(six.slice(0, 3));
    setGrid(shuffle(six));
    setChosen([]);
    setStep("look");
  };
  useEffect(deal, []);
  const onList = (id: string) => list.some((p) => p.id === id);
  const toggle = (id: string) => setChosen((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length < 3 ? [...c, id] : c));
  return (
    <div className="text-center">
      <Title sub={step === "look" ? "Retenez ces trois produits." : step === "find" ? "Touchez les trois produits de la liste." : "Voici la liste."}>La liste de courses</Title>
      {step === "look" && (
        <>
          <div className="mx-auto mt-8 grid max-w-3xl grid-cols-3 gap-4">
            {list.map((p) => <div key={p.id} className="rounded-2xl border-2 border-border bg-card p-3"><Picture pic={p} className="h-36" /></div>)}
          </div>
          <Again onClick={() => setStep("find")}>J'ai retenu</Again>
        </>
      )}
      {step !== "look" && (
        <>
          <div className="mx-auto mt-8 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-3">
            {grid.map((p) => {
              const isChosen = chosen.includes(p.id);
              const highlight = step === "after" && onList(p.id);
              return (
                <button
                  key={p.id}
                  disabled={step === "after"}
                  onClick={() => toggle(p.id)}
                  aria-pressed={isChosen}
                  className={`relative rounded-2xl border-2 p-3 transition ${highlight ? "border-calm bg-calm-soft" : isChosen ? "border-primary bg-card" : "border-border bg-card hover:border-primary"} ${step === "after" && !highlight ? "opacity-50" : ""}`}
                >
                  <span className={`absolute right-3 top-3 grid size-8 place-items-center rounded-md border-2 ${highlight ? "border-calm bg-calm text-primary-foreground" : isChosen ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40 bg-card"}`}>
                    {(isChosen || highlight) && <Check className="size-5" />}
                  </span>
                  <Picture pic={p} />
                </button>
              );
            })}
          </div>
          {step === "find" && <Again onClick={() => setStep("after")}>{chosen.length === 3 ? "Voir la liste" : "Voir la réponse"}</Again>}
          {step === "after" && <Again onClick={deal} />}
        </>
      )}
    </div>
  );
}
