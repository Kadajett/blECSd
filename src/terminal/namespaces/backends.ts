/**
 * Render backend namespace.
 *
 * Functions for creating and managing 2D terminal rendering backends
 * (ANSI, Kitty) with automatic capability detection.
 *
 * @example
 * ```typescript
 * import { backends } from 'blecsd/terminal';
 *
 * // Detect and create appropriate backend
 * const backendType = backends.detectRenderBackend();
 * const backend = backends.createRenderBackendByType(backendType, config);
 *
 * // Or create specific backends
 * const ansi = backends.createAnsiBackend(config);
 * const kitty = backends.createKittyRenderBackend(config);
 *
 * // Query available backends
 * const available = backends.getAvailableBackends();
 * ```
 */

import {
	createAnsiBackend,
	createKittyRenderBackend,
	createRenderBackendByType,
	detectRenderBackend,
	encodeKittyImage,
	getAvailableBackends,
} from '../backends';

/**
 * Render backend namespace.
 */
export const backends = Object.freeze({
	createAnsiBackend,
	createKittyRenderBackend,
	createRenderBackendByType,
	detectRenderBackend,
	encodeKittyImage,
	getAvailableBackends,
});

export type BackendsModule = typeof backends;
