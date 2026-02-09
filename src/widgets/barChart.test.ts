/**
 * Tests for BarChart widget
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { getContent } from '../components/content';
import { getDimensions } from '../components/dimensions';
import { getPosition } from '../components/position';
import { createWorld } from '../core/ecs';
import type { World } from '../core/types';
import { createBarChart, isBarChart, resetBarChartStore } from './barChart';

describe('BarChart Widget', () => {
	let world: World;

	beforeEach(() => {
		world = createWorld();
		resetBarChartStore();
	});

	describe('createBarChart', () => {
		it('should create a bar chart with default config', () => {
			const chart = createBarChart(world);

			expect(chart.eid).toBeGreaterThanOrEqual(0);
			expect(isBarChart(world, chart.eid)).toBe(true);
		});

		it('should create with custom position', () => {
			const chart = createBarChart(world, { x: 10, y: 5 });

			const pos = getPosition(world, chart.eid);
			expect(pos?.x).toBe(10);
			expect(pos?.y).toBe(5);
		});

		it('should create with custom dimensions', () => {
			const chart = createBarChart(world, { width: 60, height: 30 });

			const dims = getDimensions(world, chart.eid);
			expect(dims?.width).toBe(60);
			expect(dims?.height).toBe(30);
		});

		it('should create with labels and series', () => {
			const chart = createBarChart(world, {
				labels: ['Q1', 'Q2', 'Q3', 'Q4'],
				series: [
					{ label: 'Sales', data: [100, 150, 120, 180] },
					{ label: 'Costs', data: [80, 90, 85, 95] },
				],
			});

			expect(chart.getLabels()).toEqual(['Q1', 'Q2', 'Q3', 'Q4']);
			expect(chart.getSeries()).toHaveLength(2);
			expect(chart.getSeries()[0]?.label).toBe('Sales');
			expect(chart.getSeries()[1]?.label).toBe('Costs');
		});

		it('should create with vertical orientation by default', () => {
			const chart = createBarChart(world, {
				labels: ['A', 'B'],
				series: [{ label: 'Test', data: [10, 20] }],
			});

			const content = getContent(world, chart.eid);
			expect(content).toBeDefined();
			// Vertical charts have Y-axis on the left
			expect(content).toContain('│');
		});

		it('should create with horizontal orientation', () => {
			const chart = createBarChart(world, {
				orientation: 'horizontal',
				labels: ['A', 'B'],
				series: [{ label: 'Test', data: [10, 20] }],
			});

			const content = getContent(world, chart.eid);
			expect(content).toBeDefined();
			expect(content).toContain('│');
		});

		it('should create with stacked mode', () => {
			const chart = createBarChart(world, {
				mode: 'stacked',
				labels: ['A', 'B'],
				series: [
					{ label: 'Series 1', data: [10, 20] },
					{ label: 'Series 2', data: [5, 10] },
				],
			});

			expect(chart.getSeries()).toHaveLength(2);
			const content = getContent(world, chart.eid);
			expect(content).toBeDefined();
		});

		it('should create with grouped mode by default', () => {
			const chart = createBarChart(world, {
				labels: ['A', 'B'],
				series: [
					{ label: 'Series 1', data: [10, 20] },
					{ label: 'Series 2', data: [5, 10] },
				],
			});

			expect(chart.getSeries()).toHaveLength(2);
			const content = getContent(world, chart.eid);
			expect(content).toBeDefined();
		});

		it('should create with custom bar character', () => {
			const chart = createBarChart(world, {
				barChar: '▓',
				labels: ['A'],
				series: [{ label: 'Test', data: [50] }],
			});

			const content = getContent(world, chart.eid);
			expect(content).toContain('▓');
		});

		it('should create with block characters enabled', () => {
			const chart = createBarChart(world, {
				useBlockChars: true,
				labels: ['A'],
				series: [{ label: 'Test', data: [50] }],
			});

			const content = getContent(world, chart.eid);
			expect(content).toBeDefined();
		});

		it('should create with value labels shown', () => {
			const chart = createBarChart(world, {
				showValues: true,
				orientation: 'horizontal',
				labels: ['A'],
				series: [{ label: 'Test', data: [100] }],
			});

			const content = getContent(world, chart.eid);
			expect(content).toBeDefined();
		});
	});

	describe('setSeries', () => {
		it('should update data series', () => {
			const chart = createBarChart(world, {
				labels: ['A', 'B'],
				series: [{ label: 'Old', data: [10, 20] }],
			});

			chart.setSeries([
				{ label: 'New 1', data: [30, 40] },
				{ label: 'New 2', data: [15, 25] },
			]);

			const series = chart.getSeries();
			expect(series).toHaveLength(2);
			expect(series[0]?.label).toBe('New 1');
			expect(series[0]?.data).toEqual([30, 40]);
			expect(series[1]?.label).toBe('New 2');
			expect(series[1]?.data).toEqual([15, 25]);
		});

		it('should update rendered content', () => {
			const chart = createBarChart(world, {
				labels: ['A', 'B'],
				series: [{ label: 'Old', data: [10, 20] }],
			});

			const oldContent = getContent(world, chart.eid);

			chart.setSeries([{ label: 'New', data: [50, 100] }]);

			const newContent = getContent(world, chart.eid);
			expect(newContent).not.toBe(oldContent);
		});

		it('should be chainable', () => {
			const chart = createBarChart(world);

			const result = chart.setSeries([{ label: 'Test', data: [10, 20] }]);

			expect(result).toBe(chart);
		});
	});

	describe('setLabels', () => {
		it('should update category labels', () => {
			const chart = createBarChart(world, {
				labels: ['A', 'B'],
				series: [{ label: 'Test', data: [10, 20] }],
			});

			chart.setLabels(['X', 'Y', 'Z']);

			expect(chart.getLabels()).toEqual(['X', 'Y', 'Z']);
		});

		it('should update rendered content', () => {
			const chart = createBarChart(world, {
				labels: ['A', 'B'],
				series: [{ label: 'Test', data: [10, 20] }],
			});

			const oldContent = getContent(world, chart.eid);

			chart.setLabels(['New1', 'New2']);

			const newContent = getContent(world, chart.eid);
			expect(newContent).not.toBe(oldContent);
		});

		it('should be chainable', () => {
			const chart = createBarChart(world);

			const result = chart.setLabels(['A', 'B']);

			expect(result).toBe(chart);
		});
	});

	describe('setPosition', () => {
		it('should update position', () => {
			const chart = createBarChart(world, { x: 0, y: 0 });

			chart.setPosition(20, 10);

			const pos = getPosition(world, chart.eid);
			expect(pos?.x).toBe(20);
			expect(pos?.y).toBe(10);
		});

		it('should be chainable', () => {
			const chart = createBarChart(world);

			const result = chart.setPosition(10, 10);

			expect(result).toBe(chart);
		});
	});

	describe('destroy', () => {
		it('should remove the entity', () => {
			const chart = createBarChart(world);

			chart.destroy();

			expect(isBarChart(world, chart.eid)).toBe(false);
		});

		it('should clean up state', () => {
			const chart = createBarChart(world, {
				labels: ['A', 'B'],
				series: [{ label: 'Test', data: [10, 20] }],
			});

			chart.destroy();

			// After destroy, getSeries should return empty array
			expect(chart.getSeries()).toEqual([]);
		});
	});

	describe('vertical bar chart rendering', () => {
		it('should render bars for single series', () => {
			const chart = createBarChart(world, {
				width: 30,
				height: 15,
				labels: ['A', 'B'],
				series: [{ label: 'Test', data: [50, 100] }],
			});

			const content = getContent(world, chart.eid);
			expect(content).toBeDefined();
			expect(content).toContain('│'); // Y-axis
			expect(content).toContain('└'); // X-axis
			expect(content).toContain('█'); // Bar character
		});

		it('should render grouped bars for multiple series', () => {
			const chart = createBarChart(world, {
				mode: 'grouped',
				width: 40,
				height: 15,
				labels: ['A', 'B'],
				series: [
					{ label: 'S1', data: [50, 80] },
					{ label: 'S2', data: [30, 60] },
				],
			});

			const content = getContent(world, chart.eid);
			expect(content).toBeDefined();
			expect(content).toContain('█');
		});

		it('should render stacked bars for multiple series', () => {
			const chart = createBarChart(world, {
				mode: 'stacked',
				width: 40,
				height: 15,
				labels: ['A', 'B'],
				series: [
					{ label: 'S1', data: [50, 80] },
					{ label: 'S2', data: [30, 20] },
				],
			});

			const content = getContent(world, chart.eid);
			expect(content).toBeDefined();
			expect(content).toContain('█');
		});

		it('should handle empty series', () => {
			const chart = createBarChart(world, {
				width: 30,
				height: 15,
				labels: ['A', 'B'],
				series: [],
			});

			const content = getContent(world, chart.eid);
			expect(content).toBeDefined();
		});

		it('should handle zero values', () => {
			const chart = createBarChart(world, {
				width: 30,
				height: 15,
				labels: ['A', 'B', 'C'],
				series: [{ label: 'Test', data: [0, 50, 0] }],
			});

			const content = getContent(world, chart.eid);
			expect(content).toBeDefined();
		});
	});

	describe('horizontal bar chart rendering', () => {
		it('should render horizontal bars', () => {
			const chart = createBarChart(world, {
				orientation: 'horizontal',
				width: 40,
				height: 10,
				labels: ['Item 1', 'Item 2', 'Item 3'],
				series: [{ label: 'Values', data: [75, 50, 100] }],
			});

			const content = getContent(world, chart.eid);
			expect(content).toBeDefined();
			expect(content).toContain('│');
			expect(content).toContain('█');
		});

		it('should render stacked horizontal bars', () => {
			const chart = createBarChart(world, {
				orientation: 'horizontal',
				mode: 'stacked',
				width: 40,
				height: 10,
				labels: ['A', 'B'],
				series: [
					{ label: 'S1', data: [40, 60] },
					{ label: 'S2', data: [30, 20] },
				],
			});

			const content = getContent(world, chart.eid);
			expect(content).toBeDefined();
			expect(content).toContain('█');
		});

		it('should show values when enabled', () => {
			const chart = createBarChart(world, {
				orientation: 'horizontal',
				showValues: true,
				width: 50,
				height: 10,
				labels: ['A', 'B'],
				series: [{ label: 'Test', data: [100, 200] }],
			});

			const content = getContent(world, chart.eid);
			expect(content).toBeDefined();
		});
	});

	describe('block character precision', () => {
		it('should use block characters when enabled for vertical bars', () => {
			const chart = createBarChart(world, {
				useBlockChars: true,
				width: 30,
				height: 20,
				labels: ['A'],
				series: [{ label: 'Test', data: [55.5] }],
			});

			const content = getContent(world, chart.eid);
			expect(content).toBeDefined();
			// Should contain partial block characters
			expect(content).toMatch(/[▁▂▃▄▅▆▇█]/);
		});

		it('should use block characters when enabled for horizontal bars', () => {
			const chart = createBarChart(world, {
				orientation: 'horizontal',
				useBlockChars: true,
				width: 40,
				height: 10,
				labels: ['A'],
				series: [{ label: 'Test', data: [55.5] }],
			});

			const content = getContent(world, chart.eid);
			expect(content).toBeDefined();
			// Should contain partial block characters
			expect(content).toMatch(/[▏▎▍▌▋▊▉█]/);
		});
	});

	describe('edge cases', () => {
		it('should handle negative values gracefully', () => {
			const chart = createBarChart(world, {
				width: 30,
				height: 15,
				labels: ['A', 'B'],
				series: [{ label: 'Test', data: [-10, 20] }],
			});

			const content = getContent(world, chart.eid);
			expect(content).toBeDefined();
		});

		it('should handle very large values', () => {
			const chart = createBarChart(world, {
				width: 30,
				height: 15,
				labels: ['A', 'B'],
				series: [{ label: 'Test', data: [1000000, 2000000] }],
			});

			const content = getContent(world, chart.eid);
			expect(content).toBeDefined();
		});

		it('should handle mismatched data lengths', () => {
			const chart = createBarChart(world, {
				width: 30,
				height: 15,
				labels: ['A', 'B', 'C'],
				series: [{ label: 'Test', data: [10, 20] }], // Missing third value
			});

			const content = getContent(world, chart.eid);
			expect(content).toBeDefined();
		});

		it('should handle single data point', () => {
			const chart = createBarChart(world, {
				width: 30,
				height: 15,
				labels: ['Only'],
				series: [{ label: 'Test', data: [100] }],
			});

			const content = getContent(world, chart.eid);
			expect(content).toBeDefined();
			expect(content).toContain('█');
		});
	});

	describe('Zod validation', () => {
		it('should accept valid config', () => {
			expect(() =>
				createBarChart(world, {
					x: 0,
					y: 0,
					width: 40,
					height: 20,
					orientation: 'vertical',
					mode: 'grouped',
					labels: ['A', 'B'],
					series: [{ label: 'Test', data: [10, 20] }],
				}),
			).not.toThrow();
		});

		it('should use defaults for missing optional fields', () => {
			const chart = createBarChart(world, {});

			const dims = getDimensions(world, chart.eid);
			expect(dims?.width).toBe(40); // Default width
			expect(dims?.height).toBe(20); // Default height
		});

		it('should validate bar width is positive', () => {
			expect(() =>
				createBarChart(world, {
					barWidth: 0,
				}),
			).toThrow();
		});

		it('should validate bar gap is non-negative', () => {
			expect(() =>
				createBarChart(world, {
					barGap: -1,
				}),
			).toThrow();
		});
	});
});
