/**
 * Tests for ACS (Alternate Character Set) character maps.
 *
 * @module terminal/terminfo/acs.test
 */

import { describe, expect, it } from 'vitest';
import {
	ACS,
	ACSC_CODES,
	containsBoxDrawing,
	createBox,
	getAcsChar,
	getAcsCharByCode,
	getAcsCharNames,
	isBoxDrawingChar,
	parseAcsc,
	stringToAscii,
	UNICODE_TO_ASCII,
	unicodeToAscii,
} from './acs';

describe('ACS character maps', () => {
	describe('ACSC_CODES', () => {
		it('has corner characters', () => {
			expect(ACSC_CODES.l).toBe('┌'); // upper-left
			expect(ACSC_CODES.m).toBe('└'); // lower-left
			expect(ACSC_CODES.k).toBe('┐'); // upper-right
			expect(ACSC_CODES.j).toBe('┘'); // lower-right
		});

		it('has tee characters', () => {
			expect(ACSC_CODES.t).toBe('├'); // left tee
			expect(ACSC_CODES.u).toBe('┤'); // right tee
			expect(ACSC_CODES.v).toBe('┴'); // bottom tee
			expect(ACSC_CODES.w).toBe('┬'); // top tee
		});

		it('has line characters', () => {
			expect(ACSC_CODES.q).toBe('─'); // horizontal
			expect(ACSC_CODES.x).toBe('│'); // vertical
			expect(ACSC_CODES.n).toBe('┼'); // cross
		});

		it('has symbol characters', () => {
			expect(ACSC_CODES['`']).toBe('◆'); // diamond
			expect(ACSC_CODES.a).toBe('▒'); // checkerboard
			expect(ACSC_CODES.f).toBe('°'); // degree
			expect(ACSC_CODES['0']).toBe('█'); // block
		});
	});

	describe('ACS named constants', () => {
		it('has corner names', () => {
			expect(ACS.ulcorner).toBe('┌');
			expect(ACS.urcorner).toBe('┐');
			expect(ACS.llcorner).toBe('└');
			expect(ACS.lrcorner).toBe('┘');
		});

		it('has tee names', () => {
			expect(ACS.ltee).toBe('├');
			expect(ACS.rtee).toBe('┤');
			expect(ACS.btee).toBe('┴');
			expect(ACS.ttee).toBe('┬');
		});

		it('has line names', () => {
			expect(ACS.hline).toBe('─');
			expect(ACS.vline).toBe('│');
			expect(ACS.plus).toBe('┼');
		});

		it('has symbol names', () => {
			expect(ACS.diamond).toBe('◆');
			expect(ACS.ckboard).toBe('▒');
			expect(ACS.degree).toBe('°');
			expect(ACS.bullet).toBe('·');
		});

		it('has arrow names', () => {
			expect(ACS.larrow).toBe('←');
			expect(ACS.rarrow).toBe('→');
			expect(ACS.uarrow).toBe('↑');
			expect(ACS.darrow).toBe('↓');
		});

		it('has double-line variants', () => {
			expect(ACS.ulcorner_double).toBe('╔');
			expect(ACS.urcorner_double).toBe('╗');
			expect(ACS.hline_double).toBe('═');
			expect(ACS.vline_double).toBe('║');
		});
	});

	describe('UNICODE_TO_ASCII', () => {
		it('maps box drawing corners to +', () => {
			expect(UNICODE_TO_ASCII['┌']).toBe('+');
			expect(UNICODE_TO_ASCII['┐']).toBe('+');
			expect(UNICODE_TO_ASCII['└']).toBe('+');
			expect(UNICODE_TO_ASCII['┘']).toBe('+');
		});

		it('maps box drawing lines', () => {
			expect(UNICODE_TO_ASCII['─']).toBe('-');
			expect(UNICODE_TO_ASCII['│']).toBe('|');
		});

		it('maps double box drawing', () => {
			expect(UNICODE_TO_ASCII['═']).toBe('=');
			expect(UNICODE_TO_ASCII['║']).toBe('|');
		});

		it('maps arrows', () => {
			expect(UNICODE_TO_ASCII['←']).toBe('<');
			expect(UNICODE_TO_ASCII['→']).toBe('>');
			expect(UNICODE_TO_ASCII['↑']).toBe('^');
			expect(UNICODE_TO_ASCII['↓']).toBe('v');
		});

		it('maps blocks', () => {
			expect(UNICODE_TO_ASCII['█']).toBe('#');
			expect(UNICODE_TO_ASCII['░']).toBe(':');
			expect(UNICODE_TO_ASCII['▒']).toBe('%');
		});
	});

	describe('parseAcsc', () => {
		it('parses acsc string into map', () => {
			const acsc = 'llmmkkjj';
			const map = parseAcsc(acsc);

			expect(map.get('l')).toBe('l');
			expect(map.get('m')).toBe('m');
			expect(map.get('k')).toBe('k');
			expect(map.get('j')).toBe('j');
		});

		it('handles typical xterm acsc', () => {
			// Simplified xterm acsc - pairs map code to character
			const acsc = '``aaffggjjkkllmmnnooppqqrrssttuuvvwwxxyyzz{{||}}~~';
			const map = parseAcsc(acsc);

			// 50 chars / 2 = 25 pairs
			expect(map.size).toBe(25);
			expect(map.get('`')).toBe('`');
			expect(map.get('a')).toBe('a');
			expect(map.get('q')).toBe('q');
		});

		it('handles empty string', () => {
			const map = parseAcsc('');
			expect(map.size).toBe(0);
		});

		it('handles odd-length string', () => {
			const map = parseAcsc('abc');
			expect(map.size).toBe(1);
			expect(map.get('a')).toBe('b');
		});
	});

	describe('getAcsChar', () => {
		it('returns Unicode character for valid names', () => {
			expect(getAcsChar('ulcorner')).toBe('┌');
			expect(getAcsChar('hline')).toBe('─');
			expect(getAcsChar('vline')).toBe('│');
		});

		it('returns undefined for invalid names', () => {
			expect(getAcsChar('invalid')).toBeUndefined();
		});
	});

	describe('getAcsCharByCode', () => {
		it('returns Unicode character for valid codes', () => {
			expect(getAcsCharByCode('l')).toBe('┌');
			expect(getAcsCharByCode('q')).toBe('─');
			expect(getAcsCharByCode('x')).toBe('│');
		});

		it('returns original code for invalid codes', () => {
			expect(getAcsCharByCode('Z')).toBe('Z');
			expect(getAcsCharByCode('?')).toBe('?');
		});
	});

	describe('unicodeToAscii', () => {
		it('converts box drawing to ASCII', () => {
			expect(unicodeToAscii('┌')).toBe('+');
			expect(unicodeToAscii('─')).toBe('-');
			expect(unicodeToAscii('│')).toBe('|');
		});

		it('returns original for unmapped characters', () => {
			expect(unicodeToAscii('A')).toBe('A');
			expect(unicodeToAscii('5')).toBe('5');
		});
	});

	describe('stringToAscii', () => {
		it('converts box drawing string', () => {
			expect(stringToAscii('┌──┐')).toBe('+--+');
			expect(stringToAscii('│Hi│')).toBe('|Hi|');
			expect(stringToAscii('└──┘')).toBe('+--+');
		});

		it('preserves non-Unicode characters', () => {
			expect(stringToAscii('Hello')).toBe('Hello');
			expect(stringToAscii('Test 123')).toBe('Test 123');
		});

		it('handles mixed content', () => {
			expect(stringToAscii('│ Text │')).toBe('| Text |');
		});

		it('handles empty string', () => {
			expect(stringToAscii('')).toBe('');
		});
	});

	describe('isBoxDrawingChar', () => {
		it('returns true for box drawing characters', () => {
			expect(isBoxDrawingChar('┌')).toBe(true);
			expect(isBoxDrawingChar('─')).toBe(true);
			expect(isBoxDrawingChar('│')).toBe(true);
			expect(isBoxDrawingChar('┼')).toBe(true);
			expect(isBoxDrawingChar('╔')).toBe(true);
		});

		it('returns false for non-box-drawing characters', () => {
			expect(isBoxDrawingChar('A')).toBe(false);
			expect(isBoxDrawingChar('+')).toBe(false);
			expect(isBoxDrawingChar('-')).toBe(false);
			expect(isBoxDrawingChar('█')).toBe(false); // Block element, not box drawing
		});
	});

	describe('containsBoxDrawing', () => {
		it('returns true for strings with box drawing', () => {
			expect(containsBoxDrawing('┌──┐')).toBe(true);
			expect(containsBoxDrawing('Hello │ World')).toBe(true);
		});

		it('returns false for strings without box drawing', () => {
			expect(containsBoxDrawing('Hello World')).toBe(false);
			expect(containsBoxDrawing('+-+')).toBe(false);
		});

		it('handles empty string', () => {
			expect(containsBoxDrawing('')).toBe(false);
		});
	});

	describe('createBox', () => {
		it('creates single-line box', () => {
			const box = createBox(5, 3, 'single');
			expect(box).toEqual(['┌───┐', '│   │', '└───┘']);
		});

		it('creates double-line box', () => {
			const box = createBox(5, 3, 'double');
			expect(box).toEqual(['╔═══╗', '║   ║', '╚═══╝']);
		});

		it('creates rounded box', () => {
			const box = createBox(5, 3, 'rounded');
			expect(box).toEqual(['╭───╮', '│   │', '╰───╯']);
		});

		it('handles minimum size', () => {
			const box = createBox(2, 2, 'single');
			expect(box).toEqual(['┌┐', '└┘']);
		});

		it('handles larger boxes', () => {
			const box = createBox(10, 5, 'single');
			expect(box.length).toBe(5);
			expect(box[0]).toBe('┌────────┐');
			expect(box[1]).toBe('│        │');
			expect(box[4]).toBe('└────────┘');
		});

		it('defaults to single style', () => {
			const box = createBox(3, 3);
			expect(box[0]?.[0]).toBe('┌');
		});
	});

	describe('getAcsCharNames', () => {
		it('returns array of character names', () => {
			const names = getAcsCharNames();
			expect(Array.isArray(names)).toBe(true);
			expect(names.length).toBeGreaterThan(0);
		});

		it('includes standard names', () => {
			const names = getAcsCharNames();
			expect(names).toContain('ulcorner');
			expect(names).toContain('hline');
			expect(names).toContain('vline');
			expect(names).toContain('diamond');
		});
	});

	describe('consistency', () => {
		it('ACS values match ACSC_CODES', () => {
			// Verify named constants match code mappings
			expect(ACS.ulcorner).toBe(ACSC_CODES.l);
			expect(ACS.llcorner).toBe(ACSC_CODES.m);
			expect(ACS.urcorner).toBe(ACSC_CODES.k);
			expect(ACS.lrcorner).toBe(ACSC_CODES.j);
			expect(ACS.hline).toBe(ACSC_CODES.q);
			expect(ACS.vline).toBe(ACSC_CODES.x);
		});

		it('all ACS characters have ASCII fallbacks', () => {
			// Common characters should all have fallbacks
			const important = [
				ACS.ulcorner,
				ACS.urcorner,
				ACS.llcorner,
				ACS.lrcorner,
				ACS.hline,
				ACS.vline,
				ACS.plus,
			];

			for (const char of important) {
				expect(UNICODE_TO_ASCII[char]).toBeDefined();
			}
		});
	});
});
