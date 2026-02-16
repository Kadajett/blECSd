/**
 * Time utilities namespace.
 *
 * @example
 * ```typescript
 * import { time } from 'blecsd/utils';
 *
 * const formatted = time.formatDate(new Date());
 * const timestamp = time.unixTimestamp();
 * const timestampMs = time.unixTimestampMs();
 * ```
 */

import { formatDate, unixTimestamp, unixTimestampMs } from '../time';

export const time = Object.freeze({
	formatDate,
	unixTimestamp,
	unixTimestampMs,
});

export type TimeModule = typeof time;
