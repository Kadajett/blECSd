/**
 * Throttled Resize Handling
 *
 * Wraps the base resize handler with throttling and debouncing to prevent
 * overwhelming the system during rapid terminal resize events (e.g., dragging
 * the terminal edge).
 *
 * Strategy:
 * - Throttle resize events to a maximum rate (default 30/sec)
 * - During rapid resize: update dimensions only (skip full relayout)
 * - On resize end (debounce): perform full relayout
 *
 * @module terminal/throttledResize
 */

import { getScreen, resizeScreen } from '../components/screen';
import type { World } from '../core/types';
import { getResizeEventBus, type ResizeEventData } from './resize';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Configuration for throttled resize handling.
 */
export interface ThrottledResizeConfig {
	/** Maximum resize events per second (default: 30) */
	readonly maxRate: number;
	/** Debounce delay in ms before full relayout (default: 150) */
	readonly debounceMs: number;
	/** Whether to show intermediate state during resize (default: true) */
	readonly showIntermediate: boolean;
}

/**
 * Throttled resize handler state.
 */
export interface ThrottledResizeState {
	/** The ECS world */
	readonly world: World;
	/** Configuration */
	readonly config: ThrottledResizeConfig;
	/** Whether currently in a resize sequence */
	readonly isResizing: boolean;
	/** Last resize dimensions */
	readonly lastWidth: number;
	readonly lastHeight: number;
	/** Cleanup function */
	dispose(): void;
}

/**
 * Resize callback function type.
 */
export type ResizeCallback = (width: number, height: number, isFinal: boolean) => void;

// =============================================================================
// DEFAULTS
// =============================================================================

const DEFAULT_CONFIG: ThrottledResizeConfig = {
	maxRate: 30,
	debounceMs: 150,
	showIntermediate: true,
};

// =============================================================================
// THROTTLED RESIZE
// =============================================================================

/**
 * Creates a throttled resize handler.
 *
 * @param world - The ECS world
 * @param onResize - Callback for resize events (intermediate and final)
 * @param config - Optional configuration
 * @returns Throttled resize state with dispose function
 *
 * @example
 * ```typescript
 * import { createThrottledResize } from 'blecsd';
 *
 * const handler = createThrottledResize(world, (width, height, isFinal) => {
 *   if (isFinal) {
 *     // Full relayout
 *     performFullLayout(world);
 *   } else {
 *     // Quick dimension update only
 *     updateDimensions(width, height);
 *   }
 * }, { maxRate: 30, debounceMs: 150 });
 *
 * // Clean up
 * handler.dispose();
 * ```
 */
export function createThrottledResize(
	world: World,
	onResize: ResizeCallback,
	config?: Partial<ThrottledResizeConfig>,
): ThrottledResizeState {
	const cfg: ThrottledResizeConfig = { ...DEFAULT_CONFIG, ...config };

	let isResizing = false;
	let lastWidth = process.stdout.columns ?? 80;
	let lastHeight = process.stdout.rows ?? 24;
	let lastThrottleTime = 0;
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;
	let disposed = false;

	const minInterval = 1000 / cfg.maxRate;

	function handleResize(): void {
		if (disposed) return;

		const newWidth = process.stdout.columns ?? 80;
		const newHeight = process.stdout.rows ?? 24;

		if (newWidth === lastWidth && newHeight === lastHeight) return;

		isResizing = true;
		lastWidth = newWidth;
		lastHeight = newHeight;

		const now = performance.now();
		const elapsed = now - lastThrottleTime;

		// Throttle: only process if enough time has passed
		if (elapsed >= minInterval) {
			lastThrottleTime = now;

			// Quick update: dimensions only
			const screen = getScreen(world);
			if (screen) {
				resizeScreen(world, screen, newWidth, newHeight);
			}

			if (cfg.showIntermediate) {
				onResize(newWidth, newHeight, false);
			}
		}

		// Debounce: schedule full relayout after resize stops
		if (debounceTimer !== null) {
			clearTimeout(debounceTimer);
		}

		debounceTimer = setTimeout(() => {
			if (disposed) return;

			isResizing = false;
			debounceTimer = null;

			// Final resize: full relayout
			const screen = getScreen(world);
			if (screen) {
				resizeScreen(world, screen, lastWidth, lastHeight);
			}

			onResize(lastWidth, lastHeight, true);

			// Emit resize event
			const bus = getResizeEventBus();
			bus.emit('resize', {
				width: lastWidth,
				height: lastHeight,
				previousWidth: lastWidth,
				previousHeight: lastHeight,
			} satisfies ResizeEventData);
		}, cfg.debounceMs);
	}

	// Set up SIGWINCH listener
	process.on('SIGWINCH', handleResize);

	const state: ThrottledResizeState = {
		world,
		config: cfg,
		get isResizing() {
			return isResizing;
		},
		get lastWidth() {
			return lastWidth;
		},
		get lastHeight() {
			return lastHeight;
		},
		dispose() {
			disposed = true;
			process.off('SIGWINCH', handleResize);
			if (debounceTimer !== null) {
				clearTimeout(debounceTimer);
				debounceTimer = null;
			}
		},
	};

	return state;
}

/**
 * Creates a simple throttle function for resize events.
 * Useful when you need just the throttling without the full handler.
 *
 * @param fn - Function to throttle
 * @param maxRate - Maximum calls per second
 * @returns Throttled function
 *
 * @example
 * ```typescript
 * const throttledRender = throttleResize(render, 30);
 * process.stdout.on('resize', throttledRender);
 * ```
 */
export function throttleResize<T extends (...args: unknown[]) => void>(fn: T, maxRate: number): T {
	let lastCall = 0;
	const minInterval = 1000 / maxRate;

	return ((...args: unknown[]) => {
		const now = performance.now();
		if (now - lastCall >= minInterval) {
			lastCall = now;
			fn(...args);
		}
	}) as unknown as T;
}

/**
 * Creates a debounced resize handler that waits for resize to stop.
 *
 * @param fn - Function to debounce
 * @param delayMs - Delay in milliseconds
 * @returns Object with the debounced function and a cancel method
 *
 * @example
 * ```typescript
 * const { fn: debouncedLayout, cancel } = debounceResize(fullRelayout, 150);
 * process.stdout.on('resize', debouncedLayout);
 *
 * // Clean up
 * cancel();
 * ```
 */
export function debounceResize<T extends (...args: unknown[]) => void>(
	fn: T,
	delayMs: number,
): { fn: T; cancel: () => void } {
	let timer: ReturnType<typeof setTimeout> | null = null;

	const debounced = ((...args: unknown[]) => {
		if (timer !== null) {
			clearTimeout(timer);
		}
		timer = setTimeout(() => {
			timer = null;
			fn(...args);
		}, delayMs);
	}) as unknown as T;

	return {
		fn: debounced,
		cancel: () => {
			if (timer !== null) {
				clearTimeout(timer);
				timer = null;
			}
		},
	};
}
