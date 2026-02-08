/**
 * ECS world state serialization and deserialization.
 *
 * Provides functions to serialize ECS world state to JSON and restore it,
 * supporting component data, entity relationships, and custom serializers
 * for complex (non-typed-array) data.
 *
 * @module core/serialization
 */

import { addComponent, addEntity, getAllEntities, hasComponent, removeEntity } from './ecs';
import type { Entity, World } from './types';
import { createWorld } from './world';

// =============================================================================
// TYPES
// =============================================================================

/**
 * A registered component descriptor for serialization.
 */
export interface ComponentDescriptor {
	/** Unique name for the component (used as key in serialized data) */
	readonly name: string;
	/** The component store object (SoA typed arrays) */
	// biome-ignore lint/suspicious/noExplicitAny: Component stores have heterogeneous typed array fields
	readonly store: Record<string, any>;
	/** Optional custom serializer for non-typed-array data */
	readonly serialize?: (eid: Entity) => unknown;
	/** Optional custom deserializer for non-typed-array data */
	readonly deserialize?: (eid: Entity, data: unknown) => void;
}

/**
 * Serialized entity data.
 */
export interface SerializedEntity {
	/** Original entity ID (for relationship mapping) */
	readonly id: number;
	/** Map of component name to serialized component data */
	readonly components: Record<string, SerializedComponentData>;
}

/**
 * Serialized component data for a single entity.
 */
export interface SerializedComponentData {
	/** Typed array field values (field name -> value) */
	readonly fields: Record<string, number>;
	/** Optional custom data from serialize callback */
	readonly custom?: unknown;
}

/**
 * Complete serialized world snapshot.
 */
export interface SerializedWorld {
	/** Version for forward compatibility */
	readonly version: number;
	/** Timestamp of serialization */
	readonly timestamp: number;
	/** Array of serialized entities */
	readonly entities: readonly SerializedEntity[];
	/** Optional metadata attached by user */
	readonly metadata?: Record<string, unknown> | undefined;
}

/**
 * Options for serialization.
 */
export interface SerializeOptions {
	/** Only serialize entities with these IDs (default: all entities) */
	readonly entityFilter?: readonly Entity[] | undefined;
	/** Only serialize these components by name (default: all registered) */
	readonly componentFilter?: readonly string[] | undefined;
	/** Metadata to include in the snapshot */
	readonly metadata?: Record<string, unknown> | undefined;
}

/**
 * Options for deserialization.
 */
export interface DeserializeOptions {
	/** If true, clear the world before loading (default: false) */
	readonly clearWorld?: boolean | undefined;
	/** If true, create a new world instead of modifying the given one (default: false) */
	readonly createNew?: boolean | undefined;
}

/**
 * Result of deserialization.
 */
export interface DeserializeResult {
	/** The world that was deserialized into */
	readonly world: World;
	/** Map from old entity IDs to new entity IDs */
	readonly entityMap: ReadonlyMap<number, Entity>;
	/** Count of entities restored */
	readonly entityCount: number;
	/** Count of components restored */
	readonly componentCount: number;
}

// =============================================================================
// COMPONENT REGISTRY
// =============================================================================

/** Registered component descriptors for serialization */
const componentRegistry = new Map<string, ComponentDescriptor>();

/**
 * Registers a component for serialization.
 *
 * Components must be registered before they can be serialized or deserialized.
 * The descriptor tells the serializer how to read/write the component's data.
 *
 * @param descriptor - Component descriptor with name, store, and optional custom serializers
 *
 * @example
 * ```typescript
 * import { registerSerializable, Position } from 'blecsd';
 *
 * registerSerializable({
 *   name: 'Position',
 *   store: Position,
 * });
 * ```
 */
export function registerSerializable(descriptor: ComponentDescriptor): void {
	componentRegistry.set(descriptor.name, descriptor);
}

/**
 * Unregisters a component from serialization.
 *
 * @param name - The component name to unregister
 * @returns True if the component was found and removed
 *
 * @example
 * ```typescript
 * import { unregisterSerializable } from 'blecsd';
 *
 * unregisterSerializable('Position');
 * ```
 */
export function unregisterSerializable(name: string): boolean {
	return componentRegistry.delete(name);
}

/**
 * Gets a registered component descriptor by name.
 *
 * @param name - The component name
 * @returns The descriptor, or undefined if not registered
 *
 * @example
 * ```typescript
 * import { getSerializable } from 'blecsd';
 *
 * const desc = getSerializable('Position');
 * if (desc) {
 *   console.log(Object.keys(desc.store)); // ['x', 'y', 'z', 'absolute']
 * }
 * ```
 */
export function getSerializable(name: string): ComponentDescriptor | undefined {
	return componentRegistry.get(name);
}

/**
 * Gets all registered component names.
 *
 * @returns Array of registered component names
 *
 * @example
 * ```typescript
 * import { getRegisteredComponents } from 'blecsd';
 *
 * const names = getRegisteredComponents();
 * console.log(names); // ['Position', 'Velocity', 'Renderable']
 * ```
 */
export function getRegisteredComponents(): readonly string[] {
	return Array.from(componentRegistry.keys());
}

/**
 * Clears all registered serializable components.
 * Useful for testing.
 *
 * @example
 * ```typescript
 * import { clearSerializableRegistry } from 'blecsd';
 *
 * clearSerializableRegistry();
 * ```
 */
export function clearSerializableRegistry(): void {
	componentRegistry.clear();
}

// =============================================================================
// SERIALIZATION
// =============================================================================

/**
 * Checks whether a value is a typed array.
 */
function isTypedArray(
	value: unknown,
): value is
	| Float32Array
	| Float64Array
	| Int8Array
	| Int16Array
	| Int32Array
	| Uint8Array
	| Uint16Array
	| Uint32Array {
	return (
		value instanceof Float32Array ||
		value instanceof Float64Array ||
		value instanceof Int8Array ||
		value instanceof Int16Array ||
		value instanceof Int32Array ||
		value instanceof Uint8Array ||
		value instanceof Uint16Array ||
		value instanceof Uint32Array
	);
}

/**
 * Serializes a single entity's component data.
 */
function serializeEntityComponent(
	descriptor: ComponentDescriptor,
	eid: Entity,
): SerializedComponentData {
	const fields: Record<string, number> = {};

	for (const [fieldName, fieldArray] of Object.entries(descriptor.store)) {
		if (isTypedArray(fieldArray)) {
			fields[fieldName] = fieldArray[eid] as number;
		}
	}

	const result: { fields: Record<string, number>; custom?: unknown } = { fields };

	if (descriptor.serialize) {
		result.custom = descriptor.serialize(eid);
	}

	return result;
}

/**
 * Serializes ECS world state to a snapshot object.
 *
 * Only components registered via `registerSerializable` are included.
 * The snapshot can be converted to JSON with `JSON.stringify`.
 *
 * @param world - The world to serialize
 * @param options - Optional serialization options
 * @returns A serialized world snapshot
 *
 * @example
 * ```typescript
 * import { createWorld, addEntity, setPosition, serializeWorld, registerSerializable, Position } from 'blecsd';
 *
 * registerSerializable({ name: 'Position', store: Position });
 *
 * const world = createWorld();
 * const eid = addEntity(world);
 * setPosition(world, eid, 10, 20);
 *
 * const snapshot = serializeWorld(world);
 * const json = JSON.stringify(snapshot);
 * ```
 */
export function serializeWorld(world: World, options?: SerializeOptions): SerializedWorld {
	const allEntities = getAllEntities(world);
	const entities: Entity[] = options?.entityFilter
		? (allEntities.filter((eid) =>
				(options.entityFilter as readonly Entity[]).includes(eid),
			) as Entity[])
		: (allEntities as Entity[]);

	const descriptors = getFilteredDescriptors(options?.componentFilter);

	const serializedEntities: SerializedEntity[] = [];

	for (const eid of entities) {
		const components: Record<string, SerializedComponentData> = {};
		let hasAnyComponent = false;

		for (const descriptor of descriptors) {
			if (hasComponent(world, eid, descriptor.store)) {
				components[descriptor.name] = serializeEntityComponent(descriptor, eid);
				hasAnyComponent = true;
			}
		}

		if (hasAnyComponent) {
			serializedEntities.push({
				id: eid as number,
				components,
			});
		}
	}

	return {
		version: 1,
		timestamp: Date.now(),
		entities: serializedEntities,
		metadata: options?.metadata,
	};
}

/**
 * Serializes ECS world state to a JSON string.
 *
 * Convenience wrapper around `serializeWorld` + `JSON.stringify`.
 *
 * @param world - The world to serialize
 * @param options - Optional serialization options
 * @returns JSON string of the world state
 *
 * @example
 * ```typescript
 * import { createWorld, addEntity, setPosition, serializeWorldToJSON, registerSerializable, Position } from 'blecsd';
 *
 * registerSerializable({ name: 'Position', store: Position });
 *
 * const world = createWorld();
 * const eid = addEntity(world);
 * setPosition(world, eid, 10, 20);
 *
 * const json = serializeWorldToJSON(world);
 * // Save to file, send over network, etc.
 * ```
 */
export function serializeWorldToJSON(world: World, options?: SerializeOptions): string {
	return JSON.stringify(serializeWorld(world, options));
}

// =============================================================================
// DESERIALIZATION
// =============================================================================

/**
 * Restores a single entity's component data from serialized form.
 */
function deserializeEntityComponent(
	descriptor: ComponentDescriptor,
	eid: Entity,
	data: SerializedComponentData,
): void {
	for (const [fieldName, value] of Object.entries(data.fields)) {
		const fieldArray = descriptor.store[fieldName];
		if (isTypedArray(fieldArray)) {
			fieldArray[eid] = value;
		}
	}

	if (descriptor.deserialize && data.custom !== undefined) {
		descriptor.deserialize(eid, data.custom);
	}
}

/**
 * Deserializes a world snapshot back into an ECS world.
 *
 * Creates new entities and restores their component data from the snapshot.
 * Returns a mapping from old entity IDs to new ones for relationship fixup.
 *
 * @param snapshot - The serialized world snapshot
 * @param world - The world to deserialize into
 * @param options - Optional deserialization options
 * @returns Result with the world, entity map, and statistics
 *
 * @example
 * ```typescript
 * import { createWorld, deserializeWorld, registerSerializable, Position } from 'blecsd';
 *
 * registerSerializable({ name: 'Position', store: Position });
 *
 * const world = createWorld();
 * const result = deserializeWorld(snapshot, world);
 *
 * console.log(result.entityCount); // number of entities restored
 * console.log(result.entityMap); // Map<oldId, newId>
 * ```
 */
export function deserializeWorld(
	snapshot: SerializedWorld,
	world: World,
	options?: DeserializeOptions,
): DeserializeResult {
	let targetWorld = world;

	if (options?.createNew) {
		targetWorld = createWorld();
	} else if (options?.clearWorld) {
		// Remove all existing entities
		const existing = getAllEntities(targetWorld);
		for (const eid of existing) {
			removeEntity(targetWorld, eid);
		}
	}

	const entityMap = new Map<number, Entity>();
	let componentCount = 0;

	for (const serializedEntity of snapshot.entities) {
		const newEid = addEntity(targetWorld);
		entityMap.set(serializedEntity.id, newEid);

		for (const [componentName, componentData] of Object.entries(serializedEntity.components)) {
			const descriptor = componentRegistry.get(componentName);
			if (!descriptor) {
				continue;
			}

			addComponent(targetWorld, newEid, descriptor.store);
			deserializeEntityComponent(descriptor, newEid, componentData);
			componentCount++;
		}
	}

	return {
		world: targetWorld,
		entityMap,
		entityCount: entityMap.size,
		componentCount,
	};
}

/**
 * Deserializes a JSON string back into an ECS world.
 *
 * Convenience wrapper around JSON.parse + `deserializeWorld`.
 *
 * @param json - The JSON string to parse
 * @param world - The world to deserialize into
 * @param options - Optional deserialization options
 * @returns Result with the world, entity map, and statistics
 *
 * @example
 * ```typescript
 * import { createWorld, deserializeWorldFromJSON, registerSerializable, Position } from 'blecsd';
 *
 * registerSerializable({ name: 'Position', store: Position });
 *
 * const world = createWorld();
 * const result = deserializeWorldFromJSON(jsonString, world);
 *
 * console.log(result.entityCount);
 * ```
 */
export function deserializeWorldFromJSON(
	json: string,
	world: World,
	options?: DeserializeOptions,
): DeserializeResult {
	const snapshot = JSON.parse(json) as SerializedWorld;
	return deserializeWorld(snapshot, world, options);
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Returns descriptors matching the optional component name filter.
 */
function getFilteredDescriptors(
	componentFilter?: readonly string[],
): readonly ComponentDescriptor[] {
	if (!componentFilter) {
		return Array.from(componentRegistry.values());
	}

	const result: ComponentDescriptor[] = [];
	for (const name of componentFilter) {
		const descriptor = componentRegistry.get(name);
		if (descriptor) {
			result.push(descriptor);
		}
	}
	return result;
}

/**
 * Creates a deep clone of a serialized world snapshot.
 * Useful for creating save slots or undo history.
 *
 * @param snapshot - The snapshot to clone
 * @returns A new snapshot with identical data
 *
 * @example
 * ```typescript
 * import { serializeWorld, cloneSnapshot } from 'blecsd';
 *
 * const snapshot = serializeWorld(world);
 * const backup = cloneSnapshot(snapshot);
 * ```
 */
export function cloneSnapshot(snapshot: SerializedWorld): SerializedWorld {
	return JSON.parse(JSON.stringify(snapshot)) as SerializedWorld;
}

/** Current serialization format version */
export const SERIALIZATION_VERSION = 1;
