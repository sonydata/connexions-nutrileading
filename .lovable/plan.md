# Profil fonctionnel et adaptation — Connexions

Faire évoluer l'application existante (sans la reconstruire) pour qu'elle s'adapte à chaque personne selon un profil fonctionnel, de la gêne légère aux difficultés avancées. Le design, les sujets, la voix et les deux modes (Conversation / Votre regard) restent identiques.

## Principe directeur
- Le diagnostic peut être noté par le proche, mais ne règle jamais la difficulté.
- Deux réglages séparés : **complexité du langage** (longueur des phrases, une idée à la fois, répétitions) et **complexité intellectuelle** (sujets adultes, expertise). On simplifie la langue, pas le fond.
- Aucun score, niveau ou chiffre montré à la personne.

## Point important : pas d'IA en séance
Votre cahier parle de contenus « générés par IA ». Aujourd'hui, Connexions fonctionne volontairement sans IA pendant les séances (coût ~0 €, faits contrôlés). Je propose de garder ce choix : le profil pilote les **règles** qui choisissent et présentent les contenus existants (version courte ou longue de la phrase, découpage en segments, nombre de choix, indices, durée). La même architecture pourra plus tard transmettre ces paramètres à une IA (module Actualité), sans rien refaire.

## Ce qui sera construit
1. **Espace proche — questionnaire d'accueil** (dans l'espace aidant existant) : compréhension orale, expression, mémoire, attention/durée confortable, lecture, audition, vision, fatigue, centres d'intérêt + « Quels sujets connaît-il/elle particulièrement bien ? », diagnostic facultatif. Ton bienveillant, jamais un examen. Modifiable à tout moment.
2. **Profil d'adaptation interne** : les réponses sont converties par une fonction de règles en paramètres (longueur max des phrases, idées par énoncé, nombre de choix, niveau de répétition et d'indices, temps de réponse, durée cible, complexité intellectuelle).
3. **Séances adaptées** : le constructeur de séance applique ces paramètres — phrases courtes et découpées si besoin, pause entre segments, réécoute proposée, moins de choix, indices plus tôt, séance raccourcie (5, 8 ou 12 min), sujets d'expertise privilégiés.
4. **Signaux légers enregistrés** : « Réécouter », « Je n'ai pas compris » (nouveau bouton discret), absence de réponse, temps de réponse, longueur de réponse orale, indices utilisés, abandon, réussite. Aucun audio stocké.
5. **Adaptation progressive** : en séance et d'une séance à l'autre, par petites étapes (jamais après une seule réponse) — ex. plusieurs réécoutes → consignes raccourcies ; réponses aisées → légère montée ; longues réponses sur un sujet → échange approfondi.
6. **Tableau « Cette semaine »** : observations en langage prudent (« semble plus facile », « engagement plus élevé lors des sessions Connexions »), sujets appréciés, durée confortable. Retour du proche : Oui / Pas vraiment / Ajouter une observation.
7. **Préparation Actualité** : un même sujet présentable en explication continue ou en segments courts illustrés avec une question à la fois, selon le profil.

## Confidentialité
Profil et observations privés (visibles uniquement par le compte du proche). Pas d'enregistrement audio conservé ; uniquement des métadonnées structurées.

## Détails techniques
- Migration : nouvelle table `adaptive_profiles` (user_id PK, réponses du questionnaire en jsonb, expertise texte, diagnostic facultatif, updated_at) + table `caregiver_feedback` (semaine, réponse, note). RLS `auth.uid() = user_id`, GRANTs authenticated/service_role. `caregiver_settings` conservée (sujets, prénom).
- `src/lib/adaptive-profile.ts` : `deriveParams(answers, recentSignals)` pur et testé — seul endroit à faire évoluer plus tard.
- Signaux : réutiliser `attempts` (colonnes existantes `kind`, `option_count`, `response_ms`, `concept`) avec préfixes `signal:` pour réécoute / incompris / abandon ; exclus du calcul de niveaux comme les lignes `discussion:`.
- `buildPlan` reçoit les paramètres (durée → nombre de parcours, choix → distracteurs, langage → `audioShort` / découpage des phrases à la ponctuation). Segments déjà en cache audio quand possible ; les invités restent sans synthèse.
- `GuidedSession` : bouton « Je n'ai pas compris », pauses entre segments, ajustement intra-séance.
- Espace aidant : sections Questionnaire et Cette semaine ; observations calculées localement par règles.
- Tests unitaires sur `deriveParams` et l'adaptation progressive.
