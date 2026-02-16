/**
 * Image widget namespace.
 *
 * @example
 * ```typescript
 * import { image } from 'blecsd/widgets';
 * const img = image.create(world, { bitmap: [...] });
 * const bitmap = image.getBitmap(world, img.eid);
 * const cellMap = image.getCellMap(world, img.eid);
 * ```
 */
import { createImage, getImageBitmap, getImageCellMap, isImage, resetImageStore } from '../image';

export const image = Object.freeze({
	create: createImage,
	is: isImage,
	getBitmap: getImageBitmap,
	getCellMap: getImageCellMap,
	resetStore: resetImageStore,
});

export type ImageModule = typeof image;
