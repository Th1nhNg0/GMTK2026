import { puzzleDifficultyFor } from "./difficulty";

describe("puzzle difficulty director", () => {
  it("raises required solution depth across the run", () => {
    expect(puzzleDifficultyFor(1, "normal", 1).desiredOperations).toBe(2);
    expect(puzzleDifficultyFor(6, "normal", 2).desiredOperations).toBe(3);
    expect(puzzleDifficultyFor(8, "elite", 3).desiredOperations).toBe(4);
    expect(puzzleDifficultyFor(11, "boss", 4).desiredOperations).toBe(5);
  });

  it("keeps introductory targets smaller and easier to read", () => {
    const early = puzzleDifficultyFor(1, "normal", 1);
    const late = puzzleDifficultyFor(9, "elite", 4);
    expect(early.maximumTarget).toBeLessThan(late.maximumTarget);
    expect(early.preferRoundTargets).toBe(true);
    expect(late.preferRoundTargets).toBe(false);
  });
});
