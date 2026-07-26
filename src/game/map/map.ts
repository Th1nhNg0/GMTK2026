import type { RngState } from "../rng";
import type { MapNode, MapNodeType, RunMap } from "../run/types";

const ROW_PATTERNS: MapNodeType[][] = [
  ["normal"],
  ["normal", "normal"],
  ["normal"],
  ["event", "elite", "upgrade"],
  ["rest"],
  ["shop", "normal", "event"],
  ["normal"],
  ["elite", "normal", "event"],
  ["rest"],
  ["elite", "normal"],
];

const COLUMNS_BY_WIDTH = [[1], [0, 2], [0, 1, 2]];

export function generateMap(rng: RngState): { map: RunMap; rng: RngState } {
  const nextRng = rng;
  const nodes: MapNode[] = [];

  for (let row = 0; row < ROW_PATTERNS.length; row += 1) {
    const pattern = ROW_PATTERNS[row];
    if (!pattern) continue;
    const columns = COLUMNS_BY_WIDTH[pattern.length - 1] ?? [];
    const nextColumns =
      COLUMNS_BY_WIDTH[(ROW_PATTERNS[row + 1]?.length ?? 1) - 1] ?? [1];
    const connectionCount = pattern.length === 1 ? nextColumns.length : 1;
    for (let index = 0; index < pattern.length; index += 1) {
      const column = columns[index] as number;
      const type = pattern[index] as MapNodeType;
      nodes.push({
        id: `node-${row}-${column}`,
        row,
        column,
        type,
        connections:
          row === ROW_PATTERNS.length - 1
            ? ["node-10-1"]
            : [...nextColumns]
                .sort((left, right) => Math.abs(left - column) - Math.abs(right - column))
                .slice(0, connectionCount)
                .map((nextColumn) => `node-${row + 1}-${nextColumn}`),
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
