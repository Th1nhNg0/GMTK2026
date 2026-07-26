import type { ClosestResult, Operation } from "./types";

export function findClosestResult(
  target: number,
  operations: readonly Operation[],
): ClosestResult | undefined {
  let closest: ClosestResult | undefined;

  for (const operation of operations) {
    const distance = Math.abs(target - operation.result);
    if (!closest || distance < closest.distance) {
      closest = {
        tileId: operation.resultTileId,
        value: operation.result,
        distance,
        operationSequence: operation.sequence,
      };
    }
  }

  return closest;
}
