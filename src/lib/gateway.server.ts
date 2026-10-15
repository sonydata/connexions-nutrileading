// Server-only helpers for Lovable AI Gateway calls.
const BASE = "https://ai.gateway.lovable.dev";
const TTS_MODEL = "google/gemini-3.1-flash-tts-preview";
const TTS_VOICE = "Vindemiatrix";

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
          parts: [
            {
              text:
                "Parle en français comme une femme cultivée et bienveillante qui converse avec un ami qu'elle respecte : " +
                "ton naturel et chaleureux, débit posé mais fluide, intonation vivante, petites respirations douces entre les idées. " +
                "Jamais le ton d'une assistante vocale, d'un GPS ou d'une lecture scolaire. Dis simplement ceci : " +
                text,
            },
          ],
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

// Pictures: one per question, made once and kept (see preparePictures). Fast, low-cost image model.
const IMAGE_MODEL = "google/gemini-3.1-flash-lite-image";

/** Returns the bytes and type of one generated picture for the given description. */
export async function generatePicture(prompt: string): Promise<{ bytes: Uint8Array; type: string }> {
  const key = apiKey();
  const res = await fetch(`${BASE}/v1/images/generations`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Lovable-API-Key": key, "Content-Type": "application/json" },
    body: JSON.stringify({ model: IMAGE_MODEL, prompt, n: 1 }),
  });
  if (!res.ok) await failure(res);
  const json = (await res.json()) as { data?: { b64_json?: string | null; url?: string | null }[] };
  const item = json.data?.[0];
  let bytes: Uint8Array;
  if (item?.b64_json) bytes = Uint8Array.from(Buffer.from(item.b64_json, "base64"));
  else if (item?.url) {
    const img = await fetch(item.url);
    if (!img.ok) throw new GatewayError(img.status, "Image introuvable.");
    bytes = new Uint8Array(await img.arrayBuffer());
  } else throw new GatewayError(500, "Aucune image reçue.");
  const type = bytes[0] === 0x89 ? "image/png" : bytes[0] === 0xff ? "image/jpeg" : bytes[0] === 0x52 ? "image/webp" : "image/png";
  return { bytes, type };
}
