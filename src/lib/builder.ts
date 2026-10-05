import { BANK, BY_ID, FOLLOW_IDS, type Item, type Opt, type Skill, type Theme } from "./content";

export type PastAttempt = { item_id: string | null; skill: string; outcome: string; created_at: string };

export type PlayItem = {
  id: string;
  kind: Item["kind"];
  mode?: string;
  theme: Theme;
  skill: Skill;
  audio: string;
  question: string | null;
  keyword: string | null;
  hint: string | null;
  answerText: string | null;
  image: string | null;
  options: Opt[];
  correctIndex: number;
  level: number;
};

const shuffle = <T,>(a: T[]) => {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j]!, b[i]!];
  }
  return b;
};

export function skillLevels(past: PastAttempt[], base: number): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of ["lexique", "conseil", "information", "temps", "completion", "expression"]) {
    const rows = past.filter((p) => p.skill === s).slice(0, 20);
    let lvl = base;
    if (rows.length >= 4) {
      const rate = rows.filter((r) => r.outcome === "spontaneous").length / rows.length;
      if (rate < 0.45) lvl -= 1;
      else if (rate > 0.8) lvl += 1;
    }
    out[s] = Math.max(1, Math.min(3, lvl));
  }
  return out;
}

function toPlay(item: Item, level: number): PlayItem {
  const base = { id: item.id, kind: item.kind, theme: item.theme, skill: item.skill, level, question: null, keyword: null, hint: null, answerText: null, image: null, options: [] as Opt[], correctIndex: -1 };
  if (item.kind === "mcq") {
    const opts = shuffle([item.answer, ...item.distractors.slice(0, level)]);
    return {
      ...base,
      audio: level === 1 && item.audioShort ? item.audioShort : item.audio,
      question: item.question ?? null,
      keyword: item.keyword,
      options: opts,
      correctIndex: opts.indexOf(item.answer),
    };
  }
  if (item.kind === "tf") {
    return { ...base, audio: item.audio, question: "Vrai ou faux ?", keyword: item.keyword, options: [{ label: "Vrai" }, { label: "Faux" }], correctIndex: item.answer ? 0 : 1 };
  }
  if (item.kind === "complete") {
    return { ...base, audio: item.audio, hint: item.hint, answerText: item.answer };
  }
  const step = item.steps[Math.min(level - 1, item.steps.length - 1)]!;
  return { ...base, mode: item.mode, audio: step, image: item.image ?? null, answerText: item.answer ?? null };
}

type Slot = { theme?: Theme; skill?: Skill; kind?: Item["kind"]; mode?: string };
const PLAN: Slot[] = [
  { theme: "nutrition", skill: "lexique", kind: "mcq" },
  { theme: "avis", skill: "conseil" },
  { theme: "sciences", kind: "mcq" },
  { theme: "temps" },
  { kind: "oral", mode: "nommer" },
  { theme: "avis", skill: "conseil" },
  { kind: "tf" },
  { kind: "complete" },
  { theme: "nutrition", skill: "lexique", kind: "mcq" },
  { theme: "expression" },
];

export function buildSession(past: PastAttempt[], topics: string[], base: number): PlayItem[] {
  const levels = skillLevels(past, base);
  const now = Date.now();
  const recent = new Set(past.slice(0, 40).map((p) => p.item_id));
  const lastSeen = new Map<string, number>();
  const struggled = new Set<string>();
  for (const p of past) {
    if (!p.item_id) continue;
    if (!lastSeen.has(p.item_id)) lastSeen.set(p.item_id, new Date(p.created_at).getTime());
    if (p.outcome === "revealed" || p.outcome === "after_cue") struggled.add(p.item_id);
  }

  const allowed = (i: Item) => {
    if (FOLLOW_IDS.has(i.id)) return false;
    if (i.kind === "complete") return topics.includes("nutrition");
    if (i.kind === "tf") return topics.includes("sciences") || topics.includes("nutrition");
    if (i.kind === "oral") return topics.includes("expression") || (i.mode === "nommer" && topics.includes("nutrition"));
    return topics.includes(i.theme);
  };
  const score = (i: Item) => {
    const seen = lastSeen.get(i.id);
    let s = Math.random();
    if (!seen) s += 2;
    else if (struggled.has(i.id) && now - seen > 2 * 864e5) s += 3; // difficult concepts come back later
    if (recent.has(i.id)) s -= 5;
    return s;
  };

  const used = new Set<string>();
  const picks: Item[] = [];
  const pick = (pool: Item[]) => {
    const best = pool.filter((i) => !used.has(i.id)).sort((a, b) => score(b) - score(a))[0];
    if (best) {
      used.add(best.id);
      picks.push(best);
      if (best.kind === "oral" && best.follow) {
        const f = BY_ID.get(best.follow);
        if (f) {
          used.add(f.id);
          picks.push(f);
        }
      }
    }
    return !!best;
  };

  const pool = BANK.filter(allowed);
  for (const slot of PLAN) {
    const match = pool.filter(
      (i) =>
        (!slot.theme || i.theme === slot.theme) &&
        (!slot.skill || i.skill === slot.skill) &&
        (!slot.kind || i.kind === slot.kind) &&
        (!slot.mode || (i.kind === "oral" && i.mode === slot.mode)),
    );
    if (!pick(match)) pick(pool);
  }
  return picks.map((i) => toPlay(i, levels[i.skill] ?? base));
}
