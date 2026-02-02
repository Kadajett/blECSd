import { addEntity, createWorld } from 'bitecs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as scheduler from '../core/scheduler';
import {
	createStateMachineSystem,
	getStateAgeStore,
	getSystemStateAge,
	queryStateMachine,
	registerStateMachineSystem,
	resetStateAge,
	stateMachineSystem,
	updateStateAges,
} from './stateMachineSystem';

// Mock getDeltaTime for testing
let mockDeltaTime = 0.016; // ~60fps

vi.mock('../core/scheduler', async () => {
	const actual = await vi.importActual('../core/scheduler');
	return {
		...actual,
		getDeltaTime: vi.fn(() => mockDeltaTime),
	};
});

describe('stateMachineSystem', () => {
	beforeEach(() => {
		mockDeltaTime = 0.016;
		vi.clearAllMocks();
	});

	afterEach(() => {
		// Reset store values
		const store = getStateAgeStore();
		store.fill(0);
	});

	describe('queryStateMachine', () => {
		it('returns empty array for world with no state machines', () => {
			const world = createWorld();
			const entities = queryStateMachine(world);
			expect(entities).toEqual([]);
		});
	});

	describe('stateMachineSystem', () => {
		it('updates stateAge with delta time', () => {
			const world = createWorld();
			const eid = addEntity(world);

			// Manually add to query by triggering component registration
			queryStateMachine(world);

			// Set initial state age
			const store = getStateAgeStore();
			store[eid] = 0;

			// We need to actually add the component for the query to find it
			// Since we can't easily access the internal component, we'll test
			// the helper functions directly
			updateStateAges([eid], 0.016);

			expect(store[eid]).toBeCloseTo(0.016, 5);
		});

		it('accumulates age over multiple frames', () => {
			const store = getStateAgeStore();
			const eid = 1;
			store[eid] = 0;

			// Simulate multiple frames
			updateStateAges([eid], 0.016);
			updateStateAges([eid], 0.016);
			updateStateAges([eid], 0.016);

			expect(store[eid]).toBeCloseTo(0.048, 5);
		});

		it('handles multiple entities in one tick', () => {
			const store = getStateAgeStore();
			const entities = [1, 2, 3, 4, 5];

			for (const eid of entities) {
				store[eid] = 0;
			}

			updateStateAges(entities, 0.033);

			for (const eid of entities) {
				expect(store[eid]).toBeCloseTo(0.033, 5);
			}
		});

		it('works with empty entity list', () => {
			// Should not throw
			expect(() => updateStateAges([], 0.016)).not.toThrow();
		});

		it('returns the world unchanged', () => {
			const world = createWorld();
			const result = stateMachineSystem(world);
			expect(result).toBe(world);
		});
	});

	describe('createStateMachineSystem', () => {
		it('returns the stateMachineSystem function', () => {
			const system = createStateMachineSystem();
			expect(system).toBe(stateMachineSystem);
		});

		it('can be used multiple times', () => {
			const system1 = createStateMachineSystem();
			const system2 = createStateMachineSystem();
			expect(system1).toBe(system2);
		});
	});

	describe('registerStateMachineSystem', () => {
		it('registers system with scheduler', () => {
			const mockScheduler = {
				registerSystem: vi.fn(),
			};

			registerStateMachineSystem(mockScheduler as unknown as scheduler.Scheduler);

			expect(mockScheduler.registerSystem).toHaveBeenCalledWith(
				2, // LoopPhase.UPDATE
				stateMachineSystem,
				0,
			);
		});

		it('accepts custom priority', () => {
			const mockScheduler = {
				registerSystem: vi.fn(),
			};

			registerStateMachineSystem(mockScheduler as unknown as scheduler.Scheduler, 10);

			expect(mockScheduler.registerSystem).toHaveBeenCalledWith(
				2, // LoopPhase.UPDATE
				stateMachineSystem,
				10,
			);
		});
	});

	describe('resetStateAge', () => {
		it('resets state age to zero', () => {
			const store = getStateAgeStore();
			const eid = 5;

			store[eid] = 10.5;
			resetStateAge(eid);

			expect(store[eid]).toBe(0);
		});
	});

	describe('getSystemStateAge', () => {
		it('returns current state age', () => {
			const store = getStateAgeStore();
			const eid = 7;

			store[eid] = 1.23456;

			expect(getSystemStateAge(eid)).toBeCloseTo(1.23456, 5);
		});

		it('returns 0 for uninitialized entity', () => {
			// Fresh entity ID that hasn't been written to
			const eid = 9999;
			expect(getSystemStateAge(eid)).toBe(0);
		});
	});

	describe('integration with scheduler', () => {
		it('uses getDeltaTime from scheduler', () => {
			mockDeltaTime = 0.05; // 20fps

			const world = createWorld();
			stateMachineSystem(world);

			expect(scheduler.getDeltaTime).toHaveBeenCalled();
		});

		it('handles varying delta times', () => {
			const store = getStateAgeStore();
			const eid = 10;
			store[eid] = 0;

			// First frame at 60fps
			updateStateAges([eid], 0.016);
			expect(store[eid]).toBeCloseTo(0.016, 5);

			// Second frame at 30fps (lag spike)
			updateStateAges([eid], 0.033);
			expect(store[eid]).toBeCloseTo(0.049, 5);

			// Third frame back at 60fps
			updateStateAges([eid], 0.016);
			expect(store[eid]).toBeCloseTo(0.065, 5);
		});
	});

	describe('edge cases', () => {
		it('handles zero delta time', () => {
			const store = getStateAgeStore();
			const eid = 11;
			store[eid] = 1.0;

			updateStateAges([eid], 0);

			expect(store[eid]).toBe(1.0);
		});

		it('handles very small delta times', () => {
			const store = getStateAgeStore();
			const eid = 12;
			store[eid] = 0;

			// Very small delta (physics substep)
			updateStateAges([eid], 0.001);

			expect(store[eid]).toBeCloseTo(0.001, 6);
		});

		it('handles large delta times', () => {
			const store = getStateAgeStore();
			const eid = 13;
			store[eid] = 0;

			// Large delta (tab was unfocused)
			updateStateAges([eid], 5.0);

			expect(store[eid]).toBe(5.0);
		});
	});
});
