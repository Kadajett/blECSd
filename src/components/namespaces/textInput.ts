/**
 * TextInput component namespace.
 *
 * Provides all operations for text input fields, cursor management, and selection.
 *
 * @example
 * ```typescript
 * import { textInput } from 'blecsd/components';
 * textInput.attach(world, eid, config);
 * textInput.focus(world, eid);
 * textInput.cursor.set(world, eid, 5);
 * ```
 */
import {
	attachTextInputBehavior,
	blurTextInput,
	clearSelection,
	clearTextInputCallbacks,
	clearTextInputError,
	disableTextInput,
	emitCancel,
	emitSubmit,
	emitValueChange,
	enableTextInput,
	endEditingTextInput,
	focusTextInput,
	getCensorChar,
	getCursorChar,
	getCursorConfig,
	getCursorDisplayText,
	getCursorMode,
	getCursorPos,
	getMaxLength,
	getNormalizedSelection,
	getPlaceholder,
	getSelection,
	getTextInputConfig,
	getTextInputState,
	handleTextInputKeyPress,
	hasSelection,
	isCursorBlinkEnabled,
	isCursorVisible,
	isMultiline,
	isSecretMode,
	isTextInput,
	isTextInputDisabled,
	isTextInputEditing,
	isTextInputError,
	isTextInputFocused,
	isTextInputInState,
	maskValue,
	moveCursor,
	onTextInputCancel,
	onTextInputChange,
	onTextInputSubmit,
	resetCursorBlink,
	sendTextInputEvent,
	setCursorBlinkEnabled,
	setCursorConfig,
	setCursorMode,
	setCursorPos,
	setSelection,
	setTextInputConfig,
	setTextInputError,
	startEditingTextInput,
	toggleCursorMode,
} from '../textInput';

export const textInput = Object.freeze({
	attach: attachTextInputBehavior,
	is: isTextInput,
	getState: getTextInputState,
	isInState: isTextInputInState,
	sendEvent: sendTextInputEvent,
	handleKeyPress: handleTextInputKeyPress,

	focus: focusTextInput,
	blur: blurTextInput,
	isFocused: isTextInputFocused,
	isEditing: isTextInputEditing,
	startEditing: startEditingTextInput,
	endEditing: endEditingTextInput,

	enable: enableTextInput,
	disable: disableTextInput,
	isDisabled: isTextInputDisabled,

	isError: isTextInputError,
	setError: setTextInputError,
	clearError: clearTextInputError,

	getConfig: getTextInputConfig,
	setConfig: setTextInputConfig,
	isMultiline,
	isSecretMode,
	getPlaceholder,
	getMaxLength,
	getCensorChar,
	maskValue,

	cursor: Object.freeze({
		get: getCursorPos,
		set: setCursorPos,
		move: moveCursor,
		getChar: getCursorChar,
		getDisplayText: getCursorDisplayText,
		getConfig: getCursorConfig,
		setConfig: setCursorConfig,
		getMode: getCursorMode,
		setMode: setCursorMode,
		toggleMode: toggleCursorMode,
		isVisible: isCursorVisible,
		isBlinkEnabled: isCursorBlinkEnabled,
		setBlinkEnabled: setCursorBlinkEnabled,
		resetBlink: resetCursorBlink,
	}),

	selection: Object.freeze({
		get: getSelection,
		set: setSelection,
		clear: clearSelection,
		has: hasSelection,
		getNormalized: getNormalizedSelection,
	}),

	callbacks: Object.freeze({
		onChange: onTextInputChange,
		onSubmit: onTextInputSubmit,
		onCancel: onTextInputCancel,
		clear: clearTextInputCallbacks,
		emitChange: emitValueChange,
		emitSubmit,
		emitCancel,
	}),
});

export type TextInputModule = typeof textInput;
