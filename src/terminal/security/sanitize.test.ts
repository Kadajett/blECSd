/**
 * Tests for escape sequence sanitization
 */

import { describe, expect, it } from 'vitest';
import {
	categorizeEscapeSequences,
	containsEscapeSequences,
	createSafeStringBuilder,
	DEFAULT_SANITIZE_OPTIONS,
	extractEscapeSequences,
	isSafeForTerminal,
	sanitizeForTerminal,
} from './sanitize';

describe('sanitizeForTerminal', () => {
	describe('default behavior (strip all)', () => {
		it('removes CSI sequences', () => {
			const input = 'Hello\x1b[1;31mWorld\x1b[0m';
			const result = sanitizeForTerminal(input);
			expect(result).toBe('HelloWorld');
		});

		it('removes OSC sequences', () => {
			const input = 'Hello\x1b]0;Title\x07World';
			const result = sanitizeForTerminal(input);
			expect(result).toBe('HelloWorld');
		});

		it('removes OSC sequences with ST terminator', () => {
			const input = 'Hello\x1b]0;Title\x1b\\World';
			const result = sanitizeForTerminal(input);
			expect(result).toBe('HelloWorld');
		});

		it('removes DCS sequences', () => {
			const input = 'Hello\x1bPData\x1b\\World';
			const result = sanitizeForTerminal(input);
			expect(result).toBe('HelloWorld');
		});

		it('removes APC sequences', () => {
			const input = 'Hello\x1b_Data\x1b\\World';
			const result = sanitizeForTerminal(input);
			expect(result).toBe('HelloWorld');
		});

		it('removes SOS sequences', () => {
			const input = 'Hello\x1bXData\x1b\\World';
			const result = sanitizeForTerminal(input);
			expect(result).toBe('HelloWorld');
		});

		it('removes PM sequences', () => {
			const input = 'Hello\x1b^Data\x1b\\World';
			const result = sanitizeForTerminal(input);
			expect(result).toBe('HelloWorld');
		});

		it('removes raw ESC characters', () => {
			const input = 'Hello\x1bWorld';
			const result = sanitizeForTerminal(input);
			expect(result).toBe('HelloWorld');
		});

		it('removes dangerous control characters', () => {
			const input = 'Hello\x00\x08\x7fWorld';
			const result = sanitizeForTerminal(input);
			expect(result).toBe('HelloWorld');
		});

		it('preserves normal text', () => {
			const input = 'Hello World!';
			const result = sanitizeForTerminal(input);
			expect(result).toBe('Hello World!');
		});

		it('preserves UTF-8 characters', () => {
			const input = 'Hello 世界 🌍';
			const result = sanitizeForTerminal(input);
			expect(result).toBe('Hello 世界 🌍');
		});

		it('preserves newlines and tabs', () => {
			const input = 'Hello\n\tWorld';
			const result = sanitizeForTerminal(input);
			expect(result).toBe('Hello\n\tWorld');
		});
	});

	describe('allowColors option', () => {
		it('preserves SGR color sequences when allowed', () => {
			const input = '\x1b[1;31mRed Bold\x1b[0m';
			const result = sanitizeForTerminal(input, {
				stripAllEscapes: false,
				allowColors: true,
			});
			expect(result).toBe('\x1b[1;31mRed Bold\x1b[0m');
		});

		it('strips non-SGR sequences even when colors allowed', () => {
			const input = '\x1b[1;31mRed\x1b[2JCleared\x1b[0m';
			const result = sanitizeForTerminal(input, {
				stripAllEscapes: false,
				allowColors: true,
			});
			expect(result).toBe('\x1b[1;31mRedCleared\x1b[0m');
		});

		it('strips OSC sequences even when colors allowed', () => {
			const input = '\x1b[31m\x1b]0;Evil\x07Red\x1b[0m';
			const result = sanitizeForTerminal(input, {
				stripAllEscapes: false,
				allowColors: true,
			});
			expect(result).toBe('\x1b[31mRed\x1b[0m');
		});
	});

	describe('allowCursor option', () => {
		it('preserves cursor movement when allowed', () => {
			const input = '\x1b[10;5HHello\x1b[1AUp';
			const result = sanitizeForTerminal(input, {
				stripAllEscapes: false,
				allowCursor: true,
			});
			expect(result).toContain('\x1b[10;5H');
			expect(result).toContain('\x1b[1A');
		});

		it('strips dangerous sequences even when cursor allowed', () => {
			const input = '\x1b[10;5H\x1b]52;c;SGVsbG8=\x1b\\Hello';
			const result = sanitizeForTerminal(input, {
				stripAllEscapes: false,
				allowCursor: true,
			});
			expect(result).not.toContain('\x1b]52');
		});
	});

	describe('replacementChar option', () => {
		it('replaces stripped sequences with specified char', () => {
			const input = 'Hello\x1b[1mWorld';
			const result = sanitizeForTerminal(input, { replacementChar: '?' });
			expect(result).toBe('Hello?World');
		});

		it('uses empty string by default', () => {
			const input = 'Hello\x1b[1mWorld';
			const result = sanitizeForTerminal(input);
			expect(result).toBe('HelloWorld');
		});
	});

	describe('stripAllEscapes priority', () => {
		it('strips all when stripAllEscapes is true even if allowColors is true', () => {
			const input = '\x1b[31mRed\x1b[0m';
			const result = sanitizeForTerminal(input, {
				stripAllEscapes: true,
				allowColors: true,
			});
			expect(result).toBe('Red');
		});
	});

	describe('injection attack prevention', () => {
		it('prevents title setting injection', () => {
			const malicious = 'PlayerName\x1b]0;Evil Title\x07';
			const result = sanitizeForTerminal(malicious);
			expect(result).toBe('PlayerName');
		});

		it('prevents clipboard access injection', () => {
			const malicious = 'Message\x1b]52;c;SGVsbG8=\x1b\\';
			const result = sanitizeForTerminal(malicious);
			expect(result).toBe('Message');
		});

		it('prevents screen clear injection', () => {
			const malicious = 'Hello\x1b[2JWorld';
			const result = sanitizeForTerminal(malicious);
			expect(result).toBe('HelloWorld');
		});

		it('prevents cursor repositioning injection', () => {
			const malicious = 'Real\x1b[H\x1b[2JFake';
			const result = sanitizeForTerminal(malicious);
			expect(result).toBe('RealFake');
		});

		it('prevents DCS device control injection', () => {
			const malicious = 'Safe\x1bP+qEvil\x1b\\Data';
			const result = sanitizeForTerminal(malicious);
			expect(result).toBe('SafeData');
		});
	});

	describe('performance', () => {
		it('handles large strings efficiently', () => {
			const largeInput = `${'x'.repeat(100000)}\x1b[1m${'y'.repeat(100000)}`;
			const start = performance.now();
			const result = sanitizeForTerminal(largeInput);
			const elapsed = performance.now() - start;

			expect(result.length).toBe(200000);
			expect(elapsed).toBeLessThan(100); // Should be very fast
		});
	});
});

describe('containsEscapeSequences', () => {
	it('returns true for strings with ESC', () => {
		expect(containsEscapeSequences('\x1b[1m')).toBe(true);
	});

	it('returns true for strings with control characters', () => {
		expect(containsEscapeSequences('Hello\x00World')).toBe(true);
		expect(containsEscapeSequences('Hello\x7fWorld')).toBe(true);
	});

	it('returns false for safe strings', () => {
		expect(containsEscapeSequences('Hello World')).toBe(false);
	});

	it('returns false for strings with newlines and tabs', () => {
		expect(containsEscapeSequences('Hello\n\tWorld')).toBe(false);
	});
});

describe('isSafeForTerminal', () => {
	it('returns true for safe strings', () => {
		expect(isSafeForTerminal('Hello World')).toBe(true);
		expect(isSafeForTerminal('Unicode 世界 🌍')).toBe(true);
	});

	it('returns false for unsafe strings', () => {
		expect(isSafeForTerminal('\x1b[1m')).toBe(false);
		expect(isSafeForTerminal('Hello\x00')).toBe(false);
	});
});

describe('SafeStringBuilder', () => {
	describe('basic usage', () => {
		it('combines trusted and untrusted content', () => {
			const builder = createSafeStringBuilder();
			const result = builder
				.append('\x1b[1m')
				.appendUntrusted('user\x1b[0mInput')
				.append('\x1b[0m')
				.toString();

			expect(result).toBe('\x1b[1muserInput\x1b[0m');
		});

		it('preserves trusted escape sequences', () => {
			const builder = createSafeStringBuilder();
			const result = builder.append('\x1b[31m').append('Red').append('\x1b[0m').toString();

			expect(result).toBe('\x1b[31mRed\x1b[0m');
		});

		it('sanitizes untrusted content', () => {
			const builder = createSafeStringBuilder();
			const result = builder.appendUntrusted('\x1b[31mMalicious\x1b[0m').toString();

			expect(result).toBe('Malicious');
		});
	});

	describe('with custom default options', () => {
		it('uses custom options for all untrusted content', () => {
			const builder = createSafeStringBuilder({
				stripAllEscapes: false,
				allowColors: true,
			});
			const result = builder.appendUntrusted('\x1b[31mColored\x1b[0m').toString();

			expect(result).toBe('\x1b[31mColored\x1b[0m');
		});
	});

	describe('per-append options override', () => {
		it('allows overriding options per append', () => {
			const builder = createSafeStringBuilder(); // Default: strip all
			const result = builder
				.appendUntrusted('\x1b[31mStripped\x1b[0m')
				.appendUntrusted('\x1b[32mKept\x1b[0m', {
					stripAllEscapes: false,
					allowColors: true,
				})
				.toString();

			expect(result).toBe('Stripped\x1b[32mKept\x1b[0m');
		});
	});

	describe('clear', () => {
		it('clears all content', () => {
			const builder = createSafeStringBuilder();
			builder.append('Hello').clear().append('World');
			expect(builder.toString()).toBe('World');
		});
	});

	describe('length', () => {
		it('returns total length', () => {
			const builder = createSafeStringBuilder();
			builder.append('Hello').append(' ').append('World');
			expect(builder.length).toBe(11);
		});
	});

	describe('chaining', () => {
		it('supports method chaining', () => {
			const result = createSafeStringBuilder()
				.append('A')
				.appendUntrusted('B\x1b[1m')
				.append('C')
				.clear()
				.append('D')
				.toString();

			expect(result).toBe('D');
		});
	});
});

describe('extractEscapeSequences', () => {
	it('extracts CSI sequences', () => {
		const input = 'Hello\x1b[1;31mWorld\x1b[0m';
		const sequences = extractEscapeSequences(input);
		expect(sequences).toContain('\x1b[1;31m');
		expect(sequences).toContain('\x1b[0m');
	});

	it('extracts OSC sequences', () => {
		const input = '\x1b]0;Title\x07';
		const sequences = extractEscapeSequences(input);
		expect(sequences).toContain('\x1b]0;Title\x07');
	});

	it('returns empty array for safe strings', () => {
		const input = 'Hello World';
		const sequences = extractEscapeSequences(input);
		expect(sequences).toEqual([]);
	});

	it('extracts multiple sequence types', () => {
		const input = '\x1b[1m\x1b]0;T\x07\x1bPD\x1b\\';
		const sequences = extractEscapeSequences(input);
		expect(sequences.length).toBeGreaterThanOrEqual(3);
	});
});

describe('categorizeEscapeSequences', () => {
	it('categorizes by sequence type', () => {
		const input =
			'\x1b[1m' + // CSI
			'\x1b]0;T\x07' + // OSC
			'\x1bPD\x1b\\' + // DCS
			'\x1b_A\x1b\\' + // APC
			'\x1bXS\x1b\\' + // SOS
			'\x1b^P\x1b\\'; // PM

		const categories = categorizeEscapeSequences(input);

		expect(categories.csi.length).toBe(1);
		expect(categories.osc.length).toBe(1);
		expect(categories.dcs.length).toBe(1);
		expect(categories.apc.length).toBe(1);
		expect(categories.sos.length).toBe(1);
		expect(categories.pm.length).toBe(1);
	});

	it('returns empty arrays for safe input', () => {
		const categories = categorizeEscapeSequences('Hello World');

		expect(categories.csi).toEqual([]);
		expect(categories.osc).toEqual([]);
		expect(categories.dcs).toEqual([]);
		expect(categories.apc).toEqual([]);
		expect(categories.sos).toEqual([]);
		expect(categories.pm).toEqual([]);
	});
});

describe('DEFAULT_SANITIZE_OPTIONS', () => {
	it('has expected defaults', () => {
		expect(DEFAULT_SANITIZE_OPTIONS.allowColors).toBe(false);
		expect(DEFAULT_SANITIZE_OPTIONS.allowCursor).toBe(false);
		expect(DEFAULT_SANITIZE_OPTIONS.stripAllEscapes).toBe(true);
		expect(DEFAULT_SANITIZE_OPTIONS.replacementChar).toBe('');
	});
});
