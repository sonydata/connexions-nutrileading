// Free, on-device voice input. Speech recognition (fr-FR) is indicative only;
// the recording stays in the browser memory and is discarded after each exercise.
import { useCallback, useEffect, useRef, useState } from "react";

type Rec = { start(): void; stop(): void; abort(): void; lang: string; continuous: boolean; interimResults: boolean; onresult: ((e: any) => void) | null; onerror: (() => void) | null };

export function useVoiceInput() {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [recording, setRecording] = useState<string | null>(null);
  const rec = useRef<Rec | null>(null);
  const mr = useRef<MediaRecorder | null>(null);
  const text = useRef("");
  const urlRef = useRef<string | null>(null);

  const setUrl = (u: string | null) => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = u;
    setRecording(u);
  };

  const start = useCallback(async () => {
    text.current = "";
    setTranscript("");
    setListening(true);
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (SR) {
      try {
        const r: Rec = new SR();
        r.lang = "fr-FR";
        r.continuous = true;
        r.interimResults = true;
        r.onresult = (e: any) => {
          let t = "";
          for (let k = 0; k < e.results.length; k++) t += e.results[k][0].transcript + " ";
          text.current = t.trim();
          setTranscript(text.current);
        };
        r.onerror = () => {};
        r.start();
        rec.current = r;
      } catch {}
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const m = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      m.ondataavailable = (e) => chunks.push(e.data);
      m.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (chunks.length) setUrl(URL.createObjectURL(new Blob(chunks, { type: m.mimeType || "audio/webm" })));
      };
      m.start();
      mr.current = m;
    } catch {
      // No microphone access: the person can still answer aloud; nothing blocks.
    }
  }, []);

  const stop = useCallback(() => {
    try {
      rec.current?.stop();
    } catch {}
    rec.current = null;
    if (mr.current?.state === "recording") mr.current.stop();
    mr.current = null;
    setListening(false);
    return text.current;
  }, []);

  const clear = useCallback(() => {
    try {
      rec.current?.abort();
    } catch {}
    rec.current = null;
    if (mr.current?.state === "recording") {
      mr.current.onstop = null;
      mr.current.stop();
      mr.current.stream.getTracks().forEach((t) => t.stop());
    }
    mr.current = null;
    text.current = "";
    setListening(false);
    setTranscript("");
    setUrl(null);
  }, []);

  useEffect(() => clear, [clear]);

  const playRecording = useCallback(async () => {
    if (!urlRef.current) return;
    const a = new Audio(urlRef.current);
    await a.play().catch(() => {});
    await new Promise<void>((res) => {
      a.onended = () => res();
      a.onerror = () => res();
    });
  }, []);

  return { listening, transcript, recording, start, stop, clear, playRecording };
}

const norm = (t: string) =>
  t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, " ");

/** Lenient keyword spotting: the longest word of the target appears in what was heard. */
export function heardWord(transcript: string, target: string) {
  const words = norm(target).split(/\s+/).filter(Boolean).sort((a, b) => b.length - a.length);
  const key = words[0];
  if (!key) return false;
  const stem = key.length > 6 ? key.slice(0, key.length - 2) : key;
  return norm(transcript).includes(stem);
}

export const wordCount = (t: string) => (t.trim() ? t.trim().split(/\s+/).length : 0);
