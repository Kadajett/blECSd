import { beforeEach, describe, expect, it } from 'vitest';
import type { Entity, World } from '../core/types';
import { createWorld } from '../core/world';
import {
	applyScrollImpulse,
	clearAllScrollStates,
	getScrollPosition,
	getScrollState,
	isScrolling,
	removeScrollState,
	setScrollImmediate,
	smoothScrollTo,
	updateScrollPhysics,
} from './smoothScroll';

describe('SmoothScroll', () => {
	let world: World;
	const eid = 1 as Entity;

	beforeEach(() => {
		world = createWorld();
		clearAllScrollStates();
	});

	describe('getScrollState', () => {
		it('creates new scroll state', () => {
			const state = getScrollState(world, eid, 100, 500, 80, 24);

			expect(state.scrollX).toBe(0);
			expect(state.scrollY).toBe(0);
			expect(state.velocityX).toBe(0);
			expect(state.velocityY).toBe(0);
			expect(state.contentWidth).toBe(100);
			expect(state.contentHeight).toBe(500);
		});

		it('returns existing state on second call', () => {
			const state1 = getScrollState(world, eid, 100, 500, 80, 24);
			state1.scrollY = 50;

			const state2 = getScrollState(world, eid, 100, 500, 80, 24);
			expect(state2.scrollY).toBe(50);
		});
	});

	describe('applyScrollImpulse', () => {
		it('adds velocity', () => {
			const state = getScrollState(world, eid, 100, 500, 80, 24);

			applyScrollImpulse(world, eid, 0, -5);

			expect(state.velocityY).toBe(-5);
			expect(state.isAnimating).toBe(true);
		});

		it('accumulates velocity', () => {
			const state = getScrollState(world, eid, 100, 500, 80, 24);

			applyScrollImpulse(world, eid, 0, -3);
			applyScrollImpulse(world, eid, 0, -3);

			expect(state.velocityY).toBe(-6);
		});

		it('clamps to max velocity', () => {
			const state = getScrollState(world, eid, 100, 500, 80, 24);

			applyScrollImpulse(world, eid, 0, -999, { maxVelocity: 100 });

			expect(Math.abs(state.velocityY)).toBeLessThanOrEqual(100);
		});
	});

	describe('smoothScrollTo', () => {
		it('sets target position', () => {
			const state = getScrollState(world, eid, 100, 500, 80, 24);

			smoothScrollTo(world, eid, null, 100);

			expect(state.targetY).toBe(100);
			expect(state.isAnimating).toBe(true);
		});
	});

	describe('setScrollImmediate', () => {
		it('sets position without animation', () => {
			const state = getScrollState(world, eid, 100, 500, 80, 24);

			setScrollImmediate(world, eid, 10, 50);

			expect(state.scrollX).toBe(10);
			expect(state.scrollY).toBe(50);
			expect(state.isAnimating).toBe(false);
			expect(state.velocityX).toBe(0);
		});
	});

	describe('updateScrollPhysics', () => {
		it('applies velocity to position', () => {
			const state = getScrollState(world, eid, 100, 500, 80, 24);
			state.velocityY = 5;
			state.isAnimating = true;

			const changed = updateScrollPhysics(state, 1 / 60);

			expect(changed).toBe(true);
			expect(state.scrollY).toBeGreaterThan(0);
		});

		it('applies friction', () => {
			const state = getScrollState(world, eid, 100, 500, 80, 24);
			state.velocityY = 10;
			state.isAnimating = true;

			updateScrollPhysics(state, 1 / 60, { friction: 0.5 });

			expect(Math.abs(state.velocityY)).toBeLessThan(10);
		});

		it('stops when velocity is negligible', () => {
			const state = getScrollState(world, eid, 100, 500, 80, 24);
			state.velocityY = 0.01;
			state.isAnimating = true;

			updateScrollPhysics(state, 1 / 60, { minVelocity: 0.1 });

			expect(state.isAnimating).toBe(false);
			expect(state.velocityY).toBe(0);
		});

		it('clamps scroll to content bounds', () => {
			const state = getScrollState(world, eid, 80, 100, 80, 24);
			state.scrollY = 200; // Beyond content
			state.isAnimating = true;

			updateScrollPhysics(state, 1 / 60, { enableBounce: false });

			expect(state.scrollY).toBeLessThanOrEqual(100 - 24);
		});

		it('scrolls toward target', () => {
			const state = getScrollState(world, eid, 100, 500, 80, 24);
			state.targetY = 100;
			state.isAnimating = true;

			for (let i = 0; i < 100; i++) {
				updateScrollPhysics(state, 1 / 60);
			}

			expect(Math.abs(state.scrollY - 100)).toBeLessThan(1);
		});
	});

	describe('isScrolling', () => {
		it('returns false for unknown entity', () => {
			expect(isScrolling(world, 999 as Entity)).toBe(false);
		});

		it('returns true when animating', () => {
			const state = getScrollState(world, eid, 100, 500, 80, 24);
			state.isAnimating = true;

			expect(isScrolling(world, eid)).toBe(true);
		});
	});

	describe('getScrollPosition', () => {
		it('returns null for unknown entity', () => {
			expect(getScrollPosition(world, 999 as Entity)).toBeNull();
		});

		it('returns current scroll position', () => {
			const state = getScrollState(world, eid, 100, 500, 80, 24);
			state.scrollX = 10;
			state.scrollY = 50;

			const pos = getScrollPosition(world, eid);
			expect(pos!.x).toBe(10);
			expect(pos!.y).toBe(50);
		});
	});

	describe('removeScrollState', () => {
		it('removes state for entity', () => {
			getScrollState(world, eid, 100, 500, 80, 24);
			removeScrollState(world, eid);

			expect(getScrollPosition(world, eid)).toBeNull();
		});
	});
});
