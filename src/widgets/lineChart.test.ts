/**
 * Tests for LineChart widget.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getContent } from '../components/content';
import { getDimensions } from '../components/dimensions';
import { getPosition } from '../components/position';
import { createWorld } from '../core/ecs';
import type { World } from '../core/types';
import {
	createLineChart,
	isLineChart,
	LineChart,
	LineChartConfigSchema,
	type LineSeries,
	resetLineChartStore,
} from './lineChart';

describe('LineChart widget', () => {
	let world: World;

	beforeEach(() => {
		world = createWorld();
		resetLineChartStore();
	});

	afterEach(() => {
		resetLineChartStore();
	});

	describe('LineChartConfigSchema', () => {
		it('validates empty config', () => {
			const result = LineChartConfigSchema.safeParse({});
			expect(result.success).toBe(true);
		});

		it('validates position values', () => {
			const result = LineChartConfigSchema.safeParse({
				x: 10,
				y: 20,
			});
			expect(result.success).toBe(true);
		});

		it('validates dimensions', () => {
			const result = LineChartConfigSchema.safeParse({
				width: 80,
				height: 30,
			});
			expect(result.success).toBe(true);
		});

		it('rejects negative dimensions', () => {
			const result = LineChartConfigSchema.safeParse({
				width: -1,
				height: -1,
			});
			expect(result.success).toBe(false);
		});

		it('validates series array', () => {
			const result = LineChartConfigSchema.safeParse({
				series: [
					{ label: 'CPU', data: [20, 30, 40] },
					{ label: 'Memory', data: [50, 60, 70] },
				],
			});
			expect(result.success).toBe(true);
		});

		it('validates series with color', () => {
			const result = LineChartConfigSchema.safeParse({
				series: [{ label: 'Test', data: [1, 2, 3], color: '#ff0000' }],
			});
			expect(result.success).toBe(true);
		});

		it('validates labels', () => {
			const result = LineChartConfigSchema.safeParse({
				xLabels: ['Mon', 'Tue', 'Wed'],
				yLabel: 'CPU %',
				xLabel: 'Time',
			});
			expect(result.success).toBe(true);
		});

		it('validates boolean flags', () => {
			const result = LineChartConfigSchema.safeParse({
				showLegend: true,
				showGrid: false,
			});
			expect(result.success).toBe(true);
		});

		it('validates min/max Y values', () => {
			const result = LineChartConfigSchema.safeParse({
				minY: 0,
				maxY: 100,
			});
			expect(result.success).toBe(true);
		});
	});

	describe('createLineChart', () => {
		it('creates chart with default config', () => {
			const widget = createLineChart(world);
			expect(widget.eid).toBeGreaterThanOrEqual(0);
		});

		it('sets position correctly', () => {
			const widget = createLineChart(world, { x: 10, y: 5 });
			const pos = getPosition(world, widget.eid);
			expect(pos?.x).toBe(10);
			expect(pos?.y).toBe(5);
		});

		it('sets dimensions correctly', () => {
			const widget = createLineChart(world, { width: 80, height: 30 });
			const dims = getDimensions(world, widget.eid);
			expect(dims?.width).toBe(80);
			expect(dims?.height).toBe(30);
		});

		it('sets series correctly', () => {
			const series: LineSeries[] = [
				{ label: 'CPU', data: [20, 30, 40] },
				{ label: 'Memory', data: [50, 60, 70] },
			];
			const widget = createLineChart(world, { series });
			expect(widget.getSeries()).toHaveLength(2);
			expect(widget.getSeries()[0]?.label).toBe('CPU');
			expect(widget.getSeries()[1]?.label).toBe('Memory');
		});

		it('sets showLegend flag', () => {
			const widget = createLineChart(world, { showLegend: true });
			expect(LineChart.showLegend[widget.eid]).toBe(1);
		});

		it('sets showGrid flag', () => {
			const widget = createLineChart(world, { showGrid: false });
			expect(LineChart.showGrid[widget.eid]).toBe(0);
		});

		it('renders content on creation', () => {
			const widget = createLineChart(world, {
				series: [{ label: 'Test', data: [1, 2, 3] }],
				width: 60,
				height: 20,
			});
			const content = getContent(world, widget.eid);
			expect(content).toBeDefined();
			expect(content?.length).toBeGreaterThan(0);
		});
	});

	describe('isLineChart', () => {
		it('returns true for line chart widget', () => {
			const widget = createLineChart(world);
			expect(isLineChart(world, widget.eid)).toBe(true);
		});

		it('returns false for non-chart entity', () => {
			expect(isLineChart(world, 999)).toBe(false);
		});
	});

	describe('Widget methods', () => {
		describe('setSeries', () => {
			it('updates series data', () => {
				const widget = createLineChart(world, {
					series: [{ label: 'Old', data: [1, 2, 3] }],
				});
				widget.setSeries([{ label: 'New', data: [4, 5, 6] }]);
				const series = widget.getSeries();
				expect(series).toHaveLength(1);
				expect(series[0]?.label).toBe('New');
				expect(series[0]?.data).toEqual([4, 5, 6]);
			});

			it('updates rendered content', () => {
				const widget = createLineChart(world, {
					series: [{ label: 'Test', data: [1, 2, 3] }],
					width: 60,
					height: 20,
				});
				const content1 = getContent(world, widget.eid);
				widget.setSeries([{ label: 'Test', data: [10, 20, 30] }]);
				const content2 = getContent(world, widget.eid);
				expect(content1).not.toBe(content2);
			});

			it('returns widget for chaining', () => {
				const widget = createLineChart(world);
				const result = widget.setSeries([]);
				expect(result).toBe(widget);
			});
		});

		describe('getSeries', () => {
			it('returns current series', () => {
				const series: LineSeries[] = [
					{ label: 'CPU', data: [20, 30, 40] },
					{ label: 'Memory', data: [50, 60, 70] },
				];
				const widget = createLineChart(world, { series });
				expect(widget.getSeries()).toHaveLength(2);
			});

			it('returns empty array for no series', () => {
				const widget = createLineChart(world);
				expect(widget.getSeries()).toEqual([]);
			});
		});

		describe('appendToSeries', () => {
			it('appends value to specific series', () => {
				const widget = createLineChart(world, {
					series: [
						{ label: 'Test1', data: [1, 2, 3] },
						{ label: 'Test2', data: [4, 5, 6] },
					],
				});
				widget.appendToSeries(0, 4);
				const series = widget.getSeries();
				expect(series[0]?.data).toEqual([1, 2, 3, 4]);
				expect(series[1]?.data).toEqual([4, 5, 6]);
			});

			it('updates rendered content', () => {
				const widget = createLineChart(world, {
					series: [{ label: 'Test', data: [1, 2, 3] }],
					width: 60,
					height: 20,
				});
				const content1 = getContent(world, widget.eid);
				widget.appendToSeries(0, 10);
				const content2 = getContent(world, widget.eid);
				expect(content1).not.toBe(content2);
			});

			it('handles invalid series index gracefully', () => {
				const widget = createLineChart(world, {
					series: [{ label: 'Test', data: [1, 2, 3] }],
				});
				widget.appendToSeries(999, 4);
				const series = widget.getSeries();
				expect(series[0]?.data).toEqual([1, 2, 3]);
			});

			it('returns widget for chaining', () => {
				const widget = createLineChart(world, {
					series: [{ label: 'Test', data: [1, 2, 3] }],
				});
				const result = widget.appendToSeries(0, 4);
				expect(result).toBe(widget);
			});
		});

		describe('clear', () => {
			it('clears all series data', () => {
				const widget = createLineChart(world, {
					series: [
						{ label: 'Test1', data: [1, 2, 3] },
						{ label: 'Test2', data: [4, 5, 6] },
					],
				});
				widget.clear();
				const series = widget.getSeries();
				expect(series[0]?.data).toEqual([]);
				expect(series[1]?.data).toEqual([]);
			});

			it('updates rendered content', () => {
				const widget = createLineChart(world, {
					series: [{ label: 'Test', data: [1, 2, 3] }],
					width: 60,
					height: 20,
				});
				const content1 = getContent(world, widget.eid);
				widget.clear();
				const content2 = getContent(world, widget.eid);
				expect(content1).not.toBe(content2);
			});

			it('returns widget for chaining', () => {
				const widget = createLineChart(world);
				const result = widget.clear();
				expect(result).toBe(widget);
			});
		});

		describe('setPosition', () => {
			it('updates position', () => {
				const widget = createLineChart(world, { x: 0, y: 0 });
				widget.setPosition(10, 20);
				const pos = getPosition(world, widget.eid);
				expect(pos?.x).toBe(10);
				expect(pos?.y).toBe(20);
			});

			it('returns widget for chaining', () => {
				const widget = createLineChart(world);
				const result = widget.setPosition(5, 5);
				expect(result).toBe(widget);
			});
		});

		describe('destroy', () => {
			it('clears component flags', () => {
				const widget = createLineChart(world, { showLegend: true, showGrid: true });
				widget.destroy();
				expect(LineChart.isLineChart[widget.eid]).toBe(0);
				expect(LineChart.showLegend[widget.eid]).toBe(0);
				expect(LineChart.showGrid[widget.eid]).toBe(0);
			});

			it('clears data from map', () => {
				const widget = createLineChart(world, {
					series: [{ label: 'Test', data: [1, 2, 3] }],
				});
				widget.destroy();
				expect(widget.getSeries()).toEqual([]);
			});
		});
	});

	describe('Rendering', () => {
		describe('Empty series', () => {
			it('renders empty chart', () => {
				const widget = createLineChart(world, { width: 60, height: 20 });
				const content = getContent(world, widget.eid);
				expect(content).toBeDefined();
			});
		});

		describe('Single series', () => {
			it('renders single series', () => {
				const widget = createLineChart(world, {
					series: [{ label: 'CPU', data: [20, 30, 40, 50, 60] }],
					width: 60,
					height: 20,
				});
				const content = getContent(world, widget.eid);
				expect(content).toBeDefined();
				// Should contain Y-axis separator
				expect(content).toContain('│');
				// Should contain X-axis line
				expect(content).toContain('└');
			});
		});

		describe('Multiple series', () => {
			it('renders multiple series', () => {
				const widget = createLineChart(world, {
					series: [
						{ label: 'CPU', data: [20, 30, 40, 50, 60] },
						{ label: 'Memory', data: [30, 35, 45, 55, 65] },
					],
					width: 80,
					height: 30,
				});
				const content = getContent(world, widget.eid);
				expect(content).toBeDefined();
				expect(content).toContain('│');
				expect(content).toContain('└');
			});
		});

		describe('With legend', () => {
			it('renders legend when enabled', () => {
				const widget = createLineChart(world, {
					series: [
						{ label: 'CPU', data: [20, 30, 40] },
						{ label: 'Memory', data: [50, 60, 70] },
					],
					showLegend: true,
					width: 80,
					height: 30,
				});
				const content = getContent(world, widget.eid);
				expect(content).toBeDefined();
				expect(content).toContain('Legend:');
				expect(content).toContain('CPU');
				expect(content).toContain('Memory');
			});

			it('does not render legend when disabled', () => {
				const widget = createLineChart(world, {
					series: [{ label: 'CPU', data: [20, 30, 40] }],
					showLegend: false,
					width: 80,
					height: 30,
				});
				const content = getContent(world, widget.eid);
				expect(content).toBeDefined();
				expect(content).not.toContain('Legend:');
			});
		});

		describe('Y-axis', () => {
			it('includes Y-axis labels', () => {
				const widget = createLineChart(world, {
					series: [{ label: 'Test', data: [0, 50, 100] }],
					width: 60,
					height: 20,
				});
				const content = getContent(world, widget.eid);
				expect(content).toBeDefined();
				// Should contain Y-axis separator
				expect(content).toContain('│');
			});

			it('respects minY and maxY', () => {
				const widget = createLineChart(world, {
					series: [{ label: 'Test', data: [50, 60, 70] }],
					minY: 0,
					maxY: 100,
					width: 60,
					height: 20,
				});
				const content = getContent(world, widget.eid);
				expect(content).toBeDefined();
			});
		});

		describe('X-axis', () => {
			it('includes X-axis line', () => {
				const widget = createLineChart(world, {
					series: [{ label: 'Test', data: [1, 2, 3] }],
					width: 60,
					height: 20,
				});
				const content = getContent(world, widget.eid);
				expect(content).toBeDefined();
				expect(content).toContain('└');
			});

			it('includes X-axis labels when provided', () => {
				const widget = createLineChart(world, {
					series: [{ label: 'Test', data: [1, 2, 3] }],
					xLabels: ['Mon', 'Tue', 'Wed'],
					width: 60,
					height: 20,
				});
				const content = getContent(world, widget.eid);
				expect(content).toBeDefined();
				expect(content).toContain('Mon');
			});
		});

		describe('Braille rendering', () => {
			it('uses braille characters for plot', () => {
				const widget = createLineChart(world, {
					series: [{ label: 'Test', data: [1, 2, 3, 4, 5] }],
					width: 60,
					height: 20,
				});
				const content = getContent(world, widget.eid);
				expect(content).toBeDefined();
				// Should contain braille characters
				expect(content).toMatch(/[⠀-⣿]/);
			});
		});

		describe('Data variations', () => {
			it('handles increasing data', () => {
				const widget = createLineChart(world, {
					series: [{ label: 'Test', data: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] }],
					width: 60,
					height: 20,
				});
				const content = getContent(world, widget.eid);
				expect(content).toBeDefined();
			});

			it('handles decreasing data', () => {
				const widget = createLineChart(world, {
					series: [{ label: 'Test', data: [10, 9, 8, 7, 6, 5, 4, 3, 2, 1] }],
					width: 60,
					height: 20,
				});
				const content = getContent(world, widget.eid);
				expect(content).toBeDefined();
			});

			it('handles oscillating data', () => {
				const widget = createLineChart(world, {
					series: [{ label: 'Test', data: [5, 10, 5, 10, 5, 10, 5] }],
					width: 60,
					height: 20,
				});
				const content = getContent(world, widget.eid);
				expect(content).toBeDefined();
			});

			it('handles negative values', () => {
				const widget = createLineChart(world, {
					series: [{ label: 'Test', data: [-10, -5, 0, 5, 10] }],
					width: 60,
					height: 20,
				});
				const content = getContent(world, widget.eid);
				expect(content).toBeDefined();
			});
		});

		describe('Dimension variations', () => {
			it('renders at minimum size', () => {
				const widget = createLineChart(world, {
					series: [{ label: 'Test', data: [1, 2, 3] }],
					width: 20,
					height: 10,
				});
				const content = getContent(world, widget.eid);
				expect(content).toBeDefined();
			});

			it('renders at large size', () => {
				const widget = createLineChart(world, {
					series: [{ label: 'Test', data: [1, 2, 3] }],
					width: 120,
					height: 40,
				});
				const content = getContent(world, widget.eid);
				expect(content).toBeDefined();
			});
		});

		describe('Large datasets', () => {
			it('handles large number of data points', () => {
				const data = Array.from({ length: 1000 }, (_, i) => Math.sin(i / 10) * 100);
				const widget = createLineChart(world, {
					series: [{ label: 'Test', data }],
					width: 80,
					height: 30,
				});
				const content = getContent(world, widget.eid);
				expect(content).toBeDefined();
			});
		});
	});

	describe('Edge cases', () => {
		it('handles single data point', () => {
			const widget = createLineChart(world, {
				series: [{ label: 'Test', data: [50] }],
				width: 60,
				height: 20,
			});
			const content = getContent(world, widget.eid);
			expect(content).toBeDefined();
		});

		it('handles empty series data', () => {
			const widget = createLineChart(world, {
				series: [{ label: 'Test', data: [] }],
				width: 60,
				height: 20,
			});
			const content = getContent(world, widget.eid);
			expect(content).toBeDefined();
		});

		it('handles all zero values', () => {
			const widget = createLineChart(world, {
				series: [{ label: 'Test', data: [0, 0, 0, 0] }],
				width: 60,
				height: 20,
			});
			const content = getContent(world, widget.eid);
			expect(content).toBeDefined();
		});

		it('handles very large values', () => {
			const widget = createLineChart(world, {
				series: [{ label: 'Test', data: [1000000, 2000000, 3000000] }],
				width: 60,
				height: 20,
			});
			const content = getContent(world, widget.eid);
			expect(content).toBeDefined();
		});

		it('handles very small values', () => {
			const widget = createLineChart(world, {
				series: [{ label: 'Test', data: [0.001, 0.002, 0.003] }],
				width: 60,
				height: 20,
			});
			const content = getContent(world, widget.eid);
			expect(content).toBeDefined();
		});

		it('handles mixed positive and negative', () => {
			const widget = createLineChart(world, {
				series: [{ label: 'Test', data: [-100, 0, 100] }],
				width: 60,
				height: 20,
			});
			const content = getContent(world, widget.eid);
			expect(content).toBeDefined();
		});
	});

	describe('resetLineChartStore', () => {
		it('clears all chart data', () => {
			const widget1 = createLineChart(world, { showLegend: true });
			const widget2 = createLineChart(world, { showGrid: false });

			resetLineChartStore();

			expect(LineChart.isLineChart[widget1.eid]).toBe(0);
			expect(LineChart.isLineChart[widget2.eid]).toBe(0);
			expect(LineChart.showLegend[widget1.eid]).toBe(0);
			expect(LineChart.showGrid[widget2.eid]).toBe(0);
		});
	});
});
