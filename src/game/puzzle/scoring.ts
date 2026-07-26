export type BaseDamage = 0 | 5 | 7 | 10;

export function getBaseDamage(distance: number | undefined): BaseDamage {
  if (distance === undefined || distance > 10) {
    return 0;
  }
  if (distance === 0) {
    return 10;
  }
  if (distance <= 5) {
    return 7;
  }
  return 5;
}
