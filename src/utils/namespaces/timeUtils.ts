/**
 * Time utilities namespace.
 *
 * @example
 * ```typescript
 * import { timeUtils } from 'blecsd/utils';
 *
 * const formatted = timeUtils.formatDate(new Date());
 * const timestamp = timeUtils.unixTimestamp();
 * const timestampMs = timeUtils.unixTimestampMs();
 * ```
 */

import { formatDate, unixTimestamp, unixTimestampMs } from '../time';

export const timeUtils = Object.freeze({
	formatDate,
	unixTimestamp,
	unixTimestampMs,
});

export type TimeUtilsModule = typeof timeUtils;
