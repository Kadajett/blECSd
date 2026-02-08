/**
 * LineChart Widget
 *
 * A line chart widget for time-series visualization with multiple data series,
 * auto-scaling, braille character rendering for high resolution, and real-time
 * data append support.
 *
 * @module widgets/lineChart
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
	BRAILLE_BASE,
	BRAILLE_DOTS,
	generateTicks,
	getChartColor,
	renderYAxisLabel,
	scaleValue,
} from './chartUtils';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Data series for the line chart.
 */
export interface LineSeries {
	/** Series label */
	readonly label: string;
	/** Data points (Y values) */
	readonly data: readonly number[];
	/** Series color (optional, uses palette if not provided) */
	readonly color?: string | number;
}

/**
 * Configuration for creating a LineChart widget.
 */
export interface LineChartConfig {
	/** X position (default: 0) */
	readonly x?: number;
	/** Y position (default: 0) */
	readonly y?: number;
	/** Width in characters (default: 60) */
	readonly width?: number;
	/** Height in lines (default: 20) */
	readonly height?: number;
	/** Data series */
	readonly series?: readonly LineSeries[];
	/** X-axis labels (optional) */
	readonly xLabels?: readonly string[];
	/** Y-axis label */
	readonly yLabel?: string;
	/** X-axis label */
	readonly xLabel?: string;
	/** Show legend (default: false) */
	readonly showLegend?: boolean;
	/** Show grid lines (default: true) */
	readonly showGrid?: boolean;
	/** Foreground color */
	readonly fg?: string | number;
	/** Background color */
	readonly bg?: string | number;
	/** Minimum Y value (auto if not specified) */
	readonly minY?: number;
	/** Maximum Y value (auto if not specified) */
	readonly maxY?: number;
}

/**
 * LineChart widget interface providing chainable methods.
 */
export interface LineChartWidget {
	/** The underlying entity ID */
	readonly eid: Entity;

	/** Sets the data series */
	setSeries(series: readonly LineSeries[]): LineChartWidget;

	/** Gets the data series */
	getSeries(): readonly LineSeries[];

	/** Appends a value to a specific series */
	appendToSeries(seriesIndex: number, value: number): LineChartWidget;

	/** Clears all data */
	clear(): LineChartWidget;

	/** Sets the position */
	setPosition(x: number, y: number): LineChartWidget;

	/** Destroys the widget */
	destroy(): void;
}

// =============================================================================
// SCHEMA
// =============================================================================

/**
 * Zod schema for line series.
 */
const LineSeriesSchema = z.object({
	label: z.string(),
	data: z.array(z.number()),
	color: z.union([z.string(), z.number()]).optional(),
});

/**
 * Zod schema for line chart widget configuration.
 */
export const LineChartConfigSchema = z.object({
	x: z.number().int().default(0),
	y: z.number().int().default(0),
	width: z.number().int().positive().default(60),
	height: z.number().int().positive().default(20),
	series: z.array(LineSeriesSchema).default([]),
	xLabels: z.array(z.string()).optional(),
	yLabel: z.string().optional(),
	xLabel: z.string().optional(),
	showLegend: z.boolean().default(false),
	showGrid: z.boolean().default(true),
	fg: z.union([z.string(), z.number()]).optional(),
	bg: z.union([z.string(), z.number()]).optional(),
	minY: z.number().optional(),
	maxY: z.number().optional(),
});

// =============================================================================
// COMPONENT TAG
// =============================================================================

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

/**
 * LineChart component marker.
 */
export const LineChart = {
	/** Tag indicating this is a line chart widget (1 = yes) */
	isLineChart: new Uint8Array(DEFAULT_CAPACITY),
	/** Show legend (1 = yes) */
	showLegend: new Uint8Array(DEFAULT_CAPACITY),
	/** Show grid (1 = yes) */
	showGrid: new Uint8Array(DEFAULT_CAPACITY),
};

/**
 * LineChart state stored outside ECS.
 */
interface LineChartState {
	/** Data series */
	series: LineSeries[];
	/** X-axis labels */
	xLabels: string[];
	/** Y-axis label */
	yLabel: string;
	/** X-axis label */
	xLabel: string;
	/** Min Y value */
	minY: number | undefined;
	/** Max Y value */
	maxY: number | undefined;
}

/** Map of entity to line chart state */
const lineChartStateMap = new Map<Entity, LineChartState>();

// =============================================================================
// RENDERING
// =============================================================================

/**
 * Renders a line chart using braille characters for high resolution.
 * @internal
 */
function renderLineChart(
	state: LineChartState,
	width: number,
	height: number,
	_showGrid: boolean,
	showLegend: boolean,
): string {
	const lines: string[] = [];

	// Calculate data range
	let minY = state.minY ?? Number.POSITIVE_INFINITY;
	let maxY = state.maxY ?? Number.NEGATIVE_INFINITY;

	if (state.minY === undefined || state.maxY === undefined) {
		for (const series of state.series) {
			for (const value of series.data) {
				if (value < minY) minY = value;
				if (value > maxY) maxY = value;
			}
		}
	}

	if (minY === Number.POSITIVE_INFINITY) minY = 0;
	if (maxY === Number.NEGATIVE_INFINITY) maxY = 100;

	// Reserve space for axes and legend
	const yAxisWidth = 8;
	const xAxisHeight = 2;
	const legendHeight = showLegend && state.series.length > 0 ? 2 : 0;
	const chartHeight = height - xAxisHeight - legendHeight;
	const chartWidth = width - yAxisWidth;

	// Braille gives us 4x vertical resolution (4 pixels per character height)
	const pixelHeight = chartHeight * 4;

	// Calculate max data points
	let maxDataPoints = 0;
	for (const series of state.series) {
		if (series.data.length > maxDataPoints) {
			maxDataPoints = series.data.length;
		}
	}

	// Generate Y-axis ticks
	const ticks = generateTicks(minY, maxY, 5);

	// Initialize chart grid (braille characters)
	const grid: number[][] = Array.from({ length: chartHeight }, () =>
		Array(chartWidth).fill(BRAILLE_BASE),
	);

	// Plot each series
	for (const series of state.series) {
		if (series.data.length === 0) continue;

		for (let dataIdx = 0; dataIdx < series.data.length; dataIdx++) {
			const value = series.data[dataIdx] ?? 0;

			// Map data index to X pixel
			const xPixel = Math.floor((dataIdx / (maxDataPoints - 1 || 1)) * (chartWidth * 2 - 1));
			const charX = Math.floor(xPixel / 2);
			const col = xPixel % 2;

			// Map value to Y pixel (inverted because terminal coords are top-down)
			const yPixel = Math.round(scaleValue(value, minY, maxY, pixelHeight - 1, 0));
			const charY = Math.floor(yPixel / 4);
			const row = yPixel % 4;

			// Set the braille dot
			if (charX >= 0 && charX < chartWidth && charY >= 0 && charY < chartHeight) {
				const rowDots = BRAILLE_DOTS[row];
				if (rowDots) {
					const dotBit = rowDots[col] ?? 0;
					if (grid[charY] && grid[charY][charX] !== undefined) {
						grid[charY]![charX]! |= dotBit;
					}
				}
			}
		}
	}

	// Render chart area
	for (let row = 0; row < chartHeight; row++) {
		const y = chartHeight - row - 1;
		const value = scaleValue(y, 0, chartHeight - 1, minY, maxY);

		// Y-axis label
		const tickValue = ticks.find((t) => Math.abs(t - value) < (maxY - minY) / chartHeight);
		const yLabel =
			tickValue !== undefined
				? renderYAxisLabel(tickValue, yAxisWidth - 2)
				: ' '.repeat(yAxisWidth - 2);
		let line = `${yLabel}│`;

		// Chart data (from grid)
		const gridRow = grid[row];
		if (gridRow) {
			for (let col = 0; col < chartWidth; col++) {
				const charCode = gridRow[col] ?? BRAILLE_BASE;
				line += String.fromCharCode(charCode);
			}
		}

		lines.push(line.padEnd(width, ' '));
	}

	// X-axis
	const xAxisLine = `${' '.repeat(yAxisWidth)}└${'─'.repeat(chartWidth - 1)}`;
	lines.push(xAxisLine.padEnd(width, ' '));

	// X-axis labels (if provided)
	if (state.xLabels.length > 0) {
		let labelLine = `${' '.repeat(yAxisWidth)} `;
		const labelStep = Math.max(1, Math.floor(maxDataPoints / 5));
		for (let i = 0; i < maxDataPoints; i += labelStep) {
			const label = state.xLabels[i] ?? i.toString();
			labelLine += label.slice(0, 8).padEnd(8, ' ');
		}
		lines.push(labelLine.padEnd(width, ' '));
	} else {
		lines.push(' '.repeat(width));
	}

	// Legend
	if (showLegend && state.series.length > 0) {
		let legendLine = 'Legend: ';
		for (let i = 0; i < state.series.length; i++) {
			const series = state.series[i];
			if (series) {
				legendLine += `${series.label} `;
			}
		}
		lines.push(legendLine.padEnd(width, ' '));

		if (legendHeight > 1) {
			lines.push(' '.repeat(width));
		}
	}

	return lines.join('\n');
}

/**
 * Updates the line chart content.
 * @internal
 */
function updateLineChartContent(world: World, eid: Entity): void {
	const state = lineChartStateMap.get(eid);
	if (!state) return;

	const dims = getDimensions(world, eid);
	if (!dims) return;

	const showGrid = LineChart.showGrid[eid] === 1;
	const showLegend = LineChart.showLegend[eid] === 1;

	const content = renderLineChart(state, dims.width, dims.height, showGrid, showLegend);
	setContent(world, eid, content);
	markDirty(world, eid);
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Creates a LineChart widget with the given configuration.
 *
 * The LineChart widget displays time-series data with multiple series,
 * auto-scaling, and high-resolution braille rendering.
 *
 * @param world - The ECS world
 * @param config - Widget configuration
 * @returns The LineChart widget instance
 *
 * @example
 * ```typescript
 * import { createWorld } from '../core/ecs';
 * import { createLineChart } from 'blecsd/widgets';
 *
 * const world = createWorld();
 *
 * const chart = createLineChart(world, {
 *   x: 0,
 *   y: 0,
 *   width: 80,
 *   height: 30,
 *   series: [
 *     { label: 'CPU', data: [20, 35, 30, 45, 50, 48, 52] },
 *     { label: 'Memory', data: [40, 42, 41, 43, 45, 46, 47] },
 *   ],
 *   showLegend: true,
 * });
 *
 * // Append real-time data
 * chart.appendToSeries(0, 55);
 * chart.appendToSeries(1, 48);
 * ```
 */
export function createLineChart(world: World, config: LineChartConfig = {}): LineChartWidget {
	const validated = LineChartConfigSchema.parse(config);
	const eid = addEntity(world);

	// Set position
	setPosition(world, eid, validated.x, validated.y);

	// Set dimensions
	setDimensions(world, eid, validated.width, validated.height);

	// Set component flags
	LineChart.isLineChart[eid] = 1;
	LineChart.showLegend[eid] = validated.showLegend ? 1 : 0;
	LineChart.showGrid[eid] = validated.showGrid ? 1 : 0;

	// Initialize state
	lineChartStateMap.set(eid, {
		series: validated.series.map((s, idx) => ({
			label: s.label,
			data: [...s.data],
			color: s.color ? parseColor(s.color) : getChartColor(idx),
		})),
		xLabels: validated.xLabels ? [...validated.xLabels] : [],
		yLabel: validated.yLabel ?? '',
		xLabel: validated.xLabel ?? '',
		minY: validated.minY,
		maxY: validated.maxY,
	});

	// Set style
	if (validated.fg !== undefined || validated.bg !== undefined) {
		setStyle(world, eid, {
			fg: validated.fg !== undefined ? parseColor(validated.fg) : undefined,
			bg: validated.bg !== undefined ? parseColor(validated.bg) : undefined,
		});
	}

	// Initial render
	updateLineChartContent(world, eid);

	// Create the widget object
	const widget: LineChartWidget = {
		eid,

		setSeries(series: readonly LineSeries[]): LineChartWidget {
			const state = lineChartStateMap.get(eid);
			if (state) {
				state.series = series.map((s, idx) => ({
					label: s.label,
					data: [...s.data],
					color: s.color ? parseColor(s.color) : getChartColor(idx),
				}));
				updateLineChartContent(world, eid);
			}
			return widget;
		},

		getSeries(): readonly LineSeries[] {
			const state = lineChartStateMap.get(eid);
			return state?.series ?? [];
		},

		appendToSeries(seriesIndex: number, value: number): LineChartWidget {
			const state = lineChartStateMap.get(eid);
			if (state?.series[seriesIndex]) {
				const series = state.series[seriesIndex];
				if (series) {
					(series.data as number[]).push(value);
					updateLineChartContent(world, eid);
				}
			}
			return widget;
		},

		clear(): LineChartWidget {
			const state = lineChartStateMap.get(eid);
			if (state) {
				for (const series of state.series) {
					(series.data as number[]).length = 0;
				}
				updateLineChartContent(world, eid);
			}
			return widget;
		},

		setPosition(x: number, y: number): LineChartWidget {
			setPosition(world, eid, x, y);
			markDirty(world, eid);
			return widget;
		},

		destroy(): void {
			LineChart.isLineChart[eid] = 0;
			LineChart.showLegend[eid] = 0;
			LineChart.showGrid[eid] = 0;
			lineChartStateMap.delete(eid);
			removeEntity(world, eid);
		},
	};

	return widget;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Checks if an entity is a line chart widget.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @param eid - The entity ID
 * @returns true if the entity is a line chart widget
 */
export function isLineChart(_world: World, eid: Entity): boolean {
	return LineChart.isLineChart[eid] === 1;
}

/**
 * Resets the LineChart component store. Useful for testing.
 * @internal
 */
export function resetLineChartStore(): void {
	LineChart.isLineChart.fill(0);
	LineChart.showLegend.fill(0);
	LineChart.showGrid.fill(0);
	lineChartStateMap.clear();
}
