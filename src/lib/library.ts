// Curated photo library. The AI may only reference these ids.
const files = import.meta.glob("@/assets/library/*.jpg", { eager: true, import: "default" }) as Record<string, string>;

export type LibraryItem = { id: string; label: string; group: string };

export const LIBRARY: LibraryItem[] = [
  // Nutrition
  { id: "salmon", label: "saumon", group: "nutrition" },
  { id: "bread", label: "pain", group: "nutrition" },
  { id: "apple", label: "pomme", group: "nutrition" },
  { id: "broccoli", label: "brocoli", group: "nutrition" },
  { id: "olive_oil", label: "huile d'olive", group: "nutrition" },
  { id: "walnuts", label: "noix", group: "nutrition" },
  { id: "lentils", label: "lentilles", group: "nutrition" },
  { id: "water", label: "verre d'eau", group: "nutrition" },
  { id: "yogurt", label: "yaourt", group: "nutrition" },
  { id: "orange", label: "orange", group: "nutrition" },
  { id: "eggs", label: "œufs", group: "nutrition" },
  { id: "croissant", label: "croissant", group: "nutrition" },
  { id: "balanced_meal", label: "poisson, légumes et riz", group: "nutrition" },
  { id: "fast_food", label: "burger, frites et soda", group: "nutrition" },
  { id: "carrots", label: "carottes", group: "nutrition" },
  { id: "coffee", label: "tasse de café", group: "nutrition" },
  { id: "cheese", label: "fromage", group: "nutrition" },
  { id: "cooking", label: "cuisiner des légumes", group: "nutrition" },
  { id: "market", label: "marché de fruits et légumes", group: "nutrition" },
  // Daily objects
  { id: "phone", label: "téléphone", group: "daily" },
  { id: "fork", label: "fourchette", group: "daily" },
  { id: "shoe", label: "chaussure", group: "daily" },
  { id: "keys", label: "clés", group: "daily" },
  { id: "glasses", label: "lunettes", group: "daily" },
  { id: "plate", label: "assiette", group: "daily" },
  { id: "umbrella", label: "parapluie", group: "daily" },
  { id: "book", label: "livre", group: "daily" },
  { id: "toothbrush", label: "brosse à dents", group: "daily" },
  { id: "watch", label: "montre", group: "daily" },
  { id: "coat", label: "manteau", group: "daily" },
  { id: "newspaper", label: "journal", group: "daily" },
  { id: "pen", label: "stylo", group: "daily" },
  { id: "calendar", label: "calendrier", group: "daily" },
  // Time
  { id: "morning", label: "le matin (lever du soleil)", group: "time" },
  { id: "midday", label: "midi (soleil haut, déjeuner)", group: "time" },
  { id: "evening", label: "le soir (coucher du soleil)", group: "time" },
  { id: "night", label: "la nuit (lune et étoiles)", group: "time" },
  { id: "winter", label: "l'hiver (neige)", group: "time" },
  { id: "spring", label: "le printemps (cerisier en fleurs)", group: "time" },
  { id: "summer", label: "l'été (plage)", group: "time" },
  { id: "autumn", label: "l'automne (feuilles mortes)", group: "time" },
  // Culture & science
  { id: "rome", label: "le Colisée, Rome", group: "culture" },
  { id: "paris", label: "la tour Eiffel, Paris", group: "culture" },
  { id: "barcelona", label: "la Sagrada Família, Barcelone", group: "culture" },
  { id: "london", label: "Tower Bridge, Londres", group: "culture" },
  { id: "mona_lisa", label: "la Joconde", group: "culture" },
  { id: "monet", label: "les Nymphéas de Monet", group: "culture" },
  { id: "piano", label: "piano (musique)", group: "culture" },
  { id: "violin", label: "violon (musique)", group: "culture" },
  { id: "football", label: "ballon de football", group: "culture" },
  { id: "astronomy", label: "télescope, étoiles (astronomie)", group: "science" },
  { id: "forest", label: "forêt (nature)", group: "science" },
];

export const LIBRARY_IDS = new Set(LIBRARY.map((i) => i.id));

export function imageSrc(id: string | null | undefined): string | null {
  if (!id) return null;
  const key = Object.keys(files).find((k) => k.endsWith(`/${id}.jpg`));
  return key ? (files[key] ?? null) : null;
}
