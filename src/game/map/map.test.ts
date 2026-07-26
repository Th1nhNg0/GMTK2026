import { createRng } from "../rng";
import { completeCurrentNode, generateMap, selectMapNode } from "./map";

describe("run map", () => {
  it("is deterministic and contains every required node type", () => {
    const first = generateMap(createRng(77));
    const second = generateMap(createRng(77));
    expect(first).toEqual(second);
    const types = new Set(first.map.nodes.map((node) => node.type));
    expect(types).toEqual(new Set(["normal", "elite", "boss", "shop", "event", "rest", "upgrade"]));
  });

  it("only selects available nodes and unlocks connected nodes on completion", () => {
    const generated = generateMap(createRng(1)).map;
    expect(selectMapNode(generated, "node-5-0")).toBeUndefined();
    const selected = selectMapNode(generated, "node-0-1");
    expect(selected?.nodes.find((node) => node.id === "node-0-1")?.status).toBe("current");
    const completed = completeCurrentNode(selected!);
    const available = completed.nodes.filter((node) => node.status === "available");
    expect(available.map((node) => node.id).sort()).toEqual(["node-1-0", "node-1-2"]);
  });

  it("mixes one-, two-, and three-node floors", () => {
    const map = generateMap(createRng(1)).map;
    const floorRows = new Set(
      map.nodes.filter((node) => node.type !== "boss").map((node) => node.row),
    );

    expect(
      new Set(
        [...floorRows].map((row) => map.nodes.filter((node) => node.row === row).length),
      ),
    ).toEqual(new Set([1, 2, 3]));
  });
});
