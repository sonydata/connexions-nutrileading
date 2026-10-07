// Every sentence the session can read aloud — used once to pre-record the whole bank,
// so the same natural voice is heard everywhere (guests included) with no live synthesis.
import { BANK, BY_ID, type Item } from "./content";
import { SEQ_ITEMS, SEQUENCES } from "./sequences";
import { RESPONSE_INSTRUCTIONS } from "./response-guidance";
import { discussionVoiceTexts } from "./discussion";
import { toPlay } from "./builder";

const FIXED = [
  "Écoutez cette information.",
  ...RESPONSE_INSTRUCTIONS,
  "Vrai ou faux ?", "Vrai", "Faux",
  "Voici une formulation possible.",
  "L'idée est là.", "Bonne formulation.", "Bonne mobilisation du langage.", "Réponse pertinente.",
  // Encouragements (dits à voix haute après chaque réponse)
  "Très juste.", "Bonne analyse.", "Très bon raisonnement.", "Belle précision.", "Tout à fait.",
  "Réflexe de praticien.", "Analyse nutritionnelle pertinente.", "Bonne logique clinique.", "Bonne hiérarchisation.", "Très bonne interprétation.",
  "C'est cela.", "Bonne démarche.", "Très bien, poursuivons.", "Oui, c'est bien cela.",
  "Vous avez retrouvé le terme.", "Bonne évocation.", "Oui — vous l'avez retrouvé.", "Très bien dit.",
  "Écoutons encore.", "Voici un indice.", "Voici la réponse.", "Regardons cela autrement.",
];

const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

function textsOf(i: Item): (string | undefined)[] {
  switch (i.kind) {
    case "mcq":
      return [i.audio, i.audioShort, i.question, i.answer.label, ...i.distractors.map((d) => d.label)];
    case "tf":
      return [i.audio];
    case "complete":
      return [i.audio, i.hint, i.answer, i.audio.replace(/…$/, i.answer + ".")];
    case "evoke":
      return [i.audio, i.hint, i.answer, i.model];
    case "oral":
      return [...i.steps, i.hint, i.model, i.answer, i.answer ? cap(i.answer) + "." : undefined];
  }
}

/** Sentences of specific bank items — used to re-record only what changed. */
export function voiceTextsFor(ids: string[]): string[] {
  const out = new Set<string>();
  for (const id of ids) {
    const i = BY_ID.get(id) ?? SEQ_ITEMS.find((item) => item.id === id);
    if (!i) continue;
    for (const t of textsOf(i)) if (t && t.trim()) out.add(t.trim());
  }
  return [...out];
}

export function allVoiceTexts(): string[] {
  const out = new Set<string>(FIXED);
  for (const i of [...BANK, ...SEQ_ITEMS]) for (const t of textsOf(i)) if (t && t.trim()) out.add(t.trim());
  const items = [...BANK, ...SEQ_ITEMS].map((item) => toPlay(item, 1));
  for (let n = 0; n < items.length; n += 12) for (const text of discussionVoiceTexts(items.slice(n, n + 12))) out.add(text);
  // "We talked about this before" lines read before a reactivated word.
  for (const q of SEQUENCES) for (const w of ["Il y a quelques jours", "La semaine dernière"]) out.add(`${w}, nous avions parlé de ce sujet : ${q.title}.`);
  return [...out];
}
