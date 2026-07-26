import type { OperationCalculation, Operator } from "./types";

export function calculateOperation(
  left: number,
  right: number,
  operator: Operator,
): OperationCalculation {
  if (operator === "divide" && right === 0) {
    return { valid: false, reason: "division-by-zero" };
  }

  if (!Number.isSafeInteger(left) || !Number.isSafeInteger(right) || left <= 0 || right <= 0) {
    return { valid: false, reason: "invalid-operand" };
  }

  let result: number;

  switch (operator) {
    case "add":
      result = left + right;
      break;
    case "subtract":
      result = left - right;
      break;
    case "multiply":
      result = left * right;
      break;
    case "divide":
      if (left % right !== 0) {
        return { valid: false, reason: "non-integer-result" };
      }
      result = left / right;
      break;
  }

  if (!Number.isInteger(result)) {
    return { valid: false, reason: "non-integer-result" };
  }

  if (result <= 0) {
    return { valid: false, reason: "non-positive-result" };
  }

  if (!Number.isSafeInteger(result)) {
    return { valid: false, reason: "unsafe-integer-result" };
  }

  return { valid: true, result };
}
