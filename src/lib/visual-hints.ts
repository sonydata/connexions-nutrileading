import { imageSrc, LIBRARY } from "./library";
import { BY_ID, SCENE } from "./content";
import { SEQ_ITEMS } from "./sequences";

/** Explicit subject cues, never a random photo from an interest. */
const HINTS: Record<string, string> = {};
function assign(image: string, ids: string) {
  for (const id of ids.split(" ")) HINTS[id] = image;
}
assign("salmon", "k-fattyfish e-fish f-fish l-salmon");
assign("legumes", "k-legumes v-fibres v-legum e-fibres f-fibres sq-mediterranee-r");
assign("hint-tension", "k-salt v-hta e-salt sq-tension-r");
assign("sq-sarcopenie", "k-protein v-sarco e-prot e-muscle");
assign("sq-microbiote", "k-fibres v-microb sq-microbiote-r sq-microbiote-f");
assign("hint-skeleton", "k-calcium");
assign("orange", "k-citrus v-antiox");
assign("sq-diabete", "v-glyc v-diab");
assign("hint-pancreas", "v-insul sq-diabete-r");
assign("hint-artery", "v-chol med-ev-arterio");
assign("water", "v-hydra e-water");
assign("hint-weight", "v-denut");
assign("eggs", "v-prot e-protage f-protein");
assign("vegetables", "v-micronut e-veg");
assign("yogurt", "v-calc sq-microbiote-e");
assign("olive_oil", "l-olive f-olive sq-mediterranee-f");
assign("lentils", "l-lentils");
assign("almonds", "l-almonds");
assign("broccoli", "l-broccoli");
assign("oats", "l-oats sq-diabete-e");
assign("balanced_meal", "e-med");
assign("sleep", "e-sleep");
assign("walk", "e-activity f-walk med-ex-autonomy spo-ex-age sq-sarcopenie-e sq-sarcopenie-f sq-marathon-e");
assign("breakfast_sweet", "e-breakfast");
assign("soda", "f-soda");
assign("monet", "sq-monet-r sq-monet-e sq-monet-f art-ex-impression");
assign("mona_lisa", "sq-renaissance-r sq-renaissance-e sq-renaissance-f art-ex-museum");
assign("sq-mediterranee", "sq-mediterranee-e");
assign("sq-sarcopenie", "sq-sarcopenie-r");
assign("walk", "sq-diabete-f");
assign("salt", "sq-tension-e");
assign("hint-tension", "sq-tension-f");
assign("sq-photosynthese", "sq-photosynthese-r sq-photosynthese-f");
assign("forest", "sq-photosynthese-e sci-ex-climate");
assign("hint-solstice", "sq-saisons-r");
assign("sq-saisons", "sq-saisons-e sq-saisons-f geo-ex-climate");
assign("hint-milk", "sq-pasteur-r");
assign("sq-pasteur", "sq-pasteur-e sq-pasteur-f med-ex-prevention");
assign("hint-gard", "sq-rome-r sq-rome-e");
assign("sq-rome", "sq-rome-f");
assign("sq-hugo", "sq-hugo-r sq-hugo-e sq-hugo-f lit-ex-reading");
assign("hint-staircase", "sq-loire-r");
assign("sq-loire", "sq-loire-e sq-loire-f");
assign("sq-abeilles", "sq-abeilles-r sq-abeilles-e sq-abeilles-f nat-ex-biodiv");
assign("hint-sailor", "sq-internet-r");
assign("sq-internet", "sq-internet-e sq-internet-f tec-ex-internet");
assign("hint-turmeric", "sq-epices-r");
assign("cooking", "sq-epices-e cui-ex-home");
assign("sq-epices", "sq-epices-f");
assign("sq-marathon", "sq-marathon-r sq-marathon-f spo-ev-endurance");
assign("sq-penicilline", "sq-penicilline-r sq-penicilline-e sq-penicilline-f sci-ex-method");
assign("sq-adn", "sq-adn-r sq-adn-e sq-adn-f");
assign("hint-mri", "sq-imagerie-r tec-ex-medtech");
assign("sq-imagerie", "sq-imagerie-e sq-imagerie-f");
assign("hint-clay", "sq-langage-r");
assign("book", "sq-langage-e sq-langage-f his-ex-print");
assign("hint-david", "sq-florence-r");
assign("sq-florence", "sq-florence-e sq-florence-f his-ex-renaissance");
assign("sq-venise", "sq-venise-r sq-venise-e sq-venise-f geo-ex-travel");
assign("sq-pompei", "sq-pompei-r sq-pompei-e sq-pompei-f");
assign("hint-cube", "sq-cubisme-r");
assign("sq-cubisme", "sq-cubisme-e sq-cubisme-f");
assign("hint-bowler", "sq-surrealisme-r");
assign("sq-surrealisme", "sq-surrealisme-e sq-surrealisme-f");
assign("hint-gravity", "sci-ev-gravity");
assign("hint-pyramids", "his-ev-pharaon");
assign("hint-fresco", "art-ev-fresque");
assign("hint-archipelago", "geo-ev-archipel");
assign("hint-marmot", "nat-ev-hiber");
assign("autumn", "nat-ex-seasons");
assign("hint-verse", "lit-ev-alexandrin lit-ex-fable");
assign("hint-satellite", "tec-ev-satellite");
assign("hint-stew", "cui-ev-mijoter cui-ex-share");
assign("football", "spo-ex-team");
assign("phone", "rp-ex-change");
assign("calendar", "rp-year rp-month rp-jo t-twice t-15h t-week t-2h t-3x t-kine");
assign("morning", "t-bilan t-sequence");
assign("plate", "t-dinner t-meal");
assign("evening", "t-evening");
assign("summer", "t-season");
assign("olive_oil", "i-olive tf-olive r-olive lf-olive");
assign("salmon", "tf-salmon lf-salmon");
assign("lentils", "tf-lentils lf-lentils");
assign("orange", "tf-vitc");
assign("water", "tf-water r-water i-thirst");
assign("hint-pancreas", "tf-insulin m-glyc med-insulin");
assign("hint-skeleton", "tf-calcium m-bone");
assign("walnuts", "r-nuts tf-walnuts");
assign("almonds", "lf-almonds");
assign("broccoli", "lf-broccoli");
assign("oats", "lf-oats");
assign("sleep", "i-sleep med-sleep med-rd-sleep");
assign("sq-sarcopenie", "i-muscle r-muscle tf-protage");
assign("walk", "c-sarco-move med-age-activity");
assign("hint-tension", "med-bp i-salt tf-saltbp");
assign("hint-artery", "med-tf-heart");
assign("sq-photosynthese", "sci-photo");
assign("sq-adn", "sci-dna");
assign("sq-renaissance", "his-renaissance");
assign("sq-pasteur", "cu-pasteur med-vaccine");
assign("sq-penicilline", "cu-fleming");
assign("sq-abeilles", "nat-bees nat-rd-bees");
assign("sq-hugo", "lit-hugo lit-rd-hugo");
assign("monet", "art-impression cu-monet art-tf-monet art-rd-monet");
assign("piano", "art-mozart");
assign("sq-cubisme", "art-cubism");
assign("mona_lisa", "art-louvre");
assign("sq-venise", "geo-venice");
assign("sq-internet", "tec-internet");
assign("hint-satellite", "tec-gps");
assign("sq-imagerie", "tec-xray");
assign("phone", "tec-tf-phone");
assign("cooking", "cui-steam cui-rd-steam c-salt-indus");
assign("sq-epices", "cui-herbs");
assign("vegetables", "cui-ratatouille c-constip2 c-microb i-microb r-variety");
assign("bread", "cui-bread");
assign("sq-marathon", "spo-marathon spo-olympic");
assign("cheese", "c-density");
assign("paris", "rp-jo");
assign("elysee", "rp-fr-pres");
assign("white_house", "rp-us-pres");

const CAPTIONS: Record<string, string> = {
  "rp-fr-pres": "Son prénom est Emmanuel.",
  "rp-us-pres": "Son prénom est Donald.",
  "rp-euro": "Son symbole est €.",
  "rp-jo": "La tour Eiffel se trouve dans cette ville.",
  "sq-monet-c": "Le même paysage change avec la lumière.",
  "sq-microbiote-c": "Les fibres nourrissent les bactéries de l'intestin.",
  "sq-mediterranee-c": "Pensez à la santé du cœur.",
  "sq-sarcopenie-c": "Bien manger et bouger aident les muscles.",
  "sq-photosynthese-c": "Les plantes libèrent le gaz que nous respirons.",
  "sq-rome-c": "Ces constructions transportaient l'eau.",
  "sq-abeilles-c": "L'abeille transporte le pollen entre les fleurs.",
  "sq-epices-c": "Les épices donnent du goût sans ajouter de sel.",
  "tf-lentils": "Les lentilles sont riches en fibres.",
  "tf-soda": "Un jus apporte moins de fibres qu'un fruit entier.",
  "tf-protage": "Avec l'âge, il reste important de manger assez de protéines.",
  "i-thirst": "Proposez à boire, même sans sensation de soif.",
};

export type VisualHint = { image: string | null; alt: string; caption: string };
export function visualHintFor(item: { id: string; hint?: string | null; keyword?: string | null; audio?: string; image?: string | null | undefined; options?: { image?: string | undefined }[] }): VisualHint {
  const source = BY_ID.get(item.id) ?? SEQ_ITEMS.find((entry) => entry.id === item.id);
  const month = new Date().getMonth();
  const season = month === 11 || month < 2 ? "winter" : month < 5 ? "spring" : month < 8 ? "summer" : "autumn";
  const sequenceImage = item.id.match(/^(sq-[a-z]+)-[cref]$/)?.[1];
  const scene = SCENE[item.id];
  const preciseScene = scene && !["consultation", "book", "astronomy", "market", "elderly_meal"].includes(scene) ? scene : undefined;
  const candidate = item.id === "rp-season" || item.id === "rp-ex-season" ? season : HINTS[item.id] ?? (source?.kind === "mcq" ? source.answer.image : undefined) ?? preciseScene ?? item.image ?? sequenceImage;
  const image = candidate && imageSrc(candidate) ? candidate : null;
  if (item.id === "sq-microbiote-e") return { image, alt: "Un bol de yaourt nature, un lait fermenté", caption: "Yaourt nature · lait fermenté" };
  const alt = LIBRARY.find((entry) => entry.id === image)?.label ?? "Indice illustré";
  const semantic = item.hint ?? (source && "hint" in source ? source.hint : null);
  let caption = CAPTIONS[item.id] ?? semantic;
  if (item.id === "rp-season") caption = `Pensez à la saison illustrée : ${alt}.`;
  if (!caption && source?.kind === "mcq") caption = `Une piste : ${source.answer.label}.`;
  if (!caption && source?.kind === "tf") caption = source.answer ? source.audio : `À retenir : ${source.keyword}. Cette affirmation est à nuancer.`;
  if (!caption) caption = image ? `Une piste pour en parler : ${alt}.` : `Vous pouvez reprendre cette idée : ${item.audio ?? "la question entendue"}`;
  return { image, alt, caption };
}