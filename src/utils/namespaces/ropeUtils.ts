/**
 * Rope data structure utilities namespace for efficient large text buffers.
 *
 * @example
 * ```typescript
 * import { ropeUtils } from 'blecsd/utils';
 *
 * const rope = ropeUtils.createRope('Hello World');
 * const updated = ropeUtils.insert(rope, 5, ', Beautiful');
 * const text = ropeUtils.getText(updated);
 * const line = ropeUtils.getLine(updated, 0);
 * ```
 */

import {
	append,
	charAt,
	createEmptyRope,
	createRope,
	deleteRange,
	getLength,
	getLine,
	getLineCount,
	getLineEnd,
	getLineForIndex,
	getLineStart,
	getLines,
	getNewlineCount,
	getStats,
	getText,
	insert,
	isEmpty,
	LEAF_MAX_SIZE,
	LEAF_MIN_SIZE,
	MAX_DEPTH,
	prepend,
	replaceRange,
	substring,
	verify,
} from '../rope';

export const ropeUtils = Object.freeze({
	createRope,
	createEmptyRope,
	insert,
	deleteRange,
	replaceRange,
	getText,
	getLine,
	getLineCount,
	append,
	prepend,
	charAt,
	substring,
	getLength,
	getLineStart,
	getLineEnd,
	getLineForIndex,
	getLines,
	getNewlineCount,
	getStats,
	isEmpty,
	verify,
	LEAF_MAX_SIZE,
	LEAF_MIN_SIZE,
	MAX_DEPTH,
});

export type RopeUtilsModule = typeof ropeUtils;
