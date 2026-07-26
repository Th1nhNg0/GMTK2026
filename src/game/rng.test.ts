import { createRng, nextRandom, randomInt, shuffle } from "./rng";

describe("seeded randomness", () => {
  it("repeats the same sequence for the same seed", () => {
    const first = nextRandom(createRng(12345));
    const second = nextRandom(createRng(12345));
    expect(first).toEqual(second);
  });

  it("produces bounded integers", () => {
    const result = randomInt(createRng(8), 100, 999);
    expect(result.value).toBeGreaterThanOrEqual(100);
    expect(result.value).toBeLessThanOrEqual(999);
  });

  it("shuffles deterministically without changing the input", () => {
    const input = [1, 2, 3, 4, 5, 6];
    const first = shuffle(createRng(42), input);
    const second = shuffle(createRng(42), input);
    expect(first).toEqual(second);
    expect(input).toEqual([1, 2, 3, 4, 5, 6]);
  });
});
