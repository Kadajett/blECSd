/**
 * Prompt Widget
 *
 * Provides a text input prompt dialog with submit/cancel key bindings,
 * validation support, and a Promise-based convenience API.
 *
 * @module widgets/prompt
 */

import { z } from 'zod';
import {
	BORDER_ASCII,
	BORDER_BOLD,
	BORDER_DOUBLE,
	BORDER_ROUNDED,
	BORDER_SINGLE,
	type BorderCharset,
	BorderType,
	setBorder,
	setBorderChars,
} from '../components/border';
import { setContent } from '../components/content';
import { setDimensions } from '../components/dimensions';
import { setPadding } from '../components/padding';
import { Position, setPosition } from '../components/position';
import { markDirty, setStyle, setVisible } from '../components/renderable';
import { addEntity, removeEntity } from '../core/ecs';
import type { Entity, World } from '../core/types';
import { parseColor } from '../utils/color';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

/**
 * Default foreground color for prompt text (white).
 */
export const DEFAULT_PROMPT_FG = 0xffffffff;

/**
 * Default background color for prompt (black).
 */
export const DEFAULT_PROMPT_BG = 0x000000ff;

/**
 * Default prompt width.
 */
export const DEFAULT_PROMPT_WIDTH = 40;

/**
 * Default prompt height.
 */
export const DEFAULT_PROMPT_HEIGHT = 5;

// =============================================================================
// TYPES
// =============================================================================

/**
 * Validator function for prompt input.
 * Returns true if valid, or a string error message if invalid.
 */
export type PromptValidator = (value: string) => boolean | string;

/**
 * Configuration for creating a Prompt widget.
 *
 * @example
 * ```typescript
 * const config: PromptConfig = {
 *   message: 'Enter your name:',
 *   defaultValue: 'World',
 *   placeholder: 'Type here...',
 *   width: 50,
 *   border: { type: 'line', ch: 'single' },
 * };
 * ```
 */
export interface PromptConfig {
	/** Message/label displayed above the input */
	readonly message?: string;
	/** Default value pre-filled in the input */
	readonly defaultValue?: string;
	/** Placeholder text shown when input is empty */
	readonly placeholder?: string;
	/** Validator function for input value */
	readonly validator?: PromptValidator;
	/** Width of the prompt dialog */
	readonly width?: number;
	/** Height of the prompt dialog */
	readonly height?: number;
	/** Left position */
	readonly left?: number;
	/** Top position */
	readonly top?: number;
	/** Foreground color (hex string or packed number) */
	readonly fg?: string | number;
	/** Background color (hex string or packed number) */
	readonly bg?: string | number;
	/** Border configuration */
	readonly border?: PromptBorderConfig;
	/** Padding (uniform number or per-side object) */
	readonly padding?: PromptPaddingConfig;
}

/**
 * Border configuration for prompt dialog.
 */
export interface PromptBorderConfig {
	/** Border type */
	readonly type?: 'line' | 'bg' | 'none';
	/** Border foreground color */
	readonly fg?: string | number;
	/** Border background color */
	readonly bg?: string | number;
	/** Border charset name or custom charset */
	readonly ch?: 'single' | 'double' | 'rounded' | 'bold' | 'ascii' | BorderCharset;
}

/**
 * Padding configuration for prompt dialog.
 */
export type PromptPaddingConfig =
	| number
	| {
			readonly left?: number;
			readonly top?: number;
			readonly right?: number;
			readonly bottom?: number;
	  };

/**
 * Prompt widget interface providing chainable methods.
 *
 * @example
 * ```typescript
 * import { createPrompt } from 'blecsd';
 *
 * const p = createPrompt(world, { message: 'Name?' });
 * p.show()
 *  .setValue('Alice')
 *  .onSubmit((val) => console.log('Submitted:', val))
 *  .onCancel(() => console.log('Cancelled'));
 * ```
 */
export interface PromptWidget {
	/** The underlying entity ID */
	readonly eid: Entity;

	// Visibility
	/** Shows the prompt dialog */
	show(): PromptWidget;
	/** Hides the prompt dialog */
	hide(): PromptWidget;

	// Position
	/** Moves the prompt by dx, dy */
	move(dx: number, dy: number): PromptWidget;
	/** Sets the absolute position */
	setPosition(x: number, y: number): PromptWidget;
	/** Centers the prompt within the given screen dimensions */
	center(screenWidth: number, screenHeight: number): PromptWidget;

	// Message
	/** Sets the prompt message/label */
	setMessage(message: string): PromptWidget;
	/** Gets the current prompt message */
	getMessage(): string;

	// Value
	/** Sets the input value */
	setValue(value: string): PromptWidget;
	/** Gets the current input value */
	getValue(): string;

	// Actions
	/** Triggers submit with the current value */
	submit(): PromptWidget;
	/** Triggers cancel */
	cancel(): PromptWidget;

	// Callbacks
	/** Registers a callback for submit (Enter key) */
	onSubmit(cb: (value: string) => void): PromptWidget;
	/** Registers a callback for cancel (Escape key) */
	onCancel(cb: () => void): PromptWidget;

	// Lifecycle
	/** Destroys the prompt widget and cleans up all state */
	destroy(): void;
}

// =============================================================================
// SCHEMAS
// =============================================================================

/**
 * Zod schema for prompt border configuration.
 */
export const PromptBorderConfigSchema = z
	.object({
		type: z.enum(['line', 'bg', 'none']).optional(),
		fg: z.union([z.string(), z.number()]).optional(),
		bg: z.union([z.string(), z.number()]).optional(),
		ch: z
			.union([
				z.enum(['single', 'double', 'rounded', 'bold', 'ascii']),
				z.custom<BorderCharset>((val) => {
					return (
						typeof val === 'object' &&
						val !== null &&
						'topLeft' in val &&
						'topRight' in val &&
						'bottomLeft' in val &&
						'bottomRight' in val &&
						'horizontal' in val &&
						'vertical' in val
					);
				}),
			])
			.optional(),
	})
	.optional();

/**
 * Zod schema for prompt padding configuration.
 */
export const PromptPaddingConfigSchema = z
	.union([
		z.number().int().nonnegative(),
		z.object({
			left: z.number().int().nonnegative().optional(),
			top: z.number().int().nonnegative().optional(),
			right: z.number().int().nonnegative().optional(),
			bottom: z.number().int().nonnegative().optional(),
		}),
	])
	.optional();

/**
 * Zod schema for prompt widget configuration.
 *
 * @example
 * ```typescript
 * import { PromptConfigSchema } from 'blecsd';
 *
 * const config = PromptConfigSchema.parse({
 *   message: 'Enter name:',
 *   width: 50,
 * });
 * ```
 */
export const PromptConfigSchema = z.object({
	message: z.string().default(''),
	defaultValue: z.string().default(''),
	placeholder: z.string().default(''),
	// validator is a function, cannot be validated by Zod, handled separately
	width: z.number().int().positive().default(DEFAULT_PROMPT_WIDTH),
	height: z.number().int().positive().default(DEFAULT_PROMPT_HEIGHT),
	left: z.number().int().default(0),
	top: z.number().int().default(0),
	fg: z.union([z.string(), z.number()]).optional(),
	bg: z.union([z.string(), z.number()]).optional(),
	border: PromptBorderConfigSchema,
	padding: PromptPaddingConfigSchema,
});

// =============================================================================
// COMPONENT TAG
// =============================================================================

/**
 * Prompt component marker for identifying prompt entities.
 *
 * @example
 * ```typescript
 * import { Prompt, isPrompt } from 'blecsd';
 *
 * if (isPrompt(eid)) {
 *   // Handle prompt-specific logic
 * }
 * ```
 */
export const Prompt = {
	/** Tag indicating this is a prompt widget (1 = yes) */
	isPrompt: new Uint8Array(DEFAULT_CAPACITY),
};

// =============================================================================
// INTERNAL STATE
// =============================================================================

/**
 * Internal state for a prompt entity.
 */
interface PromptState {
	message: string;
	value: string;
	placeholder: string;
	visible: boolean;
	validator: PromptValidator | undefined;
	submitCallbacks: Array<(value: string) => void>;
	cancelCallbacks: Array<() => void>;
}

/**
 * Maps entity IDs to their prompt state.
 * Complex state (strings, callbacks) cannot live in typed arrays.
 */
export const promptStateMap = new Map<Entity, PromptState>();

// =============================================================================
// INTERNAL HELPERS
// =============================================================================

/**
 * Gets the appropriate BorderCharset for a named style.
 */
function getBorderCharset(ch: 'single' | 'double' | 'rounded' | 'bold' | 'ascii'): BorderCharset {
	switch (ch) {
		case 'single':
			return BORDER_SINGLE;
		case 'double':
			return BORDER_DOUBLE;
		case 'rounded':
			return BORDER_ROUNDED;
		case 'bold':
			return BORDER_BOLD;
		case 'ascii':
			return BORDER_ASCII;
	}
}

/**
 * Converts border type string to BorderType enum.
 */
function borderTypeToEnum(type: 'line' | 'bg' | 'none'): BorderType {
	switch (type) {
		case 'line':
			return BorderType.Line;
		case 'bg':
			return BorderType.Background;
		case 'none':
			return BorderType.None;
	}
}

/**
 * Validated config type inferred from the Zod schema.
 */
interface ParsedPromptConfig {
	message: string;
	defaultValue: string;
	placeholder: string;
	width: number;
	height: number;
	left: number;
	top: number;
	fg?: string | number;
	bg?: string | number;
	border?: {
		type?: 'line' | 'bg' | 'none';
		fg?: string | number;
		bg?: string | number;
		ch?: 'single' | 'double' | 'rounded' | 'bold' | 'ascii' | BorderCharset;
	};
	padding?:
		| number
		| {
				left?: number;
				top?: number;
				right?: number;
				bottom?: number;
		  };
}

/**
 * Sets up style colors on a prompt entity.
 * @internal
 */
function setupPromptStyle(
	world: World,
	eid: Entity,
	fg: string | number | undefined,
	bg: string | number | undefined,
): void {
	if (fg === undefined && bg === undefined) return;

	setStyle(world, eid, {
		fg: fg !== undefined ? parseColor(fg) : undefined,
		bg: bg !== undefined ? parseColor(bg) : undefined,
	});
}

/**
 * Sets up border on a prompt entity.
 * @internal
 */
function setupPromptBorder(
	world: World,
	eid: Entity,
	borderConfig: NonNullable<ParsedPromptConfig['border']>,
): void {
	const borderType = borderConfig.type ? borderTypeToEnum(borderConfig.type) : BorderType.Line;

	setBorder(world, eid, {
		type: borderType,
		fg: borderConfig.fg !== undefined ? parseColor(borderConfig.fg) : undefined,
		bg: borderConfig.bg !== undefined ? parseColor(borderConfig.bg) : undefined,
	});

	if (borderConfig.ch) {
		const charset =
			typeof borderConfig.ch === 'string' ? getBorderCharset(borderConfig.ch) : borderConfig.ch;
		setBorderChars(world, eid, charset);
	}
}

/**
 * Sets up padding on a prompt entity.
 * @internal
 */
function setupPromptPadding(
	world: World,
	eid: Entity,
	paddingConfig: NonNullable<ParsedPromptConfig['padding']>,
): void {
	if (typeof paddingConfig === 'number') {
		setPadding(world, eid, {
			left: paddingConfig,
			top: paddingConfig,
			right: paddingConfig,
			bottom: paddingConfig,
		});
	} else {
		setPadding(world, eid, paddingConfig);
	}
}

/**
 * Updates the displayed content of a prompt entity.
 */
function updatePromptContent(world: World, eid: Entity): void {
	const state = promptStateMap.get(eid);
	if (!state) return;

	const displayValue = state.value || state.placeholder;
	const content = state.message ? `${state.message}\n${displayValue}` : displayValue;
	setContent(world, eid, content);
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Creates a Prompt widget.
 *
 * The Prompt widget provides a text input dialog with submit (Enter)
 * and cancel (Escape) key bindings, optional validation, and chainable API.
 *
 * @param world - The ECS world
 * @param config - Prompt configuration
 * @returns PromptWidget interface
 *
 * @example
 * ```typescript
 * import { createPrompt } from 'blecsd';
 *
 * const world = createWorld();
 * const p = createPrompt(world, {
 *   message: 'Enter your name:',
 *   defaultValue: 'World',
 *   border: { type: 'line', ch: 'single' },
 *   padding: 1,
 * });
 *
 * p.onSubmit((value) => console.log('Name:', value));
 * p.onCancel(() => console.log('Cancelled'));
 * ```
 */
export function createPrompt(world: World, config: PromptConfig = {}): PromptWidget {
	const parsed = PromptConfigSchema.parse(config) as ParsedPromptConfig;

	// Create entity
	const eid = addEntity(world);

	// Mark as prompt
	Prompt.isPrompt[eid] = 1;

	// Set up components
	setPosition(world, eid, parsed.left, parsed.top);
	setDimensions(world, eid, parsed.width, parsed.height);
	setupPromptStyle(world, eid, parsed.fg, parsed.bg);
	if (parsed.border) setupPromptBorder(world, eid, parsed.border);
	if (parsed.padding !== undefined) setupPromptPadding(world, eid, parsed.padding);

	// Initialize state
	promptStateMap.set(eid, {
		message: parsed.message,
		value: parsed.defaultValue,
		placeholder: parsed.placeholder,
		visible: true,
		validator: config.validator,
		submitCallbacks: [],
		cancelCallbacks: [],
	});

	// Set initial content
	updatePromptContent(world, eid);

	// Create widget interface
	return createPromptWidgetInterface(world, eid);
}

/**
 * Creates the PromptWidget interface for an entity.
 */
function createPromptWidgetInterface(world: World, eid: Entity): PromptWidget {
	const widget: PromptWidget = {
		get eid() {
			return eid;
		},

		show() {
			const state = promptStateMap.get(eid);
			if (state) {
				state.visible = true;
			}
			setVisible(world, eid, true);
			markDirty(world, eid);
			return widget;
		},

		hide() {
			const state = promptStateMap.get(eid);
			if (state) {
				state.visible = false;
			}
			setVisible(world, eid, false);
			markDirty(world, eid);
			return widget;
		},

		move(dx: number, dy: number) {
			const x = Position.x[eid] ?? 0;
			const y = Position.y[eid] ?? 0;
			setPosition(world, eid, x + dx, y + dy);
			markDirty(world, eid);
			return widget;
		},

		setPosition(x: number, y: number) {
			setPosition(world, eid, x, y);
			markDirty(world, eid);
			return widget;
		},

		center(screenWidth: number, screenHeight: number) {
			const state = promptStateMap.get(eid);
			if (!state) return widget;

			const parsed = PromptConfigSchema.parse({});
			const w = parsed.width;
			const h = parsed.height;
			const cx = Math.floor((screenWidth - w) / 2);
			const cy = Math.floor((screenHeight - h) / 2);
			setPosition(world, eid, cx, cy);
			markDirty(world, eid);
			return widget;
		},

		setMessage(message: string) {
			const state = promptStateMap.get(eid);
			if (state) {
				state.message = message;
				updatePromptContent(world, eid);
				markDirty(world, eid);
			}
			return widget;
		},

		getMessage() {
			const state = promptStateMap.get(eid);
			return state?.message ?? '';
		},

		setValue(value: string) {
			const state = promptStateMap.get(eid);
			if (state) {
				state.value = value;
				updatePromptContent(world, eid);
				markDirty(world, eid);
			}
			return widget;
		},

		getValue() {
			const state = promptStateMap.get(eid);
			return state?.value ?? '';
		},

		submit() {
			const state = promptStateMap.get(eid);
			if (!state) return widget;

			// Run validator if present
			if (state.validator) {
				const result = state.validator(state.value);
				if (result !== true && typeof result === 'string') {
					return widget;
				}
				if (result === false) {
					return widget;
				}
			}

			for (const cb of state.submitCallbacks) {
				cb(state.value);
			}
			return widget;
		},

		cancel() {
			const state = promptStateMap.get(eid);
			if (!state) return widget;

			for (const cb of state.cancelCallbacks) {
				cb();
			}
			return widget;
		},

		onSubmit(cb: (value: string) => void) {
			const state = promptStateMap.get(eid);
			if (state) {
				state.submitCallbacks.push(cb);
			}
			return widget;
		},

		onCancel(cb: () => void) {
			const state = promptStateMap.get(eid);
			if (state) {
				state.cancelCallbacks.push(cb);
			}
			return widget;
		},

		destroy() {
			Prompt.isPrompt[eid] = 0;
			promptStateMap.delete(eid);
			removeEntity(world, eid);
		},
	};

	return widget;
}

// =============================================================================
// CONVENIENCE FUNCTION
// =============================================================================

/**
 * Convenience function that creates a prompt and returns a Promise.
 *
 * Resolves with the submitted value (string) on Enter,
 * or null on Escape (cancel).
 *
 * @param world - The ECS world
 * @param message - The prompt message
 * @param options - Additional prompt configuration
 * @returns Promise that resolves with the input value or null if cancelled
 *
 * @example
 * ```typescript
 * import { prompt, createWorld } from 'blecsd';
 *
 * const world = createWorld();
 * const name = await prompt(world, 'Enter your name:', {
 *   defaultValue: 'World',
 * });
 *
 * if (name !== null) {
 *   console.log('Hello,', name);
 * } else {
 *   console.log('Cancelled');
 * }
 * ```
 */
export function prompt(
	world: World,
	message: string,
	options: Omit<PromptConfig, 'message'> = {},
): Promise<string | null> {
	return new Promise<string | null>((resolve) => {
		const p = createPrompt(world, { ...options, message });

		p.onSubmit((value: string) => {
			p.destroy();
			resolve(value);
		});

		p.onCancel(() => {
			p.destroy();
			resolve(null);
		});
	});
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Checks if an entity is a prompt widget.
 *
 * @param eid - The entity ID
 * @returns true if the entity is a prompt widget
 *
 * @example
 * ```typescript
 * import { isPrompt } from 'blecsd';
 *
 * if (isPrompt(entity)) {
 *   // Handle prompt-specific logic
 * }
 * ```
 */
export function isPrompt(eid: Entity): boolean {
	return Prompt.isPrompt[eid] === 1;
}

/**
 * Resets the prompt component store and state map. Useful for testing.
 *
 * @internal
 *
 * @example
 * ```typescript
 * import { resetPromptStore } from 'blecsd';
 *
 * afterEach(() => {
 *   resetPromptStore();
 * });
 * ```
 */
export function resetPromptStore(): void {
	Prompt.isPrompt.fill(0);
	promptStateMap.clear();
}

/**
 * Handles a key event for a prompt widget.
 *
 * Enter triggers submit, Escape triggers cancel.
 *
 * @param widget - The prompt widget
 * @param key - Key name (e.g. 'return', 'escape')
 * @returns true if the key was handled
 *
 * @example
 * ```typescript
 * import { createPrompt, handlePromptKey } from 'blecsd';
 *
 * const p = createPrompt(world, { message: 'Name?' });
 * handlePromptKey(p, 'return'); // triggers submit
 * handlePromptKey(p, 'escape'); // triggers cancel
 * ```
 */
export function handlePromptKey(widget: PromptWidget, key: string): boolean {
	if (key === 'return' || key === 'enter') {
		widget.submit();
		return true;
	}
	if (key === 'escape') {
		widget.cancel();
		return true;
	}
	return false;
}
