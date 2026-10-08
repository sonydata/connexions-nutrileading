import { createFileRoute } from "@tanstack/react-router";
import { GuidedSession } from "@/components/guided-session";

export const Route = createFileRoute("/seance")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Séance du jour — Connexions" },
      { name: "description", content: "Une séance guidée de découverte et d'expression, avec des aides facultatives." },
      { property: "og:title", content: "Séance du jour — Connexions" },
      { property: "og:description", content: "Une séance guidée de découverte et d'expression, avec des aides facultatives." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GuidedSession,
});
