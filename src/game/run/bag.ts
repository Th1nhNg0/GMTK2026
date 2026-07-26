import type { RngState } from "../rng";
import { shuffle } from "../rng";
import type { BagState, NumberCardDefinition } from "./types";

export function createStartingBag(): NumberCardDefinition[] {
  const large = [25, 50, 75, 100].map((value) => ({
    definitionId: `large-${value}`,
    value,
    tags: ["large"],
  }));
  const small = Array.from({ length: 10 }, (_, index) => index + 1).flatMap((value) =>
    ["a", "b"].map((copy) => ({
      definitionId: `small-${value}-${copy}`,
      value,
      tags: ["small"],
    })),
  );
  return [...large, ...small];
}

export function createEncounterBag(
  cards: readonly NumberCardDefinition[],
  rng: RngState,
): { bag: BagState; rng: RngState } {
  const shuffled = shuffle(
    rng,
    cards.map((card) => card.definitionId),
  );
  return { bag: { drawPile: shuffled.values, discardPile: [] }, rng: shuffled.rng };
}

export function drawHand(
  bag: BagState,
  rng: RngState,
  count = 6,
): { bag: BagState; hand: string[]; rng: RngState } {
  let drawPile = [...bag.drawPile];
  let discardPile = [...bag.discardPile];
  let nextRng = rng;

  if (drawPile.length < count) {
    const reshuffled = shuffle(nextRng, [...drawPile, ...discardPile]);
    drawPile = reshuffled.values;
    discardPile = [];
    nextRng = reshuffled.rng;
  }
  if (drawPile.length < count) {
    throw new Error("The number bag cannot provide a six-card hand");
  }

  const hand = drawPile.slice(0, count);
  return {
    hand,
    bag: { drawPile: drawPile.slice(count), discardPile },
    rng: nextRng,
  };
}

export function discardHand(bag: BagState, hand: readonly string[]): BagState {
  return { drawPile: [...bag.drawPile], discardPile: [...bag.discardPile, ...hand] };
}
