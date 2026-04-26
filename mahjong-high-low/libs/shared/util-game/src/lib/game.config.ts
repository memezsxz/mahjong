function assertRange(name: string, value: number, min: number, max: number): number {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}. Received: ${value}`);
  }

  return value;
}

function assertOneOf<T extends number | string>(
  name: string,
  value: T,
  allowedValues: readonly T[],
): T {
  if (!allowedValues.includes(value)) {
    throw new Error(`${name} must be one of: ${allowedValues.join(', ')}. Received: ${value}`);
  }

  return value;
}

export const HONOR_TILE_BASE_VALUE = 5
export const MAX_RESHUFFLES = 1
export const MAX_TILE_VALUE = 10
export const MIN_TILE_VALUE = 0
export const MAX_WIN_STREAK = 3
export const DEFAULT_HAND_SIZE = 6
export const ALLOW_SCORE_SAVE_ON_EXIT = true
export const TILES_LOCATION = 'assets/tiles/'
export const TILES_EXT = '.png'

assertRange('HONOR_TILE_BASE_VALUE', HONOR_TILE_BASE_VALUE, 5, 10)
assertRange('MAX_RESHUFFLES', MAX_RESHUFFLES, 1, 10)
assertRange('MAX_TILE_VALUE', MAX_TILE_VALUE, 5, 10)
assertRange('MIN_TILE_VALUE', MIN_TILE_VALUE, 0, 9)
assertRange('MAX_WIN_STREAK', MAX_WIN_STREAK, 2, 5)
assertOneOf('DEFAULT_HAND_SIZE', DEFAULT_HAND_SIZE, [3, 4, 6] as const)
