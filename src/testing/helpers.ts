/**
 * Test helper utilities for creating and managing ECS test worlds and entities.
 * @module testing/helpers
 */

import { Border } from '../components/border';
import { setContent } from '../components/content';
import { setDimensions } from '../components/dimensions';
import { setFocusable } from '../components/focusable';
import { Hierarchy } from '../components/hierarchy';
import { setInteractive } from '../components/interactive';
import { Padding } from '../components/padding';
import { setPosition } from '../components/position';
import type { StyleOptions } from '../components/renderable';
import { Renderable, setStyle } from '../components/renderable';
import { setScrollable } from '../components/scrollable';
import { addComponent, addEntity, createWorld } from '../core/ecs';
import { createScreenEntity } from '../core/entities';
import type { Entity, World } from '../core/types';
import { setZIndex } from '../core/zOrder';

// =============================================================================
// WORLD CREATION
// =============================================================================

/**
 * Creates a pre-configured world for tests.
 * This is a simple wrapper around createWorld() but provides a consistent
 * pattern and allows for future test-specific world configuration.
 *
 * @returns A new ECS world ready for testing
 *
 * @example
 * ```typescript
 * import { createTestWorld } from 'blecsd/testing';
 *
 * const world = createTestWorld();
 * // Use world in tests...
 * ```
 */
export function createTestWorld(): World {
	return createWorld();
}

// =============================================================================
// ENTITY CREATION
// =============================================================================

/**
 * Configuration for creating a test entity with common components.
 */
export interface TestEntityConfig {
	/** Position x coordinate */
	readonly x?: number;
	/** Position y coordinate */
	readonly y?: number;
	/**
	 * Z-index for layering (sets ZOrder.zIndex, not Position.z).
	 * Higher values render on top. Use setPosition directly if you need Position.z.
	 */
	readonly z?: number;
	/** Width of the entity */
	readonly width?: number;
	/** Height of the entity */
	readonly height?: number;
	/** Style options (colors, text attributes) */
	readonly style?: StyleOptions;
	/** Whether entity should be visible */
	readonly visible?: boolean;
	/** Whether entity should be marked dirty */
	readonly dirty?: boolean;
	/** Text content */
	readonly content?: string;
	/** Whether entity is clickable */
	readonly clickable?: boolean;
	/** Whether entity is hoverable */
	readonly hoverable?: boolean;
	/** Whether entity is focusable */
	readonly focusable?: boolean;
	/** Whether entity is scrollable */
	readonly scrollable?: boolean;
	/** Whether to add border component */
	readonly border?: boolean;
	/** Whether to add padding component */
	readonly padding?: boolean;
	/** Whether to add hierarchy component */
	readonly hierarchy?: boolean;
}

/**
 * Creates a test entity with specified components.
 * This helper automatically adds common components based on the configuration,
 * making it easy to set up test entities without boilerplate.
 *
 * @param world - The ECS world to create the entity in
 * @param config - Configuration for the entity's components
 * @returns The newly created entity ID
 *
 * @example
 * ```typescript
 * import { createTestWorld, createTestEntity } from 'blecsd/testing';
 *
 * const world = createTestWorld();
 *
 * // Create a simple positioned entity
 * const box = createTestEntity(world, { x: 10, y: 5, width: 20, height: 10 });
 *
 * // Create a clickable entity with content
 * const button = createTestEntity(world, {
 *   x: 0, y: 0, width: 10, height: 3,
 *   content: 'Click me',
 *   clickable: true,
 *   style: { fg: 0xffffff, bg: 0x0000ff }
 * });
 * ```
 */
export function createTestEntity(world: World, config: TestEntityConfig = {}): Entity {
	const eid = addEntity(world);

	// Position (almost always needed)
	if (config.x !== undefined || config.y !== undefined) {
		setPosition(world, eid, config.x ?? 0, config.y ?? 0);
	}

	// Z-index for layering (separate from Position.z)
	if (config.z !== undefined) {
		setZIndex(world, eid, config.z);
	}

	// Dimensions (needed for rendering and hit testing)
	if (config.width !== undefined || config.height !== undefined) {
		setDimensions(world, eid, config.width ?? 0, config.height ?? 0);
	}

	// Renderable (for visible entities)
	if (config.style !== undefined || config.visible !== undefined) {
		addComponent(world, eid, Renderable);
		if (config.style !== undefined) {
			setStyle(world, eid, config.style);
		}
		if (config.visible !== undefined) {
			Renderable.visible[eid] = config.visible ? 1 : 0;
		}
		if (config.dirty !== undefined) {
			Renderable.dirty[eid] = config.dirty ? 1 : 0;
		}
	}

	// Content (for text)
	if (config.content !== undefined) {
		setContent(world, eid, config.content);
	}

	// Interactive (for clickable/hoverable)
	if (config.clickable !== undefined || config.hoverable !== undefined) {
		setInteractive(world, eid, {
			clickable: config.clickable ?? false,
			hoverable: config.hoverable ?? false,
		});
	}

	// Focusable
	if (config.focusable !== undefined) {
		setFocusable(world, eid, { focusable: config.focusable });
	}

	// Scrollable
	if (config.scrollable !== undefined) {
		setScrollable(world, eid, {});
	}

	// Border
	if (config.border !== undefined && config.border) {
		addComponent(world, eid, Border);
	}

	// Padding
	if (config.padding !== undefined && config.padding) {
		addComponent(world, eid, Padding);
	}

	// Hierarchy
	if (config.hierarchy !== undefined && config.hierarchy) {
		addComponent(world, eid, Hierarchy);
	}

	return eid;
}

/**
 * Creates a renderable entity with Position, Dimensions, and Renderable components.
 * This is a common pattern in tests for entities that need to be rendered.
 *
 * @param world - The ECS world to create the entity in
 * @param x - X coordinate (default: 0)
 * @param y - Y coordinate (default: 0)
 * @param width - Width (default: 10)
 * @param height - Height (default: 10)
 * @returns The newly created entity ID
 *
 * @example
 * ```typescript
 * import { createTestWorld, createRenderableEntity } from 'blecsd/testing';
 *
 * const world = createTestWorld();
 * const box = createRenderableEntity(world, 5, 5, 20, 15);
 * ```
 */
export function createRenderableEntity(
	world: World,
	x: number = 0,
	y: number = 0,
	width: number = 10,
	height: number = 10,
): Entity {
	const eid = addEntity(world);
	setPosition(world, eid, x, y);
	setDimensions(world, eid, width, height);
	addComponent(world, eid, Renderable);
	Renderable.visible[eid] = 1;
	Renderable.dirty[eid] = 1;
	return eid;
}

/**
 * Creates a clickable entity with Interactive component.
 *
 * @param world - The ECS world to create the entity in
 * @param x - X coordinate
 * @param y - Y coordinate
 * @param width - Width
 * @param height - Height
 * @param zIndex - Z-index for layering (default: 0)
 * @returns The newly created entity ID
 *
 * @example
 * ```typescript
 * import { createTestWorld, createClickableEntity } from 'blecsd/testing';
 *
 * const world = createTestWorld();
 * const button = createClickableEntity(world, 0, 0, 10, 3, 5);
 * ```
 */
export function createClickableEntity(
	world: World,
	x: number,
	y: number,
	width: number,
	height: number,
	zIndex: number = 0,
): Entity {
	const eid = addEntity(world);
	setPosition(world, eid, x, y);
	setDimensions(world, eid, width, height);
	setInteractive(world, eid, { clickable: true });
	setZIndex(world, eid, zIndex);
	return eid;
}

/**
 * Creates a hoverable entity with Interactive component.
 *
 * @param world - The ECS world to create the entity in
 * @param x - X coordinate
 * @param y - Y coordinate
 * @param width - Width
 * @param height - Height
 * @param zIndex - Z-index for layering (default: 0)
 * @returns The newly created entity ID
 *
 * @example
 * ```typescript
 * import { createTestWorld, createHoverableEntity } from 'blecsd/testing';
 *
 * const world = createTestWorld();
 * const tooltip = createHoverableEntity(world, 10, 10, 20, 5);
 * ```
 */
export function createHoverableEntity(
	world: World,
	x: number,
	y: number,
	width: number,
	height: number,
	zIndex: number = 0,
): Entity {
	const eid = addEntity(world);
	setPosition(world, eid, x, y);
	setDimensions(world, eid, width, height);
	setInteractive(world, eid, { hoverable: true });
	setZIndex(world, eid, zIndex);
	return eid;
}

// =============================================================================
// SCREEN CREATION
// =============================================================================

/**
 * Configuration for creating a test screen.
 */
export interface TestScreenConfig {
	/** Screen width in columns (default: 80) */
	readonly width?: number;
	/** Screen height in rows (default: 24) */
	readonly height?: number;
}

/**
 * Creates a test screen entity with default terminal dimensions.
 * This is useful for tests that need screen rendering context.
 *
 * @param world - The ECS world to create the screen in
 * @param config - Screen configuration (default: 80x24)
 * @returns The screen entity ID
 *
 * @example
 * ```typescript
 * import { createTestWorld, createTestScreen } from 'blecsd/testing';
 *
 * const world = createTestWorld();
 * const screen = createTestScreen(world);
 *
 * // Custom size
 * const largeScreen = createTestScreen(world, { width: 120, height: 40 });
 * ```
 */
export function createTestScreen(world: World, config: TestScreenConfig = {}): Entity {
	return createScreenEntity(world, {
		width: config.width ?? 80,
		height: config.height ?? 24,
	});
}
