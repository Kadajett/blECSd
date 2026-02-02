/**
 * Shrink-to-content calculation utilities.
 * Calculates minimum sizes needed to fit entity content.
 * @module core/shrinkToContent
 */

import { hasBorder } from '../components/border';
import { getContent, hasContent } from '../components/content';
import { Dimensions, hasDimensions, shouldShrink } from '../components/dimensions';
import { getHorizontalPadding, getVerticalPadding, hasPadding } from '../components/padding';
import { getVisibleWidth, wrapText } from '../utils/textWrap';
import type { Entity, World } from './types';

/**
 * Shrink box result containing calculated dimensions.
 */
export interface ShrinkBox {
	/** Calculated width to fit content */
	readonly width: number;
	/** Calculated height to fit content */
	readonly height: number;
}

/**
 * Gets the border size for an entity.
 * Returns 2 (1 for each side) if entity has a visible border, otherwise 0.
 */
function getBorderSize(world: World, eid: Entity): { h: number; v: number } {
	if (!hasBorder(world, eid)) {
		return { h: 0, v: 0 };
	}
	// Each border side takes 1 cell, so borders add 2 to each dimension
	return { h: 2, v: 2 };
}

/**
 * Gets the total horizontal chrome size (padding + border).
 */
function getHorizontalChrome(world: World, eid: Entity): number {
	const border = getBorderSize(world, eid);
	const padding = hasPadding(world, eid) ? getHorizontalPadding(world, eid) : 0;
	return border.h + padding;
}

/**
 * Gets the total vertical chrome size (padding + border).
 */
function getVerticalChrome(world: World, eid: Entity): number {
	const border = getBorderSize(world, eid);
	const padding = hasPadding(world, eid) ? getVerticalPadding(world, eid) : 0;
	return border.v + padding;
}

/**
 * Calculates the minimum width needed to fit an entity's content.
 * Considers border, padding, and content width.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns Minimum width to fit content, or 0 if entity has no content
 *
 * @example
 * ```typescript
 * import { getShrinkWidth, setContent } from 'blecsd';
 *
 * setContent(world, entity, 'Hello, World!');
 * const minWidth = getShrinkWidth(world, entity);
 * // Returns 13 (content width) + border + padding
 * ```
 */
export function getShrinkWidth(world: World, eid: Entity): number {
	if (!hasContent(world, eid)) {
		return getHorizontalChrome(world, eid);
	}

	const content = getContent(world, eid);
	if (!content) {
		return getHorizontalChrome(world, eid);
	}

	// Split content by lines and find the widest line
	const lines = content.split('\n');
	let maxWidth = 0;
	for (const line of lines) {
		const lineWidth = getVisibleWidth(line);
		if (lineWidth > maxWidth) {
			maxWidth = lineWidth;
		}
	}

	return maxWidth + getHorizontalChrome(world, eid);
}

/**
 * Calculates the minimum height needed to fit an entity's content.
 * Considers border, padding, and content height.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param maxWidth - Optional maximum width for text wrapping
 * @returns Minimum height to fit content, or 0 if entity has no content
 *
 * @example
 * ```typescript
 * import { getShrinkHeight, setContent } from 'blecsd';
 *
 * setContent(world, entity, 'Line 1\nLine 2\nLine 3');
 * const minHeight = getShrinkHeight(world, entity);
 * // Returns 3 (lines) + border + padding
 * ```
 */
export function getShrinkHeight(world: World, eid: Entity, maxWidth?: number): number {
	if (!hasContent(world, eid)) {
		return getVerticalChrome(world, eid);
	}

	const content = getContent(world, eid);

	const chrome = getHorizontalChrome(world, eid);
	const availableWidth = maxWidth ? maxWidth - chrome : undefined;

	// If we have a max width, wrap the content
	let lineCount: number;
	if (availableWidth && availableWidth > 0) {
		const wrapped = wrapText(content, { width: availableWidth, wrap: true });
		lineCount = wrapped.length;
	} else {
		// Count lines in content
		lineCount = content.split('\n').length;
	}

	return lineCount + getVerticalChrome(world, eid);
}

/**
 * Calculates both width and height needed to fit an entity's content.
 * Considers border, padding, and content dimensions.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns Object with width and height, or { width: 0, height: 0 } if no content
 *
 * @example
 * ```typescript
 * import { getShrinkBox, setContent } from 'blecsd';
 *
 * setContent(world, entity, 'Hello\nWorld');
 * const box = getShrinkBox(world, entity);
 * console.log(`Need ${box.width}x${box.height}`);
 * ```
 */
export function getShrinkBox(world: World, eid: Entity): ShrinkBox {
	const width = getShrinkWidth(world, eid);
	const height = getShrinkHeight(world, eid, width);
	return { width, height };
}

/**
 * Applies shrink-to-content constraints to an entity's dimensions.
 * Only applies if the entity has shrink enabled.
 * Respects min/max constraints.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if shrink was applied, false otherwise
 *
 * @example
 * ```typescript
 * import { applyShrink, setShrink, setContent } from 'blecsd';
 *
 * setContent(world, entity, 'Hello');
 * setShrink(world, entity, true);
 * applyShrink(world, entity);
 * // Entity dimensions now match content size
 * ```
 */
export function applyShrink(world: World, eid: Entity): boolean {
	if (!shouldShrink(world, eid)) {
		return false;
	}

	if (!hasDimensions(world, eid)) {
		return false;
	}

	const shrinkBox = getShrinkBox(world, eid);

	// Apply min/max constraints
	const minWidth = Dimensions.minWidth[eid] as number;
	const minHeight = Dimensions.minHeight[eid] as number;
	const maxWidth = Dimensions.maxWidth[eid] as number;
	const maxHeight = Dimensions.maxHeight[eid] as number;

	const constrainedWidth = Math.min(Math.max(shrinkBox.width, minWidth), maxWidth);
	const constrainedHeight = Math.min(Math.max(shrinkBox.height, minHeight), maxHeight);

	// Set the dimensions
	Dimensions.width[eid] = constrainedWidth;
	Dimensions.height[eid] = constrainedHeight;

	return true;
}

/**
 * Calculates shrink-to-content size for an entity without applying it.
 * Respects min/max constraints.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns Constrained shrink dimensions, or undefined if entity has no dimensions
 *
 * @example
 * ```typescript
 * import { calculateShrinkSize, setShrink, setContent } from 'blecsd';
 *
 * setContent(world, entity, 'Hello');
 * const size = calculateShrinkSize(world, entity);
 * if (size) {
 *   console.log(`Would shrink to ${size.width}x${size.height}`);
 * }
 * ```
 */
export function calculateShrinkSize(world: World, eid: Entity): ShrinkBox | undefined {
	if (!hasDimensions(world, eid)) {
		return undefined;
	}

	const shrinkBox = getShrinkBox(world, eid);

	// Apply min/max constraints
	const minWidth = Dimensions.minWidth[eid] as number;
	const minHeight = Dimensions.minHeight[eid] as number;
	const maxWidth = Dimensions.maxWidth[eid] as number;
	const maxHeight = Dimensions.maxHeight[eid] as number;

	return {
		width: Math.min(Math.max(shrinkBox.width, minWidth), maxWidth),
		height: Math.min(Math.max(shrinkBox.height, minHeight), maxHeight),
	};
}
