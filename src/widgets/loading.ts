/**
 * Loading Widget
 *
 * Provides a loading spinner indicator with customizable animation and message.
 *
 * @module widgets/loading
 */

import { addEntity, removeEntity } from 'bitecs';
import { z } from 'zod';
import { setContent } from '../components/content';
import { setDimensions } from '../components/dimensions';
import { Position, setPosition } from '../components/position';
import { markDirty, setVisible } from '../components/renderable';
import {
	addSpinner,
	DEFAULT_SPINNER_CHARS,
	DEFAULT_SPINNER_INTERVAL,
	getSpinnerChar,
	getSpinnerData,
	hasSpinner,
	removeSpinner,
	resetSpinner,
	setSpinnerFrames,
	setSpinnerInterval,
	updateSpinner,
} from '../components/spinner';
import type { Entity, World } from '../core/types';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Default foreground color for loading text.
 */
export const DEFAULT_LOADING_FG = 0xffffffff;

/**
 * Default background color for loading indicator.
 */
export const DEFAULT_LOADING_BG = 0x00000000;

// =============================================================================
// TYPES
// =============================================================================

/**
 * Style configuration for loading widget.
 */
export interface LoadingStyleConfig {
	/** Foreground color */
	readonly fg?: number;
	/** Background color */
	readonly bg?: number;
}

/**
 * Configuration for creating a Loading widget.
 */
export interface LoadingConfig {
	/** X position */
	readonly x?: number;
	/** Y position */
	readonly y?: number;
	/** Loading message to display */
	readonly message?: string;
	/** Characters for spinner animation */
	readonly spinnerChars?: readonly string[];
	/** Animation interval in ms (default: 100) */
	readonly interval?: number;
	/** Style configuration */
	readonly style?: LoadingStyleConfig;
	/** Width (auto-calculated if not specified) */
	readonly width?: number;
	/** Whether to show initially (default: true) */
	readonly visible?: boolean;
}

/**
 * Loading widget interface providing chainable methods.
 */
export interface LoadingWidget {
	/** The underlying entity ID */
	readonly eid: Entity;

	// Visibility
	/** Shows the loading indicator */
	show(): LoadingWidget;
	/** Hides the loading indicator */
	hide(): LoadingWidget;
	/** Checks if visible */
	isVisible(): boolean;

	// Position
	/** Moves the loading indicator by dx, dy */
	move(dx: number, dy: number): LoadingWidget;
	/** Sets the absolute position */
	setPosition(x: number, y: number): LoadingWidget;
	/** Gets current position */
	getPosition(): { x: number; y: number };

	// Content
	/** Sets the loading message */
	setMessage(message: string): LoadingWidget;
	/** Gets the current message */
	getMessage(): string;

	// Animation
	/** Sets the spinner characters */
	setSpinnerChars(chars: readonly string[]): LoadingWidget;
	/** Sets the animation interval */
	setInterval(ms: number): LoadingWidget;
	/** Gets the current spinner character */
	getSpinnerChar(): string;
	/** Resets the spinner animation */
	reset(): LoadingWidget;

	// Lifecycle
	/** Destroys the loading widget */
	destroy(): void;
}

// =============================================================================
// ZOD SCHEMA
// =============================================================================

/**
 * Zod schema for loading style configuration.
 */
export const LoadingStyleConfigSchema = z.object({
	fg: z.number().int().optional(),
	bg: z.number().int().optional(),
});

/**
 * Zod schema for loading widget configuration.
 */
export const LoadingConfigSchema = z.object({
	x: z.number().int().default(0),
	y: z.number().int().default(0),
	message: z.string().default('Loading...'),
	spinnerChars: z.array(z.string()).readonly().optional(),
	interval: z.number().int().positive().default(DEFAULT_SPINNER_INTERVAL),
	style: LoadingStyleConfigSchema.optional(),
	width: z.number().int().positive().optional(),
	visible: z.boolean().default(true),
});

// =============================================================================
// INTERNAL STATE
// =============================================================================

/**
 * Maps entity IDs to their message strings.
 */
const loadingMessageStore = new Map<Entity, string>();

/**
 * Maps entity IDs to their visibility state.
 */
const loadingVisibleStore = new Map<Entity, boolean>();

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Creates a Loading widget.
 *
 * @param world - The ECS world
 * @param config - Loading configuration
 * @returns LoadingWidget interface
 *
 * @example
 * ```typescript
 * import { createLoading } from 'blecsd';
 *
 * const loading = createLoading(world, {
 *   message: 'Processing...',
 *   x: 10,
 *   y: 5,
 * });
 *
 * // Update message
 * loading.setMessage('Almost done...');
 *
 * // Hide when complete
 * loading.hide();
 * ```
 */
export function createLoading(world: World, config: LoadingConfig = {}): LoadingWidget {
	const parsed = LoadingConfigSchema.parse(config);

	// Create entity
	const eid = addEntity(world);

	// Set position
	setPosition(world, eid, parsed.x, parsed.y);

	// Calculate width
	const message = parsed.message;
	const spinnerChars = parsed.spinnerChars ?? DEFAULT_SPINNER_CHARS;
	const spinnerWidth = Math.max(...spinnerChars.map((c) => c.length));
	const width = parsed.width ?? message.length + spinnerWidth + 1;

	setDimensions(world, eid, width, 1);

	// Add spinner component
	addSpinner(world, eid, {
		frames: spinnerChars,
		interval: parsed.interval,
	});

	// Store message
	loadingMessageStore.set(eid, message);
	loadingVisibleStore.set(eid, parsed.visible);

	// Update content with current frame
	updateLoadingContent(world, eid);

	// Set visibility
	if (!parsed.visible) {
		setVisible(world, eid, false);
	}

	// Create widget interface
	return createLoadingWidgetInterface(world, eid);
}

/**
 * Creates the LoadingWidget interface for an entity.
 */
function createLoadingWidgetInterface(world: World, eid: Entity): LoadingWidget {
	return {
		get eid() {
			return eid;
		},

		show() {
			loadingVisibleStore.set(eid, true);
			setVisible(world, eid, true);
			markDirty(world, eid);
			return this;
		},

		hide() {
			loadingVisibleStore.set(eid, false);
			setVisible(world, eid, false);
			markDirty(world, eid);
			return this;
		},

		isVisible() {
			return loadingVisibleStore.get(eid) ?? false;
		},

		move(dx: number, dy: number) {
			const x = Position.x[eid] ?? 0;
			const y = Position.y[eid] ?? 0;
			setPosition(world, eid, x + dx, y + dy);
			markDirty(world, eid);
			return this;
		},

		setPosition(x: number, y: number) {
			setPosition(world, eid, x, y);
			markDirty(world, eid);
			return this;
		},

		getPosition() {
			return {
				x: Position.x[eid] ?? 0,
				y: Position.y[eid] ?? 0,
			};
		},

		setMessage(message: string) {
			loadingMessageStore.set(eid, message);
			updateLoadingContent(world, eid);
			markDirty(world, eid);
			return this;
		},

		getMessage() {
			return loadingMessageStore.get(eid) ?? '';
		},

		setSpinnerChars(chars: readonly string[]) {
			setSpinnerFrames(eid, chars);
			updateLoadingContent(world, eid);
			markDirty(world, eid);
			return this;
		},

		setInterval(ms: number) {
			setSpinnerInterval(eid, ms);
			return this;
		},

		getSpinnerChar() {
			return getSpinnerChar(eid);
		},

		reset() {
			resetSpinner(eid);
			updateLoadingContent(world, eid);
			markDirty(world, eid);
			return this;
		},

		destroy() {
			removeSpinner(world, eid);
			loadingMessageStore.delete(eid);
			loadingVisibleStore.delete(eid);
			removeEntity(world, eid);
		},
	};
}

/**
 * Updates the loading entity's content with current spinner frame and message.
 */
function updateLoadingContent(world: World, eid: Entity): void {
	const message = loadingMessageStore.get(eid) ?? '';
	const spinner = getSpinnerChar(eid);
	const content = `${spinner} ${message}`;
	setContent(world, eid, content);
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Creates and shows a loading indicator.
 *
 * Convenience function for quick loading display.
 *
 * @param world - The ECS world
 * @param message - Loading message
 * @param config - Additional configuration
 * @returns LoadingWidget
 *
 * @example
 * ```typescript
 * import { showLoading, hideLoading } from 'blecsd';
 *
 * const loading = showLoading(world, 'Saving...');
 * // ... do work ...
 * loading.destroy();
 * ```
 */
export function showLoading(
	world: World,
	message: string,
	config: Partial<LoadingConfig> = {},
): LoadingWidget {
	return createLoading(world, {
		...config,
		message,
		visible: true,
	});
}

/**
 * Hides and destroys a loading widget.
 *
 * @param widget - Loading widget to hide
 *
 * @example
 * ```typescript
 * const loading = showLoading(world, 'Working...');
 * // ... do work ...
 * hideLoading(loading);
 * ```
 */
export function hideLoading(widget: LoadingWidget): void {
	widget.destroy();
}

/**
 * Sets the message on a loading widget.
 *
 * @param widget - Loading widget
 * @param message - New message
 *
 * @example
 * ```typescript
 * const loading = showLoading(world, 'Step 1...');
 * setLoadingMessage(loading, 'Step 2...');
 * ```
 */
export function setLoadingMessage(widget: LoadingWidget, message: string): void {
	widget.setMessage(message);
}

/**
 * Checks if an entity is a loading widget.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @returns true if entity is a loading widget
 */
export function isLoadingWidget(world: World, eid: Entity): boolean {
	return hasSpinner(world, eid) && loadingMessageStore.has(eid);
}

/**
 * Updates a loading widget's animation.
 *
 * Should be called each frame with deltaTime.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @param deltaMs - Time elapsed since last update (ms)
 * @returns true if animation frame changed
 */
export function updateLoadingAnimation(world: World, eid: Entity, deltaMs: number): boolean {
	if (!isLoadingWidget(world, eid)) return false;

	const frameChanged = updateSpinner(eid, deltaMs);
	if (frameChanged) {
		updateLoadingContent(world, eid);
		markDirty(world, eid);
	}
	return frameChanged;
}

/**
 * Clears loading widget stores (for testing).
 *
 * @internal
 */
export function resetLoadingStore(): void {
	loadingMessageStore.clear();
	loadingVisibleStore.clear();
}
