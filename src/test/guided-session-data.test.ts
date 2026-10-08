import { describe, expect, it } from "vitest";
import { buildPlan, skillLevels } from "../lib/builder";
import { REPERES, datedReperes } from "../lib/content";
import { toPlay } from "../lib/builder";
import { confirmText, discussionTurns, revealText, REINFORCED_INSTRUCTIONS } from "../lib/discussion";
import { deriveParams, summariseSignals } from "../lib/adaptive-profile";
import { isVoiceText } from "../lib/voice-texts";

const TOPICS = ["i:sante", "i:medecine", "i:sciences", "i:actualite", "i:art", "i:histoire", "i:geographie", "i:nature", "i:litterature", "i:technologie", "i:cuisine", "i:sport"];

describe("Guided session data", () => {
  it("only says sentences the natural voice can produce (never a robot fallback)", () => {
    const missing = new Set<string>();
    const check = (t: string | null | undefined) => {
      if (!t) return;
      if (!isVoiceText(t)) missing.add(t);
    };
    for (let n = 0; n < 40; n++) {
      const plan = buildPlan([], [TOPICS[n % TOPICS.length]!, TOPICS[(n + 3) % TOPICS.length]!, "i:actualite"], 1 + (n % 3));
      for (const turn of discussionTurns(plan.items, "regard")) {
        [turn.item.recall, turn.intro, turn.prompt, turn.instruction, turn.followUp, turn.model, ...turn.options.map((o) => o.label)].forEach(check);
        if (turn.answer) [confirmText(turn.answer), revealText(turn.answer)].forEach(check);
      }
    }
    ["Donnez votre avis à voix haute.", "Voici une formulation possible.", "Très bien dit.", ...REINFORCED_INSTRUCTIONS].forEach(check);
    for (const turn of discussionTurns(datedReperes(new Date()).map((i) => toPlay(i, 1)), "regard")) [turn.prompt, turn.followUp, turn.model, turn.instruction].forEach(check);
    expect([...missing]).toEqual([]);
  });
  it("gives every knowledge question an answer that is among its choices", () => {
    for (let n = 0; n < 20; n++) {
      for (const turn of discussionTurns(buildPlan([], TOPICS, 1).items, "regard")) {
        if (turn.item.kind === "mcq") {
          expect(turn.answer).toBeTruthy();
          expect(turn.options.some((o) => o.label === turn.answer)).toBe(true);
        }
        if (turn.phase === "exchange") expect(turn.answer).toBeNull();
      }
    }
  });
  it("adapts difficulty from silent knowledge outcomes", () => {
    const now = new Date().toISOString();
    const easy = Array.from({ length: 6 }, () => ({ item_id: "sq-monet-c", kind: "mcq", skill: "information", outcome: "spontaneous", created_at: now, response_ms: 3000 }));
    const hard = Array.from({ length: 6 }, () => ({ item_id: "sq-monet-c", kind: "mcq", skill: "information", outcome: "revealed", created_at: now, response_ms: null }));
    expect(skillLevels(easy, 2)["information"]).toBe(3);
    expect(skillLevels(hard, 2)["information"]).toBe(1);
  });
  it("counts knowledge turns in the language-support summary", () => {
    const s = summariseSignals([{ kind: "mcq", outcome: "after_cue", option_count: 3 }, { kind: "evoke", outcome: "revealed" }, { kind: "signal:notunderstood" }]);
    expect(s).toMatchObject({ turns: 2, shared: 1, notUnderstood: 1, avgWords: 0 });
  });
  it("never asks orientation questions (year, month, season) and keeps facts dated", () => {
    for (const item of [...REPERES, ...datedReperes(new Date())]) {
      const text = item.kind === "oral" ? item.steps.join(" ") : item.audio;
      expect(text).not.toMatch(/quelle année sommes|quel mois sommes|quelle est la saison|aujourd'hui \?/i);
    }
  });
  it("turns on reinforced support when comprehension is often difficult, unless the caregiver says no", () => {
    expect(deriveParams({ comprehension: 4 }).reinforced).toBe(true);
    expect(deriveParams({ comprehension: 4, reinforced: false }).reinforced).toBe(false);
    expect(deriveParams({ comprehension: 1 }).reinforced).toBe(false);
  });
});

describe("Dates and variety", () => {
  it("states the real date, never a clock-less one", () => {
    const y = new Date().getFullYear();
    expect(datedReperes(new Date()).some((i) => i.kind === "oral" && i.steps[0]!.includes(String(y)))).toBe(true);
    expect(datedReperes(new Date(0))).toEqual([]);
  });
  it("opens with Repères at most every 3 days, with different items", () => {
    const now = Date.now();
    const plan1 = buildPlan([], ["i:actualite", "i:art"], 1).items.filter((i) => i.id.startsWith("rp-"));
    expect(plan1.length).toBe(2);
    const past = plan1.map((i) => ({ item_id: i.id, kind: "discussion:x", skill: i.skill, outcome: "after_repeat", created_at: new Date(now - 864e5).toISOString(), response_ms: null }));
    expect(buildPlan(past, ["i:actualite", "i:art"], 1).items.some((i) => i.id.startsWith("rp-"))).toBe(false);
    const older = past.map((r) => ({ ...r, created_at: new Date(now - 4 * 864e5).toISOString() }));
    const plan2 = buildPlan(older, ["i:actualite", "i:art"], 1).items.filter((i) => i.id.startsWith("rp-"));
    expect(plan2.length).toBe(2);
    expect(plan2.some((i) => plan1.some((j) => j.id === i.id))).toBe(false);
  });
});
