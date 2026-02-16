/**
 * Message Widget
 *
 * A temporary message/notification widget for displaying alerts, errors,
 * success messages, and other notifications. Supports auto-dismiss,
 * click/key dismiss, and styled message types.
 *
 * @module widgets/message
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
import { setContent, TextAlign, TextVAlign } from '../components/content';
import { getDimensions, setDimensions } from '../components/dimensions';
import { setFocusable } from '../components/focusable';
import { setPadding } from '../components/padding';
import { moveBy, setPosition } from '../components/position';
import { markDirty, setStyle, setVisible } from '../components/renderable';
import { addEntity, removeEntity } from '../core/ecs';
import type { Entity, World } from '../core/types';
import { parseColor } from '../utils/color';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Message type determines the visual style.
 */
export type MessageType = 'info' | 'warning' | 'error' | 'success';

/**
 * Position value that can be a number, percentage string, or keyword.
 */
export type PositionValue = number | `${number}%` | 'center' | 'left' | 'right' | 'top' | 'bottom';

/**
 * Border configuration for the message widget.
 */
export interface BorderConfig {
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
 * Style configuration for message types.
 */
export interface MessageStyleConfig {
	/** Foreground color */
	readonly fg?: string | number;
	/** Background color */
	readonly bg?: string | number;
	/** Border color */
	readonly borderFg?: string | number;
}

/**
 * Configuration for creating a Message widget.
 */
export interface MessageConfig {
	// Position
	/** Left position (absolute, percentage, or 'center') */
	readonly left?: PositionValue;
	/** Top position (absolute, percentage, or 'center') */
	readonly top?: PositionValue;
	/** Width (default: auto-calculated from content) */
	readonly width?: number;
	/** Height (default: auto-calculated from content) */
	readonly height?: number;

	// Content
	/** Message text */
	readonly content?: string;

	// Behavior
	/** Auto-dismiss timeout in milliseconds (0 = manual dismiss only, default: 3000) */
	readonly timeout?: number;
	/** Dismiss when clicked (default: true) */
	readonly dismissOnClick?: boolean;
	/** Dismiss on any key press (default: true) */
	readonly dismissOnKey?: boolean;

	// Style
	/** Message type for preset styling */
	readonly type?: MessageType;
	/** Custom foreground color (overrides type style) */
	readonly fg?: string | number;
	/** Custom background color (overrides type style) */
	readonly bg?: string | number;
	/** Border configuration */
	readonly border?: BorderConfig;
	/** Padding around content (default: 1) */
	readonly padding?: number;

	// Style overrides per type
	/** Custom styles for info messages */
	readonly infoStyle?: MessageStyleConfig;
	/** Custom styles for warning messages */
	readonly warningStyle?: MessageStyleConfig;
	/** Custom styles for error messages */
	readonly errorStyle?: MessageStyleConfig;
	/** Custom styles for success messages */
	readonly successStyle?: MessageStyleConfig;
}

/**
 * Message widget interface providing chainable methods.
 */
export interface MessageWidget {
	/** The underlying entity ID */
	readonly eid: Entity;

	// Content
	/** Sets the message text */
	setContent(text: string): MessageWidget;
	/** Gets the message text */
	getContent(): string;

	// Visibility
	/** Shows the message */
	show(): MessageWidget;
	/** Hides the message */
	hide(): MessageWidget;

	// Position
	/** Moves the message by dx, dy */
	move(dx: number, dy: number): MessageWidget;
	/** Sets the absolute position */
	setPosition(x: number, y: number): MessageWidget;
	/** Centers the message on screen */
	center(screenWidth: number, screenHeight: number): MessageWidget;

	// Dismissal
	/** Manually dismisses the message */
	dismiss(): void;
	/** Checks if the message has been dismissed */
	isDismissed(): boolean;

	// Events
	/** Called when the message is dismissed */
	onDismiss(callback: () => void): MessageWidget;

	// Lifecycle
	/** Destroys the widget and removes it from the world */
	destroy(): void;
}

// =============================================================================
// SCHEMAS
// =============================================================================

/**
 * Zod schema for position values.
 */
const PositionValueSchema = z.union([
	z.number(),
	z.string().regex(/^\d+(\.\d+)?%$/, 'Percentage must be in format "50%"'),
	z.enum(['center', 'left', 'right', 'top', 'bottom']),
]);

/**
 * Zod schema for border configuration.
 */
const BorderConfigSchema = z
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
 * Zod schema for message style configuration.
 */
const MessageStyleConfigSchema = z
	.object({
		fg: z.union([z.string(), z.number()]).optional(),
		bg: z.union([z.string(), z.number()]).optional(),
		borderFg: z.union([z.string(), z.number()]).optional(),
	})
	.optional();

/**
 * Zod schema for message widget configuration.
 */
export const MessageConfigSchema = z.object({
	// Position
	left: PositionValueSchema.optional(),
	top: PositionValueSchema.optional(),
	width: z.number().int().positive().optional(),
	height: z.number().int().positive().optional(),

	// Content
	content: z.string().optional(),

	// Behavior
	timeout: z.number().int().nonnegative().optional(),
	dismissOnClick: z.boolean().optional(),
	dismissOnKey: z.boolean().optional(),

	// Style
	type: z.enum(['info', 'warning', 'error', 'success']).optional(),
	fg: z.union([z.string(), z.number()]).optional(),
	bg: z.union([z.string(), z.number()]).optional(),
	border: BorderConfigSchema,
	padding: z.number().int().nonnegative().optional(),

	// Style overrides
	infoStyle: MessageStyleConfigSchema,
	warningStyle: MessageStyleConfigSchema,
	errorStyle: MessageStyleConfigSchema,
	successStyle: MessageStyleConfigSchema,
});

// =============================================================================
// CONSTANTS
// =============================================================================

/** Default timeout in milliseconds */
export const DEFAULT_MESSAGE_TIMEOUT = 3000;

/** Default padding */
export const DEFAULT_MESSAGE_PADDING = 1;

/** Default styles for each message type */
export const DEFAULT_MESSAGE_STYLES: Record<MessageType, MessageStyleConfig> = {
	info: {
		fg: '#ffffff',
		bg: '#2196f3',
		borderFg: '#64b5f6',
	},
	warning: {
		fg: '#000000',
		bg: '#ff9800',
		borderFg: '#ffb74d',
	},
	error: {
		fg: '#ffffff',
		bg: '#f44336',
		borderFg: '#e57373',
	},
	success: {
		fg: '#ffffff',
		bg: '#4caf50',
		borderFg: '#81c784',
	},
};

// =============================================================================
// COMPONENT TAG
// =============================================================================

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

/**
 * Message component marker for identifying message widget entities.
 */
export const Message = {
	/** Tag indicating this is a message widget (1 = yes) */
	isMessage: new Uint8Array(DEFAULT_CAPACITY),
	/** Dismiss on click enabled (1 = yes) */
	dismissOnClick: new Uint8Array(DEFAULT_CAPACITY),
	/** Dismiss on key enabled (1 = yes) */
	dismissOnKey: new Uint8Array(DEFAULT_CAPACITY),
	/** Message has been dismissed (1 = yes) */
	dismissed: new Uint8Array(DEFAULT_CAPACITY),
};

/**
 * Message state stored outside ECS for complex data.
 */
interface MessageState {
	/** Message content text */
	content: string;
	/** Dismiss callback */
	onDismissCallback?: () => void;
	/** Timer ID for auto-dismiss */
	timerId?: ReturnType<typeof setTimeout> | undefined;
}

/** Map of entity to message state */
const messageStateMap = new Map<Entity, MessageState>();

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
 * Gets the style for a message type.
 */
function getTypeStyle(type: MessageType, config: ValidatedMessageConfig): MessageStyleConfig {
	const customStyles: Record<MessageType, MessageStyleConfig | undefined> = {
		info: config.infoStyle,
		warning: config.warningStyle,
		error: config.errorStyle,
		success: config.successStyle,
	};

	return customStyles[type] ?? DEFAULT_MESSAGE_STYLES[type];
}

/**
 * Calculates dimensions based on content.
 */
function calculateDimensions(content: string, padding: number): { width: number; height: number } {
	const lines = content.split('\n');
	const maxLineLength = Math.max(...lines.map((l) => l.length), 10);
	const lineCount = lines.length;

	// Add padding and border space
	const width = maxLineLength + padding * 2 + 2; // +2 for borders
	const height = lineCount + padding * 2 + 2; // +2 for borders

	return { width, height };
}

/**
 * Validated config type from MessageConfigSchema.
 */
interface ValidatedMessageConfig {
	left?: string | number;
	top?: string | number;
	width?: number;
	height?: number;
	content?: string;
	timeout?: number;
	dismissOnClick?: boolean;
	dismissOnKey?: boolean;
	type?: MessageType;
	fg?: string | number;
	bg?: string | number;
	border?: {
		type?: 'line' | 'bg' | 'none';
		fg?: string | number;
		bg?: string | number;
		ch?: 'single' | 'double' | 'rounded' | 'bold' | 'ascii' | BorderCharset;
	};
	padding?: number;
	infoStyle?: MessageStyleConfig;
	warningStyle?: MessageStyleConfig;
	errorStyle?: MessageStyleConfig;
	successStyle?: MessageStyleConfig;
}

// =============================================================================
// SETUP HELPERS
// =============================================================================

/**
 * Sets up message-specific component options.
 * @internal
 */
function setupMessageOptions(eid: Entity, config: ValidatedMessageConfig): void {
	Message.isMessage[eid] = 1;
	Message.dismissOnClick[eid] = config.dismissOnClick !== false ? 1 : 0;
	Message.dismissOnKey[eid] = config.dismissOnKey !== false ? 1 : 0;
	Message.dismissed[eid] = 0;

	messageStateMap.set(eid, {
		content: config.content ?? '',
	});
}

/**
 * Sets up position and dimensions on the message entity.
 * @internal
 */
function setupPositionAndDimensions(
	world: World,
	eid: Entity,
	config: ValidatedMessageConfig,
): void {
	const content = config.content ?? '';
	const padding = config.padding ?? DEFAULT_MESSAGE_PADDING;
	const { width: calcWidth, height: calcHeight } = calculateDimensions(content, padding);

	const width = config.width ?? calcWidth;
	const height = config.height ?? calcHeight;

	setDimensions(world, eid, width, height);

	// Parse position
	let x = 0;
	let y = 0;

	if (config.left !== undefined) {
		if (typeof config.left === 'number') {
			x = config.left;
		} else if (config.left === 'center') {
			x = 0; // Will be centered later
		}
	}

	if (config.top !== undefined) {
		if (typeof config.top === 'number') {
			y = config.top;
		} else if (config.top === 'center') {
			y = 0; // Will be centered later
		}
	}

	setPosition(world, eid, x, y);
}

/**
 * Sets up style on the message entity.
 * @internal
 */
function setupStyle(world: World, eid: Entity, config: ValidatedMessageConfig): void {
	const type = config.type ?? 'info';
	const typeStyle = getTypeStyle(type, config);

	// Custom colors override type styles
	const fg = config.fg ?? typeStyle.fg;
	const bg = config.bg ?? typeStyle.bg;

	if (fg !== undefined || bg !== undefined) {
		setStyle(world, eid, {
			fg: fg !== undefined ? parseColor(fg) : undefined,
			bg: bg !== undefined ? parseColor(bg) : undefined,
		});
	}
}

/**
 * Sets up border on the message entity.
 * @internal
 */
function setupBorder(world: World, eid: Entity, config: ValidatedMessageConfig): void {
	const type = config.type ?? 'info';
	const typeStyle = getTypeStyle(type, config);

	const borderType = config.border?.type ? borderTypeToEnum(config.border.type) : BorderType.Line;
	const borderFg = config.border?.fg ?? typeStyle.borderFg;

	setBorder(world, eid, {
		type: borderType,
		fg: borderFg !== undefined ? parseColor(borderFg) : undefined,
		bg: config.border?.bg !== undefined ? parseColor(config.border.bg) : undefined,
	});

	const charset = config.border?.ch
		? typeof config.border.ch === 'string'
			? getBorderCharset(config.border.ch)
			: config.border.ch
		: BORDER_ROUNDED;
	setBorderChars(world, eid, charset);
}

/**
 * Sets up content on the message entity.
 * @internal
 */
function setupContent(world: World, eid: Entity, config: ValidatedMessageConfig): void {
	const content = config.content ?? '';
	setContent(world, eid, content, {
		align: TextAlign.Center,
		valign: TextVAlign.Middle,
	});
}

/**
 * Sets up auto-dismiss timer.
 * @internal
 */
function setupTimer(
	_world: World,
	eid: Entity,
	config: ValidatedMessageConfig,
	dismissFn: () => void,
): void {
	const timeout = config.timeout ?? DEFAULT_MESSAGE_TIMEOUT;
	if (timeout <= 0) return;

	const state = messageStateMap.get(eid);
	if (!state) return;

	state.timerId = setTimeout(() => {
		dismissFn();
	}, timeout);
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Creates a Message widget with the given configuration.
 *
 * The Message widget displays temporary notifications with auto-dismiss,
 * click/key dismiss, and styled message types (info, warning, error, success).
 *
 * @param world - The ECS world
 * @param config - Widget configuration
 * @returns The Message widget instance
 *
 * @example
 * ```typescript
 * import { createWorld } from '../core/ecs';
 * import { createMessage } from 'blecsd/widgets';
 *
 * const world = createWorld();
 *
 * // Create an info message
 * const msg = createMessage(world, {
 *   content: 'File saved successfully',
 *   type: 'success',
 *   timeout: 2000,
 * });
 *
 * // Center on screen
 * msg.center(80, 24);
 *
 * // Manual dismiss
 * msg.dismiss();
 * ```
 */
export function createMessage(world: World, config: MessageConfig = {}): MessageWidget {
	const validated = MessageConfigSchema.parse(config) as ValidatedMessageConfig;
	const eid = addEntity(world);

	// Set up components using helper functions
	setupMessageOptions(eid, validated);
	setupPositionAndDimensions(world, eid, validated);
	setupStyle(world, eid, validated);
	setupBorder(world, eid, validated);
	setupContent(world, eid, validated);

	// Set up padding
	const padding = validated.padding ?? DEFAULT_MESSAGE_PADDING;
	setPadding(world, eid, {
		left: padding,
		top: padding,
		right: padding,
		bottom: padding,
	});

	// Make focusable
	setFocusable(world, eid, { focusable: true });

	// Create dismiss function
	const dismiss = (): void => {
		if (Message.dismissed[eid] === 1) return;

		Message.dismissed[eid] = 1;
		setVisible(world, eid, false);

		const state = messageStateMap.get(eid);
		if (state) {
			if (state.timerId) {
				clearTimeout(state.timerId);
				state.timerId = undefined;
			}
			if (state.onDismissCallback) {
				state.onDismissCallback();
			}
		}
	};

	// Set up auto-dismiss timer
	setupTimer(world, eid, validated, dismiss);

	// Create the widget object with chainable methods
	const widget: MessageWidget = {
		eid,

		// Content
		setContent(text: string): MessageWidget {
			const state = messageStateMap.get(eid);
			if (state) {
				state.content = text;
			}
			setContent(world, eid, text, {
				align: TextAlign.Center,
				valign: TextVAlign.Middle,
			});
			markDirty(world, eid);
			return widget;
		},

		getContent(): string {
			const state = messageStateMap.get(eid);
			return state?.content ?? '';
		},

		// Visibility
		show(): MessageWidget {
			setVisible(world, eid, true);
			return widget;
		},

		hide(): MessageWidget {
			setVisible(world, eid, false);
			return widget;
		},

		// Position
		move(dx: number, dy: number): MessageWidget {
			moveBy(world, eid, dx, dy);
			markDirty(world, eid);
			return widget;
		},

		setPosition(x: number, y: number): MessageWidget {
			setPosition(world, eid, x, y);
			markDirty(world, eid);
			return widget;
		},

		center(screenWidth: number, screenHeight: number): MessageWidget {
			const dims = getDimensions(world, eid);
			const width = dims?.width ?? 20;
			const height = dims?.height ?? 5;

			const x = Math.floor((screenWidth - width) / 2);
			const y = Math.floor((screenHeight - height) / 2);

			setPosition(world, eid, x, y);
			markDirty(world, eid);
			return widget;
		},

		// Dismissal
		dismiss,

		isDismissed(): boolean {
			return Message.dismissed[eid] === 1;
		},

		// Events
		onDismiss(callback: () => void): MessageWidget {
			const state = messageStateMap.get(eid);
			if (state) {
				state.onDismissCallback = callback;
			}
			return widget;
		},

		// Lifecycle
		destroy(): void {
			const state = messageStateMap.get(eid);
			if (state?.timerId) {
				clearTimeout(state.timerId);
			}

			Message.isMessage[eid] = 0;
			Message.dismissOnClick[eid] = 0;
			Message.dismissOnKey[eid] = 0;
			Message.dismissed[eid] = 0;
			messageStateMap.delete(eid);
			removeEntity(world, eid);
		},
	};

	return widget;
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Shows an info message.
 *
 * @param world - The ECS world
 * @param text - Message text
 * @param options - Additional options
 * @returns The Message widget
 *
 * @example
 * ```typescript
 * const msg = showInfo(world, 'Operation completed');
 * ```
 */
export function showInfo(
	world: World,
	text: string,
	options: Omit<MessageConfig, 'content' | 'type'> = {},
): MessageWidget {
	return createMessage(world, { ...options, content: text, type: 'info' });
}

/**
 * Shows a warning message.
 *
 * @param world - The ECS world
 * @param text - Message text
 * @param options - Additional options
 * @returns The Message widget
 *
 * @example
 * ```typescript
 * const msg = showWarning(world, 'This action cannot be undone');
 * ```
 */
export function showWarning(
	world: World,
	text: string,
	options: Omit<MessageConfig, 'content' | 'type'> = {},
): MessageWidget {
	return createMessage(world, { ...options, content: text, type: 'warning' });
}

/**
 * Shows an error message.
 *
 * @param world - The ECS world
 * @param text - Message text
 * @param options - Additional options
 * @returns The Message widget
 *
 * @example
 * ```typescript
 * const msg = showError(world, 'Failed to save file');
 * ```
 */
export function showError(
	world: World,
	text: string,
	options: Omit<MessageConfig, 'content' | 'type'> = {},
): MessageWidget {
	return createMessage(world, { ...options, content: text, type: 'error' });
}

/**
 * Shows a success message.
 *
 * @param world - The ECS world
 * @param text - Message text
 * @param options - Additional options
 * @returns The Message widget
 *
 * @example
 * ```typescript
 * const msg = showSuccess(world, 'File saved successfully');
 * ```
 */
export function showSuccess(
	world: World,
	text: string,
	options: Omit<MessageConfig, 'content' | 'type'> = {},
): MessageWidget {
	return createMessage(world, { ...options, content: text, type: 'success' });
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Checks if an entity is a message widget.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @param eid - The entity ID
 * @returns true if the entity is a message widget
 *
 * @example
 * ```typescript
 * import { isMessage } from 'blecsd/widgets';
 *
 * if (isMessage(world, entity)) {
 *   // Handle message-specific logic
 * }
 * ```
 */
export function isMessage(_world: World, eid: Entity): boolean {
	return Message.isMessage[eid] === 1;
}

/**
 * Checks if dismiss on click is enabled for a message widget.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @param eid - The entity ID
 * @returns true if dismiss on click is enabled
 */
export function isDismissOnClick(_world: World, eid: Entity): boolean {
	return Message.dismissOnClick[eid] === 1;
}

/**
 * Checks if dismiss on key is enabled for a message widget.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @param eid - The entity ID
 * @returns true if dismiss on key is enabled
 */
export function isDismissOnKey(_world: World, eid: Entity): boolean {
	return Message.dismissOnKey[eid] === 1;
}

/**
 * Handles click event on a message widget.
 * Dismisses the message if dismissOnClick is enabled.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if the message was dismissed
 */
export function handleMessageClick(world: World, eid: Entity): boolean {
	if (!isMessage(world, eid)) return false;
	if (!isDismissOnClick(world, eid)) return false;
	if (Message.dismissed[eid] === 1) return false;

	// Find and dismiss the message
	const state = messageStateMap.get(eid);
	if (state) {
		Message.dismissed[eid] = 1;
		setVisible(world, eid, false);

		if (state.timerId) {
			clearTimeout(state.timerId);
			state.timerId = undefined;
		}
		if (state.onDismissCallback) {
			state.onDismissCallback();
		}
	}

	return true;
}

/**
 * Handles key event on a message widget.
 * Dismisses the message if dismissOnKey is enabled.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if the message was dismissed
 */
export function handleMessageKey(world: World, eid: Entity): boolean {
	if (!isMessage(world, eid)) return false;
	if (!isDismissOnKey(world, eid)) return false;
	if (Message.dismissed[eid] === 1) return false;

	// Find and dismiss the message
	const state = messageStateMap.get(eid);
	if (state) {
		Message.dismissed[eid] = 1;
		setVisible(world, eid, false);

		if (state.timerId) {
			clearTimeout(state.timerId);
			state.timerId = undefined;
		}
		if (state.onDismissCallback) {
			state.onDismissCallback();
		}
	}

	return true;
}

/**
 * Resets the Message component store. Useful for testing.
 * @internal
 */
export function resetMessageStore(): void {
	// Clear all timers
	for (const state of messageStateMap.values()) {
		if (state.timerId) {
			clearTimeout(state.timerId);
		}
	}

	Message.isMessage.fill(0);
	Message.dismissOnClick.fill(0);
	Message.dismissOnKey.fill(0);
	Message.dismissed.fill(0);
	messageStateMap.clear();
}
