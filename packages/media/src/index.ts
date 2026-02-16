/**
 * Media rendering subsystem for blECSd.
 *
 * Provides GIF/PNG parsing, ANSI cell rendering, W3M overlay support,
 * and image/video widgets for terminal media display.
 *
 * @module media
 */

// GIF parser with LZW decompression
export * from './gif';
// Namespace objects for API discoverability
export * from './namespaces';
// W3M overlay support
export * from './overlay';
// PNG parser with filters and pixel handling
export * from './png';
// ANSI cell rendering for media display
export * from './render';
// Image widget
export * from './widgets/image';
// Video widget
export * from './widgets/video';
