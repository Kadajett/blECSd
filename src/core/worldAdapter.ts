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

import { query } from 'bitecs';
import { Position } from '../components/position';
import { Renderable } from '../components/renderable';
import type { Entity, World } from './types';

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
}

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
