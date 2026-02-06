/**
 * Image overlay utilities for terminal display.
 *
 * @module media/overlay
 */

export type {
	CellPixelSize,
	ImageSize,
	ProcessSpawner,
	W3MClearConfig,
	W3MConfig,
	W3MDrawConfig,
	W3MSearchResult,
	W3MSizeResult,
	W3MState,
} from './w3m';
export {
	buildClearSequence,
	buildDrawSequence,
	CellPixelSizeSchema,
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
	W3MClearConfigSchema,
	W3MCommand,
	W3MConfigSchema,
	W3MDrawConfigSchema,
} from './w3m';
