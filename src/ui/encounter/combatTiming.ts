import type { RunState } from "../../game/run/types";

export const PLAYER_ATTACK_IMPACT_MS = 3_450;
export const ENEMY_RETALIATION_START_MS = 3_850;
export const ENEMY_RETALIATION_IMPACT_MS = 4_550;
export const ENEMY_RETALIATION_RESOLUTION_MS = 5_200;
export const STANDARD_RESOLUTION_MS = 4_150;
export const REDUCED_MOTION_RESOLUTION_MS = 240;

export function isEnemyRetaliating(run: RunState | undefined): boolean {
  const encounter = run?.encounter;
  return encounter?.status === "resolved" && encounter.enemy.currentIntent.type === "attack";
}
