/**
 * Rope data structure utilities namespace for efficient large text buffers.
 *
 * @example
 * ```typescript
 * import { rope } from 'blecsd/utils';
 *
 * const rope = rope.createRope('Hello World');
 * const updated = rope.insert(rope, 5, ', Beautiful');
 * const text = rope.getText(updated);
 * const line = rope.getLine(updated, 0);
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

export const rope = Object.freeze({
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

export type RopeModule = typeof rope;
