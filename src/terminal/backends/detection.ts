/**
 * 2D Render Backend Auto-Detection
 *
 * Selects the best available 2D rendering backend based on terminal
 * capabilities. Follows a similar pattern to the 3D backend detection.
 *
 * Priority: kitty > ansi (fallback)
 *
 * @module terminal/backends/detection
 *
 * @example
 * ```typescript
 * import { detectRenderBackend, createRenderBackendByType } from 'blecsd';
 *
 * // Auto-detect the best backend
 * const backend = detectRenderBackend();
 *
 * // Or force a specific type
 * const ansi = createRenderBackendByType('ansi');
 * ```
 */

import { createAnsiBackend } from './ansi';
import { createKittyRenderBackend } from './kitty';
import type { RenderBackend, RenderBackendType } from './types';

/**
 * Backend detection preferences.
 */
export interface RenderBackendPreference {
	/** Preferred backend type, or 'auto' for auto-detection (default: 'auto') */
	readonly preferred?: RenderBackendType | 'auto';
	/** Fallback backend type if preferred isn't available (default: 'ansi') */
	readonly fallback?: RenderBackendType;
}

/**
 * Creates a render backend by explicit type.
 *
 * @param type - The backend type to create
 * @returns A new RenderBackend of the specified type
 *
 * @example
 * ```typescript
 * import { createRenderBackendByType } from 'blecsd';
 *
 * const ansi = createRenderBackendByType('ansi');
 * const kitty = createRenderBackendByType('kitty');
 * ```
 */
export function createRenderBackendByType(type: RenderBackendType): RenderBackend {
	switch (type) {
		case 'ansi':
			return createAnsiBackend();
		case 'kitty':
			return createKittyRenderBackend();
	}
}

/**
 * Detects the best available 2D rendering backend.
 *
 * Detection order:
 * 1. If preferred is specified and not 'auto', use that
 * 2. Try Kitty backend (checks TERM_PROGRAM, KITTY_WINDOW_ID)
 * 3. Fall back to ANSI (always supported)
 *
 * @param preference - Optional backend preferences
 * @returns The best available RenderBackend
 *
 * @example
 * ```typescript
 * import { detectRenderBackend } from 'blecsd';
 *
 * // Auto-detect
 * const backend = detectRenderBackend();
 *
 * // Prefer kitty, fall back to ansi
 * const kittyOrAnsi = detectRenderBackend({ preferred: 'auto' });
 *
 * // Force ansi
 * const ansi = detectRenderBackend({ preferred: 'ansi' });
 * ```
 */
export function detectRenderBackend(preference?: RenderBackendPreference): RenderBackend {
	const preferred = preference?.preferred ?? 'auto';
	const fallback = preference?.fallback ?? 'ansi';

	// Explicit backend request
	if (preferred !== 'auto') {
		return createRenderBackendByType(preferred);
	}

	// Auto-detection: try kitty first
	const kitty = createKittyRenderBackend();
	if (kitty.detect()) {
		return kitty;
	}

	// Fallback
	return createRenderBackendByType(fallback);
}

/**
 * Gets the names of all available render backend types.
 *
 * @returns Array of backend type names
 *
 * @example
 * ```typescript
 * import { getAvailableBackends } from 'blecsd';
 *
 * console.log(getAvailableBackends()); // ['ansi', 'kitty']
 * ```
 */
export function getAvailableBackends(): readonly RenderBackendType[] {
	return ['ansi', 'kitty'];
}
