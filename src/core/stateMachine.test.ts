import { describe, expect, it, vi } from 'vitest';
import { createStateMachine, StateMachine, validateStateMachineConfig } from './stateMachine';

// Simple toggle machine for basic tests
type ToggleStates = 'on' | 'off';
type ToggleEvents = 'toggle';

const toggleConfig = {
	initial: 'off' as const,
	states: {
		off: { on: { toggle: 'on' as const } },
		on: { on: { toggle: 'off' as const } },
	},
};

// Button machine for more complex tests
type ButtonStates = 'idle' | 'focused' | 'active' | 'disabled';
type ButtonEvents = 'focus' | 'blur' | 'press' | 'release' | 'disable' | 'enable';

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
				disable: 'disabled' as const,
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

describe('StateMachine', () => {
	describe('constructor', () => {
		it('starts in initial state', () => {
			const machine = new StateMachine<ToggleStates, ToggleEvents>(toggleConfig);
			expect(machine.current).toBe('off');
		});

		it('runs entry actions on initial state', () => {
			const entryAction = vi.fn();
			const machine = new StateMachine<ToggleStates, ToggleEvents>({
				initial: 'off',
				states: {
					off: { entry: [entryAction], on: { toggle: 'on' } },
					on: { on: { toggle: 'off' } },
				},
			});

			expect(entryAction).toHaveBeenCalledTimes(1);
			expect(machine.current).toBe('off');
		});
	});

	describe('send()', () => {
		it('transitions to target state on valid event', () => {
			const machine = new StateMachine<ToggleStates, ToggleEvents>(toggleConfig);

			machine.send('toggle');
			expect(machine.current).toBe('on');

			machine.send('toggle');
			expect(machine.current).toBe('off');
		});

		it('returns true when transition occurs', () => {
			const machine = new StateMachine<ToggleStates, ToggleEvents>(toggleConfig);
			expect(machine.send('toggle')).toBe(true);
		});

		it('returns false when no valid transition', () => {
			const machine = new StateMachine<ButtonStates, ButtonEvents>(buttonConfig);
			// 'release' is not valid from 'idle'
			expect(machine.send('release')).toBe(false);
			expect(machine.current).toBe('idle');
		});

		it('runs exit actions before transition', () => {
			const exitAction = vi.fn();
			const order: string[] = [];

			const machine = new StateMachine<ToggleStates, ToggleEvents>({
				initial: 'off',
				states: {
					off: {
						exit: [
							() => {
								order.push('exit');
								exitAction();
							},
						],
						on: { toggle: 'on' },
					},
					on: {
						entry: [() => order.push('entry')],
						on: { toggle: 'off' },
					},
				},
			});

			machine.send('toggle');

			expect(exitAction).toHaveBeenCalledTimes(1);
			expect(order).toEqual(['exit', 'entry']);
		});

		it('runs entry actions after transition', () => {
			const entryAction = vi.fn();

			const machine = new StateMachine<ToggleStates, ToggleEvents>({
				initial: 'off',
				states: {
					off: { on: { toggle: 'on' } },
					on: { entry: [entryAction], on: { toggle: 'off' } },
				},
			});

			machine.send('toggle');
			expect(entryAction).toHaveBeenCalledTimes(1);
		});

		it('runs transition actions during transition', () => {
			const transitionAction = vi.fn();
			const order: string[] = [];

			const machine = new StateMachine<ToggleStates, ToggleEvents>({
				initial: 'off',
				states: {
					off: {
						exit: [() => order.push('exit')],
						on: {
							toggle: {
								target: 'on',
								actions: [
									() => {
										order.push('action');
										transitionAction();
									},
								],
							},
						},
					},
					on: {
						entry: [() => order.push('entry')],
						on: { toggle: 'off' },
					},
				},
			});

			machine.send('toggle');

			expect(transitionAction).toHaveBeenCalledTimes(1);
			expect(order).toEqual(['exit', 'action', 'entry']);
		});

		it('respects guard conditions', () => {
			interface Context {
				attempts: number;
			}

			const machine = new StateMachine<'locked' | 'unlocked', 'unlock', Context>({
				initial: 'locked',
				context: { attempts: 0 },
				states: {
					locked: {
						on: {
							unlock: {
								target: 'unlocked',
								guard: (ctx) => ctx.attempts >= 3,
							},
						},
					},
					unlocked: {
						on: {},
					},
				},
			});

			// Guard returns false (attempts < 3)
			expect(machine.send('unlock')).toBe(false);
			expect(machine.current).toBe('locked');
		});
	});

	describe('can()', () => {
		it('returns true for valid transitions', () => {
			const machine = new StateMachine<ToggleStates, ToggleEvents>(toggleConfig);
			expect(machine.can('toggle')).toBe(true);
		});

		it('returns false for invalid transitions', () => {
			const machine = new StateMachine<ButtonStates, ButtonEvents>(buttonConfig);
			expect(machine.can('release')).toBe(false);
		});

		it('respects guard conditions', () => {
			interface Context {
				canToggle: boolean;
			}

			const machine = new StateMachine<ToggleStates, ToggleEvents, Context>({
				initial: 'off',
				context: { canToggle: false },
				states: {
					off: {
						on: {
							toggle: {
								target: 'on',
								guard: (ctx) => ctx.canToggle,
							},
						},
					},
					on: { on: { toggle: 'off' } },
				},
			});

			expect(machine.can('toggle')).toBe(false);
		});
	});

	describe('matches()', () => {
		it('returns true when in specified state', () => {
			const machine = new StateMachine<ToggleStates, ToggleEvents>(toggleConfig);
			expect(machine.matches('off')).toBe(true);
			expect(machine.matches('on')).toBe(false);
		});

		it('updates after transition', () => {
			const machine = new StateMachine<ToggleStates, ToggleEvents>(toggleConfig);
			machine.send('toggle');
			expect(machine.matches('on')).toBe(true);
			expect(machine.matches('off')).toBe(false);
		});
	});

	describe('subscribe()', () => {
		it('notifies listener on state change', () => {
			const machine = new StateMachine<ToggleStates, ToggleEvents>(toggleConfig);
			const listener = vi.fn();

			machine.subscribe(listener);
			machine.send('toggle');

			expect(listener).toHaveBeenCalledTimes(1);
			expect(listener).toHaveBeenCalledWith('on', 'off');
		});

		it('returns unsubscribe function', () => {
			const machine = new StateMachine<ToggleStates, ToggleEvents>(toggleConfig);
			const listener = vi.fn();

			const unsubscribe = machine.subscribe(listener);
			unsubscribe();
			machine.send('toggle');

			expect(listener).not.toHaveBeenCalled();
		});

		it('supports multiple listeners', () => {
			const machine = new StateMachine<ToggleStates, ToggleEvents>(toggleConfig);
			const listener1 = vi.fn();
			const listener2 = vi.fn();

			machine.subscribe(listener1);
			machine.subscribe(listener2);
			machine.send('toggle');

			expect(listener1).toHaveBeenCalledTimes(1);
			expect(listener2).toHaveBeenCalledTimes(1);
		});

		it('does not notify on failed transition', () => {
			const machine = new StateMachine<ButtonStates, ButtonEvents>(buttonConfig);
			const listener = vi.fn();

			machine.subscribe(listener);
			machine.send('release'); // Invalid from 'idle'

			expect(listener).not.toHaveBeenCalled();
		});
	});

	describe('validEvents()', () => {
		it('returns all valid events from current state', () => {
			const machine = new StateMachine<ButtonStates, ButtonEvents>(buttonConfig);
			const events = machine.validEvents();

			expect(events).toContain('focus');
			expect(events).toContain('disable');
			expect(events).not.toContain('blur');
			expect(events).not.toContain('release');
		});

		it('updates after transition', () => {
			const machine = new StateMachine<ButtonStates, ButtonEvents>(buttonConfig);
			machine.send('focus');
			const events = machine.validEvents();

			expect(events).toContain('blur');
			expect(events).toContain('press');
			expect(events).not.toContain('focus');
		});

		it('excludes guarded events that fail', () => {
			interface Context {
				enabled: boolean;
			}

			const machine = new StateMachine<ToggleStates, ToggleEvents, Context>({
				initial: 'off',
				context: { enabled: false },
				states: {
					off: {
						on: {
							toggle: {
								target: 'on',
								guard: (ctx) => ctx.enabled,
							},
						},
					},
					on: { on: { toggle: 'off' } },
				},
			});

			expect(machine.validEvents()).toEqual([]);
		});
	});

	describe('reset()', () => {
		it('returns to initial state', () => {
			const machine = new StateMachine<ButtonStates, ButtonEvents>(buttonConfig);
			machine.send('focus');
			machine.send('press');
			expect(machine.current).toBe('active');

			machine.reset();
			expect(machine.current).toBe('idle');
		});

		it('runs exit actions on current state', () => {
			const exitAction = vi.fn();

			const machine = new StateMachine<ToggleStates, ToggleEvents>({
				initial: 'off',
				states: {
					off: { on: { toggle: 'on' } },
					on: { exit: [exitAction], on: { toggle: 'off' } },
				},
			});

			machine.send('toggle');
			expect(exitAction).not.toHaveBeenCalled();

			machine.reset();
			expect(exitAction).toHaveBeenCalledTimes(1);
		});

		it('runs entry actions on initial state', () => {
			const entryAction = vi.fn();

			const machine = new StateMachine<ToggleStates, ToggleEvents>({
				initial: 'off',
				states: {
					off: { entry: [entryAction], on: { toggle: 'on' } },
					on: { on: { toggle: 'off' } },
				},
			});

			// Called once on construction
			expect(entryAction).toHaveBeenCalledTimes(1);

			machine.send('toggle');
			machine.reset();

			// Called again on reset
			expect(entryAction).toHaveBeenCalledTimes(2);
		});

		it('notifies listeners of state change', () => {
			const machine = new StateMachine<ToggleStates, ToggleEvents>(toggleConfig);
			const listener = vi.fn();

			machine.send('toggle');
			machine.subscribe(listener);
			machine.reset();

			expect(listener).toHaveBeenCalledWith('off', 'on');
		});

		it('does not notify if already in initial state', () => {
			const machine = new StateMachine<ToggleStates, ToggleEvents>(toggleConfig);
			const listener = vi.fn();

			machine.subscribe(listener);
			machine.reset();

			expect(listener).not.toHaveBeenCalled();
		});
	});

	describe('context', () => {
		it('passes context to actions', () => {
			interface Context {
				count: number;
			}

			const machine = new StateMachine<ToggleStates, ToggleEvents, Context>({
				initial: 'off',
				context: { count: 0 },
				states: {
					off: {
						on: {
							toggle: {
								target: 'on',
								actions: [(ctx) => ctx.count++],
							},
						},
					},
					on: { on: { toggle: 'off' } },
				},
			});

			expect(machine.context.count).toBe(0);
			machine.send('toggle');
			expect(machine.context.count).toBe(1);
		});

		it('preserves context on reset() (no deep copy)', () => {
			interface Context {
				count: number;
			}

			const machine = new StateMachine<ToggleStates, ToggleEvents, Context>({
				initial: 'off',
				context: { count: 0 },
				states: {
					off: {
						on: {
							toggle: {
								target: 'on',
								actions: [(ctx) => ctx.count++],
							},
						},
					},
					on: { on: { toggle: 'off' } },
				},
			});

			machine.send('toggle');
			expect(machine.context.count).toBe(1);

			// Context is NOT reset - this is by design
			// For fresh context, create a new machine
			machine.reset();
			expect(machine.context.count).toBe(1);
		});
	});
});

describe('createStateMachine()', () => {
	it('creates a new StateMachine instance', () => {
		const machine = createStateMachine<ToggleStates, ToggleEvents>(toggleConfig);
		expect(machine).toBeInstanceOf(StateMachine);
	});

	it('is equivalent to new StateMachine()', () => {
		const machine = createStateMachine<ToggleStates, ToggleEvents>(toggleConfig);
		expect(machine.current).toBe('off');
		machine.send('toggle');
		expect(machine.current).toBe('on');
	});
});

describe('validateStateMachineConfig()', () => {
	it('validates valid config', () => {
		const config = {
			initial: 'idle',
			states: {
				idle: { on: { activate: 'active' } },
				active: { on: { deactivate: 'idle' } },
			},
		};

		expect(() => validateStateMachineConfig(config)).not.toThrow();
	});

	it('rejects config without initial', () => {
		const config = {
			states: {
				idle: { on: { activate: 'active' } },
			},
		};

		expect(() => validateStateMachineConfig(config)).toThrow();
	});

	it('rejects config without states', () => {
		const config = {
			initial: 'idle',
		};

		expect(() => validateStateMachineConfig(config)).toThrow();
	});
});
