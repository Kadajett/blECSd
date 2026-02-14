/**
 * Log Widget
 *
 * An append-only scrollable log display widget. Optimized for displaying
 * log messages, console output, and other streaming text content.
 *
 * Features:
 * - Auto-scroll to bottom on new content
 * - Optional timestamps for each line
 * - Scrollback limit to prune old lines
 * - Printf-style logging with interpolation
 *
 * @module widgets/log
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
import { blur, focus, isFocused, setFocusable } from '../components/focusable';
import { appendChild, getChildren } from '../components/hierarchy';
import { setPadding } from '../components/padding';
import { moveBy, setPosition } from '../components/position';
import { markDirty, setStyle, setVisible } from '../components/renderable';
import {
	type ScrollableData,
	ScrollbarVisibility,
	type ScrollPercentage,
	type ScrollPosition,
} from '../components/scrollable';
import {
	canScroll,
	canScrollX,
	canScrollY,
	scrollBy as componentScrollBy,
	scrollTo as componentScrollTo,
	getScroll,
	getScrollable,
	getScrollPercentage,
	isAtBottom,
	isAtLeft,
	isAtRight,
	isAtTop,
	scrollToBottom,
	scrollToLeft,
	scrollToRight,
	scrollToTop,
	setScrollable,
	setScrollPercentage,
	setScrollSize,
	setViewport,
} from '../systems/scrollableSystem';
import { removeEntity } from '../core/ecs';
import type { Entity, World } from '../core/types';
import { parseColor } from '../utils/color';
import { formatDate } from '../utils/time';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Dimension value that can be a number, percentage string, or 'auto'.
 */
export type DimensionValue = number | `${number}%` | 'auto';

/**
 * Position value that can be a number, percentage string, or keyword.
 */
export type PositionValue = number | `${number}%` | 'center' | 'left' | 'right' | 'top' | 'bottom';

/**
 * Border configuration for the log widget.
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
 * Padding configuration (all sides, or individual sides).
 */
export type PaddingConfig =
	| number
	| {
			readonly left?: number;
			readonly top?: number;
			readonly right?: number;
			readonly bottom?: number;
	  };

/**
 * Scrollbar visibility mode.
 */
export type ScrollbarMode = 'auto' | 'visible' | 'hidden';

/**
 * Scrollbar configuration.
 */
export interface ScrollbarConfig {
	/** Scrollbar visibility mode */
	readonly mode?: ScrollbarMode;
	/** Scrollbar foreground color */
	readonly fg?: string | number;
	/** Scrollbar background color */
	readonly bg?: string | number;
	/** Track character */
	readonly trackChar?: string;
	/** Thumb character */
	readonly thumbChar?: string;
}

/**
 * Configuration for creating a Log widget.
 */
export interface LogConfig {
	// Position
	/** Left position (absolute or percentage) */
	readonly left?: PositionValue;
	/** Top position (absolute or percentage) */
	readonly top?: PositionValue;
	/** Right position (absolute or percentage) */
	readonly right?: PositionValue;
	/** Bottom position (absolute or percentage) */
	readonly bottom?: PositionValue;
	/** Width (absolute, percentage, or 'auto') */
	readonly width?: DimensionValue;
	/** Height (absolute, percentage, or 'auto') */
	readonly height?: DimensionValue;

	// Style
	/** Foreground color (hex string or packed number) */
	readonly fg?: string | number;
	/** Background color (hex string or packed number) */
	readonly bg?: string | number;
	/** Border configuration */
	readonly border?: BorderConfig;
	/** Padding configuration */
	readonly padding?: PaddingConfig;

	// Scrolling
	/** Scrollbar configuration (true for default, false to disable, or config) */
	readonly scrollbar?: boolean | ScrollbarConfig;
	/** Enable mouse wheel scrolling (default: true) */
	readonly mouse?: boolean;
	/** Enable keyboard scrolling (default: true) */
	readonly keys?: boolean;

	// Log-specific options
	/** Maximum number of lines to keep in scrollback (default: 1000) */
	readonly scrollback?: number;
	/** Auto-scroll to bottom when new content is added (default: true) */
	readonly scrollOnInput?: boolean;
	/** Add timestamps to log entries (default: false) */
	readonly timestamps?: boolean;
	/** Timestamp format using date format tokens (default: 'HH:mm:ss') */
	readonly timestampFormat?: string;
}

/**
 * Log widget interface providing chainable methods.
 */
export interface LogWidget {
	/** The underlying entity ID */
	readonly eid: Entity;

	// Logging
	/** Logs a message with optional interpolation */
	log(...args: unknown[]): LogWidget;
	/** Clears all log entries */
	clear(): LogWidget;
	/** Gets all lines in the log */
	getLines(): readonly string[];
	/** Gets the number of lines in the log */
	getLineCount(): number;

	// Visibility
	/** Shows the log widget */
	show(): LogWidget;
	/** Hides the log widget */
	hide(): LogWidget;

	// Position
	/** Moves the log widget by dx, dy */
	move(dx: number, dy: number): LogWidget;
	/** Sets the absolute position */
	setPosition(x: number, y: number): LogWidget;

	// Focus
	/** Focuses the log widget */
	focus(): LogWidget;
	/** Blurs the log widget */
	blur(): LogWidget;
	/** Checks if the log widget is focused */
	isFocused(): boolean;

	// Children
	/** Appends a child entity to this log widget */
	append(child: Entity): LogWidget;
	/** Gets all direct children of this log widget */
	getChildren(): Entity[];

	// Scrolling
	/** Scrolls to absolute position */
	scrollTo(x: number, y: number): LogWidget;
	/** Scrolls by delta */
	scrollBy(dx: number, dy: number): LogWidget;
	/** Scrolls to percentage (0-100) */
	setScrollPerc(percX: number, percY: number): LogWidget;
	/** Gets scroll percentage (0-100) */
	getScrollPerc(): ScrollPercentage;
	/** Gets scroll position */
	getScroll(): ScrollPosition;
	/** Sets viewport size */
	setViewport(width: number, height: number): LogWidget;
	/** Gets full scrollable data */
	getScrollable(): ScrollableData | undefined;
	/** Scrolls to top */
	scrollToTop(): LogWidget;
	/** Scrolls to bottom */
	scrollToBottom(): LogWidget;
	/** Scrolls to left */
	scrollToLeft(): LogWidget;
	/** Scrolls to right */
	scrollToRight(): LogWidget;
	/** Checks if can scroll (content exceeds viewport) */
	canScroll(): boolean;
	/** Checks if can scroll horizontally */
	canScrollX(): boolean;
	/** Checks if can scroll vertically */
	canScrollY(): boolean;
	/** Checks if scrolled to top */
	isAtTop(): boolean;
	/** Checks if scrolled to bottom */
	isAtBottom(): boolean;
	/** Checks if scrolled to left */
	isAtLeft(): boolean;
	/** Checks if scrolled to right */
	isAtRight(): boolean;

	// Lifecycle
	/** Destroys the widget and removes it from the world */
	destroy(): void;
}

// =============================================================================
// SCHEMAS
// =============================================================================

/**
 * Zod schema for dimension values.
 */
const DimensionValueSchema = z.union([
	z.number(),
	z.string().regex(/^\d+(\.\d+)?%$/, 'Percentage must be in format "50%"'),
	z.literal('auto'),
]);

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
 * Zod schema for padding configuration.
 */
const PaddingConfigSchema = z
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
 * Zod schema for scrollbar configuration.
 */
const ScrollbarConfigSchema = z
	.union([
		z.boolean(),
		z.object({
			mode: z.enum(['auto', 'visible', 'hidden']).optional(),
			fg: z.union([z.string(), z.number()]).optional(),
			bg: z.union([z.string(), z.number()]).optional(),
			trackChar: z.string().optional(),
			thumbChar: z.string().optional(),
		}),
	])
	.optional();

/**
 * Zod schema for log widget configuration.
 */
export const LogConfigSchema = z.object({
	// Position
	left: PositionValueSchema.optional(),
	top: PositionValueSchema.optional(),
	right: PositionValueSchema.optional(),
	bottom: PositionValueSchema.optional(),
	width: DimensionValueSchema.optional(),
	height: DimensionValueSchema.optional(),

	// Style
	fg: z.union([z.string(), z.number()]).optional(),
	bg: z.union([z.string(), z.number()]).optional(),
	border: BorderConfigSchema,
	padding: PaddingConfigSchema,

	// Scrolling
	scrollbar: ScrollbarConfigSchema,
	mouse: z.boolean().optional(),
	keys: z.boolean().optional(),

	// Log-specific options
	scrollback: z.number().int().positive().optional(),
	scrollOnInput: z.boolean().optional(),
	timestamps: z.boolean().optional(),
	timestampFormat: z.string().optional(),
});

// =============================================================================
// COMPONENT TAG
// =============================================================================

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

/**
 * Log component marker for identifying log widget entities.
 */
export const Log = {
	/** Tag indicating this is a log widget (1 = yes) */
	isLog: new Uint8Array(DEFAULT_CAPACITY),
	/** Mouse scrolling enabled (1 = yes) */
	mouseEnabled: new Uint8Array(DEFAULT_CAPACITY),
	/** Keyboard scrolling enabled (1 = yes) */
	keysEnabled: new Uint8Array(DEFAULT_CAPACITY),
	/** Auto-scroll on input enabled (1 = yes) */
	scrollOnInput: new Uint8Array(DEFAULT_CAPACITY),
	/** Timestamps enabled (1 = yes) */
	timestamps: new Uint8Array(DEFAULT_CAPACITY),
	/** Maximum scrollback lines */
	scrollback: new Uint32Array(DEFAULT_CAPACITY),
	/** Current line count */
	lineCount: new Uint32Array(DEFAULT_CAPACITY),
};

/**
 * Log state stored outside ECS for complex data.
 */
interface LogState {
	/** Lines stored in the log */
	lines: string[];
	/** Timestamp format string */
	timestampFormat: string;
}

/** Map of entity to log state */
const logStateMap = new Map<Entity, LogState>();

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
 * Parses a position value to a number.
 */
function parsePositionToNumber(value: string | number | undefined): number {
	if (value === undefined) return 0;
	if (typeof value === 'number') return value;
	if (value === 'left' || value === 'top') return 0;
	return 0;
}

/**
 * Parses a dimension value for setDimensions.
 */
function parseDimension(value: string | number | undefined): number | `${number}%` | 'auto' {
	if (value === undefined) return 'auto';
	if (typeof value === 'string') {
		if (value === 'auto') return 'auto';
		return value as `${number}%`;
	}
	return value;
}

/**
 * Converts scrollbar mode to ScrollbarVisibility enum.
 */
function scrollbarModeToVisibility(mode: ScrollbarMode): ScrollbarVisibility {
	switch (mode) {
		case 'auto':
			return ScrollbarVisibility.Auto;
		case 'visible':
			return ScrollbarVisibility.Visible;
		case 'hidden':
			return ScrollbarVisibility.Hidden;
	}
}

/**
 * Validated config type from LogConfigSchema.
 */
interface ValidatedLogConfig {
	left?: string | number;
	top?: string | number;
	right?: string | number;
	bottom?: string | number;
	width?: string | number;
	height?: string | number;
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
	scrollbar?:
		| boolean
		| {
				mode?: 'auto' | 'visible' | 'hidden';
				fg?: string | number;
				bg?: string | number;
				trackChar?: string;
				thumbChar?: string;
		  };
	mouse?: boolean;
	keys?: boolean;
	scrollback?: number;
	scrollOnInput?: boolean;
	timestamps?: boolean;
	timestampFormat?: string;
}

/**
 * Formats a log message with printf-style interpolation.
 */
function formatLogMessage(...args: unknown[]): string {
	if (args.length === 0) return '';
	if (args.length === 1) return String(args[0]);

	const format = String(args[0]);
	let argIndex = 1;

	return format.replace(/%([sdfjioO%])/g, (match, type) => {
		if (type === '%') return '%';
		if (argIndex >= args.length) return match;

		const arg = args[argIndex++];

		switch (type) {
			case 's':
				return String(arg);
			case 'd':
			case 'i':
				return typeof arg === 'number' ? Math.floor(arg).toString() : 'NaN';
			case 'f':
				return typeof arg === 'number' ? arg.toString() : 'NaN';
			case 'j':
			case 'o':
			case 'O':
				try {
					return JSON.stringify(arg);
				} catch {
					return '[Circular]';
				}
			default:
				return match;
		}
	});
}

/**
 * Formats a timestamp for a log entry.
 */
function formatTimestamp(format: string): string {
	return formatDate(new Date(), format);
}

/**
 * Updates the content of a log entity from its lines.
 */
function updateLogContent(world: World, eid: Entity): void {
	const state = logStateMap.get(eid);
	if (!state) return;

	const content = state.lines.join('\n');
	setContent(world, eid, content);

	// Update scroll size based on line count
	const lineCount = state.lines.length;
	setScrollSize(world, eid, 0, lineCount);
	Log.lineCount[eid] = lineCount;

	markDirty(world, eid);
}

/**
 * Prunes old lines if exceeding scrollback limit.
 */
function pruneLines(eid: Entity): void {
	const state = logStateMap.get(eid);
	if (!state) return;

	const scrollback = Log.scrollback[eid] ?? 0;
	if (scrollback === 0) return; // No limit

	while (state.lines.length > scrollback) {
		state.lines.shift();
	}
}

// =============================================================================
// SETUP HELPERS
// =============================================================================

/**
 * Sets up log-specific component options.
 * @internal
 */
function setupLogOptions(eid: Entity, config: ValidatedLogConfig): void {
	Log.isLog[eid] = 1;
	Log.scrollback[eid] = config.scrollback ?? 1000;
	Log.scrollOnInput[eid] = config.scrollOnInput !== false ? 1 : 0;
	Log.timestamps[eid] = config.timestamps ? 1 : 0;
	Log.mouseEnabled[eid] = config.mouse !== false ? 1 : 0;
	Log.keysEnabled[eid] = config.keys !== false ? 1 : 0;
	Log.lineCount[eid] = 0;

	logStateMap.set(eid, {
		lines: [],
		timestampFormat: config.timestampFormat ?? 'HH:mm:ss',
	});
}

/**
 * Sets up position and dimensions on the log entity.
 * @internal
 */
function setupPositionAndDimensions(world: World, eid: Entity, config: ValidatedLogConfig): void {
	const x = parsePositionToNumber(config.left);
	const y = parsePositionToNumber(config.top);
	setPosition(world, eid, x, y);

	const width = parseDimension(config.width);
	const height = parseDimension(config.height);
	setDimensions(world, eid, width, height);
}

/**
 * Sets up style colors on the log entity.
 * @internal
 */
function setupStyle(world: World, eid: Entity, config: ValidatedLogConfig): void {
	if (config.fg === undefined && config.bg === undefined) return;

	setStyle(world, eid, {
		fg: config.fg !== undefined ? parseColor(config.fg) : undefined,
		bg: config.bg !== undefined ? parseColor(config.bg) : undefined,
	});
}

/**
 * Sets up border on the log entity.
 * @internal
 */
function setupBorder(
	world: World,
	eid: Entity,
	borderConfig: NonNullable<ValidatedLogConfig['border']>,
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
 * Sets up padding on the log entity.
 * @internal
 */
function setupPadding(
	world: World,
	eid: Entity,
	paddingConfig: NonNullable<ValidatedLogConfig['padding']>,
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
 * Sets up scrollable component on the log entity.
 * @internal
 */
function setupScrollable(world: World, eid: Entity, config: ValidatedLogConfig): void {
	let scrollbarVisible = ScrollbarVisibility.Auto;

	if (config.scrollbar === false) {
		scrollbarVisible = ScrollbarVisibility.Hidden;
	} else if (typeof config.scrollbar === 'object' && config.scrollbar.mode) {
		scrollbarVisible = scrollbarModeToVisibility(config.scrollbar.mode);
	}

	setScrollable(world, eid, {
		alwaysScroll: true,
		scrollbarVisible,
	});
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Creates a Log widget with the given configuration.
 *
 * The Log widget is an append-only scrollable display for log messages.
 * It supports auto-scrolling, timestamps, and scrollback limits.
 *
 * @param world - The ECS world
 * @param entity - The entity to wrap
 * @param config - Widget configuration
 * @returns The Log widget instance
 *
 * @example
 * ```typescript
 * import { createWorld, addEntity } from '../core/ecs';
 * import { createLog } from 'blecsd/widgets';
 *
 * const world = createWorld();
 * const eid = addEntity(world);
 *
 * // Create a log display
 * const logView = createLog(world, eid, {
 *   left: 0,
 *   top: 0,
 *   width: 80,
 *   height: 20,
 *   scrollback: 500,       // Keep last 500 lines
 *   timestamps: true,       // Add timestamps
 *   timestampFormat: 'HH:mm:ss.SSS',
 *   border: { type: 'line' },
 *   scrollbar: true,
 * });
 *
 * // Log messages
 * logView.log('Server started on port %d', 3000);
 * logView.log('Connection from %s', '192.168.1.1');
 * logView.log({ user: 'alice', action: 'login' });
 * ```
 */
export function createLog(world: World, entity: Entity, config: LogConfig = {}): LogWidget {
	const validated = LogConfigSchema.parse(config) as ValidatedLogConfig;
	const eid = entity;

	// Set up components using helper functions
	setupLogOptions(eid, validated);
	setupPositionAndDimensions(world, eid, validated);
	setupStyle(world, eid, validated);
	if (validated.border) setupBorder(world, eid, validated.border);
	if (validated.padding !== undefined) setupPadding(world, eid, validated.padding);
	setupScrollable(world, eid, validated);

	// Make focusable and set initial content
	setFocusable(world, eid, { focusable: true });
	setContent(world, eid, '');

	// Create the widget object with chainable methods
	const widget: LogWidget = {
		eid,

		// Logging
		log(...args: unknown[]): LogWidget {
			const state = logStateMap.get(eid);
			if (!state) return widget;

			let message = formatLogMessage(...args);

			// Add timestamp if enabled
			if (Log.timestamps[eid] === 1) {
				const timestamp = formatTimestamp(state.timestampFormat);
				message = `[${timestamp}] ${message}`;
			}

			state.lines.push(message);
			pruneLines(eid);
			updateLogContent(world, eid);

			// Auto-scroll to bottom if enabled
			if (Log.scrollOnInput[eid] === 1) {
				scrollToBottom(world, eid);
			}

			return widget;
		},

		clear(): LogWidget {
			const state = logStateMap.get(eid);
			if (!state) return widget;

			state.lines = [];
			Log.lineCount[eid] = 0;
			updateLogContent(world, eid);
			scrollToTop(world, eid);

			return widget;
		},

		getLines(): readonly string[] {
			const state = logStateMap.get(eid);
			return state ? [...state.lines] : [];
		},

		getLineCount(): number {
			return Log.lineCount[eid] ?? 0;
		},

		// Visibility
		show(): LogWidget {
			setVisible(world, eid, true);
			return widget;
		},

		hide(): LogWidget {
			setVisible(world, eid, false);
			return widget;
		},

		// Position
		move(dx: number, dy: number): LogWidget {
			moveBy(world, eid, dx, dy);
			markDirty(world, eid);
			return widget;
		},

		setPosition(x: number, y: number): LogWidget {
			setPosition(world, eid, x, y);
			markDirty(world, eid);
			return widget;
		},

		// Focus
		focus(): LogWidget {
			focus(world, eid);
			return widget;
		},

		blur(): LogWidget {
			blur(world, eid);
			return widget;
		},

		isFocused(): boolean {
			return isFocused(world, eid);
		},

		// Children
		append(child: Entity): LogWidget {
			appendChild(world, eid, child);
			return widget;
		},

		getChildren(): Entity[] {
			return getChildren(world, eid);
		},

		// Scrolling
		scrollTo(x: number, y: number): LogWidget {
			componentScrollTo(world, eid, x, y);
			markDirty(world, eid);
			return widget;
		},

		scrollBy(dx: number, dy: number): LogWidget {
			componentScrollBy(world, eid, dx, dy);
			markDirty(world, eid);
			return widget;
		},

		setScrollPerc(percX: number, percY: number): LogWidget {
			setScrollPercentage(world, eid, percX, percY);
			markDirty(world, eid);
			return widget;
		},

		getScrollPerc(): ScrollPercentage {
			return getScrollPercentage(world, eid);
		},

		getScroll(): ScrollPosition {
			return getScroll(world, eid);
		},

		setViewport(width: number, height: number): LogWidget {
			setViewport(world, eid, width, height);
			markDirty(world, eid);
			return widget;
		},

		getScrollable(): ScrollableData | undefined {
			return getScrollable(world, eid);
		},

		scrollToTop(): LogWidget {
			scrollToTop(world, eid);
			markDirty(world, eid);
			return widget;
		},

		scrollToBottom(): LogWidget {
			scrollToBottom(world, eid);
			markDirty(world, eid);
			return widget;
		},

		scrollToLeft(): LogWidget {
			scrollToLeft(world, eid);
			markDirty(world, eid);
			return widget;
		},

		scrollToRight(): LogWidget {
			scrollToRight(world, eid);
			markDirty(world, eid);
			return widget;
		},

		canScroll(): boolean {
			return canScroll(world, eid);
		},

		canScrollX(): boolean {
			return canScrollX(world, eid);
		},

		canScrollY(): boolean {
			return canScrollY(world, eid);
		},

		isAtTop(): boolean {
			return isAtTop(world, eid);
		},

		isAtBottom(): boolean {
			return isAtBottom(world, eid);
		},

		isAtLeft(): boolean {
			return isAtLeft(world, eid);
		},

		isAtRight(): boolean {
			return isAtRight(world, eid);
		},

		// Lifecycle
		destroy(): void {
			Log.isLog[eid] = 0;
			Log.mouseEnabled[eid] = 0;
			Log.keysEnabled[eid] = 0;
			Log.scrollOnInput[eid] = 0;
			Log.timestamps[eid] = 0;
			Log.scrollback[eid] = 0;
			Log.lineCount[eid] = 0;
			logStateMap.delete(eid);
			removeEntity(world, eid);
		},
	};

	return widget;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Checks if an entity is a log widget.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @param eid - The entity ID
 * @returns true if the entity is a log widget
 *
 * @example
 * ```typescript
 * import { isLog } from 'blecsd/widgets';
 *
 * if (isLog(world, entity)) {
 *   // Handle log-specific logic
 * }
 * ```
 */
export function isLog(_world: World, eid: Entity): boolean {
	return Log.isLog[eid] === 1;
}

/**
 * Checks if mouse scrolling is enabled for a log widget.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @param eid - The entity ID
 * @returns true if mouse scrolling is enabled
 */
export function isMouseScrollEnabled(_world: World, eid: Entity): boolean {
	return Log.mouseEnabled[eid] === 1;
}

/**
 * Checks if keyboard scrolling is enabled for a log widget.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @param eid - The entity ID
 * @returns true if keyboard scrolling is enabled
 */
export function isKeysScrollEnabled(_world: World, eid: Entity): boolean {
	return Log.keysEnabled[eid] === 1;
}

/**
 * Gets the scrollback limit for a log widget.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @param eid - The entity ID
 * @returns The scrollback limit, or 0 if no limit
 */
export function getScrollback(_world: World, eid: Entity): number {
	return Log.scrollback[eid] ?? 0;
}

/**
 * Resets the Log component store. Useful for testing.
 * @internal
 */
export function resetLogStore(): void {
	Log.isLog.fill(0);
	Log.mouseEnabled.fill(0);
	Log.keysEnabled.fill(0);
	Log.scrollOnInput.fill(0);
	Log.timestamps.fill(0);
	Log.scrollback.fill(0);
	Log.lineCount.fill(0);
	logStateMap.clear();
}
