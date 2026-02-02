/**
 * Focus Management System
 *
 * Handles keyboard focus navigation and focus state management.
 * Tracks which entity is focused and provides tab/arrow navigation.
 *
 * @module systems/focusSystem
 *
 * @example
 * ```typescript
 * import {
 *   focusSystem,
 *   focusNext,
 *   focusPrev,
 *   focusEntity,
 *   getFocused,
 *   blurAll,
 * } from 'blecsd';
 *
 * // Register with scheduler
 * const scheduler = createScheduler();
 * scheduler.registerSystem(LoopPhase.INPUT, focusSystem);
 *
 * // Navigate focus
 * focusNext(world);  // Focus next element
 * focusPrev(world);  // Focus previous element
 *
 * // Direct focus
 * focusEntity(world, buttonEntity);
 *
 * // Check current focus
 * const focused = getFocused(world);
 * ```
 */

import { query } from 'bitecs';
import type { Entity, System, World } from '../core/types';
import { getScreen, Screen, setScreenFocus } from '../components/screen';
import { Position } from '../components/position';
import { Renderable, markDirty } from '../components/renderable';
import {
	Interactive,
	isFocusable,
	setFocusedState,
} from '../components/interactive';
import { NULL_ENTITY } from '../components/hierarchy';
import { isEffectivelyVisible } from '../components/renderable';
import { createEventBus, type EventBus } from '../core/events';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Focus event types.
 */
export type FocusEventType = 'focus' | 'blur';

/**
 * Focus event data.
 */
export interface FocusEventData {
	/** The entity gaining/losing focus */
	readonly entity: Entity;
	/** The previously focused entity (for focus events) */
	readonly previousEntity: Entity | null;
	/** The next focused entity (for blur events) */
	readonly nextEntity: Entity | null;
}

/**
 * Focus event map for type-safe event handling.
 */
export interface FocusEventMap {
	focus: FocusEventData;
	blur: FocusEventData;
}

/**
 * Focusable entity with sort order.
 */
interface FocusableEntity {
	eid: Entity;
	tabIndex: number;
	y: number;
	x: number;
}

// =============================================================================
// MODULE STATE
// =============================================================================

/** Event bus for focus events */
let focusEventBus: EventBus<FocusEventMap> | null = null;

// =============================================================================
// EVENT BUS
// =============================================================================

/**
 * Gets the focus event bus, creating if needed.
 *
 * @returns The focus event bus
 *
 * @example
 * ```typescript
 * const bus = getFocusEventBus();
 * bus.on('focus', (data) => {
 *   console.log(`Entity ${data.entity} focused`);
 * });
 * ```
 */
export function getFocusEventBus(): EventBus<FocusEventMap> {
	if (!focusEventBus) {
		focusEventBus = createEventBus<FocusEventMap>();
	}
	return focusEventBus;
}

/**
 * Resets the focus event bus. Used for testing.
 * @internal
 */
export function resetFocusEventBus(): void {
	focusEventBus = null;
}

// =============================================================================
// FOCUS QUERIES
// =============================================================================

/**
 * Query for focusable entities.
 */
const focusableQuery = (world: World) =>
	query(world, [Position, Renderable, Interactive]);

/**
 * Gets all focusable entities sorted by tab order.
 *
 * @param world - The ECS world
 * @returns Sorted array of focusable entity IDs
 */
export function getFocusableEntities(world: World): Entity[] {
	const entities = focusableQuery(world);
	const focusable: FocusableEntity[] = [];

	for (const eid of entities) {
		// Must be focusable
		if (!isFocusable(world, eid as Entity)) {
			continue;
		}

		// Must be visible
		if (!isEffectivelyVisible(world, eid as Entity)) {
			continue;
		}

		// Must have non-negative tab index (negative = skip)
		const tabIndex = Interactive.tabIndex[eid] as number;
		if (tabIndex < 0) {
			continue;
		}

		focusable.push({
			eid: eid as Entity,
			tabIndex,
			y: Position.y[eid] as number,
			x: Position.x[eid] as number,
		});
	}

	// Sort by tab index (0 comes after positive numbers), then by position
	focusable.sort((a, b) => {
		// Entities with tabIndex > 0 come first, sorted by tabIndex
		// Entities with tabIndex = 0 come after, sorted by position
		if (a.tabIndex !== 0 && b.tabIndex !== 0) {
			return a.tabIndex - b.tabIndex;
		}
		if (a.tabIndex !== 0) {
			return -1; // a comes first
		}
		if (b.tabIndex !== 0) {
			return 1; // b comes first
		}

		// Both have tabIndex = 0, sort by position (top to bottom, left to right)
		if (a.y !== b.y) {
			return a.y - b.y;
		}
		return a.x - b.x;
	});

	return focusable.map((f) => f.eid);
}

// =============================================================================
// FOCUS MANAGEMENT
// =============================================================================

/**
 * Gets the currently focused entity.
 *
 * @param world - The ECS world
 * @returns The focused entity or null if none focused
 *
 * @example
 * ```typescript
 * const focused = getFocused(world);
 * if (focused) {
 *   console.log(`Entity ${focused} is focused`);
 * }
 * ```
 */
export function getFocused(world: World): Entity | null {
	const screen = getScreen(world);
	if (!screen) {
		return null;
	}

	const focusedValue = Screen.focused[screen] as number;
	if (focusedValue === NULL_ENTITY) {
		return null;
	}

	return focusedValue as Entity;
}

/**
 * Internal function to set focus and emit events.
 */
function setFocusInternal(
	world: World,
	screen: Entity,
	newEntity: Entity | null,
	previousEntity: Entity | null,
): void {
	const bus = getFocusEventBus();

	// Blur previous entity
	if (previousEntity !== null) {
		setFocusedState(world, previousEntity, false);
		markDirty(world, previousEntity);
		bus.emit('blur', {
			entity: previousEntity,
			previousEntity: null,
			nextEntity: newEntity,
		});
	}

	// Focus new entity
	if (newEntity !== null) {
		setFocusedState(world, newEntity, true);
		markDirty(world, newEntity);
		bus.emit('focus', {
			entity: newEntity,
			previousEntity,
			nextEntity: null,
		});
	}

	// Update screen focus
	setScreenFocus(world, screen, newEntity);
}

/**
 * Focuses a specific entity.
 *
 * @param world - The ECS world
 * @param eid - The entity to focus
 * @returns true if focus was set successfully
 *
 * @example
 * ```typescript
 * focusEntity(world, buttonEntity);
 * ```
 */
export function focusEntity(world: World, eid: Entity): boolean {
	const screen = getScreen(world);
	if (!screen) {
		return false;
	}

	// Verify entity is focusable and visible
	if (!isFocusable(world, eid) || !isEffectivelyVisible(world, eid)) {
		return false;
	}

	// Get current focus
		const currentFocus = Screen.focused[screen] as number;
	const previousEntity = currentFocus === 0 ? null : (currentFocus as Entity);

	// Already focused
	if (previousEntity === eid) {
		return true;
	}

	setFocusInternal(world, screen, eid, previousEntity);
	return true;
}

/**
 * Removes focus from all entities.
 *
 * @param world - The ECS world
 *
 * @example
 * ```typescript
 * blurAll(world);
 * ```
 */
export function blurAll(world: World): void {
	const screen = getScreen(world);
	if (!screen) {
		return;
	}

		const currentFocus = Screen.focused[screen] as number;
	const previousEntity = currentFocus === 0 ? null : (currentFocus as Entity);

	if (previousEntity !== null) {
		setFocusInternal(world, screen, null, previousEntity);
	}
}

/**
 * Focuses the next focusable entity in tab order.
 *
 * @param world - The ECS world
 * @returns The newly focused entity, or null if none available
 *
 * @example
 * ```typescript
 * // Handle Tab key
 * if (key === 'Tab') {
 *   focusNext(world);
 * }
 * ```
 */
export function focusNext(world: World): Entity | null {
	const screen = getScreen(world);
	if (!screen) {
		return null;
	}

	const focusable = getFocusableEntities(world);
	if (focusable.length === 0) {
		return null;
	}

		const currentFocus = Screen.focused[screen] as number;
	const previousEntity = currentFocus === 0 ? null : (currentFocus as Entity);

	let nextIndex = 0;
	if (previousEntity !== null) {
		const currentIndex = focusable.indexOf(previousEntity);
		if (currentIndex >= 0) {
			nextIndex = (currentIndex + 1) % focusable.length;
		}
	}

	const nextEntity = focusable[nextIndex];
	if (nextEntity === undefined) {
		return null;
	}

	setFocusInternal(world, screen, nextEntity, previousEntity);
	return nextEntity;
}

/**
 * Focuses the previous focusable entity in tab order.
 *
 * @param world - The ECS world
 * @returns The newly focused entity, or null if none available
 *
 * @example
 * ```typescript
 * // Handle Shift+Tab key
 * if (key === 'Tab' && shiftKey) {
 *   focusPrev(world);
 * }
 * ```
 */
export function focusPrev(world: World): Entity | null {
	const screen = getScreen(world);
	if (!screen) {
		return null;
	}

	const focusable = getFocusableEntities(world);
	if (focusable.length === 0) {
		return null;
	}

		const currentFocus = Screen.focused[screen] as number;
	const previousEntity = currentFocus === 0 ? null : (currentFocus as Entity);

	let prevIndex = focusable.length - 1;
	if (previousEntity !== null) {
		const currentIndex = focusable.indexOf(previousEntity);
		if (currentIndex >= 0) {
			prevIndex = (currentIndex - 1 + focusable.length) % focusable.length;
		}
	}

	const prevEntity = focusable[prevIndex];
	if (prevEntity === undefined) {
		return null;
	}

	setFocusInternal(world, screen, prevEntity, previousEntity);
	return prevEntity;
}

/**
 * Focuses the first focusable entity.
 *
 * @param world - The ECS world
 * @returns The focused entity, or null if none available
 */
export function focusFirst(world: World): Entity | null {
	const focusable = getFocusableEntities(world);
	if (focusable.length === 0) {
		return null;
	}

	const firstEntity = focusable[0];
	if (firstEntity === undefined) {
		return null;
	}

	return focusEntity(world, firstEntity) ? firstEntity : null;
}

/**
 * Focuses the last focusable entity.
 *
 * @param world - The ECS world
 * @returns The focused entity, or null if none available
 */
export function focusLast(world: World): Entity | null {
	const focusable = getFocusableEntities(world);
	if (focusable.length === 0) {
		return null;
	}

	const lastEntity = focusable[focusable.length - 1];
	if (lastEntity === undefined) {
		return null;
	}

	return focusEntity(world, lastEntity) ? lastEntity : null;
}

// =============================================================================
// FOCUS SYSTEM
// =============================================================================

/**
 * Focus system that processes focus-related input.
 *
 * Currently this system validates focus state (ensuring focused entity
 * is still focusable and visible). Tab key handling should be done
 * in the input system or user code.
 *
 * @param world - The ECS world
 * @returns The world
 *
 * @example
 * ```typescript
 * import { focusSystem, createScheduler, LoopPhase } from 'blecsd';
 *
 * const scheduler = createScheduler();
 * scheduler.registerSystem(LoopPhase.INPUT, focusSystem);
 * ```
 */
export const focusSystem: System = (world: World): World => {
	const screen = getScreen(world);
	if (!screen) {
		return world;
	}

	// Validate current focus
		const currentFocus = Screen.focused[screen] as number;

	if (currentFocus !== 0) {
		const focusedEntity = currentFocus as Entity;

		// Check if still focusable and visible
		if (!isFocusable(world, focusedEntity) || !isEffectivelyVisible(world, focusedEntity)) {
			// Lost focus, blur and try to focus next
			setFocusInternal(world, screen, null, focusedEntity);
		}
	}

	return world;
};

/**
 * Creates a focus system.
 *
 * @returns A new focus system function
 */
export function createFocusSystem(): System {
	return focusSystem;
}
