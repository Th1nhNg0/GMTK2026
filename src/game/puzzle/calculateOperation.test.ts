import { calculateOperation } from "./calculateOperation";

describe("calculateOperation", () => {
  it.each([
    ["add", 25, 75, 100],
    ["subtract", 75, 25, 50],
    ["multiply", 8, 7, 56],
    ["divide", 100, 4, 25],
  ] as const)("calculates %s", (operator, left, right, expected) => {
    expect(calculateOperation(left, right, operator)).toEqual({ valid: true, result: expected });
  });

  it("preserves subtraction order", () => {
    expect(calculateOperation(25, 75, "subtract")).toEqual({
      valid: false,
      reason: "non-positive-result",
    });
  });

  it("preserves division order and rejects fractions", () => {
    expect(calculateOperation(3, 10, "divide")).toEqual({
      valid: false,
      reason: "non-integer-result",
    });
  });

  it("rejects division by zero distinctly", () => {
    expect(calculateOperation(10, 0, "divide")).toEqual({
      valid: false,
      reason: "division-by-zero",
    });
  });

  it.each([
    [0, 2],
    [-1, 2],
    [1.5, 2],
    [Number.MAX_SAFE_INTEGER + 1, 2],
  ])("rejects invalid operands %s and %s", (left, right) => {
    expect(calculateOperation(left, right, "add")).toEqual({
      valid: false,
      reason: "invalid-operand",
    });
  });

  it("rejects unsafe results", () => {
    expect(calculateOperation(Number.MAX_SAFE_INTEGER, 2, "multiply")).toEqual({
      valid: false,
      reason: "unsafe-integer-result",
    });
  });
});
