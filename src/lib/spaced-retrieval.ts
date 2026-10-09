/**
 * Spaced retrieval + errorless learning on personal targets (pure rules, no AI).
 *
 * The caregiver enters a few personal facts (a grandchild's name, the street, the doctor…) as text only —
 * no photos. One target is practised per session: stated, then asked back at growing intervals filled with
 * the other activities. A miss is never left standing: the answer is given at once, then asked again at
 * the last successful interval. Two misses in a row at the start = not learnable today, left for later.
 * Stored in adaptive_profiles.answers.personal (jsonb) — no schema change.
 */
import { confirmText, revealText, type DiscussionTurn } from "./discussion";
import type { PlayItem } from "./builder";

export type PersonalTarget = {
  id: string;
  /** Sentence to retain, said first: "Votre petit-fils s'appelle Jaylen." */
  sentence: string;
  /** Question asked back: "Comment s'appelle votre petit-fils ?" */
  question: string;
  /** Expected word(s): "Jaylen" */
  answer: string;
};

export const MAX_TARGETS = 20;
/** Gaps between trials, counted in activities (~40–60 s each): ≈ 30 s → 1 min → 2 min → 4 min → 7 min. */
export const GAPS = [1, 2, 4, 7] as const;
/** In-session trials beyond the planned activities, so a session never runs much longer. */
export const MAX_EXTRA_TRIALS = 5;
export const SRT_KIND = "srt";
export const srtItemId = (t: Pick<PersonalTarget, "id">) => `p:${t.id}`;

type Row = { item_id: string | null; kind?: string | null; outcome: string; created_at: string; option_count?: number | null };

export type TargetStatus = "new" | "learning" | "paused" | "known";
export type TargetProgress = { status: TargetStatus; sessions: number; bestStep: number; lastAt: number | null };

const DAY = 864e5;

/**
 * Progress per target, from saved trials (kind "srt", option_count = step of the trial: 0 = first ask).
 * "known" once the longest interval was reached in 3 different sessions.
 */
export function targetProgress(target: PersonalTarget, rows: Row[], now = Date.now()): TargetProgress {
  const mine = rows.filter((r) => r.kind === SRT_KIND && r.item_id === srtItemId(target));
  if (!mine.length) return { status: "new", sessions: 0, bestStep: 0, lastAt: null };
  const byDay = new Map<string, Row[]>();
  for (const r of mine) {
    const d = r.created_at.slice(0, 10);
    byDay.set(d, [...(byDay.get(d) ?? []), r]);
  }
  const ok = (r: Row) => r.outcome === "spontaneous";
  const top = GAPS.length; // step reached after the last gap
  const fullDays = [...byDay.values()].filter((rs) => rs.some((r) => ok(r) && (r.option_count ?? 0) >= top)).length;
  const bestStep = Math.max(0, ...mine.filter(ok).map((r) => r.option_count ?? 0));
  const lastAt = Math.max(...mine.map((r) => new Date(r.created_at).getTime()));
  // Paused: the last session ended with two misses at the very first ask.
  const sorted = [...mine].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const lastDay = sorted[sorted.length - 1]!.created_at.slice(0, 10);
  const lastRows = sorted.filter((r) => r.created_at.slice(0, 10) === lastDay);
  const firstTwo = lastRows.slice(0, 2);
  const paused = firstTwo.length === 2 && firstTwo.every((r) => !ok(r) && (r.option_count ?? 0) === 0) && now - lastAt < 3 * DAY;
  if (fullDays >= 3) return { status: "known", sessions: byDay.size, bestStep, lastAt };
  return { status: paused ? "paused" : "learning", sessions: byDay.size, bestStep, lastAt };
}

/**
 * The target for today: one being learned first (least recently practised), else a new one,
 * else a known one due for upkeep (once a week — gains fade fast without practice).
 */
export function pickTarget(targets: PersonalTarget[], rows: Row[], now = Date.now()): { target: PersonalTarget; maintenance: boolean } | null {
  const valid = targets.filter((t) => t.question.trim() && t.answer.trim());
  const info = valid.map((t) => ({ t, p: targetProgress(t, rows, now) }));
  const oldest = (xs: typeof info) => [...xs].sort((a, b) => (a.p.lastAt ?? 0) - (b.p.lastAt ?? 0))[0];
  const learning = oldest(info.filter((x) => x.p.status === "learning"));
  if (learning) return { target: learning.t, maintenance: false };
  const fresh = info.find((x) => x.p.status === "new");
  if (fresh) return { target: fresh.t, maintenance: false };
  const due = oldest(info.filter((x) => x.p.status === "known" && now - (x.p.lastAt ?? 0) > 7 * DAY));
  if (due) return { target: due.t, maintenance: true };
  return null;
}

/**
 * After a trial at `step`: where the next trial goes (activities from now) and at which step.
 * Success → next, longer gap. Miss → answer given, asked again at the last successful gap.
 * Returns null when the target should stop for today.
 */
export function nextTrial(step: number, success: boolean, missesInRow: number): { gap: number; step: number } | null {
  if (success) {
    if (step >= GAPS.length) return null; // longest interval reached: done for today
    return { gap: GAPS[step]!, step: step + 1 };
  }
  if (step === 0 && missesInRow >= 2) return null; // not learnable right now — never push
  const back = Math.max(0, step - 1);
  return { gap: back === 0 ? 1 : GAPS[back - 1]!, step: back };
}

/** All sentences a person's targets can make the app say (allowed for the natural voice). */
export function targetVoiceTexts(t: PersonalTarget): string[] {
  const a = t.answer.trim();
  return [t.sentence.trim(), t.question.trim(), confirmText(a), revealText(a)].filter(Boolean);
}

export function cleanTargets(raw: unknown): PersonalTarget[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is PersonalTarget => !!x && typeof x === "object" && typeof (x as PersonalTarget).question === "string" && typeof (x as PersonalTarget).answer === "string")
    .map((x) => ({
      id: String(x.id || Math.random().toString(36).slice(2, 10)).slice(0, 24),
      sentence: String(x.sentence ?? "").trim().slice(0, 160),
      question: x.question.trim().slice(0, 160),
      answer: x.answer.trim().slice(0, 60),
    }))
    .filter((x) => x.question && x.answer)
    .slice(0, MAX_TARGETS);
}

/** A session turn asking for the target. The first ask of the day states the sentence first (errorless). */
export function srtTurn(t: PersonalTarget, step: number, maintenance = false): DiscussionTurn {
  const item: PlayItem = {
    id: srtItemId(t), kind: "evoke", theme: "expression", topic: "general", skill: "evocation", level: 1,
    audio: t.question, question: null, keyword: null, hint: null, answerText: t.answer, image: null, model: null,
    syllable: null, options: [], correctIndex: -1, stage: null, seqTitle: "Pour vous", recall: null,
  };
  return {
    item,
    intro: step === 0 && !maintenance && t.sentence ? t.sentence : null,
    prompt: t.question,
    model: null,
    image: null,
    options: [],
    phase: "knowledge",
    instruction: "Dites le nom à voix haute.",
    followUp: "",
    answer: t.answer,
    srt: { step, maintenance },
  };
}

/** Where to put the next trial in the turn list (null = no room left in this session). */
export function insertAt(index: number, gap: number, length: number): number | null {
  const pos = index + 1 + gap;
  if (pos <= length) return pos;
  return length - (index + 1) >= 1 ? length : null; // at least one other activity in between
}
