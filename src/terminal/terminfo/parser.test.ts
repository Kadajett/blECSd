/**
 * Tests for terminfo binary parser.
 *
 * @module terminal/terminfo/parser.test
 */

import { describe, expect, it } from 'vitest';
import {
	getTerminfoFormat,
	isValidTerminfo,
	parseTerminfo,
	TERMINFO_MAGIC_EXTENDED,
	TERMINFO_MAGIC_LEGACY,
	toTerminfoData,
} from './parser';

// =============================================================================
// TEST HELPERS
// =============================================================================

/**
 * Creates a minimal valid terminfo buffer.
 */
function createMinimalTerminfo(
	options: { magic?: number; names?: string; boolCount?: number } = {},
): Buffer {
	const magic = options.magic ?? TERMINFO_MAGIC_LEGACY;
	const names = options.names ?? 'xterm|X terminal';
	const boolCount = options.boolCount ?? 0;
	const numCount = 0;
	const stringCount = 0;
	const stringTableSize = 0;

	const nameSize = names.length + 1; // +1 for null terminator

	// Calculate total size
	let totalSize = 12; // Header
	totalSize += nameSize; // Names section
	if (totalSize % 2 !== 0) totalSize++; // Alignment after booleans (none here)

	const buffer = Buffer.alloc(totalSize);

	// Write header
	buffer.writeUInt16LE(magic, 0);
	buffer.writeUInt16LE(nameSize, 2);
	buffer.writeUInt16LE(boolCount, 4);
	buffer.writeUInt16LE(numCount, 6);
	buffer.writeUInt16LE(stringCount, 8);
	buffer.writeUInt16LE(stringTableSize, 10);

	// Write names
	buffer.write(names, 12, 'latin1');
	buffer[12 + names.length] = 0; // Null terminator

	return buffer;
}

/**
 * Creates a terminfo buffer with booleans.
 */
function createTerminfoWithBooleans(booleans: boolean[]): Buffer {
	const magic = TERMINFO_MAGIC_LEGACY;
	const names = 'test|Test terminal';
	const boolCount = booleans.length;
	const numCount = 0;
	const stringCount = 0;
	const stringTableSize = 0;

	const nameSize = names.length + 1;

	// Calculate total size
	let totalSize = 12; // Header
	totalSize += nameSize; // Names
	totalSize += boolCount; // Booleans
	if (totalSize % 2 !== 0) totalSize++; // Alignment

	const buffer = Buffer.alloc(totalSize);

	// Write header
	buffer.writeUInt16LE(magic, 0);
	buffer.writeUInt16LE(nameSize, 2);
	buffer.writeUInt16LE(boolCount, 4);
	buffer.writeUInt16LE(numCount, 6);
	buffer.writeUInt16LE(stringCount, 8);
	buffer.writeUInt16LE(stringTableSize, 10);

	// Write names
	let offset = 12;
	buffer.write(names, offset, 'latin1');
	buffer[offset + names.length] = 0;
	offset += nameSize;

	// Write booleans
	for (let i = 0; i < booleans.length; i++) {
		buffer[offset + i] = booleans[i] ? 1 : 0;
	}

	return buffer;
}

/**
 * Creates a terminfo buffer with numbers.
 */
function createTerminfoWithNumbers(numbers: number[], is32bit = false): Buffer {
	const magic = is32bit ? TERMINFO_MAGIC_EXTENDED : TERMINFO_MAGIC_LEGACY;
	const names = 'test|Test terminal';
	const boolCount = 0;
	const numCount = numbers.length;
	const stringCount = 0;
	const stringTableSize = 0;

	const nameSize = names.length + 1;
	const numSize = is32bit ? 4 : 2;

	// Calculate total size
	let totalSize = 12;
	totalSize += nameSize;
	// Align after booleans (none)
	if (totalSize % 2 !== 0) totalSize++;
	totalSize += numCount * numSize;

	const buffer = Buffer.alloc(totalSize);

	// Write header
	buffer.writeUInt16LE(magic, 0);
	buffer.writeUInt16LE(nameSize, 2);
	buffer.writeUInt16LE(boolCount, 4);
	buffer.writeUInt16LE(numCount, 6);
	buffer.writeUInt16LE(stringCount, 8);
	buffer.writeUInt16LE(stringTableSize, 10);

	// Write names
	let offset = 12;
	buffer.write(names, offset, 'latin1');
	buffer[offset + names.length] = 0;
	offset += nameSize;

	// Align
	if (offset % 2 !== 0) offset++;

	// Write numbers
	for (let i = 0; i < numbers.length; i++) {
		if (is32bit) {
			buffer.writeInt32LE(numbers[i] ?? 0, offset + i * 4);
		} else {
			buffer.writeUInt16LE(numbers[i] ?? 0, offset + i * 2);
		}
	}

	return buffer;
}

/**
 * Creates a terminfo buffer with strings.
 */
function createTerminfoWithStrings(strings: (string | null)[]): Buffer {
	const magic = TERMINFO_MAGIC_LEGACY;
	const names = 'test|Test terminal';
	const boolCount = 0;
	const numCount = 0;
	const stringCount = strings.length;

	const nameSize = names.length + 1;

	// Build string table
	let stringTableSize = 0;
	const stringOffsets: number[] = [];
	const validStrings: string[] = [];

	for (const str of strings) {
		if (str === null) {
			stringOffsets.push(0xffff); // Absent
		} else {
			stringOffsets.push(stringTableSize);
			validStrings.push(str);
			stringTableSize += str.length + 1; // +1 for null terminator
		}
	}

	// Calculate total size
	let totalSize = 12;
	totalSize += nameSize;
	// Align
	if (totalSize % 2 !== 0) totalSize++;
	totalSize += stringCount * 2; // String offsets
	totalSize += stringTableSize;

	const buffer = Buffer.alloc(totalSize);

	// Write header
	buffer.writeUInt16LE(magic, 0);
	buffer.writeUInt16LE(nameSize, 2);
	buffer.writeUInt16LE(boolCount, 4);
	buffer.writeUInt16LE(numCount, 6);
	buffer.writeUInt16LE(stringCount, 8);
	buffer.writeUInt16LE(stringTableSize, 10);

	// Write names
	let offset = 12;
	buffer.write(names, offset, 'latin1');
	buffer[offset + names.length] = 0;
	offset += nameSize;

	// Align
	if (offset % 2 !== 0) offset++;

	// Write string offsets
	for (let i = 0; i < stringCount; i++) {
		buffer.writeUInt16LE(stringOffsets[i] ?? 0xffff, offset + i * 2);
	}
	offset += stringCount * 2;

	// Write string table
	let tableOffset = 0;
	for (const str of validStrings) {
		buffer.write(str, offset + tableOffset, 'latin1');
		buffer[offset + tableOffset + str.length] = 0;
		tableOffset += str.length + 1;
	}

	return buffer;
}

// =============================================================================
// TESTS
// =============================================================================

describe('terminfo parser', () => {
	describe('isValidTerminfo', () => {
		it('returns true for valid legacy magic', () => {
			const buffer = createMinimalTerminfo({ magic: TERMINFO_MAGIC_LEGACY });
			expect(isValidTerminfo(buffer)).toBe(true);
		});

		it('returns true for valid extended magic', () => {
			const buffer = createMinimalTerminfo({ magic: TERMINFO_MAGIC_EXTENDED });
			expect(isValidTerminfo(buffer)).toBe(true);
		});

		it('returns false for invalid magic', () => {
			const buffer = Buffer.alloc(12);
			buffer.writeUInt16LE(0x1234, 0);
			expect(isValidTerminfo(buffer)).toBe(false);
		});

		it('returns false for buffer too small', () => {
			const buffer = Buffer.alloc(5);
			expect(isValidTerminfo(buffer)).toBe(false);
		});

		it('returns false for empty buffer', () => {
			const buffer = Buffer.alloc(0);
			expect(isValidTerminfo(buffer)).toBe(false);
		});
	});

	describe('getTerminfoFormat', () => {
		it('returns legacy for 16-bit format', () => {
			const buffer = createMinimalTerminfo({ magic: TERMINFO_MAGIC_LEGACY });
			expect(getTerminfoFormat(buffer)).toBe('legacy');
		});

		it('returns extended for 32-bit format', () => {
			const buffer = createMinimalTerminfo({ magic: TERMINFO_MAGIC_EXTENDED });
			expect(getTerminfoFormat(buffer)).toBe('extended');
		});

		it('returns null for invalid magic', () => {
			const buffer = Buffer.alloc(12);
			buffer.writeUInt16LE(0x9999, 0);
			expect(getTerminfoFormat(buffer)).toBeNull();
		});

		it('returns null for tiny buffer', () => {
			expect(getTerminfoFormat(Buffer.alloc(1))).toBeNull();
		});
	});

	describe('parseTerminfo', () => {
		describe('header parsing', () => {
			it('parses minimal valid terminfo', () => {
				const buffer = createMinimalTerminfo();
				const result = parseTerminfo(buffer);

				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.name).toBe('xterm');
					expect(result.data.names).toEqual(['xterm']);
					expect(result.data.description).toBe('X terminal');
				}
			});

			it('fails on truncated header', () => {
				const buffer = Buffer.alloc(8);
				buffer.writeUInt16LE(TERMINFO_MAGIC_LEGACY, 0);

				const result = parseTerminfo(buffer);
				expect(result.success).toBe(false);
				if (!result.success) {
					expect(result.error).toBe('TRUNCATED_HEADER');
				}
			});

			it('fails on invalid magic number', () => {
				const buffer = Buffer.alloc(20);
				buffer.writeUInt16LE(0xbeef, 0);

				const result = parseTerminfo(buffer);
				expect(result.success).toBe(false);
				if (!result.success) {
					expect(result.error).toBe('INVALID_MAGIC');
				}
			});
		});

		describe('name parsing', () => {
			it('parses single name', () => {
				const buffer = createMinimalTerminfo({ names: 'xterm' });
				const result = parseTerminfo(buffer);

				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.name).toBe('xterm');
					expect(result.data.names).toEqual(['xterm']);
					expect(result.data.description).toBe('');
				}
			});

			it('parses multiple names with description', () => {
				const buffer = createMinimalTerminfo({
					names: 'xterm|xterm-256color|X Terminal Emulator',
				});
				const result = parseTerminfo(buffer);

				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.name).toBe('xterm');
					expect(result.data.names).toEqual(['xterm', 'xterm-256color']);
					expect(result.data.description).toBe('X Terminal Emulator');
				}
			});

			it('handles empty description', () => {
				const buffer = createMinimalTerminfo({ names: 'foo|bar|' });
				const result = parseTerminfo(buffer);

				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.names).toEqual(['foo', 'bar']);
					expect(result.data.description).toBe('');
				}
			});
		});

		describe('boolean parsing', () => {
			it('parses boolean capabilities', () => {
				// First two booleans: auto_left_margin, auto_right_margin
				const buffer = createTerminfoWithBooleans([false, true, false, true]);
				const result = parseTerminfo(buffer);

				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.booleans['auto_left_margin']).toBeUndefined();
					expect(result.data.booleans['auto_right_margin']).toBe(true);
					expect(result.data.booleans['no_esc_ctlc']).toBeUndefined();
					expect(result.data.booleans['ceol_standout_glitch']).toBe(true);
				}
			});

			it('handles all booleans false', () => {
				const buffer = createTerminfoWithBooleans([false, false, false]);
				const result = parseTerminfo(buffer);

				expect(result.success).toBe(true);
				if (result.success) {
					expect(Object.keys(result.data.booleans).length).toBe(0);
				}
			});

			it('handles all booleans true', () => {
				const buffer = createTerminfoWithBooleans([true, true, true]);
				const result = parseTerminfo(buffer);

				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.booleans['auto_left_margin']).toBe(true);
					expect(result.data.booleans['auto_right_margin']).toBe(true);
					expect(result.data.booleans['no_esc_ctlc']).toBe(true);
				}
			});
		});

		describe('number parsing', () => {
			it('parses 16-bit numbers', () => {
				// columns=80, init_tabs=8, lines=24
				const buffer = createTerminfoWithNumbers([80, 8, 24], false);
				const result = parseTerminfo(buffer);

				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.numbers['columns']).toBe(80);
					expect(result.data.numbers['init_tabs']).toBe(8);
					expect(result.data.numbers['lines']).toBe(24);
				}
			});

			it('parses 32-bit numbers', () => {
				const buffer = createTerminfoWithNumbers([80, 8, 24], true);
				const result = parseTerminfo(buffer);

				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.numbers['columns']).toBe(80);
					expect(result.data.numbers['init_tabs']).toBe(8);
					expect(result.data.numbers['lines']).toBe(24);
				}
			});

			it('handles absent numbers (0xFFFF)', () => {
				const buffer = createTerminfoWithNumbers([80, 0xffff, 24], false);
				const result = parseTerminfo(buffer);

				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.numbers['columns']).toBe(80);
					expect(result.data.numbers['init_tabs']).toBeUndefined();
					expect(result.data.numbers['lines']).toBe(24);
				}
			});

			it('handles large numbers in 32-bit format', () => {
				const buffer = createTerminfoWithNumbers([16777216, 8, 24], true);
				const result = parseTerminfo(buffer);

				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.numbers['columns']).toBe(16777216);
				}
			});
		});

		describe('string parsing', () => {
			it('parses string capabilities', () => {
				// First string is back_tab
				const buffer = createTerminfoWithStrings(['\x1b[Z', '\x07', '\r']);
				const result = parseTerminfo(buffer);

				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.strings['back_tab']).toBe('\x1b[Z');
					expect(result.data.strings['bell']).toBe('\x07');
					expect(result.data.strings['carriage_return']).toBe('\r');
				}
			});

			it('handles absent strings', () => {
				const buffer = createTerminfoWithStrings(['\x1b[Z', null, '\r']);
				const result = parseTerminfo(buffer);

				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.strings['back_tab']).toBe('\x1b[Z');
					expect(result.data.strings['bell']).toBeUndefined();
					expect(result.data.strings['carriage_return']).toBe('\r');
				}
			});

			it('handles escape sequences', () => {
				const clearScreen = '\x1b[H\x1b[2J';
				const buffer = createTerminfoWithStrings([null, null, null, null, null, clearScreen]);
				const result = parseTerminfo(buffer);

				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.strings['clear_screen']).toBe(clearScreen);
				}
			});

			it('handles parameterized strings', () => {
				const cursorAddress = '\x1b[%i%p1%d;%p2%dH';
				const strings = new Array(11).fill(null) as (string | null)[];
				strings[10] = cursorAddress;
				const buffer = createTerminfoWithStrings(strings);
				const result = parseTerminfo(buffer);

				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.strings['cursor_address']).toBe(cursorAddress);
				}
			});
		});
	});

	describe('toTerminfoData', () => {
		it('converts ParsedTerminfo to TerminfoData', () => {
			const buffer = createMinimalTerminfo({ names: 'xterm|X terminal emulator' });
			const result = parseTerminfo(buffer);

			expect(result.success).toBe(true);
			if (result.success) {
				const data = toTerminfoData(result.data);

				expect(data.name).toBe('xterm');
				expect(data.names).toEqual(['xterm']);
				expect(data.description).toBe('X terminal emulator');
				expect(data.booleans).toEqual({});
				expect(data.numbers).toEqual({});
				expect(data.strings).toEqual({});
			}
		});

		it('preserves all capability data', () => {
			const buffer = createTerminfoWithBooleans([true, true]);
			const result = parseTerminfo(buffer);

			expect(result.success).toBe(true);
			if (result.success) {
				const data = toTerminfoData(result.data);

				expect(data.booleans['auto_left_margin']).toBe(true);
				expect(data.booleans['auto_right_margin']).toBe(true);
			}
		});
	});

	describe('constants', () => {
		it('exports correct magic numbers', () => {
			expect(TERMINFO_MAGIC_LEGACY).toBe(0x011a);
			expect(TERMINFO_MAGIC_EXTENDED).toBe(0x021e);
		});
	});

	describe('error handling', () => {
		it('handles truncated names section', () => {
			const buffer = Buffer.alloc(14);
			buffer.writeUInt16LE(TERMINFO_MAGIC_LEGACY, 0);
			buffer.writeUInt16LE(100, 2); // nameSize larger than buffer

			const result = parseTerminfo(buffer);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe('TRUNCATED_NAMES');
			}
		});

		it('handles truncated boolean section', () => {
			const buffer = Buffer.alloc(20);
			buffer.writeUInt16LE(TERMINFO_MAGIC_LEGACY, 0);
			buffer.writeUInt16LE(5, 2); // nameSize
			buffer.writeUInt16LE(100, 4); // boolCount larger than remaining
			buffer.write('test', 12, 'latin1');
			buffer[16] = 0;

			const result = parseTerminfo(buffer);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe('TRUNCATED_BOOLEANS');
			}
		});

		it('handles truncated number section', () => {
			const magic = TERMINFO_MAGIC_LEGACY;
			const nameSize = 5;
			const buffer = Buffer.alloc(20);
			buffer.writeUInt16LE(magic, 0);
			buffer.writeUInt16LE(nameSize, 2);
			buffer.writeUInt16LE(0, 4); // boolCount = 0
			buffer.writeUInt16LE(100, 6); // numCount larger than remaining
			buffer.write('test', 12, 'latin1');
			buffer[16] = 0;

			const result = parseTerminfo(buffer);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe('TRUNCATED_NUMBERS');
			}
		});

		it('handles truncated string section', () => {
			const magic = TERMINFO_MAGIC_LEGACY;
			const nameSize = 5;
			const buffer = Buffer.alloc(20);
			buffer.writeUInt16LE(magic, 0);
			buffer.writeUInt16LE(nameSize, 2);
			buffer.writeUInt16LE(0, 4); // boolCount = 0
			buffer.writeUInt16LE(0, 6); // numCount = 0
			buffer.writeUInt16LE(100, 8); // stringCount larger than remaining
			buffer.writeUInt16LE(1000, 10); // stringTableSize
			buffer.write('test', 12, 'latin1');
			buffer[16] = 0;

			const result = parseTerminfo(buffer);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe('TRUNCATED_STRINGS');
			}
		});
	});

	describe('edge cases', () => {
		it('handles empty names', () => {
			const buffer = createMinimalTerminfo({ names: '' });
			const result = parseTerminfo(buffer);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.name).toBe('unknown');
			}
		});

		it('handles single pipe in names', () => {
			const buffer = createMinimalTerminfo({ names: '|description' });
			const result = parseTerminfo(buffer);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.names).toEqual([]);
				expect(result.data.description).toBe('description');
			}
		});

		it('handles zero-length buffer', () => {
			const result = parseTerminfo(Buffer.alloc(0));
			expect(result.success).toBe(false);
		});
	});
});
