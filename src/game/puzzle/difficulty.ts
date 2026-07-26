import type { EncounterType } from "../content/types";

export interface PuzzleDifficultyProfile {
  desiredOperations: number;
  minimumTarget: number;
  maximumTarget: number;
  preferRoundTargets: boolean;
}

export function puzzleDifficultyFor(
  floor: number,
  encounterType: EncounterType,
  round: number,
): PuzzleDifficultyProfile {
  if (encounterType === "boss") {
    return {
      desiredOperations: round >= 3 ? 5 : 4,
      minimumTarget: 300,
      maximumTarget: 999,
      preferRoundTargets: false,
    };
  }

  if (encounterType === "elite") {
    return {
      desiredOperations: floor >= 8 || round >= 3 ? 4 : 3,
      minimumTarget: floor >= 8 ? 250 : 175,
      maximumTarget: floor >= 8 ? 899 : 699,
      preferRoundTargets: false,
    };
  }

  if (floor <= 3) {
    return {
      desiredOperations: 2,
      minimumTarget: 100,
      maximumTarget: 399,
      preferRoundTargets: true,
    };
  }

  if (floor <= 7) {
    return {
      desiredOperations: round === 1 ? 2 : 3,
      minimumTarget: 150,
      maximumTarget: 649,
      preferRoundTargets: round === 1,
    };
  }

  return {
    desiredOperations: 3,
    minimumTarget: 225,
    maximumTarget: 849,
    preferRoundTargets: false,
  };
}
