/**
 * Image Widget Types
 *
 * TypeScript interfaces and type definitions for the Image widget.
 *
 * @module widgets/image/types
 */

import type { Entity } from '../../core/types';
import type { Bitmap, CellMap, RenderMode } from '../../media/render/ansi';
import type { GraphicsManagerState } from '../../terminal/graphics/backend';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Image rendering type.
 * - 'ansi': Renders bitmap as ANSI escape sequences using 256-color palette
 * - 'overlay': Stores bitmap for external overlay protocols (w3m, iTerm2, Kitty, Sixel)
 */
export type ImageType = 'ansi' | 'overlay';

/**
 * Configuration for creating an Image widget.
 *
 * @example
 * ```typescript
 * import type { ImageConfig } from 'blecsd';
 *
 * const config: ImageConfig = {
 *   x: 10,
 *   y: 5,
 *   width: 40,
 *   height: 20,
 *   type: 'ansi',
 *   renderMode: 'color',
 * };
 * ```
 */
export interface ImageConfig {
	/** X position */
	readonly x?: number;
	/** Y position */
	readonly y?: number;
	/** Width in terminal columns */
	readonly width?: number;
	/** Height in terminal rows */
	readonly height?: number;
	/** Image rendering type (default: 'ansi') */
	readonly type?: ImageType;
	/** Initial bitmap data to render */
	readonly bitmap?: Bitmap;
	/** ANSI render mode (default: 'color'). Only used when type is 'ansi'. */
	readonly renderMode?: RenderMode;
	/** Enable dithering for ANSI color mode (default: false) */
	readonly dither?: boolean;
	/** Whether to show initially (default: true) */
	readonly visible?: boolean;
	/** Preserve aspect ratio when resizing (default: true) */
	readonly preserveAspectRatio?: boolean;
	/** Graphics manager for overlay mode rendering (optional) */
	readonly graphicsManager?: GraphicsManagerState;
}

/**
 * Configuration for creating an animated Image widget.
 *
 * @example
 * ```typescript
 * import type { AnimatedImageConfig } from 'blecsd';
 *
 * const config: AnimatedImageConfig = {
 *   x: 10,
 *   y: 5,
 *   frames: [frame1, frame2, frame3],
 *   frameDelays: [100, 100, 100],
 *   loopCount: 0, // infinite loop
 * };
 * ```
 */
export interface AnimatedImageConfig extends ImageConfig {
	/** Array of frame bitmaps */
	readonly frames: readonly Bitmap[];
	/** Delay in milliseconds for each frame */
	readonly frameDelays: readonly number[];
	/** Number of times to loop (0 = infinite, default: 1) */
	readonly loopCount?: number;
}

/**
 * Image widget interface providing chainable methods.
 *
 * @example
 * ```typescript
 * import { createImage } from 'blecsd';
 *
 * const image = createImage(world, {
 *   x: 0, y: 0, width: 40, height: 20,
 * });
 * image.setImage(bitmap).show();
 * ```
 */
export interface ImageWidget {
	/** The underlying entity ID */
	readonly eid: Entity;

	// Visibility
	/** Shows the image */
	show(): ImageWidget;
	/** Hides the image */
	hide(): ImageWidget;
	/** Checks if visible */
	isVisible(): boolean;

	// Position
	/** Moves the image by dx, dy */
	move(dx: number, dy: number): ImageWidget;
	/** Sets the absolute position */
	setPosition(x: number, y: number): ImageWidget;
	/** Gets current position */
	getPosition(): { x: number; y: number };

	// Image data
	/** Sets the bitmap to render */
	setImage(bitmap: Bitmap): ImageWidget;
	/** Gets the current bitmap data */
	getImage(): Bitmap | undefined;
	/** Gets the image rendering type */
	getType(): ImageType;
	/** Gets the last rendered CellMap (ANSI mode only) */
	getCellMap(): CellMap | undefined;

	// Render options
	/** Sets the ANSI render mode */
	setRenderMode(mode: RenderMode): ImageWidget;
	/** Gets the current render mode */
	getRenderMode(): RenderMode;
	/** Sets the graphics manager for overlay mode rendering */
	setGraphicsManager(manager: GraphicsManagerState): ImageWidget;
	/** Renders the current bitmap to an ANSI string */
	render(): string;

	// Animation
	/** Sets an animated image with multiple frames */
	setAnimatedImage(
		frames: readonly Bitmap[],
		delays: readonly number[],
		loopCount?: number,
	): ImageWidget;
	/** Starts the animation playback */
	startAnimation(): ImageWidget;
	/** Stops the animation playback */
	stopAnimation(): ImageWidget;
	/** Checks if animation is currently playing */
	isAnimating(): boolean;
	/** Gets the current frame index */
	getCurrentFrame(): number;
	/** Sets the current frame by index */
	setFrame(index: number): ImageWidget;

	// Lifecycle
	/** Destroys the image widget */
	destroy(): void;
}
