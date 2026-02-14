/**
 * TextInput component and helper functions.
 * Provides state machine support and text input operations.
 * @module components/textInput
 */

// Re-export behavior functions
export {
	attachTextInputBehavior,
	blurTextInput,
	clearTextInputError,
	disableTextInput,
	enableTextInput,
	endEditingTextInput,
	focusTextInput,
	getTextInputState,
	isTextInput,
	isTextInputDisabled,
	isTextInputEditing,
	isTextInputError,
	isTextInputFocused,
	isTextInputInState,
	sendTextInputEvent,
	setTextInputError,
	startEditingTextInput,
} from './behavior';
// Re-export callback functions
export {
	clearTextInputCallbacks,
	emitCancel,
	emitSubmit,
	emitValueChange,
	onTextInputCancel,
	onTextInputChange,
	onTextInputSubmit,
} from './callbacks';
// Re-export config functions
export {
	getCensorChar,
	getMaxLength,
	getPlaceholder,
	getTextInputConfig,
	isMultiline,
	isSecretMode,
	maskValue,
	setTextInputConfig,
} from './config';
// Re-export cursor functions
export {
	clearSelection,
	getCursorChar,
	getCursorConfig,
	getCursorMode,
	getCursorPos,
	getSelection,
	hasSelection,
	isCursorBlinkEnabled,
	moveCursor,
	resetCursorBlink,
	setCursorBlinkEnabled,
	setCursorConfig,
	setCursorMode,
	setCursorPos,
	setSelection,
	toggleCursorMode,
} from './cursor';
// Re-export keyboard handling
export { handleTextInputKeyPress } from './keyboard';

// Re-export rendering functions
export { getCursorDisplayText, getNormalizedSelection, isCursorVisible } from './rendering';
// Re-export store
export { resetTextInputStore, textInputStore } from './store';
// Re-export types and constants
export type {
	CursorConfig,
	CursorConfigOptions,
	CursorModeType,
	TextInputAction,
	TextInputConfig,
	TextInputConfigOptions,
	TextInputEvent,
	TextInputState,
	TextInputStore,
	ValidationFunction,
	ValidationTiming,
} from './types';
export {
	CursorMode,
	DEFAULT_CAPACITY,
	DEFAULT_CENSOR_CHAR,
	DEFAULT_CURSOR_BLINK_MS,
	DEFAULT_CURSOR_BLOCK_CHAR,
	DEFAULT_CURSOR_LINE_CHAR,
	DEFAULT_PLACEHOLDER,
	TEXT_INPUT_STATE_MACHINE_CONFIG,
} from './types';
// Re-export validation functions
export {
	clearValidationError,
	getValidationError,
	hasValidationError,
	validateTextInput,
} from './validation';
