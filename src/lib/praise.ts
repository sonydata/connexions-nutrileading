// Short, adult, varied encouragement. Never "faux", never "erreur".
const POOLS = {
  spontaneous: ["Très juste.", "Bonne analyse.", "Réponse pertinente.", "Très bon raisonnement.", "Belle précision.", "Tout à fait."],
  professional: ["Réflexe de praticien.", "Analyse nutritionnelle pertinente.", "Bonne logique clinique.", "Bonne hiérarchisation.", "Très bonne interprétation."],
  helped: ["C'est cela.", "Bonne démarche.", "Très bien, poursuivons.", "Oui, c'est bien cela."],
  found: ["Vous avez retrouvé le terme.", "Bonne évocation.", "Belle précision."],
  foundAfterCue: ["Oui — vous l'avez retrouvé.", "Bonne évocation.", "Bonne démarche."],
  oral: ["L'idée est là.", "Bonne formulation.", "Bonne mobilisation du langage.", "Réponse pertinente."],
  repeat: ["Bonne formulation.", "Très bien, poursuivons.", "Très bien dit."],
} as const;

let last = "";
export function praise(kind: keyof typeof POOLS) {
  const pool = POOLS[kind].filter((p) => p !== last);
  last = pool[Math.floor(Math.random() * pool.length)] ?? POOLS[kind][0];
  return last;
}

/** Professional-identity praise is kept rare so it stays credible. */
export function praiseChoice(spontaneous: boolean, clinical: boolean) {
  if (!spontaneous) return praise("helped");
  return clinical && Math.random() < 0.3 ? praise("professional") : praise("spontaneous");
}
