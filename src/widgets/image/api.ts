/**
 * Image Widget API
 *
 * Standalone API functions for working with Image widgets.
 *
 * @module widgets/image/api
 */

import type { Entity, World } from '../../core/types';
import type { Bitmap, CellMap } from '../../media/render/ansi';
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
	imageTypeStore,
	imageVisibleStore,
} from './state';

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
	imageGraphicsManagerStore.clear();
}
