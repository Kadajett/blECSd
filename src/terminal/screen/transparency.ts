/**
 * Transparency and alpha blending utilities for screen rendering.
 *
 * Provides functions for blending colors based on entity opacity settings,
 * handling transparent backgrounds, and compositing overlapping elements.
 *
 * @module terminal/screen/transparency
 *
 * @example
 * ```typescript
 * import {
 *   blendCellColors,
 *   isTransparent,
 *   getEffectiveOpacity,
 * } from 'blecsd';
 *
 * // Check if entity has transparent background
 * if (isTransparent(world, entity)) {
 *   // Skip background rendering
 * }
 *
 * // Blend foreground color with opacity
 * const blended = blendCellColors(
 *   fgColor, bgColor, opacity
 * );
 * ```
 */

import { hasComponent } from 'bitecs';
import { getParent, NULL_ENTITY } from '../../components/hierarchy';
import { packColor, Renderable, unpackColor } from '../../components/renderable';
import type { Entity, World } from '../../core/types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Color with alpha channel.
 */
export interface ColorWithAlpha {
	readonly r: number;
	readonly g: number;
	readonly b: number;
	readonly a: number;
}

/**
 * Blended color result.
 */
export interface BlendedColor {
	readonly fg: number;
	readonly bg: number;
}

// =============================================================================
// TRANSPARENCY CHECKS
// =============================================================================

/**
 * Checks if an entity has a transparent background.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if the entity has transparent background
 *
 * @example
 * ```typescript
 * import { isTransparent } from 'blecsd';
 *
 * if (isTransparent(world, entity)) {
 *   // Don't render background, show through to parent
 * }
 * ```
 */
export function isTransparent(world: World, eid: Entity): boolean {
	if (!hasComponent(world, eid, Renderable)) {
		return false;
	}
	return Renderable.transparent[eid] === 1;
}

/**
 * Checks if an entity has partial opacity (not fully opaque).
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if entity has opacity < 1
 *
 * @example
 * ```typescript
 * import { hasPartialOpacity } from 'blecsd';
 *
 * if (hasPartialOpacity(world, entity)) {
 *   // Need to blend with background
 * }
 * ```
 */
export function hasPartialOpacity(world: World, eid: Entity): boolean {
	if (!hasComponent(world, eid, Renderable)) {
		return false;
	}
	return (Renderable.opacity[eid] as number) < 255;
}

/**
 * Gets the opacity of an entity (0-1 scale).
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns Opacity value (0 = fully transparent, 1 = fully opaque)
 *
 * @example
 * ```typescript
 * import { getOpacity } from 'blecsd';
 *
 * const opacity = getOpacity(world, entity);
 * console.log(`Entity is ${opacity * 100}% opaque`);
 * ```
 */
export function getOpacity(world: World, eid: Entity): number {
	if (!hasComponent(world, eid, Renderable)) {
		return 1;
	}
	return (Renderable.opacity[eid] as number) / 255;
}

/**
 * Sets the opacity of an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param opacity - Opacity value (0 = fully transparent, 1 = fully opaque)
 *
 * @example
 * ```typescript
 * import { setOpacity } from 'blecsd';
 *
 * // Make entity 50% transparent
 * setOpacity(world, entity, 0.5);
 * ```
 */
export function setOpacity(world: World, eid: Entity, opacity: number): void {
	if (!hasComponent(world, eid, Renderable)) {
		return;
	}
	const clamped = Math.max(0, Math.min(1, opacity));
	Renderable.opacity[eid] = Math.round(clamped * 255);
	Renderable.dirty[eid] = 1;
}

/**
 * Sets an entity's background to transparent.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param transparent - Whether background should be transparent
 *
 * @example
 * ```typescript
 * import { setTransparent } from 'blecsd';
 *
 * // Make background transparent
 * setTransparent(world, entity, true);
 * ```
 */
export function setTransparent(world: World, eid: Entity, transparent: boolean): void {
	if (!hasComponent(world, eid, Renderable)) {
		return;
	}
	Renderable.transparent[eid] = transparent ? 1 : 0;
	Renderable.dirty[eid] = 1;
}

// =============================================================================
// EFFECTIVE OPACITY (CONSIDERING HIERARCHY)
// =============================================================================

/**
 * Gets the effective opacity of an entity considering parent hierarchy.
 *
 * Opacity compounds through the hierarchy: a 50% opaque entity in a 50% opaque
 * parent has an effective opacity of 25%.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns Effective opacity (0-1)
 *
 * @example
 * ```typescript
 * import { getEffectiveOpacity } from 'blecsd';
 *
 * const effectiveOpacity = getEffectiveOpacity(world, entity);
 * // Accounts for all ancestor opacities
 * ```
 */
export function getEffectiveOpacity(world: World, eid: Entity): number {
	let opacity = getOpacity(world, eid);
	let current = getParent(world, eid);

	while (current !== NULL_ENTITY) {
		const parentOpacity = getOpacity(world, current);
		opacity *= parentOpacity;
		current = getParent(world, current);
	}

	return opacity;
}

// =============================================================================
// COLOR BLENDING
// =============================================================================

/**
 * Blends two colors using alpha compositing.
 *
 * @param fg - Foreground color (packed RGBA)
 * @param bg - Background color (packed RGBA)
 * @param opacity - Additional opacity multiplier (0-1)
 * @returns Blended color (packed RGBA)
 *
 * @example
 * ```typescript
 * import { blendColors, packColor } from 'blecsd';
 *
 * const red = packColor(255, 0, 0, 255);
 * const blue = packColor(0, 0, 255, 255);
 *
 * // 50% blend of red over blue
 * const purple = blendColors(red, blue, 0.5);
 * ```
 */
export function blendColors(fg: number, bg: number, opacity: number = 1): number {
	const fgUnpacked = unpackColor(fg);
	const bgUnpacked = unpackColor(bg);

	// Calculate effective alpha
	const fgAlpha = (fgUnpacked.a / 255) * opacity;
	const bgAlpha = bgUnpacked.a / 255;

	// Porter-Duff "over" compositing
	const outAlpha = fgAlpha + bgAlpha * (1 - fgAlpha);

	if (outAlpha === 0) {
		return 0;
	}

	const r = Math.round(
		(fgUnpacked.r * fgAlpha + bgUnpacked.r * bgAlpha * (1 - fgAlpha)) / outAlpha,
	);
	const g = Math.round(
		(fgUnpacked.g * fgAlpha + bgUnpacked.g * bgAlpha * (1 - fgAlpha)) / outAlpha,
	);
	const b = Math.round(
		(fgUnpacked.b * fgAlpha + bgUnpacked.b * bgAlpha * (1 - fgAlpha)) / outAlpha,
	);
	const a = Math.round(outAlpha * 255);

	return packColor(r, g, b, a);
}

/**
 * Blends foreground and background colors for a cell, applying entity opacity.
 *
 * @param fgColor - Foreground color (packed RGBA)
 * @param bgColor - Background color (packed RGBA)
 * @param opacity - Entity opacity (0-1)
 * @param parentBg - Parent's background color for transparency
 * @returns Blended colors for the cell
 *
 * @example
 * ```typescript
 * import { blendCellColors, packColor } from 'blecsd';
 *
 * const fg = packColor(255, 255, 255, 255);
 * const bg = packColor(100, 100, 100, 255);
 * const parentBg = packColor(0, 0, 0, 255);
 *
 * const { fg: blendedFg, bg: blendedBg } = blendCellColors(
 *   fg, bg, 0.5, parentBg
 * );
 * ```
 */
export function blendCellColors(
	fgColor: number,
	bgColor: number,
	opacity: number,
	parentBg: number = 0xff000000,
): BlendedColor {
	// If fully opaque, no blending needed
	if (opacity >= 1) {
		return { fg: fgColor, bg: bgColor };
	}

	// Blend background with parent
	const blendedBg = blendColors(bgColor, parentBg, opacity);

	// Blend foreground with the new background
	const blendedFg = blendColors(fgColor, blendedBg, opacity);

	return { fg: blendedFg, bg: blendedBg };
}

/**
 * Gets the background color to use for a transparent entity.
 *
 * Walks up the hierarchy to find the first non-transparent parent's background.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns Parent's background color, or black if none found
 *
 * @example
 * ```typescript
 * import { getParentBackground } from 'blecsd';
 *
 * const parentBg = getParentBackground(world, entity);
 * // Use for rendering transparent backgrounds
 * ```
 */
export function getParentBackground(world: World, eid: Entity): number {
	let current = getParent(world, eid);

	while (current !== NULL_ENTITY) {
		if (hasComponent(world, current, Renderable)) {
			// If parent is not transparent, use its background
			if (!isTransparent(world, current)) {
				return Renderable.bg[current] as number;
			}
		}
		current = getParent(world, current);
	}

	// No parent background found, return black
	return packColor(0, 0, 0, 255);
}

/**
 * Checks if alpha blending is needed for an entity.
 *
 * Returns true if the entity has partial opacity OR any ancestor has partial opacity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if blending is needed
 *
 * @example
 * ```typescript
 * import { needsBlending } from 'blecsd';
 *
 * if (needsBlending(world, entity)) {
 *   // Use blended rendering path
 * } else {
 *   // Use fast opaque rendering
 * }
 * ```
 */
export function needsBlending(world: World, eid: Entity): boolean {
	// Check this entity
	if (hasPartialOpacity(world, eid) || isTransparent(world, eid)) {
		return true;
	}

	// Check ancestors
	let current = getParent(world, eid);
	while (current !== NULL_ENTITY) {
		if (hasPartialOpacity(world, current)) {
			return true;
		}
		current = getParent(world, current);
	}

	return false;
}

// =============================================================================
// PREMULTIPLIED ALPHA
// =============================================================================

/**
 * Converts a color to premultiplied alpha format.
 *
 * In premultiplied alpha, RGB values are multiplied by alpha for faster blending.
 *
 * @param color - Packed RGBA color
 * @returns Premultiplied color
 *
 * @example
 * ```typescript
 * import { toPremultiplied, packColor } from 'blecsd';
 *
 * const color = packColor(255, 0, 0, 128); // 50% red
 * const premult = toPremultiplied(color);  // RGB values halved
 * ```
 */
export function toPremultiplied(color: number): number {
	const { r, g, b, a } = unpackColor(color);
	const alpha = a / 255;

	return packColor(Math.round(r * alpha), Math.round(g * alpha), Math.round(b * alpha), a);
}

/**
 * Converts a color from premultiplied alpha to straight alpha.
 *
 * @param color - Premultiplied color
 * @returns Straight alpha color
 *
 * @example
 * ```typescript
 * import { fromPremultiplied, packColor } from 'blecsd';
 *
 * const premult = packColor(128, 0, 0, 128); // Premultiplied
 * const straight = fromPremultiplied(premult); // RGB restored
 * ```
 */
export function fromPremultiplied(color: number): number {
	const { r, g, b, a } = unpackColor(color);

	if (a === 0) {
		return 0;
	}

	const alpha = a / 255;

	return packColor(
		Math.round(Math.min(255, r / alpha)),
		Math.round(Math.min(255, g / alpha)),
		Math.round(Math.min(255, b / alpha)),
		a,
	);
}

/**
 * Fast premultiplied alpha blend (assumes colors are already premultiplied).
 *
 * @param fg - Foreground (premultiplied)
 * @param bg - Background (premultiplied)
 * @returns Blended color (premultiplied)
 */
export function blendPremultiplied(fg: number, bg: number): number {
	const fgU = unpackColor(fg);
	const bgU = unpackColor(bg);

	const invAlpha = 1 - fgU.a / 255;

	return packColor(
		Math.round(fgU.r + bgU.r * invAlpha),
		Math.round(fgU.g + bgU.g * invAlpha),
		Math.round(fgU.b + bgU.b * invAlpha),
		Math.round(fgU.a + bgU.a * invAlpha),
	);
}
