// Every sentence the session can read aloud — used once to pre-record the whole bank,
// so the same natural voice is heard everywhere (guests included) with no live synthesis.
import { BANK, type Item } from "./content";
import { SEQ_ITEMS, SEQUENCES } from "./sequences";

const FIXED = [
  "Écoutez cette information.",
  "Voici les réponses possibles.",
  "Réponse 1.", "Réponse 2.", "Réponse 3.", "Réponse 4.", "Réponse 5.",
  "Vrai ou faux ?", "Vrai", "Faux",
  "Voici une formulation possible.",
  "À vous. Répétez la phrase.",
  "À vous. Dites-le avec vos mots.",
  "À vous. Quel serait votre conseil ?",
  "À vous. Quel est votre avis ?",
  "Vous pouvez répondre à voix haute.",
  "À vous. Comment l'expliqueriez-vous ?",
  "À vous de répondre.",
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

export function allVoiceTexts(): string[] {
  const out = new Set<string>(FIXED);
  for (const i of [...BANK, ...SEQ_ITEMS]) for (const t of textsOf(i)) if (t && t.trim()) out.add(t.trim());
  // "We talked about this before" lines read before a reactivated word.
  for (const q of SEQUENCES) for (const w of ["Il y a quelques jours", "La semaine dernière"]) out.add(`${w}, nous avions parlé de ce sujet : ${q.title}.`);
  return [...out];
}
