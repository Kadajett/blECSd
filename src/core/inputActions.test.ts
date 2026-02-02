/**
 * Input Action Manager Tests
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ActionPresets, createInputActionManager, InputActionManager } from './inputActions';
import type { TimestampedKeyEvent, TimestampedMouseEvent } from './inputEventBuffer';
import { createInputState, type InputState } from './inputState';

describe('InputActionManager', () => {
	let actions: InputActionManager;
	let inputState: InputState;

	// Helper to create a key event
	function keyEvent(name: string, timestamp = 0): TimestampedKeyEvent {
		return {
			type: 'key',
			event: {
				// biome-ignore lint/suspicious/noExplicitAny: test helper accepts any key name string
				name: name as any,
				sequence: name,
				ctrl: false,
				meta: false,
				shift: false,
				raw: new Uint8Array([]),
			},
			timestamp,
		};
	}

	// Helper to create a mouse event
	function mouseEvent(
		action: 'mousedown' | 'mouseup',
		button: string,
		x = 0,
		y = 0,
		timestamp = 0,
	): TimestampedMouseEvent {
		return {
			type: 'mouse',
			event: {
				// biome-ignore lint/suspicious/noExplicitAny: test helper accepts action strings
				action: action as any,
				// biome-ignore lint/suspicious/noExplicitAny: test helper accepts button strings
				button: button as any,
				x,
				y,
				ctrl: false,
				meta: false,
				shift: false,
				// biome-ignore lint/suspicious/noExplicitAny: test helper accepts protocol strings
				protocol: 'SGR' as any,
				raw: new Uint8Array([]),
			},
			timestamp,
		};
	}

	// Helper to update both input state and actions
	function update(
		keys: TimestampedKeyEvent[] = [],
		mouse: TimestampedMouseEvent[] = [],
		deltaTime = 0.016,
	) {
		inputState.update(keys, mouse, deltaTime);
		actions.update(inputState, deltaTime);
	}

	beforeEach(() => {
		actions = createInputActionManager();
		inputState = createInputState();
	});

	describe('createInputActionManager', () => {
		it('should create an action manager', () => {
			const manager = createInputActionManager();
			expect(manager).toBeInstanceOf(InputActionManager);
		});

		it('should create with initial bindings', () => {
			const manager = createInputActionManager([
				{ action: 'jump', keys: ['space'] },
				{ action: 'attack', keys: ['j'] },
			]);

			expect(manager.hasAction('jump')).toBe(true);
			expect(manager.hasAction('attack')).toBe(true);
		});
	});

	describe('registration', () => {
		it('should register an action', () => {
			actions.register({ action: 'jump', keys: ['space'] });

			expect(actions.hasAction('jump')).toBe(true);
			expect(actions.getActions()).toContain('jump');
		});

		it('should register multiple actions', () => {
			actions.registerAll([
				{ action: 'jump', keys: ['space'] },
				{ action: 'attack', keys: ['j'] },
			]);

			expect(actions.hasAction('jump')).toBe(true);
			expect(actions.hasAction('attack')).toBe(true);
		});

		it('should unregister an action', () => {
			actions.register({ action: 'jump', keys: ['space'] });
			const result = actions.unregister('jump');

			expect(result).toBe(true);
			expect(actions.hasAction('jump')).toBe(false);
		});

		it('should return false when unregistering non-existent action', () => {
			const result = actions.unregister('nonexistent');
			expect(result).toBe(false);
		});

		it('should get binding for action', () => {
			actions.register({
				action: 'jump',
				keys: ['space', 'w'],
				continuous: false,
			});

			const binding = actions.getBinding('jump');
			expect(binding?.action).toBe('jump');
			expect(binding?.keys).toEqual(['space', 'w']);
			expect(binding?.continuous).toBe(false);
		});

		it('should return undefined for non-existent action binding', () => {
			expect(actions.getBinding('nonexistent')).toBeUndefined();
		});
	});

	describe('action states', () => {
		beforeEach(() => {
			actions.register({ action: 'jump', keys: ['space'] });
		});

		it('should detect action activation', () => {
			update([keyEvent('space')]);

			expect(actions.isActive('jump')).toBe(true);
			expect(actions.isJustActivated('jump')).toBe(true);
		});

		it('should clear just activated on next frame', () => {
			update([keyEvent('space')]);
			expect(actions.isJustActivated('jump')).toBe(true);

			update([keyEvent('space')]); // Key still held
			expect(actions.isActive('jump')).toBe(true);
			expect(actions.isJustActivated('jump')).toBe(false);
		});

		it('should detect action deactivation', () => {
			update([keyEvent('space')]);
			inputState.releaseKey('space');
			update();

			expect(actions.isActive('jump')).toBe(false);
			expect(actions.isJustDeactivated('jump')).toBe(true);
		});

		it('should track active time', () => {
			update([keyEvent('space')]);
			expect(actions.getActiveTime('jump')).toBeCloseTo(0, 0);

			update([keyEvent('space')], [], 0.1); // 100ms
			expect(actions.getActiveTime('jump')).toBeCloseTo(100, 0);
		});

		it('should return default state for unknown actions', () => {
			const state = actions.getState('unknown');
			expect(state.active).toBe(false);
			expect(state.justActivated).toBe(false);
			expect(state.value).toBe(0);
		});
	});

	describe('multiple key bindings', () => {
		beforeEach(() => {
			actions.register({ action: 'jump', keys: ['space', 'w', 'up'] });
		});

		it('should activate with any bound key', () => {
			update([keyEvent('space')]);
			expect(actions.isActive('jump')).toBe(true);

			inputState.releaseAllKeys();
			update([keyEvent('w')]);
			expect(actions.isActive('jump')).toBe(true);

			inputState.releaseAllKeys();
			update([keyEvent('up')]);
			expect(actions.isActive('jump')).toBe(true);
		});

		it('should stay active when switching between bound keys', () => {
			update([keyEvent('space')]);
			expect(actions.isActive('jump')).toBe(true);

			// Add 'w' while 'space' is still held
			update([keyEvent('space'), keyEvent('w')]);
			expect(actions.isActive('jump')).toBe(true);

			// Release 'space', keep 'w'
			inputState.releaseKey('space');
			update([keyEvent('w')]);
			expect(actions.isActive('jump')).toBe(true);
		});
	});

	describe('mouse button bindings', () => {
		beforeEach(() => {
			actions.register({
				action: 'attack',
				keys: [],
				mouseButtons: ['left'],
			});
		});

		it('should activate with mouse button', () => {
			update([], [mouseEvent('mousedown', 'left')]);

			expect(actions.isActive('attack')).toBe(true);
			expect(actions.isJustActivated('attack')).toBe(true);
		});

		it('should deactivate when mouse button released', () => {
			update([], [mouseEvent('mousedown', 'left')]);
			update([], [mouseEvent('mouseup', 'left')]);

			expect(actions.isActive('attack')).toBe(false);
			expect(actions.isJustDeactivated('attack')).toBe(true);
		});
	});

	describe('continuous actions', () => {
		it('should fire callback continuously when continuous is true', () => {
			const callback = vi.fn();

			actions.register({ action: 'move', keys: ['d'], continuous: true });
			actions.onAction('move', callback);

			update([keyEvent('d')]);
			expect(callback).toHaveBeenCalledTimes(1);

			update([keyEvent('d')]);
			expect(callback).toHaveBeenCalledTimes(2);

			update([keyEvent('d')]);
			expect(callback).toHaveBeenCalledTimes(3);
		});

		it('should not fire callback continuously when continuous is false', () => {
			const callback = vi.fn();

			actions.register({ action: 'jump', keys: ['space'], continuous: false });
			actions.onAction('jump', callback);

			update([keyEvent('space')]);
			expect(callback).toHaveBeenCalledTimes(1); // Just activated

			update([keyEvent('space')]);
			expect(callback).toHaveBeenCalledTimes(1); // Still held, no callback
		});
	});

	describe('rebinding', () => {
		beforeEach(() => {
			actions.register({ action: 'jump', keys: ['space'] });
		});

		it('should rebind keys', () => {
			actions.rebindKeys('jump', ['w', 'up']);

			expect(actions.getKeysForAction('jump')).toEqual(['w', 'up']);
		});

		it('should add key to binding', () => {
			actions.addKey('jump', 'w');

			expect(actions.getKeysForAction('jump')).toContain('space');
			expect(actions.getKeysForAction('jump')).toContain('w');
		});

		it('should not add duplicate key', () => {
			actions.addKey('jump', 'space');

			expect(actions.getKeysForAction('jump')).toEqual(['space']);
		});

		it('should remove key from binding', () => {
			actions.register({ action: 'jump', keys: ['space', 'w'] });
			actions.removeKey('jump', 'space');

			expect(actions.getKeysForAction('jump')).toEqual(['w']);
		});

		it('should rebind mouse buttons', () => {
			actions.rebindMouseButtons('jump', ['left', 'right']);

			expect(actions.getMouseButtonsForAction('jump')).toEqual(['left', 'right']);
		});

		it('should find actions for key', () => {
			actions.register({ action: 'move', keys: ['space'] });

			const actionsForSpace = actions.getActionsForKey('space');
			expect(actionsForSpace).toContain('jump');
			expect(actionsForSpace).toContain('move');
		});
	});

	describe('callbacks', () => {
		it('should call action callback on activation', () => {
			const callback = vi.fn();
			actions.register({ action: 'jump', keys: ['space'] });
			actions.onAction('jump', callback);

			update([keyEvent('space')]);

			expect(callback).toHaveBeenCalledWith(
				'jump',
				expect.objectContaining({ active: true, justActivated: true }),
				inputState,
			);
		});

		it('should call action callback on deactivation', () => {
			const callback = vi.fn();
			actions.register({ action: 'jump', keys: ['space'] });
			actions.onAction('jump', callback);

			update([keyEvent('space')]);
			callback.mockClear();

			inputState.releaseKey('space');
			update();

			expect(callback).toHaveBeenCalledWith(
				'jump',
				expect.objectContaining({ active: false, justDeactivated: true }),
				inputState,
			);
		});

		it('should call global callback for any action', () => {
			const callback = vi.fn();
			actions.register({ action: 'jump', keys: ['space'] });
			actions.register({ action: 'attack', keys: ['j'] });
			actions.onAnyAction(callback);

			update([keyEvent('space')]);
			expect(callback).toHaveBeenCalledWith('jump', expect.any(Object), inputState);

			callback.mockClear();
			update([keyEvent('j')]);
			expect(callback).toHaveBeenCalledWith('attack', expect.any(Object), inputState);
		});

		it('should unsubscribe callback', () => {
			const callback = vi.fn();
			actions.register({ action: 'jump', keys: ['space'] });
			const unsubscribe = actions.onAction('jump', callback);

			unsubscribe();
			update([keyEvent('space')]);

			expect(callback).not.toHaveBeenCalled();
		});
	});

	describe('save/load', () => {
		it('should save bindings', () => {
			actions.register({ action: 'jump', keys: ['space', 'w'] });
			actions.register({ action: 'attack', keys: ['j'], mouseButtons: ['left'] });

			const saved = actions.saveBindings();

			expect(saved.version).toBe(1);
			expect(saved.bindings).toHaveLength(2);
			expect(saved.bindings.find((b) => b.action === 'jump')?.keys).toEqual(['space', 'w']);
		});

		it('should load bindings', () => {
			const saved = {
				version: 1,
				bindings: [
					{ action: 'jump', keys: ['space'] },
					{ action: 'attack', keys: ['j'], mouseButtons: ['left'] },
				],
			};

			actions.loadBindings(saved);

			expect(actions.hasAction('jump')).toBe(true);
			expect(actions.hasAction('attack')).toBe(true);
			expect(actions.getKeysForAction('jump')).toEqual(['space']);
		});

		it('should export to JSON', () => {
			actions.register({ action: 'jump', keys: ['space'] });

			const json = actions.toJSON();
			const parsed = JSON.parse(json);

			expect(parsed.version).toBe(1);
			expect(parsed.bindings[0].action).toBe('jump');
		});

		it('should import from JSON', () => {
			const json = JSON.stringify({
				version: 1,
				bindings: [{ action: 'jump', keys: ['space'] }],
			});

			actions.fromJSON(json);

			expect(actions.hasAction('jump')).toBe(true);
		});

		it('should throw on invalid bindings', () => {
			expect(() => actions.loadBindings({ invalid: 'data' })).toThrow();
		});
	});

	describe('reset', () => {
		it('should reset states without removing bindings', () => {
			actions.register({ action: 'jump', keys: ['space'] });
			update([keyEvent('space')]);
			expect(actions.isActive('jump')).toBe(true);

			actions.resetStates();
			expect(actions.isActive('jump')).toBe(false);
			expect(actions.hasAction('jump')).toBe(true);
		});

		it('should clear all bindings and states', () => {
			actions.register({ action: 'jump', keys: ['space'] });
			update([keyEvent('space')]);

			actions.clear();

			expect(actions.hasAction('jump')).toBe(false);
			expect(actions.getActions()).toHaveLength(0);
		});
	});

	describe('active actions', () => {
		it('should get all active actions', () => {
			actions.register({ action: 'jump', keys: ['space'] });
			actions.register({ action: 'attack', keys: ['j'] });
			actions.register({ action: 'move', keys: ['d'] });

			update([keyEvent('space'), keyEvent('d')]);

			const active = actions.getActiveActions();
			expect(active).toContain('jump');
			expect(active).toContain('move');
			expect(active).not.toContain('attack');
		});
	});

	describe('getValue', () => {
		it('should return 1 when active', () => {
			actions.register({ action: 'jump', keys: ['space'] });
			update([keyEvent('space')]);

			expect(actions.getValue('jump')).toBe(1);
		});

		it('should return 0 when inactive', () => {
			actions.register({ action: 'jump', keys: ['space'] });
			update();

			expect(actions.getValue('jump')).toBe(0);
		});

		it('should return 0 for unknown action', () => {
			expect(actions.getValue('unknown')).toBe(0);
		});
	});

	describe('ActionPresets', () => {
		it('should have platformer preset', () => {
			const preset = ActionPresets.platformer;
			expect(preset.find((b) => b.action === 'jump')).toBeDefined();
			expect(preset.find((b) => b.action === 'move_left')).toBeDefined();
		});

		it('should have topDown preset', () => {
			const preset = ActionPresets.topDown;
			expect(preset.find((b) => b.action === 'move_up')).toBeDefined();
			expect(preset.find((b) => b.action === 'action')).toBeDefined();
		});

		it('should have menu preset', () => {
			const preset = ActionPresets.menu;
			expect(preset.find((b) => b.action === 'confirm')).toBeDefined();
			expect(preset.find((b) => b.action === 'cancel')).toBeDefined();
		});

		it('should work when registered', () => {
			actions.registerAll(ActionPresets.platformer);

			expect(actions.hasAction('jump')).toBe(true);
			expect(actions.hasAction('move_left')).toBe(true);
			expect(actions.hasAction('attack')).toBe(true);
		});
	});
});
