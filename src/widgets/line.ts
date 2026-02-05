/**
 * Line Widget
 *
 * A simple line widget for creating horizontal or vertical separators.
 * Useful for dividing sections of a UI or creating visual boundaries.
 *
 * @module widgets/line
 */

import { z } from 'zod';
import { setDimensions } from '../components/dimensions';
import { blur, focus, isFocused, setFocusable } from '../components/focusable';
import { appendChild, getChildren } from '../components/hierarchy';
import { moveBy, setPosition } from '../components/position';
import { hexToColor, markDirty, setStyle, setVisible } from '../components/renderable';
import { removeEntity } from '../core/ecs';
import type { Entity, World } from '../core/types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Line orientation.
 */
export type LineOrientation = 'horizontal' | 'vertical';

/**
 * Position value that can be a number, percentage string, or keyword.
 */
export type PositionValue = number | `${number}%` | 'center' | 'left' | 'right' | 'top' | 'bottom';

/**
 * Configuration for creating a Line widget.
 */
export interface LineConfig {
	// Position
	/** Left position (absolute or percentage) */
	readonly left?: PositionValue;
	/** Top position (absolute or percentage) */
	readonly top?: PositionValue;

	// Orientation and size
	/** Line orientation ('horizontal' or 'vertical') - default: 'horizontal' */
	readonly orientation?: LineOrientation;
	/** Length of the line (width for horizontal, height for vertical) */
	readonly length?: number;

	// Style
	/** Line character - defaults to '─' for horizontal, '│' for vertical */
	readonly char?: string;
	/** Foreground color (hex string or packed number) */
	readonly fg?: string | number;
	/** Background color (hex string or packed number) */
	readonly bg?: string | number;
}

/**
 * Line widget interface providing chainable methods.
 */
export interface LineWidget {
	/** The underlying entity ID */
	readonly eid: Entity;

	// Visibility
	/** Shows the line */
	show(): LineWidget;
	/** Hides the line */
	hide(): LineWidget;

	// Position
	/** Moves the line by dx, dy */
	move(dx: number, dy: number): LineWidget;
	/** Sets the absolute position */
	setPosition(x: number, y: number): LineWidget;

	// Line-specific
	/** Sets the line character */
	setChar(char: string): LineWidget;
	/** Gets the line character */
	getChar(): string;
	/** Gets the line orientation */
	getOrientation(): LineOrientation;
	/** Sets the line length */
	setLength(length: number): LineWidget;
	/** Gets the line length */
	getLength(): number;

	// Focus
	/** Focuses the line */
	focus(): LineWidget;
	/** Blurs the line */
	blur(): LineWidget;
	/** Checks if the line is focused */
	isFocused(): boolean;

	// Children
	/** Appends a child entity to this line */
	append(child: Entity): LineWidget;
	/** Gets all direct children of this line */
	getChildren(): Entity[];

	// Lifecycle
	/** Destroys the widget and removes it from the world */
	destroy(): void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Default character for horizontal lines */
export const DEFAULT_HORIZONTAL_CHAR = '─';

/** Default character for vertical lines */
export const DEFAULT_VERTICAL_CHAR = '│';

/** Default line length */
export const DEFAULT_LINE_LENGTH = 10;

// =============================================================================
// SCHEMAS
// =============================================================================

/**
 * Zod schema for position values.
 */
const PositionValueSchema = z.union([
	z.number(),
	z.string().regex(/^\d+(\.\d+)?%$/, 'Percentage must be in format "50%"'),
	z.enum(['center', 'left', 'right', 'top', 'bottom']),
]);

/**
 * Zod schema for line widget configuration.
 */
export const LineConfigSchema = z.object({
	// Position
	left: PositionValueSchema.optional(),
	top: PositionValueSchema.optional(),

	// Orientation and size
	orientation: z.enum(['horizontal', 'vertical']).optional(),
	length: z.number().positive().optional(),

	// Style
	char: z.string().optional(),
	fg: z.union([z.string(), z.number()]).optional(),
	bg: z.union([z.string(), z.number()]).optional(),
});

// =============================================================================
// COMPONENT TAG
// =============================================================================

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

/**
 * Line component marker for identifying line entities.
 */
export const Line = {
	/** Tag indicating this is a line widget (1 = yes) */
	isLine: new Uint8Array(DEFAULT_CAPACITY),
	/** Orientation (0 = horizontal, 1 = vertical) */
	orientation: new Uint8Array(DEFAULT_CAPACITY),
	/** Length of the line */
	length: new Float32Array(DEFAULT_CAPACITY),
};

/**
 * Store for line character data (strings can't be stored in typed arrays).
 */
const lineCharStore = new Map<Entity, string>();

// =============================================================================
// INTERNAL HELPERS
// =============================================================================

/**
 * Parses a color value to a packed 32-bit color.
 */
function parseColor(color: string | number): number {
	if (typeof color === 'string') {
		return hexToColor(color);
	}
	return color;
}

/**
 * Parses a position value to a number.
 */
function parsePositionToNumber(value: string | number | undefined): number {
	if (value === undefined) return 0;
	if (typeof value === 'number') return value;
	if (value === 'left' || value === 'top') return 0;
	return 0;
}

/**
 * Validated config type from LineConfigSchema.
 */
interface ValidatedLineConfig {
	left?: string | number;
	top?: string | number;
	orientation?: 'horizontal' | 'vertical';
	length?: number;
	char?: string;
	fg?: string | number;
	bg?: string | number;
}

/**
 * Sets up position on an entity.
 * @internal
 */
function setupPosition(world: World, eid: Entity, config: ValidatedLineConfig): void {
	const x = parsePositionToNumber(config.left);
	const y = parsePositionToNumber(config.top);
	setPosition(world, eid, x, y);
}

/**
 * Sets up dimensions based on orientation.
 * @internal
 */
function setupDimensions(
	world: World,
	eid: Entity,
	orientation: LineOrientation,
	length: number,
): void {
	if (orientation === 'horizontal') {
		setDimensions(world, eid, length, 1);
	} else {
		setDimensions(world, eid, 1, length);
	}
}

/**
 * Sets up style colors on an entity.
 * @internal
 */
function setupStyle(world: World, eid: Entity, config: ValidatedLineConfig): void {
	if (config.fg === undefined && config.bg === undefined) return;

	setStyle(world, eid, {
		fg: config.fg !== undefined ? parseColor(config.fg) : undefined,
		bg: config.bg !== undefined ? parseColor(config.bg) : undefined,
	});
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Creates a Line widget with the given configuration.
 *
 * The Line widget is a simple separator that can be horizontal or vertical.
 * It automatically sizes itself based on orientation.
 *
 * @param world - The ECS world
 * @param entity - The entity to wrap
 * @param config - Widget configuration
 * @returns The Line widget instance
 *
 * @example
 * ```typescript
 * import { createWorld, addEntity } from '../core/ecs';
 * import { createLine } from 'blecsd/widgets';
 *
 * const world = createWorld();
 * const eid = addEntity(world);
 *
 * // Horizontal separator
 * const hLine = createLine(world, eid, {
 *   left: 0,
 *   top: 10,
 *   orientation: 'horizontal',
 *   length: 80,
 * });
 *
 * // Vertical separator with custom character
 * const vLine = createLine(world, addEntity(world), {
 *   left: 40,
 *   top: 0,
 *   orientation: 'vertical',
 *   length: 24,
 *   char: '║',
 *   fg: '#00ff00',
 * });
 * ```
 */
export function createLine(world: World, entity: Entity, config: LineConfig = {}): LineWidget {
	const validated = LineConfigSchema.parse(config) as ValidatedLineConfig;
	const eid = entity;

	// Determine orientation and character
	const orientation: LineOrientation = validated.orientation ?? 'horizontal';
	const length = validated.length ?? DEFAULT_LINE_LENGTH;
	const char =
		validated.char ??
		(orientation === 'horizontal' ? DEFAULT_HORIZONTAL_CHAR : DEFAULT_VERTICAL_CHAR);

	// Mark as line
	Line.isLine[eid] = 1;
	Line.orientation[eid] = orientation === 'horizontal' ? 0 : 1;
	Line.length[eid] = length;
	lineCharStore.set(eid, char);

	// Set up components
	setupPosition(world, eid, validated);
	setupDimensions(world, eid, orientation, length);
	setupStyle(world, eid, validated);

	// Make focusable (but typically lines won't receive focus)
	setFocusable(world, eid, { focusable: false });

	// Create the widget object with chainable methods
	const widget: LineWidget = {
		eid,

		// Visibility
		show(): LineWidget {
			setVisible(world, eid, true);
			return widget;
		},

		hide(): LineWidget {
			setVisible(world, eid, false);
			return widget;
		},

		// Position
		move(dx: number, dy: number): LineWidget {
			moveBy(world, eid, dx, dy);
			markDirty(world, eid);
			return widget;
		},

		setPosition(x: number, y: number): LineWidget {
			setPosition(world, eid, x, y);
			markDirty(world, eid);
			return widget;
		},

		// Line-specific
		setChar(newChar: string): LineWidget {
			lineCharStore.set(eid, newChar);
			markDirty(world, eid);
			return widget;
		},

		getChar(): string {
			return lineCharStore.get(eid) ?? DEFAULT_HORIZONTAL_CHAR;
		},

		getOrientation(): LineOrientation {
			return Line.orientation[eid] === 0 ? 'horizontal' : 'vertical';
		},

		setLength(newLength: number): LineWidget {
			Line.length[eid] = newLength;
			const currentOrientation = Line.orientation[eid] === 0 ? 'horizontal' : 'vertical';
			setupDimensions(world, eid, currentOrientation, newLength);
			markDirty(world, eid);
			return widget;
		},

		getLength(): number {
			return Line.length[eid] as number;
		},

		// Focus
		focus(): LineWidget {
			focus(world, eid);
			return widget;
		},

		blur(): LineWidget {
			blur(world, eid);
			return widget;
		},

		isFocused(): boolean {
			return isFocused(world, eid);
		},

		// Children
		append(child: Entity): LineWidget {
			appendChild(world, eid, child);
			return widget;
		},

		getChildren(): Entity[] {
			return getChildren(world, eid);
		},

		// Lifecycle
		destroy(): void {
			Line.isLine[eid] = 0;
			Line.orientation[eid] = 0;
			Line.length[eid] = 0;
			lineCharStore.delete(eid);
			removeEntity(world, eid);
		},
	};

	return widget;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Checks if an entity is a line widget.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @param eid - The entity ID
 * @returns true if the entity is a line widget
 *
 * @example
 * ```typescript
 * import { isLine } from 'blecsd/widgets';
 *
 * if (isLine(world, entity)) {
 *   // Handle line-specific logic
 * }
 * ```
 */
export function isLine(_world: World, eid: Entity): boolean {
	return Line.isLine[eid] === 1;
}

/**
 * Gets the line character of a line entity.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @param eid - The entity ID
 * @returns The line character or default
 */
export function getLineChar(_world: World, eid: Entity): string {
	return lineCharStore.get(eid) ?? DEFAULT_HORIZONTAL_CHAR;
}

/**
 * Sets the line character of a line entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param char - The character to use
 * @returns The entity ID for chaining
 */
export function setLineChar(world: World, eid: Entity, char: string): Entity {
	lineCharStore.set(eid, char);
	markDirty(world, eid);
	return eid;
}

/**
 * Gets the orientation of a line entity.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @param eid - The entity ID
 * @returns The line orientation
 */
export function getLineOrientation(_world: World, eid: Entity): LineOrientation {
	return Line.orientation[eid] === 0 ? 'horizontal' : 'vertical';
}

/**
 * Resets the Line component store. Useful for testing.
 * @internal
 */
export function resetLineStore(): void {
	Line.isLine.fill(0);
	Line.orientation.fill(0);
	Line.length.fill(0);
	lineCharStore.clear();
}
