// Server-only helpers for Lovable AI Gateway calls.
const BASE = "https://ai.gateway.lovable.dev";
export const TEXT_MODEL = "openai/gpt-6-astra";
const TTS_MODEL = "google/gemini-3.1-flash-tts-preview";
const TTS_VOICE = "Kore";

export class GatewayError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function apiKey() {
  const k = process.env["LOVABLE_API_KEY"];
  if (!k) throw new GatewayError(401, "Configuration manquante.");
  return k;
}

async function failure(res: Response): Promise<never> {
  const text = await res.text().catch(() => "");
  let msg = text;
  try {
    const j = JSON.parse(text);
    msg = j?.error?.message ?? j?.message ?? text;
  } catch {}
  if (res.status === 402) msg = msg || "Crédits IA épuisés.";
  throw new GatewayError(res.status, msg || `Erreur ${res.status}`);
}

/** Streams a Responses call with a strict JSON schema and returns parsed JSON. */
export async function generateJson<T>(opts: {
  instructions: string;
  input: string;
  schemaName: string;
  schema: Record<string, unknown>;
}): Promise<T> {
  const res = await fetch(`${BASE}/v1/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey(),
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: TEXT_MODEL,
      instructions: opts.instructions,
      input: opts.input,
      stream: true,
      store: false,
      reasoning: { effort: "low", summary: "auto" },
      include: ["reasoning.encrypted_content"],
      text: { format: { type: "json_schema", name: opts.schemaName, strict: true, schema: opts.schema } },
    }),
  });
  if (!res.ok || !res.body) await failure(res);

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let out = "";
  let refusal = "";
  let done = false;
  while (!done) {
    const { value, done: d } = await reader.read();
    if (d) break;
    buf += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf("\n\n")) >= 0) {
      const frame = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      for (const line of frame.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (!data || data === "[DONE]") continue;
        let ev: any;
        try {
          ev = JSON.parse(data);
        } catch {
          continue;
        }
        if (ev.type === "response.output_text.delta") out += ev.delta ?? "";
        else if (ev.type === "response.refusal.delta") refusal += ev.delta ?? "";
        else if (ev.type === "error" || ev.type === "response.failed") {
          throw new GatewayError(500, ev?.error?.message ?? ev?.response?.error?.message ?? "Échec de génération");
        } else if (ev.type === "response.completed") done = true;
      }
    }
  }
  if (refusal && !out) throw new GatewayError(403, "Le contenu n'a pas pu être généré.");
  return JSON.parse(out) as T;
}

/** Returns a complete WAV file for the given French text. */
export async function synthesizeSpeech(text: string): Promise<ArrayBuffer> {
  const res = await fetch(`${BASE}/v1/audio/speech`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: TTS_MODEL,
      contents: [
        {
          role: "user",
          parts: [{ text: `Lis en français, d'une voix calme, chaleureuse et posée, en articulant clairement : ${text}` }],
        },
      ],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: TTS_VOICE } } },
      },
      stream_format: "audio",
    }),
  });
  if (!res.ok) await failure(res);
  return res.arrayBuffer();
}
