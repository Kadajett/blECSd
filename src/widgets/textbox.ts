/**
 * Textbox Widget - Single-line text input
 * @module widgets/textbox
 */

import { z } from 'zod';
import { setDimensions } from '../components/dimensions';
import { blur, focus, setFocusable } from '../components/focusable';
import { setPadding } from '../components/padding';
import { setPosition } from '../components/position';
import { setStyle } from '../components/renderable';
import { setScrollable } from '../systems/scrollableSystem';
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
} from '../components/textInput';
import { addEntity, removeEntity } from '../core/ecs';
import type { Entity, World } from '../core/types';
import { parseColor } from '../utils/color';
import {
	type CursorPosition,
	deleteWordBackward,
	deleteWordForward,
	findWordEnd,
	findWordStart,
	insertAt,
} from './textEditing';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Textbox configuration.
 *
 * @example
 * ```typescript
 * // Regular text input
 * const textbox = createTextbox(world, eid, {
 *   left: 10,
 *   top: 5,
 *   width: 30,
 *   value: 'Initial text',
 *   placeholder: 'Enter text here',
 *   maxLength: 50
 * });
 *
 * // Password input
 * const password = createTextbox(world, eid, {
 *   left: 10,
 *   top: 10,
 *   width: 30,
 *   secret: true,
 *   censor: '●',
 *   placeholder: 'Enter password'
 * });
 * ```
 */
export interface TextboxConfig {
	/**
	 * Initial text value displayed in the textbox
	 * @default '' (empty string)
	 */
	readonly value?: string;
	/**
	 * Placeholder text shown when textbox is empty
	 * @default undefined (no placeholder)
	 */
	readonly placeholder?: string;
	/**
	 * Maximum number of characters allowed (0 = unlimited)
	 * @default 0 (unlimited)
	 */
	readonly maxLength?: number;
	/**
	 * Enable password/secret mode (masks input characters)
	 * @default false
	 */
	readonly secret?: boolean;
	/**
	 * Character used to mask input in secret mode (single character)
	 * @default '*'
	 */
	readonly censor?: string;
	/**
	 * Width of the textbox in cells (including border)
	 * @default 20
	 */
	readonly width?: number;
	/**
	 * Height of the textbox in cells (1 for content + 2 for border = 3)
	 * @default 3
	 */
	readonly height?: number;
	/**
	 * Left (X) position in cells
	 * @default 0
	 */
	readonly left?: number;
	/**
	 * Top (Y) position in cells
	 * @default 0
	 */
	readonly top?: number;
	/**
	 * Foreground (text) color (hex string like "#RRGGBB" or packed RGBA number)
	 * @default Terminal default foreground
	 */
	readonly fg?: string | number;
	/**
	 * Background color (hex string like "#RRGGBB" or packed RGBA number)
	 * @default Terminal default background
	 */
	readonly bg?: string | number;
	/**
	 * Border foreground color (hex string like "#RRGGBB" or packed RGBA number)
	 * @default Same as fg
	 */
	readonly borderFg?: string | number;
}

/**
 * Textbox widget interface.
 */
export interface TextboxWidget {
	readonly eid: Entity;

	/** Gets the current value */
	getValue(): string;
	/** Sets the value */
	setValue(value: string): TextboxWidget;
	/** Handles a key press */
	handleKey(keyName: string, ctrl?: boolean): boolean;
	/** Focuses the textbox */
	focus(): TextboxWidget;
	/** Blurs the textbox */
	blur(): TextboxWidget;
	/** Registers submit callback */
	onSubmit(callback: (value: string) => void): () => void;
	/** Registers change callback */
	onChange(callback: (value: string) => void): () => void;
	/** Destroys the widget */
	destroy(): void;
}

// =============================================================================
// SCHEMA
// =============================================================================

export const TextboxConfigSchema = z.object({
	value: z.string().optional().default(''),
	placeholder: z.string().optional(),
	maxLength: z.number().int().nonnegative().optional().default(0),
	secret: z.boolean().optional().default(false),
	censor: z.string().length(1).optional().default('*'),
	width: z.number().int().positive().optional().default(20),
	height: z.number().int().positive().optional().default(3),
	left: z.number().int().nonnegative().optional().default(0),
	top: z.number().int().nonnegative().optional().default(0),
	fg: z.union([z.string(), z.number()]).optional(),
	bg: z.union([z.string(), z.number()]).optional(),
	borderFg: z.union([z.string(), z.number()]).optional(),
});

// =============================================================================
// COMPONENT TAG
// =============================================================================

const DEFAULT_CAPACITY = 10000;

export const TextboxStore = {
	isTextbox: new Uint8Array(DEFAULT_CAPACITY),
};

interface TextboxState {
	value: string;
	cursorColumn: number;
	scrollOffset: number;
}

const textboxStateMap = new Map<Entity, TextboxState>();

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Creates a Textbox widget.
 *
 * @param world - The ECS world
 * @param config - Textbox configuration
 * @returns The Textbox widget
 *
 * @example
 * ```typescript
 * import { createWorld } from '../core/ecs';
 * import { createTextbox } from 'blecsd/widgets';
 *
 * const world = createWorld();
 * const textbox = createTextbox(world, {
 *   value: 'Hello',
 *   placeholder: 'Enter text...',
 *   width: 30,
 * });
 *
 * textbox.onSubmit((value) => {
 *   console.log('Submitted:', value);
 * });
 * ```
 */
export function createTextbox(world: World, config: TextboxConfig = {}): TextboxWidget {
	const validated = TextboxConfigSchema.parse(config);
	const eid = addEntity(world);

	// Setup components
	TextboxStore.isTextbox[eid] = 1;
	textboxStateMap.set(eid, {
		value: validated.value,
		cursorColumn: validated.value.length,
		scrollOffset: 0,
	});

	// Attach text input behavior FIRST before setting cursor
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
		secret: validated.secret,
		censor: validated.censor,
		placeholder: validated.placeholder ?? '',
		maxLength: validated.maxLength,
		multiline: false,
	});

	// Set initial cursor position to end of value
	setCursorPos(world, eid, validated.value.length);

	// Start in focused/editing state for immediate input handling
	focusTextInput(world, eid);
	startEditingTextInput(world, eid);

	// Setup scrolling
	setScrollable(world, eid, {
		scrollWidth: validated.value.length,
		viewportWidth: validated.width - 2, // Account for padding
	});

	setFocusable(world, eid, { focusable: true });

	const widget: TextboxWidget = {
		eid,

		getValue(): string {
			const state = textboxStateMap.get(eid);
			return state?.value ?? '';
		},

		setValue(value: string): TextboxWidget {
			const state = textboxStateMap.get(eid);
			if (state) {
				state.value = value;
				state.cursorColumn = value.length;
				setCursorPos(world, eid, state.cursorColumn);
				emitValueChange(world, eid, value);
			}
			return widget;
		},

		handleKey(keyName: string, ctrl = false): boolean {
			const state = textboxStateMap.get(eid);
			if (!state) return false;

			const cursor = { line: 0, column: state.cursorColumn };
			const action = handleTextInputKeyPress(world, eid, keyName, state.value, ctrl);
			if (!action) return false;

			switch (action.type) {
				case 'insert': {
					const result = insertAt(state.value, cursor, action.char);
					state.value = result.text;
					state.cursorColumn = result.cursor.column;
					setCursorPos(world, eid, state.cursorColumn);
					emitValueChange(world, eid, state.value);
					return true;
				}

				case 'delete': {
					// Delete uses start/end positions which are linear offsets
					const startOffset = Math.min(action.start, action.end);
					const endOffset = Math.max(action.start, action.end);
					state.value = state.value.slice(0, startOffset) + state.value.slice(endOffset);
					state.cursorColumn = startOffset;
					setCursorPos(world, eid, state.cursorColumn);
					emitValueChange(world, eid, state.value);
					return true;
				}

				case 'moveCursor': {
					// moveCursor action.position is a linear offset
					state.cursorColumn = action.position;
					setCursorPos(world, eid, state.cursorColumn);
					return true;
				}

				case 'moveWordLeft': {
					const cursorPos: CursorPosition = { line: 0, column: state.cursorColumn };
					const wordStart = findWordStart(action.text, cursorPos);
					state.cursorColumn = wordStart.column;
					setCursorPos(world, eid, state.cursorColumn);
					return true;
				}

				case 'moveWordRight': {
					const cursorPos: CursorPosition = { line: 0, column: state.cursorColumn };
					const wordEnd = findWordEnd(action.text, cursorPos);
					state.cursorColumn = wordEnd.column;
					setCursorPos(world, eid, state.cursorColumn);
					return true;
				}

				case 'deleteWordBackward': {
					const cursorPos: CursorPosition = { line: 0, column: state.cursorColumn };
					const result = deleteWordBackward(action.text, cursorPos);
					state.value = result.text;
					state.cursorColumn = result.cursor.column;
					setCursorPos(world, eid, state.cursorColumn);
					emitValueChange(world, eid, state.value);
					return true;
				}

				case 'deleteWordForward': {
					const cursorPos: CursorPosition = { line: 0, column: state.cursorColumn };
					const result = deleteWordForward(action.text, cursorPos);
					state.value = result.text;
					state.cursorColumn = result.cursor.column;
					setCursorPos(world, eid, state.cursorColumn);
					emitValueChange(world, eid, state.value);
					return true;
				}

				case 'submit': {
					emitSubmit(world, eid, action.value);
					return true;
				}

				case 'cancel': {
					return true;
				}

				default:
					return false;
			}
		},

		focus(): TextboxWidget {
			focus(world, eid);
			return widget;
		},

		blur(): TextboxWidget {
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
			TextboxStore.isTextbox[eid] = 0;
			textboxStateMap.delete(eid);
			removeEntity(world, eid);
		},
	};

	return widget;
}

/**
 * Checks if an entity is a textbox widget.
 */
export function isTextbox(_world: World, eid: Entity): boolean {
	return TextboxStore.isTextbox[eid] === 1;
}
