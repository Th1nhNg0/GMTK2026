export type Operator = "add" | "subtract" | "multiply" | "divide";

export type InvalidOperationReason =
  | "invalid-operand"
  | "division-by-zero"
  | "non-positive-result"
  | "non-integer-result"
  | "unsafe-integer-result";

export type OperationCalculation =
  { valid: true; result: number } | { valid: false; reason: InvalidOperationReason };

export interface NumberTile {
  tileId: string;
  sourceDefinitionId?: string;
  value: number;
  status: "available" | "consumed";
  createdByOperationId?: string;
}

export interface Operation {
  operationId: string;
  leftTileId: string;
  rightTileId: string;
  operator: Operator;
  resultTileId: string;
  result: number;
  sequence: number;
}

export interface ClosestResult {
  tileId: string;
  value: number;
  distance: number;
  operationSequence: number;
}

export interface PuzzleResolution {
  submittedValue?: number;
  distance?: number;
  baseDamage: 0 | 5 | 7 | 10;
  finalDamage: number;
  reason: "manual" | "exact" | "timeout";
}

export interface PuzzleState {
  puzzleId: string;
  target: number;
  minimumOperations: number;
  sourceTileIds: string[];
  tiles: Record<string, NumberTile>;
  operations: Operation[];
  selectedTileIds: [] | [string] | [string, string];
  selectedOperator?: Operator;
  nextOperationSequence: number;
  timeBonusSeconds: number;
  closestResult?: ClosestResult;
  status: "active" | "resolved";
  resolution?: PuzzleResolution;
}

export type PuzzleAction =
  | { type: "TILE_SELECTED"; tileId: string }
  | { type: "TILE_DESELECTED"; tileId: string }
  | { type: "SELECTION_CLEARED" }
  | { type: "OPERATOR_SELECTED"; operator: Operator }
  | { type: "OPERATION_APPLIED" }
  | { type: "LAST_OPERATION_UNDONE" }
  | { type: "RESULT_SUBMITTED"; reason: "manual" | "timeout" };

export interface SourceTileInput {
  tileId: string;
  sourceDefinitionId: string;
  value: number;
}
