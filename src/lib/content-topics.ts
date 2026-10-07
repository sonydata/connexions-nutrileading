// Exercises grouped by SUBJECT (topic), so the same skills can be trained
// through the interests each person chooses. Short wording, adult content.
// Facts are consensual and timeless — no news, no invented studies.
import type { EvokeItem, McqItem, OralItem, TfItem, Topic } from "./content";

const opt = (label: string) => ({ label });
/** Key word of the question (never the answer) — shown as a gentle cue. */
const keyOf = (s: string) => s.replace(/[?.,']/g, " ").split(/\s+/).filter((w) => w.length > 5).slice(-1)[0] ?? "";

const q = (id: string, topic: Topic, audio: string, answer: string, distractors: [string, string, string]): McqItem => ({
  id, topic, theme: "sciences", skill: "information", kind: "mcq", audio, keyword: keyOf(audio), answer: opt(answer), distractors: distractors.map(opt),
});
const t = (id: string, topic: Topic, audio: string, answer: boolean, keyword: string): TfItem => ({
  id, topic, theme: "sciences", skill: "information", kind: "tf", audio, answer, keyword,
});
const ex = (id: string, topic: Topic, question: string, model: string): OralItem => ({
  id, topic, theme: "expression", skill: "expression", kind: "oral", mode: "expliquer", steps: [question], model,
});
const rd = (id: string, topic: Topic, steps: [string, string, string]): OralItem => ({
  id, topic, theme: "expression", skill: "elocution", kind: "oral", mode: "lire", steps,
});
const ev = (id: string, topic: Topic, audio: string, answer: string, hint: string, syllable: string, model: string): EvokeItem => ({
  id, topic, theme: "sciences", skill: "evocation", kind: "evoke", audio, answer, hint, syllable, model,
});

export const TOPIC_BANK = [
  // ——— Médecine ———
  q("med-insulin", "medecine", "À quoi sert l'insuline ?", "faire baisser la glycémie", ["digérer les graisses", "produire des globules rouges", "augmenter la tension"]),
  q("med-age-activity", "medecine", "Avec l'âge, comment rester autonome ?", "une activité physique régulière", ["le repos prolongé", "éviter de marcher", "réduire les protéines"]),
  q("med-bp", "medecine", "Quel facteur augmente le risque d'hypertension ?", "un excès de sel", ["la marche quotidienne", "les légumes verts", "un sommeil suffisant"]),
  q("med-sleep", "medecine", "Que fait le cerveau pendant le sommeil profond ?", "il consolide la mémoire", ["il s'arrête complètement", "il digère les repas", "il produit de l'insuline"]),
  q("med-liver", "medecine", "Quel organe transforme les substances du sang ?", "le foie", ["la rate", "le pancréas", "l'estomac"]),
  q("med-vaccine", "medecine", "Comment agit un vaccin ?", "il prépare le système immunitaire", ["il détruit tous les microbes", "il remplace les anticorps", "il soigne une infection en cours"]),
  t("med-tf-heart", "medecine", "Le cœur est un muscle qui fonctionne sans interruption.", true, "cœur"),
  ex("med-ex-autonomy", "medecine", "Pourquoi bouger aide-t-il à rester autonome ?", "L'activité physique entretient la force musculaire, l'équilibre et la mobilité."),
  ex("med-ex-prevention", "medecine", "Pourquoi prévenir les maladies ?", "Prévenir permet d'éviter des maladies plutôt que de devoir les soigner."),
  rd("med-rd-sleep", "medecine", ["Le sommeil répare le corps.", "Un bon sommeil aide le corps à récupérer.", "Un sommeil de qualité aide le corps et la mémoire à récupérer."]),
  ev("med-ev-arterio", "medecine", "Comment se nomme le durcissement des artères ?", "artériosclérose", "Il touche les vaisseaux avec l'âge.", "ar…", "L'artériosclérose est le durcissement des artères."),

  // ——— Sciences ———
  q("sci-photo", "sciences", "Que produit la photosynthèse ?", "de l'oxygène", ["du sel", "du pétrole", "du calcaire"]),
  q("sci-dna", "sciences", "Que contient l'ADN ?", "l'information génétique", ["l'énergie du muscle", "les vitamines", "le calcium des os"]),
  q("sci-moon", "sciences", "Qu'est-ce qui provoque les marées ?", "l'attraction de la Lune", ["le vent du large", "la chaleur du Soleil", "la rotation des nuages"]),
  q("sci-light", "sciences", "Qu'est-ce qui voyage le plus vite ?", "la lumière", ["le son", "le vent", "un avion"]),
  q("sci-water", "sciences", "À quelle température l'eau bout-elle au niveau de la mer ?", "cent degrés", ["cinquante degrés", "zéro degré", "trente-sept degrés"]),
  t("sci-tf-sun", "sciences", "Le Soleil est une étoile.", true, "étoile"),
  ex("sci-ex-method", "sciences", "Pourquoi vérifier une découverte scientifique ?", "Une découverte doit être vérifiée pour s'assurer qu'elle est juste et reproductible."),
  ex("sci-ex-climate", "sciences", "Pourquoi les forêts sont-elles importantes pour la planète ?", "Les forêts produisent de l'oxygène et stockent du carbone."),
  rd("sci-rd-light", "sciences", ["La lumière voyage très vite.", "La lumière du Soleil met huit minutes à nous parvenir.", "La lumière du Soleil met environ huit minutes pour parvenir jusqu'à la Terre."]),
  ev("sci-ev-gravity", "sciences", "Quelle force fait tomber les objets vers le sol ?", "gravité", "Newton l'a décrite.", "gra…", "La gravité attire les objets vers le sol."),

  // ——— Histoire ———
  q("his-revolution", "histoire", "Quel changement apporte la Révolution française ?", "la fin de la monarchie absolue", ["l'invention de l'imprimerie", "la découverte de l'Amérique", "la construction des cathédrales"]),
  q("his-renaissance", "histoire", "Quel changement apporte la Renaissance ?", "un renouveau des arts et des savoirs", ["la disparition de l'écriture", "la fin des villes", "l'abandon des sciences"]),
  q("his-print", "histoire", "Qu'a permis l'imprimerie de Gutenberg ?", "elle a diffusé largement les livres", ["elle a remplacé la monnaie", "elle a créé le téléphone", "elle a supprimé les écoles"]),
  q("his-rome", "histoire", "Quelle langue parlait-on dans l'Empire romain ?", "le latin", ["l'anglais", "l'arabe", "le russe"]),
  q("his-wall", "histoire", "Quel événement marque l'année 1989 à Berlin ?", "la chute du mur de Berlin", ["le premier pas sur la Lune", "la fin de l'Empire romain", "la prise de la Bastille"]),
  q("his-egypt", "histoire", "À quoi servaient les pyramides d'Égypte ?", "de tombeaux pour les pharaons", ["de marchés", "de ports", "d'observatoires modernes"]),
  t("his-tf-1789", "histoire", "La prise de la Bastille a eu lieu en 1789.", true, "1789"),
  ex("his-ex-renaissance", "histoire", "Qu'a changé la Renaissance ?", "La Renaissance a renouvelé les arts, les sciences et la façon de penser."),
  ex("his-ex-print", "histoire", "Pourquoi imprimer les livres a-t-il changé nos vies ?", "L'imprimerie a permis de diffuser les livres et les idées beaucoup plus largement."),
  rd("his-rd-rev", "histoire", ["La Révolution a changé la France.", "La Révolution française a mis fin à la monarchie absolue.", "La Révolution française a mis fin à la monarchie absolue et proclamé les droits de l'homme."]),
  ev("his-ev-pharaon", "histoire", "Comment appelait-on les souverains de l'Égypte ancienne ?", "pharaons", "Les pyramides étaient leurs tombeaux.", "pha…", "Les pharaons régnaient sur l'Égypte ancienne."),

  // ——— Art & culture ———
  q("art-impression", "art", "Qu'est-ce qui distingue la peinture impressionniste ?", "le travail de la lumière et des couleurs", ["des lignes géométriques strictes", "l'absence de couleurs", "des sujets uniquement religieux"]),
  q("art-gothic", "art", "Que remarque-t-on dans une cathédrale gothique ?", "de grands vitraux et des voûtes élevées", ["des toits plats", "des murs sans fenêtres", "des façades en verre moderne"]),
  q("art-mozart", "art", "Quel art pratiquait Mozart ?", "la musique", ["la peinture", "l'architecture", "la médecine"]),
  q("art-cubism", "art", "Quel peintre est associé au cubisme ?", "Picasso", ["Monet", "Rembrandt", "Botticelli"]),
  q("art-louvre", "art", "Dans quel musée parisien se trouve la Joconde ?", "le Louvre", ["le musée d'Orsay", "le Centre Pompidou", "le Grand Palais"]),
  t("art-tf-monet", "art", "Claude Monet a peint la série des Nymphéas.", true, "Nymphéas"),
  ex("art-ex-impression", "art", "Qu'aimez-vous dans la peinture impressionniste ?", "Les impressionnistes cherchaient à saisir la lumière et l'instant."),
  ex("art-ex-museum", "art", "Pourquoi conserver les œuvres d'art ?", "Les œuvres transmettent l'histoire et la sensibilité des époques passées."),
  rd("art-rd-monet", "art", ["Monet peignait la lumière.", "Monet peignait la lumière à différents moments du jour.", "Claude Monet peignait la même scène pour saisir la lumière à différents moments du jour."]),
  ev("art-ev-fresque", "art", "Comment se nomme une peinture sur un enduit frais ?", "fresque", "Michel-Ange en a peint à la chapelle Sixtine.", "fres…", "Une fresque est peinte sur un enduit frais."),

  // ——— Géographie & voyages ———
  q("geo-port", "geographie", "Pourquoi construire une ville autour d'un port ?", "pour le commerce maritime", ["pour éviter la mer", "pour le ski", "pour fuir le soleil"]),
  q("geo-nile", "geographie", "Quel grand fleuve traverse l'Égypte ?", "le Nil", ["la Seine", "le Danube", "l'Amazone"]),
  q("geo-alps", "geographie", "Quel est le plus haut sommet des Alpes ?", "le mont Blanc", ["le mont Ventoux", "le puy de Dôme", "le Vésuve"]),
  q("geo-desert", "geographie", "Quel est le plus grand désert chaud du monde ?", "le Sahara", ["le désert de Gobi", "l'Atacama", "le Kalahari"]),
  q("geo-venice", "geographie", "Quelle ville est célèbre pour ses canaux ?", "Venise", ["Madrid", "Prague", "Vienne"]),
  t("geo-tf-amazon", "geographie", "La forêt amazonienne se trouve principalement au Brésil.", true, "Amazonie"),
  ex("geo-ex-climate", "geographie", "Le climat change-t-il notre façon de vivre ?", "Le climat influence l'habitat, l'alimentation et les activités des habitants."),
  ex("geo-ex-travel", "geographie", "Qu'aimez-vous découvrir en voyage ?", "Un voyage permet de découvrir d'autres cultures et d'autres façons de vivre."),
  rd("geo-rd-nile", "geographie", ["Le Nil traverse l'Égypte.", "Le Nil a permis l'agriculture en Égypte.", "Les crues du Nil ont permis le développement de l'agriculture en Égypte ancienne."]),
  ev("geo-ev-archipel", "geographie", "Comment se nomme un groupe d'îles ?", "archipel", "Les Açores en sont un exemple.", "ar…", "Un archipel est un ensemble d'îles."),

  // ——— Nature ———
  q("nat-bees", "nature", "Pourquoi les abeilles sont-elles essentielles ?", "elles pollinisent les plantes", ["elles produisent du lait", "elles chassent les oiseaux", "elles creusent les sols"]),
  q("nat-migrate", "nature", "Pourquoi certains oiseaux migrent-ils à l'automne ?", "pour trouver nourriture et chaleur", ["pour changer de couleur", "pour hiberner", "pour perdre leurs plumes"]),
  q("nat-roots", "nature", "À quoi servent les racines d'un arbre ?", "à puiser l'eau et à l'ancrer", ["à produire les fruits", "à capter la lumière", "à attirer les oiseaux"]),
  q("nat-whale", "nature", "Qu'est-ce qu'une baleine ?", "un mammifère marin", ["un poisson", "un reptile", "un crustacé"]),
  t("nat-tf-oak", "nature", "Le chêne peut vivre plusieurs siècles.", true, "chêne"),
  ex("nat-ex-biodiv", "nature", "Pourquoi protéger les différentes espèces ?", "La biodiversité maintient l'équilibre des écosystèmes."),
  ex("nat-ex-seasons", "nature", "Comment les arbres se préparent-ils à l'hiver ?", "Beaucoup d'arbres perdent leurs feuilles pour économiser leur énergie."),
  rd("nat-rd-bees", "nature", ["Les abeilles butinent les fleurs.", "Les abeilles transportent le pollen de fleur en fleur.", "En transportant le pollen de fleur en fleur, les abeilles permettent la reproduction des plantes."]),
  ev("nat-ev-hiber", "nature", "Comment se nomme le sommeil des animaux en hiver ?", "hibernation", "La marmotte en est l'exemple.", "hi…", "L'hibernation permet de passer l'hiver."),

  // ——— Littérature ———
  q("lit-hugo", "litterature", "Qui a écrit Les Misérables ?", "Victor Hugo", ["Molière", "Marcel Proust", "Jules Verne"]),
  q("lit-moliere", "litterature", "Quel genre de pièces écrivait Molière ?", "la comédie", ["le roman policier", "la poésie épique", "la science-fiction"]),
  q("lit-verne", "litterature", "Quel thème traverse les romans de Jules Verne ?", "le voyage et la science", ["la vie à la cour", "la mythologie grecque", "la guerre de Cent Ans"]),
  q("lit-proust", "litterature", "Quel souvenir déclenche la madeleine chez Proust ?", "un souvenir d'enfance", ["un voyage en mer", "une bataille", "un procès"]),
  t("lit-tf-fables", "litterature", "Jean de La Fontaine est l'auteur de fables célèbres.", true, "fables"),
  ex("lit-ex-reading", "litterature", "Qu'apporte la lecture d'un grand roman ?", "Un grand roman fait découvrir d'autres vies et enrichit la réflexion."),
  ex("lit-ex-fable", "litterature", "À quoi sert la morale d'une fable ?", "La morale transmet une leçon de vie de façon simple."),
  rd("lit-rd-hugo", "litterature", ["Victor Hugo était écrivain.", "Victor Hugo a écrit Les Misérables.", "Victor Hugo a écrit Les Misérables, un roman sur la justice et la misère."]),
  ev("lit-ev-alexandrin", "litterature", "Comment se nomme un vers de douze syllabes ?", "alexandrin", "Racine l'utilisait dans ses tragédies.", "a…", "L'alexandrin est un vers de douze syllabes."),

  // ——— Technologie ———
  q("tec-internet", "technologie", "À quoi sert Internet ?", "à relier des ordinateurs du monde entier", ["à produire de l'électricité", "à fabriquer des médicaments", "à prévoir les marées"]),
  q("tec-steam", "technologie", "Quelle invention a lancé la révolution industrielle ?", "la machine à vapeur", ["le téléphone portable", "l'ordinateur", "le laser"]),
  q("tec-gps", "technologie", "Sur quoi repose le GPS ?", "des satellites", ["des phares", "des boussoles", "des câbles sous-marins"]),
  q("tec-xray", "technologie", "Qu'ont permis les rayons X en médecine ?", "voir l'intérieur du corps", ["mesurer la tension", "remplacer les vaccins", "analyser l'odorat"]),
  t("tec-tf-phone", "technologie", "Le téléphone a été inventé au dix-neuvième siècle.", true, "téléphone"),
  ex("tec-ex-internet", "technologie", "Internet nous aide-t-il à nous informer ?", "Internet permet d'accéder très vite à une quantité immense d'informations."),
  ex("tec-ex-medtech", "technologie", "Comment la technologie aide-t-elle la médecine ?", "La technologie aide à mieux diagnostiquer et à mieux soigner."),
  rd("tec-rd-steam", "technologie", ["La vapeur a changé l'industrie.", "La machine à vapeur a transformé l'industrie.", "Au dix-neuvième siècle, la machine à vapeur a transformé l'industrie et les transports."]),
  ev("tec-ev-satellite", "technologie", "Comment se nomme un engin en orbite autour de la Terre ?", "satellite", "Il sert au GPS et à la météo.", "sa…", "Un satellite tourne autour de la Terre."),

  // ——— Cuisine ———
  q("cui-steam", "cuisine", "Quelle cuisson préserve les vitamines des légumes ?", "la cuisson à la vapeur", ["la friture", "une longue ébullition", "le barbecue très chaud"]),
  q("cui-herbs", "cuisine", "Comment relever un plat sans ajouter de sel ?", "avec des herbes et des épices", ["avec du sucre", "avec plus de beurre", "avec de l'eau"]),
  q("cui-ratatouille", "cuisine", "De quelle région vient la ratatouille ?", "la Provence", ["la Bretagne", "l'Alsace", "la Normandie"]),
  q("cui-bread", "cuisine", "Qu'est-ce qui fait lever la pâte à pain ?", "la levure", ["le sel", "le sucre glace", "l'huile"]),
  t("cui-tf-olive", "cuisine", "L'huile d'olive est un pilier de la cuisine méditerranéenne.", true, "huile d'olive"),
  ex("cui-ex-home", "cuisine", "Pourquoi cuisiner soi-même ?", "Cuisiner soi-même permet de choisir ses ingrédients et de limiter le sel et le sucre."),
  ex("cui-ex-share", "cuisine", "Qu'aimez-vous dans un repas partagé ?", "Le repas partagé est un moment de convivialité et d'échange."),
  rd("cui-rd-steam", "cuisine", ["La vapeur préserve les légumes.", "La cuisson à la vapeur préserve les vitamines.", "La cuisson à la vapeur préserve mieux les vitamines et la saveur des légumes."]),
  ev("cui-ev-mijoter", "cuisine", "Comment dit-on cuire lentement à petit feu ?", "mijoter", "On le fait pour un bœuf bourguignon.", "mi…", "Mijoter, c'est cuire lentement à petit feu."),

  // ——— Sport ———
  q("spo-marathon", "sport", "Quelle distance parcourt un marathon ?", "environ quarante-deux kilomètres", ["dix kilomètres", "cent kilomètres", "cinq kilomètres"]),
  q("spo-tour", "sport", "Quelle course cycliste traverse la France en été ?", "le Tour de France", ["Roland-Garros", "les Vingt-Quatre Heures du Mans", "le Vendée Globe"]),
  q("spo-olympic", "sport", "D'où viennent les Jeux olympiques ?", "de la Grèce antique", ["de l'Égypte", "de la Chine", "de Rome"]),
  q("spo-benefit", "sport", "Que renforce l'endurance ?", "elle renforce le cœur", ["elle affaiblit les os", "elle réduit le sommeil", "elle augmente la tension"]),
  t("spo-tf-tennis", "sport", "Roland-Garros est un tournoi de tennis.", true, "tennis"),
  ex("spo-ex-team", "sport", "Qu'apporte le fait de jouer en équipe ?", "Un sport collectif développe l'entraide, la communication et l'esprit d'équipe."),
  ex("spo-ex-age", "sport", "Pourquoi rester actif ?", "Rester actif entretient le cœur, les muscles et le moral."),
  rd("spo-rd-walk", "sport", ["La marche est un vrai sport.", "La marche régulière protège le cœur.", "Une marche régulière protège le cœur et entretient l'équilibre avec l'âge."]),
  ev("spo-ev-endurance", "sport", "Comment se nomme la capacité à faire un effort longtemps ?", "endurance", "Elle compte pour le marathon.", "en…", "L'endurance permet de soutenir un effort longtemps."),
];
