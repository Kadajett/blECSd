/**
 * Tests for bitmap font utilities.
 */

import { describe, expect, it } from 'vitest';
import {
	BitmapFontSchema,
	createFontNotFoundError,
	getCharBitmap,
	loadFont,
	renderChar,
} from './index';
import terminus14Bold from './terminus-14-bold.json';
import terminus14Normal from './terminus-14-normal.json';

describe('bitmap fonts', () => {
	describe('BitmapFontSchema', () => {
		it('validates built-in fonts', () => {
			expect(() => BitmapFontSchema.parse(terminus14Bold)).not.toThrow();
			expect(() => BitmapFontSchema.parse(terminus14Normal)).not.toThrow();
		});
	});

	describe('loadFont', () => {
		it('loads built-in fonts', async () => {
			const bold = await loadFont('terminus-14-bold');
			const normal = await loadFont('terminus-14-normal');

			expect(bold.name).toBe('Terminus');
			expect(bold.weight).toBe('bold');
			expect(normal.weight).toBe('normal');
			expect(bold.charWidth).toBe(8);
			expect(bold.charHeight).toBe(14);
		});

		it('throws a FontNotFoundError for unknown fonts', async () => {
			const error = createFontNotFoundError('terminus-14-mono');
			expect(error.name).toBe('FontNotFoundError');

			await expect(loadFont('terminus-14-mono' as never)).rejects.toThrowError(
				/Font 'terminus-14-mono' not found/,
			);
		});
	});

	describe('getCharBitmap', () => {
		it('returns bitmap data for known characters', async () => {
			const font = await loadFont('terminus-14-bold');
			const bitmap = getCharBitmap(font, 'A');

			expect(bitmap).toBeDefined();
			expect(bitmap?.width).toBe(8);
			expect(bitmap?.height).toBe(14);
		});

		it('returns undefined for missing characters', async () => {
			const font = await loadFont('terminus-14-bold');
			const bitmap = getCharBitmap(font, '😀');

			expect(bitmap).toBeUndefined();
		});
	});

	describe('renderChar', () => {
		it('renders using default block characters', async () => {
			const font = await loadFont('terminus-14-bold');
			const lines = renderChar(font, 'A');

			expect(lines.length).toBe(14);
			expect(lines).toMatchSnapshot();
		});

		it('renders with custom fill and empty characters', async () => {
			const font = await loadFont('terminus-14-bold');
			const lines = renderChar(font, 'A', { fillChar: '#', emptyChar: '.' });

			expect(lines.length).toBe(14);
			expect(lines).toMatchSnapshot();
		});
	});
});
