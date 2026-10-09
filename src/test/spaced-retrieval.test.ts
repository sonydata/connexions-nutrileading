import { describe, expect, it } from "vitest";
import { GAPS, cleanTargets, insertAt, nextTrial, pickTarget, srtTurn, targetProgress, targetVoiceTexts } from "../lib/spaced-retrieval";
import { confirmText, revealText } from "../lib/discussion";

const T = { id: "a", sentence: "Votre petite-fille s'appelle Léa.", question: "Comment s'appelle votre petite-fille ?", answer: "Léa" };
const B = { id: "b", sentence: "Vous habitez rue des Lilas.", question: "Dans quelle rue habitez-vous ?", answer: "rue des Lilas" };
const row = (id: string, step: number, outcome: string, daysAgo: number) => ({ item_id: `p:${id}`, kind: "srt", outcome, option_count: step, created_at: new Date(Date.now() - daysAgo * 864e5).toISOString() });

describe("Spaced retrieval", () => {
  it("doubles the gap after success and goes back after a miss, never pushing", () => {
    expect(nextTrial(0, true, 0)).toEqual({ gap: GAPS[0], step: 1 });
    expect(nextTrial(2, true, 0)).toEqual({ gap: GAPS[2], step: 3 });
    expect(nextTrial(3, false, 1)).toEqual({ gap: GAPS[1], step: 2 });
    expect(nextTrial(0, false, 1)).toEqual({ gap: 1, step: 0 });
    expect(nextTrial(0, false, 2)).toBeNull(); // two misses at the start: not today
    expect(nextTrial(GAPS.length, true, 0)).toBeNull(); // longest interval reached
  });
  it("keeps at least one other activity between two asks", () => {
    expect(insertAt(2, 1, 10)).toBe(4);
    expect(insertAt(7, 4, 10)).toBe(10);
    expect(insertAt(9, 1, 10)).toBeNull();
  });
  it("states the sentence first only on the first ask of the day", () => {
    expect(srtTurn(T, 0).intro).toBe(T.sentence);
    expect(srtTurn(T, 2).intro).toBeNull();
    expect(srtTurn(T, 0, true).intro).toBeNull();
    expect(srtTurn(T, 1).answer).toBe("Léa");
  });
  it("tracks progress: learning, paused after two first misses, known after 3 full sessions", () => {
    expect(targetProgress(T, []).status).toBe("new");
    expect(targetProgress(T, [row("a", 0, "spontaneous", 1)]).status).toBe("learning");
    expect(targetProgress(T, [row("a", 0, "revealed", 0), row("a", 0, "after_repeat", 0)]).status).toBe("paused");
    const full = [1, 3, 5].map((d) => row("a", GAPS.length, "spontaneous", d));
    expect(targetProgress(T, full).status).toBe("known");
  });
  it("picks a target being learned, then a new one, then weekly upkeep", () => {
    expect(pickTarget([T, B], [row("b", 1, "spontaneous", 1)])?.target.id).toBe("b");
    expect(pickTarget([T, B], [])?.target.id).toBe("a");
    const knownA = [1, 3, 5].map((d) => row("a", GAPS.length, "spontaneous", d + 8));
    expect(pickTarget([T], knownA)).toEqual({ target: T, maintenance: true });
    expect(pickTarget([T], [1, 3, 5].map((d) => row("a", GAPS.length, "spontaneous", d)))).toBeNull();
  });
  it("only voices the person's own sentences and cleans input", () => {
    expect(targetVoiceTexts(T)).toEqual([T.sentence, T.question, confirmText("Léa"), revealText("Léa")]);
    expect(cleanTargets([{ id: "x", question: " Q ? ", answer: " R ", sentence: "" }, { question: "", answer: "y" }, "bad"])).toEqual([{ id: "x", question: "Q ?", answer: "R", sentence: "" }]);
  });
});
