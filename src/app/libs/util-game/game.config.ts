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

/**
 * Starting base value assigned to honor tiles before win/loss adjustments.
 */
export const HONOR_TILE_BASE_VALUE = 5;

/**
 * Maximum number of reshuffles allowed before the next reshuffle attempt ends the run.
 */
export const MAX_RESHUFFLES = 3;

/**
 * Upper tile value limit. Reaching this value ends the run.
 */
export const MAX_TILE_VALUE = 10;

/**
 * Lower tile value limit. Reaching this value ends the run.
 */
export const MIN_TILE_VALUE = 0;

/**
 * Highest streak multiplier the player can build through consecutive wins.
 */
export const MAX_WIN_STREAK = 3;

/**
 * Supported hand sizes that can be selected in player settings.
 */
export const VALID_HAND_SIZES = [3, 4, 6] as const;

/**
 * Default hand size used when no saved setting is available or a saved value is invalid.
 */
export const DEFAULT_HAND_SIZE = 6;

assertRange('HONOR_TILE_BASE_VALUE', HONOR_TILE_BASE_VALUE, 5, 10);
assertRange('MAX_RESHUFFLES', MAX_RESHUFFLES, 1, 10);
assertRange('MAX_TILE_VALUE', MAX_TILE_VALUE, 5, 10);
assertRange('MIN_TILE_VALUE', MIN_TILE_VALUE, 0, 9);
assertRange('MAX_WIN_STREAK', MAX_WIN_STREAK, 2, 5);
assertOneOf('DEFAULT_HAND_SIZE', DEFAULT_HAND_SIZE, VALID_HAND_SIZES);
