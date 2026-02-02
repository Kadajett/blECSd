/**
 * Screen Component
 *
 * Provides the Screen component for the root terminal screen entity.
 * The Screen component tracks cursor state, focus, hover, and screen settings.
 *
 * Note: Use createScreenEntity from core/entities to create screen entities.
 * This module provides the Screen component and helper functions.
 *
 * @module components/screen
 *
 * @example
 * ```typescript
 * import { createWorld } from 'blecsd';
 * import { createScreenEntity } from 'blecsd';
 * import {
 *   getScreen,
 *   getScreenCursor,
 *   setScreenCursor,
 *   getScreenFocus,
 *   setScreenFocus,
 * } from 'blecsd';
 *
 * const world = createWorld();
 * const screen = createScreenEntity(world, { width: 80, height: 24 });
 *
 * // Track cursor position
 * setScreenCursor(world, screen, 10, 5);
 *
 * // Track focused entity
 * setScreenFocus(world, screen, buttonEntity);
 * ```
 */

import { addComponent, hasComponent } from 'bitecs';
import type { Entity, World } from '../core/types';
import { getDimensions, setDimensions } from './dimensions';
import { NULL_ENTITY } from './hierarchy';
import { Renderable } from './renderable';

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

/**
 * Cursor shape types for terminal cursor rendering.
 */
export const CursorShape = {
	/** Standard block cursor */
	BLOCK: 0,
	/** Underline cursor */
	UNDERLINE: 1,
	/** Vertical bar cursor */
	BAR: 2,
	/** Blinking block cursor */
	BLINKING_BLOCK: 3,
	/** Blinking underline cursor */
	BLINKING_UNDERLINE: 4,
	/** Blinking vertical bar cursor */
	BLINKING_BAR: 5,
} as const;

export type CursorShapeValue = (typeof CursorShape)[keyof typeof CursorShape];

/**
 * Screen component store using SoA (Structure of Arrays) for performance.
 *
 * - `cursorX`, `cursorY`: Current cursor position
 * - `cursorVisible`: Whether the cursor should be shown
 * - `cursorShape`: Cursor appearance (block, underline, bar)
 * - `focused`: Entity ID of currently focused element
 * - `hovered`: Entity ID of currently hovered element
 * - `fullUnicode`: Enable full Unicode support
 * - `autoPadding`: Enable automatic padding calculation
 *
 * @example
 * ```typescript
 * import { Screen, hasScreen, getScreenCursor } from 'blecsd';
 *
 * if (hasScreen(world, entity)) {
 *   const cursor = getScreenCursor(world, entity);
 *   console.log(`Cursor at ${cursor.x}, ${cursor.y}`);
 * }
 * ```
 */
export const Screen = {
	/** Cursor X position */
	cursorX: new Uint16Array(DEFAULT_CAPACITY),
	/** Cursor Y position */
	cursorY: new Uint16Array(DEFAULT_CAPACITY),
	/** Cursor visibility (0 = hidden, 1 = visible) */
	cursorVisible: new Uint8Array(DEFAULT_CAPACITY),
	/** Cursor shape type */
	cursorShape: new Uint8Array(DEFAULT_CAPACITY),
	/** Currently focused entity ID */
	focused: new Uint32Array(DEFAULT_CAPACITY),
	/** Currently hovered entity ID */
	hovered: new Uint32Array(DEFAULT_CAPACITY),
	/** Full Unicode support enabled (0 = disabled, 1 = enabled) */
	fullUnicode: new Uint8Array(DEFAULT_CAPACITY),
	/** Auto padding enabled (0 = disabled, 1 = enabled) */
	autoPadding: new Uint8Array(DEFAULT_CAPACITY),
};

/**
 * Screen cursor state data.
 */
export interface ScreenCursor {
	readonly x: number;
	readonly y: number;
	readonly visible: boolean;
	readonly shape: CursorShapeValue;
}

/**
 * Full screen state data.
 */
export interface ScreenData {
	readonly cursor: ScreenCursor;
	readonly focused: Entity | null;
	readonly hovered: Entity | null;
	readonly fullUnicode: boolean;
	readonly autoPadding: boolean;
	readonly width: number;
	readonly height: number;
}

/**
 * Options for initializing the Screen component.
 */
export interface ScreenOptions {
	cursorVisible?: boolean;
	cursorShape?: CursorShapeValue;
	fullUnicode?: boolean;
	autoPadding?: boolean;
}

// Store for singleton screen entity per world
const screenEntityMap = new WeakMap<World, Entity>();

/**
 * Initializes the Screen component with default values.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param options - Optional screen settings
 *
 * @example
 * ```typescript
 * // Called internally by createScreenEntity
 * initScreenComponent(world, eid, { cursorVisible: true });
 * ```
 */
export function initScreenComponent(world: World, eid: Entity, options: ScreenOptions = {}): void {
	addComponent(world, eid, Screen);
	Screen.cursorX[eid] = 0;
	Screen.cursorY[eid] = 0;
	Screen.cursorVisible[eid] = options.cursorVisible !== false ? 1 : 0;
	Screen.cursorShape[eid] = options.cursorShape ?? CursorShape.BLOCK;
	Screen.focused[eid] = NULL_ENTITY;
	Screen.hovered[eid] = NULL_ENTITY;
	Screen.fullUnicode[eid] = options.fullUnicode !== false ? 1 : 0;
	Screen.autoPadding[eid] = options.autoPadding === true ? 1 : 0;
}

/**
 * Checks if a screen singleton exists for the world.
 *
 * @param world - The ECS world
 * @returns true if a screen already exists
 * @internal
 */
export function hasScreenSingleton(world: World): boolean {
	return screenEntityMap.has(world);
}

/**
 * Registers an entity as the screen singleton.
 * Should only be called by createScreenEntity.
 *
 * @param world - The ECS world
 * @param eid - The screen entity ID
 * @throws {Error} If a screen already exists
 * @internal
 */
export function registerScreenSingleton(world: World, eid: Entity): void {
	if (screenEntityMap.has(world)) {
		throw new Error('A screen already exists in this world. Only one screen is allowed.');
	}
	screenEntityMap.set(world, eid);
}

/**
 * Gets the screen entity for a world.
 *
 * @param world - The ECS world
 * @returns The screen entity, or null if not created
 *
 * @example
 * ```typescript
 * const screen = getScreen(world);
 * if (screen !== null) {
 *   const cursor = getScreenCursor(world, screen);
 * }
 * ```
 */
export function getScreen(world: World): Entity | null {
	return screenEntityMap.get(world) ?? null;
}

/**
 * Checks if an entity is the screen entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID to check
 * @returns true if the entity is the screen
 */
export function isScreen(world: World, eid: Entity): boolean {
	return screenEntityMap.get(world) === eid;
}

/**
 * Checks if an entity has the Screen component.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if entity has Screen component
 */
export function hasScreen(world: World, eid: Entity): boolean {
	return hasComponent(world, eid, Screen);
}

/**
 * Gets the screen cursor state.
 *
 * @param world - The ECS world
 * @param eid - The screen entity ID
 * @returns Cursor state or undefined if not a screen
 *
 * @example
 * ```typescript
 * const cursor = getScreenCursor(world, screen);
 * if (cursor) {
 *   console.log(`Cursor at ${cursor.x}, ${cursor.y}`);
 *   console.log(`Visible: ${cursor.visible}`);
 * }
 * ```
 */
export function getScreenCursor(world: World, eid: Entity): ScreenCursor | undefined {
	if (!hasScreen(world, eid)) {
		return undefined;
	}
	return {
		x: Screen.cursorX[eid] as number,
		y: Screen.cursorY[eid] as number,
		visible: Screen.cursorVisible[eid] === 1,
		shape: Screen.cursorShape[eid] as CursorShapeValue,
	};
}

/**
 * Sets the screen cursor position.
 *
 * @param world - The ECS world
 * @param eid - The screen entity ID
 * @param x - Cursor X position
 * @param y - Cursor Y position
 * @returns true if set successfully
 *
 * @example
 * ```typescript
 * setScreenCursor(world, screen, 10, 5);
 * ```
 */
export function setScreenCursor(world: World, eid: Entity, x: number, y: number): boolean {
	if (!hasScreen(world, eid)) {
		return false;
	}
	Screen.cursorX[eid] = Math.max(0, Math.floor(x));
	Screen.cursorY[eid] = Math.max(0, Math.floor(y));
	return true;
}

/**
 * Sets the screen cursor visibility.
 *
 * @param world - The ECS world
 * @param eid - The screen entity ID
 * @param visible - Whether cursor should be visible
 * @returns true if set successfully
 */
export function setScreenCursorVisible(world: World, eid: Entity, visible: boolean): boolean {
	if (!hasScreen(world, eid)) {
		return false;
	}
	Screen.cursorVisible[eid] = visible ? 1 : 0;
	return true;
}

/**
 * Sets the screen cursor shape.
 *
 * @param world - The ECS world
 * @param eid - The screen entity ID
 * @param shape - Cursor shape type
 * @returns true if set successfully
 */
export function setScreenCursorShape(world: World, eid: Entity, shape: CursorShapeValue): boolean {
	if (!hasScreen(world, eid)) {
		return false;
	}
	Screen.cursorShape[eid] = shape;
	return true;
}

/**
 * Gets the currently focused entity.
 *
 * @param world - The ECS world
 * @param eid - The screen entity ID
 * @returns The focused entity ID, or null if none focused
 *
 * @example
 * ```typescript
 * const focused = getScreenFocus(world, screen);
 * if (focused !== null) {
 *   console.log(`Entity ${focused} is focused`);
 * }
 * ```
 */
export function getScreenFocus(world: World, eid: Entity): Entity | null {
	if (!hasScreen(world, eid)) {
		return null;
	}
	const focused = Screen.focused[eid] as number;
	return focused === NULL_ENTITY ? null : (focused as Entity);
}

/**
 * Sets the currently focused entity.
 *
 * @param world - The ECS world
 * @param eid - The screen entity ID
 * @param focusedEntity - The entity to focus, or null to clear focus
 * @returns true if set successfully
 *
 * @example
 * ```typescript
 * setScreenFocus(world, screen, buttonEntity);
 *
 * // Clear focus
 * setScreenFocus(world, screen, null);
 * ```
 */
export function setScreenFocus(world: World, eid: Entity, focusedEntity: Entity | null): boolean {
	if (!hasScreen(world, eid)) {
		return false;
	}
	Screen.focused[eid] = focusedEntity ?? NULL_ENTITY;
	return true;
}

/**
 * Gets the currently hovered entity.
 *
 * @param world - The ECS world
 * @param eid - The screen entity ID
 * @returns The hovered entity ID, or null if none hovered
 */
export function getScreenHover(world: World, eid: Entity): Entity | null {
	if (!hasScreen(world, eid)) {
		return null;
	}
	const hovered = Screen.hovered[eid] as number;
	return hovered === NULL_ENTITY ? null : (hovered as Entity);
}

/**
 * Sets the currently hovered entity.
 *
 * @param world - The ECS world
 * @param eid - The screen entity ID
 * @param hoveredEntity - The entity being hovered, or null to clear
 * @returns true if set successfully
 */
export function setScreenHover(world: World, eid: Entity, hoveredEntity: Entity | null): boolean {
	if (!hasScreen(world, eid)) {
		return false;
	}
	Screen.hovered[eid] = hoveredEntity ?? NULL_ENTITY;
	return true;
}

/**
 * Gets the full screen data.
 *
 * @param world - The ECS world
 * @param eid - The screen entity ID
 * @returns Full screen data or undefined if not a screen
 *
 * @example
 * ```typescript
 * const data = getScreenData(world, screen);
 * if (data) {
 *   console.log(`Screen: ${data.width}x${data.height}`);
 *   console.log(`Focused: ${data.focused}`);
 * }
 * ```
 */
export function getScreenData(world: World, eid: Entity): ScreenData | undefined {
	if (!hasScreen(world, eid)) {
		return undefined;
	}

	const dims = getDimensions(world, eid);
	const focused = Screen.focused[eid] as number;
	const hovered = Screen.hovered[eid] as number;

	return {
		cursor: {
			x: Screen.cursorX[eid] as number,
			y: Screen.cursorY[eid] as number,
			visible: Screen.cursorVisible[eid] === 1,
			shape: Screen.cursorShape[eid] as CursorShapeValue,
		},
		focused: focused === NULL_ENTITY ? null : (focused as Entity),
		hovered: hovered === NULL_ENTITY ? null : (hovered as Entity),
		fullUnicode: Screen.fullUnicode[eid] === 1,
		autoPadding: Screen.autoPadding[eid] === 1,
		width: dims?.width ?? 0,
		height: dims?.height ?? 0,
	};
}

/**
 * Gets the screen dimensions.
 *
 * @param world - The ECS world
 * @param eid - The screen entity ID
 * @returns Object with width and height, or undefined if not a screen
 *
 * @example
 * ```typescript
 * const size = getScreenSize(world, screen);
 * console.log(`Terminal: ${size?.width}x${size?.height}`);
 * ```
 */
export function getScreenSize(
	world: World,
	eid: Entity,
): { width: number; height: number } | undefined {
	if (!hasScreen(world, eid)) {
		return undefined;
	}
	const dims = getDimensions(world, eid);
	if (!dims) {
		return undefined;
	}
	return { width: dims.width, height: dims.height };
}

/**
 * Resizes the screen.
 *
 * @param world - The ECS world
 * @param eid - The screen entity ID
 * @param width - New width
 * @param height - New height
 * @returns true if resized successfully
 *
 * @example
 * ```typescript
 * // Handle terminal resize
 * process.stdout.on('resize', () => {
 *   resizeScreen(world, screen, process.stdout.columns, process.stdout.rows);
 * });
 * ```
 */
export function resizeScreen(world: World, eid: Entity, width: number, height: number): boolean {
	if (!hasScreen(world, eid)) {
		return false;
	}
	if (width <= 0 || height <= 0) {
		return false;
	}
	setDimensions(world, eid, width, height);
	Renderable.dirty[eid] = 1;
	return true;
}

/**
 * Checks if full Unicode support is enabled.
 *
 * @param world - The ECS world
 * @param eid - The screen entity ID
 * @returns true if full Unicode is enabled
 */
export function isFullUnicode(world: World, eid: Entity): boolean {
	if (!hasScreen(world, eid)) {
		return false;
	}
	return Screen.fullUnicode[eid] === 1;
}

/**
 * Sets full Unicode support.
 *
 * @param world - The ECS world
 * @param eid - The screen entity ID
 * @param enabled - Whether to enable full Unicode
 * @returns true if set successfully
 */
export function setFullUnicode(world: World, eid: Entity, enabled: boolean): boolean {
	if (!hasScreen(world, eid)) {
		return false;
	}
	Screen.fullUnicode[eid] = enabled ? 1 : 0;
	return true;
}

/**
 * Checks if auto padding is enabled.
 *
 * @param world - The ECS world
 * @param eid - The screen entity ID
 * @returns true if auto padding is enabled
 */
export function isAutoPadding(world: World, eid: Entity): boolean {
	if (!hasScreen(world, eid)) {
		return false;
	}
	return Screen.autoPadding[eid] === 1;
}

/**
 * Sets auto padding.
 *
 * @param world - The ECS world
 * @param eid - The screen entity ID
 * @param enabled - Whether to enable auto padding
 * @returns true if set successfully
 */
export function setAutoPadding(world: World, eid: Entity, enabled: boolean): boolean {
	if (!hasScreen(world, eid)) {
		return false;
	}
	Screen.autoPadding[eid] = enabled ? 1 : 0;
	return true;
}

/**
 * Removes the screen entity from the world.
 * Clears the singleton reference.
 *
 * @param world - The ECS world
 * @returns true if screen was removed
 */
export function destroyScreen(world: World): boolean {
	const screen = screenEntityMap.get(world);
	if (screen === undefined) {
		return false;
	}

	// Remove from singleton map
	screenEntityMap.delete(world);

	// Note: The entity itself should be removed using bitecs removeEntity
	// but we don't have direct access here. The caller should handle that.

	return true;
}

/**
 * Resets the screen singleton state. Used for testing.
 * @internal
 */
export function resetScreenSingleton(world: World): void {
	screenEntityMap.delete(world);
}
