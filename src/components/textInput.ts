/**
 * TextInput component and helper functions.
 * Provides state machine support and text input operations.
 * @module components/textInput
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
 * TextInput states.
 */
export type TextInputState = 'idle' | 'focused' | 'editing' | 'error' | 'disabled';

/**
 * TextInput events that can trigger state transitions.
 */
export type TextInputEvent =
	| 'focus'
	| 'blur'
	| 'startEdit'
	| 'endEdit'
	| 'error'
	| 'clearError'
	| 'disable'
	| 'enable';

/**
 * TextInput state machine configuration.
 *
 * State transitions:
 * - idle: can become focused (focus), disabled (disable)
 * - focused: can become editing (startEdit), idle (blur), error (error), disabled (disable)
 * - editing: can become focused (endEdit), error (error)
 * - error: can become focused (clearError), idle (blur), disabled (disable)
 * - disabled: can become idle (enable)
 */
export const TEXT_INPUT_STATE_MACHINE_CONFIG: StateMachineConfig<
	TextInputState,
	TextInputEvent,
	void
> = {
	initial: 'idle',
	states: {
		idle: {
			on: {
				focus: 'focused',
				disable: 'disabled',
			},
		},
		focused: {
			on: {
				startEdit: 'editing',
				blur: 'idle',
				error: 'error',
				disable: 'disabled',
			},
		},
		editing: {
			on: {
				endEdit: 'focused',
				blur: 'idle',
				error: 'error',
			},
		},
		error: {
			on: {
				clearError: 'focused',
				blur: 'idle',
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
 * Cursor visual mode constants.
 */
export const CursorMode = {
	/** Line cursor (insert mode) */
	Line: 0,
	/** Block cursor (overwrite mode) */
	Block: 1,
} as const;

export type CursorModeType = (typeof CursorMode)[keyof typeof CursorMode];

/**
 * Default cursor blink interval in milliseconds.
 */
export const DEFAULT_CURSOR_BLINK_MS = 530;

/**
 * TextInput component store for tracking text input entities.
 * Uses entity ID as index.
 */
export interface TextInputStore {
	/** Whether entity is a text input (1 = true, 0 = false) */
	isTextInput: Uint8Array;
	/** TextInput state machine ID */
	machineId: Uint32Array;
	/** Cursor position in the text */
	cursorPos: Uint32Array;
	/** Selection start (-1 if no selection) */
	selectionStart: Int32Array;
	/** Selection end (-1 if no selection) */
	selectionEnd: Int32Array;
	/** Input mode (0=normal, 1=editing) */
	inputMode: Uint8Array;
	/** Cursor visual mode (0=line, 1=block) */
	cursorMode: Uint8Array;
	/** Cursor blink enabled (1=true, 0=false) */
	cursorBlink: Uint8Array;
	/** Timestamp when cursor blink started (for animation) */
	cursorBlinkStart: Float64Array;
}

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
 * Configuration for text input display and behavior.
 */
export interface TextInputConfig {
	/** Whether input is a password field */
	secret: boolean;
	/** Mask character for password mode (default: '*') */
	censor: string;
	/** Placeholder text when empty */
	placeholder: string;
	/** Maximum input length (0 = unlimited) */
	maxLength: number;
	/** Whether input supports multiple lines (for Textarea) */
	multiline: boolean;
}

/**
 * Default censor character for password fields.
 */
export const DEFAULT_CENSOR_CHAR = '*';

/**
 * Default placeholder text.
 */
export const DEFAULT_PLACEHOLDER = '';

/**
 * Store for text input configuration.
 * Maps entity ID to configuration.
 */
const configStore = new Map<Entity, TextInputConfig>();

/**
 * Store for text input value callbacks.
 * Maps entity ID to callback functions.
 */
const valueChangeCallbacks = new Map<Entity, Array<(value: string) => void>>();

/**
 * Store for submit callbacks.
 * Maps entity ID to callback functions.
 */
const submitCallbacks = new Map<Entity, Array<(value: string) => void>>();

/**
 * Store for cancel callbacks.
 * Maps entity ID to callback functions.
 */
const cancelCallbacks = new Map<Entity, Array<() => void>>();

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
}

// =============================================================================
// TextInput Functions
// =============================================================================

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

// =============================================================================
// Cursor and Selection
// =============================================================================

/**
 * Gets the cursor position.
 *
 * @param eid - Entity ID
 * @returns Cursor position
 */
export function getCursorPos(eid: Entity): number {
	return textInputStore.cursorPos[eid] ?? 0;
}

/**
 * Sets the cursor position.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @param pos - New cursor position
 */
export function setCursorPos(world: World, eid: Entity, pos: number): void {
	if (!isTextInput(world, eid)) {
		return;
	}
	textInputStore.cursorPos[eid] = Math.max(0, pos);
	// Reset blink timer so cursor is immediately visible after movement
	textInputStore.cursorBlinkStart[eid] = Date.now();
	markDirty(world, eid);
}

/**
 * Moves the cursor by a delta amount.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @param delta - Amount to move (positive = right, negative = left)
 */
export function moveCursor(world: World, eid: Entity, delta: number): void {
	const current = getCursorPos(eid);
	setCursorPos(world, eid, current + delta);
}

/**
 * Gets the selection range.
 *
 * @param eid - Entity ID
 * @returns Selection range [start, end] or null if no selection
 */
export function getSelection(eid: Entity): [number, number] | null {
	const start = textInputStore.selectionStart[eid];
	const end = textInputStore.selectionEnd[eid];
	if (start === undefined || end === undefined || start < 0 || end < 0) {
		return null;
	}
	return [start, end];
}

/**
 * Sets the selection range.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @param start - Selection start
 * @param end - Selection end
 */
export function setSelection(world: World, eid: Entity, start: number, end: number): void {
	if (!isTextInput(world, eid)) {
		return;
	}
	textInputStore.selectionStart[eid] = start;
	textInputStore.selectionEnd[eid] = end;
	markDirty(world, eid);
}

/**
 * Clears the current selection.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 */
export function clearSelection(world: World, eid: Entity): void {
	if (!isTextInput(world, eid)) {
		return;
	}
	textInputStore.selectionStart[eid] = -1;
	textInputStore.selectionEnd[eid] = -1;
	markDirty(world, eid);
}

/**
 * Checks if there is an active selection.
 *
 * @param eid - Entity ID
 * @returns true if there is a selection
 */
export function hasSelection(eid: Entity): boolean {
	return getSelection(eid) !== null;
}

// =============================================================================
// Cursor Rendering
// =============================================================================

/**
 * Cursor display configuration.
 */
export interface CursorConfig {
	/** Whether cursor blink is enabled */
	blink: boolean;
	/** Cursor blink interval in milliseconds */
	blinkIntervalMs: number;
	/** Character used for line cursor (insert mode) */
	lineChar: string;
	/** Character used for block cursor (overwrite mode) */
	blockChar: string;
}

/**
 * Default line cursor character (thin vertical bar).
 */
export const DEFAULT_CURSOR_LINE_CHAR = '│';

/**
 * Default block cursor character (full block).
 */
export const DEFAULT_CURSOR_BLOCK_CHAR = '█';

/**
 * Store for cursor configuration.
 * Maps entity ID to cursor configuration.
 */
const cursorConfigStore = new Map<Entity, CursorConfig>();

/**
 * Gets the cursor configuration for a text input.
 *
 * @param eid - Entity ID
 * @returns Cursor configuration
 */
export function getCursorConfig(eid: Entity): CursorConfig {
	return (
		cursorConfigStore.get(eid) ?? {
			blink: true,
			blinkIntervalMs: DEFAULT_CURSOR_BLINK_MS,
			lineChar: DEFAULT_CURSOR_LINE_CHAR,
			blockChar: DEFAULT_CURSOR_BLOCK_CHAR,
		}
	);
}

/**
 * Options for setting cursor configuration.
 */
export interface CursorConfigOptions {
	/** Whether cursor blink is enabled */
	blink?: boolean;
	/** Cursor blink interval in milliseconds */
	blinkIntervalMs?: number;
	/** Character used for line cursor (insert mode) */
	lineChar?: string;
	/** Character used for block cursor (overwrite mode) */
	blockChar?: string;
}

/**
 * Sets the cursor configuration for a text input.
 *
 * @param eid - Entity ID
 * @param options - Cursor configuration options
 *
 * @example
 * ```typescript
 * setCursorConfig(textbox, {
 *   blink: true,
 *   blinkIntervalMs: 500,
 *   lineChar: '|',
 * });
 * ```
 */
export function setCursorConfig(eid: Entity, options: CursorConfigOptions): void {
	const current = getCursorConfig(eid);
	cursorConfigStore.set(eid, {
		blink: options.blink ?? current.blink,
		blinkIntervalMs: options.blinkIntervalMs ?? current.blinkIntervalMs,
		lineChar: options.lineChar ?? current.lineChar,
		blockChar: options.blockChar ?? current.blockChar,
	});
}

/**
 * Gets the cursor visual mode (line or block).
 *
 * @param eid - Entity ID
 * @returns Cursor mode (0=line, 1=block)
 */
export function getCursorMode(eid: Entity): CursorModeType {
	return (textInputStore.cursorMode[eid] ?? 0) as CursorModeType;
}

/**
 * Sets the cursor visual mode.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @param mode - Cursor mode (CursorMode.Line or CursorMode.Block)
 *
 * @example
 * ```typescript
 * // Switch to overwrite mode (block cursor)
 * setCursorMode(world, textbox, CursorMode.Block);
 * ```
 */
export function setCursorMode(world: World, eid: Entity, mode: CursorModeType): void {
	if (!isTextInput(world, eid)) {
		return;
	}
	textInputStore.cursorMode[eid] = mode;
	markDirty(world, eid);
}

/**
 * Toggles between line and block cursor modes.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @returns The new cursor mode
 */
export function toggleCursorMode(world: World, eid: Entity): CursorModeType {
	const current = getCursorMode(eid);
	const newMode = current === CursorMode.Line ? CursorMode.Block : CursorMode.Line;
	setCursorMode(world, eid, newMode);
	return newMode;
}

/**
 * Checks if cursor blink is enabled for a text input.
 *
 * @param eid - Entity ID
 * @returns true if blink is enabled
 */
export function isCursorBlinkEnabled(eid: Entity): boolean {
	return (textInputStore.cursorBlink[eid] ?? 1) === 1;
}

/**
 * Enables or disables cursor blink.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @param enabled - Whether blink should be enabled
 */
export function setCursorBlinkEnabled(world: World, eid: Entity, enabled: boolean): void {
	if (!isTextInput(world, eid)) {
		return;
	}
	textInputStore.cursorBlink[eid] = enabled ? 1 : 0;
	if (enabled) {
		// Reset blink timer when enabling
		textInputStore.cursorBlinkStart[eid] = Date.now();
	}
	markDirty(world, eid);
}

/**
 * Resets the cursor blink timer.
 * Call this when the user types or moves the cursor to show cursor immediately.
 *
 * @param eid - Entity ID
 */
export function resetCursorBlink(eid: Entity): void {
	textInputStore.cursorBlinkStart[eid] = Date.now();
}

/**
 * Gets whether the cursor should be visible at the current time.
 * Takes into account the blink state and timing.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @returns true if cursor should be visible
 *
 * @example
 * ```typescript
 * // In render system:
 * if (isCursorVisible(world, textbox)) {
 *   // Render cursor at position
 * }
 * ```
 */
export function isCursorVisible(world: World, eid: Entity): boolean {
	// Cursor only visible when focused/editing
	const state = getTextInputState(world, eid);
	if (state !== 'focused' && state !== 'editing') {
		return false;
	}

	// If blink is disabled, cursor is always visible
	if (!isCursorBlinkEnabled(eid)) {
		return true;
	}

	// Calculate blink phase
	const config = getCursorConfig(eid);
	const blinkStart = textInputStore.cursorBlinkStart[eid] ?? Date.now();
	const elapsed = Date.now() - blinkStart;
	const phase = Math.floor(elapsed / config.blinkIntervalMs) % 2;

	// Cursor visible during first half of cycle (phase 0)
	return phase === 0;
}

/**
 * Gets the character to display for the cursor based on mode.
 *
 * @param eid - Entity ID
 * @returns Cursor character
 */
export function getCursorChar(eid: Entity): string {
	const config = getCursorConfig(eid);
	const mode = getCursorMode(eid);
	return mode === CursorMode.Block ? config.blockChar : config.lineChar;
}

/**
 * Gets the display text for rendering, with cursor character inserted.
 * Handles password masking and placeholder display.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @param value - Current text value
 * @returns Object with display text and whether cursor is visible
 *
 * @example
 * ```typescript
 * const { displayText, cursorVisible, cursorPosition } = getCursorDisplayText(world, textbox, value);
 * // displayText: "Hello│World" (with cursor between 'o' and 'W')
 * ```
 */
export function getCursorDisplayText(
	world: World,
	eid: Entity,
	value: string,
): {
	displayText: string;
	cursorVisible: boolean;
	cursorPosition: number;
} {
	const config = getTextInputConfig(eid);
	const cursorPos = getCursorPos(eid);

	// Handle password masking
	let displayValue = value;
	if (config.secret) {
		displayValue = config.censor.repeat(value.length);
	}

	// Handle empty value with placeholder
	if (displayValue.length === 0 && config.placeholder) {
		return {
			displayText: config.placeholder,
			cursorVisible: false,
			cursorPosition: 0,
		};
	}

	const cursorVisible = isCursorVisible(world, eid);

	// If cursor not visible, just return display value
	if (!cursorVisible) {
		return {
			displayText: displayValue,
			cursorVisible: false,
			cursorPosition: cursorPos,
		};
	}

	// Insert cursor character at position
	const cursorChar = getCursorChar(eid);
	const mode = getCursorMode(eid);

	let displayText: string;
	if (mode === CursorMode.Block && cursorPos < displayValue.length) {
		// Block mode replaces character at cursor position
		displayText =
			displayValue.substring(0, cursorPos) + cursorChar + displayValue.substring(cursorPos + 1);
	} else {
		// Line mode inserts cursor between characters
		displayText =
			displayValue.substring(0, cursorPos) + cursorChar + displayValue.substring(cursorPos);
	}

	return {
		displayText,
		cursorVisible: true,
		cursorPosition: cursorPos,
	};
}

/**
 * Gets selection range for rendering with highlight.
 * Returns the start and end positions normalized (start < end).
 *
 * @param eid - Entity ID
 * @returns Normalized selection range or null
 */
export function getNormalizedSelection(eid: Entity): { start: number; end: number } | null {
	const selection = getSelection(eid);
	if (!selection) {
		return null;
	}

	const [start, end] = selection;
	return {
		start: Math.min(start, end),
		end: Math.max(start, end),
	};
}

// =============================================================================
// Configuration
// =============================================================================

/**
 * Options for setting text input configuration.
 */
export interface TextInputConfigOptions {
	/** Whether input is a password field */
	secret?: boolean;
	/** Mask character for password mode */
	censor?: string;
	/** Placeholder text when empty */
	placeholder?: string;
	/** Maximum input length (0 = unlimited) */
	maxLength?: number;
	/** Whether input supports multiple lines (for Textarea) */
	multiline?: boolean;
}

/**
 * Sets the text input configuration.
 *
 * @param eid - Entity ID
 * @param options - Configuration options
 *
 * @example
 * ```typescript
 * setTextInputConfig(textbox, {
 *   secret: true,
 *   censor: '*',
 *   maxLength: 20,
 * });
 * ```
 */
export function setTextInputConfig(eid: Entity, options: TextInputConfigOptions): void {
	const current = configStore.get(eid) ?? {
		secret: false,
		censor: DEFAULT_CENSOR_CHAR,
		placeholder: DEFAULT_PLACEHOLDER,
		maxLength: 0,
		multiline: false,
	};

	configStore.set(eid, {
		secret: options.secret ?? current.secret,
		censor: options.censor ?? current.censor,
		placeholder: options.placeholder ?? current.placeholder,
		maxLength: options.maxLength ?? current.maxLength,
		multiline: options.multiline ?? current.multiline,
	});
}

/**
 * Gets the text input configuration.
 *
 * @param eid - Entity ID
 * @returns Configuration or defaults
 */
export function getTextInputConfig(eid: Entity): TextInputConfig {
	return (
		configStore.get(eid) ?? {
			secret: false,
			censor: DEFAULT_CENSOR_CHAR,
			placeholder: DEFAULT_PLACEHOLDER,
			maxLength: 0,
			multiline: false,
		}
	);
}

/**
 * Checks if the text input is in secret/password mode.
 *
 * @param eid - Entity ID
 * @returns true if in secret mode
 */
export function isSecretMode(eid: Entity): boolean {
	return getTextInputConfig(eid).secret;
}

/**
 * Gets the censor character for password display.
 *
 * @param eid - Entity ID
 * @returns Censor character
 */
export function getCensorChar(eid: Entity): string {
	return getTextInputConfig(eid).censor;
}

/**
 * Gets the placeholder text.
 *
 * @param eid - Entity ID
 * @returns Placeholder text
 */
export function getPlaceholder(eid: Entity): string {
	return getTextInputConfig(eid).placeholder;
}

/**
 * Gets the maximum input length.
 *
 * @param eid - Entity ID
 * @returns Maximum length (0 = unlimited)
 */
export function getMaxLength(eid: Entity): number {
	return getTextInputConfig(eid).maxLength;
}

/**
 * Checks if the text input is multiline (textarea mode).
 *
 * @param eid - Entity ID
 * @returns true if multiline
 */
export function isMultiline(eid: Entity): boolean {
	return getTextInputConfig(eid).multiline;
}

/**
 * Masks a string for password display.
 *
 * @param eid - Entity ID
 * @param value - The value to mask
 * @returns Masked string
 *
 * @example
 * ```typescript
 * const masked = maskValue(textbox, 'secret');
 * // Returns '******'
 * ```
 */
export function maskValue(eid: Entity, value: string): string {
	if (!isSecretMode(eid)) {
		return value;
	}
	const censor = getCensorChar(eid);
	return censor.repeat(value.length);
}

// =============================================================================
// Event Callbacks
// =============================================================================

/**
 * Registers a callback for value changes.
 *
 * @param eid - Entity ID
 * @param callback - Function to call on value change
 * @returns Unsubscribe function
 */
export function onTextInputChange(eid: Entity, callback: (value: string) => void): () => void {
	let callbacks = valueChangeCallbacks.get(eid);
	if (!callbacks) {
		callbacks = [];
		valueChangeCallbacks.set(eid, callbacks);
	}
	callbacks.push(callback);

	return () => {
		const cbs = valueChangeCallbacks.get(eid);
		if (cbs) {
			const index = cbs.indexOf(callback);
			if (index !== -1) {
				cbs.splice(index, 1);
			}
		}
	};
}

/**
 * Registers a callback for submit events.
 *
 * @param eid - Entity ID
 * @param callback - Function to call on submit
 * @returns Unsubscribe function
 */
export function onTextInputSubmit(eid: Entity, callback: (value: string) => void): () => void {
	let callbacks = submitCallbacks.get(eid);
	if (!callbacks) {
		callbacks = [];
		submitCallbacks.set(eid, callbacks);
	}
	callbacks.push(callback);

	return () => {
		const cbs = submitCallbacks.get(eid);
		if (cbs) {
			const index = cbs.indexOf(callback);
			if (index !== -1) {
				cbs.splice(index, 1);
			}
		}
	};
}

/**
 * Registers a callback for cancel events.
 *
 * @param eid - Entity ID
 * @param callback - Function to call on cancel
 * @returns Unsubscribe function
 */
export function onTextInputCancel(eid: Entity, callback: () => void): () => void {
	let callbacks = cancelCallbacks.get(eid);
	if (!callbacks) {
		callbacks = [];
		cancelCallbacks.set(eid, callbacks);
	}
	callbacks.push(callback);

	return () => {
		const cbs = cancelCallbacks.get(eid);
		if (cbs) {
			const index = cbs.indexOf(callback);
			if (index !== -1) {
				cbs.splice(index, 1);
			}
		}
	};
}

/**
 * Emits a value change event.
 *
 * @param eid - Entity ID
 * @param value - New value
 */
export function emitValueChange(eid: Entity, value: string): void {
	const callbacks = valueChangeCallbacks.get(eid);
	if (callbacks) {
		for (const callback of callbacks) {
			callback(value);
		}
	}
}

/**
 * Emits a submit event.
 *
 * @param eid - Entity ID
 * @param value - Submitted value
 */
export function emitSubmit(eid: Entity, value: string): void {
	const callbacks = submitCallbacks.get(eid);
	if (callbacks) {
		for (const callback of callbacks) {
			callback(value);
		}
	}
}

/**
 * Emits a cancel event.
 *
 * @param eid - Entity ID
 */
export function emitCancel(eid: Entity): void {
	const callbacks = cancelCallbacks.get(eid);
	if (callbacks) {
		for (const callback of callbacks) {
			callback();
		}
	}
}

/**
 * Clears all callbacks for a text input.
 * Call this when destroying a text input entity.
 *
 * @param eid - Entity ID
 */
export function clearTextInputCallbacks(eid: Entity): void {
	valueChangeCallbacks.delete(eid);
	submitCallbacks.delete(eid);
	cancelCallbacks.delete(eid);
	configStore.delete(eid);
}

// =============================================================================
// Keyboard Handling
// =============================================================================

/**
 * Handles a key press on a text input.
 * Returns information about what action to take.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @param keyName - Name of the key pressed
 * @param currentValue - Current text value
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
): TextInputAction | null {
	if (!isTextInput(world, eid)) {
		return null;
	}

	const state = getTextInputState(world, eid);
	if (state === 'disabled') {
		return null;
	}

	// If idle and receiving a key, focus first
	if (state === 'idle') {
		focusTextInput(world, eid);
		return null;
	}

	const cursorPos = getCursorPos(eid);
	const config = getTextInputConfig(eid);

	// Handle special keys
	switch (keyName) {
		case 'return':
		case 'enter':
			// In multiline mode, Enter inserts a newline
			if (config.multiline) {
				// Check max length
				if (config.maxLength > 0 && currentValue.length >= config.maxLength) {
					return null;
				}
				return { type: 'newline', position: cursorPos };
			}
			// In single-line mode, Enter submits
			return { type: 'submit', value: currentValue };

		case 'escape':
			// In multiline mode, Escape submits (alternative to Ctrl+Enter)
			if (config.multiline) {
				return { type: 'submit', value: currentValue };
			}
			return { type: 'cancel' };

		case 'backspace':
			if (cursorPos > 0) {
				return {
					type: 'delete',
					start: cursorPos - 1,
					end: cursorPos,
				};
			}
			return null;

		case 'delete':
			if (cursorPos < currentValue.length) {
				return {
					type: 'delete',
					start: cursorPos,
					end: cursorPos + 1,
				};
			}
			return null;

		case 'left':
			if (cursorPos > 0) {
				return { type: 'moveCursor', position: cursorPos - 1 };
			}
			return null;

		case 'right':
			if (cursorPos < currentValue.length) {
				return { type: 'moveCursor', position: cursorPos + 1 };
			}
			return null;

		case 'home':
			if (cursorPos !== 0) {
				return { type: 'moveCursor', position: 0 };
			}
			return null;

		case 'end':
			if (cursorPos !== currentValue.length) {
				return { type: 'moveCursor', position: currentValue.length };
			}
			return null;

		default:
			// Handle printable characters
			if (keyName.length === 1) {
				// Check max length
				if (config.maxLength > 0 && currentValue.length >= config.maxLength) {
					return null;
				}
				return {
					type: 'insert',
					char: keyName,
					position: cursorPos,
				};
			}
			return null;
	}
}

/**
 * Text input action types.
 */
export type TextInputAction =
	| { type: 'insert'; char: string; position: number }
	| { type: 'delete'; start: number; end: number }
	| { type: 'moveCursor'; position: number }
	| { type: 'submit'; value: string }
	| { type: 'cancel' }
	| { type: 'newline'; position: number };
