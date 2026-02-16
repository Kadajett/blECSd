/**
 * Drag system namespace.
 *
 * @example
 * ```typescript
 * import { dragSys } from 'blecsd/systems';
 * const system = dragSys.create(world);
 * dragSys.setConstraints(eid, { minX: 0, maxX: 100, minY: 0, maxY: 100 });
 * const constraints = dragSys.getConstraints(eid);
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

export const dragSys = Object.freeze({
	create: createDragSystem,
	setConstraints: setDragConstraints,
	getConstraints: getDragConstraints,
	clearConstraints: clearDragConstraints,
	setVerifyCallback: setDragVerifyCallback,
	getVerifyCallback: getDragVerifyCallback,
	reset: resetDragStores,
});

export type DragSysModule = typeof dragSys;
