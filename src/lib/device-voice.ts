// Free voice built into the device (browser speech synthesis) — no credits needed.
// We pick the most natural French voice available and use it for EVERY sentence of a session
// (never a mix of two voices). The caregiver can choose another one; the choice stays on this device.

const KEY = "connexions.voice";
export type VoiceMode = "auto" | "device";
export type VoicePrefs = { mode: VoiceMode; name: string | null };

export function voicePrefs(): VoicePrefs {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (v && (v.mode === "auto" || v.mode === "device")) return { mode: v.mode, name: typeof v.name === "string" ? v.name : null };
  } catch {
    // nothing saved on this device
  }
  return { mode: "auto", name: null };
}
export function saveVoicePrefs(p: VoicePrefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // storage unavailable: the choice simply isn't kept
  }
}

/** French voices of this device, most natural first. */
export function frenchVoices(): SpeechSynthesisVoice[] {
  const s = typeof window !== "undefined" ? window.speechSynthesis : undefined;
  if (!s) return [];
  const score = (v: SpeechSynthesisVoice) => {
    const n = v.name.toLowerCase();
    let x = 0;
    if (/natural|neural|premium|enhanced|améliorée|amelioree|online/.test(n)) x += 10; // Edge "Natural", iOS "Premium/Enhanced"
    if (/google/.test(n)) x += 6; // Chrome's online voice
    if (/denise|vivienne|eloise|audrey|amélie|amelie|aurélie|marie|julie|céline|celine|hortense/.test(n)) x += 2; // female, as the recorded voice
    if (v.lang?.toLowerCase() === "fr-fr") x += 1;
    if (v.localService === false) x += 1;
    return x;
  };
  return s
    .getVoices()
    .filter((v) => v.lang?.toLowerCase().startsWith("fr"))
    .sort((a, b) => score(b) - score(a));
}

/** Voices load asynchronously in some browsers. */
export function whenVoicesReady(): Promise<void> {
  const s = typeof window !== "undefined" ? window.speechSynthesis : undefined;
  if (!s || s.getVoices().length) return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => resolve();
    s.addEventListener?.("voiceschanged", done, { once: true });
    setTimeout(done, 1500);
  });
}

export function chosenVoice(): SpeechSynthesisVoice | null {
  const all = frenchVoices();
  const name = voicePrefs().name;
  return (name && all.find((v) => v.name === name)) || all[0] || null;
}

/** Says one sentence with the device voice. Resolves when finished (or if unavailable). */
export function speakWithDevice(text: string, rate = 1, voice = chosenVoice()): Promise<boolean> {
  return new Promise((resolve) => {
    const s = typeof window !== "undefined" ? window.speechSynthesis : undefined;
    if (!s) return resolve(false);
    const u = new SpeechSynthesisUtterance(text.replace(/…/g, "… "));
    u.lang = voice?.lang ?? "fr-FR";
    if (voice) u.voice = voice;
    u.rate = 0.92 * rate;
    u.onend = () => resolve(true);
    u.onerror = () => resolve(false);
    s.speak(u);
  });
}
