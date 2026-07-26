import type { InvalidOperationReason, Operation, PuzzleResolution } from "./puzzle/types";

export type GameEffect =
  | {
      type: "INVALID_ACTION";
      message: string;
      reason?: InvalidOperationReason;
    }
  | { type: "OPERATION_CREATED"; operation: Operation }
  | { type: "OPERATION_UNDONE"; operationId: string }
  | { type: "PUZZLE_RESOLVED"; resolution: PuzzleResolution }
  | { type: "ENEMY_DAMAGED"; amount: number }
  | { type: "PLAYER_DAMAGED"; amount: number }
  | { type: "TIMER_ADDED"; seconds: number }
  | { type: "ITEM_USED"; name: string }
  | { type: "REWARD_GAINED"; name: string }
  | { type: "SHOP_PURCHASED"; name: string }
  | { type: "MESSAGE"; message: string };

export interface EngineTransition<TState> {
  state: TState;
  effects: GameEffect[];
}
