import { LIBRARY, imageSrc } from "./library";
import { BANK, REPERES, BY_ID, FOLLOW_IDS, SCENE, topicOf, type Item, type Opt, type Skill, type Theme, type Topic } from "./content";
import { interestsOf } from "./interests";
import { COLLECTIONS, SEQUENCES, SEQ_BY_ID, SEQ_TITLE, STAGE_OF, exploredSeqs, type Sequence, type Stage } from "./sequences";

export type PastAttempt = { item_id: string | null; kind?: string | null; skill: string; outcome: string; created_at: string; response_ms: number | null };

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
  stage: Stage | null; // step inside a thematic mini-sequence
  seqTitle: string | null;
  recall: string | null; // "we talked about this before" line read before a reactivated item
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
    const rows = past.filter((p) => p.skill === s && !p.kind?.startsWith("discussion:")).slice(0, 20);
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

// Illustration for every question: curated scene → photo whose subject is named in the
// situation (never in the answers) . No generic fallback: no photo rather than an ambiguous one. Never shows the answer.
const STOP = new Set(["les", "des", "une", "verre", "tasse", "pain", "soleil", "lever", "coucher", "haut"]);
const norm = (t: string) => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const KEYS = LIBRARY.flatMap((l) => norm(l.label).split(/[^a-z]+/).filter((w) => w.length >= 4 && !STOP.has(w)).map((w) => [w, l.id] as const));
function illustrate(item: Item, text: string, answer?: string): string | null {
  if (SCENE[item.id]) return SCENE[item.id]!;
  const seq = item.id.match(/^(sq-[a-z]+)-[cref]$/)?.[1];
  if (seq && imageSrc(seq)) return seq;
  const t = norm(text);
  const bad = answer ? norm(answer) : "";
  const hit = KEYS.find(([w, id]) => new RegExp(`\\b${w}s?\\b`).test(t) && !(bad && bad.includes(w)) && imageSrc(id));
  if (hit) return hit[1];
  return null;
}

export function toPlay(item: Item, level: number): PlayItem {
  const base = { id: item.id, kind: item.kind, theme: item.theme, topic: topicOf(item), skill: item.skill, level, question: null, keyword: null, hint: null, answerText: null, image: null, model: null, syllable: null, options: [] as Opt[], correctIndex: -1, stage: STAGE_OF.get(item.id) ?? null, seqTitle: SEQ_TITLE.get(item.id) ?? null, recall: null as string | null };
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
      image: opts.every((o) => o.image) ? null : illustrate(item, `${item.audio} ${item.question ?? ""}`, item.answer.label),
    };
  }
  if (item.kind === "tf") {
    return { ...base, audio: item.audio, question: "Vrai ou faux ?", keyword: item.keyword, options: [{ label: "Vrai" }, { label: "Faux" }], correctIndex: item.answer ? 0 : 1, image: illustrate(item, item.audio) };
  }
  if (item.kind === "complete") {
    return { ...base, audio: item.audio, hint: item.hint, answerText: item.answer, image: illustrate(item, item.audio, item.answer), syllable: firstSound(item.answer), model: item.audio.replace(/…$/, item.answer + ".") };
  }
  if (item.kind === "evoke") {
    return { ...base, audio: item.audio, hint: item.hint, answerText: item.answer, image: illustrate(item, item.audio, item.answer), syllable: item.syllable, model: item.model };
  }
  const step = item.steps[Math.min(level - 1, item.steps.length - 1)]!;
  const model = item.mode === "lire" ? step : item.mode === "nommer" && item.answer ? cap(item.answer) + "." : (item.model ?? null);
  return { ...base, mode: item.mode, audio: step, image: item.image ?? (item.mode === "nommer" ? null : illustrate(item, step)), answerText: item.answer ?? null, hint: item.hint ?? null, syllable: item.answer ? firstSound(item.answer) : null, model };
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
function buildSlotSession(past: PastAttempt[], topics: string[], base: number): PlayItem[] {
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

const TEASE: Partial<Record<Topic, string>> = {
  art: "une œuvre célèbre", sciences: "une découverte scientifique", medecine: "une question de médecine", sante: "un sujet de nutrition",
  histoire: "une page d'histoire", geographie: "un voyage", litterature: "un grand écrivain", nature: "un regard sur la nature",
  technologie: "une invention", cuisine: "une saveur du monde", sport: "un moment de sport",
};
const ITEM_TOPIC = new Map<string, Topic>([...BANK.map((i) => [i.id, topicOf(i)] as [string, Topic]), ...SEQUENCES.flatMap((s) => s.items.map((i) => [i.id, s.topic] as [string, Topic]))]);
export const topicOfId = (id: string | null) => (id ? ITEM_TOPIC.get(id.replace(/#rep$/, "")) ?? null : null);

/** Learned, rule-based taste per subject: ease + willingness to answer aloud. Never shown. */
export function topicAffinity(past: PastAttempt[]) {
  const acc = new Map<Topic, { n: number; s: number }>();
  for (const p of past.slice(0, 200)) {
    if (p.kind?.startsWith("discussion:")) continue;
    const t = topicOfId(p.item_id);
    if (!t) continue;
    const a = acc.get(t) ?? { n: 0, s: 0 };
    a.n++;
    a.s += p.outcome === "spontaneous" ? 1 : p.outcome === "revealed" ? 0 : 0.5;
    acc.set(t, a);
  }
  const out = new Map<Topic, number>();
  for (const [t, a] of acc) out.set(t, a.n >= 3 ? (a.s / a.n) * Math.min(1, a.n / 12) : 0);
  return out;
}

export type Plan = { items: PlayItem[]; teaser: string };

/**
 * Session (~10 steps, 8–12 min) = one familiar path (series continuation or a liked subject),
 * one time item, one earlier word brought back (spaced: 2 days if it gave trouble, else 7),
 * and one new path. Roughly 70 % familiar / 30 % new; rules only, never AI.
 */
export function buildPlan(past: PastAttempt[], topics: string[], base: number, focus?: string | null): Plan {
  const levels = skillLevels(past, base);
  let chosen = interestsOf(topics).filter((x): x is Topic => WITH_CONTENT.has(x as Topic));
  if (!chosen.length) chosen = ["sante", "medecine", "sciences", "art"];
  const now = Date.now();
  const lastSeen = new Map<string, number>();
  const struggled = new Set<string>();
  for (const p of past) {
    if (!p.item_id) continue;
    if (!lastSeen.has(p.item_id)) lastSeen.set(p.item_id, new Date(p.created_at).getTime());
    if (p.outcome === "revealed" || p.outcome === "after_cue") struggled.add(p.item_id);
  }
  const explored = exploredSeqs(lastSeen.keys());
  const aff = topicAffinity(past);
  const age = (id: string) => { const t = lastSeen.get(`${id}-c`); return t ? (now - t) / 864e5 : 99; };
  const fresh = (s: Sequence) => age(s.id) > 3;

  // Familiar: next step of a series already begun, else a liked chosen subject.
  const seriesNext = COLLECTIONS.map((c) => {
    const done = c.ids.filter((id) => explored.has(id)).length;
    const next = c.ids.find((id) => !explored.has(id));
    return done > 0 && next ? SEQ_BY_ID.get(next) : undefined;
  }).filter((s): s is Sequence => !!s && chosen.includes(s.topic));
  const inFocus = (s: Sequence) => !focus || s.topic === focus;
  const famScore = (s: Sequence) => Math.random() * 0.6 + (aff.get(s.topic) ?? 0.3) + Math.min(2, age(s.id) / 7) + (explored.has(s.id) ? 0 : 0.8);
  const familiar =
    seriesNext.filter(inFocus)[0] ??
    SEQUENCES.filter((s) => chosen.includes(s.topic) && inFocus(s) && fresh(s)).sort((a, b) => famScore(b) - famScore(a))[0] ??
    SEQUENCES.filter((s) => chosen.includes(s.topic)).sort((a, b) => famScore(b) - famScore(a))[0];
  if (!familiar) return { items: buildSlotSession(past, topics, base), teaser: "" };

  // New: a path never seen, on another subject — chosen subjects first, else beyond them.
  const unseen = SEQUENCES.filter((s) => s !== familiar && !explored.has(s.id) && s.topic !== familiar.topic);
  const novel =
    shuffle(unseen.filter((s) => chosen.includes(s.topic)))[0] ??
    shuffle(unseen)[0] ??
    SEQUENCES.filter((s) => s !== familiar && s.topic !== familiar.topic).sort((a, b) => age(b.id) - age(a.id))[0];

  // Reactivation: a word from an earlier path, back after 2 days (if it was hard) or a week.
  const due = SEQUENCES.filter((s) => s !== familiar && s !== novel && explored.has(s.id)).map((s) => {
    const r = `${s.id}-r`;
    const t = lastSeen.get(r) ?? lastSeen.get(`${s.id}-c`)!;
    const d = (now - t) / 864e5;
    const prio = struggled.has(r) && d >= 2 ? 2 + d / 7 : d >= 7 ? 1 + d / 30 : 0;
    return { s, d, prio };
  }).filter((x) => x.prio > 0).sort((a, b) => b.prio - a.prio)[0];

  const recent = new Set(past.slice(0, 40).map((p) => p.item_id));
  const general = BANK.filter((i) => !FOLLOW_IDS.has(i.id) && topicOf(i) === "general" && i.skill === "temps" && !recent.has(i.id));
  const extra = shuffle(general.length ? general : BANK.filter((i) => topicOf(i) === "general" && i.skill === "temps"))[0];

  const items: PlayItem[] = familiar.items.map((i) => toPlay(i, levels[i.skill] ?? base));
  if (extra) items.push(toPlay(extra, levels[extra.skill] ?? base));
  if (due) {
    const r = toPlay(due.s.items[1], levels["evocation"] ?? base);
    r.recall = `${due.d >= 7 ? "La semaine dernière" : "Il y a quelques jours"}, nous avions parlé de ce sujet : ${due.s.title}.`;
    items.push(r);
  }
  if (novel) items.push(...novel.items.map((i) => toPlay(i, levels[i.skill] ?? base)));

  // Actualité: two current reference questions + one short exchange, rotating.
  // Put this coherent block first so it is never mistaken for the neighbouring cultural sequence.
  if (interestsOf(topics).includes("actualite") && (!focus || focus === "actualite")) {
    const fresh2 = (xs: Item[]) => { const f = xs.filter((i) => !recent.has(i.id)); return shuffle(f.length >= 2 ? f : xs); };
    const qs = fresh2(REPERES.filter((i) => i.kind === "mcq")).slice(0, 2);
    const talk = fresh2(REPERES.filter((i) => i.kind === "oral"))[0];
    const current: PlayItem[] = [];
    for (const i of [...qs, ...(talk ? [talk] : [])]) {
      const p = toPlay(i, levels[i.skill] ?? base);
      p.seqTitle = "Repères du moment";
      current.push(p);
    }
    items.unshift(...current);
  }

  // Teaser: tomorrow's subjects, hinted without revealing them.
  const today = new Set([familiar.topic, novel?.topic]);
  const after = new Set([...explored, familiar.id, novel?.id]);
  const nextSeries = COLLECTIONS.find((c) => c.ids.some((id) => after.has(id)) && c.ids.some((id) => !after.has(id) && chosen.includes(SEQ_BY_ID.get(id)!.topic)));
  const order = [...chosen.filter((t) => !today.has(t)), ...chosen.filter((t) => today.has(t))];
  const hints = order.map((t) => TEASE[t]).filter(Boolean).slice(0, 3) as string[];
  const teaser = nextSeries && Math.random() < 0.5 ? `À suivre : la suite de « ${nextSeries.title} ».` : hints.length ? `Demain : ${hints.join(", ")}.` : "";
  return { items, teaser };
}

export function buildSession(past: PastAttempt[], topics: string[], base: number): PlayItem[] {
  return buildPlan(past, topics, base).items;
}
