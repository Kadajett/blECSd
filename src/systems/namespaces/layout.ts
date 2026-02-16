/**
 * Layout system namespace.
 *
 * @example
 * ```typescript
 * import { layout } from 'blecsd/systems';
 * const world = createWorld();
 * const system = layout.create(world);
 * layout.invalidate(world, eid);
 * layout.computeNow(world);
 * const computed = layout.getComputed(world, eid);
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

export const layout = Object.freeze({
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

export type LayoutSystemModule = typeof layout;
