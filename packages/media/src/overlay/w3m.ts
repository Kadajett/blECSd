/**
 * w3m overlay image support.
 *
 * Integrates with the w3mimgdisplay binary to overlay actual images
 * on the terminal at pixel-precise positions. This provides true image
 * display (not ANSI approximation) on terminals that support it.
 *
 * @module media/overlay/w3m
 */

import { z } from 'zod';

// =============================================================================
// TYPES
// =============================================================================

/**
 * w3mimgdisplay command codes.
 *
 * @example
 * ```typescript
 * import { W3MCommand } from 'blecsd';
 *
 * const cmd = W3MCommand.Draw; // 0
 * ```
 */
export const W3MCommand = {
	/** Draw an image at the given position */
	Draw: 0,
	/** Redraw an image (same as draw but may use cached data) */
	Redraw: 1,
	/** Terminate the drawing process */
	Terminate: 2,
	/** Sync the display after drawing */
	Sync: 3,
	/** No-operation, used for communication sync (returns newline) */
	Nop: 4,
	/** Get image dimensions from file path */
	GetSize: 5,
	/** Clear a rectangular area */
	Clear: 6,
} as const;

export type W3MCommandCode = (typeof W3MCommand)[keyof typeof W3MCommand];

/**
 * Image dimensions in pixels.
 *
 * @example
 * ```typescript
 * import type { ImageSize } from 'blecsd';
 *
 * const size: ImageSize = { width: 640, height: 480 };
 * ```
 */
export interface ImageSize {
	readonly width: number;
	readonly height: number;
}

/**
 * Terminal cell dimensions in pixels, used for converting
 * character positions to pixel coordinates.
 *
 * @example
 * ```typescript
 * import type { CellPixelSize } from 'blecsd';
 *
 * const cell: CellPixelSize = { width: 8, height: 14 };
 * ```
 */
export interface CellPixelSize {
	readonly width: number;
	readonly height: number;
}

/**
 * Configuration for a w3m draw command.
 */
export interface W3MDrawConfig {
	/** Image identifier number */
	readonly id: number;
	/** X position in pixels */
	readonly x: number;
	/** Y position in pixels */
	readonly y: number;
	/** Display width in pixels */
	readonly width: number;
	/** Display height in pixels */
	readonly height: number;
	/** Source crop X offset (optional) */
	readonly srcX?: number;
	/** Source crop Y offset (optional) */
	readonly srcY?: number;
	/** Source crop width (optional) */
	readonly srcWidth?: number;
	/** Source crop height (optional) */
	readonly srcHeight?: number;
	/** File path to the image */
	readonly filePath: string;
}

/**
 * Zod schema for W3MDrawConfig validation.
 *
 * @example
 * ```typescript
 * import { W3MDrawConfigSchema } from 'blecsd';
 *
 * const config = W3MDrawConfigSchema.parse({
 *   id: 1,
 *   x: 100,
 *   y: 50,
 *   width: 200,
 *   height: 150,
 *   filePath: '/path/to/image.png',
 * });
 * ```
 */
export const W3MDrawConfigSchema = z.object({
	id: z.number().int().nonnegative(),
	x: z.number().int().nonnegative(),
	y: z.number().int().nonnegative(),
	width: z.number().int().positive(),
	height: z.number().int().positive(),
	srcX: z.number().int().nonnegative().optional(),
	srcY: z.number().int().nonnegative().optional(),
	srcWidth: z.number().int().positive().optional(),
	srcHeight: z.number().int().positive().optional(),
	filePath: z.string().min(1),
});

/**
 * Configuration for a w3m clear command.
 */
export interface W3MClearConfig {
	/** X position in pixels */
	readonly x: number;
	/** Y position in pixels */
	readonly y: number;
	/** Width in pixels */
	readonly width: number;
	/** Height in pixels */
	readonly height: number;
}

/**
 * Zod schema for W3MClearConfig validation.
 *
 * @example
 * ```typescript
 * import { W3MClearConfigSchema } from 'blecsd';
 *
 * const config = W3MClearConfigSchema.parse({
 *   x: 100,
 *   y: 50,
 *   width: 200,
 *   height: 150,
 * });
 * ```
 */
export const W3MClearConfigSchema = z.object({
	x: z.number().int().nonnegative(),
	y: z.number().int().nonnegative(),
	width: z.number().int().positive(),
	height: z.number().int().positive(),
});

/**
 * Result of an image size query.
 */
export type W3MSizeResult =
	| { readonly ok: true; readonly size: ImageSize }
	| { readonly ok: false; readonly error: string };

/**
 * Result of a w3mimgdisplay binary search.
 */
export type W3MSearchResult =
	| { readonly ok: true; readonly path: string }
	| { readonly ok: false; readonly error: string };

/**
 * Abstraction over the child process spawn for testing.
 */
export interface ProcessSpawner {
	readonly spawn: (
		cmd: string,
		args: readonly string[],
	) => {
		readonly stdin: { write(data: string): void; end(): void } | null;
		readonly stdout: { on(event: 'data', cb: (data: Buffer) => void): void } | null;
		readonly stderr: { on(event: 'data', cb: (data: Buffer) => void): void } | null;
		on(event: 'close', cb: (code: number | null) => void): void;
		on(event: 'error', cb: (err: Error) => void): void;
	};
}

/**
 * Configuration for the w3m overlay system.
 *
 * @example
 * ```typescript
 * import type { W3MConfig } from 'blecsd';
 *
 * const config: W3MConfig = {
 *   binaryPath: '/usr/lib/w3m/w3mimgdisplay',
 *   cellSize: { width: 8, height: 14 },
 * };
 * ```
 */
export interface W3MConfig {
	/** Path to the w3mimgdisplay binary */
	readonly binaryPath?: string;
	/** Terminal cell dimensions in pixels */
	readonly cellSize?: CellPixelSize;
	/** Terminal columns */
	readonly columns?: number;
	/** Terminal rows */
	readonly rows?: number;
	/** Custom process spawner (for testing) */
	readonly spawner?: ProcessSpawner;
}

/**
 * State for a w3m overlay instance.
 */
export interface W3MState {
	/** Resolved binary path */
	readonly binaryPath: string;
	/** Cell pixel dimensions */
	readonly cellSize: CellPixelSize;
	/** Terminal columns */
	readonly columns: number;
	/** Terminal rows */
	readonly rows: number;
	/** Process spawner */
	readonly spawner: ProcessSpawner;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Default character cell width in pixels.
 */
export const DEFAULT_CELL_WIDTH = 8;

/**
 * Default character cell height in pixels.
 */
export const DEFAULT_CELL_HEIGHT = 14;

/**
 * Common paths to search for the w3mimgdisplay binary.
 */
export const W3M_SEARCH_PATHS: readonly string[] = [
	'/usr/lib/w3m/w3mimgdisplay',
	'/usr/libexec/w3m/w3mimgdisplay',
	'/usr/local/libexec/w3m/w3mimgdisplay',
	'/opt/local/libexec/w3m/w3mimgdisplay',
	'/usr/local/lib/w3m/w3mimgdisplay',
];

// =============================================================================
// ZOD SCHEMAS
// =============================================================================

/**
 * Zod schema for CellPixelSize.
 */
export const CellPixelSizeSchema = z.object({
	width: z.number().int().positive(),
	height: z.number().int().positive(),
});

/**
 * Zod schema for W3MConfig.
 *
 * @example
 * ```typescript
 * import { W3MConfigSchema } from 'blecsd';
 *
 * const result = W3MConfigSchema.safeParse({ cellSize: { width: 8, height: 14 } });
 * ```
 */
export const W3MConfigSchema = z.object({
	binaryPath: z.string().optional(),
	cellSize: CellPixelSizeSchema.optional(),
	columns: z.number().int().positive().optional(),
	rows: z.number().int().positive().optional(),
});

// =============================================================================
// COMMAND FORMATTING
// =============================================================================

/**
 * Formats a draw command string for w3mimgdisplay.
 *
 * @param config - Draw configuration
 * @returns The formatted command string
 *
 * @example
 * ```typescript
 * import { formatDrawCommand } from 'blecsd';
 *
 * const cmd = formatDrawCommand({
 *   id: 1, x: 0, y: 0, width: 200, height: 160,
 *   filePath: '/path/to/image.png',
 * });
 * // '0;1;0;0;200;160;;;;;/path/to/image.png\n'
 * ```
 */
export function formatDrawCommand(config: W3MDrawConfig): string {
	const sx = config.srcX ?? '';
	const sy = config.srcY ?? '';
	const sw = config.srcWidth ?? '';
	const sh = config.srcHeight ?? '';
	return `${W3MCommand.Draw};${config.id};${config.x};${config.y};${config.width};${config.height};${sx};${sy};${sw};${sh};${config.filePath}\n`;
}

/**
 * Formats a redraw command string for w3mimgdisplay.
 *
 * @param config - Draw configuration
 * @returns The formatted command string
 *
 * @example
 * ```typescript
 * import { formatRedrawCommand } from 'blecsd';
 *
 * const cmd = formatRedrawCommand({
 *   id: 1, x: 0, y: 0, width: 200, height: 160,
 *   filePath: '/path/to/image.png',
 * });
 * ```
 */
export function formatRedrawCommand(config: W3MDrawConfig): string {
	const sx = config.srcX ?? '';
	const sy = config.srcY ?? '';
	const sw = config.srcWidth ?? '';
	const sh = config.srcHeight ?? '';
	return `${W3MCommand.Redraw};${config.id};${config.x};${config.y};${config.width};${config.height};${sx};${sy};${sw};${sh};${config.filePath}\n`;
}

/**
 * Formats a clear command string for w3mimgdisplay.
 *
 * @param config - Clear configuration
 * @returns The formatted command string
 *
 * @example
 * ```typescript
 * import { formatClearCommand } from 'blecsd';
 *
 * const cmd = formatClearCommand({ x: 0, y: 0, width: 200, height: 160 });
 * // '6;0;0;200;160\n'
 * ```
 */
export function formatClearCommand(config: W3MClearConfig): string {
	return `${W3MCommand.Clear};${config.x};${config.y};${config.width};${config.height}\n`;
}

/**
 * Formats a get-size command string for w3mimgdisplay.
 *
 * @param filePath - Path to the image file
 * @returns The formatted command string
 *
 * @example
 * ```typescript
 * import { formatGetSizeCommand } from 'blecsd';
 *
 * const cmd = formatGetSizeCommand('/path/to/image.png');
 * // '5;/path/to/image.png\n'
 * ```
 */
export function formatGetSizeCommand(filePath: string): string {
	return `${W3MCommand.GetSize};${filePath}\n`;
}

/**
 * Formats the sync command string.
 *
 * @returns The formatted sync command
 */
export function formatSyncCommand(): string {
	return `${W3MCommand.Sync};\n`;
}

/**
 * Formats the nop (communication sync) command string.
 *
 * @returns The formatted nop command
 */
export function formatNopCommand(): string {
	return `${W3MCommand.Nop};\n`;
}

/**
 * Formats the terminate command string.
 *
 * @returns The formatted terminate command
 */
export function formatTerminateCommand(): string {
	return `${W3MCommand.Terminate};\n`;
}

// =============================================================================
// RESPONSE PARSING
// =============================================================================

/**
 * Parses the response from a get-size command.
 * The format is "<width> <height>\n".
 *
 * @param response - Raw response string from w3mimgdisplay
 * @returns Parsed image size or error
 *
 * @example
 * ```typescript
 * import { parseSizeResponse } from 'blecsd';
 *
 * const result = parseSizeResponse('640 480\n');
 * if (result.ok) {
 *   console.log(result.size); // { width: 640, height: 480 }
 * }
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

// =============================================================================
// PIXEL RATIO CALCULATION
// =============================================================================

/**
 * Converts a terminal column/row position to pixel coordinates.
 *
 * @param col - Column position (0-based)
 * @param row - Row position (0-based)
 * @param cellSize - Cell pixel dimensions
 * @returns Pixel coordinates
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
 * @param x - X pixel position
 * @param y - Y pixel position
 * @param cellSize - Cell pixel dimensions
 * @returns Column and row position
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
 * @param columns - Terminal column count
 * @param rows - Terminal row count
 * @param cellSize - Cell pixel dimensions
 * @returns Maximum width and height in pixels
 *
 * @example
 * ```typescript
 * import { maxDisplaySize } from 'blecsd';
 *
 * const max = maxDisplaySize(80, 24, { width: 8, height: 14 });
 * // { width: 640, height: 308 } (24 - 2 rows reserved)
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
 * @param imageSize - Original image dimensions
 * @param maxSize - Maximum display dimensions
 * @returns Scaled dimensions that fit within maxSize
 *
 * @example
 * ```typescript
 * import { scaleToFit } from 'blecsd';
 *
 * const scaled = scaleToFit(
 *   { width: 1920, height: 1080 },
 *   { width: 640, height: 480 },
 * );
 * // { width: 640, height: 360 }
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

// =============================================================================
// BINARY SEARCH
// =============================================================================

/**
 * Searches for the w3mimgdisplay binary on the system.
 *
 * Checks common installation paths. Returns the first path found.
 *
 * @param checkExists - Function to check if a file exists (for testing)
 * @param searchPaths - Override paths to search
 * @returns The found binary path or an error
 *
 * @example
 * ```typescript
 * import { findW3MBinary } from 'blecsd';
 * import { existsSync } from 'fs';
 *
 * const result = findW3MBinary((p) => existsSync(p));
 * if (result.ok) {
 *   console.log('Found w3mimgdisplay at:', result.path);
 * }
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

// =============================================================================
// W3M STATE MANAGEMENT
// =============================================================================

/**
 * Creates a w3m overlay state object with validated configuration.
 *
 * @param config - Configuration options
 * @returns The initialized state
 *
 * @example
 * ```typescript
 * import { createW3MState } from 'blecsd';
 *
 * const state = createW3MState({
 *   binaryPath: '/usr/lib/w3m/w3mimgdisplay',
 *   columns: 80,
 *   rows: 24,
 * });
 * ```
 */
export function createW3MState(config: W3MConfig): W3MState {
	const cellSize = config.cellSize ?? {
		width: DEFAULT_CELL_WIDTH,
		height: DEFAULT_CELL_HEIGHT,
	};

	const defaultSpawner: ProcessSpawner = {
		spawn: () => {
			throw new Error('No process spawner configured. Provide a spawner in W3MConfig.');
		},
	};

	return {
		binaryPath: config.binaryPath ?? '',
		cellSize,
		columns: config.columns ?? 80,
		rows: config.rows ?? 24,
		spawner: config.spawner ?? defaultSpawner,
	};
}

/**
 * Builds a complete draw command sequence: draw + nop + sync.
 * This is the standard sequence for displaying an image.
 *
 * @param config - Draw configuration
 * @returns The full command sequence string
 *
 * @example
 * ```typescript
 * import { buildDrawSequence } from 'blecsd';
 *
 * const seq = buildDrawSequence({
 *   id: 1, x: 0, y: 0, width: 200, height: 160,
 *   filePath: '/path/to/image.png',
 * });
 * ```
 */
export function buildDrawSequence(config: W3MDrawConfig): string {
	return formatDrawCommand(config) + formatNopCommand() + formatSyncCommand();
}

/**
 * Builds a clear + sync command sequence.
 *
 * @param config - Clear area configuration
 * @returns The full command sequence string
 *
 * @example
 * ```typescript
 * import { buildClearSequence } from 'blecsd';
 *
 * const seq = buildClearSequence({ x: 0, y: 0, width: 200, height: 160 });
 * ```
 */
export function buildClearSequence(config: W3MClearConfig): string {
	return formatClearCommand(config) + formatSyncCommand();
}

/**
 * Creates a draw config from terminal cell coordinates.
 * Converts cell positions to pixel coordinates using the cell size.
 *
 * @param id - Image identifier
 * @param col - Column position
 * @param row - Row position
 * @param widthCells - Width in terminal cells
 * @param heightCells - Height in terminal cells
 * @param filePath - Path to the image file
 * @param cellSize - Cell pixel dimensions
 * @returns W3MDrawConfig with pixel coordinates
 *
 * @example
 * ```typescript
 * import { drawConfigFromCells } from 'blecsd';
 *
 * const config = drawConfigFromCells(
 *   1, 10, 5, 40, 20,
 *   '/path/to/image.png',
 *   { width: 8, height: 14 },
 * );
 * ```
 */
export function drawConfigFromCells(
	id: number,
	col: number,
	row: number,
	widthCells: number,
	heightCells: number,
	filePath: string,
	cellSize: CellPixelSize,
): W3MDrawConfig {
	const { x, y } = cellToPixels(col, row, cellSize);
	return {
		id,
		x,
		y,
		width: widthCells * cellSize.width,
		height: heightCells * cellSize.height,
		filePath,
	};
}
