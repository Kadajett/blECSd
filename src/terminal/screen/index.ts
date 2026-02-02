/**
 * Screen buffer and cell management
 * @module terminal/screen
 */

export type { AttrFlags, Cell, CellChange, ScreenBufferData } from './cell';
export {
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
} from './cell';

export type { DoubleBufferData, Rect } from './doubleBuffer';
export {
	clearBackBuffer,
	clearDirtyRegions,
	coalesceDirtyRegions,
	copyFrontToBack,
	createDoubleBuffer,
	getBackBuffer,
	getDirtyLines,
	getDirtyRegions,
	getDoubleBufferStats,
	getFrontBuffer,
	getMinimalUpdates,
	hasDirtyRegions,
	markDirtyRegion,
	markFullRedraw,
	markLineDirty,
	needsFullRedraw,
	resizeDoubleBuffer,
	swapBuffers,
} from './doubleBuffer';
