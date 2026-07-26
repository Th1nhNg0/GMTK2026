import { createPuzzle } from "./createPuzzle";
import { reducePuzzle } from "./puzzleReducer";
import type { Operator, PuzzleAction, PuzzleState } from "./types";

const sources = [25, 75, 4, 10, 3, 8].map((value, index) => ({
  tileId: `source-${index}`,
  sourceDefinitionId: `card-${index}`,
  value,
}));

function puzzle(target = 500): PuzzleState {
  return createPuzzle("puzzle-1", target, sources);
}

function dispatch(state: PuzzleState, ...actions: PuzzleAction[]): PuzzleState {
  return actions.reduce((current, action) => reducePuzzle(current, action).state, state);
}

function operate(
  state: PuzzleState,
  leftTileId: string,
  rightTileId: string,
  operator: Operator,
): PuzzleState {
  return dispatch(
    state,
    { type: "TILE_SELECTED", tileId: leftTileId },
    { type: "TILE_SELECTED", tileId: rightTileId },
    { type: "OPERATOR_SELECTED", operator },
  );
}

describe("createPuzzle", () => {
  it("creates six available source tiles", () => {
    const state = puzzle();
    expect(state.sourceTileIds).toHaveLength(6);
    expect(Object.values(state.tiles).every((tile) => tile.status === "available")).toBe(true);
  });

  it("rejects invalid puzzle construction", () => {
    expect(() => createPuzzle("x", 99, sources)).toThrow(/target/);
    expect(() => createPuzzle("x", 500, sources.slice(0, 5))).toThrow(/six/);
  });
});

describe("reducePuzzle", () => {
  it("consumes inputs and creates a deterministic result tile", () => {
    const state = operate(puzzle(), "source-0", "source-1", "add");
    expect(state.tiles["source-0"]?.status).toBe("consumed");
    expect(state.tiles["source-1"]?.status).toBe("consumed");
    expect(state.tiles["puzzle-1:result:1"]).toMatchObject({ value: 100, status: "available" });
    expect(state.operations).toHaveLength(1);
    expect(state.selectedTileIds).toEqual([]);
  });

  it("applies automatically as soon as two tiles and an operator are selected", () => {
    const state = dispatch(
      puzzle(),
      { type: "OPERATOR_SELECTED", operator: "add" },
      { type: "TILE_SELECTED", tileId: "source-0" },
      { type: "TILE_SELECTED", tileId: "source-1" },
    );
    expect(state.operations).toHaveLength(1);
    expect(state.tiles["puzzle-1:result:1"]?.value).toBe(100);
  });

  it("allows a result tile to be used in another operation", () => {
    const first = operate(puzzle(800), "source-0", "source-1", "add");
    const second = operate(first, "puzzle-1:result:1", "source-5", "multiply");
    expect(second.tiles["puzzle-1:result:2"]?.value).toBe(800);
    expect(second.status).toBe("resolved");
    expect(second.resolution?.reason).toBe("exact");
  });

  it("rejects selection of consumed and duplicate tiles", () => {
    const state = operate(puzzle(), "source-0", "source-1", "add");
    const consumed = reducePuzzle(state, { type: "TILE_SELECTED", tileId: "source-0" });
    expect(consumed.effects[0]?.type).toBe("INVALID_ACTION");

    const selected = reducePuzzle(puzzle(), { type: "TILE_SELECTED", tileId: "source-2" }).state;
    const duplicate = reducePuzzle(selected, { type: "TILE_SELECTED", tileId: "source-2" });
    expect(duplicate.effects[0]?.type).toBe("INVALID_ACTION");
  });

  it("rejects a third selected tile", () => {
    const selected = dispatch(
      puzzle(),
      { type: "TILE_SELECTED", tileId: "source-0" },
      { type: "TILE_SELECTED", tileId: "source-1" },
    );
    const result = reducePuzzle(selected, { type: "TILE_SELECTED", tileId: "source-2" });
    expect(result.effects[0]).toMatchObject({ type: "INVALID_ACTION" });
  });

  it("emits the arithmetic failure without changing state", () => {
    const state = dispatch(
      puzzle(),
      { type: "TILE_SELECTED", tileId: "source-2" },
      { type: "TILE_SELECTED", tileId: "source-3" },
      { type: "OPERATOR_SELECTED", operator: "subtract" },
    );
    const result = reducePuzzle(state, { type: "OPERATION_APPLIED" });
    expect(result.state).toBe(state);
    expect(result.effects[0]).toMatchObject({
      type: "INVALID_ACTION",
      reason: "non-positive-result",
    });
  });

  it("tracks the closest operation result and retains the first tie", () => {
    const first = operate(puzzle(102), "source-0", "source-1", "add");
    const second = operate(first, "source-3", "source-5", "multiply");
    expect(second.closestResult).toMatchObject({ value: 100, distance: 2, operationSequence: 1 });
  });

  it("undoes only the latest operation and recomputes closest", () => {
    const first = operate(puzzle(190), "source-0", "source-1", "add");
    const second = operate(first, "puzzle-1:result:1", "source-3", "add");
    const undone = reducePuzzle(second, { type: "LAST_OPERATION_UNDONE" }).state;
    expect(undone.operations).toHaveLength(1);
    expect(undone.tiles["puzzle-1:result:2"]).toBeUndefined();
    expect(undone.tiles["puzzle-1:result:1"]?.status).toBe("available");
    expect(undone.tiles["source-3"]?.status).toBe("available");
    expect(undone.closestResult?.value).toBe(100);
  });

  it("resolves manual and timeout submissions from the closest created result", () => {
    const active = operate(puzzle(104), "source-0", "source-1", "add");
    const manual = reducePuzzle(active, { type: "RESULT_SUBMITTED", reason: "manual" }).state;
    expect(manual.resolution).toMatchObject({ submittedValue: 100, distance: 4, baseDamage: 7 });

    const timeout = reducePuzzle(active, { type: "RESULT_SUBMITTED", reason: "timeout" }).state;
    expect(timeout.resolution?.reason).toBe("timeout");
  });

  it("treats a submission without created results as a miss", () => {
    const resolved = reducePuzzle(puzzle(), { type: "RESULT_SUBMITTED", reason: "timeout" }).state;
    expect(resolved.resolution).toEqual({
      submittedValue: undefined,
      distance: undefined,
      baseDamage: 0,
      finalDamage: 0,
      reason: "timeout",
    });
  });

  it("locks state after exact auto-resolution and prevents duplicate submission", () => {
    const exact = operate(puzzle(100), "source-0", "source-1", "add");
    expect(exact.resolution).toMatchObject({ reason: "exact", baseDamage: 10 });
    const duplicate = reducePuzzle(exact, { type: "RESULT_SUBMITTED", reason: "manual" });
    expect(duplicate.state).toBe(exact);
    expect(duplicate.effects[0]?.type).toBe("INVALID_ACTION");
  });

  it("is deterministic for the same state and actions", () => {
    const action: PuzzleAction = { type: "TILE_SELECTED", tileId: "source-0" };
    expect(reducePuzzle(puzzle(), action)).toEqual(reducePuzzle(puzzle(), action));
  });
});
