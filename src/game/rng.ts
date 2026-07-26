export interface RngState {
  seed: number;
  value: number;
}

export interface RandomResult {
  rng: RngState;
  value: number;
}

export function createRng(seed: number): RngState {
  const normalized = seed >>> 0;
  return { seed: normalized, value: normalized };
}

export function nextRandom(rng: RngState): RandomResult {
  const value = (rng.value + 0x6d2b79f5) >>> 0;
  let mixed = value;
  mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
  mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
  const random = ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  return { rng: { ...rng, value }, value: random };
}

export function randomInt(rng: RngState, min: number, max: number): RandomResult {
  if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max) || min > max) {
    throw new Error("randomInt requires an ordered safe-integer range");
  }
  const next = nextRandom(rng);
  return {
    rng: next.rng,
    value: Math.floor(next.value * (max - min + 1)) + min,
  };
}

export function shuffle<T>(rng: RngState, values: readonly T[]): { rng: RngState; values: T[] } {
  const result = [...values];
  let nextRng = rng;
  for (let index = result.length - 1; index > 0; index -= 1) {
    const random = randomInt(nextRng, 0, index);
    nextRng = random.rng;
    const otherIndex = random.value;
    [result[index], result[otherIndex]] = [result[otherIndex] as T, result[index] as T];
  }
  return { rng: nextRng, values: result };
}
