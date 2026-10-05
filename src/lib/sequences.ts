// Thematic mini-sequences: one subject carried through
// Comprendre (listen + choose) → Retrouver (find the word) → S'exprimer (opinion) → Reformuler.
// Short wording, adult content, consensual and timeless facts.
import type { EvokeItem, McqItem, OralItem, Topic } from "./content";

export type Stage = "comprendre" | "retrouver" | "exprimer" | "reformuler";
export type Sequence = { id: string; topic: Topic; title: string; items: [McqItem, EvokeItem, OralItem, OralItem] };

type S = {
  info: string; q: string; a: string; d: [string, string, string];
  find: string; word: string; hint: string; syl: string; wordModel: string;
  ask: string; askModel: string;
  say: string; sayModel: string;
};

const opt = (label: string) => ({ label });
const keyOf = (s: string) => s.replace(/[?.,']/g, " ").split(/\s+/).filter((w) => w.length > 5).slice(-1)[0] ?? "";

function seq(id: string, topic: Topic, title: string, s: S): Sequence {
  return {
    id, topic, title,
    items: [
      { id: `${id}-c`, topic, theme: "sciences", skill: "information", kind: "mcq", audio: s.info, question: s.q, keyword: keyOf(s.info), answer: opt(s.a), distractors: s.d.map(opt) },
      { id: `${id}-r`, topic, theme: "sciences", skill: "evocation", kind: "evoke", audio: s.find, answer: s.word, hint: s.hint, syllable: s.syl, model: s.wordModel },
      { id: `${id}-e`, topic, theme: "expression", skill: "expression", kind: "oral", mode: "expliquer", steps: [s.ask], model: s.askModel },
      { id: `${id}-f`, topic, theme: "expression", skill: "expression", kind: "oral", mode: "reformuler", steps: [`${s.say} Pouvez-vous le dire avec vos mots ?`], model: s.sayModel },
    ],
  };
}

export const SEQUENCES: Sequence[] = [
  // ——— Art ———
  seq("sq-monet", "art", "Monet et la lumière", {
    info: "Claude Monet peignait parfois le même sujet à différents moments de la journée, pour saisir les variations de lumière.",
    q: "Quelle idée était importante dans son travail ?", a: "les variations de lumière", d: ["la précision anatomique", "les scènes de bataille", "les portraits officiels"],
    find: "Comment appelle-t-on le mouvement artistique associé à Monet ?", word: "impressionnisme", hint: "Son nom vient d'un tableau intitulé « Impression, soleil levant ».", syl: "im…", wordModel: "Monet est une figure de l'impressionnisme.",
    ask: "À votre avis, pourquoi la lumière intéressait-elle autant les impressionnistes ?", askModel: "Ils voulaient montrer l'impression visuelle d'un instant, qui change avec la lumière.",
    say: "Les impressionnistes peignaient souvent en plein air.", sayModel: "Ils sortaient de l'atelier pour peindre directement dehors.",
  }),
  seq("sq-renaissance", "art", "La Renaissance", {
    info: "À la Renaissance, les peintres italiens ont développé la perspective pour donner l'illusion de la profondeur.",
    q: "À quoi servait la perspective ?", a: "donner l'illusion de la profondeur", d: ["rendre les couleurs plus vives", "peindre plus vite", "imiter la sculpture grecque"],
    find: "Qui a peint La Joconde ?", word: "Léonard de Vinci", hint: "Peintre, ingénieur et savant italien.", syl: "Léo…", wordModel: "La Joconde est l'œuvre de Léonard de Vinci.",
    ask: "Selon vous, qu'est-ce qui rend un tableau vraiment marquant ?", askModel: "Un tableau marque quand il nous fait ressentir quelque chose, au-delà de la technique.",
    say: "Léonard de Vinci était à la fois artiste et scientifique.", sayModel: "Il s'intéressait autant à l'art qu'aux sciences.",
  }),
  // ——— Santé / nutrition ———
  seq("sq-mediterranee", "sante", "Le régime méditerranéen", {
    info: "Le régime méditerranéen associe légumes, légumineuses, poisson et huile d'olive. Il est lié à une meilleure santé cardiovasculaire.",
    q: "À quoi ce régime est-il surtout associé ?", a: "une meilleure santé du cœur", d: ["une perte de poids rapide", "un apport élevé en sucre", "la suppression des graisses"],
    find: "Comment appelle-t-on les lentilles, pois chiches et haricots secs ?", word: "légumineuses", hint: "Riches en protéines végétales et en fibres.", syl: "lé…", wordModel: "Les lentilles et les pois chiches sont des légumineuses.",
    ask: "À votre avis, pourquoi ce régime est-il si souvent recommandé ?", askModel: "Il est varié, riche en végétaux et en bonnes graisses, et facile à suivre au quotidien.",
    say: "L'huile d'olive remplace avantageusement le beurre.", sayModel: "Il vaut mieux cuisiner à l'huile d'olive plutôt qu'au beurre.",
  }),
  seq("sq-microbiote", "sante", "Le microbiote", {
    info: "L'intestin abrite des milliards de bactéries. Les fibres alimentaires les nourrissent et favorisent leur diversité.",
    q: "Que favorisent les fibres ?", a: "la diversité des bactéries intestinales", d: ["l'absorption du sel", "la production d'insuline", "la perte musculaire"],
    find: "Comment appelle-t-on l'ensemble des bactéries de l'intestin ?", word: "microbiote", hint: "On parlait autrefois de flore intestinale.", syl: "mi…", wordModel: "L'ensemble de ces bactéries forme le microbiote.",
    ask: "Quels aliments conseilleriez-vous pour prendre soin de son intestin ?", askModel: "Des légumes, des fruits, des légumineuses et des céréales complètes, riches en fibres.",
    say: "Un intestin en bonne santé influence tout l'organisme.", sayModel: "La santé de l'intestin compte pour le corps entier.",
  }),
  seq("sq-sarcopenie", "sante", "Muscles et âge", {
    info: "Avec l'âge, la masse musculaire diminue. Les protéines et l'activité physique aident à la préserver.",
    q: "Qu'est-ce qui aide à préserver les muscles ?", a: "protéines et activité physique", d: ["repos prolongé", "régime sans graisses", "beaucoup de sucre"],
    find: "Comment appelle-t-on la perte de masse musculaire liée à l'âge ?", word: "sarcopénie", hint: "Un mot formé sur le grec « sarx », la chair.", syl: "sar…", wordModel: "La perte musculaire liée à l'âge s'appelle la sarcopénie.",
    ask: "Comment expliqueriez-vous à un patient âgé l'intérêt de bouger chaque jour ?", askModel: "Bouger chaque jour garde les muscles forts et aide à rester autonome.",
    say: "La marche quotidienne entretient la force et l'équilibre.", sayModel: "Marcher tous les jours aide à garder force et équilibre.",
  }),
  // ——— Médecine ———
  seq("sq-diabete", "medecine", "Un cas de diabète", {
    info: "Un homme de soixante ans a soif en permanence et urine souvent. Sa glycémie à jeun est élevée.",
    q: "Quelle hypothèse vient en premier ?", a: "un diabète", d: ["une anémie", "une hypothyroïdie", "une simple fatigue"],
    find: "Quelle hormone fait baisser la glycémie ?", word: "insuline", hint: "Elle est produite par le pancréas.", syl: "in…", wordModel: "C'est l'insuline qui fait baisser la glycémie.",
    ask: "Quels premiers conseils alimentaires lui donneriez-vous ?", askModel: "Limiter les sucres rapides, privilégier les fibres et répartir les repas dans la journée.",
    say: "L'activité physique améliore la sensibilité à l'insuline.", sayModel: "Bouger aide le corps à mieux utiliser l'insuline.",
  }),
  seq("sq-tension", "medecine", "La tension artérielle", {
    info: "Une femme a souvent mal à la tête le matin. Sa tension est mesurée à seize sur dix.",
    q: "Que suggère cette mesure ?", a: "une hypertension", d: ["une hypotension", "une tension normale", "une déshydratation"],
    find: "Quel appareil sert à mesurer la tension ?", word: "tensiomètre", hint: "On le place autour du bras.", syl: "ten…", wordModel: "On mesure la tension avec un tensiomètre.",
    ask: "Selon vous, quelles habitudes aident à faire baisser la tension ?", askModel: "Moins de sel, plus de légumes, une activité régulière et un bon sommeil.",
    say: "L'hypertension est souvent silencieuse pendant des années.", sayModel: "On peut avoir de la tension longtemps sans rien ressentir.",
  }),
  // ——— Sciences ———
  seq("sq-photosynthese", "sciences", "La photosynthèse", {
    info: "Les plantes captent la lumière du soleil. Elles transforment le gaz carbonique et l'eau en sucres, et rejettent de l'oxygène.",
    q: "Que rejettent les plantes ?", a: "de l'oxygène", d: ["du gaz carbonique", "de l'azote", "de la vapeur de sel"],
    find: "Comment s'appelle ce phénomène ?", word: "photosynthèse", hint: "« Photo » veut dire lumière.", syl: "pho…", wordModel: "Ce phénomène s'appelle la photosynthèse.",
    ask: "Pourquoi, selon vous, les forêts sont-elles importantes pour la planète ?", askModel: "Elles produisent de l'oxygène et absorbent une partie du gaz carbonique.",
    say: "Sans lumière, une plante ne peut pas fabriquer ses sucres.", sayModel: "La plante a besoin de lumière pour se nourrir.",
  }),
  seq("sq-saisons", "sciences", "Les saisons", {
    info: "Les saisons ne viennent pas de la distance au Soleil, mais de l'inclinaison de l'axe de la Terre.",
    q: "D'où viennent les saisons ?", a: "de l'inclinaison de la Terre", d: ["de la distance au Soleil", "de la Lune", "des vents"],
    find: "Comment appelle-t-on le jour le plus long de l'année ?", word: "solstice", hint: "Il a lieu en juin dans notre hémisphère.", syl: "sol…", wordModel: "Le jour le plus long est le solstice d'été.",
    ask: "Quelle saison préférez-vous, et pourquoi ?", askModel: "J'aime le printemps, pour la lumière qui revient et la nature qui se réveille.",
    say: "Quand c'est l'été en France, c'est l'hiver en Australie.", sayModel: "Les saisons sont inversées entre les deux hémisphères.",
  }),
  // ——— Histoire ———
  seq("sq-pasteur", "histoire", "Louis Pasteur", {
    info: "Louis Pasteur a montré que des micro-organismes causent certaines maladies. Il a mis au point un vaccin contre la rage.",
    q: "Contre quelle maladie a-t-il créé un vaccin ?", a: "la rage", d: ["la grippe", "la peste", "le paludisme"],
    find: "Comment appelle-t-on le procédé de chauffage qui porte son nom ?", word: "pasteurisation", hint: "On l'utilise pour le lait.", syl: "pas…", wordModel: "Ce procédé s'appelle la pasteurisation.",
    ask: "À votre avis, quelle découverte médicale a le plus changé nos vies ?", askModel: "Les vaccins et les antibiotiques ont sauvé un très grand nombre de vies.",
    say: "Pasteur a profondément changé l'hygiène et la médecine.", sayModel: "Grâce à lui, l'hygiène est devenue essentielle en médecine.",
  }),
  seq("sq-rome", "histoire", "Rome antique", {
    info: "Les Romains construisaient des aqueducs pour amener l'eau dans les villes, parfois sur des dizaines de kilomètres.",
    q: "À quoi servaient les aqueducs ?", a: "amener l'eau en ville", d: ["défendre les frontières", "stocker le blé", "relier deux ports"],
    find: "Quel célèbre aqueduc romain se trouve près de Nîmes ?", word: "pont du Gard", hint: "Il enjambe une rivière, le Gardon.", syl: "pont…", wordModel: "Près de Nîmes se trouve le pont du Gard.",
    ask: "Qu'est-ce qui vous impressionne le plus chez les Romains ?", askModel: "Leur sens de l'organisation et leurs constructions, encore debout aujourd'hui.",
    say: "Beaucoup de routes françaises suivent d'anciennes voies romaines.", sayModel: "Nos routes reprennent souvent le tracé des voies romaines.",
  }),
  // ——— Littérature ———
  seq("sq-hugo", "litterature", "Victor Hugo", {
    info: "Victor Hugo a écrit Les Misérables. Il s'est engagé contre la misère et contre la peine de mort.",
    q: "Contre quoi s'est-il engagé ?", a: "la misère et la peine de mort", d: ["l'école obligatoire", "le chemin de fer", "la République"],
    find: "Quel roman de Hugo se déroule autour de la cathédrale de Paris ?", word: "Notre-Dame de Paris", hint: "On y croise Quasimodo et Esmeralda.", syl: "No…", wordModel: "C'est Notre-Dame de Paris.",
    ask: "Selon vous, un écrivain doit-il s'engager dans les débats de son temps ?", askModel: "Je pense qu'un écrivain peut faire réfléchir et donner une voix à ceux qu'on n'entend pas.",
    say: "Les Misérables raconte la vie de Jean Valjean.", sayModel: "Le héros des Misérables s'appelle Jean Valjean.",
  }),
  // ——— Géographie ———
  seq("sq-loire", "geographie", "La Loire", {
    info: "La Loire est le plus long fleuve de France. Sa vallée est célèbre pour ses châteaux de la Renaissance.",
    q: "Pour quoi sa vallée est-elle célèbre ?", a: "ses châteaux", d: ["ses volcans", "ses glaciers", "ses mines de charbon"],
    find: "Quel grand château de la Loire a été voulu par François Ier ?", word: "Chambord", hint: "Il possède un célèbre escalier à double révolution.", syl: "Cham…", wordModel: "François Ier a fait construire Chambord.",
    ask: "Quelle région de France aimez-vous particulièrement, et pourquoi ?", askModel: "J'aime la Provence, pour sa lumière, ses marchés et sa cuisine.",
    say: "La Loire se jette dans l'océan Atlantique.", sayModel: "La Loire termine sa course dans l'Atlantique.",
  }),
  // ——— Nature ———
  seq("sq-abeilles", "nature", "Les abeilles", {
    info: "En butinant, les abeilles transportent le pollen de fleur en fleur. Une grande partie de nos fruits dépend de ce travail.",
    q: "Pourquoi les abeilles sont-elles précieuses ?", a: "elles pollinisent les plantes", d: ["elles chassent les insectes", "elles enrichissent le sol", "elles filtrent l'eau"],
    find: "Comment appelle-t-on le transport du pollen d'une fleur à l'autre ?", word: "pollinisation", hint: "Le mot vient de « pollen ».", syl: "pol…", wordModel: "C'est la pollinisation.",
    ask: "À votre avis, que pourrait-on faire pour protéger les abeilles ?", askModel: "Planter des fleurs, limiter les pesticides et préserver les haies.",
    say: "Sans pollinisateurs, beaucoup de fruits deviendraient rares.", sayModel: "Les pollinisateurs sont indispensables à nos récoltes.",
  }),
  // ——— Technologie ———
  seq("sq-internet", "technologie", "Internet", {
    info: "Le web a été inventé au CERN, près de Genève, pour aider les chercheurs à partager leurs documents.",
    q: "Pourquoi le web a-t-il été inventé ?", a: "partager des documents entre chercheurs", d: ["vendre des produits", "envoyer des télégrammes", "jouer en ligne"],
    find: "Comment appelle-t-on un programme pour naviguer sur Internet ?", word: "navigateur", hint: "Le mot évoque un marin.", syl: "na…", wordModel: "On utilise un navigateur pour aller sur Internet.",
    ask: "Selon vous, Internet a-t-il changé la façon de s'informer sur la santé ?", askModel: "Oui, l'information est plus accessible, mais il faut vérifier les sources.",
    say: "Toute information trouvée en ligne doit être vérifiée.", sayModel: "Il faut contrôler les sources de ce qu'on lit sur Internet.",
  }),
  // ——— Cuisine ———
  seq("sq-epices", "cuisine", "Les épices", {
    info: "Les épices relèvent le goût des plats. Elles permettent aussi de réduire la quantité de sel.",
    q: "Quel autre intérêt ont les épices ?", a: "réduire la quantité de sel", d: ["remplacer les légumes", "conserver le pain", "épaissir les sauces"],
    find: "Quelle épice jaune est utilisée dans le curry ?", word: "curcuma", hint: "Elle donne une couleur orangée aux plats.", syl: "cur…", wordModel: "L'épice jaune du curry, c'est le curcuma.",
    ask: "Quel plat aimez-vous préparer ou partager ?", askModel: "J'aime un tajine aux légumes, parfumé aux épices, partagé en famille.",
    say: "Les herbes fraîches remplacent bien le sel.", sayModel: "On peut assaisonner avec des herbes plutôt qu'avec du sel.",
  }),
  // ——— Sport ———
  seq("sq-marathon", "sport", "Le marathon", {
    info: "Le marathon mesure un peu plus de quarante-deux kilomètres. Son nom vient d'une ville de la Grèce antique.",
    q: "D'où vient le nom du marathon ?", a: "d'une ville grecque", d: ["d'un athlète romain", "d'un dieu égyptien", "d'une montagne"],
    find: "Comment appelle-t-on les grandes compétitions sportives tous les quatre ans ?", word: "Jeux olympiques", hint: "Ils sont nés en Grèce antique.", syl: "Jeux…", wordModel: "Ce sont les Jeux olympiques.",
    ask: "Pourquoi, selon vous, le sport est-il bon pour l'esprit autant que pour le corps ?", askModel: "Il réduit le stress, améliore le sommeil et donne confiance en soi.",
    say: "L'endurance se construit progressivement.", sayModel: "On gagne en endurance petit à petit.",
  }),
];

export const SEQ_ITEMS = SEQUENCES.flatMap((s) => s.items);
export const STAGE_OF = new Map<string, Stage>(SEQUENCES.flatMap((s) => (["comprendre", "retrouver", "exprimer", "reformuler"] as Stage[]).map((st, k) => [s.items[k].id, st] as [string, Stage])));
export const SEQ_TITLE = new Map<string, string>(SEQUENCES.flatMap((s) => s.items.map((i) => [i.id, s.title] as [string, string])));
