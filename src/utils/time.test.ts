/**
 * Time Utilities Tests
 */

import { describe, expect, it } from 'vitest';
import { formatDate, unixTimestamp, unixTimestampMs } from './time';

describe('Time Utilities', () => {
	describe('formatDate', () => {
		// Fixed test date: 2026-02-05 14:30:45.123
		const testDate = new Date(2026, 1, 5, 14, 30, 45, 123);

		it('formats year tokens', () => {
			expect(formatDate(testDate, 'YYYY')).toBe('2026');
			expect(formatDate(testDate, 'YY')).toBe('26');
		});

		it('formats month tokens', () => {
			expect(formatDate(testDate, 'MM')).toBe('02');
		});

		it('formats day tokens', () => {
			expect(formatDate(testDate, 'DD')).toBe('05');
		});

		it('formats 24-hour time tokens', () => {
			expect(formatDate(testDate, 'HH')).toBe('14');
		});

		it('formats 12-hour time tokens', () => {
			expect(formatDate(testDate, 'hh')).toBe('02');
		});

		it('formats minute tokens', () => {
			expect(formatDate(testDate, 'mm')).toBe('30');
		});

		it('formats second tokens', () => {
			expect(formatDate(testDate, 'ss')).toBe('45');
		});

		it('formats millisecond tokens', () => {
			expect(formatDate(testDate, 'SSS')).toBe('123');
			expect(formatDate(testDate, 'SS')).toBe('12');
		});

		it('formats AM/PM tokens', () => {
			expect(formatDate(testDate, 'AA')).toBe('PM');
			expect(formatDate(testDate, 'aa')).toBe('pm');

			const morningDate = new Date(2026, 1, 5, 9, 30, 45);
			expect(formatDate(morningDate, 'AA')).toBe('AM');
			expect(formatDate(morningDate, 'aa')).toBe('am');
		});

		it('formats combined patterns', () => {
			expect(formatDate(testDate, 'YYYY-MM-DD')).toBe('2026-02-05');
			expect(formatDate(testDate, 'HH:mm:ss')).toBe('14:30:45');
			expect(formatDate(testDate, 'HH:mm:ss.SSS')).toBe('14:30:45.123');
			expect(formatDate(testDate, 'YYYY-MM-DD HH:mm:ss')).toBe('2026-02-05 14:30:45');
		});

		it('formats 12-hour time with AM/PM', () => {
			expect(formatDate(testDate, 'hh:mm:ss AA')).toBe('02:30:45 PM');
		});

		it('preserves non-token characters', () => {
			expect(formatDate(testDate, 'Date: YYYY/MM/DD')).toBe('Date: 2026/02/05');
			expect(formatDate(testDate, '[Time] HH:mm')).toBe('[Time] 14:30');
		});

		it('handles midnight hour in 12-hour format', () => {
			const midnightDate = new Date(2026, 1, 5, 0, 15, 0);
			expect(formatDate(midnightDate, 'hh:mm AA')).toBe('12:15 AM');
		});

		it('handles noon hour in 12-hour format', () => {
			const noonDate = new Date(2026, 1, 5, 12, 0, 0);
			expect(formatDate(noonDate, 'hh:mm AA')).toBe('12:00 PM');
		});

		it('handles padded values correctly', () => {
			const singleDigitDate = new Date(2026, 0, 5, 3, 5, 7, 8);
			expect(formatDate(singleDigitDate, 'MM/DD HH:mm:ss.SSS')).toBe('01/05 03:05:07.008');
		});
	});

	describe('unixTimestamp', () => {
		it('returns seconds since epoch', () => {
			const date = new Date(1707149445000);
			expect(unixTimestamp(date)).toBe(1707149445);
		});

		it('uses current time when no date provided', () => {
			const before = Math.floor(Date.now() / 1000);
			const result = unixTimestamp();
			const after = Math.floor(Date.now() / 1000);

			expect(result).toBeGreaterThanOrEqual(before);
			expect(result).toBeLessThanOrEqual(after);
		});

		it('truncates to whole seconds', () => {
			const date = new Date(1707149445999);
			expect(unixTimestamp(date)).toBe(1707149445);
		});
	});

	describe('unixTimestampMs', () => {
		it('returns milliseconds since epoch', () => {
			const date = new Date(1707149445123);
			expect(unixTimestampMs(date)).toBe(1707149445123);
		});

		it('uses current time when no date provided', () => {
			const before = Date.now();
			const result = unixTimestampMs();
			const after = Date.now();

			expect(result).toBeGreaterThanOrEqual(before);
			expect(result).toBeLessThanOrEqual(after);
		});
	});
});
