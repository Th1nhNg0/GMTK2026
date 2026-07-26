import type { ConsumableDefinition } from "../game/content/types";

export const CONSUMABLES: ConsumableDefinition[] = [
  {
    id: "time-tonic",
    name: "Time Tonic",
    description: "Add 15 seconds to this puzzle.",
    effect: { type: "add-time", seconds: 15 },
  },
  {
    id: "proof-bomb",
    name: "Proof Bomb",
    description: "Deal 6 damage immediately.",
    effect: { type: "damage-enemy", amount: 6 },
  },
  {
    id: "red-pen",
    name: "Red Pen",
    description: "Double the damage of your next answer.",
    effect: { type: "double-next-damage" },
  },
  {
    id: "eraser-shield",
    name: "Eraser Shield",
    description: "Gain 6 armor for this encounter.",
    effect: { type: "gain-armor", amount: 6 },
  },
  {
    id: "study-snack",
    name: "Study Snack",
    description: "Recover 7 health.",
    effect: { type: "heal-player", amount: 7 },
  },
];
