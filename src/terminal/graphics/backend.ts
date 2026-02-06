/**
 * Graphics Protocol Abstraction
 *
 * Pluggable terminal graphics backend for image rendering.
 * Provides a unified interface for different terminal graphics protocols
 * (Kitty, iTerm2, Sixel, ANSI art, ASCII).
 *
 * @module terminal/graphics/backend
 */

import { z } from 'zod';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Graphics backend capability flags.
 *
 * @example
 * ```typescript
 * import type { GraphicsCapabilities } from 'blecsd';
 *
 * const caps: GraphicsCapabilities = {
 *   staticImages: true,
 *   animation: false,
 *   alphaChannel: true,
 *   maxWidth: null,
 *   maxHeight: null,
 * };
 * ```
 */
export interface GraphicsCapabilities {
	/** Whether the backend can render static images */
	readonly staticImages: boolean;
	/** Whether the backend supports animated images */
	readonly animation: boolean;
	/** Whether the backend supports alpha/transparency */
	readonly alphaChannel: boolean;
	/** Maximum image width in pixels, or null for unlimited */
	readonly maxWidth: number | null;
	/** Maximum image height in pixels, or null for unlimited */
	readonly maxHeight: number | null;
}

/**
 * Image data passed to graphics backends.
 *
 * @example
 * ```typescript
 * import type { ImageData } from 'blecsd';
 *
 * const img: ImageData = {
 *   width: 100, height: 50,
 *   data: rgbaBuffer,
 *   format: 'rgba',
 * };
 * ```
 */
export interface ImageData {
	/** Image width in pixels */
	readonly width: number;
	/** Image height in pixels */
	readonly height: number;
	/** Raw pixel data */
	readonly data: Uint8Array;
	/** Pixel format */
	readonly format: 'rgba' | 'rgb' | 'png';
}

/**
 * Options for rendering an image.
 *
 * @example
 * ```typescript
 * import type { RenderOptions } from 'blecsd';
 *
 * const opts: RenderOptions = { x: 10, y: 5, width: 40, height: 20 };
 * ```
 */
export interface RenderOptions {
	/** X position in terminal columns */
	readonly x: number;
	/** Y position in terminal rows */
	readonly y: number;
	/** Display width in terminal columns (optional, auto-sized if omitted) */
	readonly width?: number;
	/** Display height in terminal rows (optional, auto-sized if omitted) */
	readonly height?: number;
	/** Image identifier for clear operations */
	readonly id?: number;
	/** Whether to preserve aspect ratio (default: true) */
	readonly preserveAspectRatio?: boolean;
}

/**
 * Graphics backend name.
 */
export type BackendName = 'kitty' | 'iterm2' | 'sixel' | 'ansi' | 'ascii';

/**
 * A graphics backend that can render images to the terminal.
 * All functions are stateless and pure where possible.
 *
 * @example
 * ```typescript
 * import type { GraphicsBackend } from 'blecsd';
 *
 * const backend: GraphicsBackend = {
 *   name: 'ansi',
 *   capabilities: { staticImages: true, animation: false, alphaChannel: true, maxWidth: null, maxHeight: null },
 *   render: (image, options) => ansiSequence,
 *   clear: (id) => clearSequence,
 *   isSupported: () => true,
 * };
 * ```
 */
export interface GraphicsBackend {
	/** Backend identifier */
	readonly name: BackendName;
	/** Backend capabilities */
	readonly capabilities: GraphicsCapabilities;
	/** Render an image and return the terminal escape sequence */
	readonly render: (image: ImageData, options: RenderOptions) => string;
	/** Clear an image (or all images) and return the escape sequence */
	readonly clear: (id?: number) => string;
	/** Check if this backend is supported in the current terminal */
	readonly isSupported: () => boolean;
}

// =============================================================================
// ZOD SCHEMAS
// =============================================================================

/**
 * Zod schema for GraphicsCapabilities.
 */
export const GraphicsCapabilitiesSchema = z.object({
	staticImages: z.boolean(),
	animation: z.boolean(),
	alphaChannel: z.boolean(),
	maxWidth: z.number().int().positive().nullable(),
	maxHeight: z.number().int().positive().nullable(),
});

/**
 * Zod schema for ImageData.
 */
export const ImageDataSchema = z.object({
	width: z.number().int().nonnegative(),
	height: z.number().int().nonnegative(),
	data: z.instanceof(Uint8Array),
	format: z.enum(['rgba', 'rgb', 'png']),
});

/**
 * Zod schema for RenderOptions.
 *
 * @example
 * ```typescript
 * import { RenderOptionsSchema } from 'blecsd';
 *
 * const result = RenderOptionsSchema.safeParse({ x: 0, y: 0 });
 * ```
 */
export const RenderOptionsSchema = z.object({
	x: z.number().int().nonnegative(),
	y: z.number().int().nonnegative(),
	width: z.number().int().positive().optional(),
	height: z.number().int().positive().optional(),
	id: z.number().int().nonnegative().optional(),
	preserveAspectRatio: z.boolean().optional(),
});

// =============================================================================
// FALLBACK CHAIN
// =============================================================================

/**
 * Default backend preference order.
 * Higher-fidelity protocols are preferred first.
 */
export const DEFAULT_FALLBACK_CHAIN: readonly BackendName[] = [
	'kitty',
	'iterm2',
	'sixel',
	'ansi',
	'ascii',
];

/**
 * Selects the best available backend from a list of registered backends.
 *
 * Checks each backend in the preference order and returns the first one
 * that reports itself as supported in the current terminal.
 *
 * @param backends - Map of registered backends
 * @param preferenceOrder - Backend preference order (default: kitty > iterm2 > sixel > ansi > ascii)
 * @returns The best available backend, or undefined if none are supported
 *
 * @example
 * ```typescript
 * import { selectBackend } from 'blecsd';
 *
 * const backend = selectBackend(registeredBackends);
 * if (backend) {
 *   const output = backend.render(imageData, { x: 0, y: 0 });
 * }
 * ```
 */
export function selectBackend(
	backends: ReadonlyMap<BackendName, GraphicsBackend>,
	preferenceOrder: readonly BackendName[] = DEFAULT_FALLBACK_CHAIN,
): GraphicsBackend | undefined {
	for (const name of preferenceOrder) {
		const backend = backends.get(name);
		if (backend?.isSupported()) {
			return backend;
		}
	}
	return undefined;
}

// =============================================================================
// GRAPHICS MANAGER
// =============================================================================

/**
 * Configuration for the graphics manager.
 */
export interface GraphicsManagerConfig {
	/** Backend preference order */
	readonly preferenceOrder?: readonly BackendName[];
	/** Pre-registered backends */
	readonly backends?: readonly GraphicsBackend[];
}

/**
 * Zod schema for GraphicsManagerConfig.
 */
export const GraphicsManagerConfigSchema = z.object({
	preferenceOrder: z.array(z.enum(['kitty', 'iterm2', 'sixel', 'ansi', 'ascii'])).optional(),
});

/**
 * Graphics manager state, holding registered backends and the active backend.
 */
export interface GraphicsManagerState {
	/** Registered backends by name */
	readonly backends: Map<BackendName, GraphicsBackend>;
	/** Currently active backend (lazily selected) */
	activeBackend: GraphicsBackend | undefined;
	/** Backend preference order */
	readonly preferenceOrder: readonly BackendName[];
}

/**
 * Creates a graphics manager state.
 *
 * @param config - Manager configuration
 * @returns Initialized graphics manager state
 *
 * @example
 * ```typescript
 * import { createGraphicsManager, registerBackend } from 'blecsd';
 *
 * const manager = createGraphicsManager();
 * registerBackend(manager, ansiBackend);
 * ```
 */
export function createGraphicsManager(config: GraphicsManagerConfig = {}): GraphicsManagerState {
	const backends = new Map<BackendName, GraphicsBackend>();

	if (config.backends) {
		for (const backend of config.backends) {
			backends.set(backend.name, backend);
		}
	}

	return {
		backends,
		activeBackend: undefined,
		preferenceOrder: config.preferenceOrder ?? DEFAULT_FALLBACK_CHAIN,
	};
}

/**
 * Registers a graphics backend with the manager.
 *
 * @param manager - Graphics manager state
 * @param backend - Backend to register
 *
 * @example
 * ```typescript
 * import { registerBackend } from 'blecsd';
 *
 * registerBackend(manager, iterm2Backend);
 * ```
 */
export function registerBackend(manager: GraphicsManagerState, backend: GraphicsBackend): void {
	manager.backends.set(backend.name, backend);
	// Invalidate cached selection
	manager.activeBackend = undefined;
}

/**
 * Gets the active graphics backend, selecting the best one if needed.
 *
 * @param manager - Graphics manager state
 * @returns The active backend, or undefined if none available
 *
 * @example
 * ```typescript
 * import { getActiveBackend } from 'blecsd';
 *
 * const backend = getActiveBackend(manager);
 * if (backend) {
 *   console.log(`Using ${backend.name} backend`);
 * }
 * ```
 */
export function getActiveBackend(manager: GraphicsManagerState): GraphicsBackend | undefined {
	if (!manager.activeBackend) {
		manager.activeBackend = selectBackend(manager.backends, manager.preferenceOrder);
	}
	return manager.activeBackend;
}

/**
 * Renders an image using the active backend.
 *
 * @param manager - Graphics manager state
 * @param image - Image data to render
 * @param options - Render options
 * @returns The terminal escape sequence, or empty string if no backend
 *
 * @example
 * ```typescript
 * import { renderImage } from 'blecsd';
 *
 * const output = renderImage(manager, imageData, { x: 10, y: 5 });
 * process.stdout.write(output);
 * ```
 */
export function renderImage(
	manager: GraphicsManagerState,
	image: ImageData,
	options: RenderOptions,
): string {
	const backend = getActiveBackend(manager);
	if (!backend) return '';
	return backend.render(image, options);
}

/**
 * Clears an image (or all images) using the active backend.
 *
 * @param manager - Graphics manager state
 * @param id - Optional image ID to clear (clears all if omitted)
 * @returns The terminal escape sequence, or empty string if no backend
 *
 * @example
 * ```typescript
 * import { clearImage } from 'blecsd';
 *
 * const output = clearImage(manager, 1);
 * process.stdout.write(output);
 * ```
 */
export function clearImage(manager: GraphicsManagerState, id?: number): string {
	const backend = getActiveBackend(manager);
	if (!backend) return '';
	return backend.clear(id);
}

/**
 * Re-selects the active backend. Call after terminal resize or
 * when capabilities change.
 *
 * @param manager - Graphics manager state
 * @returns The newly selected backend, or undefined
 *
 * @example
 * ```typescript
 * import { refreshBackend } from 'blecsd';
 *
 * process.on('SIGWINCH', () => refreshBackend(manager));
 * ```
 */
export function refreshBackend(manager: GraphicsManagerState): GraphicsBackend | undefined {
	manager.activeBackend = undefined;
	return getActiveBackend(manager);
}

/**
 * Gets the capabilities of the active backend.
 *
 * @param manager - Graphics manager state
 * @returns Capabilities or undefined if no backend
 */
export function getBackendCapabilities(
	manager: GraphicsManagerState,
): GraphicsCapabilities | undefined {
	return getActiveBackend(manager)?.capabilities;
}
