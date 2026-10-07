import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildPlan } from "./builder";
import { voiceFileName } from "./voice-key";
import { deriveParams, isSignal, summariseSignals, type ProfileAnswers } from "./adaptive-profile";

export type { PlayItem } from "./builder";

export const startSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { focus?: string | null } | undefined) => z.object({ focus: z.string().max(40).nullable().optional() }).optional().parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: settings } = await supabase.from("caregiver_settings").select("topics, difficulty").eq("user_id", userId).maybeSingle();
    const { data: profile } = await supabase.from("adaptive_profiles").select("answers").eq("user_id", userId).maybeSingle();
    const { data: past } = await supabase
      .from("attempts")
      .select("item_id, kind, skill, outcome, created_at, response_ms, option_count")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(300);
    const rows = past ?? [];
    const base = settings?.difficulty ?? 1;
    const params = deriveParams((profile?.answers ?? {}) as ProfileAnswers, summariseSignals(rows), base);
    const { items, teaser } = buildPlan(rows.filter((r) => !isSignal(r.kind)), settings?.topics ?? [], base, data?.focus ?? null);
    const { data: session, error } = await supabase.from("practice_sessions").insert({ user_id: userId }).select("id").single();
    if (error) throw new Error(error.message);
    return { sessionId: session.id, items, teaser, params };
  });

export const recordAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        sessionId: z.string().uuid(),
        itemId: z.string(),
        kind: z.string(),
        category: z.string(),
        skill: z.string(),
        prompt: z.string(),
        optionCount: z.number().int(),
        outcome: z.enum(["spontaneous", "after_repeat", "after_cue", "revealed"]),
        responseMs: z.number().int().nullable(),
        repeated: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("attempts").insert({
      user_id: context.userId,
      session_id: data.sessionId,
      item_id: data.itemId,
      kind: data.kind,
      category: data.category,
      skill: data.skill,
      prompt: data.prompt,
      concept: data.repeated ? `${data.itemId}#rep` : data.itemId, // "#rep" = model sentence repeated aloud
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

/**
 * Natural voice, cached in storage so each sentence is synthesised only once.
 * Key = SHA-256(VOICE_VERSION + "|" + exact text) — flat, stable, scales to any bank size.
 * An existing file is never regenerated nor overwritten.
 */
export const speak = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ text: z.string().trim().min(1).max(400) }).parse(d))
  .handler(async ({ data, context }) => {
    const name = await voiceFileName(data.text);
    // Privileged client: the voice bucket is a shared, server-only cache —
    // direct client access is revoked by policy, so reads/writes go through here.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const bucket = supabaseAdmin.storage.from("voice");
    const cached = await bucket.download(name);
    if (cached.data && cached.data.size > 0) return { audio: Buffer.from(await cached.data.arrayBuffer()).toString("base64") };
    const { synthesizeSpeech } = await import("./gateway.server");
    const buf = await synthesizeSpeech(data.text);
    // upsert:false — if another request stored it meanwhile, keep that file.
    const up = await bucket.upload(name, new Blob([buf], { type: "audio/wav" }), { contentType: "audio/wav", upsert: false });
    if (up.error && !/exists|duplicate/i.test(up.error.message)) console.error("voice cache upload failed:", up.error.message);
    return { audio: Buffer.from(buf).toString("base64") };
  });

/**
 * Discovery mode (no account): read-only access to the shared voice cache.
 * Never synthesises — a missing clip returns null and the browser voice is used,
 * so visitors without an account can never create a paid call.
 */
export const speakCached = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ text: z.string().trim().min(1).max(400) }).parse(d))
  .handler(async ({ data }) => {
    const name = await voiceFileName(data.text);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const cached = await supabaseAdmin.storage.from("voice").download(name);
    if (cached.data && cached.data.size > 0) return { audio: Buffer.from(await cached.data.arrayBuffer()).toString("base64") };
    return { audio: null as string | null };
  });
