// Personalised pictures: one per question (or per theme), generated once from the question's own
// text with Lovable AI and kept in the public "pictures" bucket. Browser-safe.
// A picture shows the situation being talked about — never the answer, no text, no real person.
import { BANK, completeModel, type Item } from "./content";
import { SEQUENCES } from "./sequences";

export type PictureJob = { key: string; subject: string; avoid: string | null };

/** Which picture a session step shows: the theme picture for a path's steps, its own for "find the word". */
export function pictureKey(id: string): string | null {
  const m = id.match(/^(sq-[a-z0-9]+)-([cref])$/);
  if (m) return m[2] === "r" ? id : m[1]!;
  if (BANK.some((i) => i.id === id)) return id;
  return null;
}

function subjectOf(i: Item): { subject: string; avoid: string | null } {
  switch (i.kind) {
    case "mcq":
      return { subject: [i.audio, i.question].filter(Boolean).join(" "), avoid: i.answer.label };
    case "tf":
      return { subject: i.audio, avoid: null };
    case "evoke":
      return { subject: i.audio, avoid: i.answer };
    case "complete":
      return { subject: i.topic === "general" ? `le proverbe « ${completeModel(i.audio, i.answer)} » (illustrer seulement le début de la phrase)` : i.audio, avoid: i.answer };
    case "oral":
      return { subject: i.steps[i.steps.length - 1] ?? "", avoid: i.mode === "nommer" ? (i.answer ?? null) : null };
  }
}

/** Every picture the sessions can show. */
export function pictureJobs(): PictureJob[] {
  const jobs: PictureJob[] = [];
  for (const s of SEQUENCES) {
    const [c, r] = s.items;
    jobs.push({ key: s.id, subject: `${s.title} — ${c.audio}`, avoid: c.answer.label });
    jobs.push({ key: r.id, subject: `${s.title} — ${r.audio}`, avoid: r.answer });
  }
  for (const i of BANK) {
    if (i.kind === "oral" && i.mode === "nommer") continue; // "Quel est cet aliment ?": its photo IS the question
    jobs.push({ key: i.id, ...subjectOf(i) });
  }
  return jobs;
}

/** The description sent to the image model. */
export function picturePrompt(j: PictureJob): string {
  return [
    "Photographie réaliste, chaleureuse et lumineuse, au cadrage simple et très lisible sur une tablette, pour un adulte âgé.",
    `Elle illustre précisément ce sujet : « ${j.subject} ».`,
    j.avoid ? `Elle ne doit ni montrer ni suggérer la réponse attendue (« ${j.avoid} ») : montrer le contexte, pas la solution.` : "",
    "Aucun texte, aucune lettre, aucun chiffre, aucun logo. Aucune personne réelle reconnaissable ; si des personnes apparaissent, de dos ou de loin.",
    "Format paysage.",
  ].filter(Boolean).join(" ");
}

export const PICTURES_BUCKET = "pictures";
/** Public address of a generated picture (it may not exist yet: the page then falls back). */
export function pictureUrl(key: string): string | null {
  const base = (import.meta.env?.["VITE_SUPABASE_URL"] as string | undefined) ?? "";
  return base ? `${base}/storage/v1/object/public/${PICTURES_BUCKET}/${key}` : null;
}
