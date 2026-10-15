import { useEffect, useState } from "react";
import { Volume2 } from "lucide-react";
import { frenchVoices, saveVoicePrefs, speakWithDevice, voicePrefs, whenVoicesReady, type VoiceMode } from "@/lib/device-voice";

const SAMPLE = "Bonjour, je suis la voix de Connexions. La banane… ou… la pomme ?";

/** Free voice of this device: choose it, listen to it, and decide when it is used. Saved on this device. */
export function VoicePicker() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [prefs, setPrefs] = useState(voicePrefs);
  useEffect(() => {
    whenVoicesReady().then(() => setVoices(frenchVoices()));
  }, []);
  const current = prefs.name ?? voices[0]?.name ?? "";
  const update = (p: { mode?: VoiceMode; name?: string | null }) => {
    const next = { ...prefs, ...p };
    setPrefs(next);
    saveVoicePrefs(next);
  };
  return (
    <div className="mt-5 rounded-2xl border bg-background p-5 text-base">
      <p className="font-medium">Voix gratuite de cet appareil</p>
      <p className="mt-1 text-sm text-muted-foreground">Sans crédits. Une seule voix pendant toute la séance, jamais de mélange.</p>
      <div className="mt-3 flex flex-col gap-2">
        {([
          ["auto", "Automatique : voix enregistrée, et voix de l'appareil pour toute la séance dès qu'une phrase manque"],
          ["device", "Toujours la voix de l'appareil (aucun crédit, aucune attente)"],
        ] as const).map(([mode, label]) => (
          <label key={mode} className="flex items-start gap-3">
            <input type="radio" name="voice-mode" className="mt-1 h-5 w-5" checked={prefs.mode === mode} onChange={() => update({ mode })} />
            {label}
          </label>
        ))}
      </div>
      {voices.length ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <select value={current} onChange={(e) => update({ name: e.target.value })} className="max-w-full rounded-xl border bg-card px-3 py-2">
            {voices.map((v, k) => (
              <option key={v.name} value={v.name}>
                {v.name}
                {k === 0 ? " (recommandée)" : ""}
              </option>
            ))}
          </select>
          <button onClick={() => speakWithDevice(SAMPLE, 1, voices.find((v) => v.name === current) ?? null)} className="flex items-center gap-2 rounded-full border px-4 py-2">
            <Volume2 className="size-4" /> Écouter
          </button>
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">Aucune voix française trouvée sur cet appareil.</p>
      )}
      <details className="mt-4 text-sm text-muted-foreground">
        <summary className="cursor-pointer text-primary">Obtenir une voix plus naturelle, gratuitement</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>iPad / iPhone : Réglages › Accessibilité › Contenu énoncé › Voix › Français, puis télécharger une voix « Premium » ou « Améliorée » (par exemple Amélie ou Audrey). Revenez ensuite ici et choisissez-la.</li>
          <li>Ordinateur : le navigateur Microsoft Edge propose des voix « Natural » très naturelles (Denise, Vivienne…).</li>
          <li>Chrome : la voix « Google français » est plus naturelle que la voix de base.</li>
        </ul>
      </details>
    </div>
  );
}
