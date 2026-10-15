// Weekly regularity and daily mini-goal, computed locally from completed sessions.
import { supabase } from "@/integrations/supabase/client";
import { topicOfId } from "./builder";
import { INTERESTS } from "./interests";

export type Goal = { id: "minutes" | "oral" | "cases"; label: string; target: number };
const GOALS: Goal[] = [
  { id: "oral", label: "Aujourd'hui : 3 réponses orales", target: 3 },
  { id: "cases", label: "Aujourd'hui : 2 cas pratiques", target: 2 },
  { id: "minutes", label: "Aujourd'hui : 10 minutes", target: 10 },
];
export const todayGoal = (): Goal => GOALS[new Date().getDay() % GOALS.length]!;

export type Week = { sessions: number; minutes: number; days: number; found: number; repeated: number; spoken: number; topics: string[]; away: boolean };

const KNOWLEDGE = new Set(["mcq", "tf", "evoke", "complete", "nommer"]);

/** The person's own week: counts only, always positive — never a percentage or a missed day. */
export async function weekSummary(): Promise<Week> {
  const now = new Date();
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const [s, a, last] = await Promise.all([
    supabase.from("practice_sessions").select("started_at, completed_at").gte("started_at", monday.toISOString()).not("completed_at", "is", null),
    supabase.from("attempts").select("item_id, kind, outcome, option_count").gte("created_at", monday.toISOString()),
    supabase.from("practice_sessions").select("started_at").lt("started_at", today.toISOString()).not("completed_at", "is", null).order("started_at", { ascending: false }).limit(1),
  ]);
  const rows = s.data ?? [];
  const att = a.data ?? [];
  const minutes = Math.round(rows.reduce((t, r) => t + Math.min(40, (new Date(r.completed_at!).getTime() - new Date(r.started_at).getTime()) / 60000), 0));
  const days = new Set(rows.map((r) => r.started_at.slice(0, 10))).size;
  // Answers found (by touch or aloud), sentences repeated, opinions shared aloud.
  const found = att.filter((x) => KNOWLEDGE.has(x.kind ?? "") && x.outcome !== "revealed").length;
  const repeated = att.filter((x) => x.kind?.startsWith("discussion:guided:repeat:shared")).length;
  const spoken = att.filter((x) => x.kind?.startsWith("discussion:guided:exchange:shared")).length;
  const count = new Map<string, number>();
  for (const x of att) {
    const t = topicOfId(x.item_id);
    if (t && t !== "general") count.set(t, (count.get(t) ?? 0) + 1);
  }
  const topics = [...count].sort((x, y) => y[1] - x[1]).map(([t]) => INTERESTS.find((i) => i.id === t)?.label ?? t);
  const prev = last.data?.[0]?.started_at;
  // "Heureux de vous retrouver" after 3+ days away — never a word about missed days.
  const away = !!prev && today.getTime() - new Date(prev).getTime() > 3 * 864e5 && !rows.some((r) => new Date(r.started_at) >= today);
  return { sessions: rows.length, minutes, days, found, repeated, spoken, topics, away };
}

/** One positive sentence, chosen by rule. */
export function weekPhrase(w: Week) {
  if (w.days >= 4) return "Belle régularité cette semaine.";
  if (w.repeated + w.spoken >= 6) return "Vous avez beaucoup pris la parole cette semaine.";
  if (w.topics.length >= 3) return "Une semaine riche en découvertes.";
  if (w.sessions >= 2) return "Votre participation reste très constante.";
  return "Chaque séance compte.";
}

/** Never punitive: nothing is shown when the week is empty. */
export function weekLine(w: { sessions: number; minutes: number }) {
  if (!w.sessions) return null;
  const s = w.sessions === 1 ? "1 séance cette semaine" : `${w.sessions} séances cette semaine`;
  return w.sessions >= 3 ? `Belle régularité : ${s.replace(" cette semaine", "")}, ${w.minutes} minutes cette semaine.` : `${s}.`;
}
