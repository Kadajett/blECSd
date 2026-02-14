/**
 * Tests for Sparkline widget.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getContent } from '../components/content';
import { getDimensions } from '../components/dimensions';
import { getPosition } from '../components/position';
import { createWorld } from '../core/ecs';
import type { World } from '../core/types';
import {
	createSparkline,
	isSparkline,
	resetSparklineStore,
	Sparkline,
	SparklineConfigSchema,
} from './sparkline';

describe('Sparkline widget', () => {
	let world: World;

	beforeEach(() => {
		world = createWorld();
		resetSparklineStore();
	});

	afterEach(() => {
		resetSparklineStore();
	});

	describe('SparklineConfigSchema', () => {
		it('validates empty config', () => {
			const result = SparklineConfigSchema.safeParse({});
			expect(result.success).toBe(true);
		});

		it('validates position values', () => {
			const result = SparklineConfigSchema.safeParse({
				x: 10,
				y: 20,
			});
			expect(result.success).toBe(true);
		});

		it('validates width', () => {
			const result = SparklineConfigSchema.safeParse({
				width: 40,
			});
			expect(result.success).toBe(true);
		});

		it('rejects negative width', () => {
			const result = SparklineConfigSchema.safeParse({
				width: -1,
			});
			expect(result.success).toBe(false);
		});

		it('validates data array', () => {
			const result = SparklineConfigSchema.safeParse({
				data: [1, 2, 3, 4, 5],
			});
			expect(result.success).toBe(true);
		});

		it('validates color options', () => {
			const result = SparklineConfigSchema.safeParse({
				fg: '#ff0000',
				bg: 0xff00ff00,
			});
			expect(result.success).toBe(true);
		});

		it('validates boolean flags', () => {
			const result = SparklineConfigSchema.safeParse({
				showMin: true,
				showMax: true,
				gradient: true,
			});
			expect(result.success).toBe(true);
		});

		it('validates gradient colors', () => {
			const result = SparklineConfigSchema.safeParse({
				gradientStart: '#00ff00',
				gradientEnd: '#ff0000',
			});
			expect(result.success).toBe(true);
		});
	});

	describe('createSparkline', () => {
		it('creates sparkline with default config', () => {
			const widget = createSparkline(world);
			expect(widget.eid).toBeGreaterThanOrEqual(0);
		});

		it('sets position correctly', () => {
			const widget = createSparkline(world, { x: 10, y: 5 });
			const pos = getPosition(world, widget.eid);
			expect(pos?.x).toBe(10);
			expect(pos?.y).toBe(5);
		});

		it('sets width correctly', () => {
			const widget = createSparkline(world, { width: 40 });
			const dims = getDimensions(world, widget.eid);
			expect(dims?.width).toBe(40);
			expect(dims?.height).toBe(1); // Sparkline is always 1 line high
		});

		it('sets data correctly', () => {
			const data = [1, 2, 3, 4, 5];
			const widget = createSparkline(world, { data });
			expect(widget.getData()).toEqual(data);
		});

		it('sets showMin flag', () => {
			const widget = createSparkline(world, { showMin: true });
			expect(Sparkline.showMin[widget.eid]).toBe(1);
		});

		it('sets showMax flag', () => {
			const widget = createSparkline(world, { showMax: true });
			expect(Sparkline.showMax[widget.eid]).toBe(1);
		});

		it('sets gradient flag', () => {
			const widget = createSparkline(world, { gradient: true });
			expect(Sparkline.gradient[widget.eid]).toBe(1);
		});

		it('renders content on creation', () => {
			const widget = createSparkline(world, { data: [1, 2, 3], width: 10 });
			const content = getContent(world, widget.eid);
			expect(content).toBeDefined();
			expect(content?.length).toBeGreaterThan(0);
		});
	});

	describe('isSparkline', () => {
		it('returns true for sparkline widget', () => {
			const widget = createSparkline(world);
			expect(isSparkline(world, widget.eid)).toBe(true);
		});

		it('returns false for non-sparkline entity', () => {
			expect(isSparkline(world, 999)).toBe(false);
		});
	});

	describe('Widget methods', () => {
		describe('setData', () => {
			it('updates data', () => {
				const widget = createSparkline(world, { data: [1, 2, 3] });
				widget.setData([4, 5, 6, 7]);
				expect(widget.getData()).toEqual([4, 5, 6, 7]);
			});

			it('updates rendered content', () => {
				const widget = createSparkline(world, { data: [1, 2, 3], width: 10 });
				// Use very different data pattern to trigger re-render
				widget.setData([100, 50, 0, 50, 100, 0, 50, 100]);
				const content = getContent(world, widget.eid);
				// Should render new data
				expect(content).toBeDefined();
				expect(content?.length).toBe(10);
			});

			it('returns widget for chaining', () => {
				const widget = createSparkline(world);
				const result = widget.setData([1, 2, 3]);
				expect(result).toBe(widget);
			});
		});

		describe('getData', () => {
			it('returns current data', () => {
				const data = [1, 2, 3, 4, 5];
				const widget = createSparkline(world, { data });
				expect(widget.getData()).toEqual(data);
			});

			it('returns empty array for no data', () => {
				const widget = createSparkline(world);
				expect(widget.getData()).toEqual([]);
			});
		});

		describe('append', () => {
			it('appends value to data', () => {
				const widget = createSparkline(world, { data: [1, 2, 3] });
				widget.append(4);
				expect(widget.getData()).toEqual([1, 2, 3, 4]);
			});

			it('updates rendered content', () => {
				const widget = createSparkline(world, { data: [1, 2, 3], width: 10 });
				const content1 = getContent(world, widget.eid);
				widget.append(10);
				const content2 = getContent(world, widget.eid);
				expect(content1).not.toBe(content2);
			});

			it('returns widget for chaining', () => {
				const widget = createSparkline(world);
				const result = widget.append(1);
				expect(result).toBe(widget);
			});

			it('supports chaining multiple appends', () => {
				const widget = createSparkline(world);
				widget.append(1).append(2).append(3);
				expect(widget.getData()).toEqual([1, 2, 3]);
			});
		});

		describe('clear', () => {
			it('clears all data', () => {
				const widget = createSparkline(world, { data: [1, 2, 3, 4, 5] });
				widget.clear();
				expect(widget.getData()).toEqual([]);
			});

			it('updates rendered content', () => {
				const widget = createSparkline(world, { data: [1, 2, 3], width: 10 });
				widget.clear();
				const content = getContent(world, widget.eid);
				// Empty data should render as spaces
				expect(content).toMatch(/^\s+$/);
			});

			it('returns widget for chaining', () => {
				const widget = createSparkline(world);
				const result = widget.clear();
				expect(result).toBe(widget);
			});
		});

		describe('setPosition', () => {
			it('updates position', () => {
				const widget = createSparkline(world, { x: 0, y: 0 });
				widget.setPosition(10, 20);
				const pos = getPosition(world, widget.eid);
				expect(pos?.x).toBe(10);
				expect(pos?.y).toBe(20);
			});

			it('returns widget for chaining', () => {
				const widget = createSparkline(world);
				const result = widget.setPosition(5, 5);
				expect(result).toBe(widget);
			});
		});

		describe('destroy', () => {
			it('clears component flags', () => {
				const widget = createSparkline(world, { showMin: true, showMax: true });
				widget.destroy();
				expect(Sparkline.isSparkline[widget.eid]).toBe(0);
				expect(Sparkline.showMin[widget.eid]).toBe(0);
				expect(Sparkline.showMax[widget.eid]).toBe(0);
			});

			it('clears data from map', () => {
				const widget = createSparkline(world, { data: [1, 2, 3] });
				widget.destroy();
				expect(widget.getData()).toEqual([]);
			});
		});
	});

	describe('Rendering', () => {
		describe('Empty data', () => {
			it('renders spaces for empty data', () => {
				const widget = createSparkline(world, { width: 10 });
				const content = getContent(world, widget.eid);
				expect(content).toBe(' '.repeat(10));
			});
		});

		describe('Single data point', () => {
			it('renders single data point', () => {
				const widget = createSparkline(world, { data: [50], width: 10 });
				const content = getContent(world, widget.eid);
				expect(content).toBeDefined();
				expect(content?.length).toBe(10);
			});
		});

		describe('Flat data', () => {
			it('renders flat line for equal values', () => {
				const widget = createSparkline(world, { data: [5, 5, 5, 5], width: 10 });
				const content = getContent(world, widget.eid);
				expect(content).toBeDefined();
				expect(content?.length).toBe(10);
				// Should use braille middle line character
				expect(content).toMatch(/[⠀-⣿]+/);
			});
		});

		describe('Increasing trend', () => {
			it('renders increasing trend', () => {
				const widget = createSparkline(world, {
					data: [1, 2, 3, 4, 5, 6, 7, 8],
					width: 20,
				});
				const content = getContent(world, widget.eid);
				expect(content).toBeDefined();
				expect(content?.length).toBe(20);
				expect(content).toMatch(/[⠀-⣿]+/);
			});
		});

		describe('Decreasing trend', () => {
			it('renders decreasing trend', () => {
				const widget = createSparkline(world, {
					data: [8, 7, 6, 5, 4, 3, 2, 1],
					width: 20,
				});
				const content = getContent(world, widget.eid);
				expect(content).toBeDefined();
				expect(content?.length).toBe(20);
				expect(content).toMatch(/[⠀-⣿]+/);
			});
		});

		describe('Wave pattern', () => {
			it('renders wave pattern', () => {
				const widget = createSparkline(world, {
					data: [0, 5, 10, 5, 0, 5, 10, 5, 0],
					width: 20,
				});
				const content = getContent(world, widget.eid);
				expect(content).toBeDefined();
				expect(content?.length).toBe(20);
				expect(content).toMatch(/[⠀-⣿]+/);
			});
		});

		describe('Negative values', () => {
			it('handles negative values', () => {
				const widget = createSparkline(world, {
					data: [-5, -3, 0, 3, 5],
					width: 10,
				});
				const content = getContent(world, widget.eid);
				expect(content).toBeDefined();
				expect(content?.length).toBe(10);
			});
		});

		describe('Mixed values', () => {
			it('handles mixed positive and negative', () => {
				const widget = createSparkline(world, {
					data: [-10, -5, 0, 5, 10],
					width: 20,
				});
				const content = getContent(world, widget.eid);
				expect(content).toBeDefined();
				expect(content?.length).toBe(20);
			});
		});

		describe('Large datasets', () => {
			it('handles large datasets', () => {
				const data = Array.from({ length: 100 }, (_, i) => Math.sin(i / 10) * 100);
				const widget = createSparkline(world, { data, width: 40 });
				const content = getContent(world, widget.eid);
				expect(content).toBeDefined();
				expect(content?.length).toBe(40);
			});
		});

		describe('Width variations', () => {
			it('renders correctly at minimum width', () => {
				const widget = createSparkline(world, { data: [1, 2, 3], width: 1 });
				const content = getContent(world, widget.eid);
				expect(content?.length).toBe(1);
			});

			it('renders correctly at large width', () => {
				const widget = createSparkline(world, { data: [1, 2, 3], width: 100 });
				const content = getContent(world, widget.eid);
				expect(content?.length).toBe(100);
			});
		});
	});

	describe('Min/Max markers', () => {
		it('includes min marker when showMin=true', () => {
			const widget = createSparkline(world, {
				data: [1, 5, 3, 2, 10],
				width: 20,
				showMin: true,
			});
			const content = getContent(world, widget.eid);
			expect(content).toBeDefined();
			// Content should be rendered with braille markers
			expect(content).toMatch(/[⠀-⣿]+/);
		});

		it('includes max marker when showMax=true', () => {
			const widget = createSparkline(world, {
				data: [1, 5, 3, 2, 10],
				width: 20,
				showMax: true,
			});
			const content = getContent(world, widget.eid);
			expect(content).toBeDefined();
			expect(content).toMatch(/[⠀-⣿]+/);
		});

		it('includes both markers when both enabled', () => {
			const widget = createSparkline(world, {
				data: [1, 5, 3, 2, 10],
				width: 20,
				showMin: true,
				showMax: true,
			});
			const content = getContent(world, widget.eid);
			expect(content).toBeDefined();
			expect(content).toMatch(/[⠀-⣿]+/);
		});
	});

	describe('Edge cases', () => {
		it('handles very small values', () => {
			const widget = createSparkline(world, {
				data: [0.001, 0.002, 0.003],
				width: 10,
			});
			const content = getContent(world, widget.eid);
			expect(content).toBeDefined();
		});

		it('handles very large values', () => {
			const widget = createSparkline(world, {
				data: [1000000, 2000000, 3000000],
				width: 10,
			});
			const content = getContent(world, widget.eid);
			expect(content).toBeDefined();
		});

		it('handles all zeros', () => {
			const widget = createSparkline(world, {
				data: [0, 0, 0, 0],
				width: 10,
			});
			const content = getContent(world, widget.eid);
			expect(content).toBeDefined();
		});

		it('handles rapid oscillation', () => {
			const widget = createSparkline(world, {
				data: [0, 100, 0, 100, 0, 100],
				width: 20,
			});
			const content = getContent(world, widget.eid);
			expect(content).toBeDefined();
		});
	});

	describe('resetSparklineStore', () => {
		it('clears all sparkline data', () => {
			const widget1 = createSparkline(world, { showMin: true });
			const widget2 = createSparkline(world, { showMax: true });

			resetSparklineStore();

			expect(Sparkline.isSparkline[widget1.eid]).toBe(0);
			expect(Sparkline.isSparkline[widget2.eid]).toBe(0);
			expect(Sparkline.showMin[widget1.eid]).toBe(0);
			expect(Sparkline.showMax[widget2.eid]).toBe(0);
		});
	});
});
