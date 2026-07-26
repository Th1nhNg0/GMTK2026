import { getBaseDamage } from "./scoring";

describe("getBaseDamage", () => {
  it.each([
    [undefined, 0],
    [0, 10],
    [1, 7],
    [5, 7],
    [6, 5],
    [10, 5],
    [11, 0],
  ] as const)("scores distance %s as %s", (distance, damage) => {
    expect(getBaseDamage(distance)).toBe(damage);
  });
});
