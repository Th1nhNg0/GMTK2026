import { reduceGame } from "./reducer";
import type { GameAction, GameState } from "./run/types";

function dispatch(state: GameState, ...actions: GameAction[]): GameState {
  return actions.reduce((current, action) => reduceGame(current, action).state, state);
}

function startEncounter(seed = 123): GameState {
  const started = reduceGame({ screen: "title" }, { type: "RUN_STARTED", seed }).state;
  const normal = started.run?.map.nodes.find(
    (node) => node.status === "available" && node.type === "normal",
  );
  if (!normal) throw new Error("Expected an available normal node");
  return reduceGame(started, { type: "MAP_NODE_SELECTED", nodeId: normal.id }).state;
}

describe("game reducer", () => {
  it("creates identical runs from the same seed", () => {
    const action: GameAction = { type: "RUN_STARTED", seed: 90210 };
    expect(reduceGame({ screen: "title" }, action)).toEqual(
      reduceGame({ screen: "title" }, action),
    );
  });

  it("starts an encounter with six cards, a target, and visible intent", () => {
    const state = startEncounter();
    expect(state.screen).toBe("encounter");
    expect(state.run?.encounter?.handCardIds).toHaveLength(6);
    expect(state.run?.encounter?.puzzle.target).toBeGreaterThanOrEqual(100);
    expect(state.run?.encounter?.enemy.currentIntent.description).toBeTruthy();
  });

  it.each([
    ["normal", 3],
    ["elite", 4],
    ["boss", 5],
  ] as const)("uses the required %s encounter length", (encounterType, rounds) => {
    const started = reduceGame({ screen: "title" }, { type: "RUN_STARTED", seed: 44 }).state;
    const encounter = reduceGame(started, {
      type: "DEBUG_ENCOUNTER_STARTED",
      encounterType,
    }).state;
    expect(encounter.run?.encounter?.maxRounds).toBe(rounds);
  });

  it("does not let an enemy act after lethal exact damage", () => {
    let state = startEncounter();
    const encounter = state.run!.encounter!;
    const [left, right] = encounter.puzzle.sourceTileIds;
    state = {
      ...state,
      run: {
        ...state.run!,
        encounter: {
          ...encounter,
          enemy: { ...encounter.enemy, hp: 1 },
          puzzle: {
            ...encounter.puzzle,
            target: 100,
            tiles: {
              ...encounter.puzzle.tiles,
              [left!]: { ...encounter.puzzle.tiles[left!]!, value: 50 },
              [right!]: { ...encounter.puzzle.tiles[right!]!, value: 50 },
            },
          },
        },
      },
    };
    const hpBefore = state.run!.hp;
    state = dispatch(
      state,
      { type: "PUZZLE_ACTION", action: { type: "TILE_SELECTED", tileId: left! } },
      { type: "PUZZLE_ACTION", action: { type: "TILE_SELECTED", tileId: right! } },
      { type: "PUZZLE_ACTION", action: { type: "OPERATOR_SELECTED", operator: "add" } },
    );
    expect(state.run?.encounter?.status).toBe("won");
    expect(state.run?.hp).toBe(hpBefore);
  });

  it("consumes a consumable from one of three slots", () => {
    const state = startEncounter();
    const used = reduceGame(state, { type: "CONSUMABLE_USED", slotIndex: 0 }).state;
    expect(used.run?.consumableSlots).toHaveLength(3);
    expect(used.run?.consumableSlots[0]).toBeNull();
    expect(used.run?.encounter?.puzzle.timeBonusSeconds).toBe(15);
  });

  it("applies relic damage modifiers and enemy armor in the combat pipeline", () => {
    let state = dispatch(
      startEncounter(),
      { type: "DEBUG_RELIC_GRANTED", relicId: "brass-abacus" },
      { type: "DEBUG_EXACT_SETUP" },
    );
    state = {
      ...state,
      run: {
        ...state.run!,
        encounter: {
          ...state.run!.encounter!,
          enemy: {
            ...state.run!.encounter!.enemy,
            armor: 3,
            currentIntent: {
              ...state.run!.encounter!.enemy.currentIntent,
              type: "attack",
              value: 0,
            },
          },
        },
      },
    };
    const enemyHpBefore = state.run!.encounter!.enemy.hp;
    const [left, right] = state.run!.encounter!.puzzle.sourceTileIds;
    state = dispatch(
      state,
      { type: "PUZZLE_ACTION", action: { type: "TILE_SELECTED", tileId: left! } },
      { type: "PUZZLE_ACTION", action: { type: "TILE_SELECTED", tileId: right! } },
      { type: "PUZZLE_ACTION", action: { type: "OPERATOR_SELECTED", operator: "add" } },
    );
    expect(state.run?.encounter?.lastRound?.resolution.finalDamage).toBe(11);
    expect(state.run?.encounter?.enemy.armor).toBe(0);
    expect(state.run?.encounter?.enemy.hp).toBe(enemyHpBefore - 8);
  });

  it("applies the Final Examiner's visible exact-answer weakness", () => {
    let state = reduceGame(
      reduceGame({ screen: "title" }, { type: "RUN_STARTED", seed: 2026 }).state,
      { type: "DEBUG_ENCOUNTER_STARTED", encounterType: "boss" },
    ).state;
    state = reduceGame(state, { type: "DEBUG_EXACT_SETUP" }).state;
    const [left, right] = state.run!.encounter!.puzzle.sourceTileIds;
    state = dispatch(
      state,
      { type: "PUZZLE_ACTION", action: { type: "TILE_SELECTED", tileId: left! } },
      { type: "PUZZLE_ACTION", action: { type: "TILE_SELECTED", tileId: right! } },
      { type: "PUZZLE_ACTION", action: { type: "OPERATOR_SELECTED", operator: "add" } },
    );
    expect(state.run?.encounter?.lastRound?.resolution.baseDamage).toBe(10);
    expect(state.run?.encounter?.lastRound?.resolution.finalDamage).toBe(12);
  });

  it("returns to title with no run state", () => {
    const returned = reduceGame(startEncounter(), { type: "RETURNED_TO_TITLE" }).state;
    expect(returned).toEqual({ screen: "title" });
  });
});
