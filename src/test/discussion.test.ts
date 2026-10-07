import { describe, expect, it } from "vitest";
import { buildPlan, skillLevels, toPlay, topicAffinity } from "../lib/builder";
import { BANK, REPERES } from "../lib/content";
import { discussionTurns } from "../lib/discussion";

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
  it("presents present-day facts before conversation, not as a test", () => {
    const items = REPERES.map((item) => toPlay(item, 1));
    const turns = discussionTurns(items, "conversation");
    expect(turns.find((turn) => turn.item.id === "rp-fr-pres")?.intro).toContain("Emmanuel Macron");
    expect(turns.find((turn) => turn.item.id === "rp-year")?.intro).toContain(String(new Date().getFullYear()));
    expect(turns.every((turn) => turn.options.length === 0)).toBe(true);
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