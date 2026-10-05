// Interests = the SUBJECTS used to carry exercises. Skills (what is exercised) stay
// on each item (`skill`), independent of the subject (`theme`).
// Stored inside caregiver_settings.topics with an "i:" prefix — no schema change.

export const INTERESTS = [
  { id: "sante", label: "Santé & nutrition" },
  { id: "medecine", label: "Médecine" },
  { id: "sciences", label: "Sciences" },
  { id: "histoire", label: "Histoire" },
  { id: "art", label: "Art & culture" },
  { id: "geographie", label: "Géographie & voyages" },
  { id: "actualite", label: "Actualité" },
  { id: "nature", label: "Nature" },
  { id: "litterature", label: "Littérature" },
  { id: "technologie", label: "Technologie" },
  { id: "cuisine", label: "Cuisine" },
  { id: "sport", label: "Sport" },
] as const;

/** Hafid's personal profile — the default, not a rule of the app. */
export const DEFAULT_INTERESTS = ["sante", "medecine", "sciences", "actualite", "art"];

export const PREFIX = "i:";
export const interestsOf = (topics: string[]) => {
  const xs = topics.filter((t) => t.startsWith(PREFIX)).map((t) => t.slice(PREFIX.length));
  return xs.length ? xs : DEFAULT_INTERESTS;
};
export const otherInterest = (topics: string[]) => interestsOf(topics).find((x) => x.startsWith("autre:"))?.slice(6) ?? "";

/** Map chosen subjects onto the bank's current content themes. */
export function themesFor(topics: string[]): string[] {
  const chosen = new Set(interestsOf(topics));
  const has = (...ids: string[]) => ids.some((i) => chosen.has(i));
  const themes = new Set<string>(["temps", "expression"]);
  if (has("sante", "medecine", "cuisine")) themes.add("nutrition");
  if (has("sante", "medecine")) themes.add("avis");
  if (has("sciences", "histoire", "art", "geographie", "nature", "litterature", "technologie", "sport", "actualite")) themes.add("sciences");
  if (themes.size === 2) themes.add("sciences");
  const caregiver = topics.filter((t) => !t.startsWith(PREFIX));
  const both = [...themes].filter((t) => caregiver.includes(t));
  return both.length ? both : [...themes];
}
