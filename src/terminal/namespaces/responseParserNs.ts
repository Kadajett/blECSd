/**
 * Response parser namespace.
 *
 * Functions for querying the terminal and parsing its responses
 * (cursor position, device attributes, window title, etc.).
 *
 * @example
 * ```typescript
 * import { responseParserNs } from 'blecsd/terminal';
 *
 * // Query cursor position
 * const response = await responseParserNs.query(program, '\x1b[6n');
 * const parsed = responseParserNs.parseResponse(response);
 *
 * if (responseParserNs.isCursorPosition(parsed)) {
 *   console.log(`Cursor at: ${parsed.row}, ${parsed.col}`);
 * }
 *
 * // Query window title
 * const titleResponse = await responseParserNs.query(program, '\x1b[21t');
 * const titleParsed = responseParserNs.parseResponse(titleResponse);
 *
 * if (responseParserNs.isWindowTitle(titleParsed)) {
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
export const responseParserNs = Object.freeze({
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

export type ResponseParserNsModule = typeof responseParserNs;
