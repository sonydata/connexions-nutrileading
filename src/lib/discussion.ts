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
  phase: "exchange" | "knowledge" | "repeat" | "game";
  /** Memory game played inside the session ("Jeux de mémoire" ticked). */
  game?: "paires" | "disparu" | "courses";
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
export const DISCUSSION_INSTRUCTION = "Donnez votre avis à voix haute.";
/** One short, concrete action per kind of turn (shown and said). Wherever possible these are sentences
 * already recorded in the natural voice, so they never fall back to the device voice. */
export const INSTRUCTIONS = {
  choice: "Touchez la réponse de votre choix.",
  truth: "Vrai ou faux ?",
  word: "Touchez votre réponse.",
  missing: "Touchez votre réponse.",
  /** Said BEFORE the sentence to repeat… */
  repeat: "Écoutez, puis répétez la phrase.",
  /** …and this one right after it. */
  repeatNow: "Répétez la phrase à voix haute.",
  opinion: DISCUSSION_INSTRUCTION,
} as const;
export const GAME_INTRO = "Place à un petit jeu de mémoire.";
const GAME_TITLE = { paires: "Les paires", disparu: "L'objet disparu", courses: "La liste de courses" } as const;
/** A memory-game step inside a session: no answer, nothing evaluated, Continuer when you like. */
export function gameTurn(game: "paires" | "disparu" | "courses"): DiscussionTurn {
  const item: PlayItem = {
    id: `jeu-${game}`, kind: "oral", mode: "jeu", theme: "expression", topic: "general", skill: "expression", level: 1,
    audio: GAME_INTRO, question: null, keyword: null, hint: null, answerText: null, image: null, model: null,
    syllable: null, options: [], correctIndex: -1, stage: null, seqTitle: `Jeu de mémoire · ${GAME_TITLE[game]}`, recall: null, drop: 0,
  };
  return { item, intro: null, prompt: GAME_INTRO, model: null, image: null, options: [], phase: "game", game, instruction: GAME_INTRO, followUp: "", answer: null };
}
/** Praise said aloud after a right answer (pre-recorded sentences). */
export const PRAISE = ["Très juste.", "Tout à fait.", "C'est cela."];
/** How a knowledge turn ends: what is said (each a whole recorded-friendly sentence) and what is shown. */
export function closing(answer: string, found: boolean, praise = PRAISE[0]!): { say: string[]; show: string } {
  const tf = answer === "Vrai" || answer === "Faux";
  if (found) return tf ? { say: [praise, "Oui, c'est bien cela."], show: `${praise} C'est ${answer.toLowerCase()}.` } : { say: [praise, confirmText(answer)], show: `${praise} ${confirmText(answer)}` };
  return tf ? { say: ["Voici la réponse.", answer], show: `Voici la réponse : ${answer.toLowerCase()}.` } : { say: [revealText(answer)], show: revealText(answer) };
}
export const DEVELOP = "Pourquoi, selon vous ?";
/** Said after a knowledge turn — the target is always heard, gently, whatever happened. */
export const confirmText = (answer: string) => `Oui, c'est bien cela : ${answer}.`;
export const revealText = (answer: string) => `La réponse : ${answer}.`;
/** Reinforced support: one short, concrete instruction. */
export const REINFORCED_INSTRUCTIONS = ["Touchez votre réponse.", "À vous de parler.", "Écoutez, puis répétez la phrase.", "Répétez la phrase à voix haute."];

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
  const out = new Set([GAME_INTRO, DEVELOP, DISCUSSION_INSTRUCTION, ...REINFORCED_INSTRUCTIONS, ...Object.values(INSTRUCTIONS), ...PRAISE, "Oui, c'est bien cela.", "Voici la réponse.", "Voici un indice.", ...Object.values(OPENINGS)]);
  for (const mode of ["conversation", "regard"] as const)
    for (const turn of discussionTurns(items, mode)) {
      for (const text of [turn.intro, turn.prompt, turn.model, turn.instruction, turn.followUp])
        if (text) out.add(text);
      if (turn.answer) for (const f of [true, false]) for (const t of closing(turn.answer, f).say) out.add(t);
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

const flat = (t: string) => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
/** True when a cue would simply say the answer (or most of it). */
export function revealsAnswer(cue: string | null | undefined, answer: string | null | undefined): boolean {
  if (!cue || !answer) return false;
  const c = ` ${flat(cue)} `;
  const a = flat(answer);
  if (!a) return false;
  if (c.includes(` ${a} `)) return true;
  const words = a.split(" ").filter((w) => w.length >= 4);
  return words.length > 0 && words.every((w) => c.includes(` ${w} `));
}

export type TurnHint = { caption: string | null; image: string | null; remove: number | null };
/** A real hint — never the answer: a meaning cue, the first sound of the word, or one wrong choice taken away. */
export function hintFor(turn: DiscussionTurn): TurnHint | null {
  if (turn.phase === "repeat") return null;
  const item = turn.item;
  const v = visualHintFor(item);
  const answer = turn.answer;
  const safe = (t: string | null | undefined) => (t && !revealsAnswer(t, answer) && !/^Une piste/.test(t) && !/Un proverbe bien connu/.test(t) ? t : null);
  const word = item.kind === "evoke" || item.kind === "complete" || item.mode === "nommer";
  // A wrong choice to take away — only when at least two choices remain afterwards.
  const wrong = turn.options.map((o, n) => (o.label !== answer ? n : -1)).filter((n) => n >= 0);
  const remove = turn.options.length >= 3 && wrong.length ? wrong[Math.floor(Math.random() * wrong.length)]! : null;
  // A picture only when it is a cue for a word (curated "hint-…" images), never a picture of the answer.
  const image = word && v.image && v.image !== item.image && !revealsAnswer(v.alt, answer) ? v.image : null;
  let caption = safe(item.hint) ?? safe(v.caption);
  if (word && item.syllable && answer) caption = caption ? `${caption} Le mot commence par « ${item.syllable} »` : `Le mot commence par « ${item.syllable} »`;
  if (!turn.answer) caption = safe(v.caption);
  if (!caption && remove === null && !image) return null;
  return { caption, image, remove };
}
