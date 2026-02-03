import { describe, expect, it } from 'vitest';
import {
	FRACBITS,
	FRACUNIT,
	MAXINT,
	MININT,
	fixedClamp,
	fixedDiv,
	fixedMul,
	fixedToFloat,
	floatToFixed,
} from './fixed.js';

describe('fixed-point constants', () => {
	it('has correct FRACBITS', () => {
		expect(FRACBITS).toBe(16);
	});

	it('has correct FRACUNIT', () => {
		expect(FRACUNIT).toBe(65536);
	});

	it('has correct MAXINT', () => {
		expect(MAXINT).toBe(0x7fffffff);
	});

	it('has correct MININT', () => {
		expect(MININT).toBe(-0x80000000);
	});
});

describe('fixedMul', () => {
	it('multiplies 1.0 * 1.0 = 1.0', () => {
		expect(fixedMul(FRACUNIT, FRACUNIT)).toBe(FRACUNIT);
	});

	it('multiplies 2.0 * 3.0 = 6.0', () => {
		expect(fixedMul(FRACUNIT * 2, FRACUNIT * 3)).toBe(FRACUNIT * 6);
	});

	it('multiplies 0.5 * 10.0 = 5.0', () => {
		const half = FRACUNIT / 2;
		expect(fixedMul(half, FRACUNIT * 10)).toBe(FRACUNIT * 5);
	});

	it('handles negative values', () => {
		expect(fixedMul(-FRACUNIT, FRACUNIT * 3)).toBe(-FRACUNIT * 3);
	});

	it('handles zero', () => {
		expect(fixedMul(0, FRACUNIT * 100)).toBe(0);
	});

	it('handles fractional results', () => {
		// 1.5 * 1.5 = 2.25
		const oneAndHalf = FRACUNIT + FRACUNIT / 2;
		const result = fixedMul(oneAndHalf, oneAndHalf);
		expect(fixedToFloat(result)).toBeCloseTo(2.25, 4);
	});
});

describe('fixedDiv', () => {
	it('divides 6.0 / 2.0 = 3.0', () => {
		expect(fixedDiv(FRACUNIT * 6, FRACUNIT * 2)).toBe(FRACUNIT * 3);
	});

	it('divides 1.0 / 2.0 = 0.5', () => {
		expect(fixedDiv(FRACUNIT, FRACUNIT * 2)).toBe(FRACUNIT / 2);
	});

	it('handles divide by zero returning MAXINT', () => {
		expect(fixedDiv(FRACUNIT, 0)).toBe(MAXINT);
	});

	it('handles divide by zero with negative returning MININT', () => {
		expect(fixedDiv(-FRACUNIT, 0)).toBe(MININT);
	});

	it('handles overflow case', () => {
		// When |a| >> 14 >= |b|, should return MAXINT/MININT
		const big = FRACUNIT * 20000;
		const small = 1;
		const result = fixedDiv(big, small);
		expect(result === MAXINT || result === MININT).toBe(true);
	});
});

describe('fixedToFloat', () => {
	it('converts FRACUNIT to 1.0', () => {
		expect(fixedToFloat(FRACUNIT)).toBe(1.0);
	});

	it('converts negative fixed to negative float', () => {
		expect(fixedToFloat(-FRACUNIT * 5)).toBe(-5.0);
	});

	it('converts zero', () => {
		expect(fixedToFloat(0)).toBe(0);
	});

	it('converts fractional values', () => {
		expect(fixedToFloat(FRACUNIT / 4)).toBeCloseTo(0.25, 4);
	});
});

describe('floatToFixed', () => {
	it('converts 1.0 to FRACUNIT', () => {
		expect(floatToFixed(1.0)).toBe(FRACUNIT);
	});

	it('converts 2.5 to correct fixed value', () => {
		expect(floatToFixed(2.5)).toBe(163840);
	});

	it('roundtrips with fixedToFloat', () => {
		expect(fixedToFloat(floatToFixed(3.14159))).toBeCloseTo(3.14159, 3);
	});
});

describe('fixedClamp', () => {
	it('clamps large positive values', () => {
		expect(fixedClamp(MAXINT + 100)).toBe(MAXINT);
	});

	it('clamps large negative values', () => {
		expect(fixedClamp(MININT - 100)).toBe(MININT);
	});

	it('passes through values in range', () => {
		expect(fixedClamp(12345)).toBe(12345);
	});
});
