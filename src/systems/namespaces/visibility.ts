/**
 * Visibility culling system namespace.
 *
 * @example
 * ```typescript
 * import { visibility } from 'blecsd/systems';
 * const world = createWorld();
 * const system = visibility.create(world, { x: 0, y: 0, width: 800, height: 600 });
 * visibility.performCulling(world);
 * const visible = visibility.queryVisible(world);
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

export const visibility = Object.freeze({
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

export type VisibilitySystemModule = typeof visibility;
