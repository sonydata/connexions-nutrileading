import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Mon espace — Connexions by Nutrileading" },
      { name: "description", content: "Connectez-vous pour lancer les séances et suivre les progrès." },
      { property: "og:title", content: "Mon espace — Connexions by Nutrileading" },
      { property: "og:description", content: "Connectez-vous pour lancer les séances et suivre les progrès." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMsg("Identifiants incorrects.");
      else nav({ to: "/" });
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) setMsg(error.message);
      else if (!data.session) setMsg("Un e-mail de confirmation vient d'être envoyé.");
      else nav({ to: "/" });
    }
    setBusy(false);
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) setMsg("Connexion Google impossible.");
    else if (!r.redirected) nav({ to: "/" });
  }

  return (
    <main className="paper-grain flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-md animate-rise">
        <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Connexion</p>
        <h1 className="mt-3 text-5xl">{mode === "in" ? "Connexion" : "Créer un compte"}</h1>
        <form onSubmit={submit} className="mt-10 space-y-4">
          <input className="w-full rounded-xl border bg-card px-5 py-4 text-lg outline-none focus:ring-2 focus:ring-ring" type="email" required placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="w-full rounded-xl border bg-card px-5 py-4 text-lg outline-none focus:ring-2 focus:ring-ring" type="password" required minLength={6} placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button disabled={busy} className="w-full rounded-xl bg-primary py-4 text-lg font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60">
            {mode === "in" ? "Se connecter" : "Créer le compte"}
          </button>
        </form>
        <button onClick={google} className="mt-3 w-full rounded-xl border bg-card py-4 text-lg transition hover:bg-muted">
          Continuer avec Google
        </button>
        {msg && <p className="mt-4 text-muted-foreground">{msg}</p>}
        <button onClick={() => setMode(mode === "in" ? "up" : "in")} className="mt-8 text-sm text-muted-foreground underline underline-offset-4">
          {mode === "in" ? "Pas encore de compte ? En créer un" : "Déjà un compte ? Se connecter"}
        </button>
      </div>
    </main>
  );
}
