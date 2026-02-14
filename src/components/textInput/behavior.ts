/**
 * TextInput behavior functions.
 * @module components/textInput/behavior
 */

import type { Entity, World } from '../../core/types';
import { markDirty } from '../renderable';
import {
	attachStateMachine,
	getState,
	hasStateMachine,
	isInState,
	sendEvent,
} from '../stateMachine';
import { textInputStore } from './store';
import {
	CursorMode,
	DEFAULT_CENSOR_CHAR,
	DEFAULT_PLACEHOLDER,
	TEXT_INPUT_STATE_MACHINE_CONFIG,
	type TextInputEvent,
	type TextInputState,
	configStore,
} from './types';

/**
 * Attaches text input behavior to an entity.
 * This adds the text input state machine and marks the entity as a text input.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @returns The state machine ID
 *
 * @example
 * ```typescript
 * import { attachTextInputBehavior } from 'blecsd';
 *
 * const textbox = createEntity(world);
 * attachTextInputBehavior(world, textbox);
 * ```
 */
export function attachTextInputBehavior(world: World, eid: Entity): number {
	const machineId = attachStateMachine(world, eid, TEXT_INPUT_STATE_MACHINE_CONFIG);
	textInputStore.isTextInput[eid] = 1;
	textInputStore.machineId[eid] = machineId;
	textInputStore.cursorPos[eid] = 0;
	textInputStore.selectionStart[eid] = -1;
	textInputStore.selectionEnd[eid] = -1;
	textInputStore.inputMode[eid] = 0;
	textInputStore.cursorMode[eid] = CursorMode.Line;
	textInputStore.cursorBlink[eid] = 1; // Blink enabled by default
	textInputStore.cursorBlinkStart[eid] = Date.now();

	// Set default config
	configStore.set(eid, {
		secret: false,
		censor: DEFAULT_CENSOR_CHAR,
		placeholder: DEFAULT_PLACEHOLDER,
		maxLength: 0,
		multiline: false,
	});

	return machineId;
}

/**
 * Checks if an entity has text input behavior attached.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @returns true if the entity is a text input
 *
 * @example
 * ```typescript
 * if (isTextInput(world, entity)) {
 *   handleTextInputKeyPress(world, entity, keyEvent);
 * }
 * ```
 */
export function isTextInput(world: World, eid: Entity): boolean {
	return (textInputStore.isTextInput[eid] ?? 0) === 1 && hasStateMachine(world, eid);
}

/**
 * Gets the current text input state.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @returns Current text input state or undefined if not a text input
 *
 * @example
 * ```typescript
 * const state = getTextInputState(world, textbox);
 * if (state === 'editing') {
 *   // Handle editing state
 * }
 * ```
 */
export function getTextInputState(world: World, eid: Entity): TextInputState | undefined {
	if (!isTextInput(world, eid)) {
		return undefined;
	}
	return getState(world, eid) as TextInputState;
}

/**
 * Sends an event to a text input's state machine.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @param event - TextInput event to send
 * @returns true if a state transition occurred
 *
 * @example
 * ```typescript
 * sendTextInputEvent(world, textbox, 'focus');
 * sendTextInputEvent(world, textbox, 'startEdit');
 * ```
 */
export function sendTextInputEvent(world: World, eid: Entity, event: TextInputEvent): boolean {
	if (!isTextInput(world, eid)) {
		return false;
	}

	const transitioned = sendEvent(world, eid, event);

	if (transitioned) {
		markDirty(world, eid);

		// Update input mode based on state
		const newState = getState(world, eid);
		textInputStore.inputMode[eid] = newState === 'editing' ? 1 : 0;
	}

	return transitioned;
}

/**
 * Checks if a text input is in a specific state.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @param state - State to check
 * @returns true if text input is in the specified state
 *
 * @example
 * ```typescript
 * if (isTextInputInState(world, textbox, 'editing')) {
 *   // Show cursor
 * }
 * ```
 */
export function isTextInputInState(world: World, eid: Entity, state: TextInputState): boolean {
	if (!isTextInput(world, eid)) {
		return false;
	}
	return isInState(world, eid, state);
}

/**
 * Checks if a text input is currently focused.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @returns true if text input is focused
 */
export function isTextInputFocused(world: World, eid: Entity): boolean {
	const state = getTextInputState(world, eid);
	return state === 'focused' || state === 'editing';
}

/**
 * Checks if a text input is currently in editing mode.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @returns true if text input is editing
 */
export function isTextInputEditing(world: World, eid: Entity): boolean {
	return isTextInputInState(world, eid, 'editing');
}

/**
 * Checks if a text input has an error.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @returns true if text input has an error
 */
export function isTextInputError(world: World, eid: Entity): boolean {
	return isTextInputInState(world, eid, 'error');
}

/**
 * Checks if a text input is disabled.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @returns true if text input is disabled
 */
export function isTextInputDisabled(world: World, eid: Entity): boolean {
	return isTextInputInState(world, eid, 'disabled');
}

/**
 * Focuses the text input.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @returns true if focus succeeded
 */
export function focusTextInput(world: World, eid: Entity): boolean {
	return sendTextInputEvent(world, eid, 'focus');
}

/**
 * Blurs (unfocuses) the text input.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @returns true if blur succeeded
 */
export function blurTextInput(world: World, eid: Entity): boolean {
	return sendTextInputEvent(world, eid, 'blur');
}

/**
 * Starts editing the text input.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @returns true if edit started
 */
export function startEditingTextInput(world: World, eid: Entity): boolean {
	return sendTextInputEvent(world, eid, 'startEdit');
}

/**
 * Ends editing the text input.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @returns true if edit ended
 */
export function endEditingTextInput(world: World, eid: Entity): boolean {
	return sendTextInputEvent(world, eid, 'endEdit');
}

/**
 * Disables the text input.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @returns true if disabled
 */
export function disableTextInput(world: World, eid: Entity): boolean {
	return sendTextInputEvent(world, eid, 'disable');
}

/**
 * Enables a disabled text input.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @returns true if enabled
 */
export function enableTextInput(world: World, eid: Entity): boolean {
	return sendTextInputEvent(world, eid, 'enable');
}

/**
 * Sets an error state on the text input.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @returns true if error set
 */
export function setTextInputError(world: World, eid: Entity): boolean {
	return sendTextInputEvent(world, eid, 'error');
}

/**
 * Clears the error state on the text input.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @returns true if error cleared
 */
export function clearTextInputError(world: World, eid: Entity): boolean {
	return sendTextInputEvent(world, eid, 'clearError');
}
