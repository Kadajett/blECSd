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
		const entitiesWithComponent: number[] = [];
		const values: Record<string, number[]> = {};

		// Initialize value arrays
		for (const field of reg.fields) {
			values[field] = [];
		}

		// Collect data for entities that have this component
		for (const eid of entities) {
			if (hasComponent(world, eid, reg.component)) {
				entitiesWithComponent.push(eid);

				// Copy field values
				for (const field of reg.fields) {
					const typedArray = reg.component[field];
					if (typedArray && typeof typedArray[eid] !== 'undefined') {
						values[field]?.push(typedArray[eid]);
					} else {
						values[field]?.push(0);
					}
				}
			}
		}

		if (entitiesWithComponent.length > 0) {
			componentData.push({
				name: reg.name,
				entities: entitiesWithComponent,
				values,
			});
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
	// Validate snapshot
	WorldSnapshotSchema.parse(snapshot);

	const world = createWorld();
	const entityMap = new Map<number, Entity>();

	// First pass: create all entities
	const allEntityIds = new Set<number>();
	for (const comp of snapshot.components) {
		for (const eid of comp.entities) {
			allEntityIds.add(eid);
		}
	}

	for (const originalEid of Array.from(allEntityIds).sort((a, b) => a - b)) {
		const newEid = addEntity(world);
		entityMap.set(originalEid, newEid);
	}

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

			// Add component
			addComponent(world, newEid, reg.component);

			// Restore field values
			for (const field of reg.fields) {
				const values = compData.values[field];
				if (values && typeof values[i] !== 'undefined') {
					const typedArray = reg.component[field];
					if (typedArray) {
						typedArray[newEid] = values[i];
					}
				}
			}
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

	// Build entity sets
	const prevEntities = new Set<number>();
	for (const comp of prev.components) {
		for (const eid of comp.entities) {
			prevEntities.add(eid);
		}
	}

	const currentEntities = new Set<number>();
	for (const comp of current.components) {
		for (const eid of comp.entities) {
			currentEntities.add(eid);
		}
	}

	// Find added and removed entities
	const addedEntities: number[] = [];
	const removedEntities: number[] = [];

	for (const eid of currentEntities) {
		if (!prevEntities.has(eid)) {
			addedEntities.push(eid);
		}
	}

	for (const eid of prevEntities) {
		if (!currentEntities.has(eid)) {
			removedEntities.push(eid);
		}
	}

	// Find changed components
	const changedComponents: ComponentData[] = [];

	for (const currentComp of current.components) {
		const prevComp = prev.components.find((c) => c.name === currentComp.name);

		const changedEntities: number[] = [];
		const changedValues: Record<string, number[]> = {};

		// Initialize value arrays
		for (const field of Object.keys(currentComp.values)) {
			changedValues[field] = [];
		}

		// Check each entity in current component
		for (let i = 0; i < currentComp.entities.length; i++) {
			const eid = currentComp.entities[i];
			if (eid === undefined) continue;

			// Skip newly added entities (they're in addedEntities)
			if (addedEntities.includes(eid)) continue;

			let hasChanges = false;

			// If entity didn't have this component before, it's a change
			if (!prevComp || !prevComp.entities.includes(eid)) {
				hasChanges = true;
			} else {
				// Check if any field values changed
				const prevIndex = prevComp.entities.indexOf(eid);
				for (const field of Object.keys(currentComp.values)) {
					const currentValue = currentComp.values[field]?.[i];
					const prevValue = prevComp.values[field]?.[prevIndex];
					if (currentValue !== prevValue) {
						hasChanges = true;
						break;
					}
				}
			}

			if (hasChanges) {
				changedEntities.push(eid);
				for (const field of Object.keys(currentComp.values)) {
					const value = currentComp.values[field]?.[i];
					if (value !== undefined) {
						changedValues[field]?.push(value);
					}
				}
			}
		}

		if (changedEntities.length > 0) {
			changedComponents.push({
				name: currentComp.name,
				entities: changedEntities,
				values: changedValues,
			});
		}
	}

	// Include full data for added entities
	for (const currentComp of current.components) {
		const addedInThisComp: number[] = [];
		const addedValues: Record<string, number[]> = {};

		// Initialize value arrays
		for (const field of Object.keys(currentComp.values)) {
			addedValues[field] = [];
		}

		for (let i = 0; i < currentComp.entities.length; i++) {
			const eid = currentComp.entities[i];
			if (eid === undefined) continue;

			if (addedEntities.includes(eid)) {
				addedInThisComp.push(eid);
				for (const field of Object.keys(currentComp.values)) {
					const value = currentComp.values[field]?.[i];
					if (value !== undefined) {
						addedValues[field]?.push(value);
					}
				}
			}
		}

		if (addedInThisComp.length > 0) {
			// Check if we already have this component in changedComponents
			const existing = changedComponents.find((c) => c.name === currentComp.name);
			if (existing) {
				// Merge with existing
				const mergedValues: Record<string, number[]> = {};
				for (const field of Object.keys(currentComp.values)) {
					mergedValues[field] = [...(existing.values[field] || []), ...(addedValues[field] || [])];
				}
				const merged: ComponentData = {
					name: existing.name,
					entities: [...existing.entities, ...addedInThisComp],
					values: mergedValues,
				};
				// Replace existing
				const idx = changedComponents.indexOf(existing);
				changedComponents[idx] = merged;
			} else {
				changedComponents.push({
					name: currentComp.name,
					entities: addedInThisComp,
					values: addedValues,
				});
			}
		}
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
	const entityMap = new Map<number, Entity>();
	const allEntities = getAllEntities(world);
	for (const eid of allEntities) {
		entityMap.set(eid, eid);
	}

	for (const eid of delta.addedEntities) {
		if (!entityExists(world, eid as Entity)) {
			// We need to create entities with specific IDs
			// bitecs doesn't support this directly, so we create entities until we get the right ID
			let newEid = addEntity(world);
			while (newEid !== eid && newEid < eid) {
				newEid = addEntity(world);
			}
			entityMap.set(eid, newEid);
		}
	}

	// Apply component changes
	for (const compData of delta.changedComponents) {
		const reg = components.find((r) => r.name === compData.name);
		if (!reg) {
			throw new Error(`Component ${compData.name} not registered`);
		}

		for (let i = 0; i < compData.entities.length; i++) {
			const eid = compData.entities[i];
			if (eid === undefined) continue;

			const targetEid = entityMap.get(eid) || (eid as Entity);
			if (!entityExists(world, targetEid)) continue;

			// Add component if not present
			if (!hasComponent(world, targetEid, reg.component)) {
				addComponent(world, targetEid, reg.component);
			}

			// Update field values
			for (const field of reg.fields) {
				const values = compData.values[field];
				if (values && typeof values[i] !== 'undefined') {
					const typedArray = reg.component[field];
					if (typedArray) {
						typedArray[targetEid] = values[i];
					}
				}
			}
		}
	}

	return world;
}
