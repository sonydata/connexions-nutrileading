// Weekly regularity and daily mini-goal, computed locally from completed sessions.
import { supabase } from "@/integrations/supabase/client";
import { topicOfId } from "./builder";
import { exploredSeqs } from "./sequences";

export type Goal = { id: "minutes" | "oral" | "cases"; label: string; target: number };
const GOALS: Goal[] = [
  { id: "oral", label: "Aujourd'hui : 3 réponses orales", target: 3 },
  { id: "cases", label: "Aujourd'hui : 2 cas pratiques", target: 2 },
  { id: "minutes", label: "Aujourd'hui : 10 minutes", target: 10 },
];
export const todayGoal = (): Goal => GOALS[new Date().getDay() % GOALS.length]!;

export type Week = { sessions: number; minutes: number; days: number; oral: number; found: number; topics: number; away: boolean; explored: string[] };

export async function weekSummary(): Promise<Week> {
  const now = new Date();
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const [s, a, last, seqs] = await Promise.all([
    supabase.from("practice_sessions").select("started_at, completed_at").gte("started_at", monday.toISOString()).not("completed_at", "is", null),
    supabase.from("attempts").select("item_id, kind, outcome, option_count").gte("created_at", monday.toISOString()),
    supabase.from("practice_sessions").select("started_at").lt("started_at", today.toISOString()).not("completed_at", "is", null).order("started_at", { ascending: false }).limit(1),
    supabase.from("attempts").select("item_id").like("item_id", "%-c").limit(1000),
  ]);
  const rows = s.data ?? [];
  const att = a.data ?? [];
  const minutes = Math.round(rows.reduce((t, r) => t + Math.min(40, (new Date(r.completed_at!).getTime() - new Date(r.started_at).getTime()) / 60000), 0));
  const days = new Set(rows.map((r) => r.started_at.slice(0, 10))).size;
  const ORAL = new Set(["expliquer", "lire", "reformuler", "nommer"]);
  const oral = att.filter((x) => ORAL.has(x.kind ?? "") && (x.option_count ?? 0) > 0).length;
  const found = att.filter((x) => (x.kind === "evoke" || x.kind === "complete") && x.outcome !== "revealed").length;
  const topics = new Set(att.map((x) => topicOfId(x.item_id)).filter((t) => t && t !== "general")).size;
  const prev = last.data?.[0]?.started_at;
  // "Heureux de vous retrouver" after 3+ days away — never a word about missed days.
  const away = !!prev && today.getTime() - new Date(prev).getTime() > 3 * 864e5 && !rows.some((r) => new Date(r.started_at) >= today);
  return { sessions: rows.length, minutes, days, oral, found, topics, away, explored: [...exploredSeqs((seqs.data ?? []).map((x) => x.item_id))] };
}

/** One positive sentence, chosen by rule. */
export function weekPhrase(w: Week) {
  if (w.oral >= 6) return "Vous avez particulièrement mobilisé votre expression cette semaine.";
  if (w.days >= 4) return "Belle régularité.";
  if (w.sessions >= 2) return "Votre participation reste très constante.";
  return "Chaque séance compte.";
}

/** Never punitive: nothing is shown when the week is empty. */
export function weekLine(w: { sessions: number; minutes: number }) {
  if (!w.sessions) return null;
  const s = w.sessions === 1 ? "1 séance cette semaine" : `${w.sessions} séances cette semaine`;
  return w.sessions >= 3 ? `Belle régularité : ${s.replace(" cette semaine", "")}, ${w.minutes} minutes cette semaine.` : `${s}.`;
}
