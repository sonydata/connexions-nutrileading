/** Cache file name for a sentence. Bump the version when the voice or its direction changes. */
export const VOICE_VERSION = "v3";
export async function voiceFileName(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${VOICE_VERSION}|${text}`));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("") + ".wav";
}
