import { describe, expect, it } from "vitest";
import { calculateOperation } from "./puzzle/calculateOperation";
import type { Operator } from "./puzzle/types";
import { reduceGame } from "./reducer";
import { initialGameState } from "./reducer";
import type { GameState, MapNodeType, RewardKind } from "./run/types";

type Expression =
  | { type: "number"; index: number; value: number; operations: 0 }
  | {
      type: "operation";
      left: Expression;
      right: Expression;
      operator: Operator;
      value: number;
      operations: number;
    };

const OPERATORS: Operator[] = ["add", "subtract", "multiply", "divide"];
const MAX_INTERMEDIATE = 9_999;

function findExactExpression(numbers: readonly number[], target: number): Expression {
  const expressions = new Map<number, Map<number, Expression>>();
  for (let index = 0; index < numbers.length; index += 1) {
    expressions.set(
      1 << index,
      new Map([
        [numbers[index]!, { type: "number", index, value: numbers[index]!, operations: 0 }],
      ]),
    );
  }

  const fullMask = (1 << numbers.length) - 1;
  for (let mask = 1; mask <= fullMask; mask += 1) {
    const current = expressions.get(mask) ?? new Map<number, Expression>();
    expressions.set(mask, current);
    for (let leftMask = (mask - 1) & mask; leftMask > 0; leftMask = (leftMask - 1) & mask) {
      const rightMask = mask ^ leftMask;
      if (rightMask === 0 || leftMask > rightMask) continue;
      const leftExpressions = expressions.get(leftMask);
      const rightExpressions = expressions.get(rightMask);
      if (!leftExpressions || !rightExpressions) continue;

      for (const left of leftExpressions.values()) {
        for (const right of rightExpressions.values()) {
          for (const operator of OPERATORS) {
            const orders =
              operator === "subtract" || operator === "divide"
                ? [
                    [left, right],
                    [right, left],
                  ]
                : [[left, right]];
            for (const [first, second] of orders) {
              const result = calculateOperation(first!.value, second!.value, operator);
              if (!result.valid || result.result > MAX_INTERMEDIATE) continue;
              const candidate: Expression = {
                type: "operation",
                left: first!,
                right: second!,
                operator,
                value: result.result,
                operations: first!.operations + second!.operations + 1,
              };
              const previous = current.get(candidate.value);
              if (!previous || candidate.operations < previous.operations) {
                current.set(candidate.value, candidate);
              }
            }
          }
        }
      }
    }
  }

  const candidates = [...expressions.values()]
    .map((values) => values.get(target))
    .filter((expression): expression is Expression => Boolean(expression))
    .sort((left, right) => left.operations - right.operations);
  if (!candidates[0]) throw new Error(`No exact expression found for ${target}`);
  return candidates[0];
}

function solveExpression(
  state: GameState,
  expression: Expression,
): { state: GameState; tileId: string } {
  const puzzle = state.run?.encounter?.puzzle;
  if (!puzzle) throw new Error("Expected an active puzzle");
  if (expression.type === "number") {
    const tileId = puzzle.sourceTileIds[expression.index];
    if (!tileId) throw new Error(`Missing source tile ${expression.index}`);
    return { state, tileId };
  }

  const left = solveExpression(state, expression.left);
  const right = solveExpression(left.state, expression.right);
  let nextState = reduceGame(right.state, {
    type: "PUZZLE_ACTION",
    action: { type: "TILE_SELECTED", tileId: left.tileId },
  }).state;
  nextState = reduceGame(nextState, {
    type: "PUZZLE_ACTION",
    action: { type: "TILE_SELECTED", tileId: right.tileId },
  }).state;
  nextState = reduceGame(nextState, {
    type: "PUZZLE_ACTION",
    action: { type: "OPERATOR_SELECTED", operator: expression.operator },
  }).state;
  const resultTileId = nextState.run?.encounter?.puzzle.operations.at(-1)?.resultTileId;
  if (!resultTileId) throw new Error("Expected the operation to create a result tile");
  return { state: nextState, tileId: resultTileId };
}

function solveCurrentPuzzle(state: GameState): GameState {
  const puzzle = state.run?.encounter?.puzzle;
  if (!puzzle) throw new Error("Expected a puzzle to solve");
  const numbers = puzzle.sourceTileIds.map((tileId) => puzzle.tiles[tileId]!.value);
  const expression = findExactExpression(numbers, puzzle.target);
  const solved = solveExpression(state, expression).state;
  expect(solved.run?.encounter?.puzzle.resolution?.distance).toBe(0);
  return solved;
}

const NODE_PRIORITY: MapNodeType[] = [
  "rest",
  "upgrade",
  "shop",
  "event",
  "normal",
  "elite",
  "boss",
];

const REWARD_PRIORITY: RewardKind[] = [
  "relic",
  "heal",
  "consumable",
  "remove-number",
  "transform-number",
  "currency",
  "add-number",
];

function chooseMapNode(state: GameState): GameState {
  const available = state.run!.map.nodes.filter((node) => node.status === "available");
  const chosen = [...available].sort(
    (left, right) => NODE_PRIORITY.indexOf(left.type) - NODE_PRIORITY.indexOf(right.type),
  )[0];
  if (!chosen) throw new Error("No route is available");
  return reduceGame(state, { type: "MAP_NODE_SELECTED", nodeId: chosen.id }).state;
}

function chooseSafeEvent(state: GameState): GameState {
  const run = state.run!;
  const affordable = run.event!.options.filter((option) => {
    const cost = option.effects
      .filter((effect) => effect.type === "currency")
      .reduce((sum, effect) => sum + effect.amount, 0);
    return run.currency + cost >= 0;
  });
  const chosen =
    affordable.find((option) => option.effects.every((effect) => effect.type !== "damage")) ??
    affordable[0];
  if (!chosen) throw new Error("No affordable event choice is available");
  return reduceGame(state, { type: "EVENT_OPTION_SELECTED", optionId: chosen.id }).state;
}

function playRun(seed: number): GameState {
  let state = reduceGame(initialGameState, { type: "RUN_STARTED", seed }).state;
  for (let step = 0; step < 250 && state.run?.status === "active"; step += 1) {
    if (state.screen === "map") state = chooseMapNode(state);
    else if (state.screen === "encounter") {
      const status = state.run!.encounter!.status;
      state =
        status === "puzzle"
          ? solveCurrentPuzzle(state)
          : reduceGame(state, { type: "ENCOUNTER_CONTINUED" }).state;
    } else if (state.screen === "reward") {
      const rewards = state.run!.rewards!;
      const chosen = [...rewards].sort(
        (left, right) => REWARD_PRIORITY.indexOf(left.kind) - REWARD_PRIORITY.indexOf(right.kind),
      )[0]!;
      state = reduceGame(state, { type: "REWARD_SELECTED", rewardId: chosen.id }).state;
    } else if (state.screen === "shop") {
      state = reduceGame(state, { type: "SHOP_LEFT" }).state;
    } else if (state.screen === "event") state = chooseSafeEvent(state);
    else if (state.screen === "rest") {
      state = reduceGame(state, { type: "REST_COMPLETED" }).state;
    } else if (state.screen === "upgrade") {
      state = reduceGame(state, { type: "UPGRADE_SELECTED", upgrade: "max-hp" }).state;
    }
  }
  return state;
}

describe("complete generated runs", () => {
  it("lets a precise player finish representative seeds without debug actions", () => {
    const failures: string[] = [];
    for (let seed = 1; seed <= 50; seed += 1) {
      const finished = playRun(seed);
      if (finished.screen !== "victory") {
        const run = finished.run;
        failures.push(
          `seed ${seed}: ${run?.defeatReason ?? "unfinished"}; enemy ${run?.encounter?.enemy.hp}/${run?.encounter?.enemy.maxHp} +${run?.encounter?.enemy.armor} armor; player ${run?.hp}/${run?.maxHp}; relics ${run?.relicIds.join(",") || "none"}`,
        );
      }
    }
    expect(failures).toEqual([]);
  }, 60_000);
});
