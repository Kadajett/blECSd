/**
 * Auto-detection and registration of graphics backends.
 *
 * This module handles automatic backend detection and registration,
 * avoiding circular dependencies by importing both backend types and
 * backend implementations.
 *
 * @module terminal/graphics/autoBackend
 */

import { createAnsiBackend } from './ansi';
import {
	createGraphicsManager,
	type GraphicsManagerConfig,
	type GraphicsManagerState,
	registerBackend,
} from './backend';
import { createBrailleBackend } from './braille';
import { createITerm2Backend } from './iterm2';
import { createKittyBackend } from './kitty';
import { createSixelGraphicsBackend } from './sixel';

/**
 * Creates a graphics manager with all backends auto-registered based on detection.
 *
 * This function detects which graphics protocols are supported by the current
 * terminal and automatically registers all available backends. The backends
 * are registered in preference order (kitty > iterm2 > sixel > ansi > braille).
 *
 * @param config - Optional manager configuration (can override preference order)
 * @returns Initialized graphics manager with auto-detected backends
 *
 * @example
 * ```typescript
 * import { createAutoGraphicsManager, renderImage } from 'blecsd';
 *
 * const manager = createAutoGraphicsManager();
 * const output = renderImage(manager, imageData, { x: 0, y: 0 });
 * process.stdout.write(output);
 * ```
 */
export function createAutoGraphicsManager(
	config: GraphicsManagerConfig = {},
): GraphicsManagerState {
	// Create manager with base config
	const manager = createGraphicsManager(config);

	// Register all backends
	// The backends will only report as supported if they're actually available
	registerBackend(manager, createKittyBackend());
	registerBackend(manager, createITerm2Backend());
	registerBackend(manager, createSixelGraphicsBackend());
	registerBackend(manager, createAnsiBackend());
	registerBackend(manager, createBrailleBackend());

	// The selectBackend function will choose the best one based on isSupported()
	return manager;
}
