/**
 * Renderable component for visual styling of entities.
 * @module components/renderable
 */

import { addComponent, hasComponent } from '../core/ecs';
import type { Entity, World } from '../core/types';
import { StyleOptionsSchema } from '../schemas/components';
import { packColor, parseColor } from '../utils/color';
import { getAncestors, hasHierarchy, isRoot } from './hierarchy';

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

// Re-export color utilities for backwards compatibility
export { colorToHex, hexToColor, packColor, unpackColor } from '../utils/color';

/**
 * Default foreground color (white).
 */
export const DEFAULT_FG = packColor(255, 255, 255);

/**
 * Default background color (black, fully transparent).
 */
export const DEFAULT_BG = packColor(0, 0, 0, 0);

/**
 * Renderable component store using SoA (Structure of Arrays) for performance.
 *
 * - `visible`: Whether entity should be rendered (0=hidden, 1=visible)
 * - `dirty`: Whether entity needs redraw (0=clean, 1=dirty)
 * - `fg`: Foreground color (packed RGBA)
 * - `bg`: Background color (packed RGBA)
 * - `bold`, `underline`, `blink`, `inverse`: Text styling flags
 * - `transparent`: Whether background is transparent
 *
 * @example
 * ```typescript
 * import { Renderable, setStyle, getStyle, markDirty } from 'blecsd';
 *
 * setStyle(world, entity, { fg: '#ff0000', bold: true });
 * markDirty(world, entity);
 *
 * const style = getStyle(world, entity);
 * console.log(style.bold); // true
 * ```
 */
export const Renderable = {
	/** 0 = hidden, 1 = visible */
	visible: new Uint8Array(DEFAULT_CAPACITY),
	/** 0 = clean, 1 = needs redraw */
	dirty: new Uint8Array(DEFAULT_CAPACITY),
	/** Foreground color (packed RGBA) */
	fg: new Uint32Array(DEFAULT_CAPACITY),
	/** Background color (packed RGBA) */
	bg: new Uint32Array(DEFAULT_CAPACITY),
	/** Bold text */
	bold: new Uint8Array(DEFAULT_CAPACITY),
	/** Underlined text */
	underline: new Uint8Array(DEFAULT_CAPACITY),
	/** Blinking text */
	blink: new Uint8Array(DEFAULT_CAPACITY),
	/** Inverse colors */
	inverse: new Uint8Array(DEFAULT_CAPACITY),
	/** Transparent background */
	transparent: new Uint8Array(DEFAULT_CAPACITY),
	/** Opacity for alpha blending (0-255, where 255 = fully opaque) */
	opacity: new Uint8Array(DEFAULT_CAPACITY),
};

/**
 * Style options for setStyle.
 */
export interface StyleOptions {
	/** Foreground color (hex string or packed number) */
	fg?: string | number;
	/** Background color (hex string or packed number) */
	bg?: string | number;
	/** Bold text */
	bold?: boolean;
	/** Underlined text */
	underline?: boolean;
	/** Blinking text */
	blink?: boolean;
	/** Inverse colors */
	inverse?: boolean;
	/** Transparent background */
	transparent?: boolean;
	/** Opacity for alpha blending (0-1, where 1 = fully opaque) */
	opacity?: number;
}

/**
 * Style data returned by getStyle.
 */
export interface StyleData {
	readonly fg: number;
	readonly bg: number;
	readonly bold: boolean;
	readonly underline: boolean;
	readonly blink: boolean;
	readonly inverse: boolean;
	readonly transparent: boolean;
	/** Opacity value (0-1, where 1 = fully opaque) */
	readonly opacity: number;
}

/**
 * Renderable data returned by getRenderable.
 */
export interface RenderableData extends StyleData {
	readonly visible: boolean;
	readonly dirty: boolean;
}

/**
 * Initializes a Renderable component with default values.
 */
function initRenderable(eid: Entity): void {
	Renderable.visible[eid] = 1;
	Renderable.dirty[eid] = 1;
	Renderable.fg[eid] = DEFAULT_FG;
	Renderable.bg[eid] = DEFAULT_BG;
	Renderable.bold[eid] = 0;
	Renderable.underline[eid] = 0;
	Renderable.blink[eid] = 0;
	Renderable.inverse[eid] = 0;
	Renderable.transparent[eid] = 0;
	Renderable.opacity[eid] = 255; // Fully opaque by default
}

/**
 * Ensures an entity has the Renderable component, initializing if needed.
 */
function ensureRenderable(world: World, eid: Entity): void {
	if (!hasComponent(world, eid, Renderable)) {
		addComponent(world, eid, Renderable);
		initRenderable(eid);
	}
}

/**
 * Sets the visual style of an entity.
 * Adds the Renderable component if not already present.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param style - Style options to apply
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { createWorld, addEntity } from '../core/ecs';
 * import { setStyle } from 'blecsd';
 *
 * const world = createWorld();
 * const entity = addEntity(world);
 *
 * // Set style with hex colors
 * setStyle(world, entity, {
 *   fg: '#ff0000',
 *   bg: '#000000',
 *   bold: true,
 * });
 *
 * // Or with packed colors
 * setStyle(world, entity, { fg: 0xffff0000 });
 * ```
 */
export function setStyle(world: World, eid: Entity, style: StyleOptions): Entity {
	StyleOptionsSchema.parse(style);
	ensureRenderable(world, eid);
	applyStyleOptions(eid, style);
	Renderable.dirty[eid] = 1;
	return eid;
}

/**
 * Applies color options to a renderable entity.
 * @internal
 */
function applyColorOptions(eid: Entity, style: StyleOptions): void {
	if (style.fg !== undefined) Renderable.fg[eid] = parseColor(style.fg);
	if (style.bg !== undefined) Renderable.bg[eid] = parseColor(style.bg);
}

/**
 * Applies text decoration options to a renderable entity.
 * @internal
 */
/** Set a boolean decoration option */
function setDecorationBool(eid: Entity, array: Uint8Array, value: boolean | undefined): void {
	if (value !== undefined) array[eid] = value ? 1 : 0;
}

function applyDecorationOptions(eid: Entity, style: StyleOptions): void {
	setDecorationBool(eid, Renderable.bold, style.bold);
	setDecorationBool(eid, Renderable.underline, style.underline);
	setDecorationBool(eid, Renderable.blink, style.blink);
	setDecorationBool(eid, Renderable.inverse, style.inverse);
	setDecorationBool(eid, Renderable.transparent, style.transparent);

	if (style.opacity !== undefined) {
		const opacityValue = Math.max(0, Math.min(1, style.opacity));
		Renderable.opacity[eid] = Math.round(opacityValue * 255);
	}
}

/**
 * Applies style options to a renderable entity.
 * @internal
 */
function applyStyleOptions(eid: Entity, style: StyleOptions): void {
	applyColorOptions(eid, style);
	applyDecorationOptions(eid, style);
}

/**
 * Gets the style data of an entity.
 * Returns undefined if the entity doesn't have a Renderable component.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns Style data or undefined
 *
 * @example
 * ```typescript
 * import { getStyle, colorToHex } from 'blecsd';
 *
 * const style = getStyle(world, entity);
 * if (style) {
 *   console.log(`FG: ${colorToHex(style.fg)}, Bold: ${style.bold}`);
 * }
 * ```
 */
export function getStyle(world: World, eid: Entity): StyleData | undefined {
	if (!hasComponent(world, eid, Renderable)) {
		return undefined;
	}
	return {
		fg: Renderable.fg[eid] as number,
		bg: Renderable.bg[eid] as number,
		bold: Renderable.bold[eid] === 1,
		underline: Renderable.underline[eid] === 1,
		blink: Renderable.blink[eid] === 1,
		inverse: Renderable.inverse[eid] === 1,
		transparent: Renderable.transparent[eid] === 1,
		opacity: (Renderable.opacity[eid] as number) / 255,
	};
}

/**
 * Gets the full renderable data of an entity.
 * Returns undefined if the entity doesn't have a Renderable component.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns Renderable data or undefined
 */
export function getRenderable(world: World, eid: Entity): RenderableData | undefined {
	if (!hasComponent(world, eid, Renderable)) {
		return undefined;
	}
	return {
		visible: Renderable.visible[eid] === 1,
		dirty: Renderable.dirty[eid] === 1,
		fg: Renderable.fg[eid] as number,
		bg: Renderable.bg[eid] as number,
		bold: Renderable.bold[eid] === 1,
		underline: Renderable.underline[eid] === 1,
		blink: Renderable.blink[eid] === 1,
		inverse: Renderable.inverse[eid] === 1,
		transparent: Renderable.transparent[eid] === 1,
		opacity: (Renderable.opacity[eid] as number) / 255,
	};
}

/**
 * Marks an entity as needing redraw.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { markDirty } from 'blecsd';
 *
 * // After changing entity state, mark for redraw
 * markDirty(world, entity);
 * ```
 */
export function markDirty(world: World, eid: Entity): Entity {
	ensureRenderable(world, eid);
	Renderable.dirty[eid] = 1;
	return eid;
}

/**
 * Marks an entity as clean (no redraw needed).
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns The entity ID for chaining
 */
export function markClean(world: World, eid: Entity): Entity {
	if (hasComponent(world, eid, Renderable)) {
		Renderable.dirty[eid] = 0;
	}
	return eid;
}

/**
 * Checks if an entity needs redraw.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if dirty, false otherwise
 */
export function isDirty(world: World, eid: Entity): boolean {
	if (!hasComponent(world, eid, Renderable)) {
		return false;
	}
	return Renderable.dirty[eid] === 1;
}

/**
 * Sets visibility of an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param visible - true to show, false to hide
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { setVisible } from 'blecsd';
 *
 * setVisible(world, entity, false); // Hide entity
 * setVisible(world, entity, true);  // Show entity
 * ```
 */
export function setVisible(world: World, eid: Entity, visible: boolean): Entity {
	ensureRenderable(world, eid);
	const wasVisible = Renderable.visible[eid] === 1;
	Renderable.visible[eid] = visible ? 1 : 0;
	if (wasVisible !== visible) {
		Renderable.dirty[eid] = 1;
	}
	return eid;
}

/**
 * Checks if an entity is visible.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if visible, false otherwise
 *
 * @example
 * ```typescript
 * import { isVisible } from 'blecsd';
 *
 * if (isVisible(world, entity)) {
 *   // Render the entity
 * }
 * ```
 */
export function isVisible(world: World, eid: Entity): boolean {
	if (!hasComponent(world, eid, Renderable)) {
		return false;
	}
	return Renderable.visible[eid] === 1;
}

/**
 * Checks if an entity has a Renderable component.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if entity has Renderable component
 */
export function hasRenderable(world: World, eid: Entity): boolean {
	return hasComponent(world, eid, Renderable);
}

/**
 * Shows an entity (sets visible to true).
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns The entity ID for chaining
 */
export function show(world: World, eid: Entity): Entity {
	return setVisible(world, eid, true);
}

/**
 * Hides an entity (sets visible to false).
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns The entity ID for chaining
 */
export function hide(world: World, eid: Entity): Entity {
	return setVisible(world, eid, false);
}

/**
 * Toggles an entity's visibility.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { toggle } from 'blecsd';
 *
 * // Toggle visibility on key press
 * toggle(world, menuEntity);
 * ```
 */
export function toggle(world: World, eid: Entity): Entity {
	const currentlyVisible = isVisible(world, eid);
	return setVisible(world, eid, !currentlyVisible);
}

/**
 * Checks if an entity is effectively visible.
 * An entity is effectively visible only if it and all its ancestors are visible.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if entity and all ancestors are visible
 *
 * @example
 * ```typescript
 * import { isEffectivelyVisible, hide, show } from 'blecsd';
 *
 * // Parent is hidden, so child is not effectively visible
 * hide(world, parentEntity);
 * show(world, childEntity);
 * console.log(isEffectivelyVisible(world, childEntity)); // false
 * ```
 */
export function isEffectivelyVisible(world: World, eid: Entity): boolean {
	// Check if entity itself is visible
	if (!isVisible(world, eid)) {
		return false;
	}

	// If entity has no hierarchy, just return its own visibility
	if (!hasHierarchy(world, eid)) {
		return true;
	}

	// Check all ancestors
	const ancestors = getAncestors(world, eid);
	for (const ancestor of ancestors) {
		if (!isVisible(world, ancestor)) {
			return false;
		}
	}

	return true;
}

/**
 * Checks if an entity is detached from the root.
 * An entity is detached if it has a hierarchy but no path to a root entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if entity is detached from root
 *
 * @example
 * ```typescript
 * import { isDetached, removeChild } from 'blecsd';
 *
 * // After removing from parent, entity may be detached
 * removeChild(world, parentEntity, childEntity);
 * console.log(isDetached(world, childEntity)); // true (if no other parent)
 * ```
 */
export function isDetached(world: World, eid: Entity): boolean {
	// Entity without hierarchy is considered attached (standalone root)
	if (!hasHierarchy(world, eid)) {
		return false;
	}

	// If this entity is a root, it's not detached
	if (isRoot(world, eid)) {
		return false;
	}

	// Get ancestors and check if chain leads to a root
	const ancestors = getAncestors(world, eid);
	if (ancestors.length === 0) {
		// Has hierarchy but no ancestors and not a root - might be detached
		// Check if parent is NULL_ENTITY
		return true;
	}

	// Check if the last ancestor (topmost) is a root
	const topmostAncestor = ancestors[ancestors.length - 1];
	if (topmostAncestor === undefined) {
		return true;
	}

	return !isRoot(world, topmostAncestor);
}
