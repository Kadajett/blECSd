/**
 * ECS state inspection utilities for debugging.
 *
 * @module debug/ecsInspector
 */

import type { ComponentRef } from '../core/ecs';
import { getAllEntities, hasComponent, query } from '../core/ecs';
import type { Entity, World } from '../core/types';
import {
	inspectEntity as _inspectEntity,
	inspectWorld as _inspectWorld,
	formatEntityInspection,
	formatWorldInspection,
} from './index';

// =============================================================================
// ENTITY INSPECTION
// =============================================================================

/**
 * Returns all components attached to an entity with their current values.
 *
 * This is a convenience wrapper around the core `inspectEntity` function.
 *
 * @param world - The ECS world
 * @param eid - The entity to inspect
 * @returns Entity inspection data with all component values
 *
 * @example
 * ```typescript
 * import { inspectEntity } from 'blecsd';
 *
 * const entity = addEntity(world);
 * setPosition(world, entity, 10, 20);
 * setDimensions(world, entity, 40, 10);
 *
 * const info = inspectEntity(world, entity);
 * console.log(`Entity ${info.entity}`);
 * for (const comp of info.components) {
 *   console.log(`  ${comp.name}:`, comp.data);
 * }
 * // Entity 1
 * //   Position: { x: 10, y: 20, z: 0, absolute: 0 }
 * //   Dimensions: { width: 40, height: 10, minWidth: 0, minHeight: 0 }
 * ```
 */
export function inspectEntity(world: World, eid: Entity): ReturnType<typeof _inspectEntity> {
	return _inspectEntity(world, eid);
}

// =============================================================================
// WORLD INSPECTION
// =============================================================================

/**
 * Returns summary statistics about the ECS world.
 *
 * Includes total entity count, component usage counts, and hierarchy information.
 *
 * @param world - The ECS world to inspect
 * @returns World statistics including entity count and component counts
 *
 * @example
 * ```typescript
 * import { inspectWorld } from 'blecsd';
 *
 * const info = inspectWorld(world);
 * console.log(`Total entities: ${info.entityCount}`);
 * console.log(`Position components: ${info.componentCounts['Position']}`);
 * console.log(`Hierarchy roots: ${info.hierarchyRoots.length}`);
 * // Total entities: 42
 * // Position components: 38
 * // Hierarchy roots: 5
 * ```
 */
export function inspectWorld(world: World): ReturnType<typeof _inspectWorld> {
	return _inspectWorld(world);
}

// =============================================================================
// FORMATTED OUTPUT
// =============================================================================

/**
 * Returns a formatted string representation of an entity for console logging.
 *
 * Formats entity data with component values in a tree structure for easy reading.
 *
 * @param world - The ECS world
 * @param eid - The entity to dump
 * @returns Formatted string suitable for console.log
 *
 * @example
 * ```typescript
 * import { dumpEntity } from 'blecsd';
 *
 * const entity = addEntity(world);
 * setPosition(world, entity, 10, 20);
 * setDimensions(world, entity, 40, 10);
 *
 * console.log(dumpEntity(world, entity));
 * // Entity 1
 * // ├─ Position: x=10, y=20, z=0, absolute=0
 * // └─ Dimensions: width=40, height=10, minWidth=0, minHeight=0
 * ```
 */
export function dumpEntity(world: World, eid: Entity): string {
	const inspection = _inspectEntity(world, eid);
	return formatEntityInspection(inspection);
}

/**
 * Returns a formatted string representation of world statistics.
 *
 * @param world - The ECS world
 * @returns Formatted string suitable for console.log
 *
 * @example
 * ```typescript
 * import { dumpWorld } from 'blecsd';
 *
 * console.log(dumpWorld(world));
 * // World Statistics
 * // ────────────────
 * // Entities: 42
 * // ComponentRefs:
 * //   Position: 38 (90%)
 * //   Dimensions: 35 (83%)
 * ```
 */
export function dumpWorld(world: World): string {
	const inspection = _inspectWorld(world);
	return formatWorldInspection(inspection);
}

// =============================================================================
// ENTITY QUERIES
// =============================================================================

/**
 * Returns an array of all active entity IDs in the world.
 *
 * @param world - The ECS world
 * @returns Array of entity IDs
 *
 * @example
 * ```typescript
 * import { listEntities } from 'blecsd';
 *
 * const entities = listEntities(world);
 * console.log(`Total entities: ${entities.length}`);
 * for (const eid of entities) {
 *   console.log(`Entity ${eid}`);
 * }
 * ```
 */
export function listEntities(world: World): readonly Entity[] {
	return getAllEntities(world) as Entity[];
}

/**
 * Finds all entities that have a specific component attached.
 *
 * @param world - The ECS world
 * @param component - The component to search for
 * @returns Array of entity IDs that have the component
 *
 * @example
 * ```typescript
 * import { findEntitiesWithComponent, Position } from 'blecsd';
 *
 * const positioned = findEntitiesWithComponent(world, Position);
 * console.log(`Found ${positioned.length} entities with Position`);
 * for (const eid of positioned) {
 *   console.log(`Entity ${eid} at (${Position.x[eid]}, ${Position.y[eid]})`);
 * }
 * ```
 */
export function findEntitiesWithComponent(
	world: World,
	component: ComponentRef,
): readonly Entity[] {
	// Use query to get all entities with this component
	return query(world, [component]) as Entity[];
}

/**
 * Finds all entities that have all of the specified components attached.
 *
 * @param world - The ECS world
 * @param components - Array of components to search for
 * @returns Array of entity IDs that have all components
 *
 * @example
 * ```typescript
 * import { findEntitiesWithComponents, Position, Dimensions } from 'blecsd';
 *
 * const boxes = findEntitiesWithComponents(world, [Position, Dimensions]);
 * console.log(`Found ${boxes.length} boxes`);
 * ```
 */
export function findEntitiesWithComponents(
	world: World,
	components: readonly ComponentRef[],
): readonly Entity[] {
	if (components.length === 0) {
		return [];
	}

	// Use query to get entities with all components
	return query(world, components as ComponentRef[]) as Entity[];
}

/**
 * Checks if an entity is in the active entities list.
 *
 * Note: This uses `getAllEntities` which may be slower than `entityExists` from core/ecs.
 * Use this when you specifically need to verify the entity is in the active list.
 *
 * @param world - The ECS world
 * @param eid - The entity to check
 * @returns True if the entity is in the active entities list
 *
 * @example
 * ```typescript
 * import { isEntityActive, addEntity, removeEntity } from 'blecsd';
 *
 * const entity = addEntity(world);
 * console.log(isEntityActive(world, entity)); // true
 *
 * removeEntity(world, entity);
 * console.log(isEntityActive(world, entity)); // false
 * ```
 */
export function isEntityActive(world: World, eid: Entity): boolean {
	const entities = getAllEntities(world) as Entity[];
	return entities.includes(eid);
}

/**
 * Lists all components attached to an entity by name.
 *
 * @param world - The ECS world
 * @param eid - The entity to inspect
 * @returns Array of component names
 *
 * @example
 * ```typescript
 * import { listEntityComponents } from 'blecsd';
 *
 * const entity = addEntity(world);
 * setPosition(world, entity, 10, 20);
 * setDimensions(world, entity, 40, 10);
 *
 * const components = listEntityComponents(world, entity);
 * console.log(components); // ['Position', 'Dimensions']
 * ```
 */
export function listEntityComponents(world: World, eid: Entity): readonly string[] {
	const inspection = _inspectEntity(world, eid);
	return inspection.components.map((c) => c.name);
}

/**
 * Gets the value of a specific component field for an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity
 * @param component - The component
 * @param field - The field name
 * @returns The field value, or undefined if not found
 *
 * @example
 * ```typescript
 * import { getComponentField, Position } from 'blecsd';
 *
 * const entity = addEntity(world);
 * setPosition(world, entity, 10, 20);
 *
 * const x = getComponentField(world, entity, Position, 'x');
 * console.log(`X position: ${x}`); // X position: 10
 * ```
 */
export function getComponentField(
	world: World,
	eid: Entity,
	component: ComponentRef,
	field: string,
): unknown {
	if (!hasComponent(world, eid, component)) {
		return undefined;
	}

	const comp = component as Record<string, unknown>;
	const value = comp[field];

	if (ArrayBuffer.isView(value) || Array.isArray(value)) {
		const arr = value as { [index: number]: unknown };
		return arr[eid];
	}

	return undefined;
}
