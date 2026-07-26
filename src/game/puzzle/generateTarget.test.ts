import { createRng } from "../rng";
import { createEncounterSequence, createNumberSet, drawHand } from "../run/numbers";
import { generateTarget, reachableTargetDepths } from "./generateTarget";

describe("reachable target generation", () => {
  it("generates a deterministic, exact-reachable target requiring multiple operations", () => {
    const numbers = [100, 50, 25, 8, 7, 3];
    const first = generateTarget(numbers, createRng(2026));
    const second = generateTarget(numbers, createRng(2026));
    expect(first).toEqual(second);
    expect(first.target).toBeGreaterThanOrEqual(100);
    expect(first.target).toBeLessThanOrEqual(999);
    expect(first.minimumOperations).toBeGreaterThanOrEqual(2);
    expect(reachableTargetDepths(numbers).get(first.target)).toBe(first.minimumOperations);
  });

  it("chooses the same measured target regardless of RNG state", () => {
    const numbers = [100, 50, 25, 8, 7, 3];
    const first = generateTarget(numbers, createRng(1));
    const second = generateTarget(numbers, createRng(999_999));
    expect(first.target).toBe(second.target);
    expect(first.minimumOperations).toBe(second.minimumOperations);
  });

  it("selects targets by requested solution depth", () => {
    const numbers = [100, 50, 25, 8, 7, 3];
    const early = generateTarget(numbers, createRng(1), {
      desiredOperations: 2,
      minimumTarget: 100,
      maximumTarget: 399,
      preferRoundTargets: true,
    });
    const boss = generateTarget(numbers, createRng(1), {
      desiredOperations: 5,
      minimumTarget: 300,
      maximumTarget: 999,
      preferRoundTargets: false,
    });
    expect(early.minimumOperations).toBe(2);
    expect(boss.minimumOperations).toBe(5);
    expect(early.target).toBeGreaterThanOrEqual(100);
    expect(early.target).toBeLessThanOrEqual(399);
    expect(boss.target).toBeGreaterThanOrEqual(300);
    expect(boss.target).toBeLessThanOrEqual(999);
  });

  it("falls back safely when a deliberately weak hand cannot reach three digits", () => {
    const generated = generateTarget([1, 1, 2, 2, 3, 3], createRng(7));
    expect(generated.target).toBeGreaterThanOrEqual(100);
    expect(generated.target).toBeLessThanOrEqual(999);
    expect(generated.minimumOperations).toBe(0);
  });

  it("finds multi-step exact targets for representative number sequences", () => {
    const cards = createNumberSet();
    const values = new Map(cards.map((card) => [card.definitionId, card.value]));
    const fallbacks: number[] = [];
    for (let seed = 1; seed <= 100; seed += 1) {
      const encounterSequence = createEncounterSequence(cards, createRng(seed));
      const drawn = drawHand(encounterSequence.numberSequence, encounterSequence.rng);
      const target = generateTarget(
        drawn.hand.map((cardId) => values.get(cardId)!),
        drawn.rng,
      );
      if (target.minimumOperations < 2) fallbacks.push(seed);
    }
    expect(fallbacks).toEqual([]);
  });

  it("rejects malformed hands", () => {
    expect(() => reachableTargetDepths([1, 2, 3])).toThrow(/six numbers/);
    expect(() => reachableTargetDepths([1, 2, 3, 4, 5, 0])).toThrow(/positive integer/);
  });
});
