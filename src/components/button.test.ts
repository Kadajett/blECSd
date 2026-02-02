import { addEntity } from 'bitecs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { World } from '../core/types';
import { createWorld } from '../core/world';
import {
	attachButtonBehavior,
	BUTTON_STATE_MACHINE_CONFIG,
	buttonStore,
	clearButtonCallbacks,
	disableButton,
	enableButton,
	getButtonState,
	handleButtonKeyPress,
	isButton,
	isButtonDisabled,
	isButtonFocused,
	isButtonHovered,
	isButtonInState,
	isButtonPressed,
	onButtonPress,
	pressButton,
	resetButtonStore,
	sendButtonEvent,
} from './button';
import { StateMachineStore } from './stateMachine';

describe('Button Component', () => {
	let world: World;
	let eid: number;

	beforeEach(() => {
		world = createWorld();
		eid = addEntity(world);
		StateMachineStore.clear();
		resetButtonStore();
	});

	describe('BUTTON_STATE_MACHINE_CONFIG', () => {
		it('should have idle as initial state', () => {
			expect(BUTTON_STATE_MACHINE_CONFIG.initial).toBe('idle');
		});

		it('should have all expected states', () => {
			const states = Object.keys(BUTTON_STATE_MACHINE_CONFIG.states);
			expect(states).toContain('idle');
			expect(states).toContain('hovered');
			expect(states).toContain('pressed');
			expect(states).toContain('focused');
			expect(states).toContain('disabled');
		});

		it('should have correct transitions from idle', () => {
			const idleState = BUTTON_STATE_MACHINE_CONFIG.states.idle;
			expect(idleState.on?.mouseenter).toBe('hovered');
			expect(idleState.on?.focus).toBe('focused');
			expect(idleState.on?.disable).toBe('disabled');
		});

		it('should have correct transitions from hovered', () => {
			const hoveredState = BUTTON_STATE_MACHINE_CONFIG.states.hovered;
			expect(hoveredState.on?.mousedown).toBe('pressed');
			expect(hoveredState.on?.mouseleave).toBe('idle');
			expect(hoveredState.on?.focus).toBe('focused');
			expect(hoveredState.on?.disable).toBe('disabled');
		});

		it('should have correct transitions from pressed', () => {
			const pressedState = BUTTON_STATE_MACHINE_CONFIG.states.pressed;
			expect(pressedState.on?.mouseup).toBe('hovered');
			expect(pressedState.on?.mouseleave).toBe('idle');
		});

		it('should have correct transitions from focused', () => {
			const focusedState = BUTTON_STATE_MACHINE_CONFIG.states.focused;
			expect(focusedState.on?.blur).toBe('idle');
			expect(focusedState.on?.mouseenter).toBe('hovered');
			expect(focusedState.on?.disable).toBe('disabled');
		});

		it('should have correct transitions from disabled', () => {
			const disabledState = BUTTON_STATE_MACHINE_CONFIG.states.disabled;
			expect(disabledState.on?.enable).toBe('idle');
		});
	});

	describe('attachButtonBehavior', () => {
		it('should attach state machine to entity', () => {
			const machineId = attachButtonBehavior(world, eid);
			expect(machineId).toBeGreaterThan(0);
		});

		it('should mark entity as button', () => {
			attachButtonBehavior(world, eid);
			expect(buttonStore.isButton[eid]).toBe(1);
		});

		it('should store machine ID', () => {
			const machineId = attachButtonBehavior(world, eid);
			expect(buttonStore.machineId[eid]).toBe(machineId);
		});

		it('should start in idle state', () => {
			attachButtonBehavior(world, eid);
			expect(getButtonState(world, eid)).toBe('idle');
		});
	});

	describe('isButton', () => {
		it('should return true for button entities', () => {
			attachButtonBehavior(world, eid);
			expect(isButton(world, eid)).toBe(true);
		});

		it('should return false for non-button entities', () => {
			expect(isButton(world, eid)).toBe(false);
		});

		it('should return false for entities with only isButton flag', () => {
			buttonStore.isButton[eid] = 1;
			expect(isButton(world, eid)).toBe(false);
		});
	});

	describe('getButtonState', () => {
		it('should return current state', () => {
			attachButtonBehavior(world, eid);
			expect(getButtonState(world, eid)).toBe('idle');
		});

		it('should return undefined for non-buttons', () => {
			expect(getButtonState(world, eid)).toBeUndefined();
		});

		it('should return updated state after transition', () => {
			attachButtonBehavior(world, eid);
			sendButtonEvent(world, eid, 'mouseenter');
			expect(getButtonState(world, eid)).toBe('hovered');
		});
	});

	describe('sendButtonEvent', () => {
		beforeEach(() => {
			attachButtonBehavior(world, eid);
		});

		it('should transition from idle to hovered on mouseenter', () => {
			const result = sendButtonEvent(world, eid, 'mouseenter');
			expect(result).toBe(true);
			expect(getButtonState(world, eid)).toBe('hovered');
		});

		it('should transition from hovered to pressed on mousedown', () => {
			sendButtonEvent(world, eid, 'mouseenter');
			const result = sendButtonEvent(world, eid, 'mousedown');
			expect(result).toBe(true);
			expect(getButtonState(world, eid)).toBe('pressed');
		});

		it('should transition from pressed to hovered on mouseup', () => {
			sendButtonEvent(world, eid, 'mouseenter');
			sendButtonEvent(world, eid, 'mousedown');
			const result = sendButtonEvent(world, eid, 'mouseup');
			expect(result).toBe(true);
			expect(getButtonState(world, eid)).toBe('hovered');
		});

		it('should return false for invalid transitions', () => {
			const result = sendButtonEvent(world, eid, 'mouseup');
			expect(result).toBe(false);
			expect(getButtonState(world, eid)).toBe('idle');
		});

		it('should return false for non-button entities', () => {
			const nonButton = addEntity(world);
			const result = sendButtonEvent(world, nonButton, 'mouseenter');
			expect(result).toBe(false);
		});

		it('should handle focus events', () => {
			sendButtonEvent(world, eid, 'focus');
			expect(getButtonState(world, eid)).toBe('focused');
		});

		it('should handle blur events', () => {
			sendButtonEvent(world, eid, 'focus');
			sendButtonEvent(world, eid, 'blur');
			expect(getButtonState(world, eid)).toBe('idle');
		});
	});

	describe('state check functions', () => {
		beforeEach(() => {
			attachButtonBehavior(world, eid);
		});

		describe('isButtonInState', () => {
			it('should return true when in specified state', () => {
				expect(isButtonInState(world, eid, 'idle')).toBe(true);
			});

			it('should return false when not in specified state', () => {
				expect(isButtonInState(world, eid, 'hovered')).toBe(false);
			});

			it('should return false for non-buttons', () => {
				const nonButton = addEntity(world);
				expect(isButtonInState(world, nonButton, 'idle')).toBe(false);
			});
		});

		describe('isButtonHovered', () => {
			it('should return false when idle', () => {
				expect(isButtonHovered(world, eid)).toBe(false);
			});

			it('should return true when hovered', () => {
				sendButtonEvent(world, eid, 'mouseenter');
				expect(isButtonHovered(world, eid)).toBe(true);
			});
		});

		describe('isButtonPressed', () => {
			it('should return false when idle', () => {
				expect(isButtonPressed(world, eid)).toBe(false);
			});

			it('should return true when pressed', () => {
				sendButtonEvent(world, eid, 'mouseenter');
				sendButtonEvent(world, eid, 'mousedown');
				expect(isButtonPressed(world, eid)).toBe(true);
			});
		});

		describe('isButtonFocused', () => {
			it('should return false when idle', () => {
				expect(isButtonFocused(world, eid)).toBe(false);
			});

			it('should return true when focused', () => {
				sendButtonEvent(world, eid, 'focus');
				expect(isButtonFocused(world, eid)).toBe(true);
			});
		});

		describe('isButtonDisabled', () => {
			it('should return false when idle', () => {
				expect(isButtonDisabled(world, eid)).toBe(false);
			});

			it('should return true when disabled', () => {
				sendButtonEvent(world, eid, 'disable');
				expect(isButtonDisabled(world, eid)).toBe(true);
			});
		});
	});

	describe('disableButton', () => {
		beforeEach(() => {
			attachButtonBehavior(world, eid);
		});

		it('should disable button from idle state', () => {
			const result = disableButton(world, eid);
			expect(result).toBe(true);
			expect(isButtonDisabled(world, eid)).toBe(true);
		});

		it('should disable button from hovered state', () => {
			sendButtonEvent(world, eid, 'mouseenter');
			const result = disableButton(world, eid);
			expect(result).toBe(true);
			expect(isButtonDisabled(world, eid)).toBe(true);
		});

		it('should disable button from focused state', () => {
			sendButtonEvent(world, eid, 'focus');
			const result = disableButton(world, eid);
			expect(result).toBe(true);
			expect(isButtonDisabled(world, eid)).toBe(true);
		});

		it('should not transition from pressed to disabled', () => {
			sendButtonEvent(world, eid, 'mouseenter');
			sendButtonEvent(world, eid, 'mousedown');
			const result = disableButton(world, eid);
			expect(result).toBe(false);
			expect(isButtonPressed(world, eid)).toBe(true);
		});
	});

	describe('enableButton', () => {
		beforeEach(() => {
			attachButtonBehavior(world, eid);
			disableButton(world, eid);
		});

		it('should enable disabled button', () => {
			const result = enableButton(world, eid);
			expect(result).toBe(true);
			expect(getButtonState(world, eid)).toBe('idle');
		});

		it('should return false for non-disabled button', () => {
			enableButton(world, eid);
			const result = enableButton(world, eid);
			expect(result).toBe(false);
		});
	});

	describe('onButtonPress', () => {
		beforeEach(() => {
			attachButtonBehavior(world, eid);
		});

		it('should register callback', () => {
			const callback = vi.fn();
			onButtonPress(eid, callback);

			sendButtonEvent(world, eid, 'mouseenter');
			sendButtonEvent(world, eid, 'mousedown');
			sendButtonEvent(world, eid, 'mouseup');

			expect(callback).toHaveBeenCalledTimes(1);
		});

		it('should return unsubscribe function', () => {
			const callback = vi.fn();
			const unsubscribe = onButtonPress(eid, callback);

			unsubscribe();

			sendButtonEvent(world, eid, 'mouseenter');
			sendButtonEvent(world, eid, 'mousedown');
			sendButtonEvent(world, eid, 'mouseup');

			expect(callback).not.toHaveBeenCalled();
		});

		it('should support multiple callbacks', () => {
			const callback1 = vi.fn();
			const callback2 = vi.fn();

			onButtonPress(eid, callback1);
			onButtonPress(eid, callback2);

			sendButtonEvent(world, eid, 'mouseenter');
			sendButtonEvent(world, eid, 'mousedown');
			sendButtonEvent(world, eid, 'mouseup');

			expect(callback1).toHaveBeenCalledTimes(1);
			expect(callback2).toHaveBeenCalledTimes(1);
		});

		it('should only call callback on press (mouseup from pressed)', () => {
			const callback = vi.fn();
			onButtonPress(eid, callback);

			sendButtonEvent(world, eid, 'mouseenter');
			expect(callback).not.toHaveBeenCalled();

			sendButtonEvent(world, eid, 'mousedown');
			expect(callback).not.toHaveBeenCalled();

			sendButtonEvent(world, eid, 'mouseup');
			expect(callback).toHaveBeenCalledTimes(1);
		});

		it('should not call callback when leaving pressed via mouseleave', () => {
			const callback = vi.fn();
			onButtonPress(eid, callback);

			sendButtonEvent(world, eid, 'mouseenter');
			sendButtonEvent(world, eid, 'mousedown');
			sendButtonEvent(world, eid, 'mouseleave');

			expect(callback).not.toHaveBeenCalled();
		});
	});

	describe('pressButton', () => {
		beforeEach(() => {
			attachButtonBehavior(world, eid);
		});

		it('should programmatically press button', () => {
			const callback = vi.fn();
			onButtonPress(eid, callback);

			const result = pressButton(world, eid);

			expect(result).toBe(true);
			expect(callback).toHaveBeenCalledTimes(1);
		});

		it('should return false for non-buttons', () => {
			const nonButton = addEntity(world);
			const result = pressButton(world, nonButton);
			expect(result).toBe(false);
		});

		it('should return false for disabled buttons', () => {
			disableButton(world, eid);
			const callback = vi.fn();
			onButtonPress(eid, callback);

			const result = pressButton(world, eid);

			expect(result).toBe(false);
			expect(callback).not.toHaveBeenCalled();
		});

		it('should work from any non-disabled state', () => {
			const callback = vi.fn();
			onButtonPress(eid, callback);

			// From idle
			pressButton(world, eid);
			expect(callback).toHaveBeenCalledTimes(1);

			// From hovered
			sendButtonEvent(world, eid, 'mouseenter');
			pressButton(world, eid);
			expect(callback).toHaveBeenCalledTimes(2);

			// From focused
			sendButtonEvent(world, eid, 'focus');
			pressButton(world, eid);
			expect(callback).toHaveBeenCalledTimes(3);
		});
	});

	describe('clearButtonCallbacks', () => {
		it('should remove all callbacks for entity', () => {
			attachButtonBehavior(world, eid);
			const callback = vi.fn();
			onButtonPress(eid, callback);

			clearButtonCallbacks(eid);

			sendButtonEvent(world, eid, 'mouseenter');
			sendButtonEvent(world, eid, 'mousedown');
			sendButtonEvent(world, eid, 'mouseup');

			expect(callback).not.toHaveBeenCalled();
		});

		it('should not affect other entities', () => {
			const eid2 = addEntity(world);
			attachButtonBehavior(world, eid);
			attachButtonBehavior(world, eid2);

			const callback1 = vi.fn();
			const callback2 = vi.fn();
			onButtonPress(eid, callback1);
			onButtonPress(eid2, callback2);

			clearButtonCallbacks(eid);

			pressButton(world, eid);
			pressButton(world, eid2);

			expect(callback1).not.toHaveBeenCalled();
			expect(callback2).toHaveBeenCalledTimes(1);
		});
	});

	describe('handleButtonKeyPress', () => {
		beforeEach(() => {
			attachButtonBehavior(world, eid);
		});

		it('should trigger press on Enter when focused', () => {
			const callback = vi.fn();
			onButtonPress(eid, callback);

			sendButtonEvent(world, eid, 'focus');
			const result = handleButtonKeyPress(world, eid, 'enter');

			expect(result).toBe(true);
			expect(callback).toHaveBeenCalledTimes(1);
		});

		it('should trigger press on return when focused', () => {
			const callback = vi.fn();
			onButtonPress(eid, callback);

			sendButtonEvent(world, eid, 'focus');
			const result = handleButtonKeyPress(world, eid, 'return');

			expect(result).toBe(true);
			expect(callback).toHaveBeenCalledTimes(1);
		});

		it('should trigger press on Space when focused', () => {
			const callback = vi.fn();
			onButtonPress(eid, callback);

			sendButtonEvent(world, eid, 'focus');
			const result = handleButtonKeyPress(world, eid, 'space');

			expect(result).toBe(true);
			expect(callback).toHaveBeenCalledTimes(1);
		});

		it('should return false for non-focused buttons', () => {
			const callback = vi.fn();
			onButtonPress(eid, callback);

			const result = handleButtonKeyPress(world, eid, 'enter');

			expect(result).toBe(false);
			expect(callback).not.toHaveBeenCalled();
		});

		it('should return false for unhandled keys', () => {
			sendButtonEvent(world, eid, 'focus');
			const result = handleButtonKeyPress(world, eid, 'a');
			expect(result).toBe(false);
		});

		it('should return false for disabled buttons', () => {
			sendButtonEvent(world, eid, 'focus');
			disableButton(world, eid);

			const callback = vi.fn();
			onButtonPress(eid, callback);

			const result = handleButtonKeyPress(world, eid, 'enter');

			expect(result).toBe(false);
			expect(callback).not.toHaveBeenCalled();
		});

		it('should return false for non-buttons', () => {
			const nonButton = addEntity(world);
			const result = handleButtonKeyPress(world, nonButton, 'enter');
			expect(result).toBe(false);
		});
	});

	describe('resetButtonStore', () => {
		it('should reset all button data', () => {
			attachButtonBehavior(world, eid);
			const callback = vi.fn();
			onButtonPress(eid, callback);

			resetButtonStore();

			expect(buttonStore.isButton[eid]).toBe(0);
			expect(buttonStore.machineId[eid]).toBe(0);

			// Callbacks should also be cleared
			pressButton(world, eid);
			expect(callback).not.toHaveBeenCalled();
		});
	});

	describe('complete button interaction flow', () => {
		it('should handle full mouse click flow', () => {
			attachButtonBehavior(world, eid);
			const callback = vi.fn();
			onButtonPress(eid, callback);

			expect(getButtonState(world, eid)).toBe('idle');

			sendButtonEvent(world, eid, 'mouseenter');
			expect(getButtonState(world, eid)).toBe('hovered');

			sendButtonEvent(world, eid, 'mousedown');
			expect(getButtonState(world, eid)).toBe('pressed');

			sendButtonEvent(world, eid, 'mouseup');
			expect(getButtonState(world, eid)).toBe('hovered');
			expect(callback).toHaveBeenCalledTimes(1);

			sendButtonEvent(world, eid, 'mouseleave');
			expect(getButtonState(world, eid)).toBe('idle');
		});

		it('should handle keyboard navigation flow', () => {
			attachButtonBehavior(world, eid);
			const callback = vi.fn();
			onButtonPress(eid, callback);

			expect(getButtonState(world, eid)).toBe('idle');

			sendButtonEvent(world, eid, 'focus');
			expect(getButtonState(world, eid)).toBe('focused');

			handleButtonKeyPress(world, eid, 'enter');
			expect(callback).toHaveBeenCalledTimes(1);

			sendButtonEvent(world, eid, 'blur');
			expect(getButtonState(world, eid)).toBe('idle');
		});

		it('should handle disable/enable flow', () => {
			attachButtonBehavior(world, eid);
			const callback = vi.fn();
			onButtonPress(eid, callback);

			disableButton(world, eid);
			expect(isButtonDisabled(world, eid)).toBe(true);

			// Cannot interact when disabled
			sendButtonEvent(world, eid, 'mouseenter');
			expect(isButtonDisabled(world, eid)).toBe(true);

			pressButton(world, eid);
			expect(callback).not.toHaveBeenCalled();

			enableButton(world, eid);
			expect(getButtonState(world, eid)).toBe('idle');

			// Can interact after enabling
			pressButton(world, eid);
			expect(callback).toHaveBeenCalledTimes(1);
		});
	});
});
