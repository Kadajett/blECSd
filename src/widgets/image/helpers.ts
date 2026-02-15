/**
 * Image Widget Helpers
 *
 * Internal helper functions for image widget logic.
 *
 * @module widgets/image/helpers
 */

import { setContent } from '../../components/content';
import { Position } from '../../components/position';
import type { Entity, World } from '../../core/types';
import type { CellMap, RenderMode } from '../../media/render/ansi';
import { cellMapToString, renderToAnsi } from '../../media/render/ansi';
import { renderImage as renderGraphicsImage } from '../../terminal/graphics/backend';
import {
	imageBitmapStore,
	imageCellMapCacheStore,
	imageCellMapStore,
	imageDitherStore,
	imageGraphicsManagerStore,
	imageRenderModeStore,
	imageTypeStore,
} from './state';

// =============================================================================
// DIMENSION HELPERS
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

// =============================================================================
// CACHE HELPERS
// =============================================================================

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

// =============================================================================
// RENDERING HELPERS
// =============================================================================

/**
 * Renders the stored bitmap for an entity and updates its content.
 * Uses caching to avoid re-rendering the same bitmap configuration.
 */
export function renderImageContent(world: World, eid: Entity): void {
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
		// Overlay mode: render through graphics manager if available
		const manager = imageGraphicsManagerStore.get(eid);
		if (manager) {
			const x = Position.x[eid] ?? 0;
			const y = Position.y[eid] ?? 0;
			const output = renderGraphicsImage(
				manager,
				{ width: bitmap.width, height: bitmap.height, data: bitmap.data, format: 'rgba' },
				{ x, y },
			);
			setContent(world, eid, output);
		} else {
			// No graphics manager: bitmap stored for manual retrieval via getImage()
			setContent(world, eid, '');
		}
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
