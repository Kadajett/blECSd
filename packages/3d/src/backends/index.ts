/**
 * 3D renderer backends.
 * @module 3d/backends
 */

export { createBrailleBackend } from './braille';
export type { GraphicsCapabilities } from './detection';
export { createBackendByType, detectBestBackend } from './detection';
export { createHalfBlockBackend } from './halfblock';
export { createKittyBackend } from './kitty';
export { createSextantBackend } from './sextant';
export { createSixelBackend } from './sixel';
export type { RendererBackend } from './types';
