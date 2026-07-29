import type { EventDefinition, EncounterType, EnemyIntentTemplate } from "../content/types";
import type { PuzzleAction, PuzzleResolution, PuzzleState } from "../puzzle/types";
import type { RngState } from "../rng";

export interface NumberCardDefinition {
  definitionId: string;
  value: number;
  tags: string[];
}

export interface NumberSequenceState {
  drawPile: string[];
  discardPile: string[];
}

export type MapNodeType = "normal" | "elite" | "boss" | "shop" | "event" | "rest" | "upgrade";

export interface MapNode {
  id: string;
  row: number;
  column: number;
  type: MapNodeType;
  connections: string[];
  status: "locked" | "available" | "current" | "completed";
}

export interface RunMap {
  nodes: MapNode[];
  currentNodeId?: string;
}

export interface EnemyState {
  enemyId: string;
  name: string;
  epithet: string;
  hp: number;
  maxHp: number;
  armor: number;
  currentIntent: EnemyIntentTemplate;
}

export interface RoundResult {
  resolution: PuzzleResolution;
  /** Attack power after bonuses and penalties, before enemy armor. */
  damageDealt: number;
  armorBlocked: number;
  /** Actual HP removed, capped by the enemy's remaining HP. */
  hpDamage: number;
  enemyHpBefore: number;
  enemyHpAfter: number;
  enemyAction: string;
  playerDamageTaken: number;
}

export interface PuzzleAttempt {
  puzzleNumber: number;
  outcome: "solved" | "partial" | "failed";
  submittedValue?: number;
  distance?: number;
  damageDealt: number;
}

export interface EncounterState {
  encounterId: string;
  type: EncounterType;
  roundIndex: number;
  roundHistory: PuzzleAttempt[];
  enemy: EnemyState;
  numberSequence: NumberSequenceState;
  handCardIds: string[];
  puzzle: PuzzleState;
  status: "puzzle" | "resolved" | "won";
  lastRound?: RoundResult;
}

export type RewardKind = "relic" | "consumable" | "currency" | "heal";

export interface RewardOption {
  id: string;
  kind: RewardKind;
  title: string;
  description: string;
  value?: number;
  relicId?: string;
  consumableId?: string;
}

export interface ShopItem extends RewardOption {
  cost: number;
  purchased: boolean;
}

export interface RunState {
  seed: number;
  rng: RngState;
  hp: number;
  maxHp: number;
  armor: number;
  currency: number;
  numberSet: NumberCardDefinition[];
  focusBonusSeconds: number;
  relicIds: string[];
  consumableSlots: Array<string | null>;
  doubleNextDamage: boolean;
  weakenedBy: number;
  map: RunMap;
  currentNodeId?: string;
  encounter?: EncounterState;
  rewards?: RewardOption[];
  shop?: ShopItem[];
  event?: EventDefinition;
  status: "active" | "victory" | "defeat";
  defeatReason?: string;
}

export type GameScreen =
  | "title"
  | "map"
  | "encounter"
  | "reward"
  | "shop"
  | "event"
  | "rest"
  | "upgrade"
  | "victory"
  | "defeat";

export interface GameState {
  screen: GameScreen;
  run?: RunState;
}

export type GameAction =
  | { type: "RUN_STARTED"; seed: number }
  | { type: "RETURNED_TO_TITLE" }
  | { type: "COMBAT_DEFEAT_REVEALED" }
  | { type: "MAP_NODE_SELECTED"; nodeId: string }
  | { type: "PUZZLE_ACTION"; action: PuzzleAction }
  | { type: "ENCOUNTER_CONTINUED" }
  | { type: "CONSUMABLE_USED"; slotIndex: number }
  | { type: "REWARD_SELECTED"; rewardId: string }
  | { type: "SHOP_ITEM_PURCHASED"; itemId: string }
  | { type: "SHOP_LEFT" }
  | { type: "EVENT_OPTION_SELECTED"; optionId: string }
  | { type: "REST_COMPLETED" }
  | { type: "UPGRADE_SELECTED"; upgrade: "max-hp" | "focus" }
  | { type: "DEBUG_ENCOUNTER_STARTED"; encounterType: EncounterType }
  | { type: "DEBUG_NODE_JUMPED"; nodeId: string }
  | { type: "DEBUG_EXACT_SETUP" }
  | { type: "DEBUG_ENEMY_HP_SET"; hp: number }
  | { type: "DEBUG_PLAYER_HP_SET"; hp: number }
  | { type: "DEBUG_CURRENCY_GRANTED"; amount: number }
  | { type: "DEBUG_RELIC_GRANTED"; relicId: string }
  | { type: "DEBUG_CONSUMABLE_GRANTED"; consumableId: string };
