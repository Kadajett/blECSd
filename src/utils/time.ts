/**
 * Time Utilities
 *
 * Date and time formatting utilities for timestamps and log entries.
 *
 * @module utils/time
 */

/**
 * Format tokens for date formatting.
 * All tokens are at least 2 characters to avoid ambiguity.
 */
const FORMAT_TOKENS: Record<string, (date: Date) => string> = {
	// Year
	YYYY: (d) => d.getFullYear().toString(),
	YY: (d) => d.getFullYear().toString().slice(-2),

	// Month
	MM: (d) => (d.getMonth() + 1).toString().padStart(2, '0'),

	// Day
	DD: (d) => d.getDate().toString().padStart(2, '0'),

	// Hour (24-hour)
	HH: (d) => d.getHours().toString().padStart(2, '0'),

	// Hour (12-hour)
	hh: (d) => {
		const h = d.getHours() % 12;
		return (h === 0 ? 12 : h).toString().padStart(2, '0');
	},

	// Minute
	mm: (d) => d.getMinutes().toString().padStart(2, '0'),

	// Second
	ss: (d) => d.getSeconds().toString().padStart(2, '0'),

	// Millisecond
	SSS: (d) => d.getMilliseconds().toString().padStart(3, '0'),
	SS: (d) =>
		Math.floor(d.getMilliseconds() / 10)
			.toString()
			.padStart(2, '0'),

	// AM/PM
	AA: (d) => (d.getHours() < 12 ? 'AM' : 'PM'),
	aa: (d) => (d.getHours() < 12 ? 'am' : 'pm'),
};

// Sort tokens by length (longest first) to match longer tokens before shorter ones
const TOKEN_REGEX = new RegExp(
	Object.keys(FORMAT_TOKENS)
		.sort((a, b) => b.length - a.length)
		.join('|'),
	'g',
);

/**
 * Formats a date according to a format string.
 *
 * Supported tokens:
 * - YYYY: 4-digit year
 * - YY: 2-digit year
 * - MM: 2-digit month (01-12)
 * - DD: 2-digit day (01-31)
 * - HH: 2-digit hour, 24-hour (00-23)
 * - hh: 2-digit hour, 12-hour (01-12)
 * - mm: 2-digit minute (00-59)
 * - ss: 2-digit second (00-59)
 * - SSS: 3-digit millisecond (000-999)
 * - SS: 2-digit centisecond (00-99)
 * - AA: AM/PM (uppercase)
 * - aa: am/pm (lowercase)
 *
 * @param date - The date to format
 * @param format - The format string
 * @returns The formatted date string
 *
 * @example
 * ```typescript
 * import { formatDate } from 'blecsd/utils';
 *
 * const now = new Date();
 *
 * // ISO-like format
 * formatDate(now, 'YYYY-MM-DD HH:mm:ss');
 * // => "2026-02-05 14:30:45"
 *
 * // Time only with milliseconds
 * formatDate(now, 'HH:mm:ss.SSS');
 * // => "14:30:45.123"
 *
 * // 12-hour format
 * formatDate(now, 'hh:mm:ss AA');
 * // => "02:30:45 PM"
 * ```
 */
export function formatDate(date: Date, format: string): string {
	return format.replace(TOKEN_REGEX, (token) => {
		const formatter = FORMAT_TOKENS[token];
		return formatter ? formatter(date) : token;
	});
}

/**
 * Gets a Unix timestamp (seconds since epoch).
 *
 * @param date - The date (defaults to now)
 * @returns Unix timestamp in seconds
 *
 * @example
 * ```typescript
 * import { unixTimestamp } from 'blecsd/utils';
 *
 * const ts = unixTimestamp();
 * // => 1707149445
 * ```
 */
export function unixTimestamp(date: Date = new Date()): number {
	return Math.floor(date.getTime() / 1000);
}

/**
 * Gets a Unix timestamp in milliseconds.
 *
 * @param date - The date (defaults to now)
 * @returns Unix timestamp in milliseconds
 *
 * @example
 * ```typescript
 * import { unixTimestampMs } from 'blecsd/utils';
 *
 * const ts = unixTimestampMs();
 * // => 1707149445123
 * ```
 */
export function unixTimestampMs(date: Date = new Date()): number {
	return date.getTime();
}
