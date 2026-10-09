import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildPlan } from "@/lib/builder";
import { deriveParams } from "@/lib/adaptive-profile";

// Server functions are replaced by local fakes: the test drives the real session screen.
const recorded: { kind: string; outcome: string; optionCount: number }[] = [];
let withTarget = false;
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@tanstack/react-router", () => ({ Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a> }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: { user: { id: "u" } } } }) } },
}));
vi.mock("@/lib/session.functions", () => ({
  startSession: async () => ({
    sessionId: "00000000-0000-0000-0000-000000000000",
    ...buildPlan([], ["i:actualite", "i:art"], 1),
    params: { ...deriveParams({ comprehension: 4 }), pauseMs: 0, maxTurns: withTarget ? 4 : 12 },
    srt: withTarget ? { target: { id: "a", sentence: "Votre petite-fille s'appelle Léa.", question: "Comment s'appelle votre petite-fille ?", answer: "Léa" }, maintenance: false } : null,
  }),
  speak: async () => ({ audio: btoa("RIFF") }),
  speakCached: async () => ({ audio: btoa("RIFF") }),
  recordAttempt: async ({ data }: { data: { kind: string; outcome: string; optionCount: number } }) => {
    recorded.push(data);
    return { ok: true };
  },
  completeSession: async () => ({ ok: true }),
}));

afterEach(cleanup);

beforeEach(() => {
  recorded.length = 0;
  withTarget = false;
  // Audio "plays" instantly in the test.
  window.HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
    setTimeout(() => this.onended?.(new Event("ended")), 5);
    return Promise.resolve();
  };
  window.HTMLMediaElement.prototype.pause = () => {};
  URL.createObjectURL = () => "blob:x";
  URL.revokeObjectURL = () => {};
});

describe("Simple screen (accompagnement renforcé)", () => {
  it("starts with one big button, offers choices by itself, says the answer and moves on alone", async () => {
    const { GuidedSession } = await import("@/components/guided-session");
    render(<GuidedSession />);
    const startButton = await screen.findByRole("button", { name: "Commencer" });
    await act(async () => fireEvent.click(startButton));

    // The question is read, then the choices appear without any other tap.
    await waitFor(() => expect(screen.getAllByRole("button").length).toBeGreaterThan(3), { timeout: 4000 });
    expect(screen.getByText("1 / " + screen.getByLabelText(/^1 sur/).textContent!.split(" / ")[1])).toBeTruthy();
    const choice = screen.getAllByRole("button").find((b) => /Macron|Trump|euro|Paris|Hollande|Biden|dollar|Londres|Sarkozy|Obama|franc|Rome/.test(b.textContent ?? ""))!;
    await act(async () => fireEvent.click(choice));

    // The answer is always said and shown, then the next question comes by itself.
    await screen.findByText(/^(Oui, c'est bien cela|La réponse) : /);
    await waitFor(() => expect(screen.getByLabelText(/^2 sur/)).toBeTruthy(), { timeout: 5000 });
    expect(recorded[0]).toMatchObject({ kind: "mcq" });
    expect(["after_cue", "revealed"]).toContain(recorded[0]!.outcome);
  }, 15000);

  it("asks the personal target after a warm-up, accepts the helper's 'C'était juste' and schedules the next ask", async () => {
    withTarget = true;
    const { GuidedSession } = await import("@/components/guided-session");
    render(<GuidedSession />);
    await new Promise((r) => setTimeout(r, 800));
    await act(async () => fireEvent.click(await screen.findByRole("button", { name: "Commencer" }, { timeout: 4000 })));
    expect(screen.getByLabelText(/^1 sur 5$/)).toBeTruthy();
    await act(async () => fireEvent.click(screen.getByText(/Passer/)));

    await screen.findByText("Comment s'appelle votre petite-fille ?");
    const ok = await screen.findByRole("button", { name: "C'était juste" }, { timeout: 4000 });
    await act(async () => fireEvent.click(ok));
    await screen.findByText("Oui, c'est bien cela : Léa.");

    // Moves on alone; the target comes back later in the session (one more activity in the list).
    await waitFor(() => expect(screen.getByLabelText(/^3 sur 6$/)).toBeTruthy(), { timeout: 5000 });
    expect(recorded.find((r) => r.kind === "srt")).toMatchObject({ outcome: "spontaneous", optionCount: 0 });
  }, 20000);
});
