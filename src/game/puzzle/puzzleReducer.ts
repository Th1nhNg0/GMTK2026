import type { EngineTransition, GameEffect } from "../effects";
import { calculateOperation } from "./calculateOperation";
import { findClosestResult } from "./closestResult";
import { getBaseDamage } from "./scoring";
import type { NumberTile, Operation, PuzzleAction, PuzzleResolution, PuzzleState } from "./types";

function transition(state: PuzzleState, effects: GameEffect[] = []): EngineTransition<PuzzleState> {
  return { state, effects };
}

function invalid(state: PuzzleState, message: string): EngineTransition<PuzzleState> {
  return transition(state, [{ type: "INVALID_ACTION", message }]);
}

function resolvePuzzle(
  state: PuzzleState,
  reason: PuzzleResolution["reason"],
  submittedValue?: number,
): EngineTransition<PuzzleState> {
  const distance =
    submittedValue === undefined ? undefined : Math.abs(state.target - submittedValue);
  const baseDamage = getBaseDamage(distance);
  const resolution: PuzzleResolution = {
    submittedValue,
    distance,
    baseDamage,
    finalDamage: baseDamage,
    reason,
  };
  const resolvedState: PuzzleState = {
    ...state,
    status: "resolved",
    selectedTileIds: [],
    selectedOperator: undefined,
    resolution,
  };
  return transition(resolvedState, [{ type: "PUZZLE_RESOLVED", resolution }]);
}

function applyOperation(state: PuzzleState): EngineTransition<PuzzleState> {
  if (state.selectedTileIds.length !== 2 || !state.selectedOperator) {
    return invalid(state, "Select two number tiles and an operator first.");
  }

  const [leftTileId, rightTileId] = state.selectedTileIds;
  const left = state.tiles[leftTileId];
  const right = state.tiles[rightTileId];

  if (!left || !right || left.status !== "available" || right.status !== "available") {
    return invalid(state, "Both selected tiles must still be available.");
  }

  const calculation = calculateOperation(left.value, right.value, state.selectedOperator);
  if (!calculation.valid) {
    return transition(state, [
      {
        type: "INVALID_ACTION",
        message: "That operation does not produce a positive whole number.",
        reason: calculation.reason,
      },
    ]);
  }

  const sequence = state.nextOperationSequence;
  const operationId = `${state.puzzleId}:operation:${sequence}`;
  const resultTileId = `${state.puzzleId}:result:${sequence}`;
  const operation: Operation = {
    operationId,
    leftTileId,
    rightTileId,
    operator: state.selectedOperator,
    resultTileId,
    result: calculation.result,
    sequence,
  };
  const resultTile: NumberTile = {
    tileId: resultTileId,
    value: calculation.result,
    status: "available",
    createdByOperationId: operationId,
  };
  const operations = [...state.operations, operation];
  const nextState: PuzzleState = {
    ...state,
    tiles: {
      ...state.tiles,
      [leftTileId]: { ...left, status: "consumed" },
      [rightTileId]: { ...right, status: "consumed" },
      [resultTileId]: resultTile,
    },
    operations,
    selectedTileIds: [],
    selectedOperator: undefined,
    nextOperationSequence: sequence + 1,
    closestResult: findClosestResult(state.target, operations),
  };

  if (calculation.result === state.target) {
    const resolved = resolvePuzzle(nextState, "exact", calculation.result);
    return {
      state: resolved.state,
      effects: [{ type: "OPERATION_CREATED", operation }, ...resolved.effects],
    };
  }

  return transition(nextState, [{ type: "OPERATION_CREATED", operation }]);
}

function undoLastOperation(state: PuzzleState): EngineTransition<PuzzleState> {
  const operation = state.operations.at(-1);
  if (!operation) {
    return invalid(state, "There is no operation to undo.");
  }

  const left = state.tiles[operation.leftTileId];
  const right = state.tiles[operation.rightTileId];
  if (!left || !right) {
    return invalid(state, "The operation history is inconsistent.");
  }

  const tiles = { ...state.tiles };
  delete tiles[operation.resultTileId];
  tiles[operation.leftTileId] = { ...left, status: "available" };
  tiles[operation.rightTileId] = { ...right, status: "available" };
  const operations = state.operations.slice(0, -1);

  return transition(
    {
      ...state,
      tiles,
      operations,
      selectedTileIds: [],
      selectedOperator: undefined,
      closestResult: findClosestResult(state.target, operations),
    },
    [{ type: "OPERATION_UNDONE", operationId: operation.operationId }],
  );
}

export function reducePuzzle(
  state: PuzzleState,
  action: PuzzleAction,
): EngineTransition<PuzzleState> {
  if (state.status === "resolved") {
    return invalid(state, "This puzzle has already been resolved.");
  }

  switch (action.type) {
    case "TILE_SELECTED": {
      const tile = state.tiles[action.tileId];
      if (!tile || tile.status !== "available") {
        return invalid(state, "That number tile is not available.");
      }
      if (state.selectedTileIds.some((tileId) => tileId === action.tileId)) {
        return invalid(state, "A number tile cannot be selected twice.");
      }
      if (state.selectedTileIds.length >= 2) {
        return invalid(state, "Only two number tiles can be selected.");
      }
      const selectedTileIds = [...state.selectedTileIds, action.tileId] as
        [string] | [string, string];
      const nextState = { ...state, selectedTileIds };
      return selectedTileIds.length === 2 && nextState.selectedOperator
        ? applyOperation(nextState)
        : transition(nextState);
    }
    case "TILE_DESELECTED":
      return transition({
        ...state,
        selectedTileIds: state.selectedTileIds.filter((id) => id !== action.tileId) as
          [] | [string],
      });
    case "SELECTION_CLEARED":
      return transition({ ...state, selectedTileIds: [], selectedOperator: undefined });
    case "OPERATOR_SELECTED": {
      const nextState = { ...state, selectedOperator: action.operator };
      return nextState.selectedTileIds.length === 2
        ? applyOperation(nextState)
        : transition(nextState);
    }
    case "OPERATION_APPLIED":
      return applyOperation(state);
    case "LAST_OPERATION_UNDONE":
      return undoLastOperation(state);
    case "RESULT_SUBMITTED":
      return resolvePuzzle(state, action.reason, state.closestResult?.value);
  }
}
