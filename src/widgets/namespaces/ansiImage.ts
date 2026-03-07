/**
 * ANSIImage widget namespace.
 *
 * @example
 * ```typescript
 * import { ansiImage } from 'blecsd/widgets';
 * const img = ansiImage.create(world, { renderMode: 'braille', bitmap });
 * ```
 */
import {
	createANSIImage,
	getANSIImageBitmap,
	getANSIImageCellMap,
	isANSIImage,
	resetANSIImageStore,
} from '../ansiImage';

export const ansiImage = Object.freeze({
	create: createANSIImage,
	is: isANSIImage,
	getBitmap: getANSIImageBitmap,
	getCellMap: getANSIImageCellMap,
	resetStore: resetANSIImageStore,
});

export type ANSIImageModule = typeof ansiImage;
