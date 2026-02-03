/**
 * 16.16 fixed-point arithmetic matching the original Doom engine.
 *
 * Fixed-point values are 32-bit signed integers where the upper 16 bits
 * are the integer part and the lower 16 bits are the fractional part.
 *
 * @module math/fixed
 */

/** Number of fractional bits. */
export const FRACBITS = 16;

/** One in fixed-point (65536). */
export const FRACUNIT = 1 << FRACBITS;

/** Maximum safe fixed-point value. */
export const MAXINT = 0x7fffffff;

/** Minimum safe fixed-point value. */
export const MININT = -0x80000000;

/**
 * Multiply two fixed-point values.
 *
 * @param a - First fixed-point operand
 * @param b - Second fixed-point operand
 * @returns Product in fixed-point
 *
 * @example
 * ```typescript
 * const half = FRACUNIT / 2;
 * const result = fixedMul(half, FRACUNIT * 10); // 5 * FRACUNIT
 * ```
 */
export function fixedMul(a: number, b: number): number {
	// Use BigInt for precision on large values, but fast path for small ones
	// Original Doom used 64-bit intermediate: (a * b) >> 16
	return Number((BigInt(a) * BigInt(b)) >> BigInt(FRACBITS));
}

/**
 * Divide two fixed-point values.
 *
 * @param a - Numerator (fixed-point)
 * @param b - Denominator (fixed-point)
 * @returns Quotient in fixed-point
 *
 * @example
 * ```typescript
 * const ten = FRACUNIT * 10;
 * const two = FRACUNIT * 2;
 * const result = fixedDiv(ten, two); // 5 * FRACUNIT
 * ```
 */
export function fixedDiv(a: number, b: number): number {
	if (b === 0) {
		return a >= 0 ? MAXINT : MININT;
	}
	// Check for overflow: if |a| >> 14 >= |b|, result would overflow
	if ((Math.abs(a) >> 14) >= Math.abs(b)) {
		return (a ^ b) < 0 ? MININT : MAXINT;
	}
	return Number((BigInt(a) << BigInt(FRACBITS)) / BigInt(b));
}

/**
 * Convert a fixed-point value to a floating-point number.
 *
 * @param fixed - Fixed-point value
 * @returns Floating-point equivalent
 *
 * @example
 * ```typescript
 * fixedToFloat(FRACUNIT * 3); // 3.0
 * fixedToFloat(FRACUNIT / 2); // 0.5
 * ```
 */
export function fixedToFloat(fixed: number): number {
	return fixed / FRACUNIT;
}

/**
 * Convert a floating-point number to fixed-point.
 *
 * @param f - Floating-point value
 * @returns Fixed-point equivalent
 *
 * @example
 * ```typescript
 * floatToFixed(2.5); // 163840 (2.5 * 65536)
 * ```
 */
export function floatToFixed(f: number): number {
	return Math.round(f * FRACUNIT);
}

/**
 * Clamp a number to 32-bit signed integer range.
 *
 * @param value - Value to clamp
 * @returns Clamped value
 */
export function fixedClamp(value: number): number {
	if (value > MAXINT) return MAXINT;
	if (value < MININT) return MININT;
	return value | 0;
}
