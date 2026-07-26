import type { EventDefinition } from "../game/content/types";

export const EVENTS: EventDefinition[] = [
  {
    id: "number-well",
    title: "The Number Well",
    body: "Loose digits glint beneath impossibly still water.",
    options: [
      {
        id: "reach",
        label: "Reach in",
        description: "Gain a 25. Lose 5 health.",
        effects: [
          { type: "add-number", value: 25 },
          { type: "damage", amount: 5 },
        ],
      },
      {
        id: "wish",
        label: "Make a wish",
        description: "Toss 8 coins and recover 10 health.",
        effects: [
          { type: "currency", amount: -8 },
          { type: "heal", amount: 10 },
        ],
      },
    ],
  },
  {
    id: "quiet-library",
    title: "The Quiet Library",
    body: "Every book contains the same calculation, solved a different way.",
    options: [
      {
        id: "study",
        label: "Study the margins",
        description: "Gain Margin Notes.",
        effects: [{ type: "relic", relicId: "margin-notes" }],
      },
      {
        id: "skim",
        label: "Skim for valuables",
        description: "Gain 16 coins.",
        effects: [{ type: "currency", amount: 16 }],
      },
    ],
  },
  {
    id: "vending-machine",
    title: "Suspicious Vending Machine",
    body: "Its display reads 80085. At least it accepts coins.",
    options: [
      {
        id: "snack",
        label: "Buy a study snack",
        description: "Spend 7 coins for a Study Snack.",
        effects: [
          { type: "currency", amount: -7 },
          { type: "consumable", consumableId: "study-snack" },
        ],
      },
      {
        id: "shake",
        label: "Shake it",
        description: "Gain 5 coins. Lose 3 health.",
        effects: [
          { type: "currency", amount: 5 },
          { type: "damage", amount: 3 },
        ],
      },
    ],
  },
  {
    id: "subtraction-door",
    title: "A Door Marked Minus",
    body: "It asks what you are willing to leave behind.",
    options: [
      {
        id: "lighten",
        label: "Offer your smallest tile",
        description: "Remove the lowest number and gain 12 coins.",
        effects: [{ type: "remove-smallest" }, { type: "currency", amount: 12 }],
      },
      {
        id: "decline",
        label: "Keep what is yours",
        description: "Recover 4 health.",
        effects: [{ type: "heal", amount: 4 }],
      },
    ],
  },
  {
    id: "clockmaker",
    title: "The Clockmaker",
    body: "A patient artisan offers to sell you a little more time.",
    options: [
      {
        id: "trade",
        label: "Trade 9 coins",
        description: "Gain a Time Tonic.",
        effects: [
          { type: "currency", amount: -9 },
          { type: "consumable", consumableId: "time-tonic" },
        ],
      },
      {
        id: "help",
        label: "Help wind the clocks",
        description: "Gain 6 coins.",
        effects: [{ type: "currency", amount: 6 }],
      },
    ],
  },
  {
    id: "seven-stones",
    title: "Seven Standing Stones",
    body: "Each hums at a frequency that feels oddly fortunate.",
    options: [
      {
        id: "listen",
        label: "Listen closely",
        description: "Gain Lucky Seven. Lose 6 health.",
        effects: [
          { type: "relic", relicId: "lucky-seven" },
          { type: "damage", amount: 6 },
        ],
      },
      {
        id: "count",
        label: "Count the offerings",
        description: "Gain 14 coins.",
        effects: [{ type: "currency", amount: 14 }],
      },
    ],
  },
];
