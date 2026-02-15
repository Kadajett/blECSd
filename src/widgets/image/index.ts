/**
 * Image Widget
 *
 * Factory widget that renders bitmap images in the terminal.
 * Supports ANSI rendering (256-color, ASCII, braille) and an overlay mode
 * for external image protocols (w3m, iTerm2, Kitty, Sixel).
 *
 * @module widgets/image
 */

// Re-export types
export type { AnimatedImageConfig, ImageConfig, ImageType, ImageWidget } from './types';

// Re-export configuration schemas
export { AnimatedImageConfigSchema, ImageConfigSchema } from './config';

// Re-export state and component
export { Image } from './state';

// Re-export helper functions
export { calculateAspectRatioDimensions, clearAllImageCaches, clearImageCache } from './helpers';

// Re-export factory function
export { createImage } from './factory';

// Re-export API functions
export { getImageBitmap, getImageCellMap, isImage, resetImageStore } from './api';
