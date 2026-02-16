/**
 * w3m overlay types and constants.
 *
 * @module media/overlay/w3m-types
 */

import { z } from 'zod';

/**
 * w3mimgdisplay command codes.
 */
export const W3MCommand = {
	Draw: 0,
	Redraw: 1,
	Terminate: 2,
	Sync: 3,
	Nop: 4,
	GetSize: 5,
	Clear: 6,
} as const;

export type W3MCommandCode = (typeof W3MCommand)[keyof typeof W3MCommand];

/**
 * Image dimensions in pixels.
 */
export interface ImageSize {
	readonly width: number;
	readonly height: number;
}

/**
 * Terminal cell dimensions in pixels.
 */
export interface CellPixelSize {
	readonly width: number;
	readonly height: number;
}

/**
 * Configuration for a w3m draw command.
 */
export interface W3MDrawConfig {
	readonly id: number;
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
	readonly srcX?: number;
	readonly srcY?: number;
	readonly srcWidth?: number;
	readonly srcHeight?: number;
	readonly filePath: string;
}

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
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
}

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
 */
export interface W3MConfig {
	readonly binaryPath?: string;
	readonly cellSize?: CellPixelSize;
	readonly columns?: number;
	readonly rows?: number;
	readonly spawner?: ProcessSpawner;
}

/**
 * State for a w3m overlay instance.
 */
export interface W3MState {
	readonly binaryPath: string;
	readonly cellSize: CellPixelSize;
	readonly columns: number;
	readonly rows: number;
	readonly spawner: ProcessSpawner;
}

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

export const CellPixelSizeSchema = z.object({
	width: z.number().int().positive(),
	height: z.number().int().positive(),
});

export const W3MConfigSchema = z.object({
	binaryPath: z.string().optional(),
	cellSize: CellPixelSizeSchema.optional(),
	columns: z.number().int().positive().optional(),
	rows: z.number().int().positive().optional(),
});
