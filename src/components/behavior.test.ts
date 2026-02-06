/**
 * Tests for the AI/Behavior component.
 * @module components/behavior.test
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { addEntity, createWorld } from '../core/ecs';
import type { Entity, World } from '../core/types';
import {
	Behavior,
	BehaviorState,
	BehaviorType,
	computeChaseDirection,
	computeFleeDirection,
	computePatrolDirection,
	executeCustomBehavior,
	getBehavior,
	getBehaviorState,
	getBehaviorTarget,
	getBehaviorType,
	getCurrentPatrolPoint,
	getPatrolRoute,
	hasBehavior,
	isBehaviorActive,
	isBehaviorCompleted,
	isBehaviorWaiting,
	removeBehavior,
	resetBehaviorStore,
	setBehavior,
	setBehaviorSpeed,
	setBehaviorTarget,
	setChase,
	setCustomBehavior,
	setDetectionRange,
	setFlee,
	setIdle,
	setPatrol,
	updateBehaviorTimer,
} from './behavior';

describe('behavior', () => {
	let world: World;
	let eid: Entity;

	beforeEach(() => {
		world = createWorld();
		eid = addEntity(world);
		resetBehaviorStore();
	});

	// =========================================================================
	// setBehavior / getBehavior / hasBehavior / removeBehavior
	// =========================================================================

	describe('setBehavior', () => {
		it('adds behavior component with defaults', () => {
			setBehavior(world, eid);
			const ai = getBehavior(world, eid);
			expect(ai).toBeDefined();
			expect(ai?.type).toBe(BehaviorType.Idle);
			expect(ai?.state).toBe(BehaviorState.Active);
			expect(ai?.speed).toBe(1);
			expect(ai?.detectionRange).toBe(10);
			expect(ai?.fleeRange).toBe(15);
		});

		it('sets custom options', () => {
			setBehavior(world, eid, {
				type: BehaviorType.Chase,
				speed: 5,
				targetEntity: 42,
				detectionRange: 20,
				fleeRange: 30,
			});
			const ai = getBehavior(world, eid);
			expect(ai?.type).toBe(BehaviorType.Chase);
			expect(ai?.speed).toBe(5);
			expect(ai?.targetEntity).toBe(42);
			expect(ai?.detectionRange).toBe(20);
			expect(ai?.fleeRange).toBe(30);
		});

		it('returns entity ID for chaining', () => {
			const result = setBehavior(world, eid);
			expect(result).toBe(eid);
		});
	});

	describe('getBehavior', () => {
		it('returns undefined without Behavior component', () => {
			expect(getBehavior(world, eid)).toBeUndefined();
		});
	});

	describe('hasBehavior', () => {
		it('returns false without component', () => {
			expect(hasBehavior(world, eid)).toBe(false);
		});

		it('returns true with component', () => {
			setBehavior(world, eid);
			expect(hasBehavior(world, eid)).toBe(true);
		});
	});

	describe('removeBehavior', () => {
		it('removes the Behavior component', () => {
			setBehavior(world, eid);
			removeBehavior(world, eid);
			expect(hasBehavior(world, eid)).toBe(false);
		});

		it('cleans up patrol routes', () => {
			setBehavior(world, eid);
			setPatrol(world, eid, [
				{ x: 0, y: 0 },
				{ x: 10, y: 0 },
			]);
			removeBehavior(world, eid);
			// Re-add to check route is gone
			setBehavior(world, eid);
			expect(getPatrolRoute(world, eid)).toBeUndefined();
		});

		it('returns entity ID', () => {
			expect(removeBehavior(world, eid)).toBe(eid);
		});

		it('is safe without Behavior component', () => {
			expect(() => removeBehavior(world, eid)).not.toThrow();
		});
	});

	// =========================================================================
	// Behavior type setters
	// =========================================================================

	describe('setIdle', () => {
		it('sets behavior to idle', () => {
			setBehavior(world, eid, { type: BehaviorType.Chase });
			setIdle(world, eid);
			expect(getBehaviorType(world, eid)).toBe(BehaviorType.Idle);
			expect(getBehaviorState(world, eid)).toBe(BehaviorState.Active);
		});

		it('clears target', () => {
			setBehavior(world, eid, { type: BehaviorType.Chase, targetEntity: 42 });
			setIdle(world, eid);
			expect(getBehaviorTarget(world, eid)).toBe(0);
		});

		it('does nothing without Behavior', () => {
			expect(() => setIdle(world, eid)).not.toThrow();
		});
	});

	describe('setPatrol', () => {
		it('sets patrol behavior with waypoints', () => {
			setBehavior(world, eid);
			setPatrol(world, eid, [
				{ x: 0, y: 0 },
				{ x: 10, y: 0 },
			]);
			expect(getBehaviorType(world, eid)).toBe(BehaviorType.Patrol);
			expect(getBehavior(world, eid)?.patrolCount).toBe(2);
		});

		it('stores patrol route', () => {
			setBehavior(world, eid);
			setPatrol(world, eid, [{ x: 5, y: 10 }], { loop: false, waitTime: 2 });
			const route = getPatrolRoute(world, eid);
			expect(route).toBeDefined();
			expect(route?.points).toHaveLength(1);
			expect(route?.loop).toBe(false);
			expect(route?.waitTime).toBe(2);
		});

		it('defaults to loop and no wait', () => {
			setBehavior(world, eid);
			setPatrol(world, eid, [{ x: 0, y: 0 }]);
			const route = getPatrolRoute(world, eid);
			expect(route?.loop).toBe(true);
			expect(route?.waitTime).toBe(0);
		});

		it('ignores empty points array', () => {
			setBehavior(world, eid);
			setPatrol(world, eid, []);
			expect(getBehaviorType(world, eid)).toBe(BehaviorType.Idle);
		});

		it('does nothing without Behavior', () => {
			expect(() => setPatrol(world, eid, [{ x: 0, y: 0 }])).not.toThrow();
		});
	});

	describe('setChase', () => {
		it('sets chase behavior with target', () => {
			const target = addEntity(world);
			setBehavior(world, eid);
			setChase(world, eid, target);
			expect(getBehaviorType(world, eid)).toBe(BehaviorType.Chase);
			expect(getBehaviorTarget(world, eid)).toBe(target);
		});
	});

	describe('setFlee', () => {
		it('sets flee behavior with target', () => {
			const target = addEntity(world);
			setBehavior(world, eid);
			setFlee(world, eid, target);
			expect(getBehaviorType(world, eid)).toBe(BehaviorType.Flee);
			expect(getBehaviorTarget(world, eid)).toBe(target);
		});
	});

	describe('setCustomBehavior', () => {
		it('sets custom behavior with callback', () => {
			const cb = vi.fn();
			setBehavior(world, eid);
			setCustomBehavior(world, eid, cb);
			expect(getBehaviorType(world, eid)).toBe(BehaviorType.Custom);
		});

		it('does nothing without Behavior', () => {
			const cb = vi.fn();
			expect(() => setCustomBehavior(world, eid, cb)).not.toThrow();
		});
	});

	// =========================================================================
	// Query helpers
	// =========================================================================

	describe('getBehaviorType', () => {
		it('returns undefined without component', () => {
			expect(getBehaviorType(world, eid)).toBeUndefined();
		});

		it('returns current type', () => {
			setBehavior(world, eid, { type: BehaviorType.Patrol });
			expect(getBehaviorType(world, eid)).toBe(BehaviorType.Patrol);
		});
	});

	describe('getBehaviorState', () => {
		it('returns undefined without component', () => {
			expect(getBehaviorState(world, eid)).toBeUndefined();
		});
	});

	describe('setBehaviorTarget', () => {
		it('updates the target', () => {
			setBehavior(world, eid);
			setBehaviorTarget(world, eid, 99 as Entity);
			expect(getBehaviorTarget(world, eid)).toBe(99);
		});

		it('does nothing without Behavior', () => {
			expect(() => setBehaviorTarget(world, eid, 99 as Entity)).not.toThrow();
		});
	});

	describe('setBehaviorSpeed', () => {
		it('updates the speed', () => {
			setBehavior(world, eid);
			setBehaviorSpeed(world, eid, 10);
			expect(getBehavior(world, eid)?.speed).toBe(10);
		});
	});

	describe('setDetectionRange', () => {
		it('updates the detection range', () => {
			setBehavior(world, eid);
			setDetectionRange(world, eid, 50);
			expect(getBehavior(world, eid)?.detectionRange).toBe(50);
		});
	});

	describe('isBehaviorActive', () => {
		it('returns false without component', () => {
			expect(isBehaviorActive(world, eid)).toBe(false);
		});

		it('returns true when active', () => {
			setBehavior(world, eid);
			expect(isBehaviorActive(world, eid)).toBe(true);
		});
	});

	describe('isBehaviorWaiting', () => {
		it('returns false without component', () => {
			expect(isBehaviorWaiting(world, eid)).toBe(false);
		});

		it('returns true when waiting', () => {
			setBehavior(world, eid);
			Behavior.state[eid] = BehaviorState.Waiting;
			expect(isBehaviorWaiting(world, eid)).toBe(true);
		});
	});

	describe('isBehaviorCompleted', () => {
		it('returns false without component', () => {
			expect(isBehaviorCompleted(world, eid)).toBe(false);
		});

		it('returns true when completed', () => {
			setBehavior(world, eid);
			Behavior.state[eid] = BehaviorState.Completed;
			expect(isBehaviorCompleted(world, eid)).toBe(true);
		});
	});

	describe('getCurrentPatrolPoint', () => {
		it('returns undefined without component', () => {
			expect(getCurrentPatrolPoint(world, eid)).toBeUndefined();
		});

		it('returns current waypoint', () => {
			setBehavior(world, eid);
			setPatrol(world, eid, [
				{ x: 5, y: 10 },
				{ x: 20, y: 30 },
			]);
			const point = getCurrentPatrolPoint(world, eid);
			expect(point).toEqual({ x: 5, y: 10 });
		});

		it('returns undefined without patrol route', () => {
			setBehavior(world, eid);
			expect(getCurrentPatrolPoint(world, eid)).toBeUndefined();
		});
	});

	// =========================================================================
	// Patrol direction computation
	// =========================================================================

	describe('computePatrolDirection', () => {
		it('returns direction toward waypoint', () => {
			setBehavior(world, eid, { speed: 1 });
			setPatrol(world, eid, [{ x: 10, y: 0 }]);
			const dir = computePatrolDirection(world, eid, 0, 0, 0.016);
			expect(dir).toBeDefined();
			expect(dir?.dx).toBeCloseTo(1, 1);
			expect(dir?.dy).toBeCloseTo(0, 1);
		});

		it('returns undefined without component', () => {
			expect(computePatrolDirection(world, eid, 0, 0, 0.016)).toBeUndefined();
		});

		it('returns undefined without route', () => {
			setBehavior(world, eid);
			expect(computePatrolDirection(world, eid, 0, 0, 0.016)).toBeUndefined();
		});

		it('advances to next waypoint when reached', () => {
			setBehavior(world, eid, { speed: 10 });
			setPatrol(world, eid, [
				{ x: 0, y: 0 },
				{ x: 10, y: 0 },
			]);
			// Already at first waypoint
			computePatrolDirection(world, eid, 0, 0, 1);
			expect(getBehavior(world, eid)?.patrolIndex).toBe(1);
		});

		it('loops back to start for looping patrol', () => {
			setBehavior(world, eid, { speed: 10 });
			setPatrol(
				world,
				eid,
				[
					{ x: 0, y: 0 },
					{ x: 1, y: 0 },
				],
				{ loop: true },
			);
			// Reach first point
			computePatrolDirection(world, eid, 0, 0, 1);
			// Reach second point
			computePatrolDirection(world, eid, 1, 0, 1);
			expect(getBehavior(world, eid)?.patrolIndex).toBe(0);
		});

		it('completes for non-looping patrol', () => {
			setBehavior(world, eid, { speed: 10 });
			setPatrol(world, eid, [{ x: 0, y: 0 }], { loop: false });
			computePatrolDirection(world, eid, 0, 0, 1);
			expect(isBehaviorCompleted(world, eid)).toBe(true);
		});

		it('enters waiting state at waypoint', () => {
			setBehavior(world, eid, { speed: 10 });
			setPatrol(
				world,
				eid,
				[
					{ x: 0, y: 0 },
					{ x: 10, y: 0 },
				],
				{ waitTime: 2 },
			);
			computePatrolDirection(world, eid, 0, 0, 1);
			expect(isBehaviorWaiting(world, eid)).toBe(true);
		});

		it('waits during wait timer', () => {
			setBehavior(world, eid, { speed: 10 });
			setPatrol(
				world,
				eid,
				[
					{ x: 0, y: 0 },
					{ x: 10, y: 0 },
				],
				{ waitTime: 2 },
			);
			computePatrolDirection(world, eid, 0, 0, 1); // Reach, enter waiting
			const dir = computePatrolDirection(world, eid, 0, 0, 1); // Still waiting
			expect(dir).toBeUndefined();
			expect(getBehavior(world, eid)?.waitTimer).toBeCloseTo(1, 1);
		});

		it('resumes after wait timer expires', () => {
			setBehavior(world, eid, { speed: 10 });
			setPatrol(
				world,
				eid,
				[
					{ x: 0, y: 0 },
					{ x: 10, y: 0 },
				],
				{ waitTime: 1 },
			);
			computePatrolDirection(world, eid, 0, 0, 1); // Reach, enter waiting
			// First call decrements timer but still waiting
			computePatrolDirection(world, eid, 0, 0, 0.5);
			expect(isBehaviorWaiting(world, eid)).toBe(true);
			// Second call timer expires, state transitions to active
			computePatrolDirection(world, eid, 0, 0, 0.6);
			expect(isBehaviorActive(world, eid)).toBe(true);
		});
	});

	// =========================================================================
	// Chase direction computation
	// =========================================================================

	describe('computeChaseDirection', () => {
		it('returns direction toward target', () => {
			setBehavior(world, eid, { speed: 2 });
			const dir = computeChaseDirection(world, eid, 0, 0, 10, 0);
			expect(dir).toBeDefined();
			expect(dir?.dx).toBeCloseTo(2, 1);
			expect(dir?.dy).toBeCloseTo(0, 1);
		});

		it('returns zero direction when at target', () => {
			setBehavior(world, eid, { speed: 2 });
			const dir = computeChaseDirection(world, eid, 5, 5, 5, 5);
			expect(dir).toEqual({ dx: 0, dy: 0 });
		});

		it('returns undefined when out of detection range', () => {
			setBehavior(world, eid, { speed: 2, detectionRange: 5 });
			const dir = computeChaseDirection(world, eid, 0, 0, 100, 0);
			expect(dir).toBeUndefined();
		});

		it('chases within detection range', () => {
			setBehavior(world, eid, { speed: 2, detectionRange: 20 });
			const dir = computeChaseDirection(world, eid, 0, 0, 10, 0);
			expect(dir).toBeDefined();
		});

		it('returns undefined without component', () => {
			expect(computeChaseDirection(world, eid, 0, 0, 10, 0)).toBeUndefined();
		});

		it('normalizes direction for diagonal movement', () => {
			setBehavior(world, eid, { speed: 1, detectionRange: 20 });
			const dir = computeChaseDirection(world, eid, 0, 0, 10, 10);
			expect(dir).toBeDefined();
			const magnitude = Math.sqrt((dir?.dx ?? 0) ** 2 + (dir?.dy ?? 0) ** 2);
			expect(magnitude).toBeCloseTo(1, 1);
		});
	});

	// =========================================================================
	// Flee direction computation
	// =========================================================================

	describe('computeFleeDirection', () => {
		it('returns direction away from target', () => {
			setBehavior(world, eid, { speed: 2, fleeRange: 20 });
			const dir = computeFleeDirection(world, eid, 5, 0, 10, 0);
			expect(dir).toBeDefined();
			expect(dir?.dx).toBeLessThan(0); // Moving away (left)
		});

		it('returns undefined when beyond flee range', () => {
			setBehavior(world, eid, { speed: 2, fleeRange: 5 });
			const dir = computeFleeDirection(world, eid, 0, 0, 100, 0);
			expect(dir).toBeUndefined();
		});

		it('flees within range', () => {
			setBehavior(world, eid, { speed: 2, fleeRange: 20 });
			const dir = computeFleeDirection(world, eid, 5, 5, 10, 5);
			expect(dir).toBeDefined();
		});

		it('picks a direction when at same position as target', () => {
			setBehavior(world, eid, { speed: 2, fleeRange: 20 });
			const dir = computeFleeDirection(world, eid, 5, 5, 5, 5);
			expect(dir).toBeDefined();
			// Default escape direction is (1, 0) when at same position
			expect(dir?.dx).toBe(1);
			expect(dir?.dy).toBe(0);
		});

		it('returns undefined without component', () => {
			expect(computeFleeDirection(world, eid, 0, 0, 10, 0)).toBeUndefined();
		});
	});

	// =========================================================================
	// Custom behavior
	// =========================================================================

	describe('executeCustomBehavior', () => {
		it('calls the custom callback', () => {
			const cb = vi.fn();
			setBehavior(world, eid);
			setCustomBehavior(world, eid, cb);
			executeCustomBehavior(world, eid, 0.016);
			expect(cb).toHaveBeenCalledWith(world, eid, 0.016);
		});

		it('does nothing without callback', () => {
			setBehavior(world, eid);
			expect(() => executeCustomBehavior(world, eid, 0.016)).not.toThrow();
		});

		it('does nothing without component', () => {
			expect(() => executeCustomBehavior(world, eid, 0.016)).not.toThrow();
		});
	});

	// =========================================================================
	// Timer update
	// =========================================================================

	describe('updateBehaviorTimer', () => {
		it('decrements wait timer', () => {
			setBehavior(world, eid);
			Behavior.state[eid] = BehaviorState.Waiting;
			Behavior.waitTimer[eid] = 2;
			updateBehaviorTimer(world, eid, 0.5);
			expect(getBehavior(world, eid)?.waitTimer).toBeCloseTo(1.5);
			expect(isBehaviorWaiting(world, eid)).toBe(true);
		});

		it('transitions to active when timer expires', () => {
			setBehavior(world, eid);
			Behavior.state[eid] = BehaviorState.Waiting;
			Behavior.waitTimer[eid] = 1;
			updateBehaviorTimer(world, eid, 2);
			expect(isBehaviorActive(world, eid)).toBe(true);
			expect(getBehavior(world, eid)?.waitTimer).toBe(0);
		});

		it('does nothing when not waiting', () => {
			setBehavior(world, eid);
			Behavior.waitTimer[eid] = 5;
			updateBehaviorTimer(world, eid, 1);
			expect(getBehavior(world, eid)?.waitTimer).toBe(5);
		});

		it('does nothing without component', () => {
			expect(() => updateBehaviorTimer(world, eid, 1)).not.toThrow();
		});
	});
});
