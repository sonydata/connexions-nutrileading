import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { LIBRARY, LIBRARY_IDS } from "./library";

export type Option = { label: string; image_id: string | null };
export type Exercise = {
  category: string;
  skill: string;
  audio_text: string;
  question_text: string | null;
  keyword: string;
  concept: string;
  options: Option[];
  correct_index: number;
};

const SKILLS = ["word", "sentence", "temporal", "practical", "memory", "semantic"] as const;

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["exercises"],
  properties: {
    exercises: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["category", "skill", "audio_text", "question_text", "keyword", "concept", "options", "correct_index"],
        properties: {
          category: { type: "string" },
          skill: { type: "string" },
          audio_text: { type: "string" },
          question_text: { type: ["string", "null"] },
          keyword: { type: "string" },
          concept: { type: "string" },
          options: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["label", "image_id"],
              properties: { label: { type: "string" }, image_id: { type: ["string", "null"] } },
            },
          },
          correct_index: { type: "integer" },
        },
      },
    },
  },
};

function levelFor(rate: number | null, base: number) {
  // 1 = easiest, 3 = hardest
  let lvl = base;
  if (rate !== null) {
    if (rate < 0.45) lvl -= 1;
    else if (rate > 0.8) lvl += 1;
  }
  return Math.max(1, Math.min(3, lvl));
}

export const startSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { generateJson } = await import("./gateway.server");

    const { data: settings } = await supabase.from("caregiver_settings").select("*").eq("user_id", userId).maybeSingle();
    const topics = settings?.topics ?? ["nutrition", "daily", "time", "culture", "science"];
    const base = settings?.difficulty ?? 1;

    const { data: recent } = await supabase
      .from("attempts")
      .select("skill, prompt, concept, outcome")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(150);

    const levels: Record<string, number> = {};
    for (const s of SKILLS) {
      const rows = (recent ?? []).filter((r) => r.skill === s).slice(0, 25);
      const rate = rows.length >= 4 ? rows.filter((r) => r.outcome === "spontaneous").length / rows.length : null;
      levels[s] = levelFor(rate, base);
    }
    const avoid = Array.from(new Set((recent ?? []).slice(0, 60).map((r) => r.prompt))).slice(0, 40);
    const difficult = Array.from(
      new Set((recent ?? []).filter((r) => r.outcome === "revealed" || r.outcome === "after_cue").map((r) => r.concept).filter(Boolean)),
    ).slice(0, 6);

    const now = new Date();
    const dateFr = now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });

    const instructions = `Tu crées une séance quotidienne de compréhension auditive en français pour un adulte âgé, très cultivé, ayant des difficultés de compréhension du langage oral. Le ton est adulte, intelligent, calme — jamais enfantin, scolaire ou clinique.

Règles absolues :
- Phrases courtes, concrètes, naturelles, une idée à la fois. Pas de subordonnées longues, pas de pronoms ambigus, pas de noms propres de personnes inventées, pas de double négation, pas de pièges.
- N'invente JAMAIS d'événements personnels ou familiaux, ni d'actualités. Pas d'actualité : utilise des faits culturels, scientifiques ou pratiques intemporels et bien établis.
- Faits de nutrition simples, consensuels, non controversés.
- La difficulté vient de la compréhension du langage, jamais de la confusion.

Format de chaque exercice :
- audio_text : la phrase lue à voix haute (énoncé, information ou question).
- question_text : une question courte lue après l'audio si audio_text est une information (ex. "De quoi parle-t-on ?"), sinon null.
- keyword : un mot-clé écrit qui aide sans donner la réponse directement (ex. "oméga-3", "pluie", "après").
- concept : le concept travaillé en 1 à 3 mots (ex. "lundi→mardi", "parapluie/pluie").
- options : des choix. image_id doit être un identifiant EXACT de la bibliothèque si une photo correspond clairement à l'option, sinon null (option texte). Le label est court en français (1 à 4 mots). Préfère les photos quand c'est possible. Les distracteurs sont plausibles mais clairement différents.
- correct_index : index (base 0) de la bonne option.
- category : nutrition | daily | time | culture | science.
- skill : word (un mot isolé → photo) | sentence (phrase courte → bonne image) | temporal | practical | memory (deux éléments à retenir, ex. "D'abord le café, ensuite le journal." puis "Qu'est-ce qu'on fait en premier ?") | semantic (information → question de compréhension).

Niveau par compétence (1 = 2 options et 3 à 5 mots ; 2 = 3 options et 4 à 8 mots ; 3 = 4 options et jusqu'à 12 mots avec distracteurs plus proches) :
${Object.entries(levels).map(([k, v]) => `- ${k} : niveau ${v}`).join("\n")}
Respecte strictement le nombre d'options du niveau.

Bibliothèque de photos (id : description) :
${LIBRARY.map((i) => `${i.id} : ${i.label}`).join("\n")}`;

    const input = `Date du jour : ${dateFr}. Catégories autorisées : ${topics.join(", ")}.
Crée exactement 10 exercices variés : environ 2 nutrition, 2 vie pratique, 2 temps/orientation, 2 culture/science, 1 mémoire auditive, 1 information courte. Adapte aux catégories autorisées. Varie les formats et l'ordre.
${difficult.length ? `Concepts récemment difficiles à reprendre avec une autre formulation ou d'autres images : ${difficult.join(", ")}.` : ""}
${avoid.length ? `N'utilise pas ces phrases déjà entendues récemment :\n${avoid.join("\n")}` : ""}`;

    const result = await generateJson<{ exercises: Exercise[] }>({ instructions, input, schemaName: "session", schema });

    const exercises = result.exercises
      .map((e) => ({
        ...e,
        skill: (SKILLS as readonly string[]).includes(e.skill) ? e.skill : "semantic",
        options: e.options.slice(0, 4).map((o) => ({ label: o.label, image_id: o.image_id && LIBRARY_IDS.has(o.image_id) ? o.image_id : null })),
      }))
      .filter((e) => e.options.length >= 2 && e.correct_index >= 0 && e.correct_index < e.options.length);

    const { data: session, error } = await supabase.from("practice_sessions").insert({ user_id: userId }).select("id").single();
    if (error) throw new Error(error.message);
    return { sessionId: session.id, exercises };
  });

export const recordAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        sessionId: z.string().uuid(),
        category: z.string(),
        skill: z.string(),
        prompt: z.string(),
        concept: z.string().nullable(),
        optionCount: z.number().int(),
        outcome: z.enum(["spontaneous", "after_repeat", "after_cue", "revealed"]),
        responseMs: z.number().int().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("attempts").insert({
      user_id: context.userId,
      session_id: data.sessionId,
      category: data.category,
      skill: data.skill,
      prompt: data.prompt,
      concept: data.concept,
      word_count: data.prompt.trim().split(/\s+/).length,
      option_count: data.optionCount,
      outcome: data.outcome,
      response_ms: data.responseMs,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const completeSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ sessionId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await context.supabase.from("practice_sessions").update({ completed_at: new Date().toISOString() }).eq("id", data.sessionId);
    return { ok: true };
  });

export const speak = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ text: z.string().min(1).max(400) }).parse(d))
  .handler(async ({ data }) => {
    const { synthesizeSpeech } = await import("./gateway.server");
    const buf = await synthesizeSpeech(data.text);
    return { audio: Buffer.from(buf).toString("base64") };
  });
