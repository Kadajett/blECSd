/**
 * Terminal Response Parser
 *
 * Parses responses from terminal queries (DA, DSR, window manipulation, etc.).
 * Used internally by the Program class to handle terminal communication.
 *
 * @module terminal/responseParser
 * @internal This module is internal and not exported from the main package.
 */

import { z } from 'zod';

// =============================================================================
// TYPES & SCHEMAS
// =============================================================================

/**
 * Response type identifiers.
 */
export const ResponseType = {
	/** Primary Device Attributes (DA1) - ESC [ ? ... c */
	PRIMARY_DA: 'primary_da',
	/** Secondary Device Attributes (DA2) - ESC [ > ... c */
	SECONDARY_DA: 'secondary_da',
	/** Tertiary Device Attributes (DA3) - ESC P ! | ... ESC \ */
	TERTIARY_DA: 'tertiary_da',
	/** Cursor Position Report (CPR) - ESC [ Pr ; Pc R */
	CURSOR_POSITION: 'cursor_position',
	/** Device Status Report (DSR) - ESC [ Pn n */
	DEVICE_STATUS: 'device_status',
	/** Operating Status Report - ESC [ Pn n */
	OPERATING_STATUS: 'operating_status',
	/** Window Title - OSC L title ST */
	WINDOW_TITLE: 'window_title',
	/** Icon Label - OSC l label ST */
	ICON_LABEL: 'icon_label',
	/** Window State (iconified, normal, maximized) */
	WINDOW_STATE: 'window_state',
	/** Window Position (x, y in pixels) */
	WINDOW_POSITION: 'window_position',
	/** Window Size (width, height in pixels) */
	WINDOW_SIZE_PIXELS: 'window_size_pixels',
	/** Text Area Size (width, height in characters) */
	TEXT_AREA_SIZE: 'text_area_size',
	/** Screen Size (width, height in characters) */
	SCREEN_SIZE: 'screen_size',
	/** Character Cell Size (width, height in pixels) */
	CHAR_CELL_SIZE: 'char_cell_size',
	/** Locator Position */
	LOCATOR_POSITION: 'locator_position',
	/** Unknown/unrecognized response */
	UNKNOWN: 'unknown',
} as const;

export type ResponseTypeValue = (typeof ResponseType)[keyof typeof ResponseType];

/**
 * Base interface for parsed terminal responses.
 */
export interface ParsedResponse {
	type: ResponseTypeValue;
	raw: string;
}

/**
 * Primary Device Attributes response.
 */
export interface PrimaryDAResponse extends ParsedResponse {
	type: typeof ResponseType.PRIMARY_DA;
	/** Device class (typically 1 for VT100, 62 for VT220, etc.) */
	deviceClass: number;
	/** List of supported attribute codes */
	attributes: number[];
}

/**
 * Secondary Device Attributes response.
 */
export interface SecondaryDAResponse extends ParsedResponse {
	type: typeof ResponseType.SECONDARY_DA;
	/** Terminal type ID */
	terminalType: number;
	/** Firmware version number */
	firmwareVersion: number;
	/** ROM cartridge registration number (often 0) */
	romCartridge: number;
}

/**
 * Cursor Position Report response.
 */
export interface CursorPositionResponse extends ParsedResponse {
	type: typeof ResponseType.CURSOR_POSITION;
	/** Row (1-based) */
	row: number;
	/** Column (1-based) */
	column: number;
}

/**
 * Device Status Report response.
 */
export interface DeviceStatusResponse extends ParsedResponse {
	type: typeof ResponseType.DEVICE_STATUS;
	/** Status code (0 = OK, 3 = Error) */
	status: number;
	/** Whether the terminal reports OK status */
	ok: boolean;
}

/**
 * Window Title response.
 */
export interface WindowTitleResponse extends ParsedResponse {
	type: typeof ResponseType.WINDOW_TITLE;
	/** The window title text */
	title: string;
}

/**
 * Icon Label response.
 */
export interface IconLabelResponse extends ParsedResponse {
	type: typeof ResponseType.ICON_LABEL;
	/** The icon label text */
	label: string;
}

/**
 * Window State response.
 */
export interface WindowStateResponse extends ParsedResponse {
	type: typeof ResponseType.WINDOW_STATE;
	/** Window state: 1=open, 2=iconified */
	state: number;
	/** Whether window is iconified/minimized */
	iconified: boolean;
}

/**
 * Window Position response.
 */
export interface WindowPositionResponse extends ParsedResponse {
	type: typeof ResponseType.WINDOW_POSITION;
	/** X position in pixels */
	x: number;
	/** Y position in pixels */
	y: number;
}

/**
 * Window Size in Pixels response.
 */
export interface WindowSizePixelsResponse extends ParsedResponse {
	type: typeof ResponseType.WINDOW_SIZE_PIXELS;
	/** Width in pixels */
	width: number;
	/** Height in pixels */
	height: number;
}

/**
 * Text Area Size response.
 */
export interface TextAreaSizeResponse extends ParsedResponse {
	type: typeof ResponseType.TEXT_AREA_SIZE;
	/** Columns (characters) */
	columns: number;
	/** Rows (characters) */
	rows: number;
}

/**
 * Screen Size response.
 */
export interface ScreenSizeResponse extends ParsedResponse {
	type: typeof ResponseType.SCREEN_SIZE;
	/** Columns (characters) */
	columns: number;
	/** Rows (characters) */
	rows: number;
}

/**
 * Character Cell Size response.
 */
export interface CharCellSizeResponse extends ParsedResponse {
	type: typeof ResponseType.CHAR_CELL_SIZE;
	/** Width in pixels */
	width: number;
	/** Height in pixels */
	height: number;
}

/**
 * Locator Position response.
 */
export interface LocatorPositionResponse extends ParsedResponse {
	type: typeof ResponseType.LOCATOR_POSITION;
	/** Status code */
	status: number;
	/** Button state */
	button: number;
	/** Row */
	row: number;
	/** Column */
	column: number;
	/** Page number */
	page: number;
}

/**
 * Unknown/unrecognized response.
 */
export interface UnknownResponse extends ParsedResponse {
	type: typeof ResponseType.UNKNOWN;
}

/**
 * Union type of all parsed response types.
 */
export type TerminalResponse =
	| PrimaryDAResponse
	| SecondaryDAResponse
	| CursorPositionResponse
	| DeviceStatusResponse
	| WindowTitleResponse
	| IconLabelResponse
	| WindowStateResponse
	| WindowPositionResponse
	| WindowSizePixelsResponse
	| TextAreaSizeResponse
	| ScreenSizeResponse
	| CharCellSizeResponse
	| LocatorPositionResponse
	| UnknownResponse;

/**
 * Zod schema for validating cursor position response.
 */
export const CursorPositionSchema = z.object({
	type: z.literal(ResponseType.CURSOR_POSITION),
	raw: z.string(),
	row: z.number().int().positive(),
	column: z.number().int().positive(),
});

// =============================================================================
// CONSTANTS
// =============================================================================

const CSI = '\x1b[';

// =============================================================================
// PARSER PATTERNS
// =============================================================================

/**
 * Primary Device Attributes response pattern.
 * Format: ESC [ ? Pn ; Pn ; ... c
 */
// biome-ignore lint/suspicious/noControlCharactersInRegex: ESC character is intentional
const PRIMARY_DA_PATTERN = /^\x1b\[\?([0-9;]+)c$/;

/**
 * Secondary Device Attributes response pattern.
 * Format: ESC [ > Pn ; Pn ; Pn c
 */
// biome-ignore lint/suspicious/noControlCharactersInRegex: ESC character is intentional
const SECONDARY_DA_PATTERN = /^\x1b\[>([0-9;]+)c$/;

/**
 * Cursor Position Report pattern.
 * Format: ESC [ Pr ; Pc R
 */
// biome-ignore lint/suspicious/noControlCharactersInRegex: ESC character is intentional
const CPR_PATTERN = /^\x1b\[(\d+);(\d+)R$/;

/**
 * Device Status Report pattern.
 * Format: ESC [ Pn n
 */
// biome-ignore lint/suspicious/noControlCharactersInRegex: ESC character is intentional
const DSR_PATTERN = /^\x1b\[(\d+)n$/;

/**
 * Window manipulation response pattern (xterm).
 * Format: ESC [ Ps ; Ps ; Ps t
 */
// biome-ignore lint/suspicious/noControlCharactersInRegex: ESC character is intentional
const WINDOW_MANIP_PATTERN = /^\x1b\[(\d+)(?:;(\d+))?(?:;(\d+))?t$/;

/**
 * OSC response pattern (title, icon label).
 * Format: ESC ] Ps ; Pt ST or ESC ] Ps ; Pt BEL
 */
// biome-ignore lint/suspicious/noControlCharactersInRegex: ESC and BEL characters are intentional
const OSC_RESPONSE_PATTERN = /^\x1b\](\d+);([^\x07\x1b]*)(?:\x07|\x1b\\)$/;

/**
 * Locator position report pattern.
 * Format: ESC [ Pe ; Pb ; Pr ; Pc ; Pp & w
 */
// biome-ignore lint/suspicious/noControlCharactersInRegex: ESC character is intentional
const LOCATOR_PATTERN = /^\x1b\[(\d+);(\d+);(\d+);(\d+);(\d+)&w$/;

// =============================================================================
// PARSER FUNCTIONS
// =============================================================================

/**
 * Parse a terminal response string.
 *
 * @param response - Raw response string from terminal
 * @returns Parsed response object, or UnknownResponse if unrecognized
 *
 * @example
 * ```typescript
 * import { parseResponse, ResponseType } from 'blecsd/terminal/responseParser';
 *
 * const response = '\x1b[10;20R';
 * const parsed = parseResponse(response);
 *
 * if (parsed.type === ResponseType.CURSOR_POSITION) {
 *   console.log(`Cursor at row ${parsed.row}, column ${parsed.column}`);
 * }
 * ```
 */
export function parseResponse(response: string): TerminalResponse {
	// Try each parser in order
	const parsers: Array<(r: string) => TerminalResponse | null> = [
		parsePrimaryDA,
		parseSecondaryDA,
		parseCursorPosition,
		parseDeviceStatus,
		parseWindowManipulation,
		parseOSCResponse,
		parseLocatorPosition,
	];

	for (const parser of parsers) {
		const result = parser(response);
		if (result) {
			return result;
		}
	}

	return {
		type: ResponseType.UNKNOWN,
		raw: response,
	};
}

/**
 * Parse Primary Device Attributes response.
 */
function parsePrimaryDA(response: string): PrimaryDAResponse | null {
	const match = response.match(PRIMARY_DA_PATTERN);
	if (!match?.[1]) {
		return null;
	}

	const parts = match[1].split(';').map(Number);
	const deviceClass = parts[0] ?? 0;
	const attributes = parts.slice(1);

	return {
		type: ResponseType.PRIMARY_DA,
		raw: response,
		deviceClass,
		attributes,
	};
}

/**
 * Parse Secondary Device Attributes response.
 */
function parseSecondaryDA(response: string): SecondaryDAResponse | null {
	const match = response.match(SECONDARY_DA_PATTERN);
	if (!match?.[1]) {
		return null;
	}

	const parts = match[1].split(';').map(Number);

	return {
		type: ResponseType.SECONDARY_DA,
		raw: response,
		terminalType: parts[0] ?? 0,
		firmwareVersion: parts[1] ?? 0,
		romCartridge: parts[2] ?? 0,
	};
}

/**
 * Parse Cursor Position Report response.
 */
function parseCursorPosition(response: string): CursorPositionResponse | null {
	const match = response.match(CPR_PATTERN);
	if (!match?.[1] || !match[2]) {
		return null;
	}

	return {
		type: ResponseType.CURSOR_POSITION,
		raw: response,
		row: Number.parseInt(match[1], 10),
		column: Number.parseInt(match[2], 10),
	};
}

/**
 * Parse Device Status Report response.
 */
function parseDeviceStatus(response: string): DeviceStatusResponse | null {
	const match = response.match(DSR_PATTERN);
	if (!match?.[1]) {
		return null;
	}

	const status = Number.parseInt(match[1], 10);

	return {
		type: ResponseType.DEVICE_STATUS,
		raw: response,
		status,
		ok: status === 0,
	};
}

/**
 * Parse window manipulation responses.
 */
function parseWindowManipulation(
	response: string,
):
	| WindowStateResponse
	| WindowPositionResponse
	| WindowSizePixelsResponse
	| TextAreaSizeResponse
	| ScreenSizeResponse
	| CharCellSizeResponse
	| null {
	const match = response.match(WINDOW_MANIP_PATTERN);
	if (!match?.[1]) {
		return null;
	}

	const code = Number.parseInt(match[1], 10);
	const param1 = match[2] ? Number.parseInt(match[2], 10) : 0;
	const param2 = match[3] ? Number.parseInt(match[3], 10) : 0;

	switch (code) {
		case 1: // De-iconified
		case 2: // Iconified
			return {
				type: ResponseType.WINDOW_STATE,
				raw: response,
				state: code,
				iconified: code === 2,
			};

		case 3: // Window position
			return {
				type: ResponseType.WINDOW_POSITION,
				raw: response,
				x: param1,
				y: param2,
			};

		case 4: // Window size in pixels
			return {
				type: ResponseType.WINDOW_SIZE_PIXELS,
				raw: response,
				height: param1,
				width: param2,
			};

		case 8: // Text area size in characters
			return {
				type: ResponseType.TEXT_AREA_SIZE,
				raw: response,
				rows: param1,
				columns: param2,
			};

		case 9: // Screen size in characters (xterm extension)
			return {
				type: ResponseType.SCREEN_SIZE,
				raw: response,
				rows: param1,
				columns: param2,
			};

		case 6: // Character cell size
			return {
				type: ResponseType.CHAR_CELL_SIZE,
				raw: response,
				height: param1,
				width: param2,
			};

		default:
			return null;
	}
}

/**
 * Parse OSC responses (title, icon label).
 */
function parseOSCResponse(response: string): WindowTitleResponse | IconLabelResponse | null {
	const match = response.match(OSC_RESPONSE_PATTERN);
	if (!match?.[1]) {
		return null;
	}

	const code = Number.parseInt(match[1], 10);
	const text = match[2] ?? '';

	// OSC L ; Pt ST = Report window title
	if (code === 76 || response.startsWith('\x1b]L;')) {
		// L = 76 in ASCII
		return {
			type: ResponseType.WINDOW_TITLE,
			raw: response,
			title: text,
		};
	}

	// OSC l ; Pt ST = Report icon label
	if (code === 108 || response.startsWith('\x1b]l;')) {
		// l = 108 in ASCII
		return {
			type: ResponseType.ICON_LABEL,
			raw: response,
			label: text,
		};
	}

	return null;
}

/**
 * Parse DEC Locator position report.
 */
function parseLocatorPosition(response: string): LocatorPositionResponse | null {
	const match = response.match(LOCATOR_PATTERN);
	if (!match?.[1] || !match[2] || !match[3] || !match[4] || !match[5]) {
		return null;
	}

	return {
		type: ResponseType.LOCATOR_POSITION,
		raw: response,
		status: Number.parseInt(match[1], 10),
		button: Number.parseInt(match[2], 10),
		row: Number.parseInt(match[3], 10),
		column: Number.parseInt(match[4], 10),
		page: Number.parseInt(match[5], 10),
	};
}

// =============================================================================
// TYPE GUARDS
// =============================================================================

/**
 * Check if response is a Primary DA response.
 */
export function isPrimaryDA(response: TerminalResponse): response is PrimaryDAResponse {
	return response.type === ResponseType.PRIMARY_DA;
}

/**
 * Check if response is a Secondary DA response.
 */
export function isSecondaryDA(response: TerminalResponse): response is SecondaryDAResponse {
	return response.type === ResponseType.SECONDARY_DA;
}

/**
 * Check if response is a Cursor Position response.
 *
 * @param response - Parsed terminal response
 * @returns true if response is a CursorPositionResponse
 *
 * @example
 * ```typescript
 * const parsed = parseResponse('\x1b[10;20R');
 * if (isCursorPosition(parsed)) {
 *   console.log(`Row: ${parsed.row}, Column: ${parsed.column}`);
 * }
 * ```
 */
export function isCursorPosition(response: TerminalResponse): response is CursorPositionResponse {
	return response.type === ResponseType.CURSOR_POSITION;
}

/**
 * Check if response is a Device Status response.
 *
 * @param response - Parsed terminal response
 * @returns true if response is a DeviceStatusResponse
 *
 * @example
 * ```typescript
 * const parsed = parseResponse('\x1b[0n');
 * if (isDeviceStatus(parsed)) {
 *   console.log(`Status OK: ${parsed.ok}`);
 * }
 * ```
 */
export function isDeviceStatus(response: TerminalResponse): response is DeviceStatusResponse {
	return response.type === ResponseType.DEVICE_STATUS;
}

/**
 * Check if response is a Window Title response.
 *
 * @param response - Parsed terminal response
 * @returns true if response is a WindowTitleResponse
 */
export function isWindowTitle(response: TerminalResponse): response is WindowTitleResponse {
	return response.type === ResponseType.WINDOW_TITLE;
}

/**
 * Check if response is an Icon Label response.
 *
 * @param response - Parsed terminal response
 * @returns true if response is an IconLabelResponse
 */
export function isIconLabel(response: TerminalResponse): response is IconLabelResponse {
	return response.type === ResponseType.ICON_LABEL;
}

/**
 * Check if response is a Window State response.
 *
 * @param response - Parsed terminal response
 * @returns true if response is a WindowStateResponse
 */
export function isWindowState(response: TerminalResponse): response is WindowStateResponse {
	return response.type === ResponseType.WINDOW_STATE;
}

/**
 * Check if response is a Window Position response.
 *
 * @param response - Parsed terminal response
 * @returns true if response is a WindowPositionResponse
 */
export function isWindowPosition(response: TerminalResponse): response is WindowPositionResponse {
	return response.type === ResponseType.WINDOW_POSITION;
}

/**
 * Check if response is a Window Size (pixels) response.
 *
 * @param response - Parsed terminal response
 * @returns true if response is a WindowSizePixelsResponse
 */
export function isWindowSizePixels(
	response: TerminalResponse,
): response is WindowSizePixelsResponse {
	return response.type === ResponseType.WINDOW_SIZE_PIXELS;
}

/**
 * Check if response is a Text Area Size response.
 *
 * @param response - Parsed terminal response
 * @returns true if response is a TextAreaSizeResponse
 */
export function isTextAreaSize(response: TerminalResponse): response is TextAreaSizeResponse {
	return response.type === ResponseType.TEXT_AREA_SIZE;
}

/**
 * Check if response is a Screen Size response.
 *
 * @param response - Parsed terminal response
 * @returns true if response is a ScreenSizeResponse
 */
export function isScreenSize(response: TerminalResponse): response is ScreenSizeResponse {
	return response.type === ResponseType.SCREEN_SIZE;
}

/**
 * Check if response is a Character Cell Size response.
 *
 * @param response - Parsed terminal response
 * @returns true if response is a CharCellSizeResponse
 */
export function isCharCellSize(response: TerminalResponse): response is CharCellSizeResponse {
	return response.type === ResponseType.CHAR_CELL_SIZE;
}

/**
 * Check if response is a Locator Position response.
 *
 * @param response - Parsed terminal response
 * @returns true if response is a LocatorPositionResponse
 */
export function isLocatorPosition(response: TerminalResponse): response is LocatorPositionResponse {
	return response.type === ResponseType.LOCATOR_POSITION;
}

/**
 * Check if response is an unknown/unrecognized response.
 *
 * @param response - Parsed terminal response
 * @returns true if response is an UnknownResponse
 */
export function isUnknown(response: TerminalResponse): response is UnknownResponse {
	return response.type === ResponseType.UNKNOWN;
}

// =============================================================================
// QUERY GENERATORS
// =============================================================================

/**
 * Query generators for terminal queries.
 *
 * These functions generate the escape sequences to send to the terminal
 * to request information. The terminal will respond with data that can
 * be parsed using parseResponse().
 *
 * @example
 * ```typescript
 * import { query, parseResponse, isCursorPosition } from 'blecsd/terminal';
 *
 * // Send cursor position query
 * process.stdout.write(query.cursorPosition());
 *
 * // Read response from stdin and parse it
 * // (In practice, you'd use async input handling)
 * const response = await readTerminalResponse();
 * const parsed = parseResponse(response);
 *
 * if (isCursorPosition(parsed)) {
 *   console.log(`Cursor at row ${parsed.row}, column ${parsed.column}`);
 * }
 * ```
 */
export const query = {
	/**
	 * Request Primary Device Attributes (DA1).
	 * Response format: ESC [ ? Pn ; ... c
	 *
	 * @returns Query sequence
	 *
	 * @example
	 * ```typescript
	 * process.stdout.write(query.primaryDA());
	 * // Terminal responds with something like: \x1b[?62;1;2;6;7;8;9c
	 * ```
	 */
	primaryDA(): string {
		return `${CSI}c`;
	},

	/**
	 * Request Secondary Device Attributes (DA2).
	 * Response format: ESC [ > Pn ; Pn ; Pn c
	 *
	 * @returns Query sequence
	 *
	 * @example
	 * ```typescript
	 * process.stdout.write(query.secondaryDA());
	 * // Terminal responds with: \x1b[>41;354;0c (xterm example)
	 * ```
	 */
	secondaryDA(): string {
		return `${CSI}>c`;
	},

	/**
	 * Request Tertiary Device Attributes (DA3).
	 * Response format: DCS ! | <hex> ST
	 *
	 * @returns Query sequence
	 */
	tertiaryDA(): string {
		return `${CSI}=c`;
	},

	/**
	 * Request Cursor Position Report (CPR).
	 * Response format: ESC [ Pr ; Pc R
	 *
	 * @returns Query sequence
	 *
	 * @example
	 * ```typescript
	 * process.stdout.write(query.cursorPosition());
	 * // Terminal responds with: \x1b[10;20R (row 10, column 20)
	 * ```
	 */
	cursorPosition(): string {
		return `${CSI}6n`;
	},

	/**
	 * Request Device Status Report (DSR).
	 * Response format: ESC [ 0 n (OK) or ESC [ 3 n (error)
	 *
	 * @returns Query sequence
	 *
	 * @example
	 * ```typescript
	 * process.stdout.write(query.deviceStatus());
	 * // Terminal responds with: \x1b[0n (OK)
	 * ```
	 */
	deviceStatus(): string {
		return `${CSI}5n`;
	},

	/**
	 * Request Window State (iconified or normal).
	 * Response format: ESC [ 1 t (open) or ESC [ 2 t (iconified)
	 *
	 * @returns Query sequence
	 */
	windowState(): string {
		return `${CSI}11t`;
	},

	/**
	 * Request Window Position.
	 * Response format: ESC [ 3 ; x ; y t
	 *
	 * @returns Query sequence
	 */
	windowPosition(): string {
		return `${CSI}13t`;
	},

	/**
	 * Request Window Size in pixels.
	 * Response format: ESC [ 4 ; height ; width t
	 *
	 * @returns Query sequence
	 */
	windowSizePixels(): string {
		return `${CSI}14t`;
	},

	/**
	 * Request Text Area Size in characters.
	 * Response format: ESC [ 8 ; rows ; columns t
	 *
	 * @returns Query sequence
	 */
	textAreaSize(): string {
		return `${CSI}18t`;
	},

	/**
	 * Request Screen Size in characters.
	 * Response format: ESC [ 9 ; rows ; columns t
	 *
	 * @returns Query sequence
	 */
	screenSize(): string {
		return `${CSI}19t`;
	},

	/**
	 * Request Character Cell Size in pixels.
	 * Response format: ESC [ 6 ; height ; width t
	 *
	 * @returns Query sequence
	 */
	charCellSize(): string {
		return `${CSI}16t`;
	},

	/**
	 * Request Window Title.
	 * Response format: OSC L ; title ST
	 *
	 * @returns Query sequence
	 */
	windowTitle(): string {
		return `${CSI}21t`;
	},

	/**
	 * Request Icon Label.
	 * Response format: OSC l ; label ST
	 *
	 * @returns Query sequence
	 */
	iconLabel(): string {
		return `${CSI}20t`;
	},

	/**
	 * Enable DEC Locator reporting.
	 *
	 * @param mode - 0=disabled, 1=one-shot, 2=continuous
	 * @returns Query sequence
	 */
	enableLocator(mode: 0 | 1 | 2 = 1): string {
		return `${CSI}${mode}'z`;
	},

	/**
	 * Request DEC Locator Position.
	 * Response format: ESC [ Pe ; Pb ; Pr ; Pc ; Pp & w
	 *
	 * @returns Query sequence
	 */
	locatorPosition(): string {
		return `${CSI}'|`;
	},
} as const;
