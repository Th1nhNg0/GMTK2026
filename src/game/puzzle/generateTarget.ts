import type { RngState } from "../rng";
import { randomInt } from "../rng";
import { calculateOperation } from "./calculateOperation";
import type { Operator } from "./types";

const OPERATORS: Operator[] = ["add", "subtract", "multiply", "divide"];
const MAX_INTERMEDIATE = 9_999;

export interface GeneratedTarget {
  target: number;
  minimumOperations: number;
  rng: RngState;
}

export function reachableTargetDepths(numbers: readonly number[]): Map<number, number> {
  if (numbers.length !== 6) throw new Error("Target generation requires exactly six numbers");
  const byMask = new Map<number, Map<number, number>>();

  for (let index = 0; index < numbers.length; index += 1) {
    const value = numbers[index];
    if (!value || !Number.isSafeInteger(value) || value <= 0) {
      throw new Error("Target generation requires positive integer numbers");
    }
    byMask.set(1 << index, new Map([[value, 0]]));
  }

  const fullMask = (1 << numbers.length) - 1;
  for (let mask = 1; mask <= fullMask; mask += 1) {
    const existing = byMask.get(mask) ?? new Map<number, number>();
    byMask.set(mask, existing);

    for (let leftMask = (mask - 1) & mask; leftMask > 0; leftMask = (leftMask - 1) & mask) {
      const rightMask = mask ^ leftMask;
      if (rightMask === 0 || leftMask > rightMask) continue;
      const leftValues = byMask.get(leftMask);
      const rightValues = byMask.get(rightMask);
      if (!leftValues || !rightValues) continue;

      for (const [left, leftDepth] of leftValues) {
        for (const [right, rightDepth] of rightValues) {
          for (const operator of OPERATORS) {
            const orders =
              operator === "subtract" || operator === "divide"
                ? [
                    [left, right],
                    [right, left],
                  ]
                : [[left, right]];
            for (const [first, second] of orders) {
              const calculated = calculateOperation(first!, second!, operator);
              if (!calculated.valid || calculated.result > MAX_INTERMEDIATE) continue;
              const depth = leftDepth + rightDepth + 1;
              const previous = existing.get(calculated.result);
              if (previous === undefined || depth < previous)
                existing.set(calculated.result, depth);
            }
          }
        }
      }
    }
  }

  const targetDepths = new Map<number, number>();
  for (const values of byMask.values()) {
    for (const [value, depth] of values) {
      if (value < 100 || value > 999) continue;
      const previous = targetDepths.get(value);
      if (previous === undefined || depth < previous) targetDepths.set(value, depth);
    }
  }
  return targetDepths;
}

export function generateTarget(numbers: readonly number[], rng: RngState): GeneratedTarget {
  const depths = reachableTargetDepths(numbers);
  const challenging = [...depths.entries()]
    .filter(([, depth]) => depth >= 2)
    .sort(([left], [right]) => left - right);
  const candidates = challenging.length
    ? challenging
    : [...depths.entries()].sort(([left], [right]) => left - right);
  if (!candidates.length) {
    const fallback = randomInt(rng, 100, 999);
    return { target: fallback.value, minimumOperations: 0, rng: fallback.rng };
  }
  const pick = randomInt(rng, 0, candidates.length - 1);
  const [target, minimumOperations] = candidates[pick.value]!;
  return { target, minimumOperations, rng: pick.rng };
}
