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
import { setScrollable } from '../components/scrollable';
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
import { insertAt } from './textEditing';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Textbox configuration.
 */
export interface TextboxConfig {
	/** Initial value */
	readonly value?: string;
	/** Placeholder text when empty */
	readonly placeholder?: string;
	/** Maximum text length (0 = unlimited) */
	readonly maxLength?: number;
	/** Secret mode (password field) */
	readonly secret?: boolean;
	/** Mask character for secret mode */
	readonly censor?: string;
	/** Width of the textbox */
	readonly width?: number;
	/** Height (default: 1 for single line, +2 for border) */
	readonly height?: number;
	/** Left position */
	readonly left?: number;
	/** Top position */
	readonly top?: number;
	/** Foreground color */
	readonly fg?: string | number;
	/** Background color */
	readonly bg?: string | number;
	/** Border foreground color */
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
	handleKey(keyName: string): boolean;
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

	setTextInputConfig(eid, {
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
				emitValueChange(eid, value);
			}
			return widget;
		},

		handleKey(keyName: string): boolean {
			const state = textboxStateMap.get(eid);
			if (!state) return false;

			const cursor = { line: 0, column: state.cursorColumn };
			const action = handleTextInputKeyPress(world, eid, keyName, state.value);
			if (!action) return false;

			switch (action.type) {
				case 'insert': {
					const result = insertAt(state.value, cursor, action.char);
					state.value = result.text;
					state.cursorColumn = result.cursor.column;
					setCursorPos(world, eid, state.cursorColumn);
					emitValueChange(eid, state.value);
					return true;
				}

				case 'delete': {
					// Delete uses start/end positions which are linear offsets
					const startOffset = Math.min(action.start, action.end);
					const endOffset = Math.max(action.start, action.end);
					state.value = state.value.slice(0, startOffset) + state.value.slice(endOffset);
					state.cursorColumn = startOffset;
					setCursorPos(world, eid, state.cursorColumn);
					emitValueChange(eid, state.value);
					return true;
				}

				case 'moveCursor': {
					// moveCursor action.position is a linear offset
					state.cursorColumn = action.position;
					setCursorPos(world, eid, state.cursorColumn);
					return true;
				}

				case 'submit': {
					emitSubmit(eid, action.value);
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
			return onTextInputSubmit(eid, callback);
		},

		onChange(callback: (value: string) => void): () => void {
			return onTextInputChange(eid, callback);
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
