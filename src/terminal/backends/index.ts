/**
 * 2D TUI Render Backends
 *
 * Provides a pluggable rendering abstraction for terminal output.
 * Includes ANSI (default) and Kitty graphics protocol backends
 * with auto-detection.
 *
 * @module terminal/backends
 */

export type { AnsiBackendConfig } from './ansi';
export { createAnsiBackend } from './ansi';
export type { RenderBackendPreference } from './detection';
export {
	createRenderBackendByType,
	detectRenderBackend,
	getAvailableBackends,
} from './detection';
export type { KittyBackendConfig } from './kitty';
export { createKittyRenderBackend, encodeKittyImage } from './kitty';
export type {
	RenderBackend,
	RenderBackendCapabilities,
	RenderBackendType,
	RenderCell,
} from './types';
