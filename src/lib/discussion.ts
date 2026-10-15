import type { PlayItem } from "./builder";
import { visualHintFor } from "./visual-hints";

export type SessionMode = "conversation" | "regard";
export type DiscussionTurn = {
  item: PlayItem;
  intro: string | null;
  prompt: string;
  model: string | null;
  image: string | null;
  options: PlayItem["options"];
  phase: "exchange" | "knowledge" | "repeat";
  instruction: string;
  followUp: string;
  /** Expected answer of a knowledge turn (choice, word to find); null for opinions. Always said aloud at the end. */
  answer: string | null;
  /** Spaced-retrieval trial on a personal target: its step (0 = first ask) and whether it is weekly upkeep. */
  srt?: { step: number; maintenance: boolean };
};
export const OPENINGS: Record<string, string> = {
  art: "Qu'est-ce qui vous plaît dans cette œuvre ?",
  sante: "Qu'aimez-vous dans cette façon de prendre soin de soi ?",
  medecine: "Qu'est-ce qui vous paraît important dans cette situation ?",
  sciences: "Qu'est-ce qui vous intéresse dans cette découverte ?",
  histoire: "Qu'est-ce qui vous frappe dans cette histoire ?",
  geographie: "Qu'aimeriez-vous découvrir dans ce lieu ?",
  nature: "Qu'aimez-vous observer dans la nature ?",
  litterature: "Qu'est-ce qui vous donne envie de lire ?",
  technologie: "Qu'est-ce que cette invention change dans la vie ?",
  cuisine: "Quelles saveurs aimez-vous partager ?",
  sport: "Qu'aimez-vous dans cette activité ?",
  actualite: "Qu'est-ce que ce repère vous évoque ?",
  general: "Qu'est-ce qui vous aide à organiser votre journée ?",
};
export const DISCUSSION_INSTRUCTION = "Dites ce que vous en pensez.";
/** One short, concrete action per kind of turn (shown and said). */
export const INSTRUCTIONS = {
  choice: "Touchez la bonne réponse.",
  truth: "Touchez Vrai ou Faux.",
  word: "Touchez le bon mot.",
  missing: "Touchez le mot qui manque.",
  repeat: "Écoutez, puis répétez la phrase.",
  opinion: DISCUSSION_INSTRUCTION,
} as const;
export const DEVELOP = "Pourquoi, selon vous ?";
/** Said after a knowledge turn — the target is always heard, gently, whatever happened. */
export const confirmText = (answer: string) =>
  answer === "Vrai" ? "Oui, c'est vrai." : answer === "Faux" ? "Oui, c'est faux." : `Oui, c'est bien cela : ${answer}.`;
export const revealText = (answer: string) =>
  answer === "Vrai" ? "En fait, c'est vrai." : answer === "Faux" ? "En fait, c'est faux." : `La réponse : ${answer}.`;
/** Reinforced support: one short, concrete instruction. */
export const REINFORCED_INSTRUCTIONS = ["Touchez votre réponse.", "À vous de parler.", "Écoutez, puis répétez la phrase."];

/** Expected answer of an item, when it has one (choice question, word to find, name to say). */
export function answerOf(item: PlayItem): string | null {
  if (item.kind === "mcq" || item.kind === "tf") return item.options[item.correctIndex]?.label ?? null;
  if (item.kind === "evoke" || item.kind === "complete" || (item.kind === "oral" && item.mode === "nommer")) return item.answerText;
  return null;
}

/** Local presentation only: no interpretation of the person's answer.
 * `limit` shortens the session by removing the highest `drop` first (opinions, extras), never core steps. */
export function discussionTurns(items: PlayItem[], mode: SessionMode, limit = 12): DiscussionTurn[] {
  const selected = [...items];
  while (selected.length > limit) {
    const top = Math.max(...selected.map((i) => i.drop ?? 0));
    if (top <= 0) break;
    const at = selected.map((i) => i.drop ?? 0).lastIndexOf(top);
    selected.splice(at, 1);
  }
  return selected.slice(0, limit).map((item) => {
    const hint = visualHintFor(item);
    const choice = item.kind === "mcq" || item.kind === "tf";
    const word = item.kind === "evoke" || item.kind === "complete" || item.mode === "nommer";
    const repeat = item.mode === "lire" || item.stage === "reformuler";
    const knowledge = mode === "regard" && !repeat && (choice || word);
    let intro: string | null = null;
    let prompt = item.audio;
    let model = item.model ?? item.answerText ?? item.options[item.correctIndex]?.label ?? item.audio;
    if (item.kind === "tf") {
      prompt = item.audio;
      intro = null;
    } else if (choice) {
      // The item's own question, asked once: context (if any) then the question itself.
      intro = item.question && item.question !== item.audio ? item.audio : null;
      prompt = item.question ?? item.audio;
    }
    // A sentence to repeat is shown and heard as is — the "model" is the same sentence, never a paraphrase.
    if (repeat) model = item.audio;
    const answer = knowledge ? answerOf(item) : null;
    return {
      item,
      intro: intro && intro !== prompt ? intro : null,
      prompt,
      model,
      image: item.image ?? hint.image,
      options: knowledge ? item.options : [],
      phase: repeat ? "repeat" : knowledge ? "knowledge" : "exchange",
      answer,
      instruction: repeat
        ? INSTRUCTIONS.repeat
        : !knowledge
          ? INSTRUCTIONS.opinion
          : item.kind === "tf"
            ? INSTRUCTIONS.truth
            : item.kind === "complete"
              ? INSTRUCTIONS.missing
              : word
                ? INSTRUCTIONS.word
                : INSTRUCTIONS.choice,
      followUp:
        REF_FOLLOW_UPS[item.id] ??
        (repeat
          ? "Voulez-vous ajouter quelque chose ?"
          : item.kind === "evoke" || item.kind === "complete"
            ? "Que savez-vous d'autre à ce sujet ?"
            : item.kind === "oral"
              ? DEVELOP
              : FOLLOW_UPS[item.topic] ?? DEVELOP),
    };
  });
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Specific, adult follow-ups for "Repères du moment" — never a second quiz question. */
const REF_FOLLOW_UPS: Record<string, string> = {
  "rp-fr-pres": "Où travaille le président de la France ?",
  "rp-us-pres": "Dans quelle ville travaille-t-il ?",
  "rp-year": "Quel moment de l'année préférez-vous ?",
  "rp-month": "Qu'aimez-vous manger à cette période ?",
  "rp-season": "Quels fruits et légumes trouve-t-on en cette saison ?",
  "rp-euro": "Vous souvenez-vous du passage du franc à l'euro ?",
  "rp-jo": "Quel sport aimez-vous regarder ?",
};

export function discussionVoiceTexts(items: PlayItem[]): string[] {
  const out = new Set([DEVELOP, DISCUSSION_INSTRUCTION, ...REINFORCED_INSTRUCTIONS, ...Object.values(INSTRUCTIONS), ...Object.values(OPENINGS)]);
  for (const mode of ["conversation", "regard"] as const)
    for (const turn of discussionTurns(items, mode)) {
      for (const text of [turn.intro, turn.prompt, turn.model, turn.instruction, turn.followUp])
        if (text) out.add(text);
      if (turn.answer) {
        out.add(confirmText(turn.answer));
        out.add(revealText(turn.answer));
      }
      for (const o of turn.options) out.add(o.label);
    }
  return [...out];
}

const FOLLOW_UPS: Record<string, string> = {
  sante: "Quel conseil donneriez-vous au quotidien ?",
  medecine: "Que voudriez-vous expliquer à un patient ?",
  sciences: "Qu'aimeriez-vous mieux comprendre ?",
  histoire: "Quel lien voyez-vous avec notre époque ?",
  art: "Quel détail attire votre regard ?",
  geographie: "Qu'aimeriez-vous y observer ?",
  nature: "Comment préserver ce qui vous plaît ici ?",
  litterature: "Qu'aimeriez-vous partager de cette lecture ?",
  technologie: "Qu'est-ce qui vous semble utile ?",
  cuisine: "Avec qui aimeriez-vous partager ce plat ?",
  sport: "Qu'est-ce qui vous donne envie de bouger ?",
  actualite: "Qu'aimeriez-vous évoquer à ce sujet ?",
  general: "Quelle habitude vous convient le mieux ?",
};
