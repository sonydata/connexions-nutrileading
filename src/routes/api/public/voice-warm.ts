import { createFileRoute } from "@tanstack/react-router";

/**
 * One-off maintenance: pre-records a slice of the bank into the shared voice cache.
 * Caller must present the project's server AI key — never exposed to browsers.
 */
export const Route = createFileRoute("/api/public/voice-warm")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env["LOVABLE_API_KEY"];
        if (!key || request.headers.get("authorization") !== `Bearer ${key}`) return new Response("Forbidden", { status: 403 });
        const { offset = 0, limit = 8 } = (await request.json().catch(() => ({}))) as { offset?: number; limit?: number };
        const { allVoiceTexts } = await import("@/lib/voice-texts");
        const { voiceFileName } = await import("@/lib/voice-key");
        const { synthesizeSpeech } = await import("@/lib/gateway.server");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const bucket = supabaseAdmin.storage.from("voice");
        const all = allVoiceTexts();
        const slice = all.slice(offset, offset + Math.min(limit, 12));
        const results = await Promise.all(
          slice.map(async (text) => {
            const name = await voiceFileName(text);
            const exists = await bucket.download(name);
            if (exists.data && exists.data.size > 0) return "cached";
            try {
              const buf = await synthesizeSpeech(text);
              const up = await bucket.upload(name, new Blob([buf], { type: "audio/wav" }), { contentType: "audio/wav", upsert: false });
              return up.error && !/exists|duplicate/i.test(up.error.message) ? `upload:${up.error.message}` : "made";
            } catch (e) {
              return `error:${(e as Error).message}`;
            }
          }),
        );
        return Response.json({ total: all.length, offset, done: results });
      },
    },
  },
});
