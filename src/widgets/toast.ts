/**
 * Toast Widget
 *
 * Non-blocking notification widget that auto-dismisses. Multiple toasts can be
 * stacked and automatically positioned.
 *
 * @module widgets/toast
 */

import { z } from 'zod';
import {
	BORDER_ROUNDED,
	BORDER_SINGLE,
	type BorderCharset,
	BorderType,
	setBorder,
	setBorderChars,
} from '../components/border';
import { setContent, TextAlign, TextVAlign } from '../components/content';
import { getDimensions, setDimensions } from '../components/dimensions';
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
 * Toast type determines the visual style.
 */
export type ToastType = 'info' | 'success' | 'warning' | 'error';

/**
 * Toast position on screen.
 */
export type ToastPosition =
	| 'top-right'
	| 'top-center'
	| 'top-left'
	| 'bottom-right'
	| 'bottom-center'
	| 'bottom-left';

/**
 * Border configuration for the toast widget.
 */
export interface ToastBorderConfig {
	/** Border type */
	readonly type?: 'line' | 'bg' | 'none';
	/** Foreground color for border (hex string or packed number) */
	readonly fg?: string | number;
	/** Background color for border (hex string or packed number) */
	readonly bg?: string | number;
	/** Border charset ('single', 'rounded', or custom) */
	readonly ch?: 'single' | 'rounded' | BorderCharset;
}

/**
 * Style configuration for toast types.
 */
export interface ToastStyleConfig {
	/** Foreground color */
	readonly fg?: string | number;
	/** Background color */
	readonly bg?: string | number;
	/** Border color */
	readonly borderFg?: string | number;
}

/**
 * Configuration for creating a Toast widget.
 */
export interface ToastConfig {
	/** Toast message text */
	readonly content?: string;
	/** Toast type for preset styling */
	readonly type?: ToastType;
	/** Auto-dismiss timeout in milliseconds (0 = manual dismiss only, default: 3000) */
	readonly timeout?: number;
	/** Position on screen (default: 'top-right') */
	readonly position?: ToastPosition;
	/** Custom foreground color (overrides type style) */
	readonly fg?: string | number;
	/** Custom background color (overrides type style) */
	readonly bg?: string | number;
	/** Border configuration */
	readonly border?: ToastBorderConfig;
	/** Padding around content (default: 1) */
	readonly padding?: number;
	/** Width (auto-calculated from content if not specified) */
	readonly width?: number;
	/** Custom styles for info toasts */
	readonly infoStyle?: ToastStyleConfig;
	/** Custom styles for success toasts */
	readonly successStyle?: ToastStyleConfig;
	/** Custom styles for warning toasts */
	readonly warningStyle?: ToastStyleConfig;
	/** Custom styles for error toasts */
	readonly errorStyle?: ToastStyleConfig;
}

/**
 * Toast widget interface providing chainable methods.
 */
export interface ToastWidget {
	/** The underlying entity ID */
	readonly eid: Entity;

	// Content
	/** Sets the toast text */
	setContent(text: string): ToastWidget;
	/** Gets the toast text */
	getContent(): string;

	// Visibility
	/** Shows the toast */
	show(): ToastWidget;
	/** Hides the toast */
	hide(): ToastWidget;

	// Position
	/** Moves the toast by dx, dy */
	move(dx: number, dy: number): ToastWidget;

	// Dismissal
	/** Manually dismisses the toast */
	dismiss(): void;
	/** Checks if the toast has been dismissed */
	isDismissed(): boolean;

	// Events
	/** Called when the toast is dismissed */
	onDismiss(callback: () => void): ToastWidget;

	// Lifecycle
	/** Destroys the widget and removes it from the world */
	destroy(): void;
}

// =============================================================================
// SCHEMAS
// =============================================================================

/**
 * Zod schema for border configuration.
 */
const ToastBorderConfigSchema = z
	.object({
		type: z.enum(['line', 'bg', 'none']).optional(),
		fg: z.union([z.string(), z.number()]).optional(),
		bg: z.union([z.string(), z.number()]).optional(),
		ch: z
			.union([
				z.enum(['single', 'rounded']),
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
 * Zod schema for toast style configuration.
 */
const ToastStyleConfigSchema = z
	.object({
		fg: z.union([z.string(), z.number()]).optional(),
		bg: z.union([z.string(), z.number()]).optional(),
		borderFg: z.union([z.string(), z.number()]).optional(),
	})
	.optional();

/**
 * Zod schema for toast widget configuration.
 */
export const ToastConfigSchema = z.object({
	content: z.string().optional(),
	type: z.enum(['info', 'success', 'warning', 'error']).optional(),
	timeout: z.number().int().nonnegative().optional(),
	position: z
		.enum(['top-right', 'top-center', 'top-left', 'bottom-right', 'bottom-center', 'bottom-left'])
		.optional(),
	fg: z.union([z.string(), z.number()]).optional(),
	bg: z.union([z.string(), z.number()]).optional(),
	border: ToastBorderConfigSchema,
	padding: z.number().int().nonnegative().optional(),
	width: z.number().int().positive().optional(),
	infoStyle: ToastStyleConfigSchema,
	successStyle: ToastStyleConfigSchema,
	warningStyle: ToastStyleConfigSchema,
	errorStyle: ToastStyleConfigSchema,
});

// =============================================================================
// CONSTANTS
// =============================================================================

/** Default timeout in milliseconds */
export const DEFAULT_TOAST_TIMEOUT = 3000;

/** Default padding */
export const DEFAULT_TOAST_PADDING = 1;

/** Spacing between stacked toasts */
export const TOAST_STACK_SPACING = 1;

/** Default styles for each toast type */
export const DEFAULT_TOAST_STYLES: Record<ToastType, ToastStyleConfig> = {
	info: {
		fg: '#ffffff',
		bg: '#2196f3',
		borderFg: '#64b5f6',
	},
	success: {
		fg: '#ffffff',
		bg: '#4caf50',
		borderFg: '#81c784',
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
};

// =============================================================================
// COMPONENT TAG
// =============================================================================

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

/**
 * Toast component marker for identifying toast widget entities.
 */
export const Toast = {
	/** Tag indicating this is a toast widget (1 = yes) */
	isToast: new Uint8Array(DEFAULT_CAPACITY),
	/** Toast has been dismissed (1 = yes) */
	dismissed: new Uint8Array(DEFAULT_CAPACITY),
};

/**
 * Toast state stored outside ECS for complex data.
 */
interface ToastState {
	/** Toast content text */
	content: string;
	/** Toast position */
	position: ToastPosition;
	/** Dismiss callback */
	onDismissCallback?: () => void;
	/** Timer ID for auto-dismiss */
	timerId?: ReturnType<typeof setTimeout> | undefined;
}

/** Map of entity to toast state */
const toastStateMap = new Map<Entity, ToastState>();

/** Active toasts grouped by position */
const toastsByPosition: Record<ToastPosition, Set<Entity>> = {
	'top-right': new Set(),
	'top-center': new Set(),
	'top-left': new Set(),
	'bottom-right': new Set(),
	'bottom-center': new Set(),
	'bottom-left': new Set(),
};

// =============================================================================
// INTERNAL HELPERS
// =============================================================================

/**
 * Gets the appropriate BorderCharset for a named style.
 */
function getBorderCharset(ch: 'single' | 'rounded'): BorderCharset {
	switch (ch) {
		case 'single':
			return BORDER_SINGLE;
		case 'rounded':
			return BORDER_ROUNDED;
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
 * Gets the style for a toast type.
 */
function getTypeStyle(type: ToastType, config: ValidatedToastConfig): ToastStyleConfig {
	const customStyles: Record<ToastType, ToastStyleConfig | undefined> = {
		info: config.infoStyle,
		success: config.successStyle,
		warning: config.warningStyle,
		error: config.errorStyle,
	};

	return customStyles[type] ?? DEFAULT_TOAST_STYLES[type];
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
 * Validated config type from ToastConfigSchema.
 */
interface ValidatedToastConfig {
	content?: string;
	type?: ToastType;
	timeout?: number;
	position?: ToastPosition;
	fg?: string | number;
	bg?: string | number;
	border?: {
		type?: 'line' | 'bg' | 'none';
		fg?: string | number;
		bg?: string | number;
		ch?: 'single' | 'rounded' | BorderCharset;
	};
	padding?: number;
	width?: number;
	infoStyle?: ToastStyleConfig;
	successStyle?: ToastStyleConfig;
	warningStyle?: ToastStyleConfig;
	errorStyle?: ToastStyleConfig;
}

/**
 * Repositions all toasts in a stack.
 */
function repositionToastStack(
	world: World,
	position: ToastPosition,
	screenWidth: number,
	screenHeight: number,
): void {
	const toasts = Array.from(toastsByPosition[position]);
	let currentY = 0;

	if (position.startsWith('bottom')) {
		currentY = screenHeight;
	}

	for (const eid of toasts) {
		const dims = getDimensions(world, eid);
		const width = dims?.width ?? 0;
		const height = dims?.height ?? 0;

		let x = 0;
		let y = 0;

		// Calculate X based on horizontal position
		if (position.endsWith('right')) {
			x = screenWidth - width;
		} else if (position.endsWith('center')) {
			x = Math.floor((screenWidth - width) / 2);
		} else {
			x = 0; // left
		}

		// Calculate Y based on vertical position
		if (position.startsWith('top')) {
			y = currentY;
			currentY += height + TOAST_STACK_SPACING;
		} else {
			// bottom
			currentY -= height;
			y = currentY;
			currentY -= TOAST_STACK_SPACING;
		}

		setPosition(world, eid, x, y);
		markDirty(world, eid);
	}
}

// =============================================================================
// SETUP HELPERS
// =============================================================================

/**
 * Sets up toast-specific component options.
 */
function setupToastOptions(
	eid: Entity,
	config: ValidatedToastConfig,
	position: ToastPosition,
): void {
	Toast.isToast[eid] = 1;
	Toast.dismissed[eid] = 0;

	toastStateMap.set(eid, {
		content: config.content ?? '',
		position,
	});

	toastsByPosition[position].add(eid);
}

/**
 * Sets up position and dimensions on the toast entity.
 */
function setupPositionAndDimensions(world: World, eid: Entity, config: ValidatedToastConfig): void {
	const content = config.content ?? '';
	const padding = config.padding ?? DEFAULT_TOAST_PADDING;
	const { width: calcWidth, height: calcHeight } = calculateDimensions(content, padding);

	const width = config.width ?? calcWidth;
	const height = calcHeight;

	setDimensions(world, eid, width, height);
	setPosition(world, eid, 0, 0); // Will be repositioned by stack
}

/**
 * Sets up style on the toast entity.
 */
function setupStyle(world: World, eid: Entity, config: ValidatedToastConfig): void {
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
 * Sets up border on the toast entity.
 */
function setupBorder(world: World, eid: Entity, config: ValidatedToastConfig): void {
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
 * Sets up content on the toast entity.
 */
function setupContent(world: World, eid: Entity, config: ValidatedToastConfig): void {
	const content = config.content ?? '';
	setContent(world, eid, content, {
		align: TextAlign.Center,
		valign: TextVAlign.Middle,
	});
}

/**
 * Sets up auto-dismiss timer.
 */
function setupTimer(
	_world: World,
	eid: Entity,
	config: ValidatedToastConfig,
	dismissFn: () => void,
): void {
	const timeout = config.timeout ?? DEFAULT_TOAST_TIMEOUT;
	if (timeout <= 0) return;

	const state = toastStateMap.get(eid);
	if (!state) return;

	state.timerId = setTimeout(() => {
		dismissFn();
	}, timeout);
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Creates a Toast widget with the given configuration.
 *
 * The Toast widget displays non-blocking notifications with auto-dismiss.
 * Multiple toasts can be stacked at various positions on the screen.
 *
 * @param world - The ECS world
 * @param config - Widget configuration
 * @param screenWidth - Screen width for positioning (default: 80)
 * @param screenHeight - Screen height for positioning (default: 24)
 * @returns The Toast widget instance
 *
 * @example
 * ```typescript
 * import { createWorld } from '../core/ecs';
 * import { createToast } from 'blecsd/widgets';
 *
 * const world = createWorld();
 *
 * // Create a success toast
 * const toast = createToast(world, {
 *   content: 'File saved successfully',
 *   type: 'success',
 *   position: 'top-right',
 *   timeout: 2000,
 * }, 80, 24);
 *
 * // Manual dismiss
 * toast.dismiss();
 * ```
 */
export function createToast(
	world: World,
	config: ToastConfig = {},
	screenWidth: number = 80,
	screenHeight: number = 24,
): ToastWidget {
	const validated = ToastConfigSchema.parse(config) as ValidatedToastConfig;
	const eid = addEntity(world);
	const position = validated.position ?? 'top-right';

	// Set up components using helper functions
	setupToastOptions(eid, validated, position);
	setupPositionAndDimensions(world, eid, validated);
	setupStyle(world, eid, validated);
	setupBorder(world, eid, validated);
	setupContent(world, eid, validated);

	// Set up padding
	const padding = validated.padding ?? DEFAULT_TOAST_PADDING;
	setPadding(world, eid, {
		left: padding,
		top: padding,
		right: padding,
		bottom: padding,
	});

	// Reposition all toasts in this stack
	repositionToastStack(world, position, screenWidth, screenHeight);

	// Create dismiss function
	const dismiss = (): void => {
		if (Toast.dismissed[eid] === 1) return;

		Toast.dismissed[eid] = 1;
		setVisible(world, eid, false);

		const state = toastStateMap.get(eid);
		if (state) {
			// Remove from position tracking
			toastsByPosition[state.position].delete(eid);

			// Reposition remaining toasts
			repositionToastStack(world, state.position, screenWidth, screenHeight);

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
	const widget: ToastWidget = {
		eid,

		// Content
		setContent(text: string): ToastWidget {
			const state = toastStateMap.get(eid);
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
			const state = toastStateMap.get(eid);
			return state?.content ?? '';
		},

		// Visibility
		show(): ToastWidget {
			setVisible(world, eid, true);
			return widget;
		},

		hide(): ToastWidget {
			setVisible(world, eid, false);
			return widget;
		},

		// Position
		move(dx: number, dy: number): ToastWidget {
			moveBy(world, eid, dx, dy);
			markDirty(world, eid);
			return widget;
		},

		// Dismissal
		dismiss,

		isDismissed(): boolean {
			return Toast.dismissed[eid] === 1;
		},

		// Events
		onDismiss(callback: () => void): ToastWidget {
			const state = toastStateMap.get(eid);
			if (state) {
				state.onDismissCallback = callback;
			}
			return widget;
		},

		// Lifecycle
		destroy(): void {
			const state = toastStateMap.get(eid);
			if (state) {
				if (state.timerId) {
					clearTimeout(state.timerId);
				}
				toastsByPosition[state.position].delete(eid);
			}

			Toast.isToast[eid] = 0;
			Toast.dismissed[eid] = 0;
			toastStateMap.delete(eid);
			removeEntity(world, eid);
		},
	};

	return widget;
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Shows an info toast.
 *
 * @param world - The ECS world
 * @param text - Toast text
 * @param options - Additional options
 * @param screenWidth - Screen width for positioning
 * @param screenHeight - Screen height for positioning
 * @returns The Toast widget
 *
 * @example
 * ```typescript
 * const toast = showInfoToast(world, 'Operation completed', {}, 80, 24);
 * ```
 */
export function showInfoToast(
	world: World,
	text: string,
	options: Omit<ToastConfig, 'content' | 'type'> = {},
	screenWidth: number = 80,
	screenHeight: number = 24,
): ToastWidget {
	return createToast(world, { ...options, content: text, type: 'info' }, screenWidth, screenHeight);
}

/**
 * Shows a success toast.
 */
export function showSuccessToast(
	world: World,
	text: string,
	options: Omit<ToastConfig, 'content' | 'type'> = {},
	screenWidth: number = 80,
	screenHeight: number = 24,
): ToastWidget {
	return createToast(
		world,
		{ ...options, content: text, type: 'success' },
		screenWidth,
		screenHeight,
	);
}

/**
 * Shows a warning toast.
 */
export function showWarningToast(
	world: World,
	text: string,
	options: Omit<ToastConfig, 'content' | 'type'> = {},
	screenWidth: number = 80,
	screenHeight: number = 24,
): ToastWidget {
	return createToast(
		world,
		{ ...options, content: text, type: 'warning' },
		screenWidth,
		screenHeight,
	);
}

/**
 * Shows an error toast.
 */
export function showErrorToast(
	world: World,
	text: string,
	options: Omit<ToastConfig, 'content' | 'type'> = {},
	screenWidth: number = 80,
	screenHeight: number = 24,
): ToastWidget {
	return createToast(
		world,
		{ ...options, content: text, type: 'error' },
		screenWidth,
		screenHeight,
	);
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Checks if an entity is a toast widget.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @param eid - The entity ID
 * @returns true if the entity is a toast widget
 *
 * @example
 * ```typescript
 * import { isToast } from 'blecsd/widgets';
 *
 * if (isToast(world, entity)) {
 *   // Handle toast-specific logic
 * }
 * ```
 */
export function isToast(_world: World, eid: Entity): boolean {
	return Toast.isToast[eid] === 1;
}

/**
 * Resets the Toast component store. Useful for testing.
 * @internal
 */
export function resetToastStore(): void {
	// Clear all timers
	for (const state of toastStateMap.values()) {
		if (state.timerId) {
			clearTimeout(state.timerId);
		}
	}

	Toast.isToast.fill(0);
	Toast.dismissed.fill(0);
	toastStateMap.clear();

	// Clear position tracking
	for (const position of Object.keys(toastsByPosition) as ToastPosition[]) {
		toastsByPosition[position].clear();
	}
}
