import type { RngState } from "../rng";
import { randomInt } from "../rng";
import type { MapNode, MapNodeType, RunMap } from "../run/types";

const ROW_PATTERNS: MapNodeType[][] = [
  ["normal", "normal", "normal"],
  ["normal", "upgrade", "normal"],
  ["event", "rest", "event"],
  ["normal", "elite", "normal"],
  ["shop", "normal", "shop"],
  ["normal", "upgrade", "normal"],
  ["event", "rest", "event"],
  ["elite", "normal", "elite"],
  ["shop", "rest", "shop"],
  ["elite", "normal", "elite"],
];

export function generateMap(rng: RngState): { map: RunMap; rng: RngState } {
  let nextRng = rng;
  const nodes: MapNode[] = [];

  for (let row = 0; row < ROW_PATTERNS.length; row += 1) {
    const pattern = ROW_PATTERNS[row];
    if (!pattern) continue;
    const rotation = randomInt(nextRng, 0, 2);
    nextRng = rotation.rng;
    for (let column = 0; column < 3; column += 1) {
      const type = pattern[(column + rotation.value) % pattern.length] as MapNodeType;
      nodes.push({
        id: `node-${row}-${column}`,
        row,
        column,
        type,
        connections:
          row === ROW_PATTERNS.length - 1
            ? ["node-10-1"]
            : Array.from(
                new Set([column, column === 0 ? 1 : column === 2 ? 1 : row % 2 === 0 ? 2 : 0]),
              ).map((nextColumn) => `node-${row + 1}-${nextColumn}`),
        status: row === 0 ? "available" : "locked",
      });
    }
  }

  nodes.push({
    id: "node-10-1",
    row: 10,
    column: 1,
    type: "boss",
    connections: [],
    status: "locked",
  });
  return { map: { nodes }, rng: nextRng };
}

export function selectMapNode(map: RunMap, nodeId: string): RunMap | undefined {
  const selected = map.nodes.find((node) => node.id === nodeId);
  if (!selected || selected.status !== "available") {
    return undefined;
  }
  return {
    currentNodeId: nodeId,
    nodes: map.nodes.map((node) =>
      node.id === nodeId
        ? { ...node, status: "current" }
        : node.status === "available"
          ? { ...node, status: "locked" }
          : node,
    ),
  };
}

export function completeCurrentNode(map: RunMap): RunMap {
  const current = map.nodes.find((node) => node.id === map.currentNodeId);
  if (!current) return map;
  const nextIds = new Set(current.connections);
  return {
    currentNodeId: undefined,
    nodes: map.nodes.map((node) => {
      if (node.id === current.id) return { ...node, status: "completed" };
      if (nextIds.has(node.id)) return { ...node, status: "available" };
      return node;
    }),
  };
}
