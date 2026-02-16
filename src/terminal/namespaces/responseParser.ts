/**
 * Response parser namespace.
 *
 * Functions for querying the terminal and parsing its responses
 * (cursor position, device attributes, window title, etc.).
 *
 * @example
 * ```typescript
 * import { responseParser } from 'blecsd/terminal';
 *
 * // Query cursor position
 * const response = await responseParser.query(program, '\x1b[6n');
 * const parsed = responseParser.parseResponse(response);
 *
 * if (responseParser.isCursorPosition(parsed)) {
 *   console.log(`Cursor at: ${parsed.row}, ${parsed.col}`);
 * }
 *
 * // Query window title
 * const titleResponse = await responseParser.query(program, '\x1b[21t');
 * const titleParsed = responseParser.parseResponse(titleResponse);
 *
 * if (responseParser.isWindowTitle(titleParsed)) {
 *   console.log(`Window title: ${titleParsed.title}`);
 * }
 * ```
 */

import {
	isCharCellSize,
	isCursorPosition,
	isDeviceStatus,
	isIconLabel,
	isLocatorPosition,
	isPrimaryDA,
	isScreenSize,
	isSecondaryDA,
	isTextAreaSize,
	isUnknown,
	isWindowPosition,
	isWindowSizePixels,
	isWindowState,
	isWindowTitle,
	parseResponse,
	query,
	ResponseType,
} from '../responseParser';

/**
 * Response parser namespace.
 */
export const responseParser = Object.freeze({
	isCharCellSize,
	isCursorPosition,
	isDeviceStatus,
	isIconLabel,
	isLocatorPosition,
	isPrimaryDA,
	isScreenSize,
	isSecondaryDA,
	isTextAreaSize,
	isUnknown,
	isWindowPosition,
	isWindowSizePixels,
	isWindowState,
	isWindowTitle,
	parseResponse,
	query,
	ResponseType: Object.freeze(ResponseType),
});

export type ResponseParserModule = typeof responseParser;
