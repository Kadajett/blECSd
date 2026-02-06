/**
 * Shadow component for element shadow effects.
 *
 * Provides drop shadow rendering on the right and bottom edges of elements.
 * Supports configurable offset, color, and opacity.
 *
 * @module components/shadow
 */

import { addComponent, hasComponent } from '../core/ecs';
import type { Entity, World } from '../core/types';
import { parseColor } from '../utils/color';

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

/**
 * Default shadow offset X (1 character to the right).
 */
export const DEFAULT_SHADOW_OFFSET_X = 1;

/**
 * Default shadow offset Y (1 character down).
 */
export const DEFAULT_SHADOW_OFFSET_Y = 1;

/**
 * Default shadow color (dark gray with full alpha).
 */
export const DEFAULT_SHADOW_COLOR = 0xff333333;

/**
 * Default shadow opacity (128 = 50% transparent).
 */
export const DEFAULT_SHADOW_OPACITY = 128;

/**
 * Default shadow character for terminal rendering (block character).
 */
export const DEFAULT_SHADOW_CHAR = 0x2588; // █ Full block

/**
 * Alternative shadow character (medium shade).
 */
export const SHADOW_CHAR_MEDIUM = 0x2592; // ▒ Medium shade

/**
 * Alternative shadow character (light shade).
 */
export const SHADOW_CHAR_LIGHT = 0x2591; // ░ Light shade

/**
 * Alternative shadow character (dark shade).
 */
export const SHADOW_CHAR_DARK = 0x2593; // ▓ Dark shade

/**
 * Shadow component store using SoA (Structure of Arrays) for performance.
 *
 * - `enabled`: Whether shadow is enabled (0=disabled, 1=enabled)
 * - `offsetX`: Horizontal offset (signed, typically positive for right shadow)
 * - `offsetY`: Vertical offset (signed, typically positive for bottom shadow)
 * - `color`: Shadow color (packed RGBA)
 * - `opacity`: Shadow opacity (0-255, used for blending)
 * - `char`: Unicode codepoint for shadow character
 * - `blendWithBg`: Whether to blend shadow with background (0=no, 1=yes)
 *
 * @example
 * ```typescript
 * import { Shadow, setShadow, getShadow, hasShadow } from 'blecsd';
 *
 * setShadow(world, entity, { enabled: true });
 * setShadow(world, entity, { offsetX: 2, offsetY: 2, color: '#000000' });
 *
 * const shadow = getShadow(world, entity);
 * if (shadow?.enabled) {
 *   console.log(`Shadow offset: ${shadow.offsetX}, ${shadow.offsetY}`);
 * }
 * ```
 */
export const Shadow = {
	/** 0 = disabled, 1 = enabled */
	enabled: new Uint8Array(DEFAULT_CAPACITY),
	/** Horizontal offset (typically +1 for right shadow) */
	offsetX: new Int8Array(DEFAULT_CAPACITY),
	/** Vertical offset (typically +1 for bottom shadow) */
	offsetY: new Int8Array(DEFAULT_CAPACITY),
	/** Shadow color (packed RGBA) */
	color: new Uint32Array(DEFAULT_CAPACITY),
	/** Shadow opacity (0-255) */
	opacity: new Uint8Array(DEFAULT_CAPACITY),
	/** Shadow character (Unicode codepoint) */
	char: new Uint32Array(DEFAULT_CAPACITY),
	/** Blend shadow with background (0=no, 1=yes) */
	blendWithBg: new Uint8Array(DEFAULT_CAPACITY),
};

/**
 * Shadow configuration options.
 */
export interface ShadowOptions {
	/** Enable or disable shadow */
	enabled?: boolean;
	/** Horizontal offset (default: 1) */
	offsetX?: number;
	/** Vertical offset (default: 1) */
	offsetY?: number;
	/** Shadow color (hex string or packed number) */
	color?: string | number;
	/** Shadow opacity (0-255, default: 128) */
	opacity?: number;
	/** Shadow character (Unicode codepoint, default: full block) */
	char?: number;
	/** Blend shadow with background */
	blendWithBg?: boolean;
}

/**
 * Shadow data returned by getShadow.
 */
export interface ShadowData {
	readonly enabled: boolean;
	readonly offsetX: number;
	readonly offsetY: number;
	readonly color: number;
	readonly opacity: number;
	readonly char: number;
	readonly blendWithBg: boolean;
}

/**
 * Initializes a Shadow component with default values.
 */
function initShadow(eid: Entity): void {
	Shadow.enabled[eid] = 0;
	Shadow.offsetX[eid] = DEFAULT_SHADOW_OFFSET_X;
	Shadow.offsetY[eid] = DEFAULT_SHADOW_OFFSET_Y;
	Shadow.color[eid] = DEFAULT_SHADOW_COLOR;
	Shadow.opacity[eid] = DEFAULT_SHADOW_OPACITY;
	Shadow.char[eid] = DEFAULT_SHADOW_CHAR;
	Shadow.blendWithBg[eid] = 1;
}

/**
 * Ensures an entity has the Shadow component, initializing if needed.
 */
function ensureShadow(world: World, eid: Entity): void {
	if (!hasComponent(world, eid, Shadow)) {
		addComponent(world, eid, Shadow);
		initShadow(eid);
	}
}

/**
 * Sets the shadow configuration of an entity.
 * Adds the Shadow component if not already present.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param options - Shadow configuration options
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { createWorld, addEntity } from '../core/ecs';
 * import { setShadow } from 'blecsd';
 *
 * const world = createWorld();
 * const entity = addEntity(world);
 *
 * // Enable shadow with default settings
 * setShadow(world, entity, { enabled: true });
 *
 * // Custom shadow configuration
 * setShadow(world, entity, {
 *   enabled: true,
 *   offsetX: 2,
 *   offsetY: 2,
 *   color: '#000000',
 *   opacity: 200,
 * });
 * ```
 */
export function setShadow(world: World, eid: Entity, options: ShadowOptions): Entity {
	ensureShadow(world, eid);
	applyShadowOptions(eid, options);
	return eid;
}

/**
 * Applies shadow options to an entity.
 * @internal
 */
function applyShadowOptions(eid: Entity, options: ShadowOptions): void {
	if (options.enabled !== undefined) Shadow.enabled[eid] = options.enabled ? 1 : 0;
	if (options.offsetX !== undefined) Shadow.offsetX[eid] = options.offsetX;
	if (options.offsetY !== undefined) Shadow.offsetY[eid] = options.offsetY;
	if (options.color !== undefined) Shadow.color[eid] = parseColor(options.color);
	if (options.opacity !== undefined)
		Shadow.opacity[eid] = Math.max(0, Math.min(255, options.opacity));
	if (options.char !== undefined) Shadow.char[eid] = options.char;
	if (options.blendWithBg !== undefined) Shadow.blendWithBg[eid] = options.blendWithBg ? 1 : 0;
}

/**
 * Gets the shadow data of an entity.
 * Returns undefined if the entity doesn't have a Shadow component.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns Shadow data or undefined
 *
 * @example
 * ```typescript
 * import { getShadow } from 'blecsd';
 *
 * const shadow = getShadow(world, entity);
 * if (shadow?.enabled) {
 *   console.log(`Offset: ${shadow.offsetX}, ${shadow.offsetY}`);
 * }
 * ```
 */
export function getShadow(world: World, eid: Entity): ShadowData | undefined {
	if (!hasComponent(world, eid, Shadow)) {
		return undefined;
	}
	return {
		enabled: Shadow.enabled[eid] === 1,
		offsetX: Shadow.offsetX[eid] as number,
		offsetY: Shadow.offsetY[eid] as number,
		color: Shadow.color[eid] as number,
		opacity: Shadow.opacity[eid] as number,
		char: Shadow.char[eid] as number,
		blendWithBg: Shadow.blendWithBg[eid] === 1,
	};
}

/**
 * Checks if an entity has a Shadow component.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if entity has Shadow component
 */
export function hasShadow(world: World, eid: Entity): boolean {
	return hasComponent(world, eid, Shadow);
}

/**
 * Checks if an entity has shadow enabled.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if shadow is enabled
 */
export function isShadowEnabled(world: World, eid: Entity): boolean {
	if (!hasComponent(world, eid, Shadow)) {
		return false;
	}
	return Shadow.enabled[eid] === 1;
}

/**
 * Enables the shadow for an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { enableShadow } from 'blecsd';
 *
 * enableShadow(world, entity);
 * ```
 */
export function enableShadow(world: World, eid: Entity): Entity {
	ensureShadow(world, eid);
	Shadow.enabled[eid] = 1;
	return eid;
}

/**
 * Disables the shadow for an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { disableShadow } from 'blecsd';
 *
 * disableShadow(world, entity);
 * ```
 */
export function disableShadow(world: World, eid: Entity): Entity {
	if (hasComponent(world, eid, Shadow)) {
		Shadow.enabled[eid] = 0;
	}
	return eid;
}

/**
 * Toggles the shadow for an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns The entity ID for chaining
 */
export function toggleShadow(world: World, eid: Entity): Entity {
	ensureShadow(world, eid);
	Shadow.enabled[eid] = Shadow.enabled[eid] === 1 ? 0 : 1;
	return eid;
}

/**
 * Sets the shadow offset.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param x - Horizontal offset
 * @param y - Vertical offset
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { setShadowOffset } from 'blecsd';
 *
 * // Standard drop shadow (right and down)
 * setShadowOffset(world, entity, 1, 1);
 *
 * // Larger shadow
 * setShadowOffset(world, entity, 2, 2);
 * ```
 */
export function setShadowOffset(world: World, eid: Entity, x: number, y: number): Entity {
	ensureShadow(world, eid);
	Shadow.offsetX[eid] = x;
	Shadow.offsetY[eid] = y;
	return eid;
}

/**
 * Gets the shadow offset.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns Shadow offset or undefined
 */
export function getShadowOffset(world: World, eid: Entity): { x: number; y: number } | undefined {
	if (!hasComponent(world, eid, Shadow)) {
		return undefined;
	}
	return {
		x: Shadow.offsetX[eid] as number,
		y: Shadow.offsetY[eid] as number,
	};
}

/**
 * Sets the shadow color.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param color - Shadow color (hex string or packed number)
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { setShadowColor } from 'blecsd';
 *
 * setShadowColor(world, entity, '#000000');
 * setShadowColor(world, entity, 0xff333333);
 * ```
 */
export function setShadowColor(world: World, eid: Entity, color: string | number): Entity {
	ensureShadow(world, eid);
	Shadow.color[eid] = parseColor(color);
	return eid;
}

/**
 * Gets the shadow color.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns Shadow color or undefined
 */
export function getShadowColor(world: World, eid: Entity): number | undefined {
	if (!hasComponent(world, eid, Shadow)) {
		return undefined;
	}
	return Shadow.color[eid] as number;
}

/**
 * Sets the shadow opacity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param opacity - Opacity value (0-255)
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { setShadowOpacity } from 'blecsd';
 *
 * setShadowOpacity(world, entity, 128); // 50% opacity
 * setShadowOpacity(world, entity, 255); // Full opacity
 * ```
 */
export function setShadowOpacity(world: World, eid: Entity, opacity: number): Entity {
	ensureShadow(world, eid);
	Shadow.opacity[eid] = Math.max(0, Math.min(255, opacity));
	return eid;
}

/**
 * Gets the shadow opacity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns Shadow opacity or undefined
 */
export function getShadowOpacity(world: World, eid: Entity): number | undefined {
	if (!hasComponent(world, eid, Shadow)) {
		return undefined;
	}
	return Shadow.opacity[eid] as number;
}

/**
 * Sets the shadow character.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param char - Unicode codepoint for shadow character
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { setShadowChar, SHADOW_CHAR_LIGHT } from 'blecsd';
 *
 * setShadowChar(world, entity, SHADOW_CHAR_LIGHT);
 * ```
 */
export function setShadowChar(world: World, eid: Entity, char: number): Entity {
	ensureShadow(world, eid);
	Shadow.char[eid] = char;
	return eid;
}

/**
 * Gets the shadow character.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns Shadow character codepoint or undefined
 */
export function getShadowChar(world: World, eid: Entity): number | undefined {
	if (!hasComponent(world, eid, Shadow)) {
		return undefined;
	}
	return Shadow.char[eid] as number;
}

/**
 * Sets whether shadow should blend with background.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param blend - Whether to blend with background
 * @returns The entity ID for chaining
 */
export function setShadowBlend(world: World, eid: Entity, blend: boolean): Entity {
	ensureShadow(world, eid);
	Shadow.blendWithBg[eid] = blend ? 1 : 0;
	return eid;
}

/**
 * Checks if shadow blends with background.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if shadow blends with background
 */
export function isShadowBlending(world: World, eid: Entity): boolean {
	if (!hasComponent(world, eid, Shadow)) {
		return false;
	}
	return Shadow.blendWithBg[eid] === 1;
}

/**
 * Removes the shadow component from an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns The entity ID for chaining
 */
export function removeShadow(world: World, eid: Entity): Entity {
	if (hasComponent(world, eid, Shadow)) {
		// Reset values to defaults (component will be removed by bitecs)
		initShadow(eid);
	}
	return eid;
}

/** Shadow position with type information */
export interface ShadowPosition {
	readonly x: number;
	readonly y: number;
	readonly type: 'right' | 'bottom' | 'corner';
}

/**
 * Adds right edge shadow positions to the array.
 * @internal
 */
function addRightEdgePositions(
	positions: ShadowPosition[],
	x: number,
	y: number,
	width: number,
	height: number,
	offsetX: number,
	offsetY: number,
): void {
	for (let row = 0; row < height; row++) {
		for (let col = 0; col < offsetX; col++) {
			positions.push({ x: x + width + col, y: y + row + offsetY, type: 'right' });
		}
	}
}

/**
 * Adds bottom edge shadow positions to the array.
 * @internal
 */
function addBottomEdgePositions(
	positions: ShadowPosition[],
	x: number,
	y: number,
	width: number,
	height: number,
	offsetX: number,
	offsetY: number,
): void {
	for (let row = 0; row < offsetY; row++) {
		for (let col = 0; col < width; col++) {
			positions.push({ x: x + col + offsetX, y: y + height + row, type: 'bottom' });
		}
	}
}

/**
 * Adds corner shadow positions to the array.
 * @internal
 */
function addCornerPositions(
	positions: ShadowPosition[],
	x: number,
	y: number,
	width: number,
	height: number,
	offsetX: number,
	offsetY: number,
): void {
	for (let row = 0; row < offsetY; row++) {
		for (let col = 0; col < offsetX; col++) {
			positions.push({ x: x + width + col, y: y + height + row, type: 'corner' });
		}
	}
}

/**
 * Calculates shadow render positions for an element.
 * Returns positions for the right edge and bottom edge shadows.
 *
 * @param x - Element X position
 * @param y - Element Y position
 * @param width - Element width
 * @param height - Element height
 * @param offsetX - Shadow X offset
 * @param offsetY - Shadow Y offset
 * @returns Array of shadow positions with type (right/bottom/corner)
 *
 * @example
 * ```typescript
 * import { calculateShadowPositions, getShadow } from 'blecsd';
 *
 * const shadow = getShadow(world, entity);
 * if (shadow?.enabled) {
 *   const positions = calculateShadowPositions(10, 5, 20, 10, shadow.offsetX, shadow.offsetY);
 *   for (const pos of positions) {
 *     // Render shadow character at pos.x, pos.y
 *   }
 * }
 * ```
 */
export function calculateShadowPositions(
	x: number,
	y: number,
	width: number,
	height: number,
	offsetX: number,
	offsetY: number,
): ShadowPosition[] {
	const positions: ShadowPosition[] = [];

	// Right edge shadow (vertical strip)
	if (offsetX > 0) {
		addRightEdgePositions(positions, x, y, width, height, offsetX, offsetY);
	}

	// Bottom edge shadow (horizontal strip)
	if (offsetY > 0) {
		addBottomEdgePositions(positions, x, y, width, height, offsetX, offsetY);
	}

	// Corner shadow (fills the gap between right and bottom)
	if (offsetX > 0 && offsetY > 0) {
		addCornerPositions(positions, x, y, width, height, offsetX, offsetY);
	}

	return positions;
}

/**
 * Blends a shadow color with a background color based on opacity.
 *
 * @param shadowColor - Shadow color (packed RGBA)
 * @param bgColor - Background color (packed RGBA)
 * @param opacity - Shadow opacity (0-255)
 * @returns Blended color (packed RGBA)
 *
 * @example
 * ```typescript
 * import { blendShadowColor } from 'blecsd';
 *
 * const blended = blendShadowColor(0xff000000, 0xffffffff, 128);
 * // Returns a gray color (50% blend of black and white)
 * ```
 */
export function blendShadowColor(shadowColor: number, bgColor: number, opacity: number): number {
	const sr = (shadowColor >> 16) & 0xff;
	const sg = (shadowColor >> 8) & 0xff;
	const sb = shadowColor & 0xff;

	const br = (bgColor >> 16) & 0xff;
	const bg = (bgColor >> 8) & 0xff;
	const bb = bgColor & 0xff;
	const ba = (bgColor >> 24) & 0xff;

	const alpha = opacity / 255;
	const invAlpha = 1 - alpha;

	const r = Math.round(sr * alpha + br * invAlpha);
	const g = Math.round(sg * alpha + bg * invAlpha);
	const b = Math.round(sb * alpha + bb * invAlpha);

	return ((ba & 0xff) << 24) | ((r & 0xff) << 16) | ((g & 0xff) << 8) | (b & 0xff);
}
