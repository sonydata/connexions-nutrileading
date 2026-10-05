// Local, reusable content bank. No AI is used to build sessions.
// Language stays short; content stays professional ("langage simple ≠ contenu simple").

export type Theme = "nutrition" | "avis" | "sciences" | "temps" | "expression";
export type Skill = "lexique" | "conseil" | "information" | "temps" | "completion" | "expression";
export type Opt = { label: string; image?: string | undefined };

type Base = { id: string; theme: Theme; skill: Skill };
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
  answer?: string; // shown to the caregiver as a cue
  follow?: string; // id of an item played right after
};
export type Item = McqItem | TfItem | CompleteItem | OralItem;

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
  id, theme: "expression", skill: "expression", kind: "oral", mode, steps, ...extra,
});

export const BANK: Item[] = [
  // ——— 1. Questions de nutrition ———
  mcq("n-omega3", "nutrition", "lexique", "Quel aliment apporte le plus d'oméga-3 ?", "oméga-3", o("saumon", "salmon"), [o("pain blanc", "bread"), o("poulet", "chicken"), o("œufs", "eggs")]),
  mcq("n-med-fat", "nutrition", "lexique", "Quelle graisse est privilégiée dans le régime méditerranéen ?", "méditerranéen", o("huile d'olive", "olive_oil"), [o("soda", "soda"), o("beurre", "butter"), o("fromage", "cheese")], { audioShort: "Quelle graisse pour le régime méditerranéen ?" }),
  mcq("n-lentils", "nutrition", "lexique", "Quel nutriment abonde dans les lentilles ?", "lentilles", o("fibres"), [o("alcool"), o("cholestérol"), o("vitamine D")], { audioShort: "Les lentilles apportent surtout… ?" }),
  mcq("n-calcium", "nutrition", "lexique", "Quel aliment est une bonne source de calcium ?", "calcium", o("yaourt", "yogurt"), [o("soda", "soda"), o("pomme", "apple"), o("lentilles", "lentils")]),
  mcq("n-vitc", "nutrition", "lexique", "Quel aliment est riche en vitamine C ?", "vitamine C", o("orange", "orange"), [o("beurre", "butter"), o("pain", "bread"), o("noix", "walnuts")]),
  mcq("n-protein-veg", "nutrition", "lexique", "Quelle est une bonne source de protéines végétales ?", "protéines végétales", o("lentilles", "lentils"), [o("soda", "soda"), o("pomme", "apple"), o("carottes", "carrots")]),
  mcq("n-oats", "nutrition", "lexique", "Quel aliment apporte des fibres solubles au petit-déjeuner ?", "fibres", o("flocons d'avoine", "oats"), [o("beurre", "butter"), o("croissant", "croissant"), o("pain blanc", "bread")], { audioShort: "Quel aliment apporte des fibres ?" }),
  mcq("n-unsat", "nutrition", "lexique", "Quel en-cas apporte des graisses insaturées ?", "insaturées", o("amandes", "almonds"), [o("soda", "soda"), o("croissant", "croissant"), o("fromage", "cheese")]),
  mcq("n-betacarotene", "nutrition", "lexique", "Quel légume est riche en bêta-carotène ?", "bêta-carotène", o("carottes", "carrots"), [o("pain", "bread"), o("œufs", "eggs"), o("brocoli", "broccoli")]),
  mcq("n-sardines", "nutrition", "lexique", "Quel poisson gras est économique et riche en oméga-3 ?", "poisson gras", o("sardines", "sardines"), [o("poulet", "chicken"), o("fromage", "cheese"), o("œufs", "eggs")], { audioShort: "Quel poisson est riche en oméga-3 ?" }),

  // ——— 2. Mini-cas cliniques ———
  mcq("c-hta-salt", "avis", "conseil", "Un patient est hypertendu. Il mange très salé.", "sel", o("réduire le sel", "salt"), [o("boire des sodas", "soda"), o("supprimer l'eau"), o("ajouter du beurre", "butter")], { question: "Quel conseil serait prioritaire ?" }),
  mcq("c-diab-soda", "avis", "conseil", "Un patient diabétique boit beaucoup de sodas.", "sucre", o("remplacer par de l'eau", "water"), [o("ajouter du sel", "salt"), o("supprimer les légumes"), o("boire plus de jus")], { question: "Que conseilleriez-vous d'abord ?" }),
  mcq("c-chol", "avis", "conseil", "Un patient a un cholestérol élevé. Il cuisine au beurre.", "graisses", o("cuisiner à l'huile d'olive", "olive_oil"), [o("boire moins d'eau"), o("manger plus de sucre"), o("ajouter du fromage", "cheese")], { question: "Quel changement proposeriez-vous ?" }),
  mcq("c-hydra", "avis", "conseil", "Un patient boit très peu dans la journée.", "hydratation", o("boire régulièrement de l'eau", "water"), [o("manger plus salé", "salt"), o("boire un soda le soir", "soda"), o("attendre d'avoir soif")], { question: "Quel conseil serait le plus approprié ?" }),
  mcq("c-constip", "avis", "conseil", "Une patiente souffre de constipation.", "transit", o("plus de fibres et d'eau", "vegetables"), [o("plus de sodas", "soda"), o("moins de légumes"), o("plus de pain blanc", "bread")], { question: "Que lui conseilleriez-vous ?" }),
  mcq("c-elderly-protein", "avis", "conseil", "Une personne âgée perd de la masse musculaire.", "muscle", o("augmenter les protéines", "eggs"), [o("supprimer la viande"), o("boire plus de sodas", "soda"), o("manger moins")], { question: "Quel apport faut-il surveiller ?" }),
  mcq("c-appetite", "avis", "conseil", "Un patient âgé a perdu l'appétit.", "appétit", o("petits repas enrichis"), [o("sauter le dîner"), o("un seul gros repas"), o("ne boire que de l'eau")], { question: "Quelle stratégie proposeriez-vous ?" }),
  mcq("c-veg", "avis", "conseil", "Une personne mange très peu de légumes.", "légumes", o("en ajouter à chaque repas", "vegetables"), [o("prendre un soda", "soda"), o("manger plus de pain", "bread"), o("attendre l'été")], { question: "Quel conseil donneriez-vous ?" }),
  mcq("c-cardio", "avis", "conseil", "Un patient veut protéger son cœur.", "cœur", o("poisson gras deux fois par semaine", "salmon"), [o("plus de fritures", "fast_food"), o("moins d'eau"), o("plus de beurre", "butter")], { question: "Que recommanderiez-vous ?" }),

  // ——— 4. Comparaisons ———
  mcq("cmp-fibres", "nutrition", "lexique", "Lequel contient le plus de fibres ?", "fibres", o("lentilles", "lentils"), [o("poulet", "chicken"), o("pain blanc", "bread")]),
  mcq("cmp-protein", "nutrition", "lexique", "Lequel est la meilleure source de protéines ?", "protéines", o("poulet", "chicken"), [o("soda", "soda"), o("pomme", "apple")]),
  mcq("cmp-omega", "nutrition", "lexique", "Lequel conseilleriez-vous pour les oméga-3 ?", "oméga-3", o("sardines", "sardines"), [o("croissant", "croissant"), o("poulet", "chicken")]),
  mcq("cmp-meal", "avis", "conseil", "Pour le déjeuner, quel repas semble le plus équilibré ?", "équilibré", o("poisson, légumes, riz", "balanced_meal"), [o("burger, frites, soda", "fast_food"), o("croissant", "croissant")]),

  // ——— 5. Courtes informations scientifiques ———
  mcq("i-nuts", "sciences", "information", "Les noix apportent des acides gras insaturés.", "noix", o("des graisses", "walnuts"), [o("des sucres"), o("du sel", "salt"), o("des fibres")], { question: "De quel type de nutriment parlait-on ?" }),
  mcq("i-muscle", "sciences", "information", "Les protéines aident à maintenir la masse musculaire.", "protéines", o("le muscle"), [o("les os"), o("la peau"), o("le foie")], { question: "Quel tissu cherche-t-on à préserver ?" }),
  mcq("i-fibres", "sciences", "information", "Les fibres favorisent un bon transit intestinal.", "fibres", o("l'intestin"), [o("le cœur"), o("les poumons"), o("l'estomac")], { question: "Quel organe était concerné ?" }),
  mcq("i-vitd", "sciences", "information", "La vitamine D aide à fixer le calcium.", "vitamine D", o("les os"), [o("les cheveux"), o("les yeux"), o("les muscles")], { question: "Quelle partie du corps en profite surtout ?" }),
  mcq("i-salt", "sciences", "information", "Un excès de sel peut augmenter la tension artérielle.", "tension", o("la tension"), [o("la vue"), o("la glycémie"), o("le cholestérol")], { question: "Qu'est-ce qui peut augmenter ?" }),
  mcq("i-olive", "sciences", "information", "L'huile d'olive est au cœur du régime crétois.", "crétois", o("l'huile d'olive", "olive_oil"), [o("le beurre", "butter"), o("le soda", "soda"), o("le fromage", "cheese")], { question: "De quel aliment parlait-on ?" }),

  // ——— 6. Vrai / faux ———
  tf("tf-olive", "L'huile d'olive est surtout composée de graisses insaturées.", true, "huile d'olive"),
  tf("tf-salmon", "Le saumon est une source importante d'oméga-3.", true, "saumon"),
  tf("tf-lentils", "Les lentilles sont pauvres en fibres.", false, "lentilles"),
  tf("tf-vitc", "Les agrumes apportent de la vitamine C.", true, "agrumes"),
  tf("tf-water", "La sensation de soif diminue souvent avec l'âge.", true, "soif"),
  tf("tf-soda", "Les sodas sont une bonne source de protéines.", false, "sodas"),
  tf("tf-insulin", "L'insuline est produite par le pancréas.", true, "insuline"),
  tf("tf-calcium", "Le calcium est important pour les os.", true, "calcium"),

  // ——— 13. Culture médicale ———
  mcq("m-glyc", "sciences", "information", "Quel organe régule principalement la glycémie ?", "glycémie", o("le pancréas"), [o("les poumons"), o("le foie"), o("les reins")]),
  mcq("m-vitd", "sciences", "information", "Quelle vitamine est produite grâce au soleil ?", "soleil", o("vitamine D"), [o("vitamine C"), o("vitamine B12"), o("vitamine A")]),
  mcq("m-bone", "sciences", "information", "Quel minéral est essentiel à la santé osseuse ?", "os", o("le calcium"), [o("le sodium"), o("le fer"), o("le potassium")]),
  mcq("m-anemia", "sciences", "information", "Quel minéral manque souvent en cas d'anémie ?", "anémie", o("le fer"), [o("le sel"), o("le calcium"), o("le magnésium")]),
  mcq("m-b12", "sciences", "information", "Quelle vitamine se trouve surtout dans les produits animaux ?", "produits animaux", o("vitamine B12"), [o("vitamine C"), o("vitamine K"), o("vitamine D")]),
  mcq("m-heart", "sciences", "information", "Quel organe pompe le sang dans le corps ?", "sang", o("le cœur"), [o("l'estomac"), o("les poumons"), o("le foie")]),

  // ——— 10. Catégorisation ———
  mcq("cat-lentils", "nutrition", "lexique", "Les lentilles appartiennent à quelle catégorie ?", "catégorie", o("légumineuses", "lentils"), [o("poissons"), o("produits laitiers"), o("céréales")]),
  mcq("cat-salmon", "nutrition", "lexique", "Le saumon appartient à quelle catégorie ?", "catégorie", o("poissons gras", "salmon"), [o("légumineuses"), o("produits laitiers"), o("poissons maigres")]),
  mcq("cat-yogurt", "nutrition", "lexique", "Le yaourt appartient à quelle catégorie ?", "catégorie", o("produits laitiers", "yogurt"), [o("féculents"), o("fruits"), o("matières grasses")]),
  mcq("cat-almonds", "nutrition", "lexique", "Les amandes appartiennent à quelle catégorie ?", "catégorie", o("fruits à coque", "almonds"), [o("produits laitiers"), o("légumes verts"), o("légumineuses")]),

  // ——— 11. Votre avis ———
  mcq("a-breakfast", "avis", "conseil", "Petit-déjeuner : pain blanc, confiture, jus.", "petit-déjeuner", o("ajouter une protéine", "yogurt"), [o("ajouter un soda", "soda"), o("supprimer l'eau"), o("doubler la confiture")], { question: "Que modifieriez-vous en priorité ?" }),
  mcq("a-lowprot", "avis", "conseil", "Ce déjeuner contient très peu de protéines.", "protéines", o("œufs", "eggs"), [o("soda", "soda"), o("croissant", "croissant"), o("pain blanc", "bread")], { question: "Quel aliment pourrait être ajouté ?" }),
  mcq("a-snack", "avis", "conseil", "Un patient grignote des viennoiseries l'après-midi.", "en-cas", o("une poignée d'amandes", "almonds"), [o("un soda", "soda"), o("un second croissant", "croissant"), o("rien boire")], { question: "Quel en-cas proposeriez-vous ?" }),
  mcq("a-fastfood", "avis", "conseil", "Un patient déjeune souvent burger, frites et soda.", "déjeuner", o("poisson, légumes, riz", "balanced_meal"), [o("ajouter du sel", "salt"), o("un dessert en plus"), o("supprimer l'eau")], { question: "Quelle alternative suggéreriez-vous ?" }),

  // ——— 14. Temps, situations adultes ———
  mcq("t-twice", "temps", "temps", "Un patient prend son traitement matin et soir.", "matin et soir", o("deux prises"), [o("cinq prises"), o("une prise"), o("trois prises")], { question: "Combien de prises par jour ?" }),
  mcq("t-15h", "temps", "temps", "Le rendez-vous est prévu à 15 heures.", "15 heures", o("l'après-midi", "midday"), [o("la nuit", "night"), o("le matin", "morning")], { question: "Est-ce le matin ou l'après-midi ?" }),
  mcq("t-bilan", "temps", "temps", "Le bilan sanguin se fait avant le déjeuner.", "avant", o("le matin, à jeun", "morning"), [o("la nuit", "night"), o("après le repas"), o("le soir", "evening")], { question: "Quand doit-il être réalisé ?" }),
  mcq("t-meal", "temps", "temps", "Le comprimé se prend au milieu du repas.", "pendant", o("pendant le repas", "plate"), [o("la nuit", "night"), o("une heure avant"), o("après le dessert")], { question: "Quand faut-il le prendre ?" }),
  mcq("t-week", "temps", "temps", "Le contrôle a lieu une fois par semaine.", "semaine", o("sept jours"), [o("un an"), o("un jour"), o("un mois")], { question: "Combien de jours entre deux contrôles ?" }),
  mcq("t-evening", "temps", "temps", "La consultation est prévue à 19 heures.", "19 heures", o("le soir", "evening"), [o("le matin", "morning"), o("midi", "midday")], { question: "À quel moment de la journée ?" }),
  mcq("t-season", "temps", "temps", "Les fraises françaises arrivent au printemps.", "printemps", o("le printemps", "spring"), [o("l'hiver", "winter"), o("l'automne", "autumn"), o("l'été", "summer")], { question: "De quelle saison parle-t-on ?" }),

  // ——— 8. Complétion ———
  comp("k-fattyfish", "Les poissons gras sont riches en…", "oméga-3", "un type de graisse"),
  comp("k-legumes", "Les légumineuses apportent notamment des…", "fibres", "utiles au transit"),
  comp("k-salt", "Un excès de sel peut augmenter la…", "tension", "elle se mesure au bras"),
  comp("k-protein", "Les protéines aident au maintien des…", "muscles", "la masse musculaire"),
  comp("k-fibres", "Les fibres participent au bon fonctionnement de l'…", "intestin", "le transit"),
  comp("k-calcium", "Le calcium est important pour les…", "os", "le squelette"),
  comp("k-citrus", "Les agrumes sont riches en vitamine…", "C", "comme dans les oranges"),

  // ——— 7. Expliquer un concept ———
  oral("e-veg", "expliquer", ["Pourquoi recommande-t-on de manger des légumes ?"]),
  oral("e-prot", "expliquer", ["À quoi servent les protéines ?"]),
  oral("e-salt", "expliquer", ["Pourquoi limiter l'excès de sel ?"]),
  oral("e-fish", "expliquer", ["Pourquoi le poisson est-il intéressant sur le plan nutritionnel ?"]),
  oral("e-fibres", "expliquer", ["Quels aliments sont riches en fibres ?"]),
  oral("e-water", "expliquer", ["Pourquoi l'hydratation compte-t-elle chez la personne âgée ?"]),

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
  oral("f-fish", "reformuler", ["Le poisson gras apporte des oméga-3. Pouvez-vous le dire avec vos mots ?"]),
  oral("f-olive", "reformuler", ["L'huile d'olive protège le cœur. Pouvez-vous le dire avec vos mots ?"]),
  oral("f-protein", "reformuler", ["Après soixante-dix ans, les besoins en protéines augmentent. Pouvez-vous le dire avec vos mots ?"]),

  // ——— 9. Évocation lexicale + intérêt nutritionnel ———
  oral("l-olive", "nommer", ["Quel est cet aliment ?"], { image: "olive_oil", answer: "huile d'olive", follow: "lf-olive" }),
  mcq("lf-olive", "nutrition", "lexique", "Quel est son principal intérêt nutritionnel ?", "intérêt", o("graisses insaturées"), [o("riche en sucre"), o("riche en sel"), o("riche en protéines")]),
  oral("l-lentils", "nommer", ["Quel est cet aliment ?"], { image: "lentils", answer: "lentilles", follow: "lf-lentils" }),
  mcq("lf-lentils", "nutrition", "lexique", "Quel est son principal intérêt nutritionnel ?", "intérêt", o("fibres et protéines"), [o("vitamine C"), o("graisses saturées"), o("calcium")]),
  oral("l-salmon", "nommer", ["Quel est cet aliment ?"], { image: "salmon", answer: "saumon", follow: "lf-salmon" }),
  mcq("lf-salmon", "nutrition", "lexique", "Quel est son principal intérêt nutritionnel ?", "intérêt", o("oméga-3"), [o("fibres"), o("vitamine C"), o("glucides")]),
  oral("l-almonds", "nommer", ["Quel est cet aliment ?"], { image: "almonds", answer: "amandes", follow: "lf-almonds" }),
  mcq("lf-almonds", "nutrition", "lexique", "Quel est son principal intérêt nutritionnel ?", "intérêt", o("bonnes graisses"), [o("vitamine C"), o("sucres rapides"), o("sel")]),
  oral("l-broccoli", "nommer", ["Quel est cet aliment ?"], { image: "broccoli", answer: "brocoli", follow: "lf-broccoli" }),
  mcq("lf-broccoli", "nutrition", "lexique", "Quel est son principal intérêt nutritionnel ?", "intérêt", o("fibres et vitamines"), [o("graisses saturées"), o("sel"), o("protéines animales")]),
  oral("l-oats", "nommer", ["Quel est cet aliment ?"], { image: "oats", answer: "flocons d'avoine", follow: "lf-oats" }),
  mcq("lf-oats", "nutrition", "lexique", "Quel est son principal intérêt nutritionnel ?", "intérêt", o("fibres"), [o("vitamine C"), o("oméga-3"), o("calcium")]),
];

export const BY_ID = new Map(BANK.map((i) => [i.id, i]));
export const FOLLOW_IDS = new Set(BANK.flatMap((i) => (i.kind === "oral" && i.follow ? [i.follow] : [])));
