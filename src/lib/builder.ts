import { BANK, BY_ID, FOLLOW_IDS, SCENE, topicOf, type Item, type Opt, type Skill, type Theme, type Topic } from "./content";
import { interestsOf } from "./interests";

export type PastAttempt = { item_id: string | null; skill: string; outcome: string; created_at: string; response_ms: number | null };

export type PlayItem = {
  id: string;
  kind: Item["kind"];
  mode?: string;
  theme: Theme;
  topic: Topic;
  skill: Skill;
  audio: string;
  question: string | null;
  keyword: string | null;
  hint: string | null;
  answerText: string | null;
  image: string | null;
  model: string | null; // formulation modèle, heard and repeated after the attempt
  syllable: string | null; // first-sound cue for word retrieval
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

const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
/** "sarcopénie" → "sar…" : roughly the first syllable. */
export function firstSound(w: string) {
  const m = w.match(/^[^aeiouyéèêàâîôû]*[aeiouyéèêàâîôû]+[^aeiouyéèêàâîôû\s']?/i);
  const s = m ? m[0] : w.slice(0, 2);
  return (s.length >= w.length ? w.slice(0, Math.max(1, w.length - 1)) : s) + "…";
}

export function skillLevels(past: PastAttempt[], base: number): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of ["lexique", "conseil", "information", "temps", "completion", "expression", "evocation", "elocution"]) {
    const rows = past.filter((p) => p.skill === s).slice(0, 20);
    let lvl = base;
    if (rows.length >= 4) {
      const spont = rows.filter((r) => r.outcome === "spontaneous");
      const rate = spont.length / rows.length;
      // Level up only when answers are spontaneous AND quick (median < 8 s);
      // ease + speed together signal the skill is getting comfortable.
      const times = spont.map((r) => r.response_ms).filter((t): t is number => t != null && t > 0).sort((a, b) => a - b);
      const median = times.length ? times[Math.floor(times.length / 2)]! : null;
      const fast = median == null || median < 8000;
      if (rate < 0.45) lvl -= 1;
      else if (rate > 0.8 && fast) lvl += 1;
    }
    out[s] = Math.max(1, Math.min(3, lvl));
  }
  return out;
}

function toPlay(item: Item, level: number): PlayItem {
  const base = { id: item.id, kind: item.kind, theme: item.theme, topic: topicOf(item), skill: item.skill, level, question: null, keyword: null, hint: null, answerText: null, image: null, model: null, syllable: null, options: [] as Opt[], correctIndex: -1 };
  if (item.kind === "mcq") {
    let opts = shuffle([item.answer, ...item.distractors.slice(0, level)]);
    // Photos only when every option has one, and never for advice/actions
    // (a salt photo next to "réduire le sel" would say the opposite).
    if (item.skill === "conseil" || !opts.every((o) => o.image)) opts = opts.map((o) => ({ label: o.label }));
    const answer = opts.find((o) => o.label === item.answer.label)!;
    return {
      ...base,
      audio: level === 1 && item.audioShort ? item.audioShort : item.audio,
      question: item.question ?? null,
      keyword: item.keyword,
      options: opts,
      correctIndex: opts.indexOf(answer),
      image: opts.every((o) => o.image) ? null : (SCENE[item.id] ?? null),
    };
  }
  if (item.kind === "tf") {
    return { ...base, audio: item.audio, question: "Vrai ou faux ?", keyword: item.keyword, options: [{ label: "Vrai" }, { label: "Faux" }], correctIndex: item.answer ? 0 : 1, image: SCENE[item.id] ?? null };
  }
  if (item.kind === "complete") {
    return { ...base, audio: item.audio, hint: item.hint, answerText: item.answer, syllable: firstSound(item.answer), model: item.audio.replace(/…$/, item.answer + ".") };
  }
  if (item.kind === "evoke") {
    return { ...base, audio: item.audio, hint: item.hint, answerText: item.answer, syllable: item.syllable, model: item.model };
  }
  const step = item.steps[Math.min(level - 1, item.steps.length - 1)]!;
  const model = item.mode === "lire" ? step : item.mode === "nommer" && item.answer ? cap(item.answer) + "." : (item.model ?? null);
  return { ...base, mode: item.mode, audio: step, image: item.image ?? null, answerText: item.answer ?? null, hint: item.hint ?? null, syllable: item.answer ? firstSound(item.answer) : null, model };
}

// One session = 15 activities. ~80 % come from the person's chosen subjects
// (rotated so each interest appears), ~20 % are transversal (time, language).
type Slot = { kinds: Item["kind"][]; modes?: string[]; general?: boolean };
const PLAN: Slot[] = [
  { kinds: ["mcq"] },
  { kinds: ["mcq", "tf"] },
  { kinds: ["oral"], modes: ["expliquer"] },
  { kinds: ["mcq"] },
  { kinds: ["evoke", "complete"] },
  { kinds: ["mcq"] },
  { kinds: ["oral"], modes: ["lire"] },
  { kinds: ["mcq"], general: true },
  { kinds: ["tf", "mcq"] },
  { kinds: ["oral"], modes: ["expliquer", "reformuler"] },
  { kinds: ["mcq"] },
  { kinds: ["evoke", "oral"], modes: ["nommer"] },
  { kinds: ["mcq"], general: true },
  { kinds: ["oral"], modes: ["expliquer"] },
  { kinds: ["mcq", "tf"], general: true },
];
const WITH_CONTENT = new Set<Topic>(["sante", "medecine", "sciences", "histoire", "art", "geographie", "nature", "litterature", "technologie", "cuisine", "sport"]);

/** `topics` = caregiver_settings.topics (interests stored with an "i:" prefix). */
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
  let chosen = interestsOf(topics).filter((x): x is Topic => WITH_CONTENT.has(x as Topic));
  if (!chosen.length) chosen = ["sante", "medecine", "sciences", "art"];

  const score = (i: Item) => {
    const seen = lastSeen.get(i.id);
    let s = Math.random();
    if (!seen) s += 2;
    else if (struggled.has(i.id) && now - seen > 2 * 864e5) s += 3; // difficult concepts return after 2 days
    else if (now - seen > 7 * 864e5) s += 1.5; // and everything resurfaces after a week
    if (recent.has(i.id)) s -= 5;
    return s;
  };

  const used = new Set<string>();
  const perTopic = new Map<string, number>();
  const picks: Item[] = [];
  const take = (best: Item) => {
    used.add(best.id);
    picks.push(best);
    perTopic.set(topicOf(best), (perTopic.get(topicOf(best)) ?? 0) + 1);
    if (best.kind === "oral" && best.follow) {
      const f = BY_ID.get(best.follow);
      if (f) {
        used.add(f.id);
        picks.push(f);
      }
    }
  };
  const bestOf = (pool: Item[]) => pool.filter((i) => !used.has(i.id)).sort((a, b) => score(b) - score(a))[0];

  const pool = BANK.filter((i) => !FOLLOW_IDS.has(i.id));
  const fits = (slot: Slot) => (i: Item) => slot.kinds.includes(i.kind) && (!slot.modes || i.kind !== "oral" || slot.modes.includes(i.mode));
  const interest = pool.filter((i) => chosen.includes(topicOf(i)));
  const general = pool.filter((i) => topicOf(i) === "general");

  for (const slot of PLAN) {
    if (slot.general) {
      // Transversal slot: time/organisation, else a chosen-subject item.
      const g = bestOf(general) ?? bestOf(interest);
      if (g) take(g);
      continue;
    }
    // Rotate subjects: least-used chosen subject that has a fitting item.
    const order = shuffle(chosen).sort((a, b) => (perTopic.get(a) ?? 0) - (perTopic.get(b) ?? 0));
    let got: Item | undefined;
    for (const tp of order) {
      got = bestOf(interest.filter((i) => topicOf(i) === tp).filter(fits(slot)));
      if (got) break;
    }
    got ??= bestOf(interest) ?? bestOf(general);
    if (got) take(got);
  }
  return picks.map((i) => toPlay(i, levels[i.skill] ?? base));
}
