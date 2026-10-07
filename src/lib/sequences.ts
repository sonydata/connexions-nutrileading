// Thematic mini-sequences: one subject carried through
// Comprendre (listen + choose) → Retrouver (find the word) → S'exprimer (opinion) → Reformuler.
// Short wording, adult content, consensual and timeless facts.
import type { EvokeItem, McqItem, OralItem, Topic } from "./content";

export type Stage = "comprendre" | "retrouver" | "exprimer" | "reformuler";
export type Sequence = { id: string; topic: Topic; title: string; added?: string | undefined; items: [McqItem, EvokeItem, OralItem, OralItem] };

type S = {
  info: string; q: string; a: string; d: [string, string, string];
  find: string; word: string; hint: string; syl: string; wordModel: string;
  ask: string; askModel: string;
  say: string; sayModel: string;
};

const opt = (label: string) => ({ label });
const keyOf = (s: string) => s.replace(/[?.,']/g, " ").split(/\s+/).filter((w) => w.length > 5).slice(-1)[0] ?? "";

function seq(id: string, topic: Topic, title: string, s: S, added?: string): Sequence {
  return {
    id, topic, title, added,
    items: [
      { id: `${id}-c`, topic, theme: "sciences", skill: "information", kind: "mcq", audio: s.info, question: s.q, keyword: keyOf(s.info), answer: opt(s.a), distractors: s.d.map(opt) },
      { id: `${id}-r`, topic, theme: "sciences", skill: "evocation", kind: "evoke", audio: s.find, answer: s.word, hint: s.hint, syllable: s.syl, model: s.wordModel },
      { id: `${id}-e`, topic, theme: "expression", skill: "expression", kind: "oral", mode: "expliquer", steps: [s.ask], model: s.askModel },
      { id: `${id}-f`, topic, theme: "expression", skill: "expression", kind: "oral", mode: "reformuler", steps: [`${s.say}`], model: s.sayModel },
    ],
  };
}

const NEW = "2026-10-06";

export const SEQUENCES: Sequence[] = [
  // ——— Art ———
  seq("sq-monet", "art", "Monet et la lumière", {
    info: "Monet peignait le même sujet à différentes heures. La lumière changeait.",
    q: "Qu'est-ce qui intéressait Monet ?", a: "les variations de lumière", d: ["la précision anatomique", "les scènes de bataille", "les portraits officiels"],
    find: "Quel mouvement artistique associe-t-on à Monet ?", word: "impressionnisme", hint: "Son nom commence comme « impression ».", syl: "im…", wordModel: "Monet est une figure de l'impressionnisme.",
    ask: "Pourquoi peindre la lumière, selon vous ?", askModel: "Ils voulaient montrer l'impression visuelle d'un instant, qui change avec la lumière.",
    say: "Les impressionnistes peignaient souvent en plein air.", sayModel: "Ils sortaient de l'atelier pour peindre directement dehors.",
  }),
  seq("sq-renaissance", "art", "La Renaissance", {
    info: "À la Renaissance, les peintres utilisent la perspective. Elle donne de la profondeur au tableau.",
    q: "À quoi servait la perspective ?", a: "donner l'illusion de la profondeur", d: ["rendre les couleurs plus vives", "peindre plus vite", "imiter la sculpture grecque"],
    find: "Qui a peint La Joconde ?", word: "Léonard de Vinci", hint: "Peintre, ingénieur et savant italien.", syl: "Léo…", wordModel: "La Joconde est l'œuvre de Léonard de Vinci.",
    ask: "Qu'est-ce qui vous marque dans un tableau ?", askModel: "Un tableau marque quand il nous fait ressentir quelque chose, au-delà de la technique.",
    say: "Léonard de Vinci était à la fois artiste et scientifique.", sayModel: "Il s'intéressait autant à l'art qu'aux sciences.",
  }),
  // ——— Santé / nutrition ———
  seq("sq-mediterranee", "sante", "Le régime méditerranéen", {
    info: "Le régime méditerranéen associe légumes, légumineuses, poisson et huile d'olive. Il est lié à une meilleure santé cardiovasculaire.",
    q: "Quel bénéfice pour la santé ?", a: "une meilleure santé du cœur", d: ["une perte de poids rapide", "un apport élevé en sucre", "la suppression des graisses"],
    find: "Comment appelle-t-on les lentilles, pois chiches et haricots secs ?", word: "légumineuses", hint: "Riches en protéines végétales et en fibres.", syl: "lé…", wordModel: "Les lentilles et les pois chiches sont des légumineuses.",
    ask: "Pourquoi conseiller ce régime ?", askModel: "Il est varié, riche en végétaux et en bonnes graisses, et facile à suivre au quotidien.",
    say: "L'huile d'olive remplace avantageusement le beurre.", sayModel: "Il vaut mieux cuisiner à l'huile d'olive plutôt qu'au beurre.",
  }),
  seq("sq-microbiote", "sante", "Le microbiote", {
    info: "L'intestin abrite des milliards de bactéries. Les fibres alimentaires les nourrissent et favorisent leur diversité.",
    q: "Que favorisent les fibres ?", a: "la diversité des bactéries intestinales", d: ["l'absorption du sel", "la production d'insuline", "la perte musculaire"],
    find: "Comment appelle-t-on l'ensemble des bactéries de l'intestin ?", word: "microbiote", hint: "On parlait autrefois de flore intestinale.", syl: "mi…", wordModel: "L'ensemble de ces bactéries forme le microbiote.",
    ask: "Quels aliments conseiller pour l'intestin ?", askModel: "Des légumes, des fruits, des légumineuses et des céréales complètes, riches en fibres.",
    say: "Un intestin en bonne santé influence tout l'organisme.", sayModel: "La santé de l'intestin compte pour le corps entier.",
  }),
  seq("sq-sarcopenie", "sante", "Muscles et âge", {
    info: "Avec l'âge, la masse musculaire diminue. Les protéines et l'activité physique aident à la préserver.",
    q: "Qu'est-ce qui aide à préserver les muscles ?", a: "protéines et activité physique", d: ["repos prolongé", "régime sans graisses", "beaucoup de sucre"],
    find: "Comment se nomme la perte de muscles avec l'âge ?", word: "sarcopénie", hint: "Elle touche les muscles et la force.", syl: "sar…", wordModel: "La perte musculaire liée à l'âge s'appelle la sarcopénie.",
    ask: "Pourquoi bouger chaque jour, avec l'âge ?", askModel: "Bouger chaque jour garde les muscles forts et aide à rester autonome.",
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
    ask: "Comment faire baisser la tension ?", askModel: "Moins de sel, plus de légumes, une activité régulière et un bon sommeil.",
    say: "L'hypertension est souvent silencieuse pendant des années.", sayModel: "On peut avoir de la tension longtemps sans rien ressentir.",
  }),
  // ——— Sciences ———
  seq("sq-photosynthese", "sciences", "La photosynthèse", {
    info: "Grâce à la lumière, les plantes fabriquent des sucres. Elles rejettent de l'oxygène.",
    q: "Que rejettent les plantes ?", a: "de l'oxygène", d: ["du gaz carbonique", "de l'azote", "de la vapeur de sel"],
    find: "Comment s'appelle ce phénomène ?", word: "photosynthèse", hint: "« Photo » veut dire lumière.", syl: "pho…", wordModel: "Ce phénomène s'appelle la photosynthèse.",
    ask: "Pourquoi les forêts sont-elles importantes ?", askModel: "Elles produisent de l'oxygène et absorbent une partie du gaz carbonique.",
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
    ask: "Quelle découverte médicale vous semble essentielle ?", askModel: "Les vaccins et les antibiotiques ont sauvé un très grand nombre de vies.",
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
    ask: "Un écrivain doit-il prendre position, selon vous ?", askModel: "Je pense qu'un écrivain peut faire réfléchir et donner une voix à ceux qu'on n'entend pas.",
    say: "Les Misérables raconte la vie de Jean Valjean.", sayModel: "Le héros des Misérables s'appelle Jean Valjean.",
  }),
  // ——— Géographie ———
  seq("sq-loire", "geographie", "La Loire", {
    info: "La Loire est le plus long fleuve de France. Sa vallée est célèbre pour ses châteaux de la Renaissance.",
    q: "Pour quoi sa vallée est-elle célèbre ?", a: "ses châteaux", d: ["ses volcans", "ses glaciers", "ses mines de charbon"],
    find: "Quel grand château de la Loire a été voulu par François Ier ?", word: "Chambord", hint: "Il possède un célèbre escalier à double révolution.", syl: "Cham…", wordModel: "François Ier a fait construire Chambord.",
    ask: "Quelle région de France aimez-vous ?", askModel: "J'aime la Provence, pour sa lumière, ses marchés et sa cuisine.",
    say: "La Loire se jette dans l'océan Atlantique.", sayModel: "La Loire termine sa course dans l'Atlantique.",
  }),
  // ——— Nature ———
  seq("sq-abeilles", "nature", "Les abeilles", {
    info: "En butinant, les abeilles transportent le pollen de fleur en fleur. Une grande partie de nos fruits dépend de ce travail.",
    q: "Pourquoi les abeilles sont-elles précieuses ?", a: "elles pollinisent les plantes", d: ["elles chassent les insectes", "elles enrichissent le sol", "elles filtrent l'eau"],
    find: "Comment appelle-t-on le transport du pollen d'une fleur à l'autre ?", word: "pollinisation", hint: "Le mot vient de « pollen ».", syl: "pol…", wordModel: "C'est la pollinisation.",
    ask: "Comment protéger les abeilles ?", askModel: "Planter des fleurs, limiter les pesticides et préserver les haies.",
    say: "Sans pollinisateurs, beaucoup de fruits deviendraient rares.", sayModel: "Les pollinisateurs sont indispensables à nos récoltes.",
  }),
  // ——— Technologie ———
  seq("sq-internet", "technologie", "Internet", {
    info: "Le web a été inventé au CERN, près de Genève, pour aider les chercheurs à partager leurs documents.",
    q: "Pourquoi le web a-t-il été inventé ?", a: "partager des documents entre chercheurs", d: ["vendre des produits", "envoyer des télégrammes", "jouer en ligne"],
    find: "Comment appelle-t-on un programme pour naviguer sur Internet ?", word: "navigateur", hint: "Le mot évoque un marin.", syl: "na…", wordModel: "On utilise un navigateur pour aller sur Internet.",
    ask: "Internet aide-t-il à s'informer sur la santé ?", askModel: "Oui, l'information est plus accessible, mais il faut vérifier les sources.",
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
    find: "Quelle compétition sportive revient tous les quatre ans ?", word: "Jeux olympiques", hint: "Ils sont nés en Grèce antique.", syl: "Jeux…", wordModel: "Ce sont les Jeux olympiques.",
    ask: "Le sport aide-t-il aussi l'esprit, selon vous ?", askModel: "Il réduit le stress, améliore le sommeil et donne confiance en soi.",
    say: "L'endurance se construit progressivement.", sayModel: "On gagne en endurance petit à petit.",
  }),
  // ——— Ajouts : séries « Grandes découvertes », « Voyage en Italie », « Courants artistiques » ———
  seq("sq-penicilline", "medecine", "La pénicilline", {
    info: "Fleming observe une moisissure. Autour d'elle, les bactéries ne se développent plus.",
    q: "Qu'a-t-il observé ?", a: "une moisissure qui arrête les bactéries", d: ["un virus qui se multiplie", "un vaccin efficace", "une bactérie qui guérit"],
    find: "Quel premier antibiotique est né de cette découverte ?", word: "pénicilline", hint: "Son nom vient de la moisissure Penicillium.", syl: "pé…", wordModel: "C'est la pénicilline, le premier antibiotique.",
    ask: "Pourquoi être prudent avec les antibiotiques ?", askModel: "Un usage excessif rend les bactéries résistantes, et les antibiotiques deviennent moins efficaces.",
    say: "Le hasard a joué un rôle dans cette découverte.", sayModel: "Cette découverte doit beaucoup à une observation inattendue.",
  }, NEW),
  seq("sq-adn", "sciences", "L'ADN", {
    info: "En 1953, Watson et Crick décrivent l'ADN. Les images de Rosalind Franklin les ont aidés.",
    q: "Qu'ont-ils décrit ?", a: "la structure de l'ADN", d: ["le premier vaccin", "la circulation du sang", "la structure de l'atome"],
    find: "Comment appelle-t-on la forme en spirale de l'ADN ?", word: "double hélice", hint: "Deux brins enroulés l'un autour de l'autre.", syl: "dou…", wordModel: "L'ADN a la forme d'une double hélice.",
    ask: "Que peut apporter la génétique à la médecine ?", askModel: "Elle peut aider à mieux prévenir certaines maladies et à adapter les traitements à chacun.",
    say: "L'ADN porte l'information héréditaire.", sayModel: "C'est par l'ADN que se transmet l'hérédité.",
  }, NEW),
  seq("sq-imagerie", "medecine", "L'imagerie médicale", {
    info: "En 1895, Wilhelm Röntgen découvre les rayons X. Pour la première fois, on peut voir l'intérieur du corps sans opérer.",
    q: "Qu'ont permis les rayons X ?", a: "voir l'intérieur du corps sans opérer", d: ["soigner les infections", "mesurer la tension", "analyser le sang"],
    find: "Quel examen utilise un puissant aimant pour voir les organes ?", word: "IRM", hint: "Imagerie par résonance magnétique.", syl: "I…", wordModel: "C'est l'IRM, l'imagerie par résonance magnétique.",
    ask: "Les images aident-elles à expliquer un diagnostic ?", askModel: "Elle aide à expliquer le diagnostic, mais l'examen clinique et l'écoute restent essentiels.",
    say: "Une radiographie montre surtout les os.", sayModel: "Les os apparaissent très bien sur une radiographie.",
  }, NEW),
  seq("sq-langage", "sciences", "Le langage et le cerveau", {
    info: "En 1861, le médecin Paul Broca identifie une zone du cerveau liée à la production du langage.",
    q: "À quoi cette zone est-elle liée ?", a: "la production du langage", d: ["la vision", "l'équilibre", "la digestion"],
    find: "Comment s'appelle la capacité du cerveau à s'adapter ?", word: "plasticité", hint: "Le même mot désigne la souplesse d'une matière qu'on peut modeler.", syl: "plas…", wordModel: "On parle de plasticité cérébrale.",
    ask: "Qu'est-ce qui nourrit votre curiosité ?", askModel: "La curiosité, les échanges avec les autres, la lecture et l'activité physique.",
    say: "Apprendre crée de nouvelles connexions.", sayModel: "Chaque apprentissage tisse de nouveaux liens.",
  }, NEW),
  seq("sq-florence", "art", "Florence", {
    info: "Florence est le berceau de la Renaissance. La famille Médicis y a soutenu de nombreux artistes.",
    q: "Qui a soutenu les artistes à Florence ?", a: "la famille Médicis", d: ["les empereurs romains", "les rois de France", "les doges de Venise"],
    find: "Quelle célèbre statue de Michel-Ange se trouve à Florence ?", word: "David", hint: "Le personnage biblique qui a vaincu Goliath.", syl: "Da…", wordModel: "C'est le David de Michel-Ange.",
    ask: "Pourquoi soutenir les artistes ?", askModel: "Ils donnaient aux artistes les moyens de travailler et de créer de grandes œuvres.",
    say: "Florence est traversée par l'Arno.", sayModel: "Le fleuve de Florence s'appelle l'Arno.",
  }, NEW),
  seq("sq-venise", "geographie", "Venise", {
    info: "Venise est bâtie sur une lagune. On s'y déplace à pied ou en bateau, le long des canaux.",
    q: "Comment se déplace-t-on à Venise ?", a: "à pied ou en bateau", d: ["en tramway", "en voiture", "en métro"],
    find: "Comment s'appelle le bateau noir typique de Venise ?", word: "gondole", hint: "Un batelier la mène debout, avec une seule rame.", syl: "gon…", wordModel: "C'est la gondole.",
    ask: "Comment protéger Venise, selon vous ?", askModel: "Il faut la protéger des grandes marées et mieux répartir l'afflux de visiteurs.",
    say: "Le Grand Canal traverse toute la ville.", sayModel: "La ville est traversée par le Grand Canal.",
  }, NEW),
  seq("sq-pompei", "histoire", "Naples et Pompéi", {
    info: "En l'an 79, l'éruption du Vésuve a enseveli la ville de Pompéi, près de Naples.",
    q: "Qu'est-il arrivé à Pompéi ?", a: "elle a été ensevelie par une éruption", d: ["elle a été inondée", "elle a brûlé dans un incendie", "elle a été abandonnée"],
    find: "Comment s'appelle le volcan qui domine Naples ?", word: "Vésuve", hint: "Il est toujours actif aujourd'hui.", syl: "Vé…", wordModel: "Le volcan de Naples est le Vésuve.",
    ask: "Que nous apprennent les ruines de Pompéi ?", askModel: "Elles montrent la vie quotidienne des Romains, figée en un instant.",
    say: "Naples est la ville natale de la pizza.", sayModel: "La pizza est née à Naples.",
  }, NEW),
  seq("sq-cubisme", "art", "Le cubisme", {
    info: "Au début du vingtième siècle, Picasso et Braque montrent un même objet sous plusieurs angles à la fois.",
    q: "Que cherchaient-ils à montrer ?", a: "un objet sous plusieurs angles", d: ["un paysage au coucher du soleil", "un portrait très réaliste", "une scène de bataille"],
    find: "Comment s'appelle ce mouvement ?", word: "cubisme", hint: "Son nom évoque une forme géométrique.", syl: "cu…", wordModel: "Ce mouvement s'appelle le cubisme.",
    ask: "Un tableau doit-il être réaliste ?", askModel: "Pas forcément : il peut aussi exprimer une idée ou une manière de voir.",
    say: "Picasso a peint Guernica contre la guerre.", sayModel: "Guernica est un tableau de Picasso contre la guerre.",
  }, NEW),
  seq("sq-surrealisme", "art", "Le surréalisme", {
    info: "Les surréalistes s'inspiraient des rêves. Salvador Dalí a peint des montres molles qui semblent fondre.",
    q: "De quoi s'inspiraient les surréalistes ?", a: "des rêves", d: ["des batailles", "des natures mortes", "de l'architecture"],
    find: "Quel peintre belge a écrit « Ceci n'est pas une pipe » sous un tableau ?", word: "Magritte", hint: "Il peignait souvent des hommes en chapeau melon.", syl: "Ma…", wordModel: "C'est René Magritte.",
    ask: "Pourquoi peindre les rêves, selon vous ?", askModel: "Ils libèrent l'imagination et montrent ce qu'on ne voit pas d'habitude.",
    say: "Le surréalisme est aussi un mouvement littéraire.", sayModel: "Le surréalisme touche autant la poésie que la peinture.",
  }, NEW),
];

export const SEQ_ITEMS = SEQUENCES.flatMap((s) => s.items);
export const STAGE_OF = new Map<string, Stage>(SEQUENCES.flatMap((s) => (["comprendre", "retrouver", "exprimer", "reformuler"] as Stage[]).map((st, k) => [s.items[k]!.id, st] as [string, Stage])));
export const SEQ_TITLE = new Map<string, string>(SEQUENCES.flatMap((s) => s.items.map((i) => [i.id, s.title] as [string, string])));

export const SEQ_BY_ID = new Map(SEQUENCES.map((s) => [s.id, s]));

/** Intellectual collections — ordered, so they also act as multi-day series. */
export type Collection = { id: string; title: string; ids: string[] };
export const COLLECTIONS: Collection[] = [
  { id: "decouvertes", title: "Les grandes découvertes scientifiques", ids: ["sq-pasteur", "sq-penicilline", "sq-adn", "sq-imagerie", "sq-langage"] },
  { id: "italie", title: "Voyage en Italie", ids: ["sq-rome", "sq-florence", "sq-renaissance", "sq-venise", "sq-pompei"] },
  { id: "courants", title: "Les grands courants artistiques", ids: ["sq-renaissance", "sq-monet", "sq-cubisme", "sq-surrealisme"] },
  { id: "nutrition", title: "Nutrition et vieillissement", ids: ["sq-mediterranee", "sq-microbiote", "sq-sarcopenie", "sq-diabete", "sq-tension", "sq-epices"] },
];
/** A collection is "new" for three weeks after one of its paths was added. */
export const isFresh = (c: Collection, now = Date.now()) => c.ids.some((id) => { const a = SEQ_BY_ID.get(id)?.added; return !!a && now - new Date(a).getTime() < 21 * 864e5; });
/** Explored = the opening step of the path has been answered at least once. */
export const exploredSeqs = (itemIds: Iterable<string | null>) => { const out = new Set<string>(); for (const i of itemIds) if (i?.endsWith("-c")) out.add(i.slice(0, -2)); return out; };
