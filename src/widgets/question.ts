/**
 * Question Widget
 *
 * Provides a yes/no confirmation dialog widget with customizable button text,
 * keyboard bindings, and promise-based convenience functions.
 *
 * @module widgets/question
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
import { getDimensions, setDimensions } from '../components/dimensions';
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

/** Default foreground color for question widget */
export const DEFAULT_QUESTION_FG = 0xffffffff;

/** Default background color for question widget */
export const DEFAULT_QUESTION_BG = 0x00000000;

/** Default width of question dialog */
export const DEFAULT_QUESTION_WIDTH = 40;

/** Default height of question dialog */
export const DEFAULT_QUESTION_HEIGHT = 5;

// =============================================================================
// TYPES
// =============================================================================

/**
 * Border configuration for the question widget.
 */
export interface QuestionBorderConfig {
	/** Border type */
	readonly type?: 'line' | 'bg' | 'none';
	/** Foreground color for border (hex string or packed number) */
	readonly fg?: string | number;
	/** Background color for border (hex string or packed number) */
	readonly bg?: string | number;
	/** Border charset ('single', 'double', 'rounded', 'bold', 'ascii', or custom) */
	readonly ch?: 'single' | 'double' | 'rounded' | 'bold' | 'ascii' | BorderCharset;
}

/**
 * Padding configuration for the question widget.
 */
export type QuestionPaddingConfig =
	| number
	| {
			readonly left?: number;
			readonly top?: number;
			readonly right?: number;
			readonly bottom?: number;
	  };

/**
 * Configuration for creating a Question widget.
 */
export interface QuestionConfig {
	/** The question message to display */
	readonly message?: string;
	/** Text for the "Yes" button (default: 'Yes') */
	readonly yesText?: string;
	/** Text for the "No" button (default: 'No') */
	readonly noText?: string;
	/** Default selected answer (default: true = Yes) */
	readonly defaultAnswer?: boolean;
	/** Width of the dialog */
	readonly width?: number;
	/** Height of the dialog */
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
	readonly border?: QuestionBorderConfig;
	/** Padding configuration */
	readonly padding?: QuestionPaddingConfig;
}

/**
 * Question widget interface providing chainable methods.
 */
export interface QuestionWidget {
	/** The underlying entity ID */
	readonly eid: Entity;

	// Visibility
	/** Shows the question dialog */
	show(): QuestionWidget;
	/** Hides the question dialog */
	hide(): QuestionWidget;

	// Position
	/** Moves the dialog by dx, dy */
	move(dx: number, dy: number): QuestionWidget;
	/** Sets the absolute position */
	setPosition(x: number, y: number): QuestionWidget;
	/** Centers the dialog at the given screen dimensions */
	center(screenWidth: number, screenHeight: number): QuestionWidget;

	// Content
	/** Sets the question message */
	setMessage(message: string): QuestionWidget;
	/** Gets the current question message */
	getMessage(): string;

	// Selection
	/** Selects the "Yes" option */
	selectYes(): QuestionWidget;
	/** Selects the "No" option */
	selectNo(): QuestionWidget;
	/** Gets the currently selected answer */
	getSelectedAnswer(): boolean;

	// Actions
	/** Confirms the currently selected answer, triggering onConfirm callback */
	confirm(): QuestionWidget;
	/** Cancels the dialog, triggering onCancel callback (returns false) */
	cancel(): QuestionWidget;

	// Callbacks
	/** Registers a callback for when the dialog is confirmed */
	onConfirm(cb: (answer: boolean) => void): QuestionWidget;
	/** Registers a callback for when the dialog is cancelled */
	onCancel(cb: () => void): QuestionWidget;

	// Lifecycle
	/** Destroys the question widget and cleans up all state */
	destroy(): void;
}

// =============================================================================
// SCHEMAS
// =============================================================================

/**
 * Zod schema for question border configuration.
 */
const QuestionBorderConfigSchema = z
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
 * Zod schema for question padding configuration.
 */
const QuestionPaddingConfigSchema = z
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
 * Zod schema for question widget configuration.
 *
 * @example
 * ```typescript
 * import { QuestionConfigSchema } from 'blecsd';
 *
 * const config = QuestionConfigSchema.parse({
 *   message: 'Are you sure?',
 *   yesText: 'Confirm',
 *   noText: 'Cancel',
 * });
 * ```
 */
export const QuestionConfigSchema = z.object({
	message: z.string().default('Are you sure?'),
	yesText: z.string().default('Yes'),
	noText: z.string().default('No'),
	defaultAnswer: z.boolean().default(true),
	width: z.number().int().positive().default(DEFAULT_QUESTION_WIDTH),
	height: z.number().int().positive().default(DEFAULT_QUESTION_HEIGHT),
	left: z.number().int().default(0),
	top: z.number().int().default(0),
	fg: z.union([z.string(), z.number()]).optional(),
	bg: z.union([z.string(), z.number()]).optional(),
	border: QuestionBorderConfigSchema,
	padding: QuestionPaddingConfigSchema,
});

// =============================================================================
// COMPONENT TAG
// =============================================================================

/**
 * Question component marker for identifying question entities.
 *
 * @example
 * ```typescript
 * import { Question } from 'blecsd';
 *
 * if (Question.isQuestion[eid] === 1) {
 *   // Entity is a question widget
 * }
 * ```
 */
export const Question = {
	/** Tag indicating this is a question widget (1 = yes) */
	isQuestion: new Uint8Array(DEFAULT_CAPACITY),
};

// =============================================================================
// INTERNAL STATE
// =============================================================================

/**
 * Internal state for question widgets stored outside ECS typed arrays.
 */
interface QuestionState {
	message: string;
	yesText: string;
	noText: string;
	selectedAnswer: boolean;
	visible: boolean;
	confirmCallbacks: Array<(answer: boolean) => void>;
	cancelCallbacks: Array<() => void>;
}

/**
 * Maps entity IDs to their complex state (strings, callbacks, etc).
 */
export const questionStateMap = new Map<Entity, QuestionState>();

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
 * Updates the rendered content of a question widget.
 */
function updateQuestionContent(world: World, eid: Entity): void {
	const state = questionStateMap.get(eid);
	if (!state) return;

	const yesLabel = state.selectedAnswer ? `[${state.yesText}]` : ` ${state.yesText} `;
	const noLabel = state.selectedAnswer ? ` ${state.noText} ` : `[${state.noText}]`;
	const content = `${state.message}\n\n${yesLabel}  ${noLabel}`;
	setContent(world, eid, content);
}

/**
 * Parsed config type from QuestionConfigSchema.
 */
interface ParsedQuestionConfig {
	fg?: string | number | undefined;
	bg?: string | number | undefined;
	border?:
		| {
				type?: 'line' | 'bg' | 'none' | undefined;
				fg?: string | number | undefined;
				bg?: string | number | undefined;
				ch?: 'single' | 'double' | 'rounded' | 'bold' | 'ascii' | BorderCharset | undefined;
		  }
		| undefined;
	padding?:
		| number
		| {
				left?: number | undefined;
				top?: number | undefined;
				right?: number | undefined;
				bottom?: number | undefined;
		  }
		| undefined;
}

/**
 * Sets up style colors on a question entity.
 */
function setupQuestionStyle(world: World, eid: Entity, config: ParsedQuestionConfig): void {
	if (config.fg === undefined && config.bg === undefined) return;

	setStyle(world, eid, {
		fg: config.fg !== undefined ? parseColor(config.fg) : undefined,
		bg: config.bg !== undefined ? parseColor(config.bg) : undefined,
	});
}

/**
 * Sets up border on a question entity.
 */
function setupQuestionBorder(
	world: World,
	eid: Entity,
	borderConfig: NonNullable<ParsedQuestionConfig['border']>,
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
 * Sets up padding on a question entity.
 */
function setupQuestionPadding(
	world: World,
	eid: Entity,
	paddingConfig: NonNullable<ParsedQuestionConfig['padding']>,
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

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Creates a Question widget for yes/no confirmation dialogs.
 *
 * @param world - The ECS world
 * @param config - Question configuration
 * @returns QuestionWidget interface with chainable methods
 *
 * @example
 * ```typescript
 * import { createQuestion } from 'blecsd';
 *
 * const question = createQuestion(world, {
 *   message: 'Save changes?',
 *   yesText: 'Save',
 *   noText: 'Discard',
 *   defaultAnswer: true,
 * });
 *
 * question.onConfirm((answer) => {
 *   if (answer) saveFile();
 * });
 *
 * question.onCancel(() => {
 *   // User pressed Escape
 * });
 * ```
 */
export function createQuestion(world: World, config: QuestionConfig = {}): QuestionWidget {
	const parsed = QuestionConfigSchema.parse(config);

	// Create entity
	const eid = addEntity(world);

	// Mark as question
	Question.isQuestion[eid] = 1;

	// Set position and dimensions
	setPosition(world, eid, parsed.left, parsed.top);
	setDimensions(world, eid, parsed.width, parsed.height);

	// Set style, border, padding
	setupQuestionStyle(world, eid, parsed);
	if (parsed.border) setupQuestionBorder(world, eid, parsed.border);
	if (parsed.padding !== undefined) setupQuestionPadding(world, eid, parsed.padding);

	// Initialize internal state
	questionStateMap.set(eid, {
		message: parsed.message,
		yesText: parsed.yesText,
		noText: parsed.noText,
		selectedAnswer: parsed.defaultAnswer,
		visible: true,
		confirmCallbacks: [],
		cancelCallbacks: [],
	});

	// Set initial content
	updateQuestionContent(world, eid);

	return createQuestionWidgetInterface(world, eid);
}

/**
 * Creates the QuestionWidget interface for an entity.
 */
function createQuestionWidgetInterface(world: World, eid: Entity): QuestionWidget {
	const widget: QuestionWidget = {
		get eid() {
			return eid;
		},

		show() {
			const state = questionStateMap.get(eid);
			if (state) state.visible = true;
			setVisible(world, eid, true);
			markDirty(world, eid);
			return widget;
		},

		hide() {
			const state = questionStateMap.get(eid);
			if (state) state.visible = false;
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
			const dims = getDimensions(world, eid);
			if (!dims) return widget;
			const x = Math.floor((screenWidth - dims.width) / 2);
			const y = Math.floor((screenHeight - dims.height) / 2);
			setPosition(world, eid, x, y);
			markDirty(world, eid);
			return widget;
		},

		setMessage(message: string) {
			const state = questionStateMap.get(eid);
			if (state) {
				state.message = message;
				updateQuestionContent(world, eid);
				markDirty(world, eid);
			}
			return widget;
		},

		getMessage() {
			return questionStateMap.get(eid)?.message ?? '';
		},

		selectYes() {
			const state = questionStateMap.get(eid);
			if (state) {
				state.selectedAnswer = true;
				updateQuestionContent(world, eid);
				markDirty(world, eid);
			}
			return widget;
		},

		selectNo() {
			const state = questionStateMap.get(eid);
			if (state) {
				state.selectedAnswer = false;
				updateQuestionContent(world, eid);
				markDirty(world, eid);
			}
			return widget;
		},

		getSelectedAnswer() {
			return questionStateMap.get(eid)?.selectedAnswer ?? true;
		},

		confirm() {
			const state = questionStateMap.get(eid);
			if (state) {
				for (const cb of state.confirmCallbacks) {
					cb(state.selectedAnswer);
				}
			}
			return widget;
		},

		cancel() {
			const state = questionStateMap.get(eid);
			if (state) {
				for (const cb of state.cancelCallbacks) {
					cb();
				}
			}
			return widget;
		},

		onConfirm(cb: (answer: boolean) => void) {
			const state = questionStateMap.get(eid);
			if (state) {
				state.confirmCallbacks.push(cb);
			}
			return widget;
		},

		onCancel(cb: () => void) {
			const state = questionStateMap.get(eid);
			if (state) {
				state.cancelCallbacks.push(cb);
			}
			return widget;
		},

		destroy() {
			Question.isQuestion[eid] = 0;
			questionStateMap.delete(eid);
			removeEntity(world, eid);
		},
	};

	return widget;
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Displays a question dialog and returns a promise that resolves with the user's answer.
 *
 * Key bindings: y = Yes, n = No, Enter = confirm selection, Escape = cancel (false).
 *
 * @param world - The ECS world
 * @param message - The question message
 * @param options - Additional configuration options
 * @returns Promise resolving to true (yes) or false (no/cancel)
 *
 * @example
 * ```typescript
 * import { ask } from 'blecsd';
 *
 * const answer = await ask(world, 'Save changes before closing?', {
 *   yesText: 'Save',
 *   noText: 'Discard',
 * });
 *
 * if (answer) {
 *   saveFile();
 * }
 * ```
 */
export function ask(
	world: World,
	message: string,
	options: Partial<QuestionConfig> = {},
): Promise<boolean> {
	return new Promise<boolean>((resolve) => {
		const question = createQuestion(world, { ...options, message });

		question.onConfirm((answer) => {
			question.destroy();
			resolve(answer);
		});

		question.onCancel(() => {
			question.destroy();
			resolve(false);
		});
	});
}

/**
 * Shorthand for a simple yes/no confirmation dialog.
 *
 * Uses default "Yes"/"No" button text with yes as the default selection.
 *
 * @param world - The ECS world
 * @param message - The confirmation message
 * @returns Promise resolving to true (yes) or false (no/cancel)
 *
 * @example
 * ```typescript
 * import { confirm } from 'blecsd';
 *
 * if (await confirm(world, 'Delete this file?')) {
 *   deleteFile();
 * }
 * ```
 */
export function confirm(world: World, message: string): Promise<boolean> {
	return ask(world, message);
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Checks if an entity is a question widget.
 *
 * @param _world - The ECS world (unused, kept for API consistency)
 * @param eid - Entity ID
 * @returns true if the entity is a question widget
 *
 * @example
 * ```typescript
 * import { isQuestion } from 'blecsd';
 *
 * if (isQuestion(world, entity)) {
 *   // Handle question-specific logic
 * }
 * ```
 */
export function isQuestion(_world: World, eid: Entity): boolean {
	return Question.isQuestion[eid] === 1;
}

/**
 * Handles a key event for a question widget.
 *
 * Supported keys: y (select yes), n (select no), Enter (confirm), Escape (cancel).
 *
 * @param widget - The question widget
 * @param key - The key name
 * @returns true if the key was handled
 *
 * @example
 * ```typescript
 * import { handleQuestionKey } from 'blecsd';
 *
 * handleQuestionKey(questionWidget, 'y'); // Selects yes and confirms
 * handleQuestionKey(questionWidget, 'enter'); // Confirms current selection
 * handleQuestionKey(questionWidget, 'escape'); // Cancels
 * ```
 */
export function handleQuestionKey(widget: QuestionWidget, key: string): boolean {
	switch (key) {
		case 'y':
		case 'Y':
			widget.selectYes().confirm();
			return true;
		case 'n':
		case 'N':
			widget.selectNo().confirm();
			return true;
		case 'enter':
		case 'return':
			widget.confirm();
			return true;
		case 'escape':
			widget.cancel();
			return true;
		default:
			return false;
	}
}

/**
 * Resets the question component store and state map. Useful for testing.
 *
 * @internal
 */
export function resetQuestionStore(): void {
	Question.isQuestion.fill(0);
	questionStateMap.clear();
}
