/**
 * Renderer backend creation namespace.
 *
 * @example
 * ```typescript
 * import { backends } from '@blecsd/3d';
 *
 * // Auto-detect best backend
 * const backend = backends.detectBest();
 *
 * // Or create specific backend
 * const braille = backends.createBraille();
 * const kitty = backends.createKitty();
 *
 * // Render with the backend
 * const output = backend.render(pixelFramebuffer);
 * ```
 */

import {
	createBackendByType,
	createBrailleBackend,
	createHalfBlockBackend,
	createKittyBackend,
	createSextantBackend,
	createSixelBackend,
	detectBestBackend,
	type GraphicsCapabilities,
	type RendererBackend,
} from '../backends';

export const backends = Object.freeze({
	detectBest: detectBestBackend,
	createByType: createBackendByType,
	createBraille: createBrailleBackend,
	createHalfBlock: createHalfBlockBackend,
	createSextant: createSextantBackend,
	createSixel: createSixelBackend,
	createKitty: createKittyBackend,
});

export type BackendsModule = typeof backends;
export type { RendererBackend, GraphicsCapabilities };
