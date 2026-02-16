/**
 * Visibility culling system namespace.
 *
 * @example
 * ```typescript
 * import { visibilitySys } from 'blecsd/systems';
 * const world = createWorld();
 * const system = visibilitySys.create(world, { x: 0, y: 0, width: 800, height: 600 });
 * visibilitySys.performCulling(world);
 * const visible = visibilitySys.queryVisible(world);
 * ```
 */
import {
	clearPositionCache,
	createIncrementalSpatialSystem,
	createPositionCache,
	createVisibilityCullingSystem,
	performCulling,
	queryVisibleEntities,
	removeFromCache,
	updateEntityIfMoved,
} from '../visibilityCulling';

export const visibilitySys = Object.freeze({
	create: createVisibilityCullingSystem,
	createIncrementalSpatial: createIncrementalSpatialSystem,
	performCulling,
	queryVisible: queryVisibleEntities,
	cache: Object.freeze({
		create: createPositionCache,
		clear: clearPositionCache,
		remove: removeFromCache,
		updateIfMoved: updateEntityIfMoved,
	}),
});

export type VisibilitySysModule = typeof visibilitySys;
