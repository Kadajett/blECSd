/**
 * Tests for spring-physics animation system.
 */

import { describe, expect, it } from 'vitest';
import { Position } from '../components/position';
import { Velocity } from '../components/velocity';
import { addComponent, addEntity } from '../core/ecs';
import { createWorld } from '../core/world';
import {
	createSpring,
	getSpringTarget,
	isSpringActive,
	setSpringTarget,
	springBouncy,
	springSmooth,
	springSnappy,
	springSystem,
} from './spring';

describe('spring system', () => {
	describe('createSpring', () => {
		it('creates spring with default config', () => {
			const world = createWorld();
			const eid = addEntity(world);

			createSpring(world, eid);

			// Should have Position and Velocity components
			expect(Position.x[eid]).toBe(0);
			expect(Position.y[eid]).toBe(0);
			expect(Velocity.x[eid]).toBe(0);
			expect(Velocity.y[eid]).toBe(0);
		});

		it('creates spring with custom config', () => {
			const world = createWorld();
			const eid = addEntity(world);

			createSpring(world, eid, springBouncy);

			expect(Position.x[eid]).toBe(0);
			expect(Position.y[eid]).toBe(0);
		});

		it('preserves existing position', () => {
			const world = createWorld();
			const eid = addEntity(world);

			// Add Position component first
			addComponent(world, eid, Position);
			Position.x[eid] = 50;
			Position.y[eid] = 25;

			createSpring(world, eid);

			expect(Position.x[eid]).toBe(50);
			expect(Position.y[eid]).toBe(25);
		});
	});

	describe('spring presets', () => {
		it('has bouncy preset with correct values', () => {
			expect(springBouncy.stiffness).toBe(180);
			expect(springBouncy.damping).toBe(8);
			expect(springBouncy.precision).toBe(0.01);
		});

		it('has smooth preset with correct values', () => {
			expect(springSmooth.stiffness).toBe(100);
			expect(springSmooth.damping).toBe(15);
			expect(springSmooth.precision).toBe(0.01);
		});

		it('has snappy preset with correct values', () => {
			expect(springSnappy.stiffness).toBe(300);
			expect(springSnappy.damping).toBe(20);
			expect(springSnappy.precision).toBe(0.01);
		});
	});

	describe('setSpringTarget', () => {
		it('sets target position', () => {
			const world = createWorld();
			const eid = addEntity(world);
			createSpring(world, eid);

			setSpringTarget(world, eid, 100, 50);

			const target = getSpringTarget(world, eid);
			expect(target?.x).toBe(100);
			expect(target?.y).toBe(50);
		});

		it('activates spring when target is set', () => {
			const world = createWorld();
			const eid = addEntity(world);
			createSpring(world, eid);

			expect(isSpringActive(world, eid)).toBe(false);

			setSpringTarget(world, eid, 100, 50);

			expect(isSpringActive(world, eid)).toBe(true);
		});

		it('does nothing if entity has no spring', () => {
			const world = createWorld();
			const eid = addEntity(world);

			setSpringTarget(world, eid, 100, 50);

			expect(getSpringTarget(world, eid)).toBeUndefined();
		});
	});

	describe('getSpringTarget', () => {
		it('returns target position', () => {
			const world = createWorld();
			const eid = addEntity(world);
			createSpring(world, eid);
			setSpringTarget(world, eid, 75, 25);

			const target = getSpringTarget(world, eid);

			expect(target).toEqual({ x: 75, y: 25 });
		});

		it('returns undefined for entity without spring', () => {
			const world = createWorld();
			const eid = addEntity(world);

			const target = getSpringTarget(world, eid);

			expect(target).toBeUndefined();
		});
	});

	describe('isSpringActive', () => {
		it('returns false for inactive spring', () => {
			const world = createWorld();
			const eid = addEntity(world);
			createSpring(world, eid);

			expect(isSpringActive(world, eid)).toBe(false);
		});

		it('returns true for active spring', () => {
			const world = createWorld();
			const eid = addEntity(world);
			createSpring(world, eid);
			setSpringTarget(world, eid, 100, 50);

			expect(isSpringActive(world, eid)).toBe(true);
		});

		it('returns false for entity without spring', () => {
			const world = createWorld();
			const eid = addEntity(world);

			expect(isSpringActive(world, eid)).toBe(false);
		});
	});

	describe('springSystem', () => {
		it('moves entity toward target', () => {
			const world = createWorld();
			const eid = addEntity(world);
			createSpring(world, eid, springSmooth);
			setSpringTarget(world, eid, 100, 0);

			const initialX = Position.x[eid] ?? 0;

			// Run a few frames
			for (let i = 0; i < 5; i++) {
				springSystem(world, 0.016); // ~60fps
			}

			// Position should have moved toward target
			const finalX = Position.x[eid] ?? 0;
			expect(finalX).toBeGreaterThan(initialX);
			// With smooth spring and few frames, shouldn't overshoot significantly
			expect(finalX).toBeLessThan(120);
		});

		it('eventually reaches target and stops', () => {
			const world = createWorld();
			const eid = addEntity(world);
			createSpring(world, eid, springSnappy);
			setSpringTarget(world, eid, 10, 0);

			// Run enough frames for spring to settle
			for (let i = 0; i < 200; i++) {
				springSystem(world, 0.016);
			}

			// Should be at target and inactive
			expect(Position.x[eid]).toBeCloseTo(10, 1);
			expect(Position.y[eid]).toBeCloseTo(0, 1);
			expect(isSpringActive(world, eid)).toBe(false);
			expect(Velocity.x[eid]).toBeCloseTo(0, 1);
			expect(Velocity.y[eid]).toBeCloseTo(0, 1);
		});

		it('handles 2D movement', () => {
			const world = createWorld();
			const eid = addEntity(world);
			createSpring(world, eid);
			setSpringTarget(world, eid, 50, 50);

			// Run a few frames
			for (let i = 0; i < 10; i++) {
				springSystem(world, 0.016);
			}

			// Both X and Y should be moving toward target
			expect(Position.x[eid]).toBeGreaterThan(0);
			expect(Position.y[eid]).toBeGreaterThan(0);
			expect(Position.x[eid]).toBeLessThan(50);
			expect(Position.y[eid]).toBeLessThan(50);
		});

		it('respects different spring presets', () => {
			const world = createWorld();

			// Create three springs with different configs
			const bouncy = addEntity(world);
			const smooth = addEntity(world);
			const snappy = addEntity(world);

			createSpring(world, bouncy, springBouncy);
			createSpring(world, smooth, springSmooth);
			createSpring(world, snappy, springSnappy);

			setSpringTarget(world, bouncy, 100, 0);
			setSpringTarget(world, smooth, 100, 0);
			setSpringTarget(world, snappy, 100, 0);

			// Run a few frames
			for (let i = 0; i < 10; i++) {
				springSystem(world, 0.016);
			}

			// All should be moving (different speeds and behaviors)
			const bouncyX = Position.x[bouncy] ?? 0;
			const smoothX = Position.x[smooth] ?? 0;
			const snappyX = Position.x[snappy] ?? 0;

			expect(bouncyX).toBeGreaterThan(0);
			expect(smoothX).toBeGreaterThan(0);
			expect(snappyX).toBeGreaterThan(0);

			// Snappy has highest stiffness and damping, moves fast but controlled
			expect(snappyX).toBeGreaterThan(smoothX);
		});

		it('does not affect inactive springs', () => {
			const world = createWorld();
			const eid = addEntity(world);
			createSpring(world, eid);

			const initialX = Position.x[eid];
			const initialY = Position.y[eid];

			// Run system without activating spring
			springSystem(world, 0.016);

			// Position should not change
			expect(Position.x[eid]).toBe(initialX);
			expect(Position.y[eid]).toBe(initialY);
		});

		it('handles multiple entities', () => {
			const world = createWorld();
			const eid1 = addEntity(world);
			const eid2 = addEntity(world);
			const eid3 = addEntity(world);

			createSpring(world, eid1);
			createSpring(world, eid2);
			createSpring(world, eid3);

			setSpringTarget(world, eid1, 10, 0);
			setSpringTarget(world, eid2, 20, 0);
			setSpringTarget(world, eid3, 30, 0);

			// Run a few frames
			for (let i = 0; i < 10; i++) {
				springSystem(world, 0.016);
			}

			// All should be moving toward their targets
			expect(Position.x[eid1]).toBeGreaterThan(0);
			expect(Position.x[eid2]).toBeGreaterThan(0);
			expect(Position.x[eid3]).toBeGreaterThan(0);
		});
	});
});
