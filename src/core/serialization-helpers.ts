/**
 * Helper functions for ECS world serialization (internal).
 * Extracted to reduce cognitive complexity of main serialization functions.
 *
 * @module core/serialization-helpers
 * @internal
 */

import type { ComponentData, ComponentFieldData, WorldSnapshot } from './serialization';

// =============================================================================
// SERIALIZE HELPERS
// =============================================================================

/** Collects entity IDs from a component. */
export function collectEntityIds(component: unknown, entities: readonly number[]): number[] {
	const ids: number[] = [];
	for (const eid of entities) {
		ids.push(eid);
	}
	return ids;
}

/** Extracts field values from a component for given entities. */
export function extractFieldValues(
	component: Record<string, unknown>,
	field: string,
	entities: readonly number[],
): number[] {
	const values: number[] = [];
	const fieldData = component[field];

	if (!ArrayBuffer.isView(fieldData) && !Array.isArray(fieldData)) {
		return values;
	}

	const arr = fieldData as { [index: number]: unknown };
	for (const eid of entities) {
		const value = arr[eid];
		if (typeof value === 'number') {
			values.push(value);
		}
	}

	return values;
}

/** Builds component field data for serialization. */
export function buildComponentValues(
	component: Record<string, unknown>,
	entities: readonly number[],
): ComponentFieldData {
	const values: Record<string, number[]> = {};

	for (const [key, value] of Object.entries(component)) {
		if (ArrayBuffer.isView(value) || Array.isArray(value)) {
			values[key] = extractFieldValues(component, key, entities);
		}
	}

	return values;
}

/** Serializes a single component registration. */
export function serializeComponentRegistration(
	world: unknown,
	entities: readonly number[],
	reg: { name: string; component: unknown; fields: readonly string[] },
	hasComponent: (world: unknown, eid: unknown, component: unknown) => boolean,
): ComponentData | null {
	const entitiesWithComponent: number[] = [];
	const values: Record<string, number[]> = {};

	// Initialize value arrays
	for (const field of reg.fields) {
		values[field] = [];
	}

	// Collect data for entities that have this component
	const comp = reg.component as Record<string, unknown>;
	for (const eid of entities) {
		if (hasComponent(world, eid, reg.component)) {
			entitiesWithComponent.push(eid);

			// Copy field values
			for (const field of reg.fields) {
				const typedArray = comp[field];
				const hasValue =
					typedArray && typeof (typedArray as { [index: number]: unknown })[eid] !== 'undefined';
				if (hasValue) {
					values[field]?.push((typedArray as { [index: number]: number })[eid] ?? 0);
				} else {
					values[field]?.push(0);
				}
			}
		}
	}

	if (entitiesWithComponent.length === 0) return null;

	return {
		name: reg.name,
		entities: entitiesWithComponent,
		values,
	};
}

// =============================================================================
// DESERIALIZE HELPERS
// =============================================================================

/** Collects all unique entity IDs from snapshot components. */
export function collectAllEntityIds(snapshot: WorldSnapshot): Set<number> {
	const allEntityIds = new Set<number>();
	for (const comp of snapshot.components) {
		for (const eid of comp.entities) {
			allEntityIds.add(eid);
		}
	}
	return allEntityIds;
}

/** Creates entities and builds entity ID mapping. */
export function createEntityMapping(
	world: unknown,
	entityIds: Set<number>,
	addEntity: (world: unknown) => number,
): Map<number, number> {
	const entityMap = new Map<number, number>();
	const sortedIds = Array.from(entityIds).sort((a, b) => a - b);

	for (const originalEid of sortedIds) {
		const newEid = addEntity(world);
		entityMap.set(originalEid, newEid);
	}

	return entityMap;
}

/** Restores component data for a single entity. */
export function restoreComponentData(
	component: Record<string, unknown>,
	eid: number,
	values: ComponentFieldData,
	index: number,
	fields: readonly string[],
): void {
	for (const field of fields) {
		const fieldValues = values[field];
		if (!fieldValues || typeof fieldValues[index] === 'undefined') continue;

		const typedArray = component[field];
		if (typedArray) {
			(typedArray as { [index: number]: unknown })[eid] = fieldValues[index];
		}
	}
}

/** Adds component to an entity during deserialization. */
export function addComponentToEntity(
	world: unknown,
	eid: number,
	component: unknown,
	values: ComponentFieldData,
	index: number,
	addComponent: (world: unknown, eid: unknown, component: unknown) => void,
): void {
	addComponent(world, eid, component);

	const comp = component as Record<string, unknown>;
	for (const [field, valueArray] of Object.entries(values)) {
		const fieldData = comp[field];
		if (ArrayBuffer.isView(fieldData) || Array.isArray(fieldData)) {
			const arr = fieldData as { [index: number]: unknown };
			const value = valueArray[index];
			if (value !== undefined) {
				arr[eid] = value;
			}
		}
	}
}

// =============================================================================
// DELTA HELPERS
// =============================================================================

/** Extracts all entities from a snapshot's components. */
export function extractEntitySet(snapshot: WorldSnapshot): Set<number> {
	const entities = new Set<number>();
	for (const comp of snapshot.components) {
		for (const eid of comp.entities) {
			entities.add(eid);
		}
	}
	return entities;
}

/** Finds entities added and removed between snapshots. */
export function findEntityChanges(
	prevEntities: Set<number>,
	currentEntities: Set<number>,
): { added: number[]; removed: number[] } {
	const added: number[] = [];
	const removed: number[] = [];

	for (const eid of currentEntities) {
		if (!prevEntities.has(eid)) {
			added.push(eid);
		}
	}

	for (const eid of prevEntities) {
		if (!currentEntities.has(eid)) {
			removed.push(eid);
		}
	}

	return { added, removed };
}

/** Checks if entity's component values changed. */
export function hasComponentChanges(
	currentComp: ComponentData,
	currentIndex: number,
	prevComp: ComponentData | undefined,
	eid: number,
): boolean {
	if (!prevComp || !prevComp.entities.includes(eid)) {
		return true;
	}

	const prevIndex = prevComp.entities.indexOf(eid);
	for (const field of Object.keys(currentComp.values)) {
		const currentValue = currentComp.values[field]?.[currentIndex];
		const prevValue = prevComp.values[field]?.[prevIndex];
		if (currentValue !== prevValue) {
			return true;
		}
	}

	return false;
}

/** Collects changed component data for a single component. */
export function collectChangedComponentData(
	currentComp: ComponentData,
	prevComp: ComponentData | undefined,
	addedEntities: readonly number[],
): ComponentData | null {
	const changedEntities: number[] = [];
	const changedValues: Record<string, number[]> = {};

	// Initialize value arrays
	for (const field of Object.keys(currentComp.values)) {
		changedValues[field] = [];
	}

	// Check each entity in current component
	for (let i = 0; i < currentComp.entities.length; i++) {
		const eid = currentComp.entities[i];
		if (eid === undefined || addedEntities.includes(eid)) continue;

		if (hasComponentChanges(currentComp, i, prevComp, eid)) {
			changedEntities.push(eid);
			for (const field of Object.keys(currentComp.values)) {
				const value = currentComp.values[field]?.[i];
				if (value !== undefined) {
					changedValues[field]?.push(value);
				}
			}
		}
	}

	if (changedEntities.length === 0) return null;

	return {
		name: currentComp.name,
		entities: changedEntities,
		values: changedValues,
	};
}

/** Merges component data with existing entry. */
export function mergeComponentData(existing: ComponentData, toMerge: ComponentData): ComponentData {
	const mergedValues: Record<string, number[]> = {};
	for (const field of Object.keys(toMerge.values)) {
		mergedValues[field] = [...(existing.values[field] || []), ...(toMerge.values[field] || [])];
	}

	return {
		name: existing.name,
		entities: [...existing.entities, ...toMerge.entities],
		values: mergedValues,
	};
}

/** Collects data for newly added entities. */
export function collectAddedEntitiesData(
	currentComp: ComponentData,
	addedEntities: readonly number[],
	changedComponents: ComponentData[],
): void {
	const addedInThisComp: number[] = [];
	const addedValues: Record<string, number[]> = {};

	// Initialize value arrays
	for (const field of Object.keys(currentComp.values)) {
		addedValues[field] = [];
	}

	for (let i = 0; i < currentComp.entities.length; i++) {
		const eid = currentComp.entities[i];
		if (eid === undefined || !addedEntities.includes(eid)) continue;

		addedInThisComp.push(eid);
		for (const field of Object.keys(currentComp.values)) {
			const value = currentComp.values[field]?.[i];
			if (value !== undefined) {
				addedValues[field]?.push(value);
			}
		}
	}

	if (addedInThisComp.length === 0) return;

	const newData: ComponentData = {
		name: currentComp.name,
		entities: addedInThisComp,
		values: addedValues,
	};

	const existing = changedComponents.find((c) => c.name === currentComp.name);
	if (existing) {
		const merged = mergeComponentData(existing, newData);
		const idx = changedComponents.indexOf(existing);
		changedComponents[idx] = merged;
	} else {
		changedComponents.push(newData);
	}
}

// =============================================================================
// APPLY DELTA HELPERS
// =============================================================================

/** Creates entity ID mapping from existing entities. */
export function createExistingEntityMap(entities: readonly number[]): Map<number, number> {
	const entityMap = new Map<number, number>();
	for (const eid of entities) {
		entityMap.set(eid, eid);
	}
	return entityMap;
}

/** Adds entities with specific IDs to world. */
export function addEntitiesWithIds(
	world: unknown,
	entityIds: readonly number[],
	entityMap: Map<number, number>,
	addEntity: (world: unknown) => number,
	entityExists: (world: unknown, eid: unknown) => boolean,
): void {
	for (const eid of entityIds) {
		if (!entityExists(world, eid)) {
			// Create entities until we get the right ID
			let newEid = addEntity(world);
			while (newEid !== eid && newEid < eid) {
				newEid = addEntity(world);
			}
			entityMap.set(eid, newEid);
		}
	}
}

/** Applies component data to a single entity. */
export function applyComponentToEntity(
	world: unknown,
	eid: number,
	componentReg: { component: unknown; fields: readonly string[] },
	compData: ComponentData,
	index: number,
	hasComponent: (world: unknown, eid: unknown, component: unknown) => boolean,
	addComponent: (world: unknown, eid: unknown, component: unknown) => void,
	entityExists: (world: unknown, eid: unknown) => boolean,
): void {
	if (!entityExists(world, eid)) return;

	// Add component if not present
	if (!hasComponent(world, eid, componentReg.component)) {
		addComponent(world, eid, componentReg.component);
	}

	// Update field values
	const comp = componentReg.component as Record<string, unknown>;
	for (const field of componentReg.fields) {
		const values = compData.values[field];
		if (!values || typeof values[index] === 'undefined') continue;

		const typedArray = comp[field];
		if (typedArray) {
			(typedArray as { [index: number]: unknown })[eid] = values[index];
		}
	}
}

/** Finds component registration by name. */
export function findComponentByName(
	components: readonly { name: string; component: unknown }[],
	name: string,
): unknown | undefined {
	return components.find((c) => c.name === name)?.component;
}

/** Applies component values to entity. */
export function applyComponentValues(
	component: unknown,
	eid: number,
	values: ComponentFieldData,
	index: number,
): void {
	const comp = component as Record<string, unknown>;
	for (const [field, valueArray] of Object.entries(values)) {
		const fieldData = comp[field];
		if (ArrayBuffer.isView(fieldData) || Array.isArray(fieldData)) {
			const arr = fieldData as { [index: number]: unknown };
			const value = valueArray[index];
			if (value !== undefined) {
				arr[eid] = value;
			}
		}
	}
}
