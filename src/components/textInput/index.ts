/**
 * TextInput component and helper functions.
 * Provides state machine support and text input operations.
 * @module components/textInput
 */

// Re-export types and constants
export type {
	TextInputState,
	TextInputEvent,
	TextInputStore,
	ValidationFunction,
	ValidationTiming,
	TextInputConfig,
	CursorConfig,
	CursorConfigOptions,
	TextInputConfigOptions,
	TextInputAction,
	CursorModeType,
} from './types';

export {
	TEXT_INPUT_STATE_MACHINE_CONFIG,
	DEFAULT_CAPACITY,
	CursorMode,
	DEFAULT_CURSOR_BLINK_MS,
	DEFAULT_CENSOR_CHAR,
	DEFAULT_PLACEHOLDER,
	DEFAULT_CURSOR_LINE_CHAR,
	DEFAULT_CURSOR_BLOCK_CHAR,
} from './types';

// Re-export store
export { textInputStore, resetTextInputStore } from './store';

// Re-export behavior functions
export {
	attachTextInputBehavior,
	isTextInput,
	getTextInputState,
	sendTextInputEvent,
	isTextInputInState,
	isTextInputFocused,
	isTextInputEditing,
	isTextInputError,
	isTextInputDisabled,
	focusTextInput,
	blurTextInput,
	startEditingTextInput,
	endEditingTextInput,
	disableTextInput,
	enableTextInput,
	setTextInputError,
	clearTextInputError,
} from './behavior';

// Re-export cursor functions
export {
	getCursorPos,
	setCursorPos,
	moveCursor,
	getSelection,
	setSelection,
	clearSelection,
	hasSelection,
	getCursorConfig,
	setCursorConfig,
	getCursorMode,
	setCursorMode,
	toggleCursorMode,
	isCursorBlinkEnabled,
	setCursorBlinkEnabled,
	resetCursorBlink,
	getCursorChar,
} from './cursor';

// Re-export rendering functions
export { isCursorVisible, getCursorDisplayText, getNormalizedSelection } from './rendering';

// Re-export config functions
export {
	setTextInputConfig,
	getTextInputConfig,
	isSecretMode,
	getCensorChar,
	getPlaceholder,
	getMaxLength,
	isMultiline,
	maskValue,
} from './config';

// Re-export callback functions
export {
	onTextInputChange,
	onTextInputSubmit,
	onTextInputCancel,
	emitValueChange,
	emitSubmit,
	emitCancel,
	clearTextInputCallbacks,
} from './callbacks';

// Re-export validation functions
export {
	validateTextInput,
	getValidationError,
	hasValidationError,
	clearValidationError,
} from './validation';

// Re-export keyboard handling
export { handleTextInputKeyPress } from './keyboard';
