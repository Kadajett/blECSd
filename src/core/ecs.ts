/**
 * ECS primitives wrapper - the ONLY file that should import from 'bitecs'
 *
 * This module wraps all bitECS primitives to provide a stable API for blECSd.
 * All other files in the codebase should import from this module (via './ecs'
 * or '../core/ecs') rather than importing directly from 'bitecs'.
 *
 * @module core/ecs
 */

import type { ComponentRef, QueryResult, QueryTerm } from 'bitecs';
import {
	addComponent as bitEcsAddComponent,
	addEntity as bitEcsAddEntity,
	entityExists as bitEcsEntityExists,
	getAllEntities as bitEcsGetAllEntities,
	hasComponent as bitEcsHasComponent,
	query as bitEcsQuery,
	registerComponent as bitEcsRegisterComponent,
	removeComponent as bitEcsRemoveComponent,
	removeEntity as bitEcsRemoveEntity,
	withStore as bitEcsWithStore,
} from 'bitecs';

import type { Entity, World } from './types';

// =============================================================================
// ENTITY OPERATIONS
// =============================================================================

/**
 * Creates a new entity in the world.
 *
 * @param world - The ECS world to add the entity to
 * @returns The newly created entity ID
 *
 * @example
 * ```typescript
 * import { createWorld, addEntity } from 'blecsd';
 *
 * const world = createWorld();
 * const player = addEntity(world);
 * const enemy = addEntity(world);
 * ```
 */
export function addEntity(world: World): Entity {
	return bitEcsAddEntity(world);
}

/**
 * Removes an entity and all its components from the world.
 *
 * @param world - The ECS world containing the entity
 * @param eid - The entity ID to remove
 *
 * @example
 * ```typescript
 * import { createWorld, addEntity, removeEntity } from 'blecsd';
 *
 * const world = createWorld();
 * const entity = addEntity(world);
 * // ... use entity ...
 * removeEntity(world, entity); // Clean up when done
 * ```
 */
export function removeEntity(world: World, eid: Entity): void {
	bitEcsRemoveEntity(world, eid);
}

/**
 * Checks if an entity exists in the world.
 *
 * @param world - The ECS world to check
 * @param eid - The entity ID to check
 * @returns True if the entity exists, false otherwise
 *
 * @example
 * ```typescript
 * import { createWorld, addEntity, removeEntity, entityExists } from 'blecsd';
 *
 * const world = createWorld();
 * const entity = addEntity(world);
 *
 * console.log(entityExists(world, entity)); // true
 * removeEntity(world, entity);
 * console.log(entityExists(world, entity)); // false
 * ```
 */
export function entityExists(world: World, eid: Entity): boolean {
	return bitEcsEntityExists(world, eid);
}

/**
 * Gets all entity IDs currently in the world.
 *
 * @param world - The ECS world to query
 * @returns Array of all entity IDs in the world
 *
 * @example
 * ```typescript
 * import { createWorld, addEntity, getAllEntities } from 'blecsd';
 *
 * const world = createWorld();
 * addEntity(world);
 * addEntity(world);
 * addEntity(world);
 *
 * const entities = getAllEntities(world);
 * console.log(entities.length); // 3
 * ```
 */
export function getAllEntities(world: World): readonly Entity[] {
	return bitEcsGetAllEntities(world) as readonly Entity[];
}

// =============================================================================
// COMPONENT OPERATIONS
// =============================================================================

/**
 * Adds a component to an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity to add the component to
 * @param component - The component to add
 *
 * @example
 * ```typescript
 * import { createWorld, addEntity, addComponent, Position } from 'blecsd';
 *
 * const world = createWorld();
 * const entity = addEntity(world);
 * addComponent(world, entity, Position);
 * Position.x[entity] = 100;
 * Position.y[entity] = 50;
 * ```
 */
export function addComponent(world: World, eid: Entity, component: ComponentRef): void {
	bitEcsAddComponent(world, eid, component);
}

/**
 * Checks if an entity has a specific component.
 *
 * @param world - The ECS world
 * @param eid - The entity to check
 * @param component - The component to check for
 * @returns True if the entity has the component, false otherwise
 *
 * @example
 * ```typescript
 * import { createWorld, addEntity, addComponent, hasComponent, Position } from 'blecsd';
 *
 * const world = createWorld();
 * const entity = addEntity(world);
 *
 * console.log(hasComponent(world, entity, Position)); // false
 * addComponent(world, entity, Position);
 * console.log(hasComponent(world, entity, Position)); // true
 * ```
 */
export function hasComponent(world: World, eid: Entity, component: ComponentRef): boolean {
	return bitEcsHasComponent(world, eid, component);
}

/**
 * Removes a component from an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity to remove the component from
 * @param component - The component to remove
 *
 * @example
 * ```typescript
 * import { createWorld, addEntity, addComponent, removeComponent, hasComponent, Position } from 'blecsd';
 *
 * const world = createWorld();
 * const entity = addEntity(world);
 * addComponent(world, entity, Position);
 *
 * console.log(hasComponent(world, entity, Position)); // true
 * removeComponent(world, entity, Position);
 * console.log(hasComponent(world, entity, Position)); // false
 * ```
 */
export function removeComponent(world: World, eid: Entity, component: ComponentRef): void {
	bitEcsRemoveComponent(world, eid, component);
}

// =============================================================================
// QUERY OPERATIONS
// =============================================================================

/**
 * Queries the world for entities that have all specified components.
 *
 * @param world - The ECS world to query
 * @param components - Array of components that entities must have
 * @returns Array of entity IDs that match the query
 *
 * @example
 * ```typescript
 * import { createWorld, addEntity, addComponent, query, Position, Velocity } from 'blecsd';
 *
 * const world = createWorld();
 *
 * // Create entities with different component combinations
 * const staticEntity = addEntity(world);
 * addComponent(world, staticEntity, Position);
 *
 * const movingEntity = addEntity(world);
 * addComponent(world, movingEntity, Position);
 * addComponent(world, movingEntity, Velocity);
 *
 * // Query for entities with both Position and Velocity
 * const movingEntities = query(world, [Position, Velocity]);
 * console.log(movingEntities.length); // 1 (only movingEntity)
 * ```
 */
export function query(world: World, components: QueryTerm[]): QueryResult {
	return bitEcsQuery(world, components);
}

// =============================================================================
// ADVANCED COMPONENT REGISTRATION
// =============================================================================

/**
 * Registers a component with the world. This is typically called automatically
 * when components are first used, but can be useful for advanced scenarios.
 *
 * @param world - The ECS world
 * @param component - The component to register
 *
 * @example
 * ```typescript
 * import { createWorld, registerComponent, Position } from 'blecsd';
 *
 * const world = createWorld();
 * registerComponent(world, Position);
 * ```
 */
export const registerComponent = bitEcsRegisterComponent;

/**
 * Creates a component with a custom backing store. Useful for components that
 * need special memory layouts or interop with external systems.
 *
 * @param store - Custom store object with typed arrays
 * @returns A component that uses the provided store
 *
 * @example
 * ```typescript
 * import { withStore } from 'blecsd';
 *
 * // Create a component backed by custom Float32Arrays
 * const CustomPosition = withStore({
 *   x: new Float32Array(10000),
 *   y: new Float32Array(10000),
 * });
 * ```
 */
export const withStore = bitEcsWithStore;

// =============================================================================
// RE-EXPORTS FROM OTHER MODULES
// =============================================================================

// Re-export core types
export type { Entity, World } from './types';
// Re-export world functions for convenience (so users can import everything from ecs)
export { createWorld, resetWorld } from './world';

// =============================================================================
// TYPE EXPORTS
// =============================================================================

// Re-export useful types from bitecs for advanced users
export type { ComponentRef, QueryResult, QueryTerm } from 'bitecs';
