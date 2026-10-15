import { describe, expect, it } from "vitest";
import { buildPlan, skillLevels } from "../lib/builder";
import { REPERES, datedReperes } from "../lib/content";
import { toPlay } from "../lib/builder";
import { closing, discussionTurns, hintFor, revealsAnswer, REINFORCED_INSTRUCTIONS } from "../lib/discussion";
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
        if (turn.answer) [...closing(turn.answer, true).say, ...closing(turn.answer, false).say].forEach(check);
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
  it("opens with one Repère each session (a different one) and talks about the date at most every 3 days", () => {
    const now = Date.now();
    const talk = /^rp-(year|month|ex-season)$/;
    const plan1 = buildPlan([], ["i:actualite", "i:art"], 1).items.filter((i) => i.id.startsWith("rp-"));
    expect(plan1.length).toBe(2);
    expect(plan1.some((i) => talk.test(i.id))).toBe(true);
    const past = plan1.map((i) => ({ item_id: i.id, kind: "discussion:x", skill: i.skill, outcome: "after_repeat", created_at: new Date(now - 864e5).toISOString(), response_ms: null }));
    const next = buildPlan(past, ["i:actualite", "i:art"], 1).items.filter((i) => i.id.startsWith("rp-"));
    expect(next.length).toBe(1);
    expect(next.some((i) => talk.test(i.id))).toBe(false);
    expect(next.some((i) => plan1.some((j) => j.id === i.id))).toBe(false);
    const older = past.map((r) => ({ ...r, created_at: new Date(now - 4 * 864e5).toISOString() }));
    const plan2 = buildPlan(older, ["i:actualite", "i:art"], 1).items.filter((i) => i.id.startsWith("rp-"));
    expect(plan2.length).toBe(2);
    expect(plan2.some((i) => plan1.some((j) => j.id === i.id))).toBe(false);
  });

});

describe("Sonia's feedback (15 Oct)", () => {
  const SINGLE = ["sante", "medecine", "sciences", "histoire", "art", "geographie", "nature", "litterature", "technologie", "cuisine", "sport", "actualite"];
  it("keeps every activity within the chosen interests (plus transversal time/proverb items)", () => {
    for (const one of SINGLE)
      for (let n = 0; n < 15; n++) {
        const items = buildPlan([], [`i:${one}`], 1).items;
        for (const i of items) expect([one, "general"], `${one}: ${i.id} (${i.topic})`).toContain(i.topic);
      }
    for (let n = 0; n < 30; n++) {
      const items = buildPlan([], ["i:actualite", "i:medecine"], 1).items;
      expect(items.some((i) => i.id.startsWith("sq-renaissance"))).toBe(false);
    }
  });
  it("lets every knowledge turn be answered by touch, with the answer among the choices", () => {
    for (let n = 0; n < 40; n++)
      for (const turn of discussionTurns(buildPlan([], [`i:${SINGLE[n % SINGLE.length]}`, "i:sante"], 1 + (n % 3)).items, "regard")) {
        if (turn.phase !== "knowledge") continue;
        expect(turn.options.length, turn.item.id).toBeGreaterThanOrEqual(2);
        expect(turn.options.some((o) => o.label === turn.answer), turn.item.id).toBe(true);
      }
  });
  it("includes a sentence to repeat, word by word, in every session — even when shortened", () => {
    for (let n = 0; n < 30; n++) {
      const turns = discussionTurns(buildPlan([], [`i:${SINGLE[n % SINGLE.length]}`], 1).items, "regard", 8);
      const repeat = turns.filter((t) => t.phase === "repeat");
      expect(repeat.length).toBeGreaterThan(0);
      for (const t of repeat) expect(t.model).toBe(t.prompt);
    }
  });
  it("varies the questions from one session to the next", () => {
    const now = Date.now();
    const first = buildPlan([], ["i:sante", "i:medecine", "i:sciences", "i:actualite", "i:art"], 1).items;
    const past = first.map((i) => ({ item_id: i.id, kind: "mcq", skill: i.skill, outcome: "spontaneous", created_at: new Date(now - 864e5).toISOString(), response_ms: 3000 }));
    const second = buildPlan(past, ["i:sante", "i:medecine", "i:sciences", "i:actualite", "i:art"], 1).items;
    const repeated = second.filter((i) => first.some((j) => j.id === i.id) && !i.recall);
    expect(repeated.length).toBeLessThanOrEqual(1);
  });
});

describe("Feedback 15 Oct (2)", () => {
  const ALL = ["i:sante", "i:medecine", "i:sciences", "i:actualite", "i:art", "i:histoire", "i:geographie", "i:nature", "i:litterature", "i:technologie", "i:cuisine", "i:sport"];
  it("never gives the answer away in a hint", () => {
    for (let n = 0; n < 60; n++)
      for (const turn of discussionTurns(buildPlan([], [ALL[n % ALL.length]!, ALL[(n + 5) % ALL.length]!], 1 + (n % 3)).items, "regard")) {
        const h = hintFor(turn);
        if (!h || !turn.answer) continue;
        expect(revealsAnswer(h.caption, turn.answer), `${turn.item.id}: ${h.caption}`).toBe(false);
        if (h.remove !== null) expect(turn.options[h.remove]!.label).not.toBe(turn.answer);
        if (h.remove !== null) expect(turn.options.length).toBeGreaterThanOrEqual(3);
      }
  });
  it("praises a right answer aloud, then says it", () => {
    expect(closing("le Louvre", true, "Très juste.").say).toEqual(["Très juste.", "Oui, c'est bien cela : le Louvre."]);
    expect(closing("Vrai", false).say).toEqual(["Voici la réponse.", "Vrai"]);
  });
});
