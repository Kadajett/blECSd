/**
 * Image Widget
 *
 * Factory widget that renders bitmap images in the terminal.
 * Supports ANSI rendering (256-color, ASCII, braille) and an overlay mode
 * for external image protocols (w3m, iTerm2, Kitty, Sixel).
 *
 * @module widgets/image
 */

import { z } from 'zod';
import { setContent } from '../components/content';
import { setDimensions } from '../components/dimensions';
import { Position, setPosition } from '../components/position';
import { markDirty, setVisible } from '../components/renderable';
import { addEntity, removeEntity } from '../core/ecs';
import type { Entity, World } from '../core/types';
import type { Bitmap, CellMap, RenderMode } from '../media/render/ansi';
import { cellMapToString, renderToAnsi } from '../media/render/ansi';

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

// =============================================================================
// ZOD SCHEMAS
// =============================================================================

/**
 * Zod schema for image widget configuration.
 *
 * @example
 * ```typescript
 * import { ImageConfigSchema } from 'blecsd';
 *
 * const result = ImageConfigSchema.safeParse({ type: 'ansi', width: 40 });
 * ```
 */
export const ImageConfigSchema = z.object({
	x: z.number().int().default(0),
	y: z.number().int().default(0),
	width: z.number().int().positive().optional(),
	height: z.number().int().positive().optional(),
	type: z.enum(['ansi', 'overlay']).default('ansi'),
	bitmap: z
		.object({
			width: z.number().int().nonnegative(),
			height: z.number().int().nonnegative(),
			data: z.instanceof(Uint8Array),
		})
		.optional(),
	renderMode: z.enum(['color', 'ascii', 'braille']).default('color'),
	dither: z.boolean().default(false),
	visible: z.boolean().default(true),
	preserveAspectRatio: z.boolean().default(true),
});

/**
 * Zod schema for animated image configuration.
 *
 * @example
 * ```typescript
 * import { AnimatedImageConfigSchema } from 'blecsd';
 *
 * const result = AnimatedImageConfigSchema.safeParse({ frames: [...], frameDelays: [100, 100] });
 * ```
 */
export const AnimatedImageConfigSchema = ImageConfigSchema.extend({
	frames: z.array(
		z.object({
			width: z.number().int().nonnegative(),
			height: z.number().int().nonnegative(),
			data: z.instanceof(Uint8Array),
		}),
	),
	frameDelays: z.array(z.number().positive()),
	loopCount: z.number().int().nonnegative().default(1),
}).refine((data) => data.frames.length === data.frameDelays.length, {
	message: 'frames and frameDelays arrays must have the same length',
});

// =============================================================================
// COMPONENT TAG
// =============================================================================

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

/**
 * Image component marker for identifying image entities.
 */
export const Image = {
	/** Tag indicating this is an image widget (1 = yes) */
	isImage: new Uint8Array(DEFAULT_CAPACITY),
};

// =============================================================================
// INTERNAL STATE
// =============================================================================

/** Maps entity IDs to their bitmap data */
const imageBitmapStore = new Map<Entity, Bitmap>();

/** Maps entity IDs to their image type */
const imageTypeStore = new Map<Entity, ImageType>();

/** Maps entity IDs to their render mode */
const imageRenderModeStore = new Map<Entity, RenderMode>();

/** Maps entity IDs to their dither setting */
const imageDitherStore = new Map<Entity, boolean>();

/** Maps entity IDs to their last rendered CellMap */
const imageCellMapStore = new Map<Entity, CellMap>();

/** Maps entity IDs to their visibility state */
const imageVisibleStore = new Map<Entity, boolean>();

/** Maps entity IDs to their aspect ratio preservation flag */
const imagePreserveAspectRatioStore = new Map<Entity, boolean>();

/** Maps entity IDs to their animation frames */
const imageAnimationFramesStore = new Map<Entity, readonly Bitmap[]>();

/** Maps entity IDs to their frame delays (in milliseconds) */
const imageAnimationDelaysStore = new Map<Entity, readonly number[]>();

/** Maps entity IDs to their loop count (0 = infinite) */
const imageAnimationLoopCountStore = new Map<Entity, number>();

/** Maps entity IDs to their current frame index */
const imageCurrentFrameStore = new Map<Entity, number>();

/** Maps entity IDs to their animation timer handle */
const imageAnimationTimerStore = new Map<Entity, ReturnType<typeof setInterval> | undefined>();

/** Maps entity IDs to their current loop iteration */
const imageCurrentLoopStore = new Map<Entity, number>();

/** Maps entity IDs to their rendered CellMap cache (keyed by render parameters) */
const imageCellMapCacheStore = new Map<Entity, Map<string, CellMap>>();

// =============================================================================
// INTERNAL HELPERS
// =============================================================================

/**
 * Calculates dimensions while preserving aspect ratio.
 *
 * @param srcWidth - Source bitmap width
 * @param srcHeight - Source bitmap height
 * @param targetWidth - Desired width (optional)
 * @param targetHeight - Desired height (optional)
 * @param preserve - Whether to preserve aspect ratio
 * @returns Calculated dimensions
 *
 * @example
 * ```typescript
 * // Image is 100x50, want width=40
 * calculateAspectRatioDimensions(100, 50, 40, undefined, true);
 * // Returns { width: 40, height: 20 }
 * ```
 */
export function calculateAspectRatioDimensions(
	srcWidth: number,
	srcHeight: number,
	targetWidth?: number,
	targetHeight?: number,
	preserve?: boolean,
): { width: number; height: number } {
	if (srcWidth === 0 || srcHeight === 0) {
		return { width: 0, height: 0 };
	}

	const shouldPreserve = preserve ?? true;

	// Both dimensions specified
	if (targetWidth !== undefined && targetHeight !== undefined) {
		if (!shouldPreserve) {
			return { width: targetWidth, height: targetHeight };
		}

		// Preserve aspect ratio by fitting within bounds (letterbox)
		const srcAspect = srcWidth / srcHeight;
		const targetAspect = targetWidth / targetHeight;

		if (srcAspect > targetAspect) {
			// Source is wider, constrain by width
			return {
				width: targetWidth,
				height: Math.round(targetWidth / srcAspect),
			};
		}
		// Source is taller, constrain by height
		return {
			width: Math.round(targetHeight * srcAspect),
			height: targetHeight,
		};
	}

	// Only width specified
	if (targetWidth !== undefined) {
		if (!shouldPreserve) {
			return { width: targetWidth, height: srcHeight };
		}
		const aspectRatio = srcWidth / srcHeight;
		return {
			width: targetWidth,
			height: Math.round(targetWidth / aspectRatio),
		};
	}

	// Only height specified
	if (targetHeight !== undefined) {
		if (!shouldPreserve) {
			return { width: srcWidth, height: targetHeight };
		}
		const aspectRatio = srcWidth / srcHeight;
		return {
			width: Math.round(targetHeight * aspectRatio),
			height: targetHeight,
		};
	}

	// No dimensions specified, use source dimensions
	return { width: srcWidth, height: srcHeight };
}

/**
 * Creates a cache key string from bitmap properties.
 */
function createCacheKey(
	bitmapDataPtr: number,
	mode: RenderMode,
	dither: boolean,
	width: number,
	height: number,
): string {
	return `${bitmapDataPtr}:${mode}:${dither ? '1' : '0'}:${width}:${height}`;
}

/**
 * Clears the rendered CellMap cache for a specific entity.
 *
 * @param eid - Entity ID
 *
 * @example
 * ```typescript
 * import { clearImageCache } from 'blecsd';
 *
 * clearImageCache(imageEntity);
 * ```
 */
export function clearImageCache(eid: Entity): void {
	imageCellMapCacheStore.delete(eid);
}

/**
 * Clears all rendered CellMap caches.
 *
 * @example
 * ```typescript
 * import { clearAllImageCaches } from 'blecsd';
 *
 * clearAllImageCaches();
 * ```
 */
export function clearAllImageCaches(): void {
	imageCellMapCacheStore.clear();
}

/**
 * Renders the stored bitmap for an entity and updates its content.
 * Uses caching to avoid re-rendering the same bitmap configuration.
 */
function renderImageContent(world: World, eid: Entity): void {
	const bitmap = imageBitmapStore.get(eid);
	if (!bitmap) {
		setContent(world, eid, '');
		imageCellMapStore.delete(eid);
		return;
	}

	// Handle zero-dimension bitmaps gracefully
	if (bitmap.width === 0 || bitmap.height === 0) {
		setContent(world, eid, '');
		imageCellMapStore.delete(eid);
		return;
	}

	const imageType = imageTypeStore.get(eid) ?? 'ansi';
	if (imageType !== 'ansi') {
		// Overlay mode: content is empty, bitmap is stored for external rendering
		setContent(world, eid, '');
		return;
	}

	const mode = imageRenderModeStore.get(eid) ?? 'color';
	const dither = imageDitherStore.get(eid) ?? false;

	// Create cache key
	// Use a simple hash of bitmap data pointer (not content) for cache key
	// This is a simplification - in a real scenario, you'd hash the data or use a unique ID
	const bitmapDataPtr = bitmap.data.byteOffset;
	const cacheKey = createCacheKey(bitmapDataPtr, mode, dither, bitmap.width, bitmap.height);

	// Check cache
	let cache = imageCellMapCacheStore.get(eid);
	if (!cache) {
		cache = new Map<string, CellMap>();
		imageCellMapCacheStore.set(eid, cache);
	}

	let cellMap = cache.get(cacheKey);
	if (!cellMap) {
		// Cache miss - render and store
		cellMap = renderToAnsi(bitmap, {
			width: undefined,
			height: undefined,
			mode,
			dither,
		});
		cache.set(cacheKey, cellMap);
	}

	imageCellMapStore.set(eid, cellMap);

	const content = cellMapToString(cellMap);
	setContent(world, eid, content);
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Creates an Image widget.
 *
 * The Image widget renders bitmap data in the terminal using either ANSI escape
 * sequences (for 256-color, ASCII art, or braille output) or stores the bitmap
 * for external overlay protocols.
 *
 * @param world - The ECS world
 * @param config - Image configuration
 * @returns ImageWidget interface
 *
 * @example
 * ```typescript
 * import { createImage } from 'blecsd';
 *
 * // Create a 2x2 red image in ANSI mode
 * const bitmap = {
 *   width: 2,
 *   height: 2,
 *   data: new Uint8Array([
 *     255, 0, 0, 255,  255, 0, 0, 255,
 *     255, 0, 0, 255,  255, 0, 0, 255,
 *   ]),
 * };
 *
 * const image = createImage(world, {
 *   x: 5,
 *   y: 2,
 *   type: 'ansi',
 *   renderMode: 'color',
 *   bitmap,
 * });
 *
 * // Get the rendered ANSI string
 * const output = image.render();
 * ```
 */
export function createImage(world: World, config: ImageConfig = {}): ImageWidget {
	const parsed = ImageConfigSchema.parse(config);

	const eid = addEntity(world);

	// Set position
	setPosition(world, eid, parsed.x, parsed.y);

	// Calculate dimensions with aspect ratio preservation
	let width: number;
	let height: number;

	if (parsed.bitmap) {
		const dimensions = calculateAspectRatioDimensions(
			parsed.bitmap.width,
			parsed.bitmap.height,
			parsed.width,
			parsed.height,
			parsed.preserveAspectRatio,
		);
		width = dimensions.width;
		height = dimensions.height;
	} else {
		width = parsed.width ?? 0;
		height = parsed.height ?? 0;
	}

	setDimensions(world, eid, width, height);

	// Mark as image
	Image.isImage[eid] = 1;

	// Store state
	imageTypeStore.set(eid, parsed.type);
	imageRenderModeStore.set(eid, parsed.renderMode);
	imageDitherStore.set(eid, parsed.dither);
	imageVisibleStore.set(eid, parsed.visible);
	imagePreserveAspectRatioStore.set(eid, parsed.preserveAspectRatio);

	// Initialize animation stores
	imageAnimationFramesStore.set(eid, []);
	imageAnimationDelaysStore.set(eid, []);
	imageAnimationLoopCountStore.set(eid, 1);
	imageCurrentFrameStore.set(eid, 0);
	imageCurrentLoopStore.set(eid, 0);
	imageAnimationTimerStore.set(eid, undefined);

	// Store and render bitmap if provided
	if (parsed.bitmap) {
		imageBitmapStore.set(eid, parsed.bitmap);
		renderImageContent(world, eid);
	}

	// Set visibility
	if (!parsed.visible) {
		setVisible(world, eid, false);
	}

	return createImageWidgetInterface(world, eid);
}

/**
 * Creates the ImageWidget interface for an entity.
 */
function createImageWidgetInterface(world: World, eid: Entity): ImageWidget {
	return {
		get eid() {
			return eid;
		},

		show() {
			imageVisibleStore.set(eid, true);
			setVisible(world, eid, true);
			markDirty(world, eid);
			return this;
		},

		hide() {
			imageVisibleStore.set(eid, false);
			setVisible(world, eid, false);
			markDirty(world, eid);
			return this;
		},

		isVisible() {
			return imageVisibleStore.get(eid) ?? false;
		},

		move(dx: number, dy: number) {
			const x = Position.x[eid] ?? 0;
			const y = Position.y[eid] ?? 0;
			setPosition(world, eid, x + dx, y + dy);
			markDirty(world, eid);
			return this;
		},

		setPosition(x: number, y: number) {
			setPosition(world, eid, x, y);
			markDirty(world, eid);
			return this;
		},

		getPosition() {
			return {
				x: Position.x[eid] ?? 0,
				y: Position.y[eid] ?? 0,
			};
		},

		setImage(bitmap: Bitmap) {
			// Clear animation state when setting a single image
			imageAnimationFramesStore.set(eid, []);
			imageAnimationDelaysStore.set(eid, []);
			this.stopAnimation();

			imageBitmapStore.set(eid, bitmap);
			clearImageCache(eid); // Invalidate cache
			renderImageContent(world, eid);
			markDirty(world, eid);
			return this;
		},

		getImage() {
			return imageBitmapStore.get(eid);
		},

		getType() {
			return imageTypeStore.get(eid) ?? 'ansi';
		},

		getCellMap() {
			return imageCellMapStore.get(eid);
		},

		setRenderMode(mode: RenderMode) {
			imageRenderModeStore.set(eid, mode);
			clearImageCache(eid); // Invalidate cache
			renderImageContent(world, eid);
			markDirty(world, eid);
			return this;
		},

		getRenderMode() {
			return imageRenderModeStore.get(eid) ?? 'color';
		},

		render() {
			const bitmap = imageBitmapStore.get(eid);
			if (!bitmap) return '';

			const mode = imageRenderModeStore.get(eid) ?? 'color';
			const dither = imageDitherStore.get(eid) ?? false;

			const cellMap = renderToAnsi(bitmap, { mode, dither });
			return cellMapToString(cellMap);
		},

		setAnimatedImage(frames: readonly Bitmap[], delays: readonly number[], loopCount = 1) {
			// Validate inputs
			if (frames.length === 0) {
				throw new Error('frames array cannot be empty');
			}
			if (frames.length !== delays.length) {
				throw new Error('frames and delays arrays must have the same length');
			}
			for (const delay of delays) {
				if (delay <= 0) {
					throw new Error('all frame delays must be positive numbers');
				}
			}

			// Stop existing animation
			this.stopAnimation();

			// Store animation data
			imageAnimationFramesStore.set(eid, frames);
			imageAnimationDelaysStore.set(eid, delays);
			imageAnimationLoopCountStore.set(eid, loopCount);
			imageCurrentFrameStore.set(eid, 0);
			imageCurrentLoopStore.set(eid, 0);

			// Set first frame
			imageBitmapStore.set(eid, frames[0] as Bitmap);
			clearImageCache(eid);
			renderImageContent(world, eid);
			markDirty(world, eid);

			return this;
		},

		startAnimation() {
			const frames = imageAnimationFramesStore.get(eid);
			const delays = imageAnimationDelaysStore.get(eid);

			if (!frames || frames.length === 0 || !delays || delays.length === 0) {
				return this; // No animation to start
			}

			// Stop existing animation timer
			this.stopAnimation();

			const loopCount = imageAnimationLoopCountStore.get(eid) ?? 1;

			const shouldStopAfterLoop = (currentLoop: number): boolean => {
				return loopCount > 0 && currentLoop >= loopCount;
			};

			const updateFrame = (frameIndex: number): void => {
				const frame = frames[frameIndex];
				if (frame) {
					imageBitmapStore.set(eid, frame);
					renderImageContent(world, eid);
					markDirty(world, eid);
				}
			};

			const scheduleNextFrame = (frameIndex: number, advance: () => void): void => {
				const timer = imageAnimationTimerStore.get(eid);
				if (timer !== undefined) {
					clearTimeout(timer);
				}

				const delay = delays[frameIndex] ?? 100;
				const newTimer = setTimeout(advance, delay);
				imageAnimationTimerStore.set(eid, newTimer as unknown as ReturnType<typeof setInterval>);
			};

			const advanceFrame = (): void => {
				let frameIndex = imageCurrentFrameStore.get(eid) ?? 0;
				frameIndex = (frameIndex + 1) % frames.length;

				// Check if we've completed a loop
				if (frameIndex === 0) {
					const currentLoop = (imageCurrentLoopStore.get(eid) ?? 0) + 1;
					imageCurrentLoopStore.set(eid, currentLoop);

					if (shouldStopAfterLoop(currentLoop)) {
						imageCurrentFrameStore.set(eid, 0);
						updateFrame(0);
						this.stopAnimation();
						return;
					}
				}

				imageCurrentFrameStore.set(eid, frameIndex);
				updateFrame(frameIndex);
				scheduleNextFrame(frameIndex, advanceFrame);
			};

			// Start with the first frame's delay
			const initialDelay = delays[imageCurrentFrameStore.get(eid) ?? 0] ?? 100;
			const timer = setTimeout(advanceFrame, initialDelay);
			imageAnimationTimerStore.set(eid, timer as unknown as ReturnType<typeof setInterval>);

			return this;
		},

		stopAnimation() {
			const timer = imageAnimationTimerStore.get(eid);
			if (timer !== undefined) {
				clearTimeout(timer);
				imageAnimationTimerStore.set(eid, undefined);
			}
			return this;
		},

		isAnimating() {
			return imageAnimationTimerStore.get(eid) !== undefined;
		},

		getCurrentFrame() {
			return imageCurrentFrameStore.get(eid) ?? 0;
		},

		setFrame(index: number) {
			const frames = imageAnimationFramesStore.get(eid);
			if (!frames || frames.length === 0) {
				return this; // No frames to set
			}

			const clampedIndex = Math.max(0, Math.min(index, frames.length - 1));
			imageCurrentFrameStore.set(eid, clampedIndex);

			const frame = frames[clampedIndex];
			if (frame) {
				imageBitmapStore.set(eid, frame);
				renderImageContent(world, eid);
				markDirty(world, eid);
			}

			return this;
		},

		destroy() {
			// Stop animation and clear timer
			this.stopAnimation();

			// Clear all state
			Image.isImage[eid] = 0;
			imageBitmapStore.delete(eid);
			imageTypeStore.delete(eid);
			imageRenderModeStore.delete(eid);
			imageDitherStore.delete(eid);
			imageCellMapStore.delete(eid);
			imageVisibleStore.delete(eid);
			imagePreserveAspectRatioStore.delete(eid);
			imageAnimationFramesStore.delete(eid);
			imageAnimationDelaysStore.delete(eid);
			imageAnimationLoopCountStore.delete(eid);
			imageCurrentFrameStore.delete(eid);
			imageCurrentLoopStore.delete(eid);
			imageAnimationTimerStore.delete(eid);
			imageCellMapCacheStore.delete(eid);
			removeEntity(world, eid);
		},
	};
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Checks if an entity is an image widget.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @param eid - Entity ID
 * @returns true if entity is an image widget
 *
 * @example
 * ```typescript
 * import { isImage } from 'blecsd';
 *
 * if (isImage(world, entity)) {
 *   // Handle image-specific logic
 * }
 * ```
 */
export function isImage(_world: World, eid: Entity): boolean {
	return Image.isImage[eid] === 1;
}

/**
 * Gets the bitmap stored for an image entity.
 *
 * @param eid - Entity ID
 * @returns The stored bitmap, or undefined
 *
 * @example
 * ```typescript
 * import { getImageBitmap } from 'blecsd';
 *
 * const bitmap = getImageBitmap(imageEntity);
 * if (bitmap) {
 *   console.log(`Image: ${bitmap.width}x${bitmap.height}`);
 * }
 * ```
 */
export function getImageBitmap(eid: Entity): Bitmap | undefined {
	return imageBitmapStore.get(eid);
}

/**
 * Gets the last rendered CellMap for an image entity.
 *
 * @param eid - Entity ID
 * @returns The cached CellMap, or undefined
 *
 * @example
 * ```typescript
 * import { getImageCellMap } from 'blecsd';
 *
 * const cellMap = getImageCellMap(imageEntity);
 * if (cellMap) {
 *   console.log(`Cells: ${cellMap.width}x${cellMap.height}`);
 * }
 * ```
 */
export function getImageCellMap(eid: Entity): CellMap | undefined {
	return imageCellMapStore.get(eid);
}

/**
 * Resets all image widget stores. Useful for testing.
 *
 * @internal
 */
export function resetImageStore(): void {
	// Clear all animation timers first
	for (const timer of imageAnimationTimerStore.values()) {
		if (timer !== undefined) {
			clearTimeout(timer);
		}
	}

	Image.isImage.fill(0);
	imageBitmapStore.clear();
	imageTypeStore.clear();
	imageRenderModeStore.clear();
	imageDitherStore.clear();
	imageCellMapStore.clear();
	imageVisibleStore.clear();
	imagePreserveAspectRatioStore.clear();
	imageAnimationFramesStore.clear();
	imageAnimationDelaysStore.clear();
	imageAnimationLoopCountStore.clear();
	imageCurrentFrameStore.clear();
	imageCurrentLoopStore.clear();
	imageAnimationTimerStore.clear();
	imageCellMapCacheStore.clear();
}
