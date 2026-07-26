import type { PuzzleState, SourceTileInput } from "./types";

export function createPuzzle(
  puzzleId: string,
  target: number,
  sourceTiles: readonly SourceTileInput[],
  minimumOperations = 0,
): PuzzleState {
  if (!puzzleId.trim()) {
    throw new Error("Puzzle ID is required");
  }
  if (!Number.isSafeInteger(target) || target < 100 || target > 999) {
    throw new Error("Puzzle target must be an integer from 100 to 999");
  }
  if (sourceTiles.length !== 6) {
    throw new Error("A puzzle requires exactly six source tiles");
  }

  const tileIds = new Set<string>();
  const tiles: PuzzleState["tiles"] = {};

  for (const source of sourceTiles) {
    if (!source.tileId.trim() || tileIds.has(source.tileId)) {
      throw new Error("Source tile IDs must be non-empty and unique");
    }
    if (!Number.isSafeInteger(source.value) || source.value <= 0) {
      throw new Error("Source tile values must be positive safe integers");
    }
    tileIds.add(source.tileId);
    tiles[source.tileId] = {
      ...source,
      status: "available",
    };
  }

  return {
    puzzleId,
    target,
    minimumOperations,
    sourceTileIds: sourceTiles.map((tile) => tile.tileId),
    tiles,
    operations: [],
    selectedTileIds: [],
    nextOperationSequence: 1,
    timeBonusSeconds: 0,
    status: "active",
  };
}
