/**
 * Auto-padding system for automatically adding padding inside borders.
 *
 * When autoPadding is enabled on the Screen, entities with borders automatically
 * get 1 cell of padding on each side that has a border. This prevents content
 * from overlapping with border characters.
 *
 * @module core/autoPadding
 *
 * @example
 * ```typescript
 * import {
 *   getEffectivePadding,
 *   getAutoPadding,
 *   hasAutoPadding,
 * } from 'blecsd';
 *
 * // Get auto-padding based on borders
 * const autoPad = getAutoPadding(world, entity);
 * console.log(autoPad.left);  // 1 if left border exists
 *
 * // Get total effective padding (explicit + auto)
 * const effective = getEffectivePadding(world, entity);
 * console.log(effective.left);  // explicit padding + auto-padding
 * ```
 */

import { Border, BorderType, hasBorder } from '../components/border';
import { getPadding } from '../components/padding';
import { getScreen, isAutoPadding } from '../components/screen';
import type { Entity, World } from './types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Auto-padding values (padding automatically added for borders).
 */
export interface AutoPaddingData {
	/** Auto-padding on left (1 if border, 0 otherwise) */
	readonly left: number;
	/** Auto-padding on top (1 if border, 0 otherwise) */
	readonly top: number;
	/** Auto-padding on right (1 if border, 0 otherwise) */
	readonly right: number;
	/** Auto-padding on bottom (1 if border, 0 otherwise) */
	readonly bottom: number;
}

/**
 * Effective padding values (explicit padding + auto-padding).
 */
export interface EffectivePaddingData {
	/** Effective left padding */
	readonly left: number;
	/** Effective top padding */
	readonly top: number;
	/** Effective right padding */
	readonly right: number;
	/** Effective bottom padding */
	readonly bottom: number;
	/** Sum of horizontal padding (left + right) */
	readonly horizontal: number;
	/** Sum of vertical padding (top + bottom) */
	readonly vertical: number;
}

// =============================================================================
// AUTO-PADDING CALCULATION
// =============================================================================

/**
 * Checks if auto-padding is enabled for an entity.
 *
 * Auto-padding is enabled when the Screen has autoPadding enabled.
 *
 * @param world - The ECS world
 * @returns true if auto-padding is enabled
 *
 * @example
 * ```typescript
 * import { hasAutoPadding } from 'blecsd';
 *
 * if (hasAutoPadding(world)) {
 *   console.log('Auto-padding is enabled');
 * }
 * ```
 */
export function hasAutoPadding(world: World): boolean {
	const screen = getScreen(world);
	if (!screen) {
		return false;
	}
	return isAutoPadding(world, screen);
}

/**
 * Gets the auto-padding values for an entity based on its borders.
 *
 * Returns 1 for each side that has a border (when autoPadding is enabled),
 * or 0 for sides without borders or when autoPadding is disabled.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns Auto-padding data
 *
 * @example
 * ```typescript
 * import { getAutoPadding } from 'blecsd';
 *
 * const autoPad = getAutoPadding(world, entity);
 * console.log(`Auto left padding: ${autoPad.left}`);
 * ```
 */
export function getAutoPadding(world: World, eid: Entity): AutoPaddingData {
	const zeroPadding: AutoPaddingData = {
		left: 0,
		top: 0,
		right: 0,
		bottom: 0,
	};

	// Check if auto-padding is enabled
	if (!hasAutoPadding(world)) {
		return zeroPadding;
	}

	// Check if entity has a border
	if (!hasBorder(world, eid)) {
		return zeroPadding;
	}

	// Check border type (None means no visible border)
	const borderType = Border.type[eid] as number;
	if (borderType === BorderType.None) {
		return zeroPadding;
	}

	// Return 1 for each side that has a border enabled
	return {
		left: Border.left[eid] === 1 ? 1 : 0,
		top: Border.top[eid] === 1 ? 1 : 0,
		right: Border.right[eid] === 1 ? 1 : 0,
		bottom: Border.bottom[eid] === 1 ? 1 : 0,
	};
}

/**
 * Gets the effective padding for an entity (explicit + auto-padding).
 *
 * Combines the entity's explicit padding (from Padding component) with
 * auto-padding (from borders, when enabled) to give the total padding.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns Effective padding data
 *
 * @example
 * ```typescript
 * import { getEffectivePadding } from 'blecsd';
 *
 * const padding = getEffectivePadding(world, entity);
 * console.log(`Total left padding: ${padding.left}`);
 * console.log(`Total horizontal: ${padding.horizontal}`);
 * ```
 */
export function getEffectivePadding(world: World, eid: Entity): EffectivePaddingData {
	// Get explicit padding
	const explicit = getPadding(world, eid);
	const explicitLeft = explicit?.left ?? 0;
	const explicitTop = explicit?.top ?? 0;
	const explicitRight = explicit?.right ?? 0;
	const explicitBottom = explicit?.bottom ?? 0;

	// Get auto-padding
	const auto = getAutoPadding(world, eid);

	// Combine them
	const left = explicitLeft + auto.left;
	const top = explicitTop + auto.top;
	const right = explicitRight + auto.right;
	const bottom = explicitBottom + auto.bottom;

	return {
		left,
		top,
		right,
		bottom,
		horizontal: left + right,
		vertical: top + bottom,
	};
}

/**
 * Gets the total effective padding (sum of all sides).
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns Total padding value
 *
 * @example
 * ```typescript
 * import { getTotalEffectivePadding } from 'blecsd';
 *
 * const total = getTotalEffectivePadding(world, entity);
 * console.log(`Total padding: ${total}`);
 * ```
 */
export function getTotalEffectivePadding(world: World, eid: Entity): number {
	const effective = getEffectivePadding(world, eid);
	return effective.left + effective.top + effective.right + effective.bottom;
}

/**
 * Checks if an entity has any auto-padding applied.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if the entity has auto-padding on any side
 *
 * @example
 * ```typescript
 * import { hasEntityAutoPadding } from 'blecsd';
 *
 * if (hasEntityAutoPadding(world, entity)) {
 *   console.log('Entity has auto-padding from borders');
 * }
 * ```
 */
export function hasEntityAutoPadding(world: World, eid: Entity): boolean {
	const auto = getAutoPadding(world, eid);
	return auto.left > 0 || auto.top > 0 || auto.right > 0 || auto.bottom > 0;
}
