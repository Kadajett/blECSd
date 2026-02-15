/**
 * Button component and helper functions.
 * Provides state machine support and button-specific operations.
 * @module components/button
 */

import type { StateMachineConfig } from '../core/stateMachine';
import type { Entity, World } from '../core/types';
import { markDirty } from './renderable';
import {
	attachStateMachine,
	getState,
	hasStateMachine,
	isInState,
	sendEvent,
} from './stateMachine';

/**
 * Button states.
 */
export type ButtonState = 'idle' | 'hovered' | 'pressed' | 'focused' | 'disabled';

/**
 * Button events that can trigger state transitions.
 */
export type ButtonEvent =
	| 'mouseenter'
	| 'mouseleave'
	| 'mousedown'
	| 'mouseup'
	| 'focus'
	| 'blur'
	| 'disable'
	| 'enable';

/**
 * Button state machine configuration.
 *
 * State transitions:
 * - idle: can become hovered (mouseenter), focused (focus), disabled (disable)
 * - hovered: can become pressed (mousedown), idle (mouseleave), disabled (disable)
 * - pressed: can become hovered (mouseup), idle (mouseleave)
 * - focused: can become idle (blur), hovered (mouseenter), disabled (disable)
 * - disabled: can become idle (enable)
 */
export const BUTTON_STATE_MACHINE_CONFIG: StateMachineConfig<ButtonState, ButtonEvent, void> = {
	initial: 'idle',
	states: {
		idle: {
			on: {
				mouseenter: 'hovered',
				focus: 'focused',
				disable: 'disabled',
			},
		},
		hovered: {
			on: {
				mousedown: 'pressed',
				mouseleave: 'idle',
				focus: 'focused',
				disable: 'disabled',
			},
		},
		pressed: {
			on: {
				mouseup: 'hovered',
				mouseleave: 'idle',
			},
		},
		focused: {
			on: {
				blur: 'idle',
				mouseenter: 'hovered',
				disable: 'disabled',
			},
		},
		disabled: {
			on: {
				enable: 'idle',
			},
		},
	},
};

/** Default capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

/**
 * Button component store for tracking press callbacks.
 * Uses entity ID as index.
 */
export interface ButtonStore {
	/** Whether entity is a button (1 = true, 0 = false) */
	isButton: Uint8Array;
	/** Button state machine ID */
	machineId: Uint32Array;
}

/**
 * Create a button store with the specified capacity.
 */
function createButtonStore(capacity = DEFAULT_CAPACITY): ButtonStore {
	return {
		isButton: new Uint8Array(capacity),
		machineId: new Uint32Array(capacity),
	};
}

/**
 * Global button store.
 */
export const buttonStore = createButtonStore();

/**
 * Store for button press callbacks.
 * Maps entity ID to callback functions.
 */
const pressCallbacks = new Map<Entity, Array<() => void>>();

/**
 * Resets the button store. Useful for testing.
 */
export function resetButtonStore(): void {
	buttonStore.isButton.fill(0);
	buttonStore.machineId.fill(0);
	pressCallbacks.clear();
}

// =============================================================================
// Button Functions
// =============================================================================

/**
 * Attaches button behavior to an entity.
 * This adds the button state machine and marks the entity as a button.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @returns The state machine ID
 *
 * @example
 * ```typescript
 * import { createButtonEntity, attachButtonBehavior } from 'blecsd';
 *
 * const button = createButtonEntity(world, { label: 'Click me' });
 * attachButtonBehavior(world, button);
 *
 * // Now the button responds to state machine events
 * sendButtonEvent(world, button, 'mouseenter'); // -> hovered state
 * ```
 */
export function attachButtonBehavior(world: World, eid: Entity): number {
	const machineId = attachStateMachine(world, eid, BUTTON_STATE_MACHINE_CONFIG);
	buttonStore.isButton[eid] = 1;
	buttonStore.machineId[eid] = machineId;
	return machineId;
}

/**
 * Checks if an entity has button behavior attached.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @returns true if the entity is a button
 *
 * @example
 * ```typescript
 * if (isButton(world, clickedEntity)) {
 *   sendButtonEvent(world, clickedEntity, 'mousedown');
 * }
 * ```
 */
export function isButton(world: World, eid: Entity): boolean {
	return (buttonStore.isButton[eid] ?? 0) === 1 && hasStateMachine(world, eid);
}

/**
 * Gets the current button state.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @returns Current button state or undefined if not a button
 *
 * @example
 * ```typescript
 * const state = getButtonState(world, button);
 * if (state === 'pressed') {
 *   // Handle pressed state
 * }
 * ```
 */
export function getButtonState(world: World, eid: Entity): ButtonState | undefined {
	if (!isButton(world, eid)) {
		return undefined;
	}
	return getState(world, eid) as ButtonState;
}

/**
 * Sends an event to a button's state machine.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @param event - Button event to send
 * @returns true if a state transition occurred
 *
 * @example
 * ```typescript
 * // Simulate mouse hover
 * sendButtonEvent(world, button, 'mouseenter');
 *
 * // Simulate click
 * sendButtonEvent(world, button, 'mousedown');
 * sendButtonEvent(world, button, 'mouseup'); // This triggers press
 * ```
 */
export function sendButtonEvent(world: World, eid: Entity, event: ButtonEvent): boolean {
	if (!isButton(world, eid)) {
		return false;
	}

	const previousState = getState(world, eid);
	const transitioned = sendEvent(world, eid, event);

	if (transitioned) {
		markDirty(world, eid);

		// Emit press event when transitioning from pressed to hovered (mouseup)
		if (previousState === 'pressed' && event === 'mouseup') {
			emitPress(eid);
		}
	}

	return transitioned;
}

/**
 * Checks if a button is in a specific state.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @param state - State to check
 * @returns true if button is in the specified state
 *
 * @example
 * ```typescript
 * if (isButtonInState(world, button, 'hovered')) {
 *   // Show tooltip
 * }
 * ```
 */
export function isButtonInState(world: World, eid: Entity, state: ButtonState): boolean {
	if (!isButton(world, eid)) {
		return false;
	}
	return isInState(world, eid, state);
}

/**
 * Checks if a button is currently hovered.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @returns true if button is hovered
 *
 * @example
 * ```typescript
 * if (isButtonHovered(world, button)) {
 *   setStyle(world, button, { bg: hoverColor });
 * }
 * ```
 */
export function isButtonHovered(world: World, eid: Entity): boolean {
	return isButtonInState(world, eid, 'hovered');
}

/**
 * Checks if a button is currently pressed.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @returns true if button is pressed
 *
 * @example
 * ```typescript
 * if (isButtonPressed(world, button)) {
 *   setStyle(world, button, { bg: pressedColor });
 * }
 * ```
 */
export function isButtonPressed(world: World, eid: Entity): boolean {
	return isButtonInState(world, eid, 'pressed');
}

/**
 * Checks if a button is currently focused.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @returns true if button is focused
 *
 * @example
 * ```typescript
 * if (isButtonFocused(world, button)) {
 *   // Draw focus ring
 * }
 * ```
 */
export function isButtonFocused(world: World, eid: Entity): boolean {
	return isButtonInState(world, eid, 'focused');
}

/**
 * Checks if a button is currently disabled.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @returns true if button is disabled
 *
 * @example
 * ```typescript
 * if (isButtonDisabled(world, submitButton)) {
 *   setStyle(world, submitButton, { fg: grayColor });
 * }
 * ```
 */
export function isButtonDisabled(world: World, eid: Entity): boolean {
	return isButtonInState(world, eid, 'disabled');
}

/**
 * Disables a button.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @returns true if the button was disabled
 *
 * @example
 * ```typescript
 * // Disable submit button while form is incomplete
 * if (!formValid) {
 *   disableButton(world, submitButton);
 * }
 * ```
 */
export function disableButton(world: World, eid: Entity): boolean {
	return sendButtonEvent(world, eid, 'disable');
}

/**
 * Enables a disabled button.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @returns true if the button was enabled
 *
 * @example
 * ```typescript
 * // Enable submit button when form is complete
 * if (formValid) {
 *   enableButton(world, submitButton);
 * }
 * ```
 */
export function enableButton(world: World, eid: Entity): boolean {
	return sendButtonEvent(world, eid, 'enable');
}

// =============================================================================
// Press Event Handling
// =============================================================================

/**
 * Registers a callback to be called when the button is pressed.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @param callback - Function to call on press
 * @returns Unsubscribe function
 *
 * @example
 * ```typescript
 * const unsubscribe = onButtonPress(world, button, () => {
 *   console.log('Button was pressed!');
 * });
 *
 * // Later, to stop listening:
 * unsubscribe();
 * ```
 */
export function onButtonPress(_world: World, eid: Entity, callback: () => void): () => void {
	let callbacks = pressCallbacks.get(eid);
	if (!callbacks) {
		callbacks = [];
		pressCallbacks.set(eid, callbacks);
	}
	callbacks.push(callback);

	return () => {
		const cbs = pressCallbacks.get(eid);
		if (cbs) {
			const index = cbs.indexOf(callback);
			if (index !== -1) {
				cbs.splice(index, 1);
			}
		}
	};
}

/**
 * Emits a press event for a button, calling all registered callbacks.
 *
 * @param eid - Entity ID
 */
function emitPress(eid: Entity): void {
	const callbacks = pressCallbacks.get(eid);
	if (callbacks) {
		for (const callback of callbacks) {
			callback();
		}
	}
}

/**
 * Programmatically triggers a button press.
 * This directly fires the press event without simulating mouse state changes.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @returns true if the press was triggered
 *
 * @example
 * ```typescript
 * // Programmatically press a button
 * pressButton(world, button);
 * ```
 */
export function pressButton(world: World, eid: Entity): boolean {
	if (!isButton(world, eid)) {
		return false;
	}

	const state = getButtonState(world, eid);
	if (state === 'disabled') {
		return false;
	}

	// Directly emit press event
	emitPress(eid);

	return true;
}

/**
 * Removes all press callbacks for a button.
 * Call this when destroying a button entity.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 *
 * @example
 * ```typescript
 * // Clean up before removing entity
 * clearButtonCallbacks(world, buttonEntity);
 * removeEntity(world, buttonEntity);
 * ```
 */
export function clearButtonCallbacks(_world: World, eid: Entity): void {
	pressCallbacks.delete(eid);
}

// =============================================================================
// Keyboard Handling
// =============================================================================

/**
 * Handles a key press on a focused button.
 * Enter and Space keys trigger the button press.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @param keyName - Name of the key pressed
 * @returns true if the key was handled
 *
 * @example
 * ```typescript
 * // In your input handler:
 * if (isButtonFocused(world, button)) {
 *   handleButtonKeyPress(world, button, keyEvent.name);
 * }
 * ```
 */
export function handleButtonKeyPress(world: World, eid: Entity, keyName: string): boolean {
	if (!isButton(world, eid)) {
		return false;
	}

	const state = getButtonState(world, eid);
	if (state === 'disabled') {
		return false;
	}

	// Only handle keys when button is focused
	if (state !== 'focused') {
		return false;
	}

	// Enter or Space triggers press
	if (keyName === 'return' || keyName === 'enter' || keyName === 'space') {
		pressButton(world, eid);
		return true;
	}

	return false;
}
