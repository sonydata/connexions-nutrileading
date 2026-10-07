import { describe, expect, it } from "vitest";
import { responseInstruction } from "../lib/response-guidance";
import { BANK, REPERES } from "../lib/content";
import { SEQ_ITEMS } from "../lib/sequences";
import { buildPlan } from "../lib/builder";
import { visualHintFor } from "../lib/visual-hints";

describe("Explicit response instructions", () => {
  it("distinguishes touch, naming, repetition and opinions", () => {
    expect(responseInstruction({ kind: "mcq", audio: "" })).toBe("Touchez la réponse de votre choix.");
    expect(responseInstruction({ kind: "evoke", audio: "" })).toBe("Dites le nom à voix haute.");
    expect(responseInstruction({ kind: "oral", mode: "lire", audio: "" })).toBe("Répétez la phrase à voix haute.");
    expect(responseInstruction({ kind: "oral", mode: "expliquer", audio: "Quel conseil ?" })).toContain("conseil");
  });
  it("uses one short direct question for every present-day choice", () => {
    for (const item of REPERES) {
      if (item.kind !== "mcq") continue;
      expect(item.question).toBeUndefined();
      expect(item.audio.split(" ").length).toBeLessThanOrEqual(12);
    }
  });
  it("provides an explicit hidden-on-request hint for every session item", () => {
    for (const item of [...BANK, ...SEQ_ITEMS]) {
      expect(visualHintFor({ id: item.id }).caption.length).toBeGreaterThan(3);
    }
    for (let n = 0; n < 20; n++) {
      const plan = buildPlan([], ["i:actualite", "i:art", "i:sciences", "i:medecine"], 1);
      for (const item of plan.items) expect(visualHintFor(item).caption.length).toBeGreaterThan(3);
    }
  });
});