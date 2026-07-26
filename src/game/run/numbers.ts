import type { RngState } from "../rng";
import type { NumberCardDefinition, NumberSequenceState } from "./types";

export function createNumberSet(): NumberCardDefinition[] {
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

export function createEncounterSequence(
  cards: readonly NumberCardDefinition[],
  rng: RngState,
): { numberSequence: NumberSequenceState; rng: RngState } {
  const byValueThenId = (left: NumberCardDefinition, right: NumberCardDefinition) =>
    left.value - right.value || left.definitionId.localeCompare(right.definitionId);
  const large = cards
    .filter((card) => card.value >= 25)
    .sort(byValueThenId)
    .map((card) => card.definitionId);
  const small = cards
    .filter((card) => card.value < 25)
    .sort(byValueThenId)
    .map((card) => card.definitionId);
  const drawPile: string[] = [];

  while (large.length > 0 || small.length > 0) {
    const largeCard = large.shift();
    if (largeCard) drawPile.push(largeCard);
    for (let index = 0; index < 5 && (small.length > 0 || large.length > 0); index += 1) {
      const card = small.shift() ?? large.shift();
      if (card) drawPile.push(card);
    }
  }

  return { numberSequence: { drawPile, discardPile: [] }, rng };
}

export function drawHand(
  numberSequence: NumberSequenceState,
  rng: RngState,
  count = 6,
): { numberSequence: NumberSequenceState; hand: string[]; rng: RngState } {
  let drawPile = [...numberSequence.drawPile];
  let discardPile = [...numberSequence.discardPile];
  const nextRng = rng;

  if (drawPile.length < count) {
    drawPile = [...drawPile, ...discardPile];
    discardPile = [];
  }
  if (drawPile.length < count) {
    throw new Error("The number sequence cannot provide a six-number hand");
  }

  const hand = drawPile.slice(0, count);
  return {
    hand,
    numberSequence: { drawPile: drawPile.slice(count), discardPile },
    rng: nextRng,
  };
}

export function recycleHand(
  numberSequence: NumberSequenceState,
  hand: readonly string[],
): NumberSequenceState {
  return {
    drawPile: [...numberSequence.drawPile],
    discardPile: [...numberSequence.discardPile, ...hand],
  };
}
