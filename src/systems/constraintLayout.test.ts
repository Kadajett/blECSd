/**
 * Tests for constraint-based layout system.
 */

import { describe, expect, it } from 'vitest';
import { createWorld } from '../core/world';
import {
	fixed,
	layoutHorizontal,
	layoutVertical,
	max,
	min,
	percentage,
	type Rect,
	ratio,
} from './constraintLayout';

describe('constraintLayout', () => {
	const world = createWorld();
	const testArea: Rect = { x: 0, y: 0, width: 100, height: 50 };

	describe('fixed constraint', () => {
		it('creates fixed constraint', () => {
			const constraint = fixed(20);
			expect(constraint).toEqual({ type: 'fixed', value: 20 });
		});

		it('lays out horizontal fixed sizes', () => {
			const rects = layoutHorizontal(world, testArea, [fixed(30), fixed(40), fixed(30)]);

			expect(rects).toHaveLength(3);
			expect(rects[0]).toEqual({ x: 0, y: 0, width: 30, height: 50 });
			expect(rects[1]).toEqual({ x: 30, y: 0, width: 40, height: 50 });
			expect(rects[2]).toEqual({ x: 70, y: 0, width: 30, height: 50 });
		});

		it('lays out vertical fixed sizes', () => {
			const rects = layoutVertical(world, testArea, [fixed(10), fixed(20), fixed(20)]);

			expect(rects).toHaveLength(3);
			expect(rects[0]).toEqual({ x: 0, y: 0, width: 100, height: 10 });
			expect(rects[1]).toEqual({ x: 0, y: 10, width: 100, height: 20 });
			expect(rects[2]).toEqual({ x: 0, y: 30, width: 100, height: 20 });
		});
	});

	describe('percentage constraint', () => {
		it('creates percentage constraint', () => {
			const constraint = percentage(50);
			expect(constraint).toEqual({ type: 'percentage', value: 50 });
		});

		it('lays out horizontal percentages', () => {
			const rects = layoutHorizontal(world, testArea, [
				percentage(25),
				percentage(50),
				percentage(25),
			]);

			expect(rects).toHaveLength(3);
			expect(rects[0]?.width).toBe(25);
			expect(rects[1]?.width).toBe(50);
			expect(rects[2]?.width).toBe(25);
		});

		it('lays out vertical percentages', () => {
			const rects = layoutVertical(world, testArea, [percentage(40), percentage(60)]);

			expect(rects).toHaveLength(2);
			expect(rects[0]?.height).toBe(20);
			expect(rects[1]?.height).toBe(30);
		});
	});

	describe('min constraint', () => {
		it('creates min constraint', () => {
			const constraint = min(10);
			expect(constraint).toEqual({ type: 'min', value: 10 });
		});

		it('respects minimum size', () => {
			const rects = layoutHorizontal(world, testArea, [min(20), fixed(50)]);

			expect(rects).toHaveLength(2);
			expect(rects[0]?.width).toBeGreaterThanOrEqual(20);
			expect(rects[1]?.width).toBe(50);
		});
	});

	describe('max constraint', () => {
		it('creates max constraint', () => {
			const constraint = max(100);
			expect(constraint).toEqual({ type: 'max', value: 100 });
		});

		it('respects maximum size', () => {
			const rects = layoutHorizontal(world, testArea, [max(30), fixed(40)]);

			expect(rects).toHaveLength(2);
			expect(rects[0]?.width).toBeLessThanOrEqual(30);
			expect(rects[1]?.width).toBe(40);
		});
	});

	describe('ratio constraint', () => {
		it('creates ratio constraint', () => {
			const constraint = ratio(1, 3);
			expect(constraint).toEqual({ type: 'ratio', numerator: 1, denominator: 3 });
		});

		it('lays out horizontal ratios', () => {
			const rects = layoutHorizontal(world, testArea, [ratio(1, 3), ratio(2, 3)]);

			expect(rects).toHaveLength(2);
			expect(rects[0]?.width).toBe(33); // 1/3 of 100
			expect(rects[1]?.width).toBe(66); // 2/3 of 100
		});

		it('lays out vertical ratios', () => {
			const rects = layoutVertical(world, testArea, [ratio(1, 4), ratio(3, 4)]);

			expect(rects).toHaveLength(2);
			expect(rects[0]?.height).toBe(12); // 1/4 of 50
			expect(rects[1]?.height).toBe(37); // 3/4 of 50
		});
	});

	describe('mixed constraints', () => {
		it('combines fixed and percentage constraints horizontally', () => {
			const rects = layoutHorizontal(world, testArea, [fixed(20), percentage(50), fixed(20)]);

			expect(rects).toHaveLength(3);
			expect(rects[0]?.width).toBe(20);
			expect(rects[1]?.width).toBe(50);
			expect(rects[2]?.width).toBe(20);
		});

		it('combines fixed and percentage constraints vertically', () => {
			const rects = layoutVertical(world, testArea, [fixed(5), percentage(80), fixed(5)]);

			expect(rects).toHaveLength(3);
			expect(rects[0]?.height).toBe(5);
			expect(rects[1]?.height).toBe(40);
			expect(rects[2]?.height).toBe(5);
		});
	});

	describe('edge cases', () => {
		it('handles empty constraints', () => {
			const rects = layoutHorizontal(world, testArea, []);
			expect(rects).toHaveLength(0);
		});

		it('handles oversized fixed constraints', () => {
			const rects = layoutHorizontal(world, testArea, [fixed(150)]);

			expect(rects).toHaveLength(1);
			expect(rects[0]?.width).toBe(100); // Capped at area width
		});

		it('handles constraints that exceed available space', () => {
			const rects = layoutHorizontal(world, testArea, [fixed(60), fixed(60)]);

			expect(rects).toHaveLength(2);
			expect(rects[0]?.width).toBe(60);
			expect(rects[1]?.width).toBe(40); // Limited by remaining space
		});

		it('maintains position and dimensions correctly', () => {
			const customArea: Rect = { x: 10, y: 20, width: 80, height: 30 };
			const rects = layoutHorizontal(world, customArea, [fixed(40), fixed(40)]);

			expect(rects[0]).toEqual({ x: 10, y: 20, width: 40, height: 30 });
			expect(rects[1]).toEqual({ x: 50, y: 20, width: 40, height: 30 });
		});
	});

	describe('three-panel layout example', () => {
		it('creates classic three-panel layout', () => {
			const rects = layoutHorizontal(world, testArea, [
				fixed(20), // Left sidebar
				percentage(100), // Main content (takes remaining)
				fixed(20), // Right sidebar
			]);

			expect(rects).toHaveLength(3);
			expect(rects[0]?.width).toBe(20);
			expect(rects[1]?.width).toBeGreaterThan(40); // Gets most of the space
			expect(rects[2]?.width).toBe(20);
		});
	});
});
