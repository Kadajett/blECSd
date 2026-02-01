/**
 * Focusable component for focus management.
 * @module components/focusable
 */

import { addComponent, hasComponent } from 'bitecs';
import type { Entity, World } from '../core/types';

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

/** Default focus effect foreground color (white) */
export const DEFAULT_FOCUS_FG = 0xffffffff;

/** Default focus effect background color (transparent) */
export const DEFAULT_FOCUS_BG = 0x00000000;

/**
 * Focusable component store using SoA (Structure of Arrays) for performance.
 *
 * - `focusable`: Whether entity can receive focus (0=no, 1=yes)
 * - `focused`: Whether entity currently has focus (0=no, 1=yes)
 * - `tabIndex`: Tab order (-1 = not in tab order, 0+ = order)
 * - `focusEffectFg`, `focusEffectBg`: Colors for focus effect
 *
 * @example
 * ```typescript
 * import { Focusable, setFocusable, focus, blur, isFocused } from 'blecsd';
 *
 * setFocusable(world, entity, true);
 * focus(world, entity);
 *
 * if (isFocused(world, entity)) {
 *   console.log('Entity has focus');
 * }
 * ```
 */
export const Focusable = {
	/** Whether entity can receive focus (0=no, 1=yes) */
	focusable: new Uint8Array(DEFAULT_CAPACITY),
	/** Whether entity currently has focus (0=no, 1=yes) */
	focused: new Uint8Array(DEFAULT_CAPACITY),
	/** Tab order (-1 = not in tab order) */
	tabIndex: new Int16Array(DEFAULT_CAPACITY),
	/** Focus effect foreground color */
	focusEffectFg: new Uint32Array(DEFAULT_CAPACITY),
	/** Focus effect background color */
	focusEffectBg: new Uint32Array(DEFAULT_CAPACITY),
};

/**
 * Track the currently focused entity globally.
 * Only one entity can have focus at a time.
 */
let currentlyFocused: Entity | null = null;

/**
 * Focusable configuration options.
 */
export interface FocusableOptions {
	/** Whether entity can receive focus */
	focusable?: boolean;
	/** Tab order (-1 = not in tab order) */
	tabIndex?: number;
	/** Focus effect foreground color */
	focusEffectFg?: number;
	/** Focus effect background color */
	focusEffectBg?: number;
}

/**
 * Focus data returned by getFocusable.
 */
export interface FocusableData {
	readonly focusable: boolean;
	readonly focused: boolean;
	readonly tabIndex: number;
	readonly focusEffectFg: number;
	readonly focusEffectBg: number;
}

/**
 * Initializes a Focusable component with default values.
 */
function initFocusable(eid: Entity): void {
	Focusable.focusable[eid] = 1;
	Focusable.focused[eid] = 0;
	Focusable.tabIndex[eid] = 0;
	Focusable.focusEffectFg[eid] = DEFAULT_FOCUS_FG;
	Focusable.focusEffectBg[eid] = DEFAULT_FOCUS_BG;
}

/**
 * Ensures an entity has the Focusable component, initializing if needed.
 */
function ensureFocusable(world: World, eid: Entity): void {
	if (!hasComponent(world, eid, Focusable)) {
		addComponent(world, eid, Focusable);
		initFocusable(eid);
	}
}

/**
 * Makes an entity focusable with the given options.
 * Adds the Focusable component if not already present.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param options - Focusable configuration options
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { createWorld, addEntity } from 'bitecs';
 * import { setFocusable } from 'blecsd';
 *
 * const world = createWorld();
 * const entity = addEntity(world);
 *
 * setFocusable(world, entity, { focusable: true, tabIndex: 1 });
 * ```
 */
export function setFocusable(world: World, eid: Entity, options: FocusableOptions): Entity {
	ensureFocusable(world, eid);

	if (options.focusable !== undefined) Focusable.focusable[eid] = options.focusable ? 1 : 0;
	if (options.tabIndex !== undefined) Focusable.tabIndex[eid] = options.tabIndex;
	if (options.focusEffectFg !== undefined) Focusable.focusEffectFg[eid] = options.focusEffectFg;
	if (options.focusEffectBg !== undefined) Focusable.focusEffectBg[eid] = options.focusEffectBg;

	return eid;
}

/**
 * Makes an entity focusable (simple boolean setter).
 * Adds the Focusable component if not already present.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param focusable - Whether entity can receive focus
 * @returns The entity ID for chaining
 */
export function makeFocusable(world: World, eid: Entity, focusable: boolean): Entity {
	ensureFocusable(world, eid);
	Focusable.focusable[eid] = focusable ? 1 : 0;
	return eid;
}

/**
 * Checks if an entity is currently focused.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if entity has focus
 *
 * @example
 * ```typescript
 * import { isFocused } from 'blecsd';
 *
 * if (isFocused(world, entity)) {
 *   // Handle focused state
 * }
 * ```
 */
export function isFocused(world: World, eid: Entity): boolean {
	if (!hasComponent(world, eid, Focusable)) {
		return false;
	}
	return Focusable.focused[eid] === 1;
}

/**
 * Checks if an entity can receive focus.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if entity can receive focus
 */
export function isFocusable(world: World, eid: Entity): boolean {
	if (!hasComponent(world, eid, Focusable)) {
		return false;
	}
	return Focusable.focusable[eid] === 1;
}

/**
 * Focuses an entity, unfocusing any previously focused entity.
 * Only works if the entity is focusable.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { focus } from 'blecsd';
 *
 * focus(world, entity); // Entity now has focus
 * ```
 */
export function focus(world: World, eid: Entity): Entity {
	ensureFocusable(world, eid);

	// Only focus if focusable
	if (Focusable.focusable[eid] !== 1) {
		return eid;
	}

	// Blur currently focused entity
	if (currentlyFocused !== null && currentlyFocused !== eid) {
		if (hasComponent(world, currentlyFocused, Focusable)) {
			Focusable.focused[currentlyFocused] = 0;
		}
	}

	// Focus this entity
	Focusable.focused[eid] = 1;
	currentlyFocused = eid;

	return eid;
}

/**
 * Removes focus from an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { blur } from 'blecsd';
 *
 * blur(world, entity); // Entity loses focus
 * ```
 */
export function blur(world: World, eid: Entity): Entity {
	if (!hasComponent(world, eid, Focusable)) {
		return eid;
	}

	Focusable.focused[eid] = 0;

	if (currentlyFocused === eid) {
		currentlyFocused = null;
	}

	return eid;
}

/**
 * Gets the focus data of an entity.
 * Returns undefined if no Focusable component.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns Focusable data or undefined
 */
export function getFocusable(world: World, eid: Entity): FocusableData | undefined {
	if (!hasComponent(world, eid, Focusable)) {
		return undefined;
	}
	return {
		focusable: Focusable.focusable[eid] === 1,
		focused: Focusable.focused[eid] === 1,
		tabIndex: Focusable.tabIndex[eid] as number,
		focusEffectFg: Focusable.focusEffectFg[eid] as number,
		focusEffectBg: Focusable.focusEffectBg[eid] as number,
	};
}

/**
 * Checks if an entity has a Focusable component.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if entity has Focusable component
 */
export function hasFocusable(world: World, eid: Entity): boolean {
	return hasComponent(world, eid, Focusable);
}

/**
 * Gets the currently focused entity.
 *
 * @returns The focused entity or null if none
 */
export function getFocusedEntity(): Entity | null {
	return currentlyFocused;
}

/**
 * Sets the tab index of an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param index - Tab index (-1 = not in tab order)
 * @returns The entity ID for chaining
 */
export function setTabIndex(world: World, eid: Entity, index: number): Entity {
	ensureFocusable(world, eid);
	Focusable.tabIndex[eid] = index;
	return eid;
}

/**
 * Gets the tab index of an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns Tab index or -1 if not in tab order
 */
export function getTabIndex(world: World, eid: Entity): number {
	if (!hasComponent(world, eid, Focusable)) {
		return -1;
	}
	return Focusable.tabIndex[eid] as number;
}

/**
 * Checks if an entity is in the tab order.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if entity is in tab order
 */
export function isInTabOrder(world: World, eid: Entity): boolean {
	if (!hasComponent(world, eid, Focusable)) {
		return false;
	}
	return (Focusable.tabIndex[eid] as number) >= 0 && Focusable.focusable[eid] === 1;
}

/**
 * Gets entities in tab order.
 * Returns entities sorted by tabIndex (ascending).
 *
 * @param world - The ECS world
 * @param entities - Array of entities to consider
 * @returns Sorted array of entities in tab order
 *
 * @example
 * ```typescript
 * import { getTabOrder } from 'blecsd';
 *
 * const orderedEntities = getTabOrder(world, allEntities);
 * for (const eid of orderedEntities) {
 *   // Process in tab order
 * }
 * ```
 */
export function getTabOrder(world: World, entities: Entity[]): Entity[] {
	return entities
		.filter((eid) => isInTabOrder(world, eid))
		.sort((a, b) => (Focusable.tabIndex[a] as number) - (Focusable.tabIndex[b] as number));
}

/**
 * Focuses the next entity in tab order.
 *
 * @param world - The ECS world
 * @param entities - Array of entities in the focusable set
 * @returns The newly focused entity or null if none
 */
export function focusNext(world: World, entities: Entity[]): Entity | null {
	const tabOrder = getTabOrder(world, entities);
	if (tabOrder.length === 0) {
		return null;
	}

	const currentIndex = currentlyFocused !== null ? tabOrder.indexOf(currentlyFocused) : -1;

	const nextIndex = (currentIndex + 1) % tabOrder.length;
	const nextEntity = tabOrder[nextIndex];

	if (nextEntity !== undefined) {
		focus(world, nextEntity);
		return nextEntity;
	}

	return null;
}

/**
 * Focuses the previous entity in tab order.
 *
 * @param world - The ECS world
 * @param entities - Array of entities in the focusable set
 * @returns The newly focused entity or null if none
 */
export function focusPrev(world: World, entities: Entity[]): Entity | null {
	const tabOrder = getTabOrder(world, entities);
	if (tabOrder.length === 0) {
		return null;
	}

	const currentIndex = currentlyFocused !== null ? tabOrder.indexOf(currentlyFocused) : 0;

	const prevIndex = (currentIndex - 1 + tabOrder.length) % tabOrder.length;
	const prevEntity = tabOrder[prevIndex];

	if (prevEntity !== undefined) {
		focus(world, prevEntity);
		return prevEntity;
	}

	return null;
}

/**
 * Resets the focus state. Useful for testing.
 * @internal
 */
export function resetFocusState(): void {
	currentlyFocused = null;
}
