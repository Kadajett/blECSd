/**
 * Image widget namespace for rendering bitmap images in the terminal.
 *
 * @example
 * ```typescript
 * import { imageWidget } from '@blecsd/media';
 *
 * const img = imageWidget.createImage(world, {
 *   width: 80,
 *   height: 30,
 *   source: 'path/to/image.png',
 *   mode: '256-color',
 * });
 * const bitmap = imageWidget.getImageBitmap(img);
 * imageWidget.clearImageCache(img);
 * ```
 */

import {
	calculateAspectRatioDimensions,
	clearAllImageCaches,
	clearImageCache,
	createImage,
	getImageBitmap,
	getImageCellMap,
	isImage,
	resetImageStore,
} from '../widgets/image';

export const imageWidget = Object.freeze({
	createImage,
	isImage,
	getImageBitmap,
	getImageCellMap,
	calculateAspectRatioDimensions,
	clearImageCache,
	clearAllImageCaches,
	resetImageStore,
});

export type ImageWidgetModule = typeof imageWidget;
