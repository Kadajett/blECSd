/**
 * Sparkline Widget
 *
 * A compact inline chart widget for displaying trends in a single line height.
 * Uses braille characters for high-resolution rendering.
 *
 * @module widgets/sparkline
 */

import { z } from 'zod';
import { setContent } from '../components/content';
import { getDimensions, setDimensions } from '../components/dimensions';
import { setPosition } from '../components/position';
import { markDirty, setStyle } from '../components/renderable';
import { addEntity, removeEntity } from '../core/ecs';
import type { Entity, World } from '../core/types';
import { parseColor } from '../utils/color';
import { BRAILLE_BASE, combineBrailleDots, getChartColor, scaleValue } from './chartUtils';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Configuration for creating a Sparkline widget.
 */
export interface SparklineConfig {
	/** X position (default: 0) */
	readonly x?: number;
	/** Y position (default: 0) */
	readonly y?: number;
	/** Width in characters (default: 20) */
	readonly width?: number;
	/** Data values to display */
	readonly data?: readonly number[];
	/** Foreground color (hex string or packed number) */
	readonly fg?: string | number;
	/** Background color (hex string or packed number) */
	readonly bg?: string | number;
	/** Whether to show min marker (default: false) */
	readonly showMin?: boolean;
	/** Whether to show max marker (default: false) */
	readonly showMax?: boolean;
	/** Whether to use color gradient (default: false) */
	readonly gradient?: boolean;
	/** Gradient start color (default: green) */
	readonly gradientStart?: string | number;
	/** Gradient end color (default: red) */
	readonly gradientEnd?: string | number;
}

/**
 * Sparkline widget interface providing chainable methods.
 */
export interface SparklineWidget {
	/** The underlying entity ID */
	readonly eid: Entity;

	/** Sets the data values */
	setData(data: readonly number[]): SparklineWidget;

	/** Gets the data values */
	getData(): readonly number[];

	/** Appends a value to the data */
	append(value: number): SparklineWidget;

	/** Clears all data */
	clear(): SparklineWidget;

	/** Sets the position */
	setPosition(x: number, y: number): SparklineWidget;

	/** Destroys the widget */
	destroy(): void;
}

// =============================================================================
// SCHEMA
// =============================================================================

/**
 * Zod schema for sparkline widget configuration.
 */
export const SparklineConfigSchema = z.object({
	x: z.number().int().default(0),
	y: z.number().int().default(0),
	width: z.number().int().positive().default(20),
	data: z.array(z.number()).default([]),
	fg: z.union([z.string(), z.number()]).optional(),
	bg: z.union([z.string(), z.number()]).optional(),
	showMin: z.boolean().default(false),
	showMax: z.boolean().default(false),
	gradient: z.boolean().default(false),
	gradientStart: z.union([z.string(), z.number()]).optional(),
	gradientEnd: z.union([z.string(), z.number()]).optional(),
});

// =============================================================================
// COMPONENT TAG
// =============================================================================

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

/**
 * Sparkline component marker.
 */
export const Sparkline = {
	/** Tag indicating this is a sparkline widget (1 = yes) */
	isSparkline: new Uint8Array(DEFAULT_CAPACITY),
	/** Show min marker (1 = yes) */
	showMin: new Uint8Array(DEFAULT_CAPACITY),
	/** Show max marker (1 = yes) */
	showMax: new Uint8Array(DEFAULT_CAPACITY),
	/** Use gradient (1 = yes) */
	gradient: new Uint8Array(DEFAULT_CAPACITY),
};

/**
 * Sparkline state stored outside ECS.
 */
interface SparklineState {
	/** Data values */
	data: number[];
	/** Gradient start color */
	gradientStart: number;
	/** Gradient end color */
	gradientEnd: number;
}

/** Map of entity to sparkline state */
const sparklineStateMap = new Map<Entity, SparklineState>();

// =============================================================================
// RENDERING
// =============================================================================

/**
 * Renders sparkline data to braille characters.
 * @internal
 */
function renderSparkline(
	data: readonly number[],
	width: number,
	showMin: boolean,
	showMax: boolean,
): string {
	if (data.length === 0) {
		return ' '.repeat(width);
	}

	// Calculate min/max
	let min = Number.POSITIVE_INFINITY;
	let max = Number.NEGATIVE_INFINITY;
	for (const value of data) {
		if (value < min) min = value;
		if (value > max) max = value;
	}

	// Handle flat data
	if (min === max) {
		const halfChar = String.fromCharCode(BRAILLE_BASE | 0x44); // Middle dots
		return halfChar.repeat(width);
	}

	// Each character is 2 pixels wide, 4 pixels tall (braille 2x4 grid)
	const totalPixels = width * 2;
	const output: string[] = [];

	for (let charIdx = 0; charIdx < width; charIdx++) {
		// Each character represents 2 data points
		const pixelX1 = charIdx * 2;
		const pixelX2 = charIdx * 2 + 1;

		// Map pixel X to data index
		const dataIdx1 = Math.floor((pixelX1 / totalPixels) * data.length);
		const dataIdx2 = Math.floor((pixelX2 / totalPixels) * data.length);

		const value1 = data[dataIdx1] ?? 0;
		const value2 = data[dataIdx2] ?? 0;

		// Scale to 0-3 (4 vertical pixels)
		const y1 = Math.round(scaleValue(value1, min, max, 3, 0));
		const y2 = Math.round(scaleValue(value2, min, max, 3, 0));

		// Build dots for this character
		const dots: [number, number][] = [];

		// Column 0 (pixel 1)
		dots.push([0, Math.max(0, Math.min(3, y1))]);

		// Column 1 (pixel 2)
		dots.push([1, Math.max(0, Math.min(3, y2))]);

		// Add min/max markers
		if (showMin && (value1 === min || value2 === min)) {
			// Add bottom marker (row 3)
			dots.push([0, 3]);
			dots.push([1, 3]);
		}
		if (showMax && (value1 === max || value2 === max)) {
			// Add top marker (row 0)
			dots.push([0, 0]);
			dots.push([1, 0]);
		}

		output.push(combineBrailleDots(dots));
	}

	return output.join('');
}

/**
 * Updates the sparkline content.
 * @internal
 */
function updateSparklineContent(world: World, eid: Entity): void {
	const state = sparklineStateMap.get(eid);
	if (!state) return;

	const dims = getDimensions(world, eid);
	if (!dims) return;

	const showMin = Sparkline.showMin[eid] === 1;
	const showMax = Sparkline.showMax[eid] === 1;

	const content = renderSparkline(state.data, dims.width, showMin, showMax);
	setContent(world, eid, content);
	markDirty(world, eid);
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Creates a Sparkline widget with the given configuration.
 *
 * The Sparkline widget displays data trends in a compact single-line format
 * using braille characters for high-resolution rendering.
 *
 * @param world - The ECS world
 * @param config - Widget configuration
 * @returns The Sparkline widget instance
 *
 * @example
 * ```typescript
 * import { createWorld } from '../core/ecs';
 * import { createSparkline } from 'blecsd/widgets';
 *
 * const world = createWorld();
 *
 * const sparkline = createSparkline(world, {
 *   x: 0,
 *   y: 0,
 *   width: 40,
 *   data: [1, 3, 2, 5, 4, 6, 5, 7],
 *   showMin: true,
 *   showMax: true,
 * });
 *
 * // Append real-time data
 * sparkline.append(8);
 * ```
 */
export function createSparkline(world: World, config: SparklineConfig = {}): SparklineWidget {
	const validated = SparklineConfigSchema.parse(config);
	const eid = addEntity(world);

	// Set position
	setPosition(world, eid, validated.x, validated.y);

	// Set dimensions (height is always 1 for sparkline)
	setDimensions(world, eid, validated.width, 1);

	// Set component flags
	Sparkline.isSparkline[eid] = 1;
	Sparkline.showMin[eid] = validated.showMin ? 1 : 0;
	Sparkline.showMax[eid] = validated.showMax ? 1 : 0;
	Sparkline.gradient[eid] = validated.gradient ? 1 : 0;

	// Initialize state
	const defaultGradientStart = getChartColor(1); // Green
	const defaultGradientEnd = getChartColor(3); // Red

	sparklineStateMap.set(eid, {
		data: [...validated.data],
		gradientStart: validated.gradientStart
			? parseColor(validated.gradientStart)
			: defaultGradientStart,
		gradientEnd: validated.gradientEnd ? parseColor(validated.gradientEnd) : defaultGradientEnd,
	});

	// Set style
	if (validated.fg !== undefined || validated.bg !== undefined) {
		setStyle(world, eid, {
			fg: validated.fg !== undefined ? parseColor(validated.fg) : undefined,
			bg: validated.bg !== undefined ? parseColor(validated.bg) : undefined,
		});
	}

	// Initial render
	updateSparklineContent(world, eid);

	// Create the widget object
	const widget: SparklineWidget = {
		eid,

		setData(data: readonly number[]): SparklineWidget {
			const state = sparklineStateMap.get(eid);
			if (state) {
				state.data = [...data];
				updateSparklineContent(world, eid);
			}
			return widget;
		},

		getData(): readonly number[] {
			const state = sparklineStateMap.get(eid);
			return state?.data ?? [];
		},

		append(value: number): SparklineWidget {
			const state = sparklineStateMap.get(eid);
			if (state) {
				state.data.push(value);
				updateSparklineContent(world, eid);
			}
			return widget;
		},

		clear(): SparklineWidget {
			const state = sparklineStateMap.get(eid);
			if (state) {
				state.data = [];
				updateSparklineContent(world, eid);
			}
			return widget;
		},

		setPosition(x: number, y: number): SparklineWidget {
			setPosition(world, eid, x, y);
			markDirty(world, eid);
			return widget;
		},

		destroy(): void {
			Sparkline.isSparkline[eid] = 0;
			Sparkline.showMin[eid] = 0;
			Sparkline.showMax[eid] = 0;
			Sparkline.gradient[eid] = 0;
			sparklineStateMap.delete(eid);
			removeEntity(world, eid);
		},
	};

	return widget;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Checks if an entity is a sparkline widget.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @param eid - The entity ID
 * @returns true if the entity is a sparkline widget
 */
export function isSparkline(_world: World, eid: Entity): boolean {
	return Sparkline.isSparkline[eid] === 1;
}

/**
 * Resets the Sparkline component store. Useful for testing.
 * @internal
 */
export function resetSparklineStore(): void {
	Sparkline.isSparkline.fill(0);
	Sparkline.showMin.fill(0);
	Sparkline.showMax.fill(0);
	Sparkline.gradient.fill(0);
	sparklineStateMap.clear();
}
