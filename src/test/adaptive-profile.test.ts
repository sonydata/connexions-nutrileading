import { describe, expect, it } from "vitest";
import { deriveParams, segment, summariseSignals } from "@/lib/adaptive-profile";

describe("adaptive profile", () => {
  it("keeps intellectual complexity independent from language support", () => {
    const p = deriveParams({ comprehension: 5, knowledge: 5 });
    expect(p.languageSupport).toBeGreaterThanOrEqual(2);
    expect(p.intellectualComplexity).toBe(5);
    expect(p.ideasPerUtterance).toBe(1);
  });
  it("shortens sessions for short attention", () => {
    expect(deriveParams({ attention: 4 }).sessionMinutes).toBeLessThanOrEqual(5);
    expect(deriveParams({ attention: 1 }).sessionMinutes).toBe(15);
  });
  it("adapts gradually, never from one answer", () => {
    const base = deriveParams({ comprehension: 2 });
    expect(deriveParams({ comprehension: 2 }, { turns: 2, repeats: 2, notUnderstood: 2, shared: 0, avgWords: 0 }).languageSupport).toBe(base.languageSupport);
    expect(deriveParams({ comprehension: 2 }, { turns: 10, repeats: 5, notUnderstood: 1, shared: 2, avgWords: 2 }).languageSupport).toBe(base.languageSupport + 1);
  });
  it("splits into one idea at a time", () => {
    expect(segment("Une étude parle du régime méditerranéen. Elle concerne la mémoire. Qu'en pensez-vous ?", { ideasPerUtterance: 1, maxSentenceWords: 8 })).toHaveLength(3);
    expect(segment("Phrase un. Phrase deux.", { ideasPerUtterance: 2, maxSentenceWords: 20 })).toHaveLength(1);
  });
  it("summarises signals", () => {
    const s = summariseSignals([{ kind: "signal:repeat" }, { kind: "discussion:regard:x:shared:independent", option_count: 10 }]);
    expect(s).toMatchObject({ turns: 1, shared: 1, repeats: 1, avgWords: 10 });
  });
});
