/**
 * TextInput types, interfaces, and constants.
 * @module components/textInput/types
 */

import type { StateMachineConfig } from '../../core/stateMachine';
import type { Entity } from '../../core/types';

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
export const DEFAULT_CAPACITY = 10000;

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
 * Validation function type.
 * Returns true if the value is valid, false otherwise.
 * Can optionally return an error message string.
 */
export type ValidationFunction = (value: string) => boolean | string;

/**
 * When to run validation.
 */
export type ValidationTiming = 'onChange' | 'onSubmit' | 'both';

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
	/** Optional validation function */
	validator?: ValidationFunction | undefined;
	/** When to run validation (default: 'both') */
	validationTiming?: ValidationTiming | undefined;
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
	/** Optional validation function */
	validator?: ValidationFunction;
	/** When to run validation (default: 'both') */
	validationTiming?: ValidationTiming;
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
	| { type: 'newline'; position: number }
	| { type: 'moveWordLeft'; text: string; position: number }
	| { type: 'moveWordRight'; text: string; position: number }
	| { type: 'deleteWordBackward'; text: string; position: number }
	| { type: 'deleteWordForward'; text: string; position: number };

/**
 * Store for text input configuration.
 * Maps entity ID to configuration.
 */
export const configStore = new Map<Entity, TextInputConfig>();

/**
 * Store for text input value callbacks.
 * Maps entity ID to callback functions.
 */
export const valueChangeCallbacks = new Map<Entity, Array<(value: string) => void>>();

/**
 * Store for submit callbacks.
 * Maps entity ID to callback functions.
 */
export const submitCallbacks = new Map<Entity, Array<(value: string) => void>>();

/**
 * Store for cancel callbacks.
 * Maps entity ID to callback functions.
 */
export const cancelCallbacks = new Map<Entity, Array<() => void>>();

/**
 * Store for validation error messages.
 * Maps entity ID to error message (null if valid).
 */
export const validationErrors = new Map<Entity, string | null>();

/**
 * Store for cursor configuration.
 * Maps entity ID to cursor configuration.
 */
export const cursorConfigStore = new Map<Entity, CursorConfig>();
