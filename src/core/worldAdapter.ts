/**
 * World adapter API for custom storage and query strategies.
 *
 * Provides a hook for swapping out query behavior without exposing
 * internal ECS implementation details. This enables custom world
 * backends, packed stores, or precomputed render lists while keeping
 * systems pure and library-first.
 *
 * @module core/worldAdapter
 */

import { z } from 'zod';
import { Position } from '../components/position';
import { Renderable } from '../components/renderable';
import type { QueryTerm } from './ecs';
import { query } from './ecs';
import type { Entity, World } from './types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Supported adapter types.
 *
 * @example
 * ```typescript
 * import type { WorldAdapterType } from 'blecsd';
 *
 * const type: WorldAdapterType = 'custom';
 * ```
 */
export type WorldAdapterType = 'bitecs' | 'custom';

/**
 * World adapter interface.
 *
 * The base interface provides `queryRenderables` for backwards compatibility.
 * Adapters may optionally support named queries via `queryByName`.
 *
 * @example
 * ```typescript
 * import type { WorldAdapter } from 'blecsd';
 *
 * const adapter: WorldAdapter = {
 *   type: 'custom',
 *   queryRenderables: () => [],
 * };
 * ```
 */
export interface WorldAdapter {
	/** Adapter implementation type */
	readonly type: WorldAdapterType;
	/**
	 * Returns entities that should be rendered this frame.
	 *
	 * @param world - The ECS world
	 * @returns Array of renderable entities
	 */
	readonly queryRenderables: (world: World) => readonly Entity[];
	/**
	 * Returns entities matching a named query, or undefined if
	 * the query name is not registered.
	 *
	 * Only available on adapters that support named queries
	 * (e.g. PackedQueryAdapter).
	 *
	 * @param name - The query name
	 * @param world - The ECS world
	 * @returns Array of entities, or undefined if query not registered
	 */
	readonly queryByName?: (name: string, world: World) => readonly Entity[] | undefined;
}

/**
 * Registration entry for a named PackedStore-backed query.
 *
 * @example
 * ```typescript
 * import type { PackedQueryRegistration } from 'blecsd';
 * import { Position, Renderable } from 'blecsd';
 *
 * const reg: PackedQueryRegistration = {
 *   name: 'renderables',
 *   components: [Position, Renderable],
 * };
 * ```
 */
export interface PackedQueryRegistration {
	/** Unique name for the query */
	readonly name: string;
	/** Component set that defines the query */
	readonly components: readonly QueryTerm[];
}

/**
 * Configuration for creating a PackedQueryAdapter.
 *
 * @example
 * ```typescript
 * import type { PackedQueryAdapterConfig } from 'blecsd';
 * import { Focusable, Interactive, Position, Renderable } from 'blecsd';
 *
 * const config: PackedQueryAdapterConfig = {
 *   queries: [
 *     { name: 'renderables', components: [Position, Renderable] },
 *     { name: 'focusable', components: [Focusable] },
 *     { name: 'interactive', components: [Interactive] },
 *   ],
 *   initialCapacity: 128,
 * };
 * ```
 */
export interface PackedQueryAdapterConfig {
	/** Named queries to register */
	readonly queries: readonly PackedQueryRegistration[];
	/** Initial capacity for each PackedStore (default: 64) */
	readonly initialCapacity?: number;
	/** Synchronization strategy for scheduler integration (default: 'all') */
	readonly syncMode?: 'all' | 'render_only';
}

/**
 * Default named query registrations used for packed-adapter acceleration.
 *
 * Keep this list intentionally minimal to avoid sync overhead for unused
 * queries. Additional queries can be registered explicitly per application.
 */
export const DEFAULT_PACKED_QUERY_REGISTRATIONS: readonly PackedQueryRegistration[] = [
	{ name: 'renderables', components: [Position, Renderable] },
];

/**
 * Extended adapter backed by PackedStores for cache-friendly iteration.
 *
 * Maintains a PackedStore<number> per registered query, updated via sync().
 * Use getQueryData/getQuerySize for zero-allocation hot-path iteration.
 *
 * @example
 * ```typescript
 * import { createPackedQueryAdapter, Position, Renderable, Focusable } from 'blecsd';
 *
 * const adapter = createPackedQueryAdapter({
 *   queries: [
 *     { name: 'renderables', components: [Position, Renderable] },
 *     { name: 'focusable', components: [Focusable] },
 *   ],
 * });
 *
 * // Each frame: sync, then query
 * adapter.sync(world);
 * const data = adapter.getQueryData('focusable');
 * for (let i = 0; i < adapter.getQuerySize('focusable'); i++) {
 *   const eid = data[i];
 *   // Process entity...
 * }
 * ```
 */
export interface PackedQueryAdapter extends WorldAdapter {
	/** Looks up entities by registered query name. Returns undefined for unknown names. */
	readonly queryByName: (name: string, world: World) => readonly Entity[] | undefined;
	/**
	 * Synchronizes all PackedStores with current bitecs query results.
	 * Call once per frame before querying.
	 *
	 * @param world - The ECS world
	 */
	readonly sync: (world: World) => void;
	/**
	 * Returns the dense data array for a named query (zero-allocation hot path).
	 * Only elements at indices 0 through getQuerySize(name) - 1 are live.
	 * Returns a frozen empty array for unknown query names.
	 *
	 * @param name - The query name
	 * @returns Dense array of entity IDs
	 */
	readonly getQueryData: (name: string) => readonly number[];
	/**
	 * Returns the number of entities in a named query's PackedStore.
	 * Returns 0 for unknown query names.
	 *
	 * @param name - The query name
	 * @returns Entity count
	 */
	readonly getQuerySize: (name: string) => number;
	/**
	 * Returns all registered query names.
	 *
	 * @returns Frozen array of query names
	 */
	readonly getRegisteredQueries: () => readonly string[];
	/** Scheduler sync mode hint. */
	readonly syncMode: 'all' | 'render_only';
}

// =============================================================================
// ZOD SCHEMAS
// =============================================================================

/**
 * Zod schema for PackedQueryRegistration.
 *
 * Validates the structural shape of a query registration.
 * Component references (QueryTerm) are opaque to Zod and validated
 * as unknown[].
 *
 * @example
 * ```typescript
 * import { PackedQueryRegistrationSchema } from 'blecsd';
 *
 * const result = PackedQueryRegistrationSchema.safeParse({
 *   name: 'renderables',
 *   components: [Position, Renderable],
 * });
 * ```
 */
export const PackedQueryRegistrationSchema = z.object({
	name: z.string().min(1),
	components: z.array(z.unknown()).min(1),
});

/**
 * Zod schema for PackedQueryAdapterConfig.
 *
 * @example
 * ```typescript
 * import { PackedQueryAdapterConfigSchema } from 'blecsd';
 *
 * const result = PackedQueryAdapterConfigSchema.safeParse({
 *   queries: [{ name: 'renderables', components: [Position, Renderable] }],
 *   initialCapacity: 128,
 * });
 * ```
 */
export const PackedQueryAdapterConfigSchema = z.object({
	queries: z.array(PackedQueryRegistrationSchema),
	initialCapacity: z.number().int().positive().optional(),
	syncMode: z.enum(['all', 'render_only']).optional(),
});

// =============================================================================
// INTERNAL TYPES
// =============================================================================

/** Internal state for a single named query with lazy frame-cached results. */
interface QueryCacheState {
	readonly name: string;
	readonly components: readonly QueryTerm[];
	/** Cached query result from the last frame this query was accessed. */
	cachedResult: readonly number[] | null;
	/** Cached size of the last query result. */
	cachedSize: number;
	/** Frame ID when the cache was last populated. */
	cacheFrameId: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Shared frozen empty arrays for no-alloc returns. */
const EMPTY_ENTITY_ARRAY: readonly Entity[] = Object.freeze([]) as readonly Entity[];
const EMPTY_NUMBER_ARRAY: readonly number[] = Object.freeze([]) as readonly number[];

// =============================================================================
// DEFAULT ADAPTER
// =============================================================================

/**
 * Default query implementation backed by bitecs.
 */
function defaultQueryRenderables(world: World): readonly Entity[] {
	return query(world, [Position, Renderable]) as Entity[];
}

/**
 * Default adapter used when no custom adapter is registered.
 *
 * @example
 * ```typescript
 * import { DEFAULT_WORLD_ADAPTER } from 'blecsd';
 *
 * const entities = DEFAULT_WORLD_ADAPTER.queryRenderables(world);
 * ```
 */
export const DEFAULT_WORLD_ADAPTER: WorldAdapter = {
	type: 'bitecs',
	queryRenderables: defaultQueryRenderables,
};

// =============================================================================
// REGISTRY
// =============================================================================

/**
 * Internal registry of world adapters.
 */
const worldAdapterRegistry = new WeakMap<World, WorldAdapter>();

/**
 * Creates a world adapter by overriding the default behavior.
 *
 * @param overrides - Partial adapter overrides
 * @returns A complete WorldAdapter
 *
 * @example
 * ```typescript
 * import { createWorldAdapter, setWorldAdapter } from 'blecsd';
 *
 * const renderables: number[] = [];
 * const adapter = createWorldAdapter({
 *   type: 'custom',
 *   queryRenderables: () => renderables,
 * });
 *
 * setWorldAdapter(world, adapter);
 * ```
 */
export function createWorldAdapter(overrides: Partial<WorldAdapter> = {}): WorldAdapter {
	return {
		...DEFAULT_WORLD_ADAPTER,
		...overrides,
		type: overrides.type ?? DEFAULT_WORLD_ADAPTER.type,
		queryRenderables: overrides.queryRenderables ?? DEFAULT_WORLD_ADAPTER.queryRenderables,
	};
}

/**
 * Registers a world adapter for a specific world.
 *
 * @param world - The ECS world
 * @param adapter - Adapter to associate with the world
 *
 * @example
 * ```typescript
 * import { createWorld, createWorldAdapter, setWorldAdapter } from 'blecsd';
 *
 * const world = createWorld();
 * const adapter = createWorldAdapter();
 * setWorldAdapter(world, adapter);
 * ```
 */
export function setWorldAdapter(world: World, adapter: WorldAdapter): void {
	worldAdapterRegistry.set(world, adapter);
}

/**
 * Gets the adapter for a world, falling back to the default adapter.
 *
 * @param world - The ECS world
 * @returns Adapter for the world
 *
 * @example
 * ```typescript
 * import { getWorldAdapter } from 'blecsd';
 *
 * const adapter = getWorldAdapter(world);
 * const entities = adapter.queryRenderables(world);
 * ```
 */
export function getWorldAdapter(world: World): WorldAdapter {
	return worldAdapterRegistry.get(world) ?? DEFAULT_WORLD_ADAPTER;
}

/**
 * Synchronizes the registered world adapter if it is PackedStore-backed.
 *
 * Safe to call unconditionally each frame/system tick. For non-packed
 * adapters this is a no-op.
 *
 * @param world - The ECS world
 *
 * @example
 * ```typescript
 * import { syncWorldAdapter } from 'blecsd';
 *
 * // Call before systems that read adapter-backed query data
 * syncWorldAdapter(world);
 * ```
 */
export function syncWorldAdapter(world: World): void {
	const adapter = getWorldAdapter(world);
	if (isPackedQueryAdapter(adapter)) {
		adapter.sync(world);
	}
}

/**
 * Clears any custom adapter for a world.
 *
 * @param world - The ECS world
 *
 * @example
 * ```typescript
 * import { clearWorldAdapter } from 'blecsd';
 *
 * clearWorldAdapter(world);
 * ```
 */
export function clearWorldAdapter(world: World): void {
	worldAdapterRegistry.delete(world);
}

// =============================================================================
// PACKED QUERY ADAPTER
// =============================================================================

/**
 * Creates a lazy cache state for a single named query.
 */
function createQueryCacheState(name: string, components: readonly QueryTerm[]): QueryCacheState {
	return {
		name,
		components,
		cachedResult: null,
		cachedSize: 0,
		cacheFrameId: -1,
	};
}

/**
 * Ensures a query cache is populated for the current frame.
 * Lazily runs the bitecs query on first access per frame,
 * returning the cached result for subsequent accesses.
 */
function ensureQueryCached(state: QueryCacheState, world: World, frameId: number): void {
	if (state.cacheFrameId === frameId) {
		return;
	}
	const result = query(world, state.components as QueryTerm[]);
	state.cachedResult = result as readonly number[];
	state.cachedSize = result.length;
	state.cacheFrameId = frameId;
}

/**
 * Creates a PackedQueryAdapter backed by PackedStores for cache-friendly iteration.
 *
 * Each registered query gets its own PackedStore<number> holding entity IDs.
 * Call sync(world) once per frame to reconcile stores with bitecs query results,
 * then use queryByName, getQueryData, or getQuerySize to read results.
 *
 * If no 'renderables' query is registered, one is auto-registered with
 * [Position, Renderable] to maintain backwards compatibility with queryRenderables.
 *
 * @param config - Adapter configuration with named queries
 * @returns A PackedQueryAdapter
 *
 * @example
 * ```typescript
 * import {
 *   createPackedQueryAdapter,
 *   setWorldAdapter,
 *   Position,
 *   Renderable,
 *   Focusable,
 * } from 'blecsd';
 *
 * const adapter = createPackedQueryAdapter({
 *   queries: [
 *     { name: 'renderables', components: [Position, Renderable] },
 *     { name: 'focusable', components: [Focusable] },
 *   ],
 *   initialCapacity: 256,
 * });
 *
 * setWorldAdapter(world, adapter);
 *
 * // Each frame:
 * adapter.sync(world);
 * const data = adapter.getQueryData('focusable');
 * for (let i = 0; i < adapter.getQuerySize('focusable'); i++) {
 *   const eid = data[i];
 *   // Process entity in dense cache-friendly order
 * }
 * ```
 */
export function createPackedQueryAdapter(config: PackedQueryAdapterConfig): PackedQueryAdapter {
	// Validate config structure at the boundary
	PackedQueryAdapterConfigSchema.parse(config);
	const syncMode = config.syncMode ?? 'all';

	// Build internal query caches from typed config
	const queryStores = new Map<string, QueryCacheState>();
	for (const reg of config.queries) {
		queryStores.set(reg.name, createQueryCacheState(reg.name, reg.components));
	}

	// Auto-register 'renderables' if not provided
	if (!queryStores.has('renderables')) {
		queryStores.set('renderables', createQueryCacheState('renderables', [Position, Renderable]));
	}

	const registeredNames = Object.freeze([...queryStores.keys()]);

	// Lazy query cache: sync() stores the world ref and bumps a frame counter.
	// Actual queries run lazily on first getQueryData/getQuerySize/queryByName access.
	let syncedWorld: World | null = null;
	let frameId = 0;

	return {
		type: 'custom',
		syncMode,

		queryRenderables(world: World): readonly Entity[] {
			const state = queryStores.get('renderables');
			if (!state) {
				return EMPTY_ENTITY_ARRAY;
			}
			ensureQueryCached(state, world, frameId);
			return (state.cachedResult ?? EMPTY_ENTITY_ARRAY) as readonly Entity[];
		},

		queryByName(name: string, world: World): readonly Entity[] | undefined {
			const state = queryStores.get(name);
			if (!state) {
				return undefined;
			}
			ensureQueryCached(state, world, frameId);
			return (state.cachedResult ?? EMPTY_ENTITY_ARRAY) as readonly Entity[];
		},

		sync(world: World): void {
			syncedWorld = world;
			frameId++;
		},

		getQueryData(name: string): readonly number[] {
			const state = queryStores.get(name);
			if (!state || !syncedWorld) {
				return EMPTY_NUMBER_ARRAY;
			}
			ensureQueryCached(state, syncedWorld, frameId);
			return state.cachedResult ?? EMPTY_NUMBER_ARRAY;
		},

		getQuerySize(name: string): number {
			const state = queryStores.get(name);
			if (!state || !syncedWorld) {
				return 0;
			}
			ensureQueryCached(state, syncedWorld, frameId);
			return state.cachedSize;
		},

		getRegisteredQueries(): readonly string[] {
			return registeredNames;
		},
	};
}

/**
 * Creates the default PackedQueryAdapter used for TUI acceleration.
 *
 * @param _initialCapacity - Deprecated, kept for API compatibility. No longer used.
 * @returns Packed query adapter with common TUI query registrations
 */
export function createDefaultPackedQueryAdapter(_initialCapacity = 256): PackedQueryAdapter {
	return createPackedQueryAdapter({
		queries: DEFAULT_PACKED_QUERY_REGISTRATIONS,
		syncMode: 'render_only',
	});
}

/**
 * Type guard to check if an adapter is a PackedQueryAdapter.
 *
 * @param adapter - The adapter to check
 * @returns True if the adapter is a PackedQueryAdapter
 *
 * @example
 * ```typescript
 * import { getWorldAdapter, isPackedQueryAdapter } from 'blecsd';
 *
 * const adapter = getWorldAdapter(world);
 * if (isPackedQueryAdapter(adapter)) {
 *   adapter.sync(world);
 *   const data = adapter.getQueryData('renderables');
 * }
 * ```
 */
export function isPackedQueryAdapter(adapter: WorldAdapter): adapter is PackedQueryAdapter {
	return (
		'sync' in adapter &&
		'getQueryData' in adapter &&
		'getQuerySize' in adapter &&
		'getRegisteredQueries' in adapter
	);
}
