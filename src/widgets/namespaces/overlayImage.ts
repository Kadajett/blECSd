/**
 * OverlayImage widget namespace.
 *
 * @example
 * ```typescript
 * import { overlayImage } from 'blecsd/widgets';
 * const img = overlayImage.create(world, { graphicsManager: manager, bitmap });
 * ```
 */
import {
	createOverlayImage,
	getOverlayImageBitmap,
	isOverlayImage,
	resetOverlayImageStore,
} from '../overlayImage';

export const overlayImage = Object.freeze({
	create: createOverlayImage,
	is: isOverlayImage,
	getBitmap: getOverlayImageBitmap,
	resetStore: resetOverlayImageStore,
});

export type OverlayImageModule = typeof overlayImage;
