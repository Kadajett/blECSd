/**
 * Debug overlay toggle state management.
 *
 * Provides key-based toggle functionality for debug overlays and tools.
 * Pure state machine - no terminal I/O or event listeners.
 *
 * @module debug/debugToggle
 */

import { z } from 'zod';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Configuration for debug toggle behavior.
 */
export interface DebugToggleConfig {
	/** Key name to toggle (default: 'f12') */
	readonly toggleKey: string;
	/** Initial visibility state (default: false) */
	readonly initialVisible: boolean;
}

/**
 * Current state of the debug toggle.
 */
export interface DebugToggleState {
	/** Whether the overlay is currently visible */
	readonly visible: boolean;
	/** Number of times toggle has been activated */
	readonly toggleCount: number;
}

/**
 * Debug toggle instance.
 */
export interface DebugToggle {
	/** Process a key press. Returns true if the key was consumed (matched toggle key). */
	readonly processKey: (keyName: string) => boolean;
	/** Check if currently visible */
	readonly isVisible: () => boolean;
	/** Get current state */
	readonly getState: () => DebugToggleState;
	/** Toggle visibility */
	readonly toggle: () => void;
	/** Set visibility explicitly */
	readonly setVisible: (visible: boolean) => void;
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Zod schema for DebugToggleConfig validation.
 *
 * @example
 * ```typescript
 * import { DebugToggleConfigSchema } from 'blecsd/debug';
 *
 * const config = DebugToggleConfigSchema.parse({
 *   toggleKey: 'f12',
 *   initialVisible: false,
 * });
 * ```
 */
export const DebugToggleConfigSchema = z.object({
	toggleKey: z.string().min(1),
	initialVisible: z.boolean(),
});

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_CONFIG: DebugToggleConfig = {
	toggleKey: 'f12',
	initialVisible: false,
};

// =============================================================================
// IMPLEMENTATION
// =============================================================================

/**
 * Creates a debug toggle for managing overlay visibility.
 *
 * This is a pure state machine that processes key input and manages
 * toggle state. It does not interact with the terminal or DOM.
 *
 * @param config - Optional configuration
 * @returns Debug toggle instance
 *
 * @example
 * ```typescript
 * import { createDebugToggle } from 'blecsd/debug';
 *
 * const toggle = createDebugToggle({
 *   toggleKey: 'f12',
 *   initialVisible: false,
 * });
 *
 * // In input handler
 * game.onKey((key) => {
 *   if (toggle.processKey(key.name.toLowerCase())) {
 *     // Key was consumed by toggle
 *     if (toggle.isVisible()) {
 *       overlay.show();
 *     } else {
 *       overlay.hide();
 *     }
 *   }
 * });
 * ```
 */
export function createDebugToggle(config?: Partial<DebugToggleConfig>): DebugToggle {
	const cfg: DebugToggleConfig = { ...DEFAULT_CONFIG, ...config };

	let visible = cfg.initialVisible;
	let toggleCount = 0;

	return {
		processKey(keyName: string): boolean {
			const normalized = keyName.toLowerCase();
			if (normalized === cfg.toggleKey.toLowerCase()) {
				visible = !visible;
				toggleCount++;
				return true;
			}
			return false;
		},

		isVisible(): boolean {
			return visible;
		},

		getState(): DebugToggleState {
			return {
				visible,
				toggleCount,
			};
		},

		toggle() {
			visible = !visible;
			toggleCount++;
		},

		setVisible(v: boolean) {
			if (visible !== v) {
				visible = v;
				toggleCount++;
			}
		},
	};
}
