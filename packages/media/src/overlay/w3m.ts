/**
 * w3m overlay image support.
 *
 * @module media/overlay/w3m
 */

// Re-export commands
export {
	formatClearCommand,
	formatDrawCommand,
	formatGetSizeCommand,
	formatNopCommand,
	formatRedrawCommand,
	formatSyncCommand,
	formatTerminateCommand,
} from './w3m-commands';
// Re-export helpers
export {
	cellToPixels,
	findW3MBinary,
	maxDisplaySize,
	parseSizeResponse,
	pixelsToCells,
	scaleToFit,
} from './w3m-helpers';
// Re-export types
export type {
	CellPixelSize,
	ImageSize,
	ProcessSpawner,
	W3MClearConfig,
	W3MCommandCode,
	W3MConfig,
	W3MDrawConfig,
	W3MSearchResult,
	W3MSizeResult,
	W3MState,
} from './w3m-types';
export {
	CellPixelSizeSchema,
	DEFAULT_CELL_HEIGHT,
	DEFAULT_CELL_WIDTH,
	W3M_SEARCH_PATHS,
	W3MClearConfigSchema,
	W3MCommand,
	W3MConfigSchema,
	W3MDrawConfigSchema,
} from './w3m-types';

import {
	formatClearCommand,
	formatDrawCommand,
	formatNopCommand,
	formatSyncCommand,
} from './w3m-commands';
import { cellToPixels } from './w3m-helpers';
import type {
	CellPixelSize,
	ProcessSpawner,
	W3MClearConfig,
	W3MConfig,
	W3MDrawConfig,
	W3MState,
} from './w3m-types';
import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH } from './w3m-types';

/**
 * Creates a w3m overlay state object with validated configuration.
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
