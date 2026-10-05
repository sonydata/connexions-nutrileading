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
