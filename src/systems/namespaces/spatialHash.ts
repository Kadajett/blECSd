/**
 * Spatial hash system namespace.
 *
 * @example
 * ```typescript
 * import { spatialHash } from 'blecsd/systems';
 * const world = createWorld();
 * const system = spatialHash.create(world, { cellSize: 64 });
 * spatialHash.insert(world, eid);
 * const nearby = spatialHash.getNearby(world, x, y, radius);
 * ```
 */
import {
	clearSpatialHash,
	createSpatialHash,
	createSpatialHashSystem,
	createSpatialHashSystemState,
	DEFAULT_CELL_SIZE,
	getEntitiesAtPoint,
	getEntitiesInCell,
	getNearbyEntities,
	getSpatialDirtyCount,
	getSpatialHashGrid,
	getSpatialHashStats,
	getSpatialHashSystemState,
	incrementalSpatialUpdate,
	insertEntity,
	markSpatialDirty,
	queryArea,
	rebuildSpatialHash,
	removeEntityFromGrid,
	resetSpatialHashState,
	setSpatialDirtyThreshold,
	setSpatialHashGrid,
	spatialHashSystem,
	worldToCell,
} from '../spatialHash';

export const spatialHash = Object.freeze({
	create: createSpatialHashSystem,
	createHash: createSpatialHash,
	createState: createSpatialHashSystemState,
	system: spatialHashSystem,
	insert: insertEntity,
	remove: removeEntityFromGrid,
	getNearby: getNearbyEntities,
	getAtPoint: getEntitiesAtPoint,
	getInCell: getEntitiesInCell,
	queryArea,
	clear: clearSpatialHash,
	rebuild: rebuildSpatialHash,
	incrementalUpdate: incrementalSpatialUpdate,
	markDirty: markSpatialDirty,
	getDirtyCount: getSpatialDirtyCount,
	setDirtyThreshold: setSpatialDirtyThreshold,
	getGrid: getSpatialHashGrid,
	setGrid: setSpatialHashGrid,
	getState: getSpatialHashSystemState,
	getStats: getSpatialHashStats,
	reset: resetSpatialHashState,
	worldToCell,
	DEFAULT_CELL_SIZE,
});

export type SpatialHashSystemModule = typeof spatialHash;
