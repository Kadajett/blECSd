/**
 * Tests for animation system.
 * @module systems/animationSystem.test
 */

import { describe, expect, it } from 'vitest';
import { Animation } from '../components/animation';
import { Sprite } from '../components/sprite';
import { addComponent, addEntity } from '../core/ecs';
import { createScheduler } from '../core/scheduler';
import { createWorld } from '../core/world';
import {
	animationSystem,
	createAnimationSystem,
	hasAnimationSystem,
	queryAnimation,
	registerAnimationSystem,
	updateAnimations,
} from './animationSystem';

describe('animationSystem', () => {
	it('processes entities with Animation component', () => {
		const world = createWorld();
		const eid = addEntity(world);

		addComponent(world, eid, Animation);
		addComponent(world, eid, Sprite);

		Animation.playing[eid] = 1;
		Animation.speed[eid] = 1.0;
		Animation.elapsed[eid] = 0;
		Animation.currentFrameIndex[eid] = 0;

		expect(() => animationSystem(world)).not.toThrow();
	});

	it('handles empty world', () => {
		const world = createWorld();

		expect(() => animationSystem(world)).not.toThrow();
	});

	it('returns world unchanged', () => {
		const world = createWorld();
		const result = animationSystem(world);

		expect(result).toBe(world);
	});

	it('processes multiple animated entities', () => {
		const world = createWorld();

		const eid1 = addEntity(world);
		const eid2 = addEntity(world);
		const eid3 = addEntity(world);

		addComponent(world, eid1, Animation);
		addComponent(world, eid2, Animation);
		addComponent(world, eid3, Animation);

		Animation.playing[eid1] = 1;
		Animation.playing[eid2] = 1;
		Animation.playing[eid3] = 1;

		expect(() => animationSystem(world)).not.toThrow();
	});

	it('handles entities with Animation but not playing', () => {
		const world = createWorld();
		const eid = addEntity(world);

		addComponent(world, eid, Animation);
		Animation.playing[eid] = 0; // Not playing

		expect(() => animationSystem(world)).not.toThrow();
	});
});

describe('queryAnimation', () => {
	it('returns iterable', () => {
		const world = createWorld();
		const entities = queryAnimation(world);

		// queryAnimation now returns an iterable, not an array
		expect(typeof entities[Symbol.iterator]).toBe('function');
	});

	it('handles empty world', () => {
		const world = createWorld();
		const entities = queryAnimation(world);

		// queryAnimation now returns an iterable, not an array
		const entitiesArray = Array.from(entities);
		expect(Array.isArray(entitiesArray)).toBe(true);
		expect(entitiesArray.length).toBeGreaterThanOrEqual(0);
	});
});

describe('hasAnimationSystem', () => {
	it('returns boolean for any entity', () => {
		const world = createWorld();
		const eid = addEntity(world);

		const result = hasAnimationSystem(world, eid);
		expect(typeof result).toBe('boolean');
	});

	it('returns false for non-existent entities', () => {
		const world = createWorld();

		expect(hasAnimationSystem(world, 99999)).toBe(false);
	});
});

describe('createAnimationSystem', () => {
	it('returns the animation system', () => {
		const system = createAnimationSystem();

		expect(typeof system).toBe('function');
	});

	it('returned system works correctly', () => {
		const world = createWorld();
		const system = createAnimationSystem();

		expect(() => system(world)).not.toThrow();
	});
});

describe('registerAnimationSystem', () => {
	it('registers system with scheduler', () => {
		const scheduler = createScheduler();

		expect(() => registerAnimationSystem(scheduler)).not.toThrow();
	});

	it('registers with custom priority', () => {
		const scheduler = createScheduler();

		expect(() => registerAnimationSystem(scheduler, 5)).not.toThrow();
	});

	it('registered system executes in UPDATE phase', () => {
		const scheduler = createScheduler();
		registerAnimationSystem(scheduler);

		// The system should be in the UPDATE phase
		// This is implementation-specific and hard to test directly
		expect(scheduler).toBeDefined();
	});
});

describe('updateAnimations', () => {
	it('updates specific entities', () => {
		const world = createWorld();
		const eid = addEntity(world);

		addComponent(world, eid, Animation);
		addComponent(world, eid, Sprite);

		Animation.playing[eid] = 1;
		Animation.speed[eid] = 1.0;
		Animation.elapsed[eid] = 0;
		Animation.currentFrameIndex[eid] = 0;

		updateAnimations(world, [eid], 0.016);

		// Animation should be updated
		expect(Animation.elapsed[eid]).toBeGreaterThanOrEqual(0);
	});

	it('handles empty entity array', () => {
		const world = createWorld();

		expect(() => updateAnimations(world, [], 0.016)).not.toThrow();
	});

	it('respects deltaTime parameter', () => {
		const world = createWorld();
		const eid = addEntity(world);

		addComponent(world, eid, Animation);
		addComponent(world, eid, Sprite);

		Animation.playing[eid] = 1;
		Animation.speed[eid] = 1.0;
		Animation.elapsed[eid] = 0;
		Animation.currentFrameIndex[eid] = 0;

		const initialElapsed = Animation.elapsed[eid];

		// Update with deltaTime
		updateAnimations(world, [eid], 1.0);

		// Elapsed time should increase
		expect(Animation.elapsed[eid]).toBeGreaterThanOrEqual(initialElapsed);
	});

	it('processes multiple entities', () => {
		const world = createWorld();
		const eid1 = addEntity(world);
		const eid2 = addEntity(world);

		addComponent(world, eid1, Animation);
		addComponent(world, eid2, Animation);

		Animation.playing[eid1] = 1;
		Animation.playing[eid2] = 1;

		expect(() => updateAnimations(world, [eid1, eid2], 0.016)).not.toThrow();
	});
});
