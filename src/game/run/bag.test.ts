import { createRng } from "../rng";
import { createEncounterBag, createStartingBag, discardHand, drawHand } from "./bag";

describe("number bag", () => {
  it("creates the traditional 24-card pool", () => {
    const bag = createStartingBag();
    expect(bag).toHaveLength(24);
    expect(bag.filter((card) => card.value === 25)).toHaveLength(1);
    expect(bag.filter((card) => card.value === 100)).toHaveLength(1);
    for (let value = 1; value <= 10; value += 1) {
      expect(bag.filter((card) => card.value === value)).toHaveLength(2);
    }
  });

  it("draws six unique card instances and discards them", () => {
    const created = createEncounterBag(createStartingBag(), createRng(12));
    const drawn = drawHand(created.bag, created.rng);
    expect(drawn.hand).toHaveLength(6);
    expect(new Set(drawn.hand)).toHaveLength(6);
    expect(drawn.bag.drawPile).toHaveLength(18);
    expect(discardHand(drawn.bag, drawn.hand).discardPile).toHaveLength(6);
  });

  it("reshuffles the discard when the draw pile cannot provide a hand", () => {
    const bag = { drawPile: ["a", "b"], discardPile: ["c", "d", "e", "f", "g", "h"] };
    const drawn = drawHand(bag, createRng(4));
    expect(drawn.hand).toHaveLength(6);
    expect(drawn.bag.discardPile).toEqual([]);
    expect(drawn.bag.drawPile).toHaveLength(2);
  });
});
