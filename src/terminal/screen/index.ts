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

export type { RegionBounds } from './regions';
export {
	blankLine,
	blankLines,
	clearRegion,
	clipToBuffer,
	copyRegionInBuffer,
	createRegion,
	deleteLines,
	fillRegion,
	insertLines,
	intersectRegions,
	isPointInRegion,
	isRegionEmpty,
	scrollRegionDown,
	scrollRegionUp,
	unionRegions,
} from './regions';

export type { BlendedColor, ColorWithAlpha } from './transparency';
export {
	blendCellColors,
	blendColors,
	blendPremultiplied,
	fromPremultiplied,
	getEffectiveOpacity,
	getOpacity,
	getParentBackground,
	hasPartialOpacity,
	isTransparent,
	needsBlending,
	setOpacity,
	setTransparent,
	toPremultiplied,
} from './transparency';
