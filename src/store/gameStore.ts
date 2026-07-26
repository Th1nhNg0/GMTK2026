import { create } from "zustand";
import type { GameEffect } from "../game/effects";
import { initialGameState, reduceGame } from "../game/reducer";
import type { GameAction, GameState } from "../game/run/types";

interface GameStore {
  game: GameState;
  effects: GameEffect[];
  effectSequence: number;
  announcement: string;
  dispatch: (action: GameAction) => void;
}

function effectAnnouncement(effect: GameEffect): string {
  if (effect.type === "INVALID_ACTION") return effect.message;
  if (effect.type === "PUZZLE_RESOLVED") {
    return effect.resolution.submittedValue === undefined
      ? "No result submitted. Zero damage."
      : `Submitted ${effect.resolution.submittedValue} for ${effect.resolution.finalDamage} base damage.`;
  }
  if (effect.type === "OPERATION_CREATED") return `Created ${effect.operation.result}.`;
  if (effect.type === "OPERATION_UNDONE") return "Last operation undone.";
  if (effect.type === "ENEMY_DAMAGED") return `Enemy takes ${effect.amount} damage.`;
  if (effect.type === "PLAYER_DAMAGED") return `You take ${effect.amount} damage.`;
  if (effect.type === "TIMER_ADDED") return `${effect.seconds} seconds added.`;
  if (effect.type === "ITEM_USED") return `${effect.name} used.`;
  if (effect.type === "REWARD_GAINED") return `${effect.name} gained.`;
  if (effect.type === "SHOP_PURCHASED") return `${effect.name} purchased.`;
  return effect.message;
}

export const useGameStore = create<GameStore>((set) => ({
  game: initialGameState,
  effects: [],
  effectSequence: 0,
  announcement: "",
  dispatch: (action) =>
    set((store) => {
      const transition = reduceGame(store.game, action);
      return {
        game: transition.state,
        effects: transition.effects,
        effectSequence: store.effectSequence + 1,
        announcement:
          transition.effects.map(effectAnnouncement).filter(Boolean).at(-1) ?? store.announcement,
      };
    }),
}));
