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
  { id: "actualite", label: "Actualité", soon: true },
  { id: "nature", label: "Nature" },
  { id: "litterature", label: "Littérature" },
  { id: "technologie", label: "Technologie" },
  { id: "cuisine", label: "Cuisine" },
  { id: "sport", label: "Sport" },
] as { id: string; label: string; soon?: boolean }[];

/** Hafid's personal profile — the default, not a rule of the app. */
export const DEFAULT_INTERESTS = ["sante", "medecine", "sciences", "actualite", "art"];
/** True once interests were explicitly saved (first-launch screen done). */
export const hasInterests = (topics: string[]) => topics.some((t) => t.startsWith("i:"));
export const GUEST_KEY = "connexions.interests";

export const PREFIX = "i:";
export const interestsOf = (topics: string[]) => {
  const xs = topics.filter((t) => t.startsWith(PREFIX)).map((t) => t.slice(PREFIX.length));
  return xs.length ? xs : DEFAULT_INTERESTS;
};
export const otherInterest = (topics: string[]) => interestsOf(topics).find((x) => x.startsWith("autre:"))?.slice(6) ?? "";

