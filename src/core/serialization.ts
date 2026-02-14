/**
 * ECS world state serialization with delta compression
 * @module core/serialization
 */

import { z } from 'zod';
import {
	addComponent,
	addEntity,
	createWorld,
	entityExists,
	getAllEntities,
	hasComponent,
	removeEntity,
} from './ecs';
import type { Entity, World } from './types';
import {
	addEntitiesWithIds,
	applyComponentToEntity,
	collectAddedEntitiesData,
	collectAllEntityIds,
	collectChangedComponentData,
	createEntityMapping,
	createExistingEntityMap,
	extractEntitySet,
	findEntityChanges,
	restoreComponentData,
	serializeComponentRegistration,
} from './serialization-helpers';

// =============================================================================
// SCHEMAS
// =============================================================================

/**
 * Zod schema for component field data
 */
const ComponentFieldDataSchema = z.record(z.string(), z.array(z.number()));

/**
 * Zod schema for component data
 */
const ComponentDataSchema = z.object({
	name: z.string(),
	entities: z.array(z.number()),
	values: ComponentFieldDataSchema,
});

/**
 * Zod schema for world snapshot
 */
const WorldSnapshotSchema = z.object({
	version: z.number().int().positive(),
	timestamp: z.number().int().nonnegative(),
	entityCount: z.number().int().nonnegative(),
	components: z.array(ComponentDataSchema),
});

/**
 * Zod schema for world delta
 */
const WorldDeltaSchema = z.object({
	baseTimestamp: z.number().int().nonnegative(),
	timestamp: z.number().int().nonnegative(),
	addedEntities: z.array(z.number()),
	removedEntities: z.array(z.number()),
	changedComponents: z.array(ComponentDataSchema),
});

// =============================================================================
// TYPES
// =============================================================================

/**
 * Component field data - maps field names to their value arrays
 */
export interface ComponentFieldData {
	readonly [fieldName: string]: readonly number[];
}

/**
 * Serialized component data
 */
export interface ComponentData {
	readonly name: string;
	readonly entities: readonly number[];
	readonly values: ComponentFieldData;
}

/**
 * Complete world snapshot
 */
export interface WorldSnapshot {
	readonly version: number;
	readonly timestamp: number;
	readonly entityCount: number;
	readonly components: readonly ComponentData[];
}

/**
 * Delta between two world snapshots
 */
export interface WorldDelta {
	readonly baseTimestamp: number;
	readonly timestamp: number;
	readonly addedEntities: readonly number[];
	readonly removedEntities: readonly number[];
	readonly changedComponents: readonly ComponentData[];
}

/**
 * Component registration for serialization
 */
export interface ComponentRegistration {
	readonly name: string;
	// biome-ignore lint/suspicious/noExplicitAny: Component stores have heterogeneous typed array fields
	readonly component: any;
	readonly fields: readonly string[];
}

// =============================================================================
// COMPONENT REGISTRY
// =============================================================================

/**
 * Global component registry
 */
let componentRegistry: readonly ComponentRegistration[] = [];

/**
 * Registers components for serialization.
 * Must be called before serializing/deserializing world state.
 *
 * @param registrations - Array of component registrations
 *
 * @example
 * ```typescript
 * import { registerComponents, Position, Velocity } from 'blecsd';
 *
 * registerComponents([
 *   { name: 'Position', component: Position, fields: ['x', 'y', 'z', 'absolute'] },
 *   { name: 'Velocity', component: Velocity, fields: ['x', 'y', 'maxSpeed', 'friction'] },
 * ]);
 * ```
 */
export function registerComponents(registrations: readonly ComponentRegistration[]): void {
	componentRegistry = registrations;
}

/**
 * Gets the currently registered components.
 *
 * @returns Array of component registrations
 *
 * @example
 * ```typescript
 * import { getRegisteredComponents } from 'blecsd';
 *
 * const components = getRegisteredComponents();
 * console.log(components.map(c => c.name));
 * ```
 */
export function getRegisteredComponents(): readonly ComponentRegistration[] {
	return componentRegistry;
}

// =============================================================================
// SERIALIZATION
// =============================================================================

const SCHEMA_VERSION = 1;

/**
 * Serializes a world to a snapshot.
 *
 * @param world - The ECS world to serialize
 * @param components - Array of component registrations to serialize
 * @returns World snapshot
 *
 * @example
 * ```typescript
 * import { createWorld, addEntity, setPosition, serializeWorld } from 'blecsd';
 *
 * const world = createWorld();
 * const entity = addEntity(world);
 * setPosition(world, entity, 10, 5);
 *
 * const snapshot = serializeWorld(world, [
 *   { name: 'Position', component: Position, fields: ['x', 'y', 'z', 'absolute'] },
 * ]);
 * ```
 */
export function serializeWorld(
	world: World,
	components: readonly ComponentRegistration[],
): WorldSnapshot {
	const entities = getAllEntities(world);
	const componentData: ComponentData[] = [];

	for (const reg of components) {
		const data = serializeComponentRegistration(world, entities, reg, hasComponent);
		if (data) {
			componentData.push(data);
		}
	}

	const snapshot: WorldSnapshot = {
		version: SCHEMA_VERSION,
		timestamp: Date.now(),
		entityCount: entities.length,
		components: componentData,
	};

	// Validate with Zod
	return WorldSnapshotSchema.parse(snapshot);
}

/**
 * Deserializes a snapshot into a new world.
 *
 * @param snapshot - World snapshot to deserialize
 * @returns A new world with the snapshot data
 *
 * @example
 * ```typescript
 * import { deserializeWorld, getAllEntities } from 'blecsd';
 *
 * const world = deserializeWorld(snapshot);
 * const entities = getAllEntities(world);
 * console.log(`Restored ${entities.length} entities`);
 * ```
 */
export function deserializeWorld(snapshot: WorldSnapshot): World {
	WorldSnapshotSchema.parse(snapshot);

	const world = createWorld();
	const allEntityIds = collectAllEntityIds(snapshot);
	const entityMap = createEntityMapping(world, allEntityIds, addEntity);

	// Second pass: add components and restore values
	for (const compData of snapshot.components) {
		const reg = componentRegistry.find((r) => r.name === compData.name);
		if (!reg) {
			throw new Error(`Component ${compData.name} not registered`);
		}

		for (let i = 0; i < compData.entities.length; i++) {
			const originalEid = compData.entities[i];
			if (originalEid === undefined) continue;

			const newEid = entityMap.get(originalEid);
			if (newEid === undefined) continue;

			addComponent(world, newEid, reg.component);
			restoreComponentData(reg.component, newEid, compData.values, i, reg.fields);
		}
	}

	return world;
}

// =============================================================================
// DELTA COMPRESSION
// =============================================================================

/**
 * Creates a delta between two snapshots.
 *
 * @param prev - Previous snapshot
 * @param current - Current snapshot
 * @returns Delta containing changes between snapshots
 *
 * @example
 * ```typescript
 * import { serializeWorld, createWorldDelta } from 'blecsd';
 *
 * const snapshot1 = serializeWorld(world, components);
 * // ... modify world ...
 * const snapshot2 = serializeWorld(world, components);
 *
 * const delta = createWorldDelta(snapshot1, snapshot2);
 * console.log(`Added: ${delta.addedEntities.length}, Removed: ${delta.removedEntities.length}`);
 * ```
 */
export function createWorldDelta(prev: WorldSnapshot, current: WorldSnapshot): WorldDelta {
	WorldSnapshotSchema.parse(prev);
	WorldSnapshotSchema.parse(current);

	const prevEntities = extractEntitySet(prev);
	const currentEntities = extractEntitySet(current);
	const { added: addedEntities, removed: removedEntities } = findEntityChanges(
		prevEntities,
		currentEntities,
	);

	const changedComponents: ComponentData[] = [];

	// Find changed components
	for (const currentComp of current.components) {
		const prevComp = prev.components.find((c) => c.name === currentComp.name);
		const changed = collectChangedComponentData(currentComp, prevComp, addedEntities);
		if (changed) {
			changedComponents.push(changed);
		}
	}

	// Include full data for added entities
	for (const currentComp of current.components) {
		collectAddedEntitiesData(currentComp, addedEntities, changedComponents);
	}

	const delta: WorldDelta = {
		baseTimestamp: prev.timestamp,
		timestamp: current.timestamp,
		addedEntities,
		removedEntities,
		changedComponents,
	};

	return WorldDeltaSchema.parse(delta);
}

/**
 * Applies a delta to a world.
 *
 * @param world - The world to apply the delta to
 * @param delta - The delta to apply
 * @param components - Component registrations
 * @returns The modified world
 *
 * @example
 * ```typescript
 * import { applyWorldDelta } from 'blecsd';
 *
 * const world = deserializeWorld(baseSnapshot);
 * applyWorldDelta(world, delta, components);
 * ```
 */
export function applyWorldDelta(
	world: World,
	delta: WorldDelta,
	components: readonly ComponentRegistration[],
): World {
	WorldDeltaSchema.parse(delta);

	// Remove entities
	for (const eid of delta.removedEntities) {
		if (entityExists(world, eid as Entity)) {
			removeEntity(world, eid as Entity);
		}
	}

	// Add new entities
	const allEntities = getAllEntities(world);
	const entityMap = createExistingEntityMap(allEntities);
	addEntitiesWithIds(world, delta.addedEntities, entityMap, addEntity, entityExists);

	// Apply component changes
	for (const compData of delta.changedComponents) {
		const reg = components.find((r) => r.name === compData.name);
		if (!reg) {
			throw new Error(`Component ${compData.name} not registered`);
		}

		for (let i = 0; i < compData.entities.length; i++) {
			const eid = compData.entities[i];
			if (eid === undefined) continue;

			const targetEid = (entityMap.get(eid) || eid) as Entity;
			applyComponentToEntity(world, targetEid, reg, compData, i, hasComponent, addComponent, entityExists);
		}
	}

	return world;
}
