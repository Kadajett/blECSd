/**
 * TextInput store creation and management.
 * @module components/textInput/store
 */

import {
	cancelCallbacks,
	configStore,
	cursorConfigStore,
	DEFAULT_CAPACITY,
	submitCallbacks,
	type TextInputStore,
	validationErrors,
	valueChangeCallbacks,
} from './types';

/**
 * Create a text input store with the specified capacity.
 */
function createTextInputStore(capacity = DEFAULT_CAPACITY): TextInputStore {
	return {
		isTextInput: new Uint8Array(capacity),
		machineId: new Uint32Array(capacity),
		cursorPos: new Uint32Array(capacity),
		selectionStart: new Int32Array(capacity).fill(-1),
		selectionEnd: new Int32Array(capacity).fill(-1),
		inputMode: new Uint8Array(capacity),
		cursorMode: new Uint8Array(capacity),
		cursorBlink: new Uint8Array(capacity).fill(1), // Blink enabled by default
		cursorBlinkStart: new Float64Array(capacity),
	};
}

/**
 * Global text input store.
 */
export const textInputStore = createTextInputStore();

/**
 * Resets the text input store. Useful for testing.
 */
export function resetTextInputStore(): void {
	textInputStore.isTextInput.fill(0);
	textInputStore.machineId.fill(0);
	textInputStore.cursorPos.fill(0);
	textInputStore.selectionStart.fill(-1);
	textInputStore.selectionEnd.fill(-1);
	textInputStore.inputMode.fill(0);
	textInputStore.cursorMode.fill(0);
	textInputStore.cursorBlink.fill(1);
	textInputStore.cursorBlinkStart.fill(0);
	configStore.clear();
	valueChangeCallbacks.clear();
	submitCallbacks.clear();
	cancelCallbacks.clear();
	cursorConfigStore.clear();
	validationErrors.clear();
}
