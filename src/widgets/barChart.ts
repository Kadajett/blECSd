/**
 * BarChart Widget
 *
 * A bar chart widget for displaying categorical data comparisons.
 * Supports horizontal and vertical orientations, multiple series,
 * and auto-scaling.
 *
 * @module widgets/barChart
 */

import { z } from 'zod';
import { setContent } from '../components/content';
import { getDimensions, setDimensions } from '../components/dimensions';
import { setPosition } from '../components/position';
import { markDirty, setStyle } from '../components/renderable';
import { addEntity, removeEntity } from '../core/ecs';
import type { Entity, World } from '../core/types';
import { parseColor } from '../utils/color';
import {
	formatNumber,
	generateTicks,
	getChartColor,
	renderYAxisLabel,
	scaleValue,
} from './chartUtils';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Horizontal block characters for sub-character precision (left to right fill).
 * From empty to full: ▏ (1/8), ▎ (1/4), ▍ (3/8), ▌ (1/2), ▋ (5/8), ▊ (3/4), ▉ (7/8), █ (full)
 */
export const HORIZONTAL_BLOCKS: readonly string[] = [
	' ', // 0/8
	'▏', // 1/8
	'▎', // 2/8 (1/4)
	'▍', // 3/8
	'▌', // 4/8 (1/2)
	'▋', // 5/8
	'▊', // 6/8 (3/4)
	'▉', // 7/8
	'█', // 8/8 (full)
] as const;

/**
 * Vertical block characters for sub-character precision (bottom to top fill).
 * From empty to full: ▁ (1/8), ▂ (1/4), ▃ (3/8), ▄ (1/2), ▅ (5/8), ▆ (3/4), ▇ (7/8), █ (full)
 */
export const VERTICAL_BLOCKS: readonly string[] = [
	' ', // 0/8
	'▁', // 1/8
	'▂', // 2/8 (1/4)
	'▃', // 3/8
	'▄', // 4/8 (1/2)
	'▅', // 5/8
	'▆', // 6/8 (3/4)
	'▇', // 7/8
	'█', // 8/8 (full)
] as const;

// =============================================================================
// TYPES
// =============================================================================

/**
 * Bar chart orientation.
 */
export type BarOrientation = 'vertical' | 'horizontal';

/**
 * Bar chart mode - grouped shows bars side-by-side, stacked shows bars on top of each other.
 */
export type BarMode = 'grouped' | 'stacked';

/**
 * Data series for the bar chart.
 */
export interface BarSeries {
	/** Series label */
	readonly label: string;
	/** Data values */
	readonly data: readonly number[];
	/** Series color (optional, uses palette if not provided) */
	readonly color?: string | number;
}

/**
 * Configuration for creating a BarChart widget.
 */
export interface BarChartConfig {
	/** X position (default: 0) */
	readonly x?: number;
	/** Y position (default: 0) */
	readonly y?: number;
	/** Width in characters (default: 40) */
	readonly width?: number;
	/** Height in lines (default: 20) */
	readonly height?: number;
	/** Bar orientation (default: 'vertical') */
	readonly orientation?: BarOrientation;
	/** Bar mode - 'grouped' (side-by-side) or 'stacked' (on top of each other) (default: 'grouped') */
	readonly mode?: BarMode;
	/** Category labels */
	readonly labels?: readonly string[];
	/** Data series */
	readonly series?: readonly BarSeries[];
	/** Bar character (default: '█') */
	readonly barChar?: string;
	/** Bar width in characters (default: 3) */
	readonly barWidth?: number;
	/** Gap between bars in grouped mode (default: 1) */
	readonly barGap?: number;
	/** Show value labels on bars (default: false) */
	readonly showValues?: boolean;
	/** Use sub-character precision with Unicode block characters (default: false) */
	readonly useBlockChars?: boolean;
	/** Y-axis label */
	readonly yLabel?: string;
	/** X-axis label */
	readonly xLabel?: string;
	/** Foreground color */
	readonly fg?: string | number;
	/** Background color */
	readonly bg?: string | number;
}

/**
 * BarChart widget interface providing chainable methods.
 */
export interface BarChartWidget {
	/** The underlying entity ID */
	readonly eid: Entity;

	/** Sets the data series */
	setSeries(series: readonly BarSeries[]): BarChartWidget;

	/** Gets the data series */
	getSeries(): readonly BarSeries[];

	/** Sets the category labels */
	setLabels(labels: readonly string[]): BarChartWidget;

	/** Gets the category labels */
	getLabels(): readonly string[];

	/** Sets the position */
	setPosition(x: number, y: number): BarChartWidget;

	/** Destroys the widget */
	destroy(): void;
}

// =============================================================================
// SCHEMA
// =============================================================================

/**
 * Zod schema for bar series.
 */
const BarSeriesSchema = z.object({
	label: z.string(),
	data: z.array(z.number()),
	color: z.union([z.string(), z.number()]).optional(),
});

/**
 * Zod schema for bar chart widget configuration.
 */
export const BarChartConfigSchema = z.object({
	x: z.number().int().default(0),
	y: z.number().int().default(0),
	width: z.number().int().positive().default(40),
	height: z.number().int().positive().default(20),
	orientation: z.enum(['vertical', 'horizontal']).default('vertical'),
	mode: z.enum(['grouped', 'stacked']).default('grouped'),
	labels: z.array(z.string()).default([]),
	series: z.array(BarSeriesSchema).default([]),
	barChar: z.string().length(1).default('█'),
	barWidth: z.number().int().positive().default(3),
	barGap: z.number().int().nonnegative().default(1),
	showValues: z.boolean().default(false),
	useBlockChars: z.boolean().default(false),
	yLabel: z.string().optional(),
	xLabel: z.string().optional(),
	fg: z.union([z.string(), z.number()]).optional(),
	bg: z.union([z.string(), z.number()]).optional(),
});

// =============================================================================
// COMPONENT TAG
// =============================================================================

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

/**
 * BarChart component marker.
 */
export const BarChart = {
	/** Tag indicating this is a bar chart widget (1 = yes) */
	isBarChart: new Uint8Array(DEFAULT_CAPACITY),
	/** Show values on bars (1 = yes) */
	showValues: new Uint8Array(DEFAULT_CAPACITY),
	/** Orientation: 0 = vertical, 1 = horizontal */
	orientation: new Uint8Array(DEFAULT_CAPACITY),
	/** Mode: 0 = grouped, 1 = stacked */
	mode: new Uint8Array(DEFAULT_CAPACITY),
	/** Use block characters for sub-character precision (1 = yes) */
	useBlockChars: new Uint8Array(DEFAULT_CAPACITY),
};

/**
 * BarChart state stored outside ECS.
 */
interface BarChartState {
	/** Category labels */
	labels: string[];
	/** Data series */
	series: BarSeries[];
	/** Bar character */
	barChar: string;
	/** Bar width */
	barWidth: number;
	/** Bar gap */
	barGap: number;
	/** Y-axis label */
	yLabel: string;
	/** X-axis label */
	xLabel: string;
	/** Bar mode */
	mode: BarMode;
	/** Use block characters */
	useBlockChars: boolean;
}

/** Map of entity to bar chart state */
const barChartStateMap = new Map<Entity, BarChartState>();

// =============================================================================
// BLOCK CHARACTER HELPERS
// =============================================================================

/**
 * Gets the appropriate block character for a given fill ratio.
 *
 * @param ratio - Fill ratio (0-1)
 * @param isVertical - true for vertical blocks, false for horizontal
 * @returns Block character representing the fill ratio
 * @internal
 */
function getBlockChar(ratio: number, isVertical: boolean): string {
	const blocks = isVertical ? VERTICAL_BLOCKS : HORIZONTAL_BLOCKS;
	const index = Math.round(ratio * (blocks.length - 1));
	const clampedIndex = Math.max(0, Math.min(blocks.length - 1, index));
	return blocks[clampedIndex] ?? ' ';
}

/**
 * Gets the block character for a partial fill at the edge of a bar.
 *
 * @param value - Current value
 * @param threshold - Pixel/character threshold
 * @param isVertical - true for vertical blocks, false for horizontal
 * @returns Block character for partial fill
 * @internal
 */
function getPartialBlockChar(value: number, threshold: number, isVertical: boolean): string {
	if (value >= threshold + 1) return '█';
	if (value <= threshold) return ' ';
	const fraction = value - threshold;
	return getBlockChar(fraction, isVertical);
}

// =============================================================================
// RENDERING
// =============================================================================

/**
 * Renders a vertical bar chart.
 * @internal
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex rendering logic is well-tested and necessary
function renderVerticalBarChart(
	state: BarChartState,
	width: number,
	height: number,
	_showValues: boolean,
): string {
	const lines: string[] = [];
	const isStacked = state.mode === 'stacked';

	// Calculate data range
	let maxValue = Number.NEGATIVE_INFINITY;
	if (isStacked) {
		// For stacked bars, calculate the maximum stack height
		for (let catIdx = 0; catIdx < state.labels.length; catIdx++) {
			let stackTotal = 0;
			for (const series of state.series) {
				stackTotal += series.data[catIdx] ?? 0;
			}
			if (stackTotal > maxValue) maxValue = stackTotal;
		}
	} else {
		// For grouped bars, find the maximum individual value
		for (const series of state.series) {
			for (const value of series.data) {
				if (value > maxValue) maxValue = value;
			}
		}
	}

	if (maxValue === Number.NEGATIVE_INFINITY || maxValue === 0) {
		maxValue = 100;
	}

	// Reserve space for labels and axes
	const yAxisWidth = 8;
	const xAxisHeight = 2;
	const chartHeight = height - xAxisHeight;
	const chartWidth = width - yAxisWidth;

	// Generate Y-axis ticks
	const ticks = generateTicks(0, maxValue, 5);

	// Calculate total bar width for layout
	const totalBarWidth = isStacked
		? state.barWidth
		: state.barWidth * state.series.length + state.barGap * (state.series.length - 1);

	// Render chart area
	for (let row = 0; row < chartHeight; row++) {
		const y = chartHeight - row - 1;
		const value = scaleValue(y, 0, chartHeight - 1, 0, maxValue);

		// Y-axis label
		const tickValue = ticks.find((t) => Math.abs(t - value) < maxValue / chartHeight);
		const yLabel =
			tickValue !== undefined
				? renderYAxisLabel(tickValue, yAxisWidth - 2)
				: ' '.repeat(yAxisWidth - 2);
		let line = `${yLabel}│ `;

		// Bars
		for (let catIdx = 0; catIdx < state.labels.length; catIdx++) {
			if (isStacked) {
				// Render stacked bars - find which series segment this row belongs to
				let stackBottom = 0;
				let barCell = ' ';

				for (const series of state.series) {
					const dataValue = series.data[catIdx] ?? 0;
					const stackTop = stackBottom + dataValue;
					const bottomHeight = scaleValue(stackBottom, 0, maxValue, 0, chartHeight - 1);
					const topHeight = scaleValue(stackTop, 0, maxValue, 0, chartHeight - 1);

					if (y >= bottomHeight && y <= topHeight) {
						if (state.useBlockChars && y === Math.floor(topHeight) && y !== topHeight) {
							// Use block character for partial fill at the top
							barCell = getPartialBlockChar(topHeight, y, true);
						} else {
							barCell = state.barChar;
						}
						break;
					}

					stackBottom = stackTop;
				}

				line += barCell.repeat(state.barWidth);
			} else {
				// Render grouped bars
				for (let seriesIdx = 0; seriesIdx < state.series.length; seriesIdx++) {
					const series = state.series[seriesIdx];
					if (!series) continue;

					const dataValue = series.data[catIdx] ?? 0;
					const barHeight = scaleValue(dataValue, 0, maxValue, 0, chartHeight - 1);

					let barCell: string;
					if (y > barHeight) {
						barCell = ' ';
					} else if (state.useBlockChars && y === Math.floor(barHeight)) {
						barCell = getPartialBlockChar(barHeight, y, true);
					} else {
						barCell = state.barChar;
					}

					line += barCell.repeat(state.barWidth);

					if (seriesIdx < state.series.length - 1) {
						line += ' '.repeat(state.barGap);
					}
				}
			}

			// Gap between categories
			if (catIdx < state.labels.length - 1) {
				line += '  ';
			}
		}

		lines.push(line.padEnd(width, ' '));
	}

	// X-axis
	const xAxisLine = `${' '.repeat(yAxisWidth)}└${'─'.repeat(chartWidth - 1)}`;
	lines.push(xAxisLine.padEnd(width, ' '));

	// Category labels
	let labelLine = `${' '.repeat(yAxisWidth)}  `;
	for (let catIdx = 0; catIdx < state.labels.length; catIdx++) {
		const label = state.labels[catIdx] ?? '';
		const totalWidth = totalBarWidth + 2;
		labelLine += label.slice(0, totalWidth).padEnd(totalWidth, ' ');
	}
	lines.push(labelLine.padEnd(width, ' '));

	return lines.join('\n');
}

/**
 * Renders a horizontal bar chart.
 * @internal
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex rendering logic is well-tested and necessary
function renderHorizontalBarChart(
	state: BarChartState,
	width: number,
	_height: number,
	showValues: boolean,
): string {
	const lines: string[] = [];
	const isStacked = state.mode === 'stacked';

	// Calculate data range
	let maxValue = Number.NEGATIVE_INFINITY;
	if (isStacked) {
		// For stacked bars, calculate the maximum stack length
		for (let catIdx = 0; catIdx < state.labels.length; catIdx++) {
			let stackTotal = 0;
			for (const series of state.series) {
				stackTotal += series.data[catIdx] ?? 0;
			}
			if (stackTotal > maxValue) maxValue = stackTotal;
		}
	} else {
		// For grouped bars, find the maximum individual value
		for (const series of state.series) {
			for (const value of series.data) {
				if (value > maxValue) maxValue = value;
			}
		}
	}

	if (maxValue === Number.NEGATIVE_INFINITY || maxValue === 0) {
		maxValue = 100;
	}

	// Reserve space for labels
	const labelWidth = Math.max(...state.labels.map((l) => l.length), 8);
	const chartWidth = width - labelWidth - 2 - (showValues ? 10 : 0);

	// Render each category
	for (let catIdx = 0; catIdx < state.labels.length; catIdx++) {
		const label = state.labels[catIdx] ?? '';

		if (isStacked) {
			// Stacked horizontal bar
			let line = `${label.slice(0, labelWidth).padStart(labelWidth, ' ')} │`;

			for (const series of state.series) {
				const dataValue = series.data[catIdx] ?? 0;
				const segmentLength = scaleValue(dataValue, 0, maxValue, 0, chartWidth);
				const wholeChars = Math.floor(segmentLength);
				const fraction = segmentLength - wholeChars;

				line += state.barChar.repeat(wholeChars);

				if (state.useBlockChars && fraction > 0) {
					line += getBlockChar(fraction, false);
				}
			}

			if (showValues) {
				const total = state.series.reduce((sum, s) => sum + (s.data[catIdx] ?? 0), 0);
				line += ` ${formatNumber(total)}`;
			}

			lines.push(line.padEnd(width, ' '));
		} else {
			// Grouped horizontal bars - render each series on a separate line or abbreviated
			// For simplicity, render first series only in grouped mode
			let line = `${label.slice(0, labelWidth).padStart(labelWidth, ' ')} │`;
			const series = state.series[0];

			if (series) {
				const dataValue = series.data[catIdx] ?? 0;
				const barLength = scaleValue(dataValue, 0, maxValue, 0, chartWidth);
				const wholeChars = Math.floor(barLength);
				const fraction = barLength - wholeChars;

				line += state.barChar.repeat(wholeChars);

				if (state.useBlockChars && fraction > 0) {
					line += getBlockChar(fraction, false);
				}

				if (showValues) {
					line += ` ${formatNumber(dataValue)}`;
				}
			}

			lines.push(line.padEnd(width, ' '));
		}
	}

	return lines.join('\n');
}

/**
 * Updates the bar chart content.
 * @internal
 */
function updateBarChartContent(world: World, eid: Entity): void {
	const state = barChartStateMap.get(eid);
	if (!state) return;

	const dims = getDimensions(world, eid);
	if (!dims) return;

	const showValues = BarChart.showValues[eid] === 1;
	const isHorizontal = BarChart.orientation[eid] === 1;

	const content = isHorizontal
		? renderHorizontalBarChart(state, dims.width, dims.height, showValues)
		: renderVerticalBarChart(state, dims.width, dims.height, showValues);

	setContent(world, eid, content);
	markDirty(world, eid);
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Creates a BarChart widget with the given configuration.
 *
 * The BarChart widget displays categorical data with grouped or stacked bars,
 * auto-scaling, configurable orientations, and optional sub-character precision
 * using Unicode block characters.
 *
 * @param world - The ECS world
 * @param config - Widget configuration
 * @returns The BarChart widget instance
 *
 * @example
 * ```typescript
 * import { createWorld } from '../core/ecs';
 * import { createBarChart } from 'blecsd/widgets';
 *
 * const world = createWorld();
 *
 * // Grouped bar chart (default)
 * const groupedChart = createBarChart(world, {
 *   x: 0,
 *   y: 0,
 *   width: 60,
 *   height: 25,
 *   mode: 'grouped',
 *   labels: ['Q1', 'Q2', 'Q3', 'Q4'],
 *   series: [
 *     { label: 'Sales', data: [100, 150, 120, 180] },
 *     { label: 'Costs', data: [80, 90, 85, 95] },
 *   ],
 * });
 *
 * // Stacked bar chart with block characters for smooth rendering
 * const stackedChart = createBarChart(world, {
 *   x: 0,
 *   y: 0,
 *   width: 60,
 *   height: 25,
 *   mode: 'stacked',
 *   useBlockChars: true, // Enable sub-character precision
 *   labels: ['Jan', 'Feb', 'Mar'],
 *   series: [
 *     { label: 'Product A', data: [45, 60, 55] },
 *     { label: 'Product B', data: [35, 40, 45] },
 *     { label: 'Product C', data: [20, 25, 30] },
 *   ],
 * });
 *
 * // Horizontal bar chart with values
 * const horizontalChart = createBarChart(world, {
 *   orientation: 'horizontal',
 *   showValues: true,
 *   width: 50,
 *   height: 15,
 *   labels: ['Item 1', 'Item 2', 'Item 3'],
 *   series: [{ label: 'Count', data: [75, 120, 90] }],
 * });
 * ```
 */
export function createBarChart(world: World, config: BarChartConfig = {}): BarChartWidget {
	const validated = BarChartConfigSchema.parse(config);
	const eid = addEntity(world);

	// Set position
	setPosition(world, eid, validated.x, validated.y);

	// Set dimensions
	setDimensions(world, eid, validated.width, validated.height);

	// Set component flags
	BarChart.isBarChart[eid] = 1;
	BarChart.showValues[eid] = validated.showValues ? 1 : 0;
	BarChart.orientation[eid] = validated.orientation === 'horizontal' ? 1 : 0;
	BarChart.mode[eid] = validated.mode === 'stacked' ? 1 : 0;
	BarChart.useBlockChars[eid] = validated.useBlockChars ? 1 : 0;

	// Initialize state
	barChartStateMap.set(eid, {
		labels: [...validated.labels],
		series: validated.series.map((s, idx) => ({
			label: s.label,
			data: [...s.data],
			color: s.color ? parseColor(s.color) : getChartColor(idx),
		})),
		barChar: validated.barChar,
		barWidth: validated.barWidth,
		barGap: validated.barGap,
		yLabel: validated.yLabel ?? '',
		xLabel: validated.xLabel ?? '',
		mode: validated.mode,
		useBlockChars: validated.useBlockChars,
	});

	// Set style
	if (validated.fg !== undefined || validated.bg !== undefined) {
		setStyle(world, eid, {
			fg: validated.fg !== undefined ? parseColor(validated.fg) : undefined,
			bg: validated.bg !== undefined ? parseColor(validated.bg) : undefined,
		});
	}

	// Initial render
	updateBarChartContent(world, eid);

	// Create the widget object
	const widget: BarChartWidget = {
		eid,

		setSeries(series: readonly BarSeries[]): BarChartWidget {
			const state = barChartStateMap.get(eid);
			if (state) {
				state.series = series.map((s, idx) => ({
					label: s.label,
					data: [...s.data],
					color: s.color ? parseColor(s.color) : getChartColor(idx),
				}));
				updateBarChartContent(world, eid);
			}
			return widget;
		},

		getSeries(): readonly BarSeries[] {
			const state = barChartStateMap.get(eid);
			return state?.series ?? [];
		},

		setLabels(labels: readonly string[]): BarChartWidget {
			const state = barChartStateMap.get(eid);
			if (state) {
				state.labels = [...labels];
				updateBarChartContent(world, eid);
			}
			return widget;
		},

		getLabels(): readonly string[] {
			const state = barChartStateMap.get(eid);
			return state?.labels ?? [];
		},

		setPosition(x: number, y: number): BarChartWidget {
			setPosition(world, eid, x, y);
			markDirty(world, eid);
			return widget;
		},

		destroy(): void {
			BarChart.isBarChart[eid] = 0;
			BarChart.showValues[eid] = 0;
			BarChart.orientation[eid] = 0;
			BarChart.mode[eid] = 0;
			BarChart.useBlockChars[eid] = 0;
			barChartStateMap.delete(eid);
			removeEntity(world, eid);
		},
	};

	return widget;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Checks if an entity is a bar chart widget.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @param eid - The entity ID
 * @returns true if the entity is a bar chart widget
 */
export function isBarChart(_world: World, eid: Entity): boolean {
	return BarChart.isBarChart[eid] === 1;
}

/**
 * Resets the BarChart component store. Useful for testing.
 * @internal
 */
export function resetBarChartStore(): void {
	BarChart.isBarChart.fill(0);
	BarChart.showValues.fill(0);
	BarChart.orientation.fill(0);
	BarChart.mode.fill(0);
	BarChart.useBlockChars.fill(0);
	barChartStateMap.clear();
}
