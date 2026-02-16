/**
 * Spatial hash system namespace.
 *
 * @example
 * ```typescript
 * import { spatialHashSys } from 'blecsd/systems';
 * const world = createWorld();
 * const system = spatialHashSys.create(world, { cellSize: 64 });
 * spatialHashSys.insert(world, eid);
 * const nearby = spatialHashSys.getNearby(world, x, y, radius);
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

export const spatialHashSys = Object.freeze({
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

export type SpatialHashSysModule = typeof spatialHashSys;
