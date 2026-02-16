/**
 * Screen buffer namespace.
 *
 * Functions for creating and managing screen buffers with cell-based
 * storage for terminal content, attributes, and diffing.
 *
 * @example
 * ```typescript
 * import { screenBuffer } from 'blecsd/terminal';
 *
 * // Create screen buffer
 * const buffer = screenBuffer.createScreenBuffer(80, 24);
 *
 * // Create and set cells
 * const cell = screenBuffer.createCell('H', 0xffffff, 0x000000);
 * screenBuffer.setCell(buffer, 0, 0, cell);
 *
 * // Write strings
 * screenBuffer.writeString(buffer, 10, 5, 'Hello World', attr);
 *
 * // Fill regions
 * screenBuffer.fillRect(buffer, 0, 0, 10, 5, ' ', attr);
 *
 * // Copy regions
 * screenBuffer.copyRegion(buffer, 0, 0, 10, 5, buffer2, 5, 5);
 *
 * // Diff buffers
 * const changes = screenBuffer.diffBuffers(oldBuffer, newBuffer);
 * for (const change of changes) {
 *   // Render changed cells only
 * }
 * ```
 */

import {
	Attr,
	cellIndex,
	cellsEqual,
	clearBuffer,
	cloneCell,
	copyRegion,
	createCell,
	createScreenBuffer,
	DEFAULT_BG,
	DEFAULT_CHAR,
	DEFAULT_FG,
	diffBuffers,
	fillRect,
	getCell,
	hasAttr,
	isInBounds,
	resizeBuffer,
	setCell,
	setChar,
	withAttr,
	withoutAttr,
	writeString,
} from '../screen';

/**
 * Screen buffer namespace.
 */
export const screenBuffer = Object.freeze({
	Attr: Object.freeze(Attr),
	cellIndex,
	cellsEqual,
	clearBuffer,
	cloneCell,
	copyRegion,
	createCell,
	createScreenBuffer,
	DEFAULT_BG,
	DEFAULT_CHAR,
	DEFAULT_FG,
	diffBuffers,
	fillRect,
	getCell,
	hasAttr,
	isInBounds,
	resizeBuffer,
	setCell,
	setChar,
	withAttr,
	withoutAttr,
	writeString,
});

export type ScreenBufferModule = typeof screenBuffer;
