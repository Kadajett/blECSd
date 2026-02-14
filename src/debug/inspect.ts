/**
 * Core entity and world inspection functions (internal).
 *
 * These functions are used by both index.ts and ecsInspector.ts
 * to avoid circular dependencies.
 *
 * @module debug/inspect
 * @internal
 */

import { Animation, hasAnimation } from '../components/animation';
import { Border, hasBorder } from '../components/border';
import { Collider } from '../components/collision';
import { Content } from '../components/content';
import { Dimensions } from '../components/dimensions';
import { Focusable, isFocused } from '../components/focusable';
import { getChildren, getParent, Hierarchy } from '../components/hierarchy';
import { Interactive, isHovered, isPressed } from '../components/interactive';
import { Padding } from '../components/padding';
import { Position } from '../components/position';
import { Renderable, unpackColor } from '../components/renderable';
import { Scrollable } from '../components/scrollable';
import { Shadow } from '../components/shadow';
import { Velocity } from '../components/velocity';
import { getAllEntities, hasComponent } from '../core/ecs';
import { getEntityData, hasEntityData } from '../core/entityData';
import type { Entity, World } from '../core/types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Component information for inspection.
 */
export interface ComponentInfo {
	readonly name: string;
	readonly data: Record<string, unknown>;
}

/**
 * Entity inspection result.
 */
export interface EntityInspection {
	readonly entity: Entity;
	readonly name: string | null;
	readonly components: readonly ComponentInfo[];
	readonly parent: Entity | null;
	readonly children: readonly Entity[];
}

/**
 * World inspection result.
 */
export interface WorldInspection {
	readonly entityCount: number;
	readonly componentCounts: Record<string, number>;
	readonly hierarchyRoots: readonly Entity[];
}

// =============================================================================
// COMPONENT REGISTRY
// =============================================================================

/**
 * Known components for inspection.
 */
export const KNOWN_COMPONENTS: readonly { component: unknown; name: string }[] = [
	{ component: Position, name: 'Position' },
	{ component: Dimensions, name: 'Dimensions' },
	{ component: Renderable, name: 'Renderable' },
	{ component: Content, name: 'Content' },
	{ component: Border, name: 'Border' },
	{ component: Padding, name: 'Padding' },
	{ component: Hierarchy, name: 'Hierarchy' },
	{ component: Interactive, name: 'Interactive' },
	{ component: Focusable, name: 'Focusable' },
	{ component: Scrollable, name: 'Scrollable' },
	{ component: Velocity, name: 'Velocity' },
	{ component: Animation, name: 'Animation' },
	{ component: Collider, name: 'Collider' },
	{ component: Shadow, name: 'Shadow' },
];

// =============================================================================
// ENTITY INSPECTION
// =============================================================================

/**
 * Gets component data for an entity.
 */
function getComponentData(
	world: World,
	eid: Entity,
	component: unknown,
	name: string,
): ComponentInfo | null {
	if (!hasComponent(world, eid, component)) {
		return null;
	}

	const data: Record<string, unknown> = {};
	const comp = component as Record<string, unknown>;

	// Read all array properties
	for (const [key, value] of Object.entries(comp)) {
		if (ArrayBuffer.isView(value) || Array.isArray(value)) {
			const arr = value as { [index: number]: unknown };
			data[key] = arr[eid];
		}
	}

	return { name, data };
}

/**
 * Inspects an entity and returns detailed information about its components.
 *
 * @param world - The ECS world
 * @param eid - The entity to inspect
 * @returns Entity inspection data
 *
 * @example
 * ```typescript
 * import { inspectEntity } from 'blecsd/debug';
 *
 * const entity = addEntity(world);
 * setPosition(world, entity, 10, 20);
 *
 * const info = inspectEntity(world, entity);
 * console.log(info.components);
 * // [{ name: 'Position', data: { x: 10, y: 20, z: 0, absolute: 0 } }]
 * ```
 */
export function inspectEntity(world: World, eid: Entity): EntityInspection {
	const components: ComponentInfo[] = [];

	// Check all known components
	for (const { component, name } of KNOWN_COMPONENTS) {
		const info = getComponentData(world, eid, component, name);
		if (info) {
			components.push(info);
		}
	}

	// Get hierarchy info
	const parent = hasComponent(world, eid, Hierarchy) ? getParent(world, eid) : null;
	const children = hasComponent(world, eid, Hierarchy) ? getChildren(world, eid) : [];

	// Get entity name if available
	const name = hasEntityData(eid, 'name') ? (getEntityData<string>(eid, 'name') ?? null) : null;

	return {
		entity: eid,
		name,
		components,
		parent: parent === 0 ? null : parent,
		children,
	};
}

/**
 * Formats an entity inspection as a human-readable string.
 *
 * @param inspection - The entity inspection data
 * @returns Formatted string
 *
 * @example
 * ```typescript
 * import { inspectEntity, formatEntityInspection } from 'blecsd/debug';
 *
 * const info = inspectEntity(world, entity);
 * console.log(formatEntityInspection(info));
 * // Entity 1 (MyBox)
 * // ├─ Position: x=10, y=20, z=0
 * // ├─ Dimensions: width=40, height=10
 * // └─ Renderable: visible=1
 * ```
 */
export function formatEntityInspection(inspection: EntityInspection): string {
	const lines: string[] = [];

	// Header
	const nameStr = inspection.name ? ` (${inspection.name})` : '';
	lines.push(`Entity ${inspection.entity}${nameStr}`);

	// Parent/Children
	if (inspection.parent !== null) {
		lines.push(`├─ Parent: ${inspection.parent}`);
	}
	if (inspection.children.length > 0) {
		lines.push(`├─ Children: [${inspection.children.join(', ')}]`);
	}

	// Components
	const componentCount = inspection.components.length;
	inspection.components.forEach((comp, index) => {
		const isLast = index === componentCount - 1;
		const prefix = isLast ? '└─' : '├─';
		const dataStr = Object.entries(comp.data)
			.map(([key, value]) => {
				if (typeof value === 'number') {
					// Format colors as hex
					if (key === 'fg' || key === 'bg') {
						const { r, g, b, a } = unpackColor(value >>> 0);
						const toHex = (n: number): string => n.toString(16).padStart(2, '0');
						return `${key}=#${toHex(r)}${toHex(g)}${toHex(b)}${toHex(Math.round(a * 255))}`;
					}
					// Format floats nicely
					if (!Number.isInteger(value)) {
						return `${key}=${value.toFixed(2)}`;
					}
				}
				return `${key}=${value}`;
			})
			.join(', ');
		lines.push(`${prefix} ${comp.name}: ${dataStr}`);
	});

	return lines.join('\n');
}

// =============================================================================
// WORLD INSPECTION
// =============================================================================

/**
 * Inspects the world and returns statistics about entities and components.
 *
 * @param world - The ECS world to inspect
 * @returns World inspection data
 *
 * @example
 * ```typescript
 * import { inspectWorld } from 'blecsd/debug';
 *
 * const info = inspectWorld(world);
 * console.log(`Entities: ${info.entityCount}`);
 * console.log(`Position components: ${info.componentCounts['Position']}`);
 * ```
 */
export function inspectWorld(world: World): WorldInspection {
	const entities = getAllEntities(world) as Entity[];
	const componentCounts: Record<string, number> = {};
	const hierarchyRoots: Entity[] = [];

	// Initialize counts
	for (const { name } of KNOWN_COMPONENTS) {
		componentCounts[name] = 0;
	}

	// Count components and find hierarchy roots
	for (const eid of entities) {
		// Count each component type
		for (const { component, name } of KNOWN_COMPONENTS) {
			if (hasComponent(world, eid, component)) {
				const currentCount = componentCounts[name] ?? 0;
				componentCounts[name] = currentCount + 1;
			}
		}

		// Find hierarchy roots (entities with no parent or parent=0)
		if (hasComponent(world, eid, Hierarchy)) {
			const parent = getParent(world, eid);
			if (parent === 0) {
				hierarchyRoots.push(eid);
			}
		}
	}

	return {
		entityCount: entities.length,
		componentCounts,
		hierarchyRoots,
	};
}

/**
 * Formats a world inspection as a human-readable string.
 *
 * @param inspection - The world inspection data
 * @returns Formatted string
 *
 * @example
 * ```typescript
 * import { inspectWorld, formatWorldInspection } from 'blecsd/debug';
 *
 * const info = inspectWorld(world);
 * console.log(formatWorldInspection(info));
 * // World Statistics
 * // ────────────────
 * // Entities: 42
 * // Components:
 * //   Position: 38
 * //   Dimensions: 35
 * //   ...
 * ```
 */
export function formatWorldInspection(inspection: WorldInspection): string {
	const lines: string[] = [];

	lines.push('World Statistics');
	lines.push('────────────────');
	lines.push(`Entities: ${inspection.entityCount}`);
	lines.push('');
	lines.push('Components:');

	// Sort by count descending
	const sortedCounts = Object.entries(inspection.componentCounts)
		.filter(([, count]) => count > 0)
		.sort(([, a], [, b]) => b - a);

	for (const [name, count] of sortedCounts) {
		const percentage = ((count / inspection.entityCount) * 100).toFixed(0);
		lines.push(`  ${name}: ${count} (${percentage}%)`);
	}

	if (inspection.hierarchyRoots.length > 0) {
		lines.push('');
		lines.push(`Hierarchy Roots: [${inspection.hierarchyRoots.join(', ')}]`);
	}

	return lines.join('\n');
}

// =============================================================================
// HELPER UTILITIES
// =============================================================================

/** Collects state flags for entity summary. */
export function collectEntityFlags(world: World, eid: Entity): string[] {
	const flags: string[] = [];
	if (hasComponent(world, eid, Focusable) && isFocused(world, eid)) flags.push('focused');
	if (hasComponent(world, eid, Interactive)) {
		if (isHovered(world, eid)) flags.push('hovered');
		if (isPressed(world, eid)) flags.push('pressed');
	}
	if (hasAnimation(world, eid)) flags.push('animated');
	if (hasBorder(world, eid)) flags.push('bordered');
	return flags;
}
