import { createRng } from "../rng";
import { createEncounterSequence, createNumberSet, drawHand, recycleHand } from "./numbers";

describe("number sequence", () => {
  it("creates the traditional 24-number source set", () => {
    const numberSet = createNumberSet();
    expect(numberSet).toHaveLength(24);
    expect(numberSet.filter((card) => card.value === 25)).toHaveLength(1);
    expect(numberSet.filter((card) => card.value === 100)).toHaveLength(1);
    for (let value = 1; value <= 10; value += 1) {
      expect(numberSet.filter((card) => card.value === value)).toHaveLength(2);
    }
  });

  it("draws six unique card instances and discards them", () => {
    const cards = createNumberSet();
    const created = createEncounterSequence(cards, createRng(12));
    const drawn = drawHand(created.numberSequence, created.rng);
    expect(drawn.hand).toHaveLength(6);
    expect(new Set(drawn.hand)).toHaveLength(6);
    expect(drawn.numberSequence.drawPile).toHaveLength(18);
    expect(recycleHand(drawn.numberSequence, drawn.hand).discardPile).toHaveLength(6);
    const values = new Map(cards.map((card) => [card.definitionId, card.value]));
    expect(drawn.hand.map((id) => values.get(id))).toEqual([25, 1, 1, 2, 2, 3]);
  });

  it("builds the same balanced hand order for every seed", () => {
    const cards = createNumberSet();
    expect(createEncounterSequence(cards, createRng(1)).numberSequence).toEqual(
      createEncounterSequence(cards, createRng(999_999)).numberSequence,
    );
  });

  it("recycles the discard in stable order when the draw pile cannot provide a hand", () => {
    const numberSequence = {
      drawPile: ["a", "b"],
      discardPile: ["c", "d", "e", "f", "g", "h"],
    };
    const drawn = drawHand(numberSequence, createRng(4));
    expect(drawn.hand).toHaveLength(6);
    expect(drawn.numberSequence.discardPile).toEqual([]);
    expect(drawn.numberSequence.drawPile).toHaveLength(2);
  });
});
