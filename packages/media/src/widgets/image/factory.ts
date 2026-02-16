/**
 * Image Widget Factory
 *
 * Factory function for creating Image widgets.
 *
 * @module widgets/image/factory
 */

import { markDirty, Position, setDimensions, setPosition, setVisible } from 'blecsd/components';
import type { World } from 'blecsd/core';
import { addEntity, removeEntity } from 'blecsd/core';
import type { GraphicsManagerState } from 'blecsd/terminal';
import { cellMapToString, renderToAnsi } from '../../render/ansi';
import type { Bitmap, RenderMode } from '../../render/ansi-types';
import {
	cleanupImageAnimation,
	setAnimationFrame,
	setupAnimatedImage,
	startAnimationLoop,
} from './animation-helpers';
import { ImageConfigSchema } from './config';
import { calculateAspectRatioDimensions, clearImageCache, renderImageContent } from './helpers';
import {
	Image,
	imageAnimationDelaysStore,
	imageAnimationFramesStore,
	imageAnimationLoopCountStore,
	imageAnimationTimerStore,
	imageBitmapStore,
	imageCellMapCacheStore,
	imageCellMapStore,
	imageCurrentFrameStore,
	imageCurrentLoopStore,
	imageDitherStore,
	imageGraphicsManagerStore,
	imagePreserveAspectRatioStore,
	imageRenderModeStore,
	imageRenderVersionStore,
	imageTypeStore,
	imageVisibleStore,
} from './state';
import type { ImageConfig, ImageWidget } from './types';

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

	// Initialize render version and animation stores
	imageRenderVersionStore.set(eid, 0);
	imageAnimationFramesStore.set(eid, []);
	imageAnimationDelaysStore.set(eid, []);
	imageAnimationLoopCountStore.set(eid, 1);
	imageCurrentFrameStore.set(eid, 0);
	imageCurrentLoopStore.set(eid, 0);
	imageAnimationTimerStore.set(eid, undefined);

	// Store graphics manager if provided (for overlay mode)
	if (config.graphicsManager) {
		imageGraphicsManagerStore.set(eid, config.graphicsManager);
	}

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
function createImageWidgetInterface(world: World, eid: number): ImageWidget {
	const stopAnimationFn = (): ImageWidget => {
		const timer = imageAnimationTimerStore.get(eid);
		if (timer !== undefined) {
			clearTimeout(timer);
			imageAnimationTimerStore.set(eid, undefined);
		}
		return widget;
	};

	const widget: ImageWidget = {
		get eid() {
			return eid;
		},

		show() {
			imageVisibleStore.set(eid, true);
			setVisible(world, eid, true);
			markDirty(world, eid);
			return widget;
		},

		hide() {
			imageVisibleStore.set(eid, false);
			setVisible(world, eid, false);
			markDirty(world, eid);
			return widget;
		},

		isVisible() {
			return imageVisibleStore.get(eid) ?? false;
		},

		move(dx: number, dy: number) {
			const x = Position.x[eid] ?? 0;
			const y = Position.y[eid] ?? 0;
			setPosition(world, eid, x + dx, y + dy);
			markDirty(world, eid);
			return widget;
		},

		setPosition(x: number, y: number) {
			setPosition(world, eid, x, y);
			markDirty(world, eid);
			return widget;
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
			stopAnimationFn();

			imageBitmapStore.set(eid, bitmap);
			clearImageCache(eid); // Invalidate cache
			renderImageContent(world, eid);
			markDirty(world, eid);
			return widget;
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
			return widget;
		},

		getRenderMode() {
			return imageRenderModeStore.get(eid) ?? 'color';
		},

		setGraphicsManager(manager: GraphicsManagerState) {
			imageGraphicsManagerStore.set(eid, manager);
			// Re-render if in overlay mode with existing bitmap
			const imageType = imageTypeStore.get(eid) ?? 'ansi';
			if (imageType === 'overlay') {
				renderImageContent(world, eid);
				markDirty(world, eid);
			}
			return widget;
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
			setupAnimatedImage(world, eid, frames, delays, loopCount, stopAnimationFn);
			return widget;
		},

		startAnimation() {
			startAnimationLoop(world, eid, stopAnimationFn);
			return widget;
		},

		stopAnimation: stopAnimationFn,

		isAnimating() {
			return imageAnimationTimerStore.get(eid) !== undefined;
		},

		getCurrentFrame() {
			return imageCurrentFrameStore.get(eid) ?? 0;
		},

		setFrame(index: number) {
			setAnimationFrame(world, eid, index);
			return widget;
		},

		destroy() {
			stopAnimationFn();
			cleanupImageAnimation(eid);

			Image.isImage[eid] = 0;
			imageBitmapStore.delete(eid);
			imageTypeStore.delete(eid);
			imageRenderModeStore.delete(eid);
			imageDitherStore.delete(eid);
			imageCellMapStore.delete(eid);
			imageVisibleStore.delete(eid);
			imagePreserveAspectRatioStore.delete(eid);
			imageCellMapCacheStore.delete(eid);
			imageRenderVersionStore.delete(eid);
			imageGraphicsManagerStore.delete(eid);
			removeEntity(world, eid);
		},
	};

	return widget;
}
