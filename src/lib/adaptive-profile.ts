/**
 * Functional profile → session parameters. Pure rules, no AI.
 * Language support and intellectual complexity are deliberately separate:
 * we simplify how things are said, never what is discussed.
 * This file is the single place to improve the adaptation algorithm later.
 */

export type ProfileAnswers = {
  comprehension?: number; // 1 = understands normal conversation … 5 = major difficulty
  expression?: number; // 1 … 5
  memory?: number; // 1 … 5
  attention?: number; // 1 = 15+ min, 2 = 10–15, 3 = 5–10, 4 = < 5
  reading?: number; // 1 = normal … 4 = difficult
  executive?: number; // 1 = follows multi-step instructions … 3 = one step at a time
  hearing?: boolean;
  vision?: boolean;
  fatigue?: number; // 1 = tolerant … 3 = tires / frustrates quickly
  knowledge?: number; // 1 … 5 general knowledge / reasoning retained (5 = high)
  personal?: { id: string; sentence: string; question: string; answer: string }[] | undefined; // personal targets (text only)
  reinforced?: boolean | undefined; // "Accompagnement renforcé", set by the caregiver (saved with the profile)
};

export type SignalSummary = { turns: number; repeats: number; notUnderstood: number; shared: number; avgWords: number };

export type SessionParams = {
  languageSupport: number; // 0 natural … 3 one short idea at a time
  intellectualComplexity: number; // 1 … 5, independent from language
  maxSentenceWords: number;
  ideasPerUtterance: number;
  optionCount: 2 | 3;
  repetition: number; // 0 none, 1 offer replay, 2 read twice
  cueEarly: boolean;
  pauseMs: number; // silence between spoken segments
  sessionMinutes: number;
  maxTurns: number;
  largeText: boolean;
  preferStructured: boolean; // offer pistes first rather than fully open questions
  reinforced: boolean; // choices and hints shown from the start, one idea at a time
  voiceRate: number; // playback speed of the natural voice (slower with more language support)
};

const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

export const QUESTIONS: { key: keyof ProfileAnswers; title: string; options: string[] }[] = [
  { key: "comprehension", title: "Compréhension orale", options: ["Comprend facilement une conversation normale", "A parfois besoin de phrases plus courtes", "Comprend mieux une idée à la fois", "A souvent besoin de répétitions", "Comprendre reste souvent difficile"] },
  { key: "expression", title: "Expression", options: ["S'exprime normalement", "Cherche parfois ses mots", "Cherche fréquemment ses mots", "Répond surtout par phrases courtes", "Formuler une réponse est souvent difficile"] },
  { key: "memory", title: "Mémoire", options: ["Peu de gêne", "Oublis légers", "Retient difficilement plusieurs informations", "Oublie une information après quelques minutes", "Gêne importante"] },
  { key: "attention", title: "Durée confortable d'une activité", options: ["15 minutes ou plus", "10 à 15 minutes", "5 à 10 minutes", "Moins de 5 minutes"] },
  { key: "reading", title: "Lecture", options: ["Normale", "Texte court préférable", "Quelques mots seulement", "Lecture difficile"] },
  { key: "executive", title: "Consignes", options: ["Suit des consignes en plusieurs étapes", "Préfère deux étapes au plus", "Une étape à la fois"] },
  { key: "fatigue", title: "Fatigue", options: ["Rarement fatigué(e) ou agacé(e)", "Parfois", "Se fatigue vite"] },
  { key: "knowledge", title: "Connaissances et raisonnement", options: ["Plutôt limités aujourd'hui", "Simples", "Bonne culture générale", "Très solides", "Expert(e) dans son domaine"] },
];

export function deriveParams(a: ProfileAnswers, s?: SignalSummary | null, base = 1): SessionParams {
  const comp = a.comprehension ?? (base >= 3 ? 1 : 2);
  const exec = a.executive ?? 1;
  let support = clamp(Math.round((comp - 1) * 0.75 + (exec - 1) * 0.5 + (a.hearing ? 0.5 : 0)), 0, 3);

  // Gradual adjustment from recent sessions: at most one step, only with enough evidence.
  if (s && s.turns >= 8) {
    const trouble = (s.repeats + s.notUnderstood * 2) / s.turns;
    if (trouble > 0.35) support = Math.min(3, support + 1);
    else if (trouble < 0.05 && s.shared / s.turns > 0.6 && s.avgWords >= 8) support = Math.max(0, support - 1);
  }

  const att = a.attention ?? 2;
  const fatigue = a.fatigue ?? 1;
  const minutes = clamp([15, 12, 8, 5][att - 1]! - (fatigue - 1) * 2, 4, 15);
  const memory = a.memory ?? 2;
  const expr = a.expression ?? 2;

  return {
    languageSupport: support,
    intellectualComplexity: clamp(a.knowledge ?? 4, 1, 5),
    maxSentenceWords: [22, 16, 11, 8][support]!,
    ideasPerUtterance: support >= 2 ? 1 : 2,
    optionCount: support >= 2 || memory >= 4 ? 2 : 3,
    repetition: comp >= 4 || a.hearing ? 2 : support >= 1 ? 1 : 0,
    cueEarly: expr >= 3,
    pauseMs: [300, 600, 1000, 1400][support]!,
    sessionMinutes: minutes,
    maxTurns: clamp(Math.round(minutes * (support >= 2 ? 0.8 : 1)), 4, 12),
    largeText: !!a.vision || (a.reading ?? 1) >= 3,
    preferStructured: expr >= 4,
    // Explicit caregiver choice wins; otherwise on when spoken comprehension is often difficult.
    reinforced: a.reinforced ?? comp >= 4,
    voiceRate: [1, 1, 0.92, 0.88][support]!,
  };
}

/** Split a spoken text into short segments: one sentence / one idea at a time. */
export function segment(text: string | null, p: Pick<SessionParams, "ideasPerUtterance" | "maxSentenceWords">): string[] {
  if (!text) return [];
  if (p.ideasPerUtterance > 1) return [text];
  const parts = text.split(/(?<=[.!?…])\s+|(?<=[;:])\s+/).map((t) => t.trim()).filter(Boolean);
  const out: string[] = [];
  for (const part of parts) {
    if (part.split(/\s+/).length <= p.maxSentenceWords) { out.push(part); continue; }
    // Long sentence: cut at a comma near the middle, never inside words.
    const cut = part.split(/,\s+/);
    if (cut.length > 1) out.push(...cut.map((c, i) => (i < cut.length - 1 ? c + "," : c)));
    else out.push(part);
  }
  return out.length ? out : [text];
}

type Row = { kind?: string | null; option_count?: number | null; outcome?: string | null };

/** Knowledge turns are saved with their exercise kind and a real outcome (found alone, with help, answer shown). */
export const KNOWLEDGE_KINDS = new Set(["mcq", "tf", "evoke", "complete", "nommer"]);
/** One row per guided turn: either a neutral discussion row or an evaluated knowledge row. */
export function turnInfo(r: Row): { turn: boolean; shared: boolean; supported: boolean } {
  const k = r.kind ?? "";
  if (k.startsWith("discussion:")) return { turn: true, shared: k.includes(":shared:"), supported: k.endsWith(":supported") };
  if (KNOWLEDGE_KINDS.has(k)) return { turn: true, shared: r.outcome !== "revealed", supported: r.outcome !== "spontaneous" };
  return { turn: false, shared: false, supported: false };
}

/** Summarise recent guided turns and explicit signals ("signal:*" rows). */
export function summariseSignals(rows: Row[]): SignalSummary {
  const recent = rows.slice(0, 120);
  const turns = recent.filter((r) => turnInfo(r).turn);
  const shared = turns.filter((r) => turnInfo(r).shared);
  // Spoken length only from open exchanges (knowledge rows store other counts).
  const words = shared.filter((r) => r.kind?.startsWith("discussion:")).map((r) => r.option_count ?? 0).filter((n) => n > 0);
  return {
    turns: turns.length,
    shared: shared.length,
    repeats: recent.filter((r) => r.kind === "signal:repeat").length,
    notUnderstood: recent.filter((r) => r.kind === "signal:notunderstood").length,
    avgWords: words.length ? words.reduce((x, y) => x + y, 0) / words.length : 0,
  };
}

export const isSignal = (kind?: string | null) => !!kind?.startsWith("signal:");
