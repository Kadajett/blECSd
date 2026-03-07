/**
 * Shared render helper functions used by both renderSystem and virtualizedRenderSystem.
 * @module systems/renderHelpers
 */

import { Border, hasBorderVisible } from '../components/border';
import { Renderable } from '../components/renderable';
import { hasComponent } from '../core/ecs';
import type { Entity, World } from '../core/types';
import { Attr } from '../terminal/screen/cell';
import { ComputedLayout, hasComputedLayout } from './layoutSystem';

// =============================================================================
// TYPES
// =============================================================================

export interface EntityBounds {
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
}

export interface BorderThickness {
	top: number;
	right: number;
	bottom: number;
	left: number;
}

// =============================================================================
// FUNCTIONS
// =============================================================================

/**
 * Converts Renderable style to Cell attributes.
 */
export function styleToAttrs(world: World, eid: Entity): number {
	if (!hasComponent(world, eid, Renderable)) {
		return Attr.NONE;
	}

	let attrs = Attr.NONE;
	if (Renderable.bold[eid] === 1) attrs |= Attr.BOLD;
	if (Renderable.underline[eid] === 1) attrs |= Attr.UNDERLINE;
	if (Renderable.blink[eid] === 1) attrs |= Attr.BLINK;
	if (Renderable.inverse[eid] === 1) attrs |= Attr.INVERSE;

	return attrs;
}

/**
 * Gets entity bounds from ComputedLayout.
 */
export function getEntityBounds(world: World, eid: Entity): EntityBounds | undefined {
	if (!hasComputedLayout(world, eid)) {
		return undefined;
	}

	return {
		x: ComputedLayout.x[eid] as number,
		y: ComputedLayout.y[eid] as number,
		width: ComputedLayout.width[eid] as number,
		height: ComputedLayout.height[eid] as number,
	};
}

/**
 * Gets border thickness for each side.
 */
export function getBorderThickness(world: World, eid: Entity): BorderThickness {
	if (!hasBorderVisible(world, eid)) {
		return { top: 0, right: 0, bottom: 0, left: 0 };
	}

	return {
		top: Border.top[eid] === 1 ? 1 : 0,
		right: Border.right[eid] === 1 ? 1 : 0,
		bottom: Border.bottom[eid] === 1 ? 1 : 0,
		left: Border.left[eid] === 1 ? 1 : 0,
	};
}

/**
 * Gets the content area (bounds minus border).
 */
export function getContentBounds(
	bounds: EntityBounds,
	borderThickness: BorderThickness,
): EntityBounds {
	return {
		x: bounds.x + borderThickness.left,
		y: bounds.y + borderThickness.top,
		width: Math.max(0, bounds.width - borderThickness.left - borderThickness.right),
		height: Math.max(0, bounds.height - borderThickness.top - borderThickness.bottom),
	};
}
