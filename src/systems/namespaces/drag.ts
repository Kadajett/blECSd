/**
 * Drag system namespace.
 *
 * @example
 * ```typescript
 * import { drag } from 'blecsd/systems';
 * const system = drag.create(world);
 * drag.setConstraints(eid, { minX: 0, maxX: 100, minY: 0, maxY: 100 });
 * const constraints = drag.getConstraints(eid);
 * ```
 */
import {
	clearDragConstraints,
	createDragSystem,
	getDragConstraints,
	getDragVerifyCallback,
	resetDragStores,
	setDragConstraints,
	setDragVerifyCallback,
} from '../dragSystem';

export const drag = Object.freeze({
	create: createDragSystem,
	setConstraints: setDragConstraints,
	getConstraints: getDragConstraints,
	clearConstraints: clearDragConstraints,
	setVerifyCallback: setDragVerifyCallback,
	getVerifyCallback: getDragVerifyCallback,
	reset: resetDragStores,
});

export type DragSystemModule = typeof drag;
