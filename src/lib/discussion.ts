import type { PlayItem } from "./builder";
import { SEQ_BY_ID } from "./sequences";
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
export const DEVELOP = "Pourquoi, selon vous ?";

/** Local presentation only: no interpretation of the person's answer. */
export function discussionTurns(items: PlayItem[], mode: SessionMode): DiscussionTurn[] {
  const selected = [...items];
  // Shorten repeated formulation steps first, preserving temporal references and spaced recall.
  while (selected.length > 12) {
    const removable = selected.findIndex((item) => item.stage === "reformuler" && !item.recall);
    if (removable < 0) break;
    selected.splice(removable, 1);
  }
  return selected.slice(0, 12).map((item) => {
    const seqId = item.id.match(/^(sq-[a-z]+)-[cref]$/)?.[1];
    const sequence = seqId ? SEQ_BY_ID.get(seqId) : undefined;
    const hint = visualHintFor(item);
    const choice = item.kind === "mcq" || item.kind === "tf";
    const answer = item.options[item.correctIndex]?.label;
    const repeat = item.mode === "lire" || item.stage === "reformuler";
    const opening = OPENINGS[item.topic] ?? OPENINGS["general"] ?? DEVELOP;
    let intro: string | null = null;
    let prompt = item.audio;
    let model = item.kind === "tf" ? visualHintFor(item).caption : item.model ?? item.answerText ?? answer ?? item.audio;
    if (mode === "conversation") {
      if (item.stage === "comprendre") intro = item.audio;
      else if (choice && item.topic === "actualite")
        intro = presentReference(item.id, answer ?? "");
      else if (choice) intro = item.question ? item.audio : model;
      else if (item.stage === "retrouver") intro = item.model;
      prompt = repeat ? item.audio : item.stage === "exprimer" ? item.audio : opening;
      if (item.stage === "comprendre" && sequence) model = sequence.items[2].model ?? model;
    } else if (item.kind === "tf") {
      intro = model;
      prompt = opening;
    } else if (choice) {
      intro = item.question ? item.audio : null;
      prompt = item.question ?? item.audio;
    }
    return {
      item,
      intro,
      prompt,
      model,
      image: item.image ?? hint.image,
      options: mode === "regard" && item.kind === "mcq" ? item.options : [],
      phase: repeat
        ? "repeat"
        : mode === "regard" && (choice || item.kind === "evoke" || item.kind === "complete")
          ? "knowledge"
          : "exchange",
      instruction: repeat
        ? "Répétez la phrase à voix haute."
        : mode === "regard" && (item.kind === "evoke" || item.mode === "nommer")
          ? "Dites le nom à voix haute."
          : item.kind === "complete" && mode === "regard"
            ? "Dites le mot manquant à voix haute."
            : DISCUSSION_INSTRUCTION,
      followUp: item.stage === "comprendre" || item.stage === "retrouver"
        ? sequence?.items[2].steps[0] ?? DEVELOP
        : FOLLOW_UPS[item.topic] ?? DEVELOP,
    };
  });
}

function presentReference(id: string, answer: string): string {
  const references: Record<string, string> = {
    "rp-fr-pres": `Le président de la France est ${answer}.`,
    "rp-us-pres": `Le président des États-Unis est ${answer}.`,
    "rp-year": `Nous sommes en ${answer}.`,
    "rp-month": `Nous sommes en ${answer}.`,
    "rp-season": `La saison actuelle en France est ${answer}.`,
    "rp-euro": "En France, on paie en euros.",
    "rp-jo": "Paris a accueilli les Jeux olympiques de 2024.",
  };
  return references[id] ?? answer;
}

export function discussionVoiceTexts(items: PlayItem[]): string[] {
  const out = new Set([DEVELOP, ...Object.values(OPENINGS)]);
  for (const mode of ["conversation", "regard"] as const)
    for (const turn of discussionTurns(items, mode)) {
      for (const text of [turn.intro, turn.prompt, turn.model, turn.instruction, turn.followUp])
        if (text) out.add(text);
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
