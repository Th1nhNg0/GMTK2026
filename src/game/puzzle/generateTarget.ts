import type { RngState } from "../rng";
import { calculateOperation } from "./calculateOperation";
import type { PuzzleDifficultyProfile } from "./difficulty";
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

const DEFAULT_DIFFICULTY: PuzzleDifficultyProfile = {
  desiredOperations: 2,
  minimumTarget: 100,
  maximumTarget: 999,
  preferRoundTargets: true,
};

function targetScore(
  target: number,
  operations: number,
  difficulty: PuzzleDifficultyProfile,
): readonly number[] {
  const rangeDistance =
    target < difficulty.minimumTarget
      ? difficulty.minimumTarget - target
      : target > difficulty.maximumTarget
        ? target - difficulty.maximumTarget
        : 0;
  const center = (difficulty.minimumTarget + difficulty.maximumTarget) / 2;
  const readability = difficulty.preferRoundTargets
    ? target % 10 === 0
      ? 0
      : target % 5 === 0
        ? 1
        : 2
    : 0;
  return [
    Math.abs(operations - difficulty.desiredOperations),
    rangeDistance,
    readability,
    Math.abs(target - center),
    target,
  ];
}

function compareScores(left: readonly number[], right: readonly number[]): number {
  for (let index = 0; index < left.length; index += 1) {
    const difference = left[index]! - right[index]!;
    if (difference !== 0) return difference;
  }
  return 0;
}

export function generateTarget(
  numbers: readonly number[],
  rng: RngState,
  difficulty: PuzzleDifficultyProfile = DEFAULT_DIFFICULTY,
): GeneratedTarget {
  const depths = reachableTargetDepths(numbers);
  const challenging = [...depths.entries()].filter(([, depth]) => depth >= 2);
  const candidates = challenging.length ? challenging : [...depths.entries()];
  if (!candidates.length) {
    return { target: difficulty.minimumTarget, minimumOperations: 0, rng };
  }
  const [target, minimumOperations] = candidates.sort((left, right) =>
    compareScores(
      targetScore(left[0], left[1], difficulty),
      targetScore(right[0], right[1], difficulty),
    ),
  )[0]!;
  return { target, minimumOperations, rng };
}
