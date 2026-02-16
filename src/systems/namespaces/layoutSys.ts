/**
 * Layout system namespace.
 *
 * @example
 * ```typescript
 * import { layoutSys } from 'blecsd/systems';
 * const world = createWorld();
 * const system = layoutSys.create(world);
 * layoutSys.invalidate(world, eid);
 * layoutSys.computeNow(world);
 * const computed = layoutSys.getComputed(world, eid);
 * ```
 */
import {
	ComputedLayout,
	computeLayoutNow,
	createLayoutSystem,
	getComputedBounds,
	getComputedLayout,
	hasComputedLayout,
	invalidateAllLayouts,
	invalidateLayout,
	layoutSystem,
} from '../layoutSystem';

export const layoutSys = Object.freeze({
	create: createLayoutSystem,
	system: layoutSystem,
	computeNow: computeLayoutNow,
	getComputed: getComputedLayout,
	getBounds: getComputedBounds,
	has: hasComputedLayout,
	invalidate: invalidateLayout,
	invalidateAll: invalidateAllLayouts,
	ComputedLayout,
});

export type LayoutSysModule = typeof layoutSys;
