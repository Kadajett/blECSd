import { describe, expect, it, beforeAll } from 'vitest';
import {
	ANG45,
	ANG90,
	ANG180,
	ANG270,
	FINEANGLES,
	ANGLETOFINESHIFT,
	finesine,
	finecosine,
	finetangent,
	tantoangle,
	generateTables,
	pointToAngle,
	pointToAngle2,
	bamToRadians,
	radiansToBam,
	angleDiff,
} from './angles.js';
import { FRACUNIT } from './fixed.js';

beforeAll(() => {
	generateTables();
});

describe('angle constants', () => {
	it('has correct ANG45', () => {
		expect(ANG45).toBe(0x20000000);
	});

	it('has correct ANG90', () => {
		expect(ANG90).toBe(0x40000000);
	});

	it('has correct ANG180', () => {
		expect(ANG180).toBe(0x80000000);
	});

	it('angles wrap correctly with unsigned arithmetic', () => {
		// ANG270 + ANG180 should wrap to ANG90
		expect(((ANG270 + ANG180) >>> 0)).toBe((ANG90 >>> 0));
	});
});

describe('generateTables', () => {
	it('generates finesine with correct length', () => {
		expect(finesine.length).toBe(10240);
	});

	it('generates finecosine with correct length', () => {
		expect(finecosine.length).toBe(FINEANGLES);
	});

	it('generates finetangent with correct length', () => {
		expect(finetangent.length).toBe(FINEANGLES / 2);
	});

	it('generates tantoangle with correct length', () => {
		expect(tantoangle.length).toBe(2049);
	});

	it('finesine[0] is approximately 0 (sin(0))', () => {
		expect(Math.abs(finesine[0] ?? 0)).toBeLessThan(10);
	});

	it('finesine at 90 degrees is approximately FRACUNIT (sin(90))', () => {
		const idx = FINEANGLES / 4; // 90 degrees = quarter of full rotation
		const value = finesine[idx] ?? 0;
		expect(Math.abs(value - FRACUNIT)).toBeLessThan(10);
	});

	it('finecosine[0] is approximately FRACUNIT (cos(0))', () => {
		const value = finecosine[0] ?? 0;
		expect(Math.abs(value - FRACUNIT)).toBeLessThan(10);
	});

	it('finecosine at 90 degrees is approximately 0 (cos(90))', () => {
		const idx = FINEANGLES / 4;
		const value = finecosine[idx] ?? 0;
		expect(Math.abs(value)).toBeLessThan(10);
	});
});

describe('pointToAngle', () => {
	it('returns 0 for pure east direction', () => {
		const angle = pointToAngle(FRACUNIT, 0);
		expect(angle).toBeLessThan(ANG45 / 4); // close to 0
	});

	it('returns ~ANG90 for pure north direction', () => {
		const angle = pointToAngle(0, FRACUNIT);
		const diff = Math.abs(angle - ANG90);
		expect(diff).toBeLessThan(ANG45 / 4);
	});

	it('returns ~ANG180 for pure west direction', () => {
		const angle = pointToAngle(-FRACUNIT, 0);
		const diff = angleDiff(angle, ANG180);
		expect(diff).toBeLessThan(ANG45 / 4);
	});

	it('returns 0 for zero vector', () => {
		expect(pointToAngle(0, 0)).toBe(0);
	});
});

describe('pointToAngle2', () => {
	it('computes angle from one point to another', () => {
		// From (0,0) to (1,0) should be ~0 (east)
		const angle = pointToAngle2(0, 0, FRACUNIT, 0);
		expect(angle).toBeLessThan(ANG45 / 4);
	});

	it('computes angle from offset points', () => {
		// From (10,10) to (20,10) is east
		const angle = pointToAngle2(10 * FRACUNIT, 10 * FRACUNIT, 20 * FRACUNIT, 10 * FRACUNIT);
		expect(angle).toBeLessThan(ANG45 / 4);
	});
});

describe('bamToRadians', () => {
	it('converts 0 to 0', () => {
		expect(bamToRadians(0)).toBe(0);
	});

	it('converts ANG90 to ~PI/2', () => {
		expect(bamToRadians(ANG90)).toBeCloseTo(Math.PI / 2, 4);
	});

	it('converts ANG180 to ~PI', () => {
		expect(bamToRadians(ANG180)).toBeCloseTo(Math.PI, 4);
	});
});

describe('radiansToBam', () => {
	it('converts 0 to 0', () => {
		expect(radiansToBam(0)).toBe(0);
	});

	it('converts PI/2 to ~ANG90', () => {
		const result = radiansToBam(Math.PI / 2);
		expect(angleDiff(result, ANG90)).toBeLessThan(ANG45 / 100);
	});

	it('roundtrips with bamToRadians', () => {
		const original = ANG45 + ANG90;
		const radians = bamToRadians(original);
		const roundtripped = radiansToBam(radians);
		expect(angleDiff(roundtripped, original)).toBeLessThan(100);
	});
});

describe('angleDiff', () => {
	it('returns 0 for same angle', () => {
		expect(angleDiff(ANG90, ANG90)).toBe(0);
	});

	it('returns ANG90 for 90 degree difference', () => {
		const diff = angleDiff(0, ANG90);
		expect(diff).toBe(ANG90);
	});

	it('handles wraparound correctly', () => {
		// Difference between 350 degrees and 10 degrees should be ~20 degrees
		const deg350 = radiansToBam((350 / 180) * Math.PI);
		const deg10 = radiansToBam((10 / 180) * Math.PI);
		const diff = angleDiff(deg350, deg10);
		const expected = radiansToBam((20 / 180) * Math.PI);
		// Allow some rounding tolerance
		expect(Math.abs(diff - expected)).toBeLessThan(ANG45 / 10);
	});
});
