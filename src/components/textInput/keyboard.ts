/**
 * TextInput keyboard handling.
 * @module components/textInput/keyboard
 */

import type { Entity, World } from '../../core/types';
import { focusTextInput, getTextInputState, isTextInput } from './behavior';
import { getTextInputConfig } from './config';
import { getCursorPos } from './cursor';
import type { TextInputAction, TextInputConfig } from './types';

/** Handle enter key for text input */
function handleEnterKey(
	config: TextInputConfig,
	cursorPos: number,
	currentValue: string,
): TextInputAction | null {
	if (config.multiline) {
		if (config.maxLength > 0 && currentValue.length >= config.maxLength) return null;
		return { type: 'newline', position: cursorPos };
	}
	return { type: 'submit', value: currentValue };
}

/** Handle escape key for text input */
function handleEscapeKey(config: TextInputConfig, currentValue: string): TextInputAction {
	if (config.multiline) return { type: 'submit', value: currentValue };
	return { type: 'cancel' };
}

/** Handle navigation keys (left, right, home, end) */
function handleNavigationKey(
	keyName: string,
	cursorPos: number,
	valueLength: number,
): TextInputAction | null {
	if (keyName === 'left' && cursorPos > 0) {
		return { type: 'moveCursor', position: cursorPos - 1 };
	}
	if (keyName === 'right' && cursorPos < valueLength) {
		return { type: 'moveCursor', position: cursorPos + 1 };
	}
	if (keyName === 'home' && cursorPos !== 0) {
		return { type: 'moveCursor', position: 0 };
	}
	if (keyName === 'end' && cursorPos !== valueLength) {
		return { type: 'moveCursor', position: valueLength };
	}
	return null;
}

/** Handle delete keys (backspace, delete) */
function handleDeleteKey(
	keyName: string,
	cursorPos: number,
	valueLength: number,
): TextInputAction | null {
	if (keyName === 'backspace' && cursorPos > 0) {
		return { type: 'delete', start: cursorPos - 1, end: cursorPos };
	}
	if (keyName === 'delete' && cursorPos < valueLength) {
		return { type: 'delete', start: cursorPos, end: cursorPos + 1 };
	}
	return null;
}

/** Handle word-level operations (Ctrl+Left/Right/Backspace/Delete) */
function handleWordOperation(
	keyName: string,
	cursorPos: number,
	currentValue: string,
): TextInputAction | null {
	// Word navigation requires position/offset conversion utilities from textEditing
	// These operations work on linear offsets, not line/column positions
	if (keyName === 'left') {
		return { type: 'moveWordLeft', text: currentValue, position: cursorPos };
	}
	if (keyName === 'right') {
		return { type: 'moveWordRight', text: currentValue, position: cursorPos };
	}
	if (keyName === 'backspace') {
		return { type: 'deleteWordBackward', text: currentValue, position: cursorPos };
	}
	if (keyName === 'delete') {
		return { type: 'deleteWordForward', text: currentValue, position: cursorPos };
	}
	return null;
}

/** Handle printable character insertion */
function handleCharacterInsert(
	keyName: string,
	cursorPos: number,
	config: TextInputConfig,
	valueLength: number,
): TextInputAction | null {
	if (keyName.length !== 1) return null;
	if (config.maxLength > 0 && valueLength >= config.maxLength) return null;
	return { type: 'insert', char: keyName, position: cursorPos };
}

/**
 * Handles a key press on a text input.
 * Returns information about what action to take.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @param keyName - Name of the key pressed
 * @param currentValue - Current text value
 * @param ctrl - Whether Ctrl key is pressed (default: false)
 * @returns Action to take or null if not handled
 *
 * @example
 * ```typescript
 * const action = handleTextInputKeyPress(world, textbox, 'a', currentValue);
 * if (action) {
 *   if (action.type === 'insert') {
 *     // Insert action.char at cursor position
 *   }
 * }
 * ```
 */
export function handleTextInputKeyPress(
	world: World,
	eid: Entity,
	keyName: string,
	currentValue: string,
	ctrl = false,
): TextInputAction | null {
	if (!isTextInput(world, eid)) return null;

	const state = getTextInputState(world, eid);
	if (state === 'disabled') return null;

	if (state === 'idle') {
		focusTextInput(world, eid);
		return null;
	}

	const cursorPos = getCursorPos(world, eid);
	const config = getTextInputConfig(world, eid);
	const valueLength = currentValue.length;

	// Handle special keys
	if (keyName === 'return' || keyName === 'enter') {
		return handleEnterKey(config, cursorPos, currentValue);
	}
	if (keyName === 'escape') {
		return handleEscapeKey(config, currentValue);
	}

	// Handle word-level operations (Ctrl modifier)
	if (ctrl) {
		const wordAction = handleWordOperation(keyName, cursorPos, currentValue);
		if (wordAction) return wordAction;
	}

	// Handle delete keys
	const deleteAction = handleDeleteKey(keyName, cursorPos, valueLength);
	if (deleteAction) return deleteAction;

	// Handle navigation keys
	const navAction = handleNavigationKey(keyName, cursorPos, valueLength);
	if (navAction) return navAction;

	// Handle character insertion
	return handleCharacterInsert(keyName, cursorPos, config, valueLength);
}
