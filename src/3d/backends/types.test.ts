import { describe, expect, it } from 'vitest';
import {
	BackendCapabilitiesSchema,
	BackendSelectionSchema,
	BackendTypeSchema,
	EncodedOutputSchema,
} from '../schemas/backends';

describe('Backend schemas', () => {
	describe('BackendTypeSchema', () => {
		it('accepts all known backend types', () => {
			for (const type of ['braille', 'halfblock', 'sextant', 'sixel', 'kitty']) {
				expect(BackendTypeSchema.parse(type)).toBe(type);
			}
		});

		it('rejects unknown backend type', () => {
			expect(() => BackendTypeSchema.parse('webgl')).toThrow();
			expect(() => BackendTypeSchema.parse('')).toThrow();
		});
	});

	describe('BackendCapabilitiesSchema', () => {
		const validCaps = {
			maxColors: 2,
			supportsAlpha: false,
			pixelsPerCellX: 2,
			pixelsPerCellY: 4,
			supportsAnimation: false,
			requiresEscapeSequences: false,
		};

		it('validates complete capabilities object', () => {
			const result = BackendCapabilitiesSchema.parse(validCaps);
			expect(result.maxColors).toBe(2);
			expect(result.pixelsPerCellX).toBe(2);
			expect(result.pixelsPerCellY).toBe(4);
		});

		it('rejects missing fields', () => {
			expect(() => BackendCapabilitiesSchema.parse({ maxColors: 2 })).toThrow();
		});

		it('rejects non-positive maxColors', () => {
			expect(() => BackendCapabilitiesSchema.parse({ ...validCaps, maxColors: 0 })).toThrow();
			expect(() => BackendCapabilitiesSchema.parse({ ...validCaps, maxColors: -1 })).toThrow();
		});

		it('rejects non-positive pixel dimensions', () => {
			expect(() => BackendCapabilitiesSchema.parse({ ...validCaps, pixelsPerCellX: 0 })).toThrow();
		});
	});

	describe('EncodedOutputSchema', () => {
		it('accepts cell-based output', () => {
			const result = EncodedOutputSchema.parse({
				cells: [{ x: 0, y: 0, char: '⠿', fg: 0xffffff, bg: 0 }],
			});
			expect(result.cells).toHaveLength(1);
		});

		it('accepts escape-based output', () => {
			const result = EncodedOutputSchema.parse({
				escape: '\x1bPq#0;2;0;0;0~-\x1b\\',
				cursorX: 0,
				cursorY: 0,
			});
			expect(result.escape).toBeDefined();
		});

		it('accepts output with both cells and escape', () => {
			const result = EncodedOutputSchema.parse({
				cells: [{ x: 0, y: 0, char: 'x', fg: 0, bg: 0 }],
				escape: 'extra',
			});
			expect(result.cells).toHaveLength(1);
			expect(result.escape).toBe('extra');
		});

		it('rejects empty object with neither cells nor escape', () => {
			expect(() => EncodedOutputSchema.parse({})).toThrow('EncodedOutput must have either cells or escape');
		});

		it('rejects cell with empty char', () => {
			expect(() => EncodedOutputSchema.parse({
				cells: [{ x: 0, y: 0, char: '', fg: 0, bg: 0 }],
			})).toThrow();
		});

		it('rejects negative cell coordinates', () => {
			expect(() => EncodedOutputSchema.parse({
				cells: [{ x: -1, y: 0, char: 'x', fg: 0, bg: 0 }],
			})).toThrow();
		});
	});

	describe('BackendSelectionSchema', () => {
		it('accepts auto', () => {
			expect(BackendSelectionSchema.parse('auto')).toBe('auto');
		});

		it('accepts all backend types', () => {
			for (const type of ['braille', 'halfblock', 'sextant', 'sixel', 'kitty']) {
				expect(BackendSelectionSchema.parse(type)).toBe(type);
			}
		});

		it('rejects invalid selection', () => {
			expect(() => BackendSelectionSchema.parse('manual')).toThrow();
		});
	});
});
