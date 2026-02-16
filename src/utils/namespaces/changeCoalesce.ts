/**
 * Change coalescing utilities namespace.
 *
 * @example
 * ```typescript
 * import { changeCoalesce } from 'blecsd/utils';
 *
 * const coalescer = changeCoalesce.createCoalescer({ debounceMs: 50 });
 * changeCoalesce.queueChange(coalescer, changeCoalesce.insertChange(10, 'hello'));
 * const result = changeCoalesce.flushChanges(coalescer);
 * ```
 */

import {
	createCoalescer,
	deleteChange,
	destroyCoalescer,
	flushChanges,
	getCoalescingState,
	insertChange,
	queueChange,
	replaceChange,
} from '../changeCoalescing';

export const changeCoalesce = Object.freeze({
	createCoalescer,
	queueChange,
	flushChanges,
	insertChange,
	deleteChange,
	replaceChange,
	getCoalescingState,
	destroyCoalescer,
});

export type ChangeCoalesceModule = typeof changeCoalesce;
