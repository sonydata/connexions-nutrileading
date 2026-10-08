import { describe, expect, it } from "vitest";
import { buildPlan, skillLevels, toPlay, topicAffinity } from "../lib/builder";
import { BANK, REPERES } from "../lib/content";
import { discussionTurns } from "../lib/discussion";
import { SEQUENCES } from "../lib/sequences";

describe("Two guided modes", () => {
  it("covers all subjects, hides choices in conversation and preserves local items", () => {
    const items = BANK.map((item) => toPlay(item, 1));
    for (let offset = 0; offset < items.length; offset += 12) {
      const turns = discussionTurns(items.slice(offset, offset + 12), "conversation");
      for (const turn of turns) {
        expect(turn.options).toEqual([]);
        expect(turn.prompt).toBeTruthy();
        expect(turn.item.id).toBeTruthy();
      }
    }
  });
  it("offers pistes only as optional support in Votre regard", () => {
    const items = buildPlan([], ["i:art", "i:medecine"], 1).items;
    const turns = discussionTurns(items, "regard");
    expect(turns.length).toBeLessThanOrEqual(12);
    expect(turns.some((turn) => turn.options.length === 2)).toBe(true);
    expect(turns.every((turn) => turn.model)).toBe(true);
  });
  it("asks each reference once, with a specific follow-up, never repeated", () => {
    const items = REPERES.map((item) => toPlay(item, 1));
    const turns = discussionTurns(items, "conversation");
    const pres = turns.find((turn) => turn.item.id === "rp-fr-pres")!;
    expect(pres.prompt).toContain("président de la République");
    expect(pres.intro).toBeNull();
    expect(pres.followUp).not.toBe(pres.prompt);
    expect(turns.every((turn) => turn.options.length === 0 && turn.intro !== turn.prompt)).toBe(true);
  });
  it("never asks a sequence's opinion question twice in a row", () => {
    const turns = discussionTurns(SEQUENCES[0]!.items.map((i) => toPlay(i, 1)), "conversation");
    const asked = turns.flatMap((t) => [t.prompt, t.followUp]);
    expect(new Set(asked.filter((x, n) => asked.indexOf(x) !== n && x !== asked[n - 1])).size).toBe(0);
    expect(turns[1]!.intro).toBeNull();
  });
  it("never changes levels or inferred preference from neutral participation", () => {
    const past = Array.from({ length: 10 }, () => ({ item_id: "sq-monet-c", skill: "information", outcome: "after_repeat", created_at: new Date().toISOString(), response_ms: null, kind: "discussion:conversation:exchange:shared:independent" }));
    expect(skillLevels(past, 2)["information"]).toBe(2);
    expect(topicAffinity(past).size).toBe(0);
  });
  it("preserves current references when shortening a full plan", () => {
    const base = buildPlan([], ["i:art", "i:medecine"], 1).items;
    const references = REPERES.slice(0, 3).map((item) => toPlay(item, 1));
    const turns = discussionTurns([...base.filter((item) => !item.id.startsWith("rp-")), ...references], "conversation");
    for (const reference of references) expect(turns.some((turn) => turn.item.id === reference.id)).toBe(true);
  });
});