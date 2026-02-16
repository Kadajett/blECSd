/**
 * VirtualizedList widget namespace.
 *
 * @example
 * ```typescript
 * import { virtualizedList } from 'blecsd/widgets';
 * const vl = virtualizedList.create(world, { items: [...] });
 * virtualizedList.handleKey(world, vl.eid, keyEvent);
 * virtualizedList.handleWheel(world, vl.eid, mouseEvent);
 * ```
 */
import {
	createVirtualizedList,
	handleVirtualizedListKey,
	handleVirtualizedListWheel,
	isVirtualizedList,
} from '../virtualizedList';

export const virtualizedList = Object.freeze({
	create: createVirtualizedList,
	is: isVirtualizedList,
	handleKey: handleVirtualizedListKey,
	handleWheel: handleVirtualizedListWheel,
});

export type VirtualizedListModule = typeof virtualizedList;
