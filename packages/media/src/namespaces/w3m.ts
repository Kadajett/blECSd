/**
 * W3M image overlay namespace for external image protocol support.
 *
 * @example
 * ```typescript
 * import { w3m } from '@blecsd/media';
 *
 * const state = w3m.createW3MState();
 * const drawCmd = w3m.commands.formatDrawCommand({ x: 0, y: 0, path: 'image.png' });
 * const clearCmd = w3m.commands.formatClearCommand();
 * const size = w3m.sizing.maxDisplaySize({ width: 100, height: 50 });
 * ```
 */

import {
	buildClearSequence,
	buildDrawSequence,
	cellToPixels,
	createW3MState,
	DEFAULT_CELL_HEIGHT,
	DEFAULT_CELL_WIDTH,
	drawConfigFromCells,
	findW3MBinary,
	formatClearCommand,
	formatDrawCommand,
	formatGetSizeCommand,
	formatNopCommand,
	formatRedrawCommand,
	formatSyncCommand,
	formatTerminateCommand,
	maxDisplaySize,
	parseSizeResponse,
	pixelsToCells,
	scaleToFit,
	W3M_SEARCH_PATHS,
	W3MCommand,
} from '../overlay';

const commands = Object.freeze({
	formatDrawCommand,
	formatClearCommand,
	formatGetSizeCommand,
	formatRedrawCommand,
	formatSyncCommand,
	formatNopCommand,
	formatTerminateCommand,
	buildDrawSequence,
	buildClearSequence,
	parseSizeResponse,
	W3MCommand,
});

const sizing = Object.freeze({
	cellToPixels,
	pixelsToCells,
	maxDisplaySize,
	scaleToFit,
	drawConfigFromCells,
	DEFAULT_CELL_WIDTH,
	DEFAULT_CELL_HEIGHT,
});

export const w3m = Object.freeze({
	createW3MState,
	findW3MBinary,
	commands,
	sizing,
	W3M_SEARCH_PATHS,
});

export type W3mModule = typeof w3m;
