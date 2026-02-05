/**
 * Interactive component for mouse/keyboard interaction.
 * @module components/interactive
 */

import { addComponent, hasComponent } from '../core/ecs';
import type { Entity, World } from '../core/types';

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

/** Default hover effect foreground color (white) */
export const DEFAULT_HOVER_FG = 0xffffffff;

/** Default hover effect background color (transparent) */
export const DEFAULT_HOVER_BG = 0x00000000;

/**
 * Interactive component store using SoA (Structure of Arrays) for performance.
 *
 * - `clickable`: Whether entity responds to clicks (0=no, 1=yes)
 * - `draggable`: Whether entity can be dragged (0=no, 1=yes)
 * - `hoverable`: Whether entity responds to hover (0=no, 1=yes)
 * - `hovered`: Current hover state (0=no, 1=yes)
 * - `pressed`: Current pressed state (0=no, 1=yes)
 * - `keyable`: Whether entity receives key events (0=no, 1=yes)
 * - `hoverEffectFg`, `hoverEffectBg`: Colors for hover effect
 *
 * @example
 * ```typescript
 * import { Interactive, setClickable, isHovered, isPressed } from 'blecsd';
 *
 * setInteractive(world, entity, { clickable: true, hoverable: true });
 *
 * if (isHovered(world, entity)) {
 *   console.log('Mouse over entity');
 * }
 * ```
 */
export const Interactive = {
	/** Whether entity responds to clicks (0=no, 1=yes) */
	clickable: new Uint8Array(DEFAULT_CAPACITY),
	/** Whether entity can be dragged (0=no, 1=yes) */
	draggable: new Uint8Array(DEFAULT_CAPACITY),
	/** Whether entity responds to hover (0=no, 1=yes) */
	hoverable: new Uint8Array(DEFAULT_CAPACITY),
	/** Current hover state (0=no, 1=yes) */
	hovered: new Uint8Array(DEFAULT_CAPACITY),
	/** Current pressed state (0=no, 1=yes) */
	pressed: new Uint8Array(DEFAULT_CAPACITY),
	/** Whether entity receives key events (0=no, 1=yes) */
	keyable: new Uint8Array(DEFAULT_CAPACITY),
	/** Whether entity can receive focus (0=no, 1=yes) */
	focusable: new Uint8Array(DEFAULT_CAPACITY),
	/** Current focus state (0=no, 1=yes) */
	focused: new Uint8Array(DEFAULT_CAPACITY),
	/** Tab index for focus order (-1=skip, 0+=order) */
	tabIndex: new Int16Array(DEFAULT_CAPACITY),
	/** Hover effect foreground color */
	hoverEffectFg: new Uint32Array(DEFAULT_CAPACITY),
	/** Hover effect background color */
	hoverEffectBg: new Uint32Array(DEFAULT_CAPACITY),
	/** Focus effect foreground color */
	focusEffectFg: new Uint32Array(DEFAULT_CAPACITY),
	/** Focus effect background color */
	focusEffectBg: new Uint32Array(DEFAULT_CAPACITY),
};

/** Default focus effect foreground color (cyan) */
export const DEFAULT_FOCUS_FG = 0xff00ffff;

/** Default focus effect background color (transparent) */
export const DEFAULT_FOCUS_BG = 0x00000000;

/**
 * Interactive configuration options.
 */
export interface InteractiveOptions {
	/** Whether entity responds to clicks */
	clickable?: boolean;
	/** Whether entity can be dragged */
	draggable?: boolean;
	/** Whether entity responds to hover */
	hoverable?: boolean;
	/** Whether entity receives key events */
	keyable?: boolean;
	/** Whether entity can receive focus */
	focusable?: boolean;
	/** Tab index for focus order (-1=skip, 0+=order) */
	tabIndex?: number;
	/** Hover effect foreground color */
	hoverEffectFg?: number;
	/** Hover effect background color */
	hoverEffectBg?: number;
	/** Focus effect foreground color */
	focusEffectFg?: number;
	/** Focus effect background color */
	focusEffectBg?: number;
}

/**
 * Interactive data returned by getInteractive.
 */
export interface InteractiveData {
	readonly clickable: boolean;
	readonly draggable: boolean;
	readonly hoverable: boolean;
	readonly hovered: boolean;
	readonly pressed: boolean;
	readonly keyable: boolean;
	readonly focusable: boolean;
	readonly focused: boolean;
	readonly tabIndex: number;
	readonly hoverEffectFg: number;
	readonly hoverEffectBg: number;
	readonly focusEffectFg: number;
	readonly focusEffectBg: number;
}

/**
 * Initializes an Interactive component with default values.
 */
function initInteractive(eid: Entity): void {
	Interactive.clickable[eid] = 0;
	Interactive.draggable[eid] = 0;
	Interactive.hoverable[eid] = 0;
	Interactive.hovered[eid] = 0;
	Interactive.pressed[eid] = 0;
	Interactive.keyable[eid] = 0;
	Interactive.focusable[eid] = 0;
	Interactive.focused[eid] = 0;
	Interactive.tabIndex[eid] = 0;
	Interactive.hoverEffectFg[eid] = DEFAULT_HOVER_FG;
	Interactive.hoverEffectBg[eid] = DEFAULT_HOVER_BG;
	Interactive.focusEffectFg[eid] = DEFAULT_FOCUS_FG;
	Interactive.focusEffectBg[eid] = DEFAULT_FOCUS_BG;
}

/**
 * Ensures an entity has the Interactive component, initializing if needed.
 */
function ensureInteractive(world: World, eid: Entity): void {
	if (!hasComponent(world, eid, Interactive)) {
		addComponent(world, eid, Interactive);
		initInteractive(eid);
	}
}

/**
 * Makes an entity interactive with the given options.
 * Adds the Interactive component if not already present.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param options - Interactive configuration options
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { createWorld, addEntity } from '../core/ecs';
 * import { setInteractive } from 'blecsd';
 *
 * const world = createWorld();
 * const entity = addEntity(world);
 *
 * setInteractive(world, entity, {
 *   clickable: true,
 *   hoverable: true,
 *   hoverEffectBg: 0x333333ff,
 * });
 * ```
 */
/** Set a boolean option on Interactive component */
function setBoolOption(eid: Entity, array: Uint8Array, value: boolean | undefined): void {
	if (value !== undefined) array[eid] = value ? 1 : 0;
}

/** Set a numeric option on Interactive component */
function setNumOption(
	eid: Entity,
	array: Int16Array | Uint32Array,
	value: number | undefined,
): void {
	if (value !== undefined) array[eid] = value;
}

export function setInteractive(world: World, eid: Entity, options: InteractiveOptions): Entity {
	ensureInteractive(world, eid);

	setBoolOption(eid, Interactive.clickable, options.clickable);
	setBoolOption(eid, Interactive.draggable, options.draggable);
	setBoolOption(eid, Interactive.hoverable, options.hoverable);
	setBoolOption(eid, Interactive.keyable, options.keyable);
	setBoolOption(eid, Interactive.focusable, options.focusable);
	setNumOption(eid, Interactive.tabIndex, options.tabIndex);
	setNumOption(eid, Interactive.hoverEffectFg, options.hoverEffectFg);
	setNumOption(eid, Interactive.hoverEffectBg, options.hoverEffectBg);
	setNumOption(eid, Interactive.focusEffectFg, options.focusEffectFg);
	setNumOption(eid, Interactive.focusEffectBg, options.focusEffectBg);

	return eid;
}

/**
 * Sets whether an entity is clickable.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param clickable - Whether entity responds to clicks
 * @returns The entity ID for chaining
 */
export function setClickable(world: World, eid: Entity, clickable: boolean): Entity {
	ensureInteractive(world, eid);
	Interactive.clickable[eid] = clickable ? 1 : 0;
	return eid;
}

/**
 * Sets whether an entity is draggable.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param draggable - Whether entity can be dragged
 * @returns The entity ID for chaining
 */
export function setDraggable(world: World, eid: Entity, draggable: boolean): Entity {
	ensureInteractive(world, eid);
	Interactive.draggable[eid] = draggable ? 1 : 0;
	return eid;
}

/**
 * Sets whether an entity is hoverable.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param hoverable - Whether entity responds to hover
 * @returns The entity ID for chaining
 */
export function setHoverable(world: World, eid: Entity, hoverable: boolean): Entity {
	ensureInteractive(world, eid);
	Interactive.hoverable[eid] = hoverable ? 1 : 0;
	return eid;
}

/**
 * Sets whether an entity receives key events.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param keyable - Whether entity receives key events
 * @returns The entity ID for chaining
 */
export function setKeyable(world: World, eid: Entity, keyable: boolean): Entity {
	ensureInteractive(world, eid);
	Interactive.keyable[eid] = keyable ? 1 : 0;
	return eid;
}

/**
 * Checks if an entity is currently hovered.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if entity is hovered
 *
 * @example
 * ```typescript
 * import { isHovered } from 'blecsd';
 *
 * if (isHovered(world, entity)) {
 *   // Apply hover styling
 * }
 * ```
 */
export function isHovered(world: World, eid: Entity): boolean {
	if (!hasComponent(world, eid, Interactive)) {
		return false;
	}
	return Interactive.hovered[eid] === 1;
}

/**
 * Checks if an entity is currently pressed.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if entity is pressed
 *
 * @example
 * ```typescript
 * import { isPressed } from 'blecsd';
 *
 * if (isPressed(world, entity)) {
 *   // Apply pressed styling
 * }
 * ```
 */
export function isPressed(world: World, eid: Entity): boolean {
	if (!hasComponent(world, eid, Interactive)) {
		return false;
	}
	return Interactive.pressed[eid] === 1;
}

/**
 * Checks if an entity is clickable.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if entity is clickable
 */
export function isClickable(world: World, eid: Entity): boolean {
	if (!hasComponent(world, eid, Interactive)) {
		return false;
	}
	return Interactive.clickable[eid] === 1;
}

/**
 * Checks if an entity is draggable.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if entity is draggable
 */
export function isDraggable(world: World, eid: Entity): boolean {
	if (!hasComponent(world, eid, Interactive)) {
		return false;
	}
	return Interactive.draggable[eid] === 1;
}

/**
 * Checks if an entity is hoverable.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if entity is hoverable
 */
export function isHoverable(world: World, eid: Entity): boolean {
	if (!hasComponent(world, eid, Interactive)) {
		return false;
	}
	return Interactive.hoverable[eid] === 1;
}

/**
 * Checks if an entity receives key events.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if entity receives key events
 */
export function isKeyable(world: World, eid: Entity): boolean {
	if (!hasComponent(world, eid, Interactive)) {
		return false;
	}
	return Interactive.keyable[eid] === 1;
}

/**
 * Sets the hover state of an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param hovered - Whether entity is hovered
 * @returns The entity ID for chaining
 */
export function setHovered(world: World, eid: Entity, hovered: boolean): Entity {
	ensureInteractive(world, eid);
	Interactive.hovered[eid] = hovered ? 1 : 0;
	return eid;
}

/**
 * Sets the pressed state of an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param pressed - Whether entity is pressed
 * @returns The entity ID for chaining
 */
export function setPressed(world: World, eid: Entity, pressed: boolean): Entity {
	ensureInteractive(world, eid);
	Interactive.pressed[eid] = pressed ? 1 : 0;
	return eid;
}

/**
 * Checks if an entity can receive focus.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if entity is focusable
 *
 * @example
 * ```typescript
 * import { isFocusable } from 'blecsd';
 *
 * if (isFocusable(world, entity)) {
 *   // Can focus this entity
 * }
 * ```
 */
export function isFocusable(world: World, eid: Entity): boolean {
	if (!hasComponent(world, eid, Interactive)) {
		return false;
	}
	return Interactive.focusable[eid] === 1;
}

/**
 * Checks if an entity is currently focused.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if entity is focused
 *
 * @example
 * ```typescript
 * import { isFocused } from 'blecsd';
 *
 * if (isFocused(world, entity)) {
 *   // Draw focus ring
 * }
 * ```
 */
export function isFocused(world: World, eid: Entity): boolean {
	if (!hasComponent(world, eid, Interactive)) {
		return false;
	}
	return Interactive.focused[eid] === 1;
}

/**
 * Sets whether an entity can receive focus.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param focusable - Whether entity can be focused
 * @returns The entity ID for chaining
 */
export function setFocusable(world: World, eid: Entity, focusable: boolean): Entity {
	ensureInteractive(world, eid);
	Interactive.focusable[eid] = focusable ? 1 : 0;
	return eid;
}

/**
 * Sets the focus state of an entity.
 * Note: This only sets the component state. Use the focus system for
 * proper focus management with events.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param focused - Whether entity is focused
 * @returns The entity ID for chaining
 */
export function setFocusedState(world: World, eid: Entity, focused: boolean): Entity {
	ensureInteractive(world, eid);
	Interactive.focused[eid] = focused ? 1 : 0;
	return eid;
}

/**
 * Gets the tab index of an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns Tab index (-1 if not focusable via tab, 0+ for order)
 */
export function getTabIndex(world: World, eid: Entity): number {
	if (!hasComponent(world, eid, Interactive)) {
		return -1;
	}
	return Interactive.tabIndex[eid] as number;
}

/**
 * Sets the tab index of an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param tabIndex - Tab index (-1=skip, 0+=order)
 * @returns The entity ID for chaining
 */
export function setTabIndex(world: World, eid: Entity, tabIndex: number): Entity {
	ensureInteractive(world, eid);
	Interactive.tabIndex[eid] = tabIndex;
	return eid;
}

/**
 * Gets the focus effect colors.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns Focus effect colors or undefined
 */
export function getFocusEffect(world: World, eid: Entity): { fg: number; bg: number } | undefined {
	if (!hasComponent(world, eid, Interactive)) {
		return undefined;
	}
	return {
		fg: Interactive.focusEffectFg[eid] as number,
		bg: Interactive.focusEffectBg[eid] as number,
	};
}

/**
 * Sets the focus effect colors.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param fg - Focus effect foreground color
 * @param bg - Focus effect background color
 * @returns The entity ID for chaining
 */
export function setFocusEffect(world: World, eid: Entity, fg: number, bg: number): Entity {
	ensureInteractive(world, eid);
	Interactive.focusEffectFg[eid] = fg;
	Interactive.focusEffectBg[eid] = bg;
	return eid;
}

/**
 * Gets the interactive data of an entity.
 * Returns undefined if no Interactive component.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns Interactive data or undefined
 */
export function getInteractive(world: World, eid: Entity): InteractiveData | undefined {
	if (!hasComponent(world, eid, Interactive)) {
		return undefined;
	}
	return {
		clickable: Interactive.clickable[eid] === 1,
		draggable: Interactive.draggable[eid] === 1,
		hoverable: Interactive.hoverable[eid] === 1,
		hovered: Interactive.hovered[eid] === 1,
		pressed: Interactive.pressed[eid] === 1,
		keyable: Interactive.keyable[eid] === 1,
		focusable: Interactive.focusable[eid] === 1,
		focused: Interactive.focused[eid] === 1,
		tabIndex: Interactive.tabIndex[eid] as number,
		hoverEffectFg: Interactive.hoverEffectFg[eid] as number,
		hoverEffectBg: Interactive.hoverEffectBg[eid] as number,
		focusEffectFg: Interactive.focusEffectFg[eid] as number,
		focusEffectBg: Interactive.focusEffectBg[eid] as number,
	};
}

/**
 * Checks if an entity has an Interactive component.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if entity has Interactive component
 */
export function hasInteractive(world: World, eid: Entity): boolean {
	return hasComponent(world, eid, Interactive);
}

/**
 * Clears the hover and pressed states of an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns The entity ID for chaining
 */
export function clearInteractionState(world: World, eid: Entity): Entity {
	if (!hasComponent(world, eid, Interactive)) {
		return eid;
	}
	Interactive.hovered[eid] = 0;
	Interactive.pressed[eid] = 0;
	Interactive.focused[eid] = 0;
	return eid;
}

// =============================================================================
// ENABLE INPUT CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Enables mouse events on an entity.
 * Sets clickable and hoverable to true.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { enableMouse, isClickable, isHoverable } from 'blecsd';
 *
 * enableMouse(world, button);
 *
 * isClickable(world, button); // true
 * isHoverable(world, button); // true
 * ```
 */
export function enableMouse(world: World, eid: Entity): Entity {
	ensureInteractive(world, eid);
	Interactive.clickable[eid] = 1;
	Interactive.hoverable[eid] = 1;
	return eid;
}

/**
 * Disables mouse events on an entity.
 * Sets clickable and hoverable to false.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { enableMouse, disableMouse, isClickable } from 'blecsd';
 *
 * enableMouse(world, button);
 * disableMouse(world, button);
 *
 * isClickable(world, button); // false
 * ```
 */
export function disableMouse(world: World, eid: Entity): Entity {
	if (!hasComponent(world, eid, Interactive)) {
		return eid;
	}
	Interactive.clickable[eid] = 0;
	Interactive.hoverable[eid] = 0;
	return eid;
}

/**
 * Enables key events on an entity.
 * Sets keyable to true.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { enableKeys, isKeyable } from 'blecsd';
 *
 * enableKeys(world, textInput);
 *
 * isKeyable(world, textInput); // true
 * ```
 */
export function enableKeys(world: World, eid: Entity): Entity {
	ensureInteractive(world, eid);
	Interactive.keyable[eid] = 1;
	return eid;
}

/**
 * Disables key events on an entity.
 * Sets keyable to false.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { enableKeys, disableKeys, isKeyable } from 'blecsd';
 *
 * enableKeys(world, textInput);
 * disableKeys(world, textInput);
 *
 * isKeyable(world, textInput); // false
 * ```
 */
export function disableKeys(world: World, eid: Entity): Entity {
	if (!hasComponent(world, eid, Interactive)) {
		return eid;
	}
	Interactive.keyable[eid] = 0;
	return eid;
}

/**
 * Enables all input (mouse and keys) on an entity.
 * Sets clickable, hoverable, and keyable to true.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { enableInput, isClickable, isHoverable, isKeyable } from 'blecsd';
 *
 * enableInput(world, widget);
 *
 * isClickable(world, widget); // true
 * isHoverable(world, widget); // true
 * isKeyable(world, widget);   // true
 * ```
 */
export function enableInput(world: World, eid: Entity): Entity {
	ensureInteractive(world, eid);
	Interactive.clickable[eid] = 1;
	Interactive.hoverable[eid] = 1;
	Interactive.keyable[eid] = 1;
	return eid;
}

/**
 * Disables all input (mouse and keys) on an entity.
 * Sets clickable, hoverable, and keyable to false.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { enableInput, disableInput, isClickable } from 'blecsd';
 *
 * enableInput(world, widget);
 * disableInput(world, widget);
 *
 * isClickable(world, widget); // false
 * ```
 */
export function disableInput(world: World, eid: Entity): Entity {
	if (!hasComponent(world, eid, Interactive)) {
		return eid;
	}
	Interactive.clickable[eid] = 0;
	Interactive.hoverable[eid] = 0;
	Interactive.keyable[eid] = 0;
	return eid;
}

/**
 * Checks if an entity has mouse input enabled.
 * Returns true if either clickable or hoverable is enabled.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if mouse input is enabled
 */
export function hasMouseEnabled(world: World, eid: Entity): boolean {
	if (!hasComponent(world, eid, Interactive)) {
		return false;
	}
	return Interactive.clickable[eid] === 1 || Interactive.hoverable[eid] === 1;
}

/**
 * Checks if an entity has key input enabled.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if key input is enabled
 */
export function hasKeysEnabled(world: World, eid: Entity): boolean {
	if (!hasComponent(world, eid, Interactive)) {
		return false;
	}
	return Interactive.keyable[eid] === 1;
}

/**
 * Checks if an entity has any input enabled (mouse or keys).
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if any input is enabled
 */
export function hasInputEnabled(world: World, eid: Entity): boolean {
	if (!hasComponent(world, eid, Interactive)) {
		return false;
	}
	return (
		Interactive.clickable[eid] === 1 ||
		Interactive.hoverable[eid] === 1 ||
		Interactive.keyable[eid] === 1
	);
}
