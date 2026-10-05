// Weekly regularity and daily mini-goal, computed locally from completed sessions.
import { supabase } from "@/integrations/supabase/client";

export type Goal = { id: "minutes" | "oral" | "cases"; label: string; target: number };
const GOALS: Goal[] = [
  { id: "oral", label: "Aujourd'hui : 3 réponses orales", target: 3 },
  { id: "cases", label: "Aujourd'hui : 2 cas pratiques", target: 2 },
  { id: "minutes", label: "Aujourd'hui : 10 minutes", target: 10 },
];
export const todayGoal = (): Goal => GOALS[new Date().getDay() % GOALS.length]!;

export async function weekSummary() {
  const now = new Date();
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const { data } = await supabase.from("practice_sessions").select("started_at, completed_at").gte("started_at", monday.toISOString()).not("completed_at", "is", null);
  const rows = data ?? [];
  const minutes = Math.round(rows.reduce((t, r) => t + Math.min(40, (new Date(r.completed_at!).getTime() - new Date(r.started_at).getTime()) / 60000), 0));
  return { sessions: rows.length, minutes };
}

/** Never punitive: nothing is shown when the week is empty. */
export function weekLine(w: { sessions: number; minutes: number }) {
  if (!w.sessions) return null;
  const s = w.sessions === 1 ? "1 séance cette semaine" : `${w.sessions} séances cette semaine`;
  return w.sessions >= 3 ? `Belle régularité : ${s.replace(" cette semaine", "")}, ${w.minutes} minutes cette semaine.` : `${s}.`;
}
