/**
 * Archetype-based Entity Pool: Pre-allocated entity recycling per component archetype
 *
 * Wraps the base EntityPool with archetype-specific pools for zero-allocation
 * steady-state in games and complex UIs. Entities are recycled (components reset)
 * rather than destroyed, reducing GC pressure.
 *
 * @module core/storage/archetypePool
 */

import { addComponent, addEntity, hasComponent, removeComponent } from '../ecs';
import type { Entity, World } from '../types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Component reset function that clears a component's data for an entity.
 */
export type ComponentResetFn = (world: World, eid: Entity) => void;

/**
 * Archetype definition: a named set of components with optional reset functions.
 */
export interface ArchetypeDefinition {
	/** Unique name for this archetype (e.g., 'bullet', 'particle') */
	readonly name: string;
	/** Components that make up this archetype */
	readonly components: readonly unknown[];
	/** Optional reset functions per component (called on recycle) */
	readonly resetFns?: readonly ComponentResetFn[];
}

/**
 * Configuration for an archetype pool.
 */
export interface ArchetypePoolConfig {
	/** Maximum pool size (0 = unlimited) */
	readonly maxSize: number;
	/** Number of entities to pre-allocate */
	readonly preallocate: number;
}

/**
 * Statistics for an archetype pool.
 */
export interface ArchetypePoolStats {
	/** Archetype name */
	readonly name: string;
	/** Number of entities currently in the pool (available for reuse) */
	readonly pooled: number;
	/** Number of entities currently active (checked out) */
	readonly active: number;
	/** Total allocations since creation */
	readonly totalAllocations: number;
	/** Total recycles since creation */
	readonly totalRecycles: number;
	/** Pool hit rate (recycles / allocations) */
	readonly hitRate: number;
	/** Maximum pool size reached */
	readonly maxPoolSize: number;
}

/**
 * Overall recycling system statistics.
 */
export interface RecyclingSystemStats {
	/** Per-archetype stats */
	readonly archetypes: readonly ArchetypePoolStats[];
	/** Total active entities across all pools */
	readonly totalActive: number;
	/** Total pooled entities across all pools */
	readonly totalPooled: number;
	/** Overall hit rate */
	readonly overallHitRate: number;
}

// =============================================================================
// INTERNAL STATE
// =============================================================================

interface ArchetypePoolState {
	readonly definition: ArchetypeDefinition;
	readonly config: ArchetypePoolConfig;
	readonly freeEntities: Entity[];
	readonly activeEntities: Set<Entity>;
	totalAllocations: number;
	totalRecycles: number;
	maxPoolSize: number;
}

/** All archetype pools, keyed by name */
const pools = new Map<string, ArchetypePoolState>();

// =============================================================================
// DEFAULT CONFIGS
// =============================================================================

const DEFAULT_POOL_CONFIG: ArchetypePoolConfig = {
	maxSize: 0,
	preallocate: 0,
};

// =============================================================================
// POOL MANAGEMENT
// =============================================================================

/**
 * Registers an archetype for pooling.
 *
 * @param definition - The archetype definition
 * @param config - Optional pool configuration
 *
 * @example
 * ```typescript
 * import { registerArchetype, Position, Velocity, Renderable } from 'blecsd';
 *
 * registerArchetype({
 *   name: 'bullet',
 *   components: [Position, Velocity, Renderable],
 *   resetFns: [
 *     (world, eid) => { Position.x[eid] = 0; Position.y[eid] = 0; },
 *     (world, eid) => { Velocity.x[eid] = 0; Velocity.y[eid] = 0; },
 *   ],
 * }, { preallocate: 100, maxSize: 500 });
 * ```
 */
export function registerArchetype(
	definition: ArchetypeDefinition,
	config?: Partial<ArchetypePoolConfig>,
): void {
	if (pools.has(definition.name)) {
		return;
	}

	pools.set(definition.name, {
		definition,
		config: { ...DEFAULT_POOL_CONFIG, ...config },
		freeEntities: [],
		activeEntities: new Set(),
		totalAllocations: 0,
		totalRecycles: 0,
		maxPoolSize: 0,
	});
}

/**
 * Pre-allocates entities for a registered archetype.
 *
 * @param world - The ECS world
 * @param archetypeName - Name of the registered archetype
 * @param count - Number of entities to pre-allocate (overrides config if provided)
 *
 * @example
 * ```typescript
 * preallocateEntities(world, 'bullet', 200);
 * ```
 */
export function preallocateEntities(world: World, archetypeName: string, count?: number): void {
	const pool = pools.get(archetypeName);
	if (!pool) return;

	const toAllocate = count ?? pool.config.preallocate;
	for (let i = 0; i < toAllocate; i++) {
		const eid = addEntity(world);
		for (const comp of pool.definition.components) {
			addComponent(world, eid, comp);
		}
		pool.freeEntities.push(eid);
	}
	pool.maxPoolSize = Math.max(pool.maxPoolSize, pool.freeEntities.length);
}

/**
 * Acquires an entity from the archetype pool, reusing a recycled entity if available.
 *
 * @param world - The ECS world
 * @param archetypeName - Name of the registered archetype
 * @returns An entity with all archetype components attached, or null if archetype not registered
 *
 * @example
 * ```typescript
 * const bullet = acquireEntity(world, 'bullet');
 * if (bullet !== null) {
 *   Position.x[bullet] = playerX;
 *   Velocity.x[bullet] = bulletSpeed;
 * }
 * ```
 */
export function acquireEntity(world: World, archetypeName: string): Entity | null {
	const pool = pools.get(archetypeName);
	if (!pool) return null;

	pool.totalAllocations++;

	// Try to reuse from pool
	const recycled = pool.freeEntities.pop();
	if (recycled !== undefined) {
		pool.totalRecycles++;
		// Reset component data
		if (pool.definition.resetFns) {
			for (const resetFn of pool.definition.resetFns) {
				resetFn(world, recycled);
			}
		}
		pool.activeEntities.add(recycled);
		return recycled;
	}

	// Create new entity
	const eid = addEntity(world);
	for (const comp of pool.definition.components) {
		addComponent(world, eid, comp);
	}
	pool.activeEntities.add(eid);
	return eid;
}

/**
 * Releases an entity back to the archetype pool for reuse.
 *
 * @param world - The ECS world
 * @param archetypeName - Name of the registered archetype
 * @param eid - Entity to release
 * @returns True if the entity was returned to the pool
 *
 * @example
 * ```typescript
 * // When bullet goes off-screen
 * releaseEntity(world, 'bullet', bulletEid);
 * ```
 */
export function releaseEntity(world: World, archetypeName: string, eid: Entity): boolean {
	const pool = pools.get(archetypeName);
	if (!pool) return false;

	if (!pool.activeEntities.has(eid)) return false;

	pool.activeEntities.delete(eid);

	// Check pool size limit
	if (pool.config.maxSize > 0 && pool.freeEntities.length >= pool.config.maxSize) {
		// Pool is full, actually remove the entity's components
		for (const comp of pool.definition.components) {
			if (hasComponent(world, eid, comp)) {
				removeComponent(world, eid, comp);
			}
		}
		return false;
	}

	// Reset and return to pool
	if (pool.definition.resetFns) {
		for (const resetFn of pool.definition.resetFns) {
			resetFn(world, eid);
		}
	}

	pool.freeEntities.push(eid);
	pool.maxPoolSize = Math.max(pool.maxPoolSize, pool.freeEntities.length);
	return true;
}

/**
 * Gets statistics for a specific archetype pool.
 *
 * @param archetypeName - Name of the archetype
 * @returns Pool statistics, or null if archetype not registered
 *
 * @example
 * ```typescript
 * const stats = getArchetypePoolStats('bullet');
 * console.log(`Hit rate: ${(stats.hitRate * 100).toFixed(1)}%`);
 * ```
 */
export function getArchetypePoolStats(archetypeName: string): ArchetypePoolStats | null {
	const pool = pools.get(archetypeName);
	if (!pool) return null;

	return {
		name: archetypeName,
		pooled: pool.freeEntities.length,
		active: pool.activeEntities.size,
		totalAllocations: pool.totalAllocations,
		totalRecycles: pool.totalRecycles,
		hitRate: pool.totalAllocations > 0 ? pool.totalRecycles / pool.totalAllocations : 0,
		maxPoolSize: pool.maxPoolSize,
	};
}

/**
 * Gets statistics for all registered archetype pools.
 *
 * @returns Overall recycling system statistics
 *
 * @example
 * ```typescript
 * const stats = getRecyclingStats();
 * console.log(`Total active: ${stats.totalActive}`);
 * console.log(`Overall hit rate: ${(stats.overallHitRate * 100).toFixed(1)}%`);
 * ```
 */
export function getRecyclingStats(): RecyclingSystemStats {
	const archetypes: ArchetypePoolStats[] = [];
	let totalActive = 0;
	let totalPooled = 0;
	let totalAllocations = 0;
	let totalRecycles = 0;

	for (const [name] of pools) {
		const stats = getArchetypePoolStats(name);
		if (stats) {
			archetypes.push(stats);
			totalActive += stats.active;
			totalPooled += stats.pooled;
			totalAllocations += stats.totalAllocations;
			totalRecycles += stats.totalRecycles;
		}
	}

	return {
		archetypes,
		totalActive,
		totalPooled,
		overallHitRate: totalAllocations > 0 ? totalRecycles / totalAllocations : 0,
	};
}

/**
 * Clears all entities from a specific archetype pool.
 *
 * @param archetypeName - Name of the archetype
 */
export function clearArchetypePool(archetypeName: string): void {
	const pool = pools.get(archetypeName);
	if (!pool) return;

	pool.freeEntities.length = 0;
	pool.activeEntities.clear();
}

/**
 * Unregisters an archetype and clears its pool.
 *
 * @param archetypeName - Name of the archetype to unregister
 */
export function unregisterArchetype(archetypeName: string): void {
	const pool = pools.get(archetypeName);
	if (!pool) return;

	pool.freeEntities.length = 0;
	pool.activeEntities.clear();
	pools.delete(archetypeName);
}

/**
 * Clears all archetype pools. Used for testing.
 * @internal
 */
export function clearAllArchetypePools(): void {
	for (const pool of pools.values()) {
		pool.freeEntities.length = 0;
		pool.activeEntities.clear();
	}
	pools.clear();
}
