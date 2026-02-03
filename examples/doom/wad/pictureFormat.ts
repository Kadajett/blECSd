/**
 * Doom picture format parser for patches and sprites.
 *
 * The picture format is column-major with runs of opaque pixels (posts).
 * Transparent areas are implicit gaps between posts.
 *
 * @module wad/pictureFormat
 */

import type { Picture, PictureColumn, PicturePost } from './types.js';

/**
 * Parse a Doom picture (patch/sprite) from raw lump data.
 *
 * Format:
 * - Header: width (u16), height (u16), leftOffset (i16), topOffset (i16)
 * - Column offset table: width x u32 offsets from lump start
 * - Column data: series of posts per column
 *
 * @param data - Raw lump bytes
 * @returns Parsed picture with column post data
 * @throws If the data is too small or offsets are invalid
 *
 * @example
 * ```typescript
 * const patchData = getLumpByName(wad, 'WALL00_1');
 * const picture = parsePicture(patchData);
 * console.log(picture.width, picture.height);
 * ```
 */
export function parsePicture(data: Uint8Array): Picture {
	if (data.length < 8) {
		throw new Error(`Picture data too small: ${data.length} bytes (minimum 8)`);
	}

	const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

	const width = view.getUint16(0, true);
	const height = view.getUint16(2, true);
	const leftOffset = view.getInt16(4, true);
	const topOffset = view.getInt16(6, true);

	if (width === 0 || height === 0 || width > 4096 || height > 4096) {
		throw new Error(`Invalid picture dimensions: ${width}x${height}`);
	}

	const minHeaderSize = 8 + width * 4;
	if (data.length < minHeaderSize) {
		throw new Error(`Picture data too small for column offsets: ${data.length} < ${minHeaderSize}`);
	}

	// Read column offset table
	const columns: PictureColumn[] = [];
	for (let col = 0; col < width; col++) {
		const columnOffset = view.getUint32(8 + col * 4, true);
		columns.push(parseColumn(data, columnOffset));
	}

	return { width, height, leftOffset, topOffset, columns };
}

/**
 * Parse a single column of posts from picture data.
 *
 * Each post: topdelta (u8), length (u8), pad (u8), pixels (u8[length]), pad (u8).
 * Column ends when topdelta = 0xFF.
 *
 * @param data - Raw lump bytes (full picture, not just column)
 * @param offset - Byte offset to the start of this column's posts
 * @returns Array of posts for this column
 */
function parseColumn(data: Uint8Array, offset: number): PictureColumn {
	const posts: PicturePost[] = [];
	let pos = offset;
	let prevTopDelta = 0;

	for (;;) {
		if (pos >= data.length) break;

		const topDelta = data[pos];
		if (topDelta === undefined || topDelta === 0xff) break;
		pos++;

		// Tall patch support: if topDelta <= prevTopDelta, it's relative
		let absoluteTopDelta: number;
		if (topDelta <= prevTopDelta && posts.length > 0) {
			absoluteTopDelta = prevTopDelta + topDelta;
		} else {
			absoluteTopDelta = topDelta;
		}
		prevTopDelta = absoluteTopDelta;

		const length = data[pos];
		if (length === undefined) break;
		pos++;

		// Skip padding byte before pixels
		pos++;

		// Read pixel data
		const pixels = data.slice(pos, pos + length);
		pos += length;

		// Skip padding byte after pixels
		pos++;

		posts.push({ topDelta: absoluteTopDelta, pixels });
	}

	return posts;
}

/**
 * Render a picture to a flat pixel array (palette indices).
 * Transparent pixels are set to 0xFF (255).
 *
 * @param picture - Parsed picture
 * @returns Flat array of palette indices, width x height, row-major
 *
 * @example
 * ```typescript
 * const picture = parsePicture(data);
 * const pixels = renderPictureToFlat(picture);
 * // pixels[y * picture.width + x] = palette index or 0xFF for transparent
 * ```
 */
export function renderPictureToFlat(picture: Picture): Uint8Array {
	const pixels = new Uint8Array(picture.width * picture.height);
	pixels.fill(0xff); // transparent

	for (let col = 0; col < picture.width; col++) {
		const column = picture.columns[col];
		if (!column) continue;

		for (const post of column) {
			for (let i = 0; i < post.pixels.length; i++) {
				const y = post.topDelta + i;
				if (y >= 0 && y < picture.height) {
					const pixel = post.pixels[i];
					if (pixel !== undefined) {
						pixels[y * picture.width + col] = pixel;
					}
				}
			}
		}
	}

	return pixels;
}
