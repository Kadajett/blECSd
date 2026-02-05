import { beforeEach, describe, expect, it, vi } from 'vitest';
import { addEntity } from '../core/ecs';
import type { World } from '../core/types';
import { createWorld } from '../core/world';
import { StateMachineStore } from './stateMachine';
import {
	attachTextInputBehavior,
	blurTextInput,
	CursorMode,
	clearSelection,
	clearTextInputCallbacks,
	clearTextInputError,
	DEFAULT_CENSOR_CHAR,
	DEFAULT_CURSOR_BLINK_MS,
	DEFAULT_CURSOR_BLOCK_CHAR,
	DEFAULT_CURSOR_LINE_CHAR,
	DEFAULT_PLACEHOLDER,
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
	isSecretMode,
	isTextInput,
	isTextInputDisabled,
	isTextInputEditing,
	isTextInputError,
	isTextInputFocused,
	maskValue,
	moveCursor,
	onTextInputCancel,
	onTextInputChange,
	onTextInputSubmit,
	resetCursorBlink,
	resetTextInputStore,
	setCursorBlinkEnabled,
	setCursorConfig,
	setCursorMode,
	setCursorPos,
	setSelection,
	setTextInputConfig,
	setTextInputError,
	startEditingTextInput,
	TEXT_INPUT_STATE_MACHINE_CONFIG,
	textInputStore,
	toggleCursorMode,
} from './textInput';

describe('TextInput Component', () => {
	let world: World;
	let eid: number;

	beforeEach(() => {
		world = createWorld();
		eid = addEntity(world);
		StateMachineStore.clear();
		resetTextInputStore();
	});

	describe('TEXT_INPUT_STATE_MACHINE_CONFIG', () => {
		it('should have idle as initial state', () => {
			expect(TEXT_INPUT_STATE_MACHINE_CONFIG.initial).toBe('idle');
		});

		it('should have all expected states', () => {
			const states = Object.keys(TEXT_INPUT_STATE_MACHINE_CONFIG.states);
			expect(states).toContain('idle');
			expect(states).toContain('focused');
			expect(states).toContain('editing');
			expect(states).toContain('error');
			expect(states).toContain('disabled');
		});

		it('should have correct transitions from idle', () => {
			const idleState = TEXT_INPUT_STATE_MACHINE_CONFIG.states.idle;
			expect(idleState.on?.focus).toBe('focused');
			expect(idleState.on?.disable).toBe('disabled');
		});

		it('should have correct transitions from focused', () => {
			const focusedState = TEXT_INPUT_STATE_MACHINE_CONFIG.states.focused;
			expect(focusedState.on?.startEdit).toBe('editing');
			expect(focusedState.on?.blur).toBe('idle');
			expect(focusedState.on?.error).toBe('error');
			expect(focusedState.on?.disable).toBe('disabled');
		});

		it('should have correct transitions from editing', () => {
			const editingState = TEXT_INPUT_STATE_MACHINE_CONFIG.states.editing;
			expect(editingState.on?.endEdit).toBe('focused');
			expect(editingState.on?.blur).toBe('idle');
			expect(editingState.on?.error).toBe('error');
		});
	});

	describe('attachTextInputBehavior', () => {
		it('should attach state machine to entity', () => {
			const machineId = attachTextInputBehavior(world, eid);
			expect(machineId).toBeGreaterThan(0);
		});

		it('should mark entity as text input', () => {
			attachTextInputBehavior(world, eid);
			expect(textInputStore.isTextInput[eid]).toBe(1);
		});

		it('should initialize cursor position to 0', () => {
			attachTextInputBehavior(world, eid);
			expect(textInputStore.cursorPos[eid]).toBe(0);
		});

		it('should initialize selection to -1 (no selection)', () => {
			attachTextInputBehavior(world, eid);
			expect(textInputStore.selectionStart[eid]).toBe(-1);
			expect(textInputStore.selectionEnd[eid]).toBe(-1);
		});

		it('should start in idle state', () => {
			attachTextInputBehavior(world, eid);
			expect(getTextInputState(world, eid)).toBe('idle');
		});
	});

	describe('isTextInput', () => {
		it('should return true for text input entities', () => {
			attachTextInputBehavior(world, eid);
			expect(isTextInput(world, eid)).toBe(true);
		});

		it('should return false for non-text-input entities', () => {
			expect(isTextInput(world, eid)).toBe(false);
		});
	});

	describe('state transitions', () => {
		beforeEach(() => {
			attachTextInputBehavior(world, eid);
		});

		it('should transition from idle to focused', () => {
			expect(focusTextInput(world, eid)).toBe(true);
			expect(getTextInputState(world, eid)).toBe('focused');
		});

		it('should transition from focused to editing', () => {
			focusTextInput(world, eid);
			expect(startEditingTextInput(world, eid)).toBe(true);
			expect(getTextInputState(world, eid)).toBe('editing');
		});

		it('should transition from editing to focused', () => {
			focusTextInput(world, eid);
			startEditingTextInput(world, eid);
			expect(endEditingTextInput(world, eid)).toBe(true);
			expect(getTextInputState(world, eid)).toBe('focused');
		});

		it('should transition from focused to idle on blur', () => {
			focusTextInput(world, eid);
			expect(blurTextInput(world, eid)).toBe(true);
			expect(getTextInputState(world, eid)).toBe('idle');
		});

		it('should transition to error state', () => {
			focusTextInput(world, eid);
			expect(setTextInputError(world, eid)).toBe(true);
			expect(getTextInputState(world, eid)).toBe('error');
		});

		it('should transition from error to focused', () => {
			focusTextInput(world, eid);
			setTextInputError(world, eid);
			expect(clearTextInputError(world, eid)).toBe(true);
			expect(getTextInputState(world, eid)).toBe('focused');
		});

		it('should transition to disabled state', () => {
			expect(disableTextInput(world, eid)).toBe(true);
			expect(getTextInputState(world, eid)).toBe('disabled');
		});

		it('should transition from disabled to idle', () => {
			disableTextInput(world, eid);
			expect(enableTextInput(world, eid)).toBe(true);
			expect(getTextInputState(world, eid)).toBe('idle');
		});
	});

	describe('state check functions', () => {
		beforeEach(() => {
			attachTextInputBehavior(world, eid);
		});

		describe('isTextInputFocused', () => {
			it('should return true when focused', () => {
				focusTextInput(world, eid);
				expect(isTextInputFocused(world, eid)).toBe(true);
			});

			it('should return true when editing', () => {
				focusTextInput(world, eid);
				startEditingTextInput(world, eid);
				expect(isTextInputFocused(world, eid)).toBe(true);
			});

			it('should return false when idle', () => {
				expect(isTextInputFocused(world, eid)).toBe(false);
			});
		});

		describe('isTextInputEditing', () => {
			it('should return true when editing', () => {
				focusTextInput(world, eid);
				startEditingTextInput(world, eid);
				expect(isTextInputEditing(world, eid)).toBe(true);
			});

			it('should return false when focused', () => {
				focusTextInput(world, eid);
				expect(isTextInputEditing(world, eid)).toBe(false);
			});
		});

		describe('isTextInputError', () => {
			it('should return true when in error state', () => {
				focusTextInput(world, eid);
				setTextInputError(world, eid);
				expect(isTextInputError(world, eid)).toBe(true);
			});

			it('should return false when not in error state', () => {
				focusTextInput(world, eid);
				expect(isTextInputError(world, eid)).toBe(false);
			});
		});

		describe('isTextInputDisabled', () => {
			it('should return true when disabled', () => {
				disableTextInput(world, eid);
				expect(isTextInputDisabled(world, eid)).toBe(true);
			});

			it('should return false when not disabled', () => {
				expect(isTextInputDisabled(world, eid)).toBe(false);
			});
		});
	});

	describe('cursor management', () => {
		beforeEach(() => {
			attachTextInputBehavior(world, eid);
		});

		it('should get cursor position', () => {
			expect(getCursorPos(eid)).toBe(0);
		});

		it('should set cursor position', () => {
			setCursorPos(world, eid, 5);
			expect(getCursorPos(eid)).toBe(5);
		});

		it('should not set negative cursor position', () => {
			setCursorPos(world, eid, -1);
			expect(getCursorPos(eid)).toBe(0);
		});

		it('should move cursor by delta', () => {
			setCursorPos(world, eid, 5);
			moveCursor(world, eid, 3);
			expect(getCursorPos(eid)).toBe(8);
		});

		it('should move cursor left', () => {
			setCursorPos(world, eid, 5);
			moveCursor(world, eid, -2);
			expect(getCursorPos(eid)).toBe(3);
		});
	});

	describe('selection management', () => {
		beforeEach(() => {
			attachTextInputBehavior(world, eid);
		});

		it('should return null when no selection', () => {
			expect(getSelection(eid)).toBeNull();
		});

		it('should set and get selection', () => {
			setSelection(world, eid, 2, 5);
			expect(getSelection(eid)).toEqual([2, 5]);
		});

		it('should clear selection', () => {
			setSelection(world, eid, 2, 5);
			clearSelection(world, eid);
			expect(getSelection(eid)).toBeNull();
		});

		it('should check if has selection', () => {
			expect(hasSelection(eid)).toBe(false);
			setSelection(world, eid, 0, 3);
			expect(hasSelection(eid)).toBe(true);
		});
	});

	describe('configuration', () => {
		beforeEach(() => {
			attachTextInputBehavior(world, eid);
		});

		it('should have default configuration', () => {
			const config = getTextInputConfig(eid);
			expect(config.secret).toBe(false);
			expect(config.censor).toBe(DEFAULT_CENSOR_CHAR);
			expect(config.placeholder).toBe(DEFAULT_PLACEHOLDER);
			expect(config.maxLength).toBe(0);
		});

		it('should set secret mode', () => {
			setTextInputConfig(eid, { secret: true });
			expect(isSecretMode(eid)).toBe(true);
		});

		it('should set censor character', () => {
			setTextInputConfig(eid, { censor: '#' });
			expect(getCensorChar(eid)).toBe('#');
		});

		it('should set placeholder', () => {
			setTextInputConfig(eid, { placeholder: 'Enter text...' });
			expect(getPlaceholder(eid)).toBe('Enter text...');
		});

		it('should set max length', () => {
			setTextInputConfig(eid, { maxLength: 50 });
			expect(getMaxLength(eid)).toBe(50);
		});

		it('should preserve other config when updating one', () => {
			setTextInputConfig(eid, { secret: true, censor: '#' });
			setTextInputConfig(eid, { maxLength: 100 });

			const config = getTextInputConfig(eid);
			expect(config.secret).toBe(true);
			expect(config.censor).toBe('#');
			expect(config.maxLength).toBe(100);
		});
	});

	describe('maskValue', () => {
		beforeEach(() => {
			attachTextInputBehavior(world, eid);
		});

		it('should not mask when not in secret mode', () => {
			expect(maskValue(eid, 'hello')).toBe('hello');
		});

		it('should mask when in secret mode', () => {
			setTextInputConfig(eid, { secret: true });
			expect(maskValue(eid, 'hello')).toBe('*****');
		});

		it('should use custom censor character', () => {
			setTextInputConfig(eid, { secret: true, censor: '#' });
			expect(maskValue(eid, 'hello')).toBe('#####');
		});
	});

	describe('callbacks', () => {
		beforeEach(() => {
			attachTextInputBehavior(world, eid);
		});

		describe('onTextInputChange', () => {
			it('should register and call callback', () => {
				const callback = vi.fn();
				onTextInputChange(eid, callback);

				emitValueChange(eid, 'test');

				expect(callback).toHaveBeenCalledWith('test');
			});

			it('should return unsubscribe function', () => {
				const callback = vi.fn();
				const unsubscribe = onTextInputChange(eid, callback);

				unsubscribe();
				emitValueChange(eid, 'test');

				expect(callback).not.toHaveBeenCalled();
			});
		});

		describe('onTextInputSubmit', () => {
			it('should register and call callback', () => {
				const callback = vi.fn();
				onTextInputSubmit(eid, callback);

				emitSubmit(eid, 'submitted value');

				expect(callback).toHaveBeenCalledWith('submitted value');
			});
		});

		describe('onTextInputCancel', () => {
			it('should register and call callback', () => {
				const callback = vi.fn();
				onTextInputCancel(eid, callback);

				emitCancel(eid);

				expect(callback).toHaveBeenCalled();
			});
		});

		describe('clearTextInputCallbacks', () => {
			it('should remove all callbacks', () => {
				const changeCallback = vi.fn();
				const submitCallback = vi.fn();
				const cancelCallback = vi.fn();

				onTextInputChange(eid, changeCallback);
				onTextInputSubmit(eid, submitCallback);
				onTextInputCancel(eid, cancelCallback);

				clearTextInputCallbacks(eid);

				emitValueChange(eid, 'test');
				emitSubmit(eid, 'test');
				emitCancel(eid);

				expect(changeCallback).not.toHaveBeenCalled();
				expect(submitCallback).not.toHaveBeenCalled();
				expect(cancelCallback).not.toHaveBeenCalled();
			});
		});
	});

	describe('handleTextInputKeyPress', () => {
		beforeEach(() => {
			attachTextInputBehavior(world, eid);
			focusTextInput(world, eid);
		});

		it('should return null for disabled text input', () => {
			disableTextInput(world, eid);
			const action = handleTextInputKeyPress(world, eid, 'a', '');
			expect(action).toBeNull();
		});

		it('should return submit action on Enter', () => {
			const action = handleTextInputKeyPress(world, eid, 'enter', 'test');
			expect(action).toEqual({ type: 'submit', value: 'test' });
		});

		it('should return submit action on return', () => {
			const action = handleTextInputKeyPress(world, eid, 'return', 'test');
			expect(action).toEqual({ type: 'submit', value: 'test' });
		});

		it('should return cancel action on Escape', () => {
			const action = handleTextInputKeyPress(world, eid, 'escape', 'test');
			expect(action).toEqual({ type: 'cancel' });
		});

		it('should return delete action on Backspace', () => {
			setCursorPos(world, eid, 3);
			const action = handleTextInputKeyPress(world, eid, 'backspace', 'hello');
			expect(action).toEqual({ type: 'delete', start: 2, end: 3 });
		});

		it('should return null on Backspace at start', () => {
			setCursorPos(world, eid, 0);
			const action = handleTextInputKeyPress(world, eid, 'backspace', 'hello');
			expect(action).toBeNull();
		});

		it('should return delete action on Delete', () => {
			setCursorPos(world, eid, 2);
			const action = handleTextInputKeyPress(world, eid, 'delete', 'hello');
			expect(action).toEqual({ type: 'delete', start: 2, end: 3 });
		});

		it('should return null on Delete at end', () => {
			setCursorPos(world, eid, 5);
			const action = handleTextInputKeyPress(world, eid, 'delete', 'hello');
			expect(action).toBeNull();
		});

		it('should return moveCursor action on Left', () => {
			setCursorPos(world, eid, 3);
			const action = handleTextInputKeyPress(world, eid, 'left', 'hello');
			expect(action).toEqual({ type: 'moveCursor', position: 2 });
		});

		it('should return null on Left at start', () => {
			setCursorPos(world, eid, 0);
			const action = handleTextInputKeyPress(world, eid, 'left', 'hello');
			expect(action).toBeNull();
		});

		it('should return moveCursor action on Right', () => {
			setCursorPos(world, eid, 3);
			const action = handleTextInputKeyPress(world, eid, 'right', 'hello');
			expect(action).toEqual({ type: 'moveCursor', position: 4 });
		});

		it('should return null on Right at end', () => {
			setCursorPos(world, eid, 5);
			const action = handleTextInputKeyPress(world, eid, 'right', 'hello');
			expect(action).toBeNull();
		});

		it('should return moveCursor action on Home', () => {
			setCursorPos(world, eid, 3);
			const action = handleTextInputKeyPress(world, eid, 'home', 'hello');
			expect(action).toEqual({ type: 'moveCursor', position: 0 });
		});

		it('should return null on Home when already at start', () => {
			setCursorPos(world, eid, 0);
			const action = handleTextInputKeyPress(world, eid, 'home', 'hello');
			expect(action).toBeNull();
		});

		it('should return moveCursor action on End', () => {
			setCursorPos(world, eid, 3);
			const action = handleTextInputKeyPress(world, eid, 'end', 'hello');
			expect(action).toEqual({ type: 'moveCursor', position: 5 });
		});

		it('should return null on End when already at end', () => {
			setCursorPos(world, eid, 5);
			const action = handleTextInputKeyPress(world, eid, 'end', 'hello');
			expect(action).toBeNull();
		});

		it('should return insert action for printable characters', () => {
			setCursorPos(world, eid, 3);
			const action = handleTextInputKeyPress(world, eid, 'a', 'hel');
			expect(action).toEqual({ type: 'insert', char: 'a', position: 3 });
		});

		it('should return null for printable characters at max length', () => {
			setTextInputConfig(eid, { maxLength: 5 });
			setCursorPos(world, eid, 5);
			const action = handleTextInputKeyPress(world, eid, 'a', 'hello');
			expect(action).toBeNull();
		});

		it('should return null for unhandled keys', () => {
			const action = handleTextInputKeyPress(world, eid, 'tab', 'hello');
			expect(action).toBeNull();
		});
	});

	describe('resetTextInputStore', () => {
		it('should reset all stores', () => {
			attachTextInputBehavior(world, eid);
			setCursorPos(world, eid, 5);
			setSelection(world, eid, 1, 3);
			setTextInputConfig(eid, { secret: true });

			resetTextInputStore();

			expect(textInputStore.isTextInput[eid]).toBe(0);
			expect(textInputStore.cursorPos[eid]).toBe(0);
			expect(textInputStore.selectionStart[eid]).toBe(-1);
			expect(textInputStore.selectionEnd[eid]).toBe(-1);
			expect(getTextInputConfig(eid).secret).toBe(false);
		});
	});

	describe('Cursor Rendering', () => {
		let eid: number;

		beforeEach(() => {
			eid = addEntity(world);
			attachTextInputBehavior(world, eid);
			focusTextInput(world, eid);
		});

		describe('getCursorMode / setCursorMode', () => {
			it('should default to line mode', () => {
				expect(getCursorMode(eid)).toBe(CursorMode.Line);
			});

			it('should set block mode', () => {
				setCursorMode(world, eid, CursorMode.Block);
				expect(getCursorMode(eid)).toBe(CursorMode.Block);
			});

			it('should toggle between modes', () => {
				expect(toggleCursorMode(world, eid)).toBe(CursorMode.Block);
				expect(getCursorMode(eid)).toBe(CursorMode.Block);
				expect(toggleCursorMode(world, eid)).toBe(CursorMode.Line);
				expect(getCursorMode(eid)).toBe(CursorMode.Line);
			});
		});

		describe('isCursorBlinkEnabled / setCursorBlinkEnabled', () => {
			it('should default to blink enabled', () => {
				expect(isCursorBlinkEnabled(eid)).toBe(true);
			});

			it('should disable blink', () => {
				setCursorBlinkEnabled(world, eid, false);
				expect(isCursorBlinkEnabled(eid)).toBe(false);
			});

			it('should re-enable blink', () => {
				setCursorBlinkEnabled(world, eid, false);
				setCursorBlinkEnabled(world, eid, true);
				expect(isCursorBlinkEnabled(eid)).toBe(true);
			});
		});

		describe('resetCursorBlink', () => {
			it('should reset blink timer to current time', () => {
				const before = Date.now();
				resetCursorBlink(eid);
				const blinkStart = textInputStore.cursorBlinkStart[eid];
				expect(blinkStart).toBeGreaterThanOrEqual(before);
				expect(blinkStart).toBeLessThanOrEqual(Date.now());
			});
		});

		describe('getCursorConfig / setCursorConfig', () => {
			it('should return default config', () => {
				const config = getCursorConfig(eid);
				expect(config.blink).toBe(true);
				expect(config.blinkIntervalMs).toBe(DEFAULT_CURSOR_BLINK_MS);
				expect(config.lineChar).toBe(DEFAULT_CURSOR_LINE_CHAR);
				expect(config.blockChar).toBe(DEFAULT_CURSOR_BLOCK_CHAR);
			});

			it('should set custom config', () => {
				setCursorConfig(eid, {
					blink: false,
					blinkIntervalMs: 250,
					lineChar: '|',
					blockChar: '▓',
				});
				const config = getCursorConfig(eid);
				expect(config.blink).toBe(false);
				expect(config.blinkIntervalMs).toBe(250);
				expect(config.lineChar).toBe('|');
				expect(config.blockChar).toBe('▓');
			});

			it('should merge partial config', () => {
				setCursorConfig(eid, { lineChar: '|' });
				const config = getCursorConfig(eid);
				expect(config.blink).toBe(true); // Default
				expect(config.lineChar).toBe('|'); // Changed
			});
		});

		describe('getCursorChar', () => {
			it('should return line char in line mode', () => {
				setCursorMode(world, eid, CursorMode.Line);
				expect(getCursorChar(eid)).toBe(DEFAULT_CURSOR_LINE_CHAR);
			});

			it('should return block char in block mode', () => {
				setCursorMode(world, eid, CursorMode.Block);
				expect(getCursorChar(eid)).toBe(DEFAULT_CURSOR_BLOCK_CHAR);
			});

			it('should return custom char', () => {
				setCursorConfig(eid, { lineChar: '|' });
				expect(getCursorChar(eid)).toBe('|');
			});
		});

		describe('isCursorVisible', () => {
			it('should return false when not focused', () => {
				blurTextInput(world, eid);
				expect(isCursorVisible(world, eid)).toBe(false);
			});

			it('should return true when focused with blink disabled', () => {
				setCursorBlinkEnabled(world, eid, false);
				expect(isCursorVisible(world, eid)).toBe(true);
			});

			it('should be visible immediately after focus', () => {
				// Just focused, so cursor should be in visible phase
				expect(isCursorVisible(world, eid)).toBe(true);
			});
		});

		describe('getCursorDisplayText', () => {
			it('should return placeholder when value is empty', () => {
				setTextInputConfig(eid, { placeholder: 'Type here...' });
				const result = getCursorDisplayText(world, eid, '');
				expect(result.displayText).toBe('Type here...');
				expect(result.cursorVisible).toBe(false);
			});

			it('should insert line cursor at position', () => {
				setCursorBlinkEnabled(world, eid, false);
				setCursorPos(world, eid, 3);
				const result = getCursorDisplayText(world, eid, 'Hello');
				expect(result.displayText).toBe(`Hel${DEFAULT_CURSOR_LINE_CHAR}lo`);
				expect(result.cursorVisible).toBe(true);
				expect(result.cursorPosition).toBe(3);
			});

			it('should replace character with block cursor', () => {
				setCursorBlinkEnabled(world, eid, false);
				setCursorMode(world, eid, CursorMode.Block);
				setCursorPos(world, eid, 2);
				const result = getCursorDisplayText(world, eid, 'Hello');
				expect(result.displayText).toBe(`He${DEFAULT_CURSOR_BLOCK_CHAR}lo`);
				expect(result.cursorVisible).toBe(true);
			});

			it('should mask password with censor char', () => {
				setCursorBlinkEnabled(world, eid, false);
				setTextInputConfig(eid, { secret: true, censor: '*' });
				setCursorPos(world, eid, 3);
				const result = getCursorDisplayText(world, eid, 'pass');
				expect(result.displayText).toBe(`***${DEFAULT_CURSOR_LINE_CHAR}*`);
			});

			it('should insert cursor at end of text', () => {
				setCursorBlinkEnabled(world, eid, false);
				setCursorPos(world, eid, 5);
				const result = getCursorDisplayText(world, eid, 'Hello');
				expect(result.displayText).toBe(`Hello${DEFAULT_CURSOR_LINE_CHAR}`);
			});
		});

		describe('getNormalizedSelection', () => {
			it('should return null when no selection', () => {
				expect(getNormalizedSelection(eid)).toBeNull();
			});

			it('should normalize selection (start < end)', () => {
				setSelection(world, eid, 5, 2);
				const result = getNormalizedSelection(eid);
				expect(result).toEqual({ start: 2, end: 5 });
			});

			it('should keep already normalized selection', () => {
				setSelection(world, eid, 2, 5);
				const result = getNormalizedSelection(eid);
				expect(result).toEqual({ start: 2, end: 5 });
			});
		});

		describe('cursor blink reset on cursor move', () => {
			it('should reset blink when cursor position changes', () => {
				// Get initial blink time
				const initialBlink = textInputStore.cursorBlinkStart[eid];

				// Set cursor position - this should reset blink timer
				setCursorPos(world, eid, 5);
				const newBlink = textInputStore.cursorBlinkStart[eid];

				// New blink time should be >= initial (reset to current time)
				expect(newBlink!).toBeGreaterThanOrEqual(initialBlink!);
			});
		});
	});
});
