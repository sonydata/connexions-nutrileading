/**
 * One sober colour per kind of activity — identity, never a score and never a level.
 * Class names are written out in full so Tailwind can see them.
 */
export type Accent = {
  /** small dot / filled chip */
  solid: string;
  /** label or highlighted text */
  text: string;
  /** light surface behind a card or a block */
  soft: string;
  /** ring used while a line is being read aloud */
  ring: string;
  /** thin rule or progress bar */
  bar: string;
};

export const ACCENTS = {
  comprendre: { solid: "bg-u-comprendre", text: "text-u-comprendre", soft: "bg-u-comprendre-soft", ring: "ring-u-comprendre/45", bar: "bg-u-comprendre" },
  retrouver: { solid: "bg-u-retrouver", text: "text-u-retrouver", soft: "bg-u-retrouver-soft", ring: "ring-u-retrouver/45", bar: "bg-u-retrouver" },
  exprimer: { solid: "bg-u-exprimer", text: "text-u-exprimer", soft: "bg-u-exprimer-soft", ring: "ring-u-exprimer/45", bar: "bg-u-exprimer" },
  reformuler: { solid: "bg-u-reformuler", text: "text-u-reformuler", soft: "bg-u-reformuler-soft", ring: "ring-u-reformuler/45", bar: "bg-u-reformuler" },
  temps: { solid: "bg-u-temps", text: "text-u-temps", soft: "bg-u-temps-soft", ring: "ring-u-temps/45", bar: "bg-u-temps" },
} satisfies Record<string, Accent>;

export type AccentKey = keyof typeof ACCENTS;

/** Which colour a step wears: its place in the sequence, else its nature. */
export function accentOf(step: { stage?: string | null; skill?: string | null }): Accent {
  if (step.stage && step.stage in ACCENTS) return ACCENTS[step.stage as AccentKey];
  if (step.skill === "temps") return ACCENTS.temps;
  if (step.skill === "evocation" || step.skill === "completion" || step.skill === "lexique") return ACCENTS.retrouver;
  if (step.skill === "expression" || step.skill === "elocution" || step.skill === "conseil") return ACCENTS.exprimer;
  return ACCENTS.comprendre;
}

/** The three pillars on the home page, each in its own colour. */
export const PILLARS: Record<string, Accent> = {
  Comprendre: ACCENTS.comprendre,
  Retrouver: ACCENTS.retrouver,
  "S'exprimer": ACCENTS.exprimer,
};

/** Collections cycle through the palette so each one reads differently. */
export const COLLECTION_CYCLE: Accent[] = [ACCENTS.comprendre, ACCENTS.retrouver, ACCENTS.exprimer, ACCENTS.reformuler, ACCENTS.temps];
