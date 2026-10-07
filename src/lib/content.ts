import { TOPIC_BANK } from "./content-topics";
// Local, reusable content bank. No AI is used to build sessions.
// Language stays short; content stays professional ("langage simple ≠ contenu simple").

export type Theme = "nutrition" | "avis" | "sciences" | "temps" | "expression";
export type Skill = "lexique" | "conseil" | "information" | "temps" | "completion" | "expression" | "evocation" | "elocution";
/** Subject used to carry the exercise — independent of the skill trained. "general" = transversal (time, language). */
export type Topic = "sante" | "medecine" | "sciences" | "histoire" | "art" | "geographie" | "nature" | "litterature" | "technologie" | "cuisine" | "sport" | "actualite" | "general";
export type Opt = { label: string; image?: string | undefined };

type Base = { id: string; theme: Theme; skill: Skill; topic?: Topic };
export type McqItem = Base & {
  kind: "mcq";
  audio: string;
  audioShort?: string; // shorter phrasing used when support is needed
  question?: string;
  keyword: string;
  answer: Opt;
  distractors: Opt[]; // ordered from clearly different → semantically closer
};
export type TfItem = Base & { kind: "tf"; audio: string; answer: boolean; keyword: string };
export type CompleteItem = Base & { kind: "complete"; audio: string; answer: string; hint: string };
export type OralItem = Base & {
  kind: "oral";
  mode: "expliquer" | "lire" | "reformuler" | "nommer";
  steps: string[]; // progressive versions; level picks one (lire / elocution)
  image?: string;
  answer?: string; // target word (nommer)
  hint?: string; // semantic cue (nommer)
  model?: string; // short model formulation, heard and repeated after the attempt
  follow?: string; // id of an item played right after
};
/** Professional word retrieval: question → semantic cue → first syllable → word → audio → repeat. */
export type EvokeItem = Base & { kind: "evoke"; audio: string; answer: string; hint: string; syllable: string; model: string };
export type Item = McqItem | TfItem | CompleteItem | OralItem | EvokeItem;

const o = (label: string, image?: string): Opt => ({ label, image });

const mcq = (id: string, theme: Theme, skill: Skill, audio: string, keyword: string, answer: Opt, distractors: Opt[], extra: Partial<McqItem> = {}): McqItem => ({
  id, theme, skill, kind: "mcq", audio, keyword, answer, distractors, ...extra,
});
const tf = (id: string, audio: string, answer: boolean, keyword: string, theme: Theme = "sciences"): TfItem => ({
  id, theme, skill: "information", kind: "tf", audio, answer, keyword,
});
const comp = (id: string, audio: string, answer: string, hint: string): CompleteItem => ({
  id, theme: "nutrition", skill: "completion", kind: "complete", audio, answer, hint,
});
const oral = (id: string, mode: OralItem["mode"], steps: string[], extra: Partial<OralItem> = {}): OralItem => ({
  id, theme: "expression", skill: mode === "lire" ? "elocution" : mode === "nommer" ? "evocation" : "expression", kind: "oral", mode, steps, ...extra,
});
const evoke = (id: string, theme: Theme, audio: string, answer: string, hint: string, syllable: string, model: string): EvokeItem => ({
  id, theme, skill: "evocation", kind: "evoke", audio, answer, hint, syllable, model,
});

const CORE: Item[] = [
  // ——— 1. Questions de nutrition ———
  mcq("n-omega3", "nutrition", "lexique", "Quel aliment apporte le plus d'oméga-3 ?", "oméga-3", o("saumon", "salmon"), [o("thon en conserve"), o("poulet", "chicken"), o("œufs", "eggs")]),
  mcq("n-med-fat", "nutrition", "lexique", "Quelle graisse est privilégiée dans le régime méditerranéen ?", "méditerranéen", o("huile d'olive", "olive_oil"), [o("huile de tournesol"), o("beurre", "butter"), o("fromage", "cheese")], { audioShort: "Quelle graisse pour le régime méditerranéen ?" }),
  mcq("n-lentils", "nutrition", "lexique", "Quel nutriment abonde dans les lentilles ?", "lentilles", o("fibres"), [o("lipides"), o("vitamine C"), o("vitamine D")], { audioShort: "Les lentilles apportent surtout… ?" }),
  mcq("n-calcium", "nutrition", "lexique", "Quel aliment est une bonne source de calcium ?", "calcium", o("yaourt", "yogurt"), [o("riz complet"), o("pomme", "apple"), o("lentilles", "lentils")]),
  mcq("n-vitc", "nutrition", "lexique", "Quel aliment est riche en vitamine C ?", "vitamine C", o("orange", "orange"), [o("banane"), o("lentilles", "lentils"), o("noix", "walnuts")]),
  mcq("n-protein-veg", "nutrition", "lexique", "Quelle est une bonne source de protéines végétales ?", "protéines végétales", o("lentilles", "lentils"), [o("riz blanc"), o("avocat"), o("carottes", "carrots")]),
  mcq("n-oats", "nutrition", "lexique", "Quel aliment apporte des fibres solubles au petit-déjeuner ?", "fibres", o("flocons d'avoine", "oats"), [o("beurre", "butter"), o("croissant", "croissant"), o("pain blanc", "bread")], { audioShort: "Quel aliment apporte des fibres ?" }),
  mcq("n-unsat", "nutrition", "lexique", "Quel en-cas apporte des graisses insaturées ?", "insaturées", o("amandes", "almonds"), [o("chips"), o("croissant", "croissant"), o("fromage", "cheese")]),
  mcq("n-betacarotene", "nutrition", "lexique", "Quel légume est riche en bêta-carotène ?", "bêta-carotène", o("carottes", "carrots"), [o("chou-fleur"), o("concombre"), o("brocoli", "broccoli")]),
  mcq("n-sardines", "nutrition", "lexique", "Quel poisson gras est économique et riche en oméga-3 ?", "poisson gras", o("sardines", "sardines"), [o("cabillaud"), o("sole"), o("œufs", "eggs")], { audioShort: "Quel poisson est riche en oméga-3 ?" }),

  // ——— 2. Mini-cas cliniques ———
  mcq("c-hta-salt", "avis", "conseil", "Un patient est hypertendu. Il mange très salé.", "sel", o("réduire le sel", "salt"), [o("augmenter les fruits seuls"), o("supprimer toutes les graisses"), o("prendre un complément de magnésium")], { question: "Quel conseil serait prioritaire ?" }),
  mcq("c-diab-soda", "avis", "conseil", "Un patient diabétique boit beaucoup de sodas.", "sucre", o("remplacer par de l'eau", "water"), [o("passer aux sodas light"), o("supprimer tous les féculents"), o("boire plus de jus")], { question: "Que conseilleriez-vous d'abord ?" }),
  mcq("c-chol", "avis", "conseil", "Un patient a un cholestérol élevé. Il cuisine au beurre.", "graisses", o("cuisiner à l'huile d'olive", "olive_oil"), [o("supprimer les œufs"), o("cuisiner à la margarine"), o("éviter tous les fruits")], { question: "Quel changement proposeriez-vous ?" }),
  mcq("c-hydra", "avis", "conseil", "Un patient boit très peu dans la journée.", "hydratation", o("boire régulièrement de l'eau", "water"), [o("boire surtout du café"), o("boire un litre le soir"), o("attendre d'avoir soif")], { question: "Quel conseil donneriez-vous ?" }),
  mcq("c-constip", "avis", "conseil", "Une patiente souffre de constipation.", "transit", o("plus de fibres et d'eau", "vegetables"), [o("un laxatif d'emblée"), o("plus de produits laitiers"), o("plus de pain blanc", "bread")], { question: "Que lui conseilleriez-vous ?" }),
  mcq("c-elderly-protein", "avis", "conseil", "Une personne âgée perd de la masse musculaire.", "muscle", o("augmenter les protéines", "eggs"), [o("les fibres"), o("les glucides"), o("la vitamine C")], { question: "Quel apport faut-il surveiller ?" }),
  mcq("c-appetite", "avis", "conseil", "Un patient âgé a perdu l'appétit.", "appétit", o("petits repas enrichis"), [o("des compléments seuls"), o("un seul gros repas"), o("un régime sans sel")], { question: "Quelle stratégie proposeriez-vous ?" }),
  mcq("c-veg", "avis", "conseil", "Une personne mange très peu de légumes.", "légumes", o("en ajouter à chaque repas", "vegetables"), [o("un jus de fruits"), o("manger plus de pain", "bread"), o("des compléments vitaminiques")], { question: "Quel conseil donneriez-vous ?" }),
  mcq("c-cardio", "avis", "conseil", "Un patient veut protéger son cœur.", "cœur", o("poisson gras deux fois par semaine", "salmon"), [o("supprimer toutes les graisses"), o("des jus de fruits"), o("un régime hyperprotéiné")], { question: "Que recommanderiez-vous ?" }),

  // ——— 4. Comparaisons ———
  mcq("cmp-fibres", "nutrition", "lexique", "Lequel contient le plus de fibres ?", "fibres", o("lentilles", "lentils"), [o("poulet", "chicken"), o("pain blanc", "bread")]),
  mcq("cmp-protein", "nutrition", "lexique", "Lequel est la meilleure source de protéines ?", "protéines", o("poulet", "chicken"), [o("riz"), o("pomme", "apple")]),
  mcq("cmp-omega", "nutrition", "lexique", "Lequel conseilleriez-vous pour les oméga-3 ?", "oméga-3", o("sardines", "sardines"), [o("croissant", "croissant"), o("poulet", "chicken")]),
  mcq("cmp-meal", "avis", "conseil", "Pour le déjeuner, quel repas semble le plus équilibré ?", "équilibré", o("poisson, légumes, riz", "balanced_meal"), [o("burger, frites, soda", "fast_food"), o("salade verte seule")]),

  // ——— 5. Courtes informations scientifiques ———
  mcq("i-nuts", "sciences", "information", "Les noix apportent des graisses insaturées.", "noix", o("l'huile d'olive", "olive_oil"), [o("le beurre", "butter"), o("le sucre"), o("le pain blanc", "bread")], { question: "Quel autre aliment apporte surtout ce même type de graisses ?" }),
  mcq("i-muscle", "sciences", "information", "Les protéines aident à maintenir la masse musculaire.", "protéines", o("une perte de muscle"), [o("une tension trop élevée"), o("un excès de fibres"), o("un excès de vitamines")], { question: "Que risque une personne âgée qui n'en mange pas assez ?" }),
  mcq("i-fibres", "sciences", "information", "Les fibres favorisent un bon transit intestinal.", "fibres", o("l'intestin"), [o("le cœur"), o("les poumons"), o("l'estomac")], { question: "De quel organe s'agit-il ?" }),
  mcq("i-vitd", "sciences", "information", "La vitamine D aide à fixer le calcium.", "vitamine D", o("les os"), [o("les cheveux"), o("les yeux"), o("les muscles")], { question: "Quelle partie du corps en profite surtout ?" }),
  mcq("i-salt", "sciences", "information", "Un excès de sel peut augmenter la tension artérielle.", "tension", o("la tension"), [o("la fréquence cardiaque"), o("la glycémie"), o("le cholestérol")], { question: "Qu'est-ce qui peut augmenter ?" }),
  mcq("i-olive", "sciences", "information", "L'huile d'olive est au cœur du régime crétois.", "crétois", o("le régime méditerranéen"), [o("un régime sans gluten"), o("un régime hyperprotéiné"), o("un régime pauvre en fibres")], { question: "À quel régime cela fait-il penser ?" }),

  // ——— 6. Vrai / faux ———
  tf("tf-olive", "L'huile d'olive est surtout composée de graisses insaturées.", true, "huile d'olive"),
  tf("tf-salmon", "Le saumon est une source importante d'oméga-3.", true, "saumon"),
  tf("tf-lentils", "Les lentilles sont pauvres en fibres.", false, "lentilles"),
  tf("tf-vitc", "Les agrumes apportent de la vitamine C.", true, "agrumes"),
  tf("tf-water", "La sensation de soif diminue souvent avec l'âge.", true, "soif"),
  tf("tf-soda", "Les jus de fruits comptent comme une portion de fruits entière.", false, "jus"),
  tf("tf-insulin", "L'insuline est produite par le pancréas.", true, "insuline"),
  tf("tf-calcium", "Le calcium est important pour les os.", true, "calcium"),

  // ——— 13. Culture médicale ———
  mcq("m-glyc", "sciences", "information", "Quel organe régule principalement la glycémie ?", "glycémie", o("le pancréas"), [o("les poumons"), o("le foie"), o("les reins")]),
  mcq("m-vitd", "sciences", "information", "Quelle vitamine est produite grâce au soleil ?", "soleil", o("vitamine D"), [o("vitamine C"), o("vitamine B12"), o("vitamine A")]),
  mcq("m-bone", "sciences", "information", "Quel minéral est essentiel à la santé osseuse ?", "os", o("le calcium"), [o("le sodium"), o("le fer"), o("le potassium")]),
  mcq("m-anemia", "sciences", "information", "Quel minéral manque souvent en cas d'anémie ?", "anémie", o("le fer"), [o("le sel"), o("le calcium"), o("le magnésium")]),
  mcq("m-b12", "sciences", "information", "Quelle vitamine se trouve surtout dans les produits animaux ?", "produits animaux", o("vitamine B12"), [o("vitamine C"), o("vitamine K"), o("vitamine D")]),

  // ——— 10. Catégorisation ———
  mcq("cat-lentils", "nutrition", "lexique", "Les lentilles appartiennent à quelle catégorie ?", "catégorie", o("légumineuses", "lentils"), [o("poissons"), o("produits laitiers"), o("céréales")]),
  mcq("cat-salmon", "nutrition", "lexique", "Le saumon appartient à quelle catégorie ?", "catégorie", o("poissons gras", "salmon"), [o("légumineuses"), o("produits laitiers"), o("poissons maigres")]),
  mcq("cat-yogurt", "nutrition", "lexique", "Le yaourt appartient à quelle catégorie ?", "catégorie", o("produits laitiers", "yogurt"), [o("féculents"), o("fruits"), o("matières grasses")]),
  mcq("cat-almonds", "nutrition", "lexique", "Les amandes appartiennent à quelle catégorie ?", "catégorie", o("fruits à coque", "almonds"), [o("produits laitiers"), o("légumes verts"), o("légumineuses")]),

  // ——— 11. Votre avis ———
  mcq("a-breakfast", "avis", "conseil", "Petit-déjeuner : pain blanc, confiture, jus.", "petit-déjeuner", o("ajouter une protéine", "yogurt"), [o("remplacer le jus par un fruit seul"), o("supprimer le pain"), o("ajouter du beurre", "butter")], { question: "Que modifieriez-vous en priorité ?" }),
  mcq("a-lowprot", "avis", "conseil", "Ce déjeuner contient très peu de protéines.", "protéines", o("œufs", "eggs"), [o("riz"), o("croissant", "croissant"), o("pain blanc", "bread")], { question: "Quel aliment pourrait être ajouté ?" }),
  mcq("a-snack", "avis", "conseil", "Un patient grignote des viennoiseries l'après-midi.", "en-cas", o("une poignée d'amandes", "almonds"), [o("un jus de fruits"), o("un second croissant", "croissant"), o("une barre de céréales")], { question: "Quel en-cas proposeriez-vous ?" }),
  mcq("a-fastfood", "avis", "conseil", "Un patient déjeune souvent burger, frites et soda.", "déjeuner", o("poisson, légumes, riz", "balanced_meal"), [o("supprimer les féculents"), o("une salade composée sans protéines"), o("un sandwich jambon-beurre")], { question: "Quelle alternative suggéreriez-vous ?" }),

  // ——— 14. Temps, situations adultes ———
  mcq("t-twice", "temps", "temps", "Un patient prend un comprimé le matin et un autre au coucher.", "coucher", o("deux prises"), [o("une prise"), o("trois prises"), o("quatre prises")], { question: "Combien de prises dans la journée ?" }),
  mcq("t-15h", "temps", "temps", "Le rendez-vous est à 15 heures, le déjeuner à midi.", "15 heures", o("après le déjeuner"), [o("avant le déjeuner"), o("pendant le déjeuner")], { question: "Le rendez-vous est-il avant ou après le déjeuner ?" }),
  mcq("t-bilan", "temps", "temps", "Le bilan sanguin se fait avant le déjeuner.", "avant", o("le matin, à jeun", "morning"), [o("la nuit", "night"), o("après le repas"), o("après le dîner")], { question: "Quand doit-il être réalisé ?" }),
  mcq("t-meal", "temps", "temps", "Le comprimé se prend au milieu du repas, jamais à jeun.", "pendant", o("pendant le repas", "plate"), [o("une heure avant le repas"), o("au réveil, avant de manger"), o("une heure après le dîner")], { question: "À quel moment faut-il le prendre ?" }),
  mcq("t-week", "temps", "temps", "Le contrôle a lieu une fois par semaine.", "semaine", o("sept jours"), [o("un an"), o("un jour"), o("un mois")], { question: "Combien de jours entre deux contrôles ?" }),
  mcq("t-evening", "temps", "temps", "La consultation est à 19 heures, le dîner à 20 heures.", "19 heures", o("avant le dîner"), [o("après le dîner"), o("pendant le dîner")], { question: "La consultation a-t-elle lieu avant ou après le dîner ?" }),
  mcq("t-season", "temps", "temps", "Les fraises françaises mûrent en juin et en juillet.", "juin", o("l'été", "summer"), [o("le printemps", "spring"), o("l'automne", "autumn"), o("l'hiver", "winter")], { question: "De quelle saison parle-t-on ?" }),

  // ——— 8. Complétion ———
  comp("k-fattyfish", "Les poissons gras sont riches en…", "oméga-3", "un type de graisse"),
  comp("k-legumes", "Les légumineuses apportent notamment des…", "fibres", "utiles au transit"),
  comp("k-salt", "Un excès de sel peut augmenter la…", "tension", "elle se mesure au bras"),
  comp("k-protein", "Les protéines aident au maintien des…", "muscles", "la masse musculaire"),
  comp("k-fibres", "Les fibres participent au bon fonctionnement de l'…", "intestin", "le transit"),
  comp("k-calcium", "Le calcium est important pour les…", "os", "le squelette"),
  comp("k-citrus", "Les agrumes sont riches en vitamine…", "C", "comme dans les oranges"),

  // ——— 7. Expliquer un concept ———
  oral("e-veg", "expliquer", ["Pourquoi recommande-t-on de manger des légumes ?"], { model: "Les légumes apportent des fibres, des vitamines et des minéraux." }),
  oral("e-prot", "expliquer", ["À quoi servent les protéines ?"], { model: "Les protéines construisent et entretiennent les muscles." }),
  oral("e-salt", "expliquer", ["Pourquoi limiter l'excès de sel ?"], { model: "L'excès de sel favorise l'hypertension." }),
  oral("e-fish", "expliquer", ["Que nous apporte le poisson ?"], { model: "Le poisson apporte des protéines, et les poissons gras des oméga-3." }),
  oral("e-fibres", "expliquer", ["Quels aliments sont riches en fibres ?"], { model: "Les légumes, les fruits, les légumineuses et les céréales complètes." }),
  oral("e-water", "expliquer", ["Pourquoi boire assez avec l'âge ?"], { model: "La soif diminue avec l'âge, et le risque de déshydratation augmente." }),

  // ——— 15–16. Lecture / élocution progressive ———
  oral("r-nuts", "lire", [
    "Les noix apportent de bonnes graisses.",
    "Les noix apportent des graisses insaturées.",
    "Les noix apportent des graisses insaturées, utiles pour le cœur.",
  ]),
  oral("r-fibres", "lire", [
    "Les fibres aident le transit.",
    "Les fibres sont importantes pour le transit intestinal.",
    "Les fibres des légumineuses sont importantes pour le transit intestinal.",
  ]),
  oral("r-variety", "lire", [
    "Il faut manger varié.",
    "Une alimentation variée couvre les besoins.",
    "Une alimentation variée aide à couvrir les besoins nutritionnels.",
  ]),

  // ——— 17. Reformulation ———
  oral("f-fish", "reformuler", ["Le poisson gras apporte des oméga-3."], { model: "Le saumon ou la sardine sont riches en oméga-3." }),
  oral("f-olive", "reformuler", ["L'huile d'olive protège le cœur."], { model: "L'huile d'olive est bénéfique pour la santé cardiovasculaire." }),
  oral("f-protein", "reformuler", ["Après soixante-dix ans, les besoins en protéines augmentent."], { model: "Avec l'âge, il faut davantage de protéines." }),

  // ——— 9. Évocation lexicale + intérêt nutritionnel ———
  oral("l-olive", "nommer", ["Quel est cet aliment ?"], { image: "olive_oil", answer: "huile d'olive", hint: "La base du régime méditerranéen.", follow: "lf-olive" }),
  mcq("lf-olive", "nutrition", "lexique", "Quel est son principal intérêt nutritionnel ?", "intérêt", o("graisses insaturées"), [o("riche en sucre"), o("riche en sel"), o("riche en protéines")]),
  oral("l-lentils", "nommer", ["Quel est cet aliment ?"], { image: "lentils", answer: "lentilles", follow: "lf-lentils" }),
  mcq("lf-lentils", "nutrition", "lexique", "Quel est son principal intérêt nutritionnel ?", "intérêt", o("fibres et protéines"), [o("vitamine C"), o("graisses saturées"), o("calcium")]),
  oral("l-salmon", "nommer", ["Quel est cet aliment ?"], { image: "salmon", answer: "saumon", hint: "Un poisson gras.", follow: "lf-salmon" }),
  mcq("lf-salmon", "nutrition", "lexique", "Quel est son principal intérêt nutritionnel ?", "intérêt", o("oméga-3"), [o("fibres"), o("vitamine C"), o("glucides")]),
  oral("l-almonds", "nommer", ["Quel est cet aliment ?"], { image: "almonds", answer: "amandes", hint: "Un fruit à coque.", follow: "lf-almonds" }),
  mcq("lf-almonds", "nutrition", "lexique", "Quel est son principal intérêt nutritionnel ?", "intérêt", o("bonnes graisses"), [o("vitamine C"), o("sucres rapides"), o("sel")]),
  oral("l-broccoli", "nommer", ["Quel est cet aliment ?"], { image: "broccoli", answer: "brocoli", hint: "Un légume vert.", follow: "lf-broccoli" }),
  mcq("lf-broccoli", "nutrition", "lexique", "Quel est son principal intérêt nutritionnel ?", "intérêt", o("fibres et vitamines"), [o("graisses saturées"), o("sel"), o("protéines animales")]),
  oral("l-oats", "nommer", ["Quel est cet aliment ?"], { image: "oats", answer: "flocons d'avoine", hint: "Une céréale du petit-déjeuner.", follow: "lf-oats" }),
  mcq("lf-oats", "nutrition", "lexique", "Quel est son principal intérêt nutritionnel ?", "intérêt", o("fibres"), [o("vitamine C"), o("oméga-3"), o("calcium")]),

  // ——— Évocation lexicale professionnelle ———
  evoke("v-sarco", "nutrition", "Comment s'appelle la perte de muscles avec l'âge ?", "sarcopénie", "Elle touche les muscles.", "sar…", "La sarcopénie est la perte progressive de masse musculaire avec l'âge."),
  evoke("v-glyc", "sciences", "Comment appelle-t-on le taux de sucre dans le sang ?", "glycémie", "On la mesure chez le diabétique.", "gly…", "La glycémie est le taux de sucre dans le sang."),
  evoke("v-microb", "nutrition", "Comment appelle-t-on l'ensemble des bactéries de l'intestin ?", "microbiote", "On parlait autrefois de flore intestinale.", "micro…", "Le microbiote est l'ensemble des bactéries de l'intestin."),
  evoke("v-insul", "sciences", "Quelle hormone fait baisser le sucre dans le sang ?", "insuline", "Elle est produite par le pancréas.", "in…", "L'insuline fait baisser la glycémie."),
  evoke("v-hta", "sciences", "Comment appelle-t-on une tension artérielle trop élevée ?", "hypertension", "L'excès de sel peut la favoriser.", "hyper…", "L'hypertension est une tension artérielle trop élevée."),
  evoke("v-chol", "sciences", "Quelle graisse du sang surveille-t-on pour le cœur ?", "cholestérol", "On en distingue un bon et un mauvais.", "choles…", "Le cholestérol se surveille pour protéger le cœur."),
  evoke("v-fibres", "nutrition", "Quels composés végétaux favorisent le transit ?", "fibres", "Les légumineuses en sont riches.", "fi…", "Les fibres favorisent le transit intestinal."),
  evoke("v-hydra", "nutrition", "Comment appelle-t-on l'apport en eau de l'organisme ?", "hydratation", "La soif diminue avec l'âge.", "hydra…", "Une bonne hydratation est essentielle avec l'âge."),
  evoke("v-antiox", "nutrition", "Quels composés protègent les cellules de l'oxydation ?", "antioxydants", "Les fruits colorés en apportent.", "anti…", "Les fruits et légumes colorés apportent des antioxydants."),
  evoke("v-denut", "nutrition", "Comment appelle-t-on l'état où les apports ne couvrent plus les besoins ?", "dénutrition", "On la surveille par le poids.", "dé…", "La dénutrition se surveille par le poids et l'appétit."),
  evoke("v-prot", "nutrition", "Quels nutriments entretiennent les muscles ?", "protéines", "Œufs, poisson, légumineuses en apportent.", "pro…", "Les protéines entretiennent les muscles."),
  evoke("v-micronut", "nutrition", "Comment appelle-t-on ensemble les vitamines et les minéraux ?", "micronutriments", "On en a besoin en petites quantités.", "micro…", "Vitamines et minéraux sont des micronutriments."),
  evoke("v-legum", "nutrition", "Comment appelle-t-on les lentilles, les pois chiches et les haricots secs ?", "légumineuses", "Une famille riche en fibres et en protéines.", "légu…", "Les légumineuses sont riches en fibres et en protéines végétales."),
  evoke("v-calc", "nutrition", "Quel minéral est essentiel à la solidité des os ?", "calcium", "Les produits laitiers en apportent.", "cal…", "Le calcium est essentiel à la solidité des os."),
  evoke("v-diab", "sciences", "Quelle maladie fait monter le sucre dans le sang ?", "diabète", "L'insuline est en cause.", "dia…", "Le diabète se caractérise par un excès de sucre dans le sang."),

  // ——— Mini-cas complémentaires ———
  mcq("c-weightloss", "avis", "conseil", "Un patient âgé perd du poids. Il mange peu de protéines.", "protéines", o("une protéine à chaque repas", "eggs"), [o("boire plus de jus"), o("plus de pain blanc", "bread"), o("supprimer le goûter")], { question: "Quel conseil serait prioritaire ?", audioShort: "Un patient âgé perd du poids." }),
  mcq("c-starch", "avis", "conseil", "Un repas apporte beaucoup de féculents. Il contient peu de protéines.", "protéines", o("ajouter poisson ou œufs", "salmon"), [o("supprimer les légumes"), o("ajouter du pain", "bread"), o("ajouter un dessert")], { question: "Que modifieriez-vous ?" }),
  mcq("c-salt-indus", "avis", "conseil", "Une personne hypertendue mange souvent des plats industriels salés.", "sel", o("cuisiner davantage maison", "cooking"), [o("utiliser du sel allégé"), o("ne manger que des crudités"), o("supprimer tous les fromages")], { question: "Quel conseil donneriez-vous ?", audioShort: "Une personne hypertendue mange très salé." }),
  mcq("c-density", "avis", "conseil", "Une personne âgée mange très peu à chaque repas.", "densité", o("enrichir les plats", "cheese"), [o("supprimer les desserts"), o("plus de salade verte"), o("de la soupe claire")], { question: "Comment enrichir sans augmenter le volume ?" }),
  mcq("c-constip2", "avis", "conseil", "Un patient est constipé. Il mange très peu de végétaux.", "végétaux", o("plus de végétaux et d'eau", "vegetables"), [o("plus de pain blanc", "bread"), o("moins boire"), o("plus de viande")], { question: "Que lui conseilleriez-vous ?" }),
  mcq("c-sarco-move", "avis", "conseil", "Une patiente perd de la force. Elle bouge très peu.", "force", o("protéines et activité physique"), [o("plus de sucre"), o("un régime sans graisse"), o("le repos complet")], { question: "Que lui proposeriez-vous ?" }),
  mcq("c-diab-bread", "avis", "conseil", "Un patient diabétique mange beaucoup de pain blanc.", "féculents", o("des féculents complets", "oats"), [o("ajouter de la confiture"), o("supprimer les légumes"), o("plus de jus de fruits")], { question: "Que proposeriez-vous ?" }),
  mcq("c-heat", "avis", "conseil", "Il fait très chaud. Une personne âgée boit peu.", "chaleur", o("la déshydratation", "water"), [o("l'anémie"), o("le cholestérol"), o("le surpoids")], { question: "Quel est le risque principal ?" }),
  mcq("c-nofish", "avis", "conseil", "Un patient ne mange jamais de poisson.", "poisson", o("les oméga-3", "sardines"), [o("le sel", "salt"), o("l'amidon"), o("le sucre")], { question: "Quel apport risque de manquer ?" }),
  mcq("c-indoor", "avis", "conseil", "Une personne âgée sort très peu de chez elle.", "soleil", o("la vitamine D", "summer"), [o("la vitamine B1"), o("la vitamine K"), o("la vitamine C")], { question: "Quelle vitamine faut-il surveiller ?" }),
  mcq("c-iron", "avis", "conseil", "Une patiente est fatiguée. Elle mange peu de viande et de légumineuses.", "fatigue", o("le fer", "lentils"), [o("l'iode"), o("le fluor"), o("le sodium", "salt")], { question: "Quel minéral faut-il surveiller ?" }),
  mcq("c-microb", "avis", "conseil", "Un patient veut prendre soin de son microbiote.", "microbiote", o("manger varié et riche en fibres", "vegetables"), [o("prendre des probiotiques seuls"), o("éviter tous les féculents"), o("un jeûne régulier")], { question: "Que lui conseilleriez-vous ?" }),

  // ——— Mini-informations ———
  mcq("i-sleep", "sciences", "information", "Un bon sommeil aide la mémoire à se consolider.", "sommeil", o("des oublis plus fréquents"), [o("une tension trop basse"), o("une perte de poids"), o("des muscles plus faibles")], { question: "Que risque une personne qui dort très peu ?" }),
  mcq("i-walk", "sciences", "information", "Marcher trente minutes par jour aide le cœur.", "marcher", o("la natation"), [o("la lecture", "book"), o("regarder la télévision"), o("rester au repos")], { question: "Sans marcher, quelle activité aide le cœur ?" }),
  mcq("i-thirst", "sciences", "information", "Avec l'âge, la sensation de soif diminue.", "soif", o("proposer de l'eau régulièrement"), [o("attendre qu'elle demande à boire"), o("donner surtout du café"), o("limiter les boissons")], { question: "Que proposer dans la journée ?" }),
  mcq("i-combine", "sciences", "information", "Associer céréales et légumineuses améliore l'apport en protéines.", "protéines", o("riz et lentilles", "lentils"), [o("pain et beurre", "butter"), o("pomme et fromage", "cheese"), o("café et sucre")], { question: "Quel duo d'aliments permet cela ?" }),
  mcq("i-microb", "sciences", "information", "Les fibres nourrissent les bactéries de l'intestin.", "bactéries", o("des légumes et des légumineuses", "vegetables"), [o("du sel", "salt"), o("des sucres rapides"), o("des graisses saturées")], { question: "Quels aliments les nourrissent ?" }),

  // ——— Culture générale et scientifique ———
  mcq("cu-joconde", "sciences", "information", "Qui a peint La Joconde ?", "Joconde", o("Léonard de Vinci", "mona_lisa"), [o("Rembrandt"), o("Picasso"), o("Michel-Ange")]),
  mcq("cu-monet", "sciences", "information", "Claude Monet a peint de nombreux nymphéas.", "Monet", o("l'impressionnisme", "monet"), [o("le baroque"), o("le surréalisme"), o("le cubisme")], { question: "À quel mouvement appartient-il ?" }),
  mcq("cu-rome", "sciences", "information", "Quelle ville abrite le Colisée ?", "Colisée", o("Rome", "rome"), [o("Londres", "london"), o("Barcelone", "barcelona"), o("Paris", "paris")]),
  mcq("cu-thames", "sciences", "information", "Quel fleuve traverse Londres ?", "Londres", o("la Tamise", "london"), [o("le Danube"), o("le Tibre"), o("la Seine")]),
  mcq("cu-gaudi", "sciences", "information", "Gaudí a conçu la Sagrada Família.", "Gaudí", o("Barcelone", "barcelona"), [o("Londres", "london"), o("Paris", "paris"), o("Rome", "rome")], { question: "Dans quelle ville se trouve-t-elle ?" }),
  mcq("cu-pasteur", "sciences", "information", "Quel savant a mis au point le vaccin contre la rage ?", "rage", o("Louis Pasteur"), [o("Isaac Newton"), o("Charles Darwin"), o("Marie Curie")]),
  mcq("cu-fleming", "sciences", "information", "Alexander Fleming a découvert la pénicilline.", "pénicilline", o("un antibiotique"), [o("une vitamine"), o("un vaccin"), o("un antalgique")], { question: "De quel type de médicament s'agit-il ?" }),
  mcq("cu-curie", "sciences", "information", "Marie Curie a reçu deux prix Nobel.", "Nobel", o("la physique et la chimie"), [o("la médecine et la physique"), o("la chimie et les mathématiques"), o("la biologie et la chimie")], { question: "Dans quels domaines travaillait-elle ?" }),
  mcq("cu-mercury", "sciences", "information", "Quelle planète est la plus proche du Soleil ?", "Soleil", o("Mercure", "astronomy"), [o("Jupiter"), o("Mars"), o("Vénus")]),
  mcq("cu-hippo", "sciences", "information", "Quel médecin grec est associé au serment médical ?", "serment", o("Hippocrate"), [o("Homère"), o("Platon"), o("Aristote")]),
  mcq("cu-eiffel", "sciences", "information", "La tour Eiffel a été construite pour l'Exposition universelle de 1889.", "1889", o("le dix-neuvième siècle"), [o("le dix-huitième siècle"), o("le vingtième siècle"), o("le dix-septième siècle")], { question: "Dans quel siècle s'inscrit-elle ?" }),

  // ——— Temps, situations adultes (suite) ———
  mcq("t-2h", "temps", "temps", "Il est 10 h 30. Le repas est prévu à 12 h 30.", "deux heures", o("deux heures"), [o("trente minutes"), o("cinq heures")], { question: "Dans combien de temps va-t-on manger ?" }),
  mcq("t-dinner", "temps", "temps", "Le traitement se prend après le petit-déjeuner et avant le dîner.", "deuxième dose", o("le soir", "evening"), [o("le matin", "breakfast_sweet"), o("au milieu de la nuit", "night")], { question: "À quel moment faut-il prendre la deuxième dose ?" }),
  mcq("t-sequence", "temps", "temps", "La prise de sang doit être faite à jeun, avant le petit-déjeuner.", "à jeun", o("la prise de sang"), [o("le petit-déjeuner", "breakfast_sweet"), o("la promenade")], { question: "Que fait-on en premier ?" }),
  mcq("t-3x", "temps", "temps", "Le sirop se prend toutes les huit heures.", "huit heures", o("trois"), [o("deux"), o("six"), o("quatre")], { question: "Combien de prises par jour ?" }),
  mcq("t-kine", "temps", "temps", "Le médecin passe demain matin et le kinésithérapeute en fin d'après-midi.", "en premier", o("le médecin"), [o("le kinésithérapeute"), o("ils passent en même temps")], { question: "Qui passe en premier ?" }),

  // ——— Vrai / faux (suite) ———
  tf("tf-walnuts", "Les noix apportent des graisses insaturées.", true, "noix", "nutrition"),
  tf("tf-transit", "Les fibres favorisent le transit intestinal.", true, "fibres", "nutrition"),
  tf("tf-protage", "Les besoins en protéines diminuent fortement avec l'âge.", false, "protéines", "nutrition"),
  tf("tf-vitdsun", "La vitamine D est en partie synthétisée grâce au soleil.", true, "vitamine D"),
  tf("tf-saltbp", "Réduire le sel aide à contrôler la tension artérielle.", true, "sel"),

  // ——— Votre avis (questions ouvertes, trois longueurs) ———
  oral("e-protage", "expliquer", [
    "Pourquoi faut-il assez de protéines après 70 ans ?",
    "Pourquoi l'apport en protéines devient-il important avec l'âge ?",
    "Quels mécanismes expliquent l'intérêt des protéines dans la prévention de la sarcopénie ?",
  ], { model: "Les protéines contribuent au maintien de la masse musculaire et de la force." }),
  oral("e-muscle", "expliquer", [
    "Pourquoi garder ses muscles avec l'âge ?",
    "Pourquoi faut-il préserver la masse musculaire avec l'âge ?",
    "En quoi préserver la masse musculaire protège-t-il l'autonomie ?",
  ], { model: "Préserver la masse musculaire aide à maintenir la force, la mobilité et l'autonomie." }),
  oral("e-med", "expliquer", [
    "Pourquoi le régime méditerranéen est-il intéressant ?",
    "Qu'est-ce qui rend le régime méditerranéen bénéfique ?",
    "Quels éléments du régime méditerranéen expliquent son intérêt cardiovasculaire ?",
  ], { model: "Il associe légumes, huile d'olive, poisson et légumineuses, favorables au cœur." }),
  oral("e-sleep", "expliquer", [
    "Pourquoi le sommeil est-il important ?",
    "Pourquoi un bon sommeil compte-t-il pour la santé ?",
    "Quels rôles le sommeil joue-t-il dans la récupération et la mémoire ?",
  ], { model: "Le sommeil favorise la récupération et la consolidation de la mémoire." }),
  oral("e-activity", "expliquer", [
    "Pourquoi bouger chaque jour ?",
    "Pourquoi l'activité physique est-elle utile avec l'âge ?",
    "Comment l'activité physique complète-t-elle l'alimentation pour préserver l'autonomie ?",
  ], { model: "L'activité physique entretient le cœur, les muscles et l'équilibre." }),
  oral("e-breakfast", "expliquer", [
    "Que serait un bon petit-déjeuner ?",
    "Que conseilleriez-vous pour un petit-déjeuner équilibré ?",
    "Comment composeriez-vous un petit-déjeuner équilibré pour une personne âgée ?",
  ], { model: "Un produit laitier, un féculent complet et un fruit." }),

  // ——— Reformulation (suite) ———
  oral("f-fibres", "reformuler", ["Les fibres favorisent le transit intestinal."], { model: "Les fibres aident l'intestin à bien fonctionner." }),
  oral("f-soda", "reformuler", ["Les sodas apportent beaucoup de sucres rapides."], { model: "Les sodas sont très sucrés." }),
  oral("f-walk", "reformuler", ["Une marche quotidienne protège le cœur."], { model: "Marcher chaque jour est bon pour le cœur." }),

  // ——— Élocution progressive (suite) ———
  oral("r-muscle", "lire", [
    "Les protéines protègent les muscles.",
    "Les protéines aident à maintenir la masse musculaire.",
    "Un apport suffisant en protéines aide à maintenir la masse musculaire avec l'âge.",
  ]),
  oral("r-olive", "lire", [
    "L'huile d'olive est bonne pour le cœur.",
    "L'huile d'olive apporte des graisses insaturées.",
    "L'huile d'olive apporte des graisses insaturées favorables à la santé cardiovasculaire.",
  ]),
  oral("r-water", "lire", [
    "Il faut boire régulièrement.",
    "Il faut boire régulièrement, même sans soif.",
    "Avec l'âge, il faut boire régulièrement, même sans ressentir la soif.",
  ]),
];

const TOPIC_BY_ID: Record<string, Topic> = {
  "cu-joconde": "art", "cu-monet": "art", "cu-rome": "geographie", "cu-thames": "geographie", "cu-gaudi": "art", "cu-eiffel": "geographie",
  "cu-pasteur": "sciences", "cu-fleming": "medecine", "cu-curie": "sciences", "cu-mercury": "sciences", "cu-hippo": "medecine",
  "v-glyc": "medecine", "v-insul": "medecine", "v-hta": "medecine", "v-chol": "medecine", "v-diab": "medecine", "tf-insulin": "medecine",
  "e-med": "sante", "e-sleep": "medecine", "e-activity": "medecine", "e-muscle": "medecine", "i-sleep": "medecine", "i-walk": "medecine",
};
/** Existing core items: clinical nutrition → santé, medical notions → médecine, time → general. */
export function topicOf(i: Item): Topic {
  if (i.topic) return i.topic;
  if (TOPIC_BY_ID[i.id]) return TOPIC_BY_ID[i.id]!;
  if (i.theme === "temps") return "general";
  if (i.id.startsWith("m-")) return "medecine";
  return "sante";
}

// ——— Repères du moment (Actualité) : faits stables du présent, pas de « dernières nouvelles ».
// Year / month / season are computed from today's date. To update when office holders change.
const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
function reperes(now = new Date()): Item[] {
  const y = now.getFullYear();
  const m = now.getMonth();
  const seasons = [o("l'hiver", "winter"), o("le printemps", "spring"), o("l'été", "summer"), o("l'automne", "autumn")];
  const si = m === 11 || m < 2 ? 0 : m < 5 ? 1 : m < 8 ? 2 : 3;
  const R = { topic: "actualite" as Topic };
  return [
    mcq("rp-fr-pres", "avis", "information", "Qui est le président de la France aujourd'hui ?", "président", o("Emmanuel Macron"), [o("François Hollande"), o("Nicolas Sarkozy")], R),
    mcq("rp-us-pres", "avis", "information", "Qui est le président des États-Unis aujourd'hui ?", "États-Unis", o("Donald Trump"), [o("Joe Biden"), o("Barack Obama")], R),
    mcq("rp-year", "temps", "temps", "En quelle année sommes-nous ?", "année", o(String(y)), [o(String(y - 1)), o(String(y + 1))], R),
    mcq("rp-month", "temps", "temps", "Quel mois sommes-nous ?", "mois", o(MONTHS[m] ?? "janvier"), [o(MONTHS[(m + 11) % 12] ?? "décembre"), o(MONTHS[(m + 1) % 12] ?? "février")], R),
    mcq("rp-season", "temps", "temps", "Quelle est la saison en France aujourd'hui ?", "saison", seasons[si] ?? o("l'automne", "autumn"), [seasons[(si + 2) % 4] ?? o("le printemps", "spring"), seasons[(si + 1) % 4] ?? o("l'hiver", "winter")], R),
    mcq("rp-euro", "avis", "information", "Avec quelle monnaie paie-t-on en France ?", "monnaie", o("l'euro"), [o("le dollar"), o("le franc")], R),
    mcq("rp-jo", "avis", "information", "Quelle ville a accueilli les Jeux olympiques de 2024 ?", "Jeux olympiques", o("Paris", "paris"), [o("Londres", "london"), o("Rome", "rome")], R),
    oral("rp-ex-change", "expliquer", ["Le téléphone portable : qu'en pensez-vous ?"], { ...R, image: "phone", hint: "Il permet d'appeler et de recevoir des photos.", model: "Il permet de garder le contact avec ses proches." }),
    oral("rp-ex-season", "expliquer", ["Qu'aimez-vous faire en cette saison ?"], { ...R, image: seasons[si]?.image ?? "calendar", hint: "Une promenade, un plat de saison ou un moment chez soi.", model: "J'aime me promener et profiter des produits de saison." }),
  ];
}
export const REPERES = reperes();

export const BANK: Item[] = [...CORE, ...TOPIC_BANK, ...REPERES];
export const BY_ID = new Map(BANK.map((i) => [i.id, i]));
export const FOLLOW_IDS = new Set(BANK.flatMap((i) => (i.kind === "oral" && i.follow ? [i.follow] : [])));

/** Context photo shown above a question when its answers have no photos.
 * It illustrates the situation described, never the answer. */
export const SCENE: Record<string, string> = {
  "c-hta-salt": "salt", "c-diab-soda": "soda", "c-chol": "butter", "c-hydra": "elderly_meal", "c-constip": "consultation",
  "c-elderly-protein": "elderly_meal", "c-appetite": "elderly_meal", "c-veg": "plate", "c-cardio": "consultation", "cmp-meal": "midday",
  "a-breakfast": "breakfast_sweet", "a-lowprot": "plate", "a-snack": "croissant", "a-fastfood": "fast_food",
  "c-weightloss": "elderly_meal", "c-starch": "bread", "c-salt-indus": "salt", "c-density": "elderly_meal", "c-constip2": "consultation",
  "c-sarco-move": "consultation", "c-diab-bread": "bread", "c-heat": "summer", "c-nofish": "market", "c-indoor": "consultation",
  "c-iron": "consultation", "c-microb": "market",
  "i-nuts": "walnuts", "i-muscle": "walk", "i-fibres": "vegetables", "i-vitd": "summer", "i-salt": "salt", "i-olive": "olive_oil",
  "i-sleep": "sleep", "i-walk": "walk", "i-thirst": "water", "i-combine": "lentils", "i-microb": "vegetables",
  "cat-lentils": "lentils", "cat-salmon": "salmon", "cat-yogurt": "yogurt", "cat-almonds": "almonds",
  "n-lentils": "lentils",
  "m-glyc": "consultation", "m-vitd": "summer", "m-bone": "consultation", "m-anemia": "consultation", "m-b12": "consultation", "m-heart": "consultation",
  "cu-joconde": "mona_lisa", "cu-monet": "monet", "cu-rome": "rome", "cu-thames": "london", "cu-gaudi": "barcelona", "cu-pasteur": "book",
  "cu-fleming": "book", "cu-curie": "book", "cu-mercury": "astronomy", "cu-hippo": "book", "cu-eiffel": "paris",
  "t-twice": "calendar", "t-15h": "calendar", "t-bilan": "consultation", "t-meal": "plate", "t-week": "calendar", "t-evening": "evening",
  "t-season": "calendar", "t-2h": "plate", "t-dinner": "evening", "t-sequence": "consultation", "t-3x": "calendar", "t-kine": "calendar",
  "tf-olive": "olive_oil", "tf-salmon": "salmon", "tf-lentils": "lentils", "tf-vitc": "orange", "tf-water": "water", "tf-soda": "soda",
  "tf-insulin": "consultation", "tf-calcium": "yogurt", "tf-walnuts": "walnuts", "tf-transit": "vegetables", "tf-protage": "elderly_meal",
  "rp-fr-pres": "elysee", "rp-us-pres": "white_house", "rp-year": "calendar", "rp-month": "calendar", "rp-euro": "market", "rp-jo": "paris",
  "tf-vitdsun": "summer", "tf-saltbp": "salt",
  "sq-mediterranee-r": "legumes", "v-legum": "legumes",
};
