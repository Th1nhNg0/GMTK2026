import { createRng } from "../rng";
import { createEncounterBag, createStartingBag, drawHand } from "../run/bag";
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

  it("falls back safely when a deliberately weak hand cannot reach three digits", () => {
    const generated = generateTarget([1, 1, 2, 2, 3, 3], createRng(7));
    expect(generated.target).toBeGreaterThanOrEqual(100);
    expect(generated.target).toBeLessThanOrEqual(999);
    expect(generated.minimumOperations).toBe(0);
  });

  it("finds multi-step exact targets for representative starting-bag draws", () => {
    const cards = createStartingBag();
    const values = new Map(cards.map((card) => [card.definitionId, card.value]));
    const fallbacks: number[] = [];
    for (let seed = 1; seed <= 100; seed += 1) {
      const encounterBag = createEncounterBag(cards, createRng(seed));
      const drawn = drawHand(encounterBag.bag, encounterBag.rng);
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
