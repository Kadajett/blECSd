import { describe, expect, it } from 'vitest';
import {
	ColorStringSchema,
	DimensionSchema,
	NonNegativeIntSchema,
	PercentageSchema,
	PositionValueSchema,
	PositiveIntSchema,
} from './common';

describe('PositiveIntSchema', () => {
	it('accepts positive integers', () => {
		expect(PositiveIntSchema.parse(1)).toBe(1);
		expect(PositiveIntSchema.parse(100)).toBe(100);
	});

	it('rejects zero', () => {
		expect(() => PositiveIntSchema.parse(0)).toThrow();
	});

	it('rejects negative numbers', () => {
		expect(() => PositiveIntSchema.parse(-1)).toThrow();
	});

	it('rejects floats', () => {
		expect(() => PositiveIntSchema.parse(1.5)).toThrow();
	});
});

describe('NonNegativeIntSchema', () => {
	it('accepts zero', () => {
		expect(NonNegativeIntSchema.parse(0)).toBe(0);
	});

	it('accepts positive integers', () => {
		expect(NonNegativeIntSchema.parse(1)).toBe(1);
	});

	it('rejects negative numbers', () => {
		expect(() => NonNegativeIntSchema.parse(-1)).toThrow();
	});
});

describe('PercentageSchema', () => {
	it('accepts 0-100', () => {
		expect(PercentageSchema.parse(0)).toBe(0);
		expect(PercentageSchema.parse(50)).toBe(50);
		expect(PercentageSchema.parse(100)).toBe(100);
	});

	it('rejects values outside range', () => {
		expect(() => PercentageSchema.parse(-1)).toThrow();
		expect(() => PercentageSchema.parse(101)).toThrow();
	});
});

describe('ColorStringSchema', () => {
	it('accepts hex colors', () => {
		expect(ColorStringSchema.parse('#fff')).toBe('#fff');
		expect(ColorStringSchema.parse('#ffffff')).toBe('#ffffff');
		expect(ColorStringSchema.parse('#ffffffff')).toBe('#ffffffff');
	});

	it('accepts rgb colors', () => {
		expect(ColorStringSchema.parse('rgb(255, 0, 0)')).toBe('rgb(255, 0, 0)');
		expect(ColorStringSchema.parse('rgba(255, 0, 0, 0.5)')).toBe('rgba(255, 0, 0, 0.5)');
	});

	it('accepts hsl colors', () => {
		expect(ColorStringSchema.parse('hsl(0, 100%, 50%)')).toBe('hsl(0, 100%, 50%)');
	});

	it('accepts named colors', () => {
		expect(ColorStringSchema.parse('red')).toBe('red');
		expect(ColorStringSchema.parse('blue')).toBe('blue');
	});

	it('rejects invalid colors', () => {
		expect(() => ColorStringSchema.parse('not-a-color-123')).toThrow();
		expect(() => ColorStringSchema.parse('#gg0000')).toThrow();
	});
});

describe('DimensionSchema', () => {
	it('accepts numbers', () => {
		expect(DimensionSchema.parse(100)).toBe(100);
		expect(DimensionSchema.parse(0)).toBe(0);
	});

	it('accepts percentage strings', () => {
		expect(DimensionSchema.parse('50%')).toBe('50%');
		expect(DimensionSchema.parse('100%')).toBe('100%');
	});

	it('rejects invalid percentage strings', () => {
		expect(() => DimensionSchema.parse('50')).toThrow();
		expect(() => DimensionSchema.parse('50px')).toThrow();
	});
});

describe('PositionValueSchema', () => {
	it('accepts numbers', () => {
		expect(PositionValueSchema.parse(10)).toBe(10);
	});

	it('accepts percentage strings', () => {
		expect(PositionValueSchema.parse('50%')).toBe('50%');
	});

	it('accepts position keywords', () => {
		expect(PositionValueSchema.parse('center')).toBe('center');
		expect(PositionValueSchema.parse('left')).toBe('left');
		expect(PositionValueSchema.parse('right')).toBe('right');
		expect(PositionValueSchema.parse('top')).toBe('top');
		expect(PositionValueSchema.parse('bottom')).toBe('bottom');
	});

	it('rejects invalid keywords', () => {
		expect(() => PositionValueSchema.parse('middle')).toThrow();
	});
});
