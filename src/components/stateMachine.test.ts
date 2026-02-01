import { addEntity, removeEntity } from 'bitecs';
import { beforeEach, describe, expect, it } from 'vitest';
import type { World } from '../core/types';
import { createWorld } from '../core/world';
import {
	attachStateMachine,
	canSendEvent,
	detachStateMachine,
	getPreviousState,
	getState,
	getStateAge,
	hasStateMachine,
	isInState,
	StateMachineStore,
	sendEvent,
	updateStateAge,
} from './stateMachine';

describe('StateMachine Component', () => {
	let world: World;
	let eid: number;

	const toggleConfig = {
		initial: 'off' as const,
		states: {
			off: { on: { toggle: 'on' as const } },
			on: { on: { toggle: 'off' as const } },
		},
	};

	const buttonConfig = {
		initial: 'idle' as const,
		states: {
			idle: {
				on: {
					focus: 'focused' as const,
					disable: 'disabled' as const,
				},
			},
			focused: {
				on: {
					blur: 'idle' as const,
					press: 'active' as const,
				},
			},
			active: {
				on: {
					release: 'focused' as const,
				},
			},
			disabled: {
				on: {
					enable: 'idle' as const,
				},
			},
		},
	};

	beforeEach(() => {
		world = createWorld();
		eid = addEntity(world);
		StateMachineStore.clear();
	});

	describe('attachStateMachine()', () => {
		it('attaches a state machine to an entity', () => {
			attachStateMachine(world, eid, toggleConfig);
			expect(hasStateMachine(world, eid)).toBe(true);
		});

		it('returns a machine ID', () => {
			const machineId = attachStateMachine(world, eid, toggleConfig);
			expect(machineId).toBeGreaterThan(0);
		});

		it('sets initial state', () => {
			attachStateMachine(world, eid, toggleConfig);
			expect(getState(world, eid)).toBe('off');
		});

		it('supports multiple machines on different entities', () => {
			const eid2 = addEntity(world);
			attachStateMachine(world, eid, toggleConfig);
			attachStateMachine(world, eid2, buttonConfig);

			expect(getState(world, eid)).toBe('off');
			expect(getState(world, eid2)).toBe('idle');
		});
	});

	describe('detachStateMachine()', () => {
		it('removes the state machine from an entity', () => {
			attachStateMachine(world, eid, toggleConfig);
			detachStateMachine(world, eid);
			expect(hasStateMachine(world, eid)).toBe(false);
		});

		it('does nothing if no machine attached', () => {
			expect(() => detachStateMachine(world, eid)).not.toThrow();
		});
	});

	describe('getState()', () => {
		it('returns current state name', () => {
			attachStateMachine(world, eid, toggleConfig);
			expect(getState(world, eid)).toBe('off');
		});

		it('returns empty string if no machine attached', () => {
			expect(getState(world, eid)).toBe('');
		});

		it('updates after transition', () => {
			attachStateMachine(world, eid, toggleConfig);
			sendEvent(world, eid, 'toggle');
			expect(getState(world, eid)).toBe('on');
		});
	});

	describe('getPreviousState()', () => {
		it('returns previous state after transition', () => {
			attachStateMachine(world, eid, toggleConfig);
			sendEvent(world, eid, 'toggle');
			expect(getPreviousState(world, eid)).toBe('off');
			expect(getState(world, eid)).toBe('on');
		});

		it('returns initial state before any transition', () => {
			attachStateMachine(world, eid, toggleConfig);
			expect(getPreviousState(world, eid)).toBe('off');
		});

		it('returns empty string if no machine attached', () => {
			expect(getPreviousState(world, eid)).toBe('');
		});
	});

	describe('sendEvent()', () => {
		it('transitions on valid event', () => {
			attachStateMachine(world, eid, toggleConfig);
			const result = sendEvent(world, eid, 'toggle');
			expect(result).toBe(true);
			expect(getState(world, eid)).toBe('on');
		});

		it('returns false on invalid event', () => {
			attachStateMachine(world, eid, buttonConfig);
			const result = sendEvent(world, eid, 'release'); // Invalid from 'idle'
			expect(result).toBe(false);
			expect(getState(world, eid)).toBe('idle');
		});

		it('returns false if no machine attached', () => {
			const result = sendEvent(world, eid, 'toggle');
			expect(result).toBe(false);
		});

		it('resets state age on transition', () => {
			attachStateMachine(world, eid, toggleConfig);
			updateStateAge(world, [eid], 5.0);
			expect(getStateAge(world, eid)).toBeGreaterThan(0);

			sendEvent(world, eid, 'toggle');
			expect(getStateAge(world, eid)).toBe(0);
		});

		it('supports multiple transitions', () => {
			attachStateMachine(world, eid, buttonConfig);

			sendEvent(world, eid, 'focus');
			expect(getState(world, eid)).toBe('focused');

			sendEvent(world, eid, 'press');
			expect(getState(world, eid)).toBe('active');

			sendEvent(world, eid, 'release');
			expect(getState(world, eid)).toBe('focused');
		});
	});

	describe('canSendEvent()', () => {
		it('returns true for valid events', () => {
			attachStateMachine(world, eid, toggleConfig);
			expect(canSendEvent(world, eid, 'toggle')).toBe(true);
		});

		it('returns false for invalid events', () => {
			attachStateMachine(world, eid, buttonConfig);
			expect(canSendEvent(world, eid, 'release')).toBe(false);
		});

		it('returns false if no machine attached', () => {
			expect(canSendEvent(world, eid, 'toggle')).toBe(false);
		});
	});

	describe('getStateAge()', () => {
		it('starts at 0', () => {
			attachStateMachine(world, eid, toggleConfig);
			expect(getStateAge(world, eid)).toBe(0);
		});

		it('returns 0 if no machine attached', () => {
			expect(getStateAge(world, eid)).toBe(0);
		});
	});

	describe('updateStateAge()', () => {
		it('increments state age by delta time', () => {
			attachStateMachine(world, eid, toggleConfig);
			updateStateAge(world, [eid], 0.016);
			expect(getStateAge(world, eid)).toBeCloseTo(0.016);
		});

		it('accumulates over multiple calls', () => {
			attachStateMachine(world, eid, toggleConfig);
			updateStateAge(world, [eid], 0.5);
			updateStateAge(world, [eid], 0.5);
			expect(getStateAge(world, eid)).toBeCloseTo(1.0);
		});

		it('updates multiple entities', () => {
			const eid2 = addEntity(world);
			attachStateMachine(world, eid, toggleConfig);
			attachStateMachine(world, eid2, toggleConfig);

			updateStateAge(world, [eid, eid2], 1.0);

			expect(getStateAge(world, eid)).toBeCloseTo(1.0);
			expect(getStateAge(world, eid2)).toBeCloseTo(1.0);
		});

		it('ignores entities without state machines', () => {
			const eid2 = addEntity(world);
			attachStateMachine(world, eid, toggleConfig);

			expect(() => updateStateAge(world, [eid, eid2], 1.0)).not.toThrow();
		});
	});

	describe('isInState()', () => {
		it('returns true when in specified state', () => {
			attachStateMachine(world, eid, toggleConfig);
			expect(isInState(world, eid, 'off')).toBe(true);
			expect(isInState(world, eid, 'on')).toBe(false);
		});

		it('updates after transition', () => {
			attachStateMachine(world, eid, toggleConfig);
			sendEvent(world, eid, 'toggle');
			expect(isInState(world, eid, 'on')).toBe(true);
			expect(isInState(world, eid, 'off')).toBe(false);
		});

		it('returns false if no machine attached', () => {
			expect(isInState(world, eid, 'off')).toBe(false);
		});
	});

	describe('hasStateMachine()', () => {
		it('returns true when machine is attached', () => {
			attachStateMachine(world, eid, toggleConfig);
			expect(hasStateMachine(world, eid)).toBe(true);
		});

		it('returns false when no machine attached', () => {
			expect(hasStateMachine(world, eid)).toBe(false);
		});

		it('returns false after detach', () => {
			attachStateMachine(world, eid, toggleConfig);
			detachStateMachine(world, eid);
			expect(hasStateMachine(world, eid)).toBe(false);
		});
	});

	describe('StateMachineStore', () => {
		it('clear() resets all machines', () => {
			attachStateMachine(world, eid, toggleConfig);
			StateMachineStore.clear();

			// Machine ID still in component but store is cleared
			// New registrations start from 1 again
			const eid2 = addEntity(world);
			const machineId = attachStateMachine(world, eid2, toggleConfig);
			expect(machineId).toBe(1);
		});
	});

	describe('entity lifecycle', () => {
		it('survives entity removal and re-addition', () => {
			attachStateMachine(world, eid, toggleConfig);
			sendEvent(world, eid, 'toggle');

			// Remove entity
			removeEntity(world, eid);

			// Create new entity (may reuse same ID)
			const newEid = addEntity(world);
			attachStateMachine(world, newEid, buttonConfig);

			expect(getState(world, newEid)).toBe('idle');
		});
	});
});
