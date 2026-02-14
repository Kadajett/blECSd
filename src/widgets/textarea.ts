/**
 * Textarea Widget - Multi-line text editor
 * @module widgets/textarea
 */

import { z } from 'zod';
import { setDimensions } from '../components/dimensions';
import { blur, focus, setFocusable } from '../components/focusable';
import { setPadding } from '../components/padding';
import { setPosition } from '../components/position';
import { setStyle } from '../components/renderable';
import {
	attachTextInputBehavior,
	emitSubmit,
	emitValueChange,
	focusTextInput,
	handleTextInputKeyPress,
	onTextInputChange,
	onTextInputSubmit,
	setCursorPos,
	setTextInputConfig,
	startEditingTextInput,
	type TextInputAction,
} from '../components/textInput';
import { addEntity, removeEntity } from '../core/ecs';
import type { Entity, World } from '../core/types';
import { setScrollable, setViewport } from '../systems/scrollableSystem';
import { parseColor } from '../utils/color';
import {
	type CursorPosition,
	clampCursor,
	cursorToOffset,
	deleteWordBackward,
	deleteWordForward,
	findWordEnd,
	findWordStart,
	insertAt,
	moveCursorDown,
	moveCursorEndOfDocument,
	moveCursorStart,
	moveCursorUp,
} from './textEditing';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Wrap mode for text content.
 */
export type WrapMode = 'none' | 'word' | 'char';

/**
 * Textarea configuration.
 */
export interface TextareaConfig {
	/** Initial value */
	readonly value?: string;
	/** Placeholder text when empty */
	readonly placeholder?: string;
	/** Maximum text length (0 = unlimited) */
	readonly maxLength?: number;
	/** Width of the textarea */
	readonly width?: number;
	/** Height of the textarea */
	readonly height?: number;
	/** Left position */
	readonly left?: number;
	/** Top position */
	readonly top?: number;
	/** Foreground color */
	readonly fg?: string | number;
	/** Background color */
	readonly bg?: string | number;
	/** Wrap mode */
	readonly wrap?: WrapMode;
}

/**
 * Textarea widget interface.
 */
export interface TextareaWidget {
	readonly eid: Entity;

	/** Gets the current value */
	getValue(): string;
	/** Sets the value */
	setValue(value: string): TextareaWidget;
	/** Handles a key press */
	handleKey(keyName: string, ctrl?: boolean): boolean;
	/** Focuses the textarea */
	focus(): TextareaWidget;
	/** Blurs the textarea */
	blur(): TextareaWidget;
	/** Gets current cursor position */
	getCursor(): CursorPosition;
	/** Registers submit callback (Escape in multiline) */
	onSubmit(callback: (value: string) => void): () => void;
	/** Registers change callback */
	onChange(callback: (value: string) => void): () => void;
	/** Destroys the widget */
	destroy(): void;
}

// =============================================================================
// SCHEMA
// =============================================================================

export const TextareaConfigSchema = z.object({
	value: z.string().optional().default(''),
	placeholder: z.string().optional(),
	maxLength: z.number().int().nonnegative().optional().default(0),
	width: z.number().int().positive().optional().default(40),
	height: z.number().int().positive().optional().default(10),
	left: z.number().int().nonnegative().optional().default(0),
	top: z.number().int().nonnegative().optional().default(0),
	fg: z.union([z.string(), z.number()]).optional(),
	bg: z.union([z.string(), z.number()]).optional(),
	wrap: z.enum(['none', 'word', 'char']).optional().default('word'),
});

// =============================================================================
// COMPONENT TAG
// =============================================================================

const DEFAULT_CAPACITY = 10000;

export const TextareaStore = {
	isTextarea: new Uint8Array(DEFAULT_CAPACITY),
};

interface TextareaState {
	value: string;
	cursor: CursorPosition;
	scrollLine: number;
}

const textareaStateMap = new Map<Entity, TextareaState>();

// =============================================================================
// HELPERS
// =============================================================================

/** Handles text input actions by dispatching to specific handlers */
function handleTextAction(
	world: World,
	eid: Entity,
	state: TextareaState,
	action: TextInputAction,
): boolean {
	switch (action.type) {
		case 'insert': {
			const result = insertAt(state.value, state.cursor, action.char);
			state.value = result.text;
			state.cursor = result.cursor;
			setCursorPos(world, eid, cursorToOffset(state.value, state.cursor));
			ensureCursorVisible(state);
			emitValueChange(world, eid, state.value);
			return true;
		}
		case 'newline': {
			const result = insertAt(state.value, state.cursor, '\n');
			state.value = result.text;
			state.cursor = result.cursor;
			setCursorPos(world, eid, cursorToOffset(state.value, state.cursor));
			ensureCursorVisible(state);
			emitValueChange(world, eid, state.value);
			return true;
		}
		case 'delete': {
			const startOffset = Math.min(action.start, action.end);
			const endOffset = Math.max(action.start, action.end);
			state.value = state.value.slice(0, startOffset) + state.value.slice(endOffset);
			state.cursor = clampCursor(state.value, { line: 0, column: startOffset });
			setCursorPos(world, eid, startOffset);
			ensureCursorVisible(state);
			emitValueChange(world, eid, state.value);
			return true;
		}
		case 'moveCursor': {
			state.cursor = clampCursor(state.value, { line: 0, column: action.position });
			setCursorPos(world, eid, action.position);
			ensureCursorVisible(state);
			return true;
		}
		case 'moveWordLeft': {
			state.cursor = findWordStart(action.text, state.cursor);
			setCursorPos(world, eid, cursorToOffset(state.value, state.cursor));
			ensureCursorVisible(state);
			return true;
		}
		case 'moveWordRight': {
			state.cursor = findWordEnd(action.text, state.cursor);
			setCursorPos(world, eid, cursorToOffset(state.value, state.cursor));
			ensureCursorVisible(state);
			return true;
		}
		case 'deleteWordBackward': {
			const result = deleteWordBackward(action.text, state.cursor);
			state.value = result.text;
			state.cursor = result.cursor;
			setCursorPos(world, eid, cursorToOffset(state.value, state.cursor));
			ensureCursorVisible(state);
			emitValueChange(world, eid, state.value);
			return true;
		}
		case 'deleteWordForward': {
			const result = deleteWordForward(action.text, state.cursor);
			state.value = result.text;
			state.cursor = result.cursor;
			setCursorPos(world, eid, cursorToOffset(state.value, state.cursor));
			ensureCursorVisible(state);
			emitValueChange(world, eid, state.value);
			return true;
		}
		case 'submit': {
			emitSubmit(world, eid, action.value);
			return true;
		}
		case 'cancel':
			return true;
		default:
			return false;
	}
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Creates a Textarea widget.
 *
 * @param world - The ECS world
 * @param config - Textarea configuration
 * @returns The Textarea widget
 *
 * @example
 * ```typescript
 * import { createWorld } from '../core/ecs';
 * import { createTextarea } from 'blecsd/widgets';
 *
 * const world = createWorld();
 * const textarea = createTextarea(world, {
 *   value: 'Line 1\nLine 2',
 *   width: 50,
 *   height: 20,
 * });
 *
 * textarea.onSubmit((value) => {
 *   console.log('Submitted:', value);
 * });
 * ```
 */
export function createTextarea(world: World, config: TextareaConfig = {}): TextareaWidget {
	const validated = TextareaConfigSchema.parse(config);
	const eid = addEntity(world);

	// Setup components
	TextareaStore.isTextarea[eid] = 1;
	const lines = validated.value.split('\n');
	textareaStateMap.set(eid, {
		value: validated.value,
		cursor: { line: lines.length - 1, column: (lines[lines.length - 1] ?? '').length },
		scrollLine: 0,
	});

	// Attach text input behavior FIRST
	attachTextInputBehavior(world, eid);

	setPosition(world, eid, validated.left, validated.top);
	setDimensions(world, eid, validated.width, validated.height);
	setPadding(world, eid, { left: 1, right: 1, top: 0, bottom: 0 });

	if (validated.fg !== undefined || validated.bg !== undefined) {
		setStyle(world, eid, {
			fg: validated.fg !== undefined ? parseColor(validated.fg) : undefined,
			bg: validated.bg !== undefined ? parseColor(validated.bg) : undefined,
		});
	}

	setTextInputConfig(world, eid, {
		placeholder: validated.placeholder ?? '',
		maxLength: validated.maxLength,
		multiline: true,
	});

	// Set initial cursor position
	const initialOffset = cursorToOffset(validated.value, {
		line: lines.length - 1,
		column: (lines[lines.length - 1] ?? '').length,
	});
	setCursorPos(world, eid, initialOffset);

	// Setup scrolling
	const viewportHeight = validated.height - 2; // Account for padding/border
	setScrollable(world, eid, {
		scrollHeight: lines.length,
		viewportHeight,
	});
	setViewport(world, eid, validated.width - 2, viewportHeight);

	// Start in focused/editing state
	focusTextInput(world, eid);
	startEditingTextInput(world, eid);

	setFocusable(world, eid, { focusable: true });

	const widget: TextareaWidget = {
		eid,

		getValue(): string {
			const state = textareaStateMap.get(eid);
			return state?.value ?? '';
		},

		setValue(value: string): TextareaWidget {
			const state = textareaStateMap.get(eid);
			if (state) {
				const newLines = value.split('\n');
				state.value = value;
				state.cursor = {
					line: newLines.length - 1,
					column: (newLines[newLines.length - 1] ?? '').length,
				};
				const offset = cursorToOffset(value, state.cursor);
				setCursorPos(world, eid, offset);
				emitValueChange(world, eid, value);
			}
			return widget;
		},

		getCursor(): CursorPosition {
			const state = textareaStateMap.get(eid);
			return state?.cursor ?? { line: 0, column: 0 };
		},

		handleKey(keyName: string, ctrl = false): boolean {
			const state = textareaStateMap.get(eid);
			if (!state) return false;

			// Handle special navigation keys
			if (ctrl && keyName === 'home') {
				state.cursor = moveCursorStart(state.value, state.cursor);
				setCursorPos(world, eid, cursorToOffset(state.value, state.cursor));
				return true;
			}
			if (ctrl && keyName === 'end') {
				state.cursor = moveCursorEndOfDocument(state.value, state.cursor);
				setCursorPos(world, eid, cursorToOffset(state.value, state.cursor));
				return true;
			}
			if (keyName === 'up') {
				state.cursor = moveCursorUp(state.value, state.cursor);
				setCursorPos(world, eid, cursorToOffset(state.value, state.cursor));
				ensureCursorVisible(state);
				return true;
			}
			if (keyName === 'down') {
				state.cursor = moveCursorDown(state.value, state.cursor);
				setCursorPos(world, eid, cursorToOffset(state.value, state.cursor));
				ensureCursorVisible(state);
				return true;
			}

			const action = handleTextInputKeyPress(world, eid, keyName, state.value, ctrl);
			if (!action) return false;

			return handleTextAction(world, eid, state, action);
		},

		focus(): TextareaWidget {
			focus(world, eid);
			return widget;
		},

		blur(): TextareaWidget {
			blur(world, eid);
			return widget;
		},

		onSubmit(callback: (value: string) => void): () => void {
			return onTextInputSubmit(world, eid, callback);
		},

		onChange(callback: (value: string) => void): () => void {
			return onTextInputChange(world, eid, callback);
		},

		destroy(): void {
			TextareaStore.isTextarea[eid] = 0;
			textareaStateMap.delete(eid);
			removeEntity(world, eid);
		},
	};

	return widget;
}

/**
 * Checks if an entity is a textarea widget.
 */
export function isTextarea(_world: World, eid: Entity): boolean {
	return TextareaStore.isTextarea[eid] === 1;
}

/**
 * Ensures cursor is visible by scrolling if needed.
 */
function ensureCursorVisible(state: TextareaState): void {
	// Simple implementation: just ensure cursor line is in view
	// Could be enhanced with actual viewport tracking
	if (state.cursor.line < state.scrollLine) {
		state.scrollLine = state.cursor.line;
	}
}
