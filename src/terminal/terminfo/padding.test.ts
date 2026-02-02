/**
 * Tests for terminal padding system.
 *
 * @module terminal/terminfo/padding.test
 */

import { describe, expect, it } from 'vitest';
import {
	addPadding,
	calculateDelay,
	calculateTotalDelay,
	createPaddedPrint,
	createPaddedPrintSync,
	extractPadding,
	formatPadding,
	hasPadding,
	parsePadding,
	processPadding,
	stripPadding,
} from './padding';

describe('padding', () => {
	describe('parsePadding', () => {
		it('parses simple delay', () => {
			const spec = parsePadding('$<5>');
			expect(spec).toEqual({
				delay: 5,
				proportional: false,
				mandatory: false,
				original: '$<5>',
			});
		});

		it('parses proportional padding', () => {
			const spec = parsePadding('$<100*>');
			expect(spec).toEqual({
				delay: 100,
				proportional: true,
				mandatory: false,
				original: '$<100*>',
			});
		});

		it('parses mandatory padding', () => {
			const spec = parsePadding('$<50/>');
			expect(spec).toEqual({
				delay: 50,
				proportional: false,
				mandatory: true,
				original: '$<50/>',
			});
		});

		it('parses proportional and mandatory', () => {
			const spec = parsePadding('$<10*/>');
			expect(spec).toEqual({
				delay: 10,
				proportional: true,
				mandatory: true,
				original: '$<10*/>',
			});
		});

		it('returns null for invalid padding', () => {
			expect(parsePadding('invalid')).toBeNull();
			expect(parsePadding('$<>')).toBeNull();
			expect(parsePadding('$<abc>')).toBeNull();
			expect(parsePadding('$<5')).toBeNull();
		});
	});

	describe('extractPadding', () => {
		it('extracts single padding', () => {
			const specs = extractPadding('\x1b[?5h$<100/>\x1b[?5l');
			expect(specs).toHaveLength(1);
			expect(specs[0]).toMatchObject({
				delay: 100,
				mandatory: true,
			});
		});

		it('extracts multiple padding specs', () => {
			const specs = extractPadding('$<10>\x1b[H$<20*>\x1b[J$<30/>');
			expect(specs).toHaveLength(3);
			expect(specs[0]!.delay).toBe(10);
			expect(specs[1]!.delay).toBe(20);
			expect(specs[1]!.proportional).toBe(true);
			expect(specs[2]!.delay).toBe(30);
			expect(specs[2]!.mandatory).toBe(true);
		});

		it('returns empty array for no padding', () => {
			expect(extractPadding('\x1b[H\x1b[J')).toEqual([]);
		});
	});

	describe('hasPadding', () => {
		it('returns true for strings with padding', () => {
			expect(hasPadding('$<100/>')).toBe(true);
			expect(hasPadding('\x1b[H$<50>\x1b[J')).toBe(true);
		});

		it('returns false for strings without padding', () => {
			expect(hasPadding('\x1b[H\x1b[J')).toBe(false);
			expect(hasPadding('plain text')).toBe(false);
		});
	});

	describe('stripPadding', () => {
		it('removes single padding marker', () => {
			expect(stripPadding('\x1b[?5h$<100/>\x1b[?5l')).toBe('\x1b[?5h\x1b[?5l');
		});

		it('removes multiple padding markers', () => {
			expect(stripPadding('$<10>\x1b[H$<20>\x1b[J')).toBe('\x1b[H\x1b[J');
		});

		it('returns unchanged string without padding', () => {
			expect(stripPadding('\x1b[H')).toBe('\x1b[H');
		});
	});

	describe('calculateDelay', () => {
		it('returns delay for simple padding', () => {
			const spec = parsePadding('$<50>')!;
			expect(calculateDelay(spec, { highSpeed: false })).toBe(50);
		});

		it('returns 0 when padding disabled', () => {
			const spec = parsePadding('$<50>')!;
			expect(calculateDelay(spec, { enabled: false })).toBe(0);
		});

		it('returns 0 for non-mandatory on high-speed', () => {
			const spec = parsePadding('$<50>')!;
			expect(calculateDelay(spec, { highSpeed: true })).toBe(0);
		});

		it('returns delay for mandatory on high-speed', () => {
			const spec = parsePadding('$<50/>')!;
			expect(calculateDelay(spec, { highSpeed: true })).toBe(50);
		});

		it('scales proportional padding by affected lines', () => {
			const spec = parsePadding('$<10*>')!;
			expect(calculateDelay(spec, { highSpeed: false, affectedLines: 1 })).toBe(10);
			expect(calculateDelay(spec, { highSpeed: false, affectedLines: 5 })).toBe(50);
			expect(calculateDelay(spec, { highSpeed: false, affectedLines: 10 })).toBe(100);
		});

		it('scales by baud rate', () => {
			const spec = parsePadding('$<100/>')!;
			// At 1200 baud: 100ms
			expect(calculateDelay(spec, { highSpeed: true, baudRate: 1200 })).toBe(100);
			// At 2400 baud: 200ms
			expect(calculateDelay(spec, { highSpeed: true, baudRate: 2400 })).toBe(200);
			// At 9600 baud: 800ms
			expect(calculateDelay(spec, { highSpeed: true, baudRate: 9600 })).toBe(800);
		});
	});

	describe('calculateTotalDelay', () => {
		it('sums delays from multiple padding specs', () => {
			const total = calculateTotalDelay('$<50/>\x1b[H$<25/>', { highSpeed: true });
			expect(total).toBe(75);
		});

		it('returns 0 for no padding', () => {
			expect(calculateTotalDelay('\x1b[H')).toBe(0);
		});

		it('skips non-mandatory on high-speed', () => {
			const total = calculateTotalDelay('$<50>\x1b[H$<25/>', { highSpeed: true });
			expect(total).toBe(25); // Only mandatory
		});
	});

	describe('processPadding', () => {
		it('returns stripped output and total delay', () => {
			const result = processPadding('\x1b[?5h$<100/>\x1b[?5l', { highSpeed: true });
			expect(result.output).toBe('\x1b[?5h\x1b[?5l');
			expect(result.totalDelay).toBe(100);
			expect(result.paddingSpecs).toHaveLength(1);
		});

		it('handles strings without padding', () => {
			const result = processPadding('\x1b[H\x1b[J');
			expect(result.output).toBe('\x1b[H\x1b[J');
			expect(result.totalDelay).toBe(0);
			expect(result.paddingSpecs).toEqual([]);
		});
	});

	describe('formatPadding', () => {
		it('formats simple delay', () => {
			expect(formatPadding({ delay: 100, proportional: false, mandatory: false })).toBe('$<100>');
		});

		it('formats proportional', () => {
			expect(formatPadding({ delay: 50, proportional: true, mandatory: false })).toBe('$<50*>');
		});

		it('formats mandatory', () => {
			expect(formatPadding({ delay: 25, proportional: false, mandatory: true })).toBe('$<25/>');
		});

		it('formats both flags', () => {
			expect(formatPadding({ delay: 10, proportional: true, mandatory: true })).toBe('$<10*/>');
		});
	});

	describe('addPadding', () => {
		it('adds simple padding', () => {
			expect(addPadding('\x1b[H', 50)).toBe('\x1b[H$<50>');
		});

		it('adds proportional padding', () => {
			expect(addPadding('\x1b[H', 50, { proportional: true })).toBe('\x1b[H$<50*>');
		});

		it('adds mandatory padding', () => {
			expect(addPadding('\x1b[H', 50, { mandatory: true })).toBe('\x1b[H$<50/>');
		});

		it('adds both flags', () => {
			expect(addPadding('\x1b[H', 50, { proportional: true, mandatory: true })).toBe(
				'\x1b[H$<50*/>',
			);
		});
	});

	describe('createPaddedPrint', () => {
		it('writes output and delays', async () => {
			const written: string[] = [];
			const writer = (s: string) => written.push(s);
			const print = createPaddedPrint(writer, { highSpeed: true });

			const start = Date.now();
			await print('\x1b[?5h$<50/>\x1b[?5l');
			const elapsed = Date.now() - start;

			expect(written).toEqual(['\x1b[?5h\x1b[?5l']);
			// Allow some tolerance for timing
			expect(elapsed).toBeGreaterThanOrEqual(45);
		});

		it('skips delay on high-speed for non-mandatory', async () => {
			const written: string[] = [];
			const writer = (s: string) => written.push(s);
			const print = createPaddedPrint(writer, { highSpeed: true });

			const start = Date.now();
			await print('\x1b[H$<100>'); // Non-mandatory
			const elapsed = Date.now() - start;

			expect(written).toEqual(['\x1b[H']);
			expect(elapsed).toBeLessThan(50); // Should be nearly instant
		});

		it('respects override config', async () => {
			const written: string[] = [];
			const writer = (s: string) => written.push(s);
			const print = createPaddedPrint(writer, { highSpeed: true });

			const start = Date.now();
			await print('\x1b[H$<50>', { highSpeed: false }); // Override to low-speed
			const elapsed = Date.now() - start;

			expect(elapsed).toBeGreaterThanOrEqual(45);
		});
	});

	describe('createPaddedPrintSync', () => {
		it('writes output and delays synchronously', () => {
			const written: string[] = [];
			const writer = (s: string) => written.push(s);
			const print = createPaddedPrintSync(writer, { highSpeed: true });

			const start = Date.now();
			print('\x1b[?5h$<30/>\x1b[?5l');
			const elapsed = Date.now() - start;

			expect(written).toEqual(['\x1b[?5h\x1b[?5l']);
			// Allow some tolerance
			expect(elapsed).toBeGreaterThanOrEqual(25);
		});

		it('handles no delay case', () => {
			const written: string[] = [];
			const writer = (s: string) => written.push(s);
			const print = createPaddedPrintSync(writer, { highSpeed: true });

			const start = Date.now();
			print('\x1b[H'); // No padding
			const elapsed = Date.now() - start;

			expect(written).toEqual(['\x1b[H']);
			expect(elapsed).toBeLessThan(10);
		});
	});

	describe('edge cases', () => {
		it('handles zero delay', () => {
			const spec = parsePadding('$<0>');
			expect(spec?.delay).toBe(0);
			expect(calculateDelay(spec!, { highSpeed: false })).toBe(0);
		});

		it('handles large delays', () => {
			const spec = parsePadding('$<9999>');
			expect(spec?.delay).toBe(9999);
		});

		it('handles empty string', () => {
			expect(extractPadding('')).toEqual([]);
			expect(stripPadding('')).toBe('');
			expect(hasPadding('')).toBe(false);
		});

		it('handles adjacent padding markers', () => {
			const specs = extractPadding('$<10>$<20>$<30>');
			expect(specs).toHaveLength(3);
			expect(specs.map((s) => s.delay)).toEqual([10, 20, 30]);
		});

		it('preserves text around padding', () => {
			expect(stripPadding('prefix$<100>middle$<50>suffix')).toBe('prefixmiddlesuffix');
		});
	});
});
