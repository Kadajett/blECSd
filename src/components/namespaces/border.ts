/**
 * Border component namespace.
 *
 * Provides all operations for entity border styling and configuration.
 *
 * @example
 * ```typescript
 * import { border } from 'blecsd/components';
 * border.set(world, eid, { type: BorderType.Single });
 * border.enableAll(world, eid);
 * ```
 */
import {
	disableAllBorders,
	enableAllBorders,
	getBorder,
	getBorderChar,
	hasBorder,
	hasBorderVisible,
	setBorder,
	setBorderChars,
} from '../border';

export const border = Object.freeze({
	get: getBorder,
	has: hasBorder,
	set: setBorder,
	hasVisible: hasBorderVisible,
	enableAll: enableAllBorders,
	disableAll: disableAllBorders,
	getChar: getBorderChar,
	setChars: setBorderChars,
});

export type BorderModule = typeof border;
