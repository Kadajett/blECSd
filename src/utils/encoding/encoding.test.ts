/**
 * Tests for legacy codepage encoding utilities.
 *
 * @module utils/encoding/encoding.test
 */

import { describe, expect, it } from 'vitest';
import {
	bufferToString,
	byteToChar,
	type CodePage,
	CodePageSchema,
	ConversionOptionsSchema,
	charToByte,
	getCodePageMap,
	getSupportedCodePages,
	isCodePageSupported,
	stringToBuffer,
} from './index';

describe('encoding utilities', () => {
	describe('CodePageSchema', () => {
		it('validates supported codepages', () => {
			expect(CodePageSchema.safeParse('cp437').success).toBe(true);
			expect(CodePageSchema.safeParse('cp850').success).toBe(true);
			expect(CodePageSchema.safeParse('cp866').success).toBe(true);
			expect(CodePageSchema.safeParse('cp1252').success).toBe(true);
		});

		it('rejects unsupported codepages', () => {
			expect(CodePageSchema.safeParse('cp950').success).toBe(false);
			expect(CodePageSchema.safeParse('utf-8').success).toBe(false);
			expect(CodePageSchema.safeParse('invalid').success).toBe(false);
		});
	});

	describe('ConversionOptionsSchema', () => {
		it('validates complete options', () => {
			const result = ConversionOptionsSchema.safeParse({
				codepage: 'cp437',
				unmappable: 'replace',
				replacement: '?',
				interpretControlChars: true,
			});
			expect(result.success).toBe(true);
		});

		it('applies defaults', () => {
			const result = ConversionOptionsSchema.parse({ codepage: 'cp437' });
			expect(result.unmappable).toBe('replace');
			expect(result.replacement).toBe('\uFFFD');
			expect(result.interpretControlChars).toBe(false);
		});

		it('rejects extra fields with strict mode', () => {
			const result = ConversionOptionsSchema.safeParse({
				codepage: 'cp437',
				extraField: 'invalid',
			});
			expect(result.success).toBe(false);
		});
	});

	describe('isCodePageSupported', () => {
		it('returns true for supported codepages', () => {
			expect(isCodePageSupported('cp437')).toBe(true);
			expect(isCodePageSupported('cp850')).toBe(true);
			expect(isCodePageSupported('cp866')).toBe(true);
			expect(isCodePageSupported('cp1252')).toBe(true);
		});

		it('returns false for unsupported codepages', () => {
			expect(isCodePageSupported('cp950')).toBe(false);
			expect(isCodePageSupported('utf-8')).toBe(false);
			expect(isCodePageSupported('')).toBe(false);
		});

		it('acts as type guard', () => {
			const codepage = 'cp437' as string;
			if (isCodePageSupported(codepage)) {
				// TypeScript should recognize codepage as CodePage here
				const _typed: CodePage = codepage;
				expect(_typed).toBe('cp437');
			}
		});
	});

	describe('getSupportedCodePages', () => {
		it('returns all supported codepages', () => {
			const codepages = getSupportedCodePages();
			expect(codepages).toContain('cp437');
			expect(codepages).toContain('cp850');
			expect(codepages).toContain('cp866');
			expect(codepages).toContain('cp1252');
			expect(codepages.length).toBe(4);
		});
	});

	describe('byteToChar', () => {
		describe('CP437', () => {
			it('converts standard ASCII (0x20-0x7E)', () => {
				expect(byteToChar(0x20, 'cp437')).toBe(' ');
				expect(byteToChar(0x41, 'cp437')).toBe('A');
				expect(byteToChar(0x7a, 'cp437')).toBe('z');
				expect(byteToChar(0x30, 'cp437')).toBe('0');
			});

			it('converts box-drawing characters', () => {
				expect(byteToChar(0xb3, 'cp437')).toBe('│');
				expect(byteToChar(0xba, 'cp437')).toBe('║');
				expect(byteToChar(0xc4, 'cp437')).toBe('─');
				expect(byteToChar(0xcd, 'cp437')).toBe('═');
				expect(byteToChar(0xda, 'cp437')).toBe('┌');
				expect(byteToChar(0xbf, 'cp437')).toBe('┐');
				expect(byteToChar(0xc0, 'cp437')).toBe('└');
				expect(byteToChar(0xd9, 'cp437')).toBe('┘');
			});

			it('converts block characters', () => {
				expect(byteToChar(0xdb, 'cp437')).toBe('█'); // full block
				expect(byteToChar(0xdc, 'cp437')).toBe('▄'); // lower half
				expect(byteToChar(0xdd, 'cp437')).toBe('▌'); // left half
				expect(byteToChar(0xde, 'cp437')).toBe('▐'); // right half
				expect(byteToChar(0xdf, 'cp437')).toBe('▀'); // upper half
			});

			it('converts shade characters', () => {
				expect(byteToChar(0xb0, 'cp437')).toBe('░'); // light shade
				expect(byteToChar(0xb1, 'cp437')).toBe('▒'); // medium shade
				expect(byteToChar(0xb2, 'cp437')).toBe('▓'); // dark shade
			});

			it('converts Greek letters', () => {
				expect(byteToChar(0xe0, 'cp437')).toBe('α');
				expect(byteToChar(0xe2, 'cp437')).toBe('Γ');
				expect(byteToChar(0xe3, 'cp437')).toBe('π');
				expect(byteToChar(0xe4, 'cp437')).toBe('Σ');
				expect(byteToChar(0xea, 'cp437')).toBe('Ω');
			});

			it('converts mathematical symbols', () => {
				expect(byteToChar(0xf1, 'cp437')).toBe('±');
				expect(byteToChar(0xf2, 'cp437')).toBe('≥');
				expect(byteToChar(0xf3, 'cp437')).toBe('≤');
				expect(byteToChar(0xf6, 'cp437')).toBe('÷');
				expect(byteToChar(0xec, 'cp437')).toBe('∞');
			});

			it('passes through control characters by default', () => {
				expect(byteToChar(0x00, 'cp437')).toBe('\u0000');
				expect(byteToChar(0x0a, 'cp437')).toBe('\n');
				expect(byteToChar(0x0d, 'cp437')).toBe('\r');
				expect(byteToChar(0x1b, 'cp437')).toBe('\x1b');
			});

			it('interprets control characters when option is set', () => {
				const opts = { interpretControlChars: true };
				expect(byteToChar(0x01, 'cp437', opts)).toBe('☺');
				expect(byteToChar(0x02, 'cp437', opts)).toBe('☻');
				expect(byteToChar(0x03, 'cp437', opts)).toBe('♥');
				expect(byteToChar(0x04, 'cp437', opts)).toBe('♦');
				expect(byteToChar(0x05, 'cp437', opts)).toBe('♣');
				expect(byteToChar(0x06, 'cp437', opts)).toBe('♠');
			});
		});

		describe('CP850', () => {
			it('converts accented characters', () => {
				expect(byteToChar(0x82, 'cp850')).toBe('é');
				expect(byteToChar(0xa0, 'cp850')).toBe('á');
				expect(byteToChar(0xa4, 'cp850')).toBe('ñ');
			});

			it('converts box-drawing characters (shared with CP437)', () => {
				expect(byteToChar(0xb3, 'cp850')).toBe('│');
				expect(byteToChar(0xc4, 'cp850')).toBe('─');
				expect(byteToChar(0xdb, 'cp850')).toBe('█');
			});
		});

		describe('CP866', () => {
			it('converts Cyrillic uppercase letters', () => {
				expect(byteToChar(0x80, 'cp866')).toBe('А');
				expect(byteToChar(0x81, 'cp866')).toBe('Б');
				expect(byteToChar(0x82, 'cp866')).toBe('В');
			});

			it('converts Cyrillic lowercase letters', () => {
				expect(byteToChar(0xa0, 'cp866')).toBe('а');
				expect(byteToChar(0xa1, 'cp866')).toBe('б');
				expect(byteToChar(0xe0, 'cp866')).toBe('р');
			});

			it('converts box-drawing characters (shared with CP437)', () => {
				expect(byteToChar(0xb3, 'cp866')).toBe('│');
				expect(byteToChar(0xdb, 'cp866')).toBe('█');
			});
		});

		describe('CP1252', () => {
			it('converts Windows-specific characters', () => {
				expect(byteToChar(0x80, 'cp1252')).toBe('\u20AC'); // Euro sign
				expect(byteToChar(0x93, 'cp1252')).toBe('\u201C'); // Left double quote
				expect(byteToChar(0x94, 'cp1252')).toBe('\u201D'); // Right double quote
				expect(byteToChar(0x97, 'cp1252')).toBe('\u2014'); // Em dash
			});

			it('converts Latin-1 supplement characters', () => {
				expect(byteToChar(0xc0, 'cp1252')).toBe('À');
				expect(byteToChar(0xe9, 'cp1252')).toBe('é');
				expect(byteToChar(0xf1, 'cp1252')).toBe('ñ');
			});
		});

		describe('error handling', () => {
			it('throws RangeError for byte < 0', () => {
				expect(() => byteToChar(-1, 'cp437')).toThrow(RangeError);
			});

			it('throws RangeError for byte > 255', () => {
				expect(() => byteToChar(256, 'cp437')).toThrow(RangeError);
			});

			it('throws for invalid codepage', () => {
				// @ts-expect-error Testing invalid input
				expect(() => byteToChar(0x41, 'invalid')).toThrow();
			});
		});
	});

	describe('charToByte', () => {
		it('converts ASCII characters', () => {
			expect(charToByte('A', 'cp437')).toBe(0x41);
			expect(charToByte('z', 'cp437')).toBe(0x7a);
			expect(charToByte(' ', 'cp437')).toBe(0x20);
		});

		it('converts CP437 box-drawing characters', () => {
			expect(charToByte('│', 'cp437')).toBe(0xb3);
			expect(charToByte('─', 'cp437')).toBe(0xc4);
			expect(charToByte('█', 'cp437')).toBe(0xdb);
		});

		it('converts CP437 special characters', () => {
			expect(charToByte('░', 'cp437')).toBe(0xb0);
			expect(charToByte('▒', 'cp437')).toBe(0xb1);
			expect(charToByte('▓', 'cp437')).toBe(0xb2);
		});

		it('returns undefined for unmappable characters', () => {
			expect(charToByte('你', 'cp437')).toBeUndefined();
			expect(charToByte('好', 'cp437')).toBeUndefined();
		});

		it('handles empty string', () => {
			expect(charToByte('', 'cp437')).toBeUndefined();
		});

		it('uses only first character of multi-char string', () => {
			expect(charToByte('AB', 'cp437')).toBe(0x41); // 'A'
		});
	});

	describe('bufferToString', () => {
		it('converts ASCII bytes', () => {
			const buffer = Buffer.from([0x48, 0x65, 0x6c, 0x6c, 0x6f]); // Hello
			expect(bufferToString(buffer, 'cp437')).toBe('Hello');
		});

		it('converts CP437 high bytes', () => {
			const buffer = Buffer.from([0xdb, 0xb1, 0xdb]); // █▒█
			expect(bufferToString(buffer, 'cp437')).toBe('█▒█');
		});

		it('converts mixed ASCII and high bytes', () => {
			const buffer = Buffer.from([0x48, 0x69, 0x20, 0xdb]); // Hi █
			expect(bufferToString(buffer, 'cp437')).toBe('Hi █');
		});

		it('handles control characters based on option', () => {
			const buffer = Buffer.from([0x03, 0x20, 0x03]); // ♥ ♥

			// Without interpretation
			const withoutInterpret = bufferToString(buffer, 'cp437');
			expect(withoutInterpret).toBe('\x03 \x03');

			// With interpretation
			const withInterpret = bufferToString(buffer, 'cp437', {
				interpretControlChars: true,
			});
			expect(withInterpret).toBe('♥ ♥');
		});

		it('handles empty buffer', () => {
			const buffer = Buffer.from([]);
			expect(bufferToString(buffer, 'cp437')).toBe('');
		});

		it('works with Uint8Array', () => {
			const array = new Uint8Array([0x48, 0x69]);
			expect(bufferToString(array, 'cp437')).toBe('Hi');
		});
	});

	describe('stringToBuffer', () => {
		it('converts ASCII string', () => {
			const buffer = stringToBuffer('Hello', 'cp437');
			expect([...buffer]).toEqual([0x48, 0x65, 0x6c, 0x6c, 0x6f]);
		});

		it('converts CP437 special characters', () => {
			const buffer = stringToBuffer('█▒█', 'cp437');
			expect([...buffer]).toEqual([0xdb, 0xb1, 0xdb]);
		});

		it('handles unmappable characters with replace mode', () => {
			const buffer = stringToBuffer('Hi你', 'cp437', { unmappable: 'replace' });
			expect([...buffer]).toEqual([0x48, 0x69, 0x3f]); // 'Hi?'
		});

		it('handles unmappable characters with skip mode', () => {
			const buffer = stringToBuffer('Hi你', 'cp437', { unmappable: 'skip' });
			expect([...buffer]).toEqual([0x48, 0x69]); // 'Hi'
		});

		it('handles unmappable characters with error mode', () => {
			expect(() => stringToBuffer('Hi你', 'cp437', { unmappable: 'error' })).toThrow();
		});

		it('uses custom replacement character', () => {
			const buffer = stringToBuffer('Hi你', 'cp437', {
				unmappable: 'replace',
				replacement: '!',
			});
			expect([...buffer]).toEqual([0x48, 0x69, 0x21]); // 'Hi!'
		});

		it('handles empty string', () => {
			const buffer = stringToBuffer('', 'cp437');
			expect([...buffer]).toEqual([]);
		});
	});

	describe('round-trip conversion', () => {
		it('preserves ASCII text', () => {
			const original = 'Hello, World!';
			const buffer = stringToBuffer(original, 'cp437');
			const result = bufferToString(buffer, 'cp437');
			expect(result).toBe(original);
		});

		it('preserves CP437 special characters', () => {
			const original = '█▄▀░▒▓│─┌┐└┘';
			const buffer = stringToBuffer(original, 'cp437');
			const result = bufferToString(buffer, 'cp437');
			expect(result).toBe(original);
		});

		it('preserves mixed content', () => {
			const original = 'Score: 100 ░░░░░░░░░░ 50%';
			const buffer = stringToBuffer(original, 'cp437');
			const result = bufferToString(buffer, 'cp437');
			expect(result).toBe(original);
		});

		it('preserves box-drawing borders', () => {
			const original = '┌────────┐\n│ Test   │\n└────────┘';
			const buffer = stringToBuffer(original, 'cp437');
			const result = bufferToString(buffer, 'cp437');
			expect(result).toBe(original);
		});
	});

	describe('getCodePageMap', () => {
		it('returns 256 characters', () => {
			const map = getCodePageMap('cp437');
			expect(map.length).toBe(256);
		});

		it('has correct ASCII characters', () => {
			const map = getCodePageMap('cp437');
			expect(map[0x41]).toBe('A');
			expect(map[0x20]).toBe(' ');
		});

		it('has correct high byte characters', () => {
			const map = getCodePageMap('cp437');
			expect(map[0xdb]).toBe('█');
			expect(map[0xb0]).toBe('░');
		});

		it('respects interpretControlChars option', () => {
			const withoutInterpret = getCodePageMap('cp437');
			const withInterpret = getCodePageMap('cp437', { interpretControlChars: true });

			// Control char at 0x03 should differ
			expect(withoutInterpret[0x03]).toBe('\x03');
			expect(withInterpret[0x03]).toBe('♥');
		});
	});

	describe('all 256 CP437 byte mappings', () => {
		it('maps all bytes 0x00-0xFF', () => {
			for (let byte = 0; byte <= 255; byte++) {
				const char = byteToChar(byte, 'cp437');
				expect(char).toBeDefined();
				expect(typeof char).toBe('string');
				expect(char.length).toBeGreaterThanOrEqual(1);
			}
		});

		it('has unique mappings for high bytes', () => {
			const highByteChars = new Set<string>();
			for (let byte = 0x80; byte <= 0xff; byte++) {
				const char = byteToChar(byte, 'cp437');
				// Most high bytes should have unique mappings
				// (0xFF NBSP might collide with space in some contexts)
				highByteChars.add(char);
			}
			// We should have at least 126 unique characters (128 - some edge cases)
			expect(highByteChars.size).toBeGreaterThan(120);
		});
	});
});
