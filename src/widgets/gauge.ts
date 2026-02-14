/**
 * Gauge Widget
 *
 * A horizontal gauge widget for displaying metrics as filled bars with
 * percentage indicators and threshold-based color changes.
 *
 * @module widgets/gauge
 */

import { z } from 'zod';
import { setContent } from '../components/content';
import { getDimensions, setDimensions } from '../components/dimensions';
import { setPosition } from '../components/position';
import { markDirty, setStyle } from '../components/renderable';
import { addEntity, removeEntity } from '../core/ecs';
import type { Entity, World } from '../core/types';
import { parseColor } from '../utils/color';
import { formatPercentage, renderBrailleBar } from './chartUtils';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Threshold configuration for color changes.
 */
export interface GaugeThreshold {
	/** Threshold value (0-1) */
	readonly value: number;
	/** Color to use when value >= threshold */
	readonly color: string | number;
}

/**
 * Configuration for creating a Gauge widget.
 */
export interface GaugeConfig {
	/** X position (default: 0) */
	readonly x?: number;
	/** Y position (default: 0) */
	readonly y?: number;
	/** Width in characters (default: 20) */
	readonly width?: number;
	/** Height in lines (default: 1) */
	readonly height?: number;
	/** Current value (0-1, default: 0) */
	readonly value?: number;
	/** Label text to display */
	readonly label?: string;
	/** Fill character (default: '█') */
	readonly fillChar?: string;
	/** Empty character (default: '░') */
	readonly emptyChar?: string;
	/** Default fill color */
	readonly fillColor?: string | number;
	/** Empty color */
	readonly emptyColor?: string | number;
	/** Show percentage (default: true) */
	readonly showPercentage?: boolean;
	/** Show value as number (default: false) */
	readonly showValue?: boolean;
	/** Thresholds for color changes */
	readonly thresholds?: readonly GaugeThreshold[];
	/** Minimum value for display (default: 0) */
	readonly min?: number;
	/** Maximum value for display (default: 100) */
	readonly max?: number;
	/** Render mode: 'block' uses fill/empty chars, 'braille' uses braille dots (default: 'block') */
	readonly renderMode?: 'block' | 'braille';
	/** Gradient start color for braille mode (optional) */
	readonly gradientStart?: string | number;
	/** Gradient end color for braille mode (optional) */
	readonly gradientEnd?: string | number;
}

/**
 * Gauge widget interface providing chainable methods.
 */
export interface GaugeWidget {
	/** The underlying entity ID */
	readonly eid: Entity;

	/** Sets the gauge value (0-1) */
	setValue(value: number): GaugeWidget;

	/** Gets the current value */
	getValue(): number;

	/** Sets the label text */
	setLabel(label: string): GaugeWidget;

	/** Gets the label text */
	getLabel(): string;

	/** Sets the position */
	setPosition(x: number, y: number): GaugeWidget;

	/** Sets the render mode */
	setRenderMode(mode: 'block' | 'braille'): GaugeWidget;

	/** Gets the render mode */
	getRenderMode(): 'block' | 'braille';

	/** Destroys the widget */
	destroy(): void;
}

// =============================================================================
// SCHEMA
// =============================================================================

/**
 * Zod schema for gauge threshold.
 */
const GaugeThresholdSchema = z.object({
	value: z.number().min(0).max(1),
	color: z.union([z.string(), z.number()]),
});

/**
 * Zod schema for gauge widget configuration.
 */
export const GaugeConfigSchema = z.object({
	x: z.number().int().default(0),
	y: z.number().int().default(0),
	width: z.number().int().positive().default(20),
	height: z.number().int().positive().default(1),
	value: z.number().min(0).max(1).default(0),
	label: z.string().optional(),
	fillChar: z.string().length(1).default('█'),
	emptyChar: z.string().length(1).default('░'),
	fillColor: z.union([z.string(), z.number()]).optional(),
	emptyColor: z.union([z.string(), z.number()]).optional(),
	showPercentage: z.boolean().default(true),
	showValue: z.boolean().default(false),
	thresholds: z.array(GaugeThresholdSchema).optional(),
	min: z.number().default(0),
	max: z.number().default(100),
	renderMode: z.enum(['block', 'braille']).default('block'),
	gradientStart: z.union([z.string(), z.number()]).optional(),
	gradientEnd: z.union([z.string(), z.number()]).optional(),
});

// =============================================================================
// COMPONENT TAG
// =============================================================================

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

/**
 * Gauge component marker.
 */
export const Gauge = {
	/** Tag indicating this is a gauge widget (1 = yes) */
	isGauge: new Uint8Array(DEFAULT_CAPACITY),
	/** Show percentage (1 = yes) */
	showPercentage: new Uint8Array(DEFAULT_CAPACITY),
	/** Show value (1 = yes) */
	showValue: new Uint8Array(DEFAULT_CAPACITY),
};

/**
 * Gauge state stored outside ECS.
 */
interface GaugeState {
	/** Current value (0-1) */
	value: number;
	/** Label text */
	label: string;
	/** Fill character */
	fillChar: string;
	/** Empty character */
	emptyChar: string;
	/** Fill color */
	fillColor: number | undefined;
	/** Empty color */
	emptyColor: number | undefined;
	/** Thresholds */
	thresholds: GaugeThreshold[];
	/** Min value for display */
	min: number;
	/** Max value for display */
	max: number;
	/** Render mode */
	renderMode: 'block' | 'braille';
	/** Gradient start color (for braille mode) */
	gradientStart: number | undefined;
	/** Gradient end color (for braille mode) */
	gradientEnd: number | undefined;
}

/** Map of entity to gauge state */
const gaugeStateMap = new Map<Entity, GaugeState>();

// =============================================================================
// RENDERING
// =============================================================================

/**
 * Gets the appropriate fill color based on thresholds.
 * @internal
 */
function getFillColor(value: number, state: GaugeState): number | undefined {
	if (!state.thresholds || state.thresholds.length === 0) {
		return state.fillColor;
	}

	// Find the highest threshold that the value meets
	let activeThreshold: GaugeThreshold | undefined;
	for (const threshold of state.thresholds) {
		if (value >= threshold.value) {
			if (!activeThreshold || threshold.value > activeThreshold.value) {
				activeThreshold = threshold;
			}
		}
	}

	if (activeThreshold) {
		return parseColor(activeThreshold.color);
	}

	return state.fillColor;
}

/**
 * Builds the status text for the gauge.
 * @internal
 */
function buildStatusText(eid: Entity, state: GaugeState): string {
	let statusText = '';
	if (state.label) {
		statusText = state.label;
	}
	if (Gauge.showPercentage[eid] === 1) {
		const percentText = formatPercentage(state.value);
		statusText = statusText ? `${statusText} ${percentText}` : percentText;
	}
	if (Gauge.showValue[eid] === 1) {
		const actualValue = state.min + state.value * (state.max - state.min);
		const valueText = `${actualValue.toFixed(1)}/${state.max}`;
		statusText = statusText ? `${statusText} ${valueText}` : valueText;
	}
	return statusText;
}

/**
 * Merges status text overlay with the gauge bar.
 * @internal
 */
function mergeStatusWithBar(bar: string, statusText: string, width: number): string {
	const padding = Math.floor((width - statusText.length) / 2);
	const overlay = ' '.repeat(padding) + statusText;

	let result = '';
	for (let i = 0; i < width; i++) {
		if (i < overlay.length && overlay[i] !== ' ') {
			result += overlay[i];
		} else {
			result += bar[i] ?? ' ';
		}
	}
	return result;
}

/**
 * Renders a single-line gauge with optional overlaid text.
 * @internal
 */
function renderSingleLineGauge(bar: string, statusText: string, width: number): string[] {
	if (!statusText || statusText.length >= width) {
		return [bar];
	}

	const merged = mergeStatusWithBar(bar, statusText, width);
	return [merged];
}

/**
 * Renders a multi-line gauge with bar on first line and text below.
 * @internal
 */
function renderMultiLineGauge(
	bar: string,
	statusText: string,
	width: number,
	height: number,
): string[] {
	const lines: string[] = [bar];
	if (statusText) {
		lines.push(statusText.padEnd(width, ' '));
	}
	while (lines.length < height) {
		lines.push(' '.repeat(width));
	}
	return lines;
}

/**
 * Renders the gauge content in braille mode.
 * @internal
 */
function renderBrailleGauge(eid: Entity, state: GaugeState, width: number, height: number): string {
	// Use braille bar rendering for sub-cell precision
	const bar = renderBrailleBar(state.value, width);

	// Build status text
	const statusText = buildStatusText(eid, state);

	// Overlay status text on the bar if it fits
	const lines =
		height === 1
			? renderSingleLineGauge(bar, statusText, width)
			: renderMultiLineGauge(bar, statusText, width, height);

	return lines.join('\n');
}

/**
 * Renders the gauge content in block mode.
 * @internal
 */
function renderBlockGauge(eid: Entity, state: GaugeState, width: number, height: number): string {
	// Calculate the fill width
	const fillWidth = Math.round(state.value * width);
	const emptyWidth = width - fillWidth;

	// Build the gauge bar
	const bar = state.fillChar.repeat(fillWidth) + state.emptyChar.repeat(emptyWidth);

	// Build status text
	const statusText = buildStatusText(eid, state);

	// Overlay status text on the bar if it fits
	const lines =
		height === 1
			? renderSingleLineGauge(bar, statusText, width)
			: renderMultiLineGauge(bar, statusText, width, height);

	return lines.join('\n');
}

/**
 * Renders the gauge content.
 * @internal
 */
function renderGauge(eid: Entity, state: GaugeState, width: number, height: number): string {
	if (state.renderMode === 'braille') {
		return renderBrailleGauge(eid, state, width, height);
	}
	return renderBlockGauge(eid, state, width, height);
}

/**
 * Updates the gauge content.
 * @internal
 */
function updateGaugeContent(world: World, eid: Entity): void {
	const state = gaugeStateMap.get(eid);
	if (!state) return;

	const dims = getDimensions(world, eid);
	if (!dims) return;

	const content = renderGauge(eid, state, dims.width, dims.height);
	setContent(world, eid, content);

	// Update style based on threshold
	const fillColor = getFillColor(state.value, state);
	if (fillColor !== undefined) {
		setStyle(world, eid, { fg: fillColor });
	}

	markDirty(world, eid);
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Creates a Gauge widget with the given configuration.
 *
 * The Gauge widget displays metrics as horizontal filled bars with
 * percentage indicators and threshold-based color changes.
 *
 * @param world - The ECS world
 * @param config - Widget configuration
 * @returns The Gauge widget instance
 *
 * @example
 * ```typescript
 * import { createWorld } from '../core/ecs';
 * import { createGauge } from 'blecsd/widgets';
 *
 * const world = createWorld();
 *
 * const gauge = createGauge(world, {
 *   x: 0,
 *   y: 0,
 *   width: 30,
 *   value: 0.75,
 *   label: 'CPU',
 *   thresholds: [
 *     { value: 0.7, color: '#ff9800' }, // Warning at 70%
 *     { value: 0.9, color: '#f44336' }, // Danger at 90%
 *   ],
 * });
 *
 * // Update value
 * gauge.setValue(0.85);
 * ```
 */
export function createGauge(world: World, config: GaugeConfig = {}): GaugeWidget {
	const validated = GaugeConfigSchema.parse(config);
	const eid = addEntity(world);

	// Set position
	setPosition(world, eid, validated.x, validated.y);

	// Set dimensions
	setDimensions(world, eid, validated.width, validated.height);

	// Set component flags
	Gauge.isGauge[eid] = 1;
	Gauge.showPercentage[eid] = validated.showPercentage ? 1 : 0;
	Gauge.showValue[eid] = validated.showValue ? 1 : 0;

	// Initialize state
	gaugeStateMap.set(eid, {
		value: validated.value,
		label: validated.label ?? '',
		fillChar: validated.fillChar,
		emptyChar: validated.emptyChar,
		fillColor: validated.fillColor ? parseColor(validated.fillColor) : undefined,
		emptyColor: validated.emptyColor ? parseColor(validated.emptyColor) : undefined,
		thresholds: validated.thresholds ? [...validated.thresholds] : [],
		min: validated.min,
		max: validated.max,
		renderMode: validated.renderMode,
		gradientStart: validated.gradientStart ? parseColor(validated.gradientStart) : undefined,
		gradientEnd: validated.gradientEnd ? parseColor(validated.gradientEnd) : undefined,
	});

	// Initial render
	updateGaugeContent(world, eid);

	// Create the widget object
	const widget: GaugeWidget = {
		eid,

		setValue(value: number): GaugeWidget {
			const state = gaugeStateMap.get(eid);
			if (state) {
				state.value = Math.max(0, Math.min(1, value));
				updateGaugeContent(world, eid);
			}
			return widget;
		},

		getValue(): number {
			const state = gaugeStateMap.get(eid);
			return state?.value ?? 0;
		},

		setLabel(label: string): GaugeWidget {
			const state = gaugeStateMap.get(eid);
			if (state) {
				state.label = label;
				updateGaugeContent(world, eid);
			}
			return widget;
		},

		getLabel(): string {
			const state = gaugeStateMap.get(eid);
			return state?.label ?? '';
		},

		setPosition(x: number, y: number): GaugeWidget {
			setPosition(world, eid, x, y);
			markDirty(world, eid);
			return widget;
		},

		setRenderMode(mode: 'block' | 'braille'): GaugeWidget {
			const state = gaugeStateMap.get(eid);
			if (state) {
				state.renderMode = mode;
				updateGaugeContent(world, eid);
			}
			return widget;
		},

		getRenderMode(): 'block' | 'braille' {
			const state = gaugeStateMap.get(eid);
			return state?.renderMode ?? 'block';
		},

		destroy(): void {
			Gauge.isGauge[eid] = 0;
			Gauge.showPercentage[eid] = 0;
			Gauge.showValue[eid] = 0;
			gaugeStateMap.delete(eid);
			removeEntity(world, eid);
		},
	};

	return widget;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Checks if an entity is a gauge widget.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @param eid - The entity ID
 * @returns true if the entity is a gauge widget
 */
export function isGauge(_world: World, eid: Entity): boolean {
	return Gauge.isGauge[eid] === 1;
}

/**
 * Resets the Gauge component store. Useful for testing.
 * @internal
 */
export function resetGaugeStore(): void {
	Gauge.isGauge.fill(0);
	Gauge.showPercentage.fill(0);
	Gauge.showValue.fill(0);
	gaugeStateMap.clear();
}
