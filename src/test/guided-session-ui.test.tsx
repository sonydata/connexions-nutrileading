import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildPlan } from "@/lib/builder";
import { deriveParams } from "@/lib/adaptive-profile";

// Server functions are replaced by local fakes: the test drives the real session screen.
const recorded: { kind: string; outcome: string }[] = [];
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@tanstack/react-router", () => ({ Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a> }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: { user: { id: "u" } } } }) } },
}));
vi.mock("@/lib/session.functions", () => ({
  startSession: async () => ({
    sessionId: "00000000-0000-0000-0000-000000000000",
    ...buildPlan([], ["i:actualite", "i:art"], 1),
    params: { ...deriveParams({ comprehension: 4 }), pauseMs: 0 },
  }),
  speak: async () => ({ audio: btoa("RIFF") }),
  speakCached: async () => ({ audio: btoa("RIFF") }),
  recordAttempt: async ({ data }: { data: { kind: string; outcome: string } }) => {
    recorded.push(data);
    return { ok: true };
  },
  completeSession: async () => ({ ok: true }),
}));

beforeEach(() => {
  recorded.length = 0;
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
});
