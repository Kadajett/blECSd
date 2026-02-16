/**
 * w3m overlay helper functions.
 *
 * @module media/overlay/w3m-helpers
 */

import type { CellPixelSize, ImageSize, W3MSearchResult, W3MSizeResult } from './w3m-types';
import { W3M_SEARCH_PATHS } from './w3m-types';

/**
 * Converts a terminal column/row position to pixel coordinates.
 *
 * @example
 * ```typescript
 * import { cellToPixels } from 'blecsd';
 *
 * const pixels = cellToPixels(10, 5, { width: 8, height: 14 });
 * // { x: 80, y: 70 }
 * ```
 */
export function cellToPixels(
	col: number,
	row: number,
	cellSize: CellPixelSize,
): { x: number; y: number } {
	return {
		x: Math.round(col * cellSize.width),
		y: Math.round(row * cellSize.height),
	};
}

/**
 * Converts pixel coordinates to the nearest terminal column/row.
 *
 * @example
 * ```typescript
 * import { pixelsToCells } from 'blecsd';
 *
 * const pos = pixelsToCells(80, 70, { width: 8, height: 14 });
 * // { col: 10, row: 5 }
 * ```
 */
export function pixelsToCells(
	x: number,
	y: number,
	cellSize: CellPixelSize,
): { col: number; row: number } {
	return {
		col: Math.floor(x / cellSize.width),
		row: Math.floor(y / cellSize.height),
	};
}

/**
 * Calculates the maximum displayable image dimensions based on terminal size.
 *
 * @example
 * ```typescript
 * import { maxDisplaySize } from 'blecsd';
 *
 * const max = maxDisplaySize(80, 24, { width: 8, height: 14 });
 * ```
 */
export function maxDisplaySize(columns: number, rows: number, cellSize: CellPixelSize): ImageSize {
	return {
		width: columns * cellSize.width,
		height: Math.max(0, (rows - 2) * cellSize.height),
	};
}

/**
 * Scales image dimensions to fit within the maximum display area
 * while preserving the aspect ratio.
 *
 * @example
 * ```typescript
 * import { scaleToFit } from 'blecsd';
 *
 * const scaled = scaleToFit(
 *   { width: 1920, height: 1080 },
 *   { width: 640, height: 480 },
 * );
 * ```
 */
export function scaleToFit(imageSize: ImageSize, maxSize: ImageSize): ImageSize {
	let { width, height } = imageSize;

	if (width <= 0 || height <= 0) {
		return { width: 0, height: 0 };
	}

	if (width > maxSize.width) {
		height = Math.round((height * maxSize.width) / width);
		width = maxSize.width;
	}

	if (height > maxSize.height) {
		width = Math.round((width * maxSize.height) / height);
		height = maxSize.height;
	}

	return { width, height };
}

/**
 * Parses the response from a get-size command.
 *
 * @example
 * ```typescript
 * import { parseSizeResponse } from 'blecsd';
 *
 * const result = parseSizeResponse('640 480\n');
 * ```
 */
export function parseSizeResponse(response: string): W3MSizeResult {
	const trimmed = response.trim();
	if (trimmed === '') {
		return { ok: false, error: 'Empty response from w3mimgdisplay' };
	}

	const parts = trimmed.split(/\s+/);
	if (parts.length < 2) {
		return { ok: false, error: `Invalid size response format: "${trimmed}"` };
	}

	const width = Number.parseInt(parts[0] ?? '', 10);
	const height = Number.parseInt(parts[1] ?? '', 10);

	if (Number.isNaN(width) || Number.isNaN(height)) {
		return { ok: false, error: `Could not parse dimensions: "${trimmed}"` };
	}

	if (width <= 0 || height <= 0) {
		return { ok: false, error: `Invalid dimensions: ${width}x${height}` };
	}

	return { ok: true, size: { width, height } };
}

/**
 * Searches for the w3mimgdisplay binary on the system.
 *
 * @example
 * ```typescript
 * import { findW3MBinary } from 'blecsd';
 * import { existsSync } from 'fs';
 *
 * const result = findW3MBinary((p) => existsSync(p));
 * ```
 */
export function findW3MBinary(
	checkExists: (path: string) => boolean,
	searchPaths: readonly string[] = W3M_SEARCH_PATHS,
): W3MSearchResult {
	for (const searchPath of searchPaths) {
		if (checkExists(searchPath)) {
			return { ok: true, path: searchPath };
		}
	}
	return {
		ok: false,
		error: `w3mimgdisplay not found. Searched: ${searchPaths.join(', ')}`,
	};
}
