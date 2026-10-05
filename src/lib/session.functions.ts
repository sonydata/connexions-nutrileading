import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildSession } from "./builder";

export type { PlayItem } from "./builder";

export const startSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: settings } = await supabase.from("caregiver_settings").select("topics, difficulty").eq("user_id", userId).maybeSingle();
    const { data: past } = await supabase
      .from("attempts")
      .select("item_id, skill, outcome, created_at, response_ms")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(300);
    const items = buildSession(past ?? [], settings?.topics ?? [], settings?.difficulty ?? 1);
    const { data: session, error } = await supabase.from("practice_sessions").insert({ user_id: userId }).select("id").single();
    if (error) throw new Error(error.message);
    return { sessionId: session.id, items };
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
 * Key = SHA-256("v2|" + exact text) — flat, stable, scales to any bank size.
 * An existing file is never regenerated nor overwritten.
 */
export const speak = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ text: z.string().trim().min(1).max(400) }).parse(d))
  .handler(async ({ data, context }) => {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`v2|${data.text}`));
    const name = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("") + ".wav";
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
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`v2|${data.text}`));
    const name = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("") + ".wav";
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const cached = await supabaseAdmin.storage.from("voice").download(name);
    if (cached.data && cached.data.size > 0) return { audio: Buffer.from(await cached.data.arrayBuffer()).toString("base64") };
    return { audio: null as string | null };
  });
