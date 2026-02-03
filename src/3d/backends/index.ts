/**
 * 3D renderer backends.
 * @module 3d/backends
 */

export type { RendererBackend } from './types';
export type { GraphicsCapabilities } from './detection';
export { createBrailleBackend } from './braille';
export { createBackendByType, detectBestBackend } from './detection';
export { createHalfBlockBackend } from './halfblock';
export { createKittyBackend } from './kitty';
export { createSextantBackend } from './sextant';
export { createSixelBackend } from './sixel';
