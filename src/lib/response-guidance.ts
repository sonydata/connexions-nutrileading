import type { PlayItem } from "./builder";

/** One concrete action, matched to the current response mode. */
export function responseInstruction(item: Pick<PlayItem, "kind" | "mode" | "audio">): string {
  if (item.kind === "mcq" || item.kind === "tf") return "Touchez la réponse de votre choix.";
  if (item.kind === "complete") return "Dites le mot manquant à voix haute.";
  if (item.kind === "evoke" || item.mode === "nommer") return "Dites le nom à voix haute.";
  if (item.mode === "lire") return "Répétez la phrase à voix haute.";
  if (item.mode === "reformuler") return "À vous. Dites-le avec vos mots.";
  if (/conseil|conseiller|recommand/i.test(item.audio)) return "Donnez votre conseil à voix haute.";
  return "Donnez votre avis à voix haute.";
}

export const RESPONSE_INSTRUCTIONS = [
  "Touchez la réponse de votre choix.",
  "Dites le mot manquant à voix haute.",
  "Dites le nom à voix haute.",
  "Répétez la phrase à voix haute.",
  "À vous. Dites-le avec vos mots.",
  "Donnez votre conseil à voix haute.",
  "Donnez votre avis à voix haute.",
];