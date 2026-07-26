export type SoundEvent =
  | "tile-selected"
  | "tile-deselected"
  | "operator-selected"
  | "valid-operation"
  | "invalid-operation"
  | "undo"
  | "timer-warning"
  | "submit"
  | "exact-hit"
  | "enemy-damaged"
  | "player-damaged"
  | "reward-selected"
  | "shop-purchase"
  | "victory"
  | "defeat";

export const SOUND_FREQUENCIES: Record<SoundEvent, [number, number]> = {
  "tile-selected": [330, 0.05],
  "tile-deselected": [260, 0.05],
  "operator-selected": [440, 0.05],
  "valid-operation": [620, 0.09],
  "invalid-operation": [145, 0.12],
  undo: [250, 0.08],
  "timer-warning": [880, 0.08],
  submit: [520, 0.1],
  "exact-hit": [1040, 0.2],
  "enemy-damaged": [110, 0.14],
  "player-damaged": [80, 0.2],
  "reward-selected": [740, 0.16],
  "shop-purchase": [900, 0.12],
  victory: [980, 0.4],
  defeat: [70, 0.5],
};
