/**
 * Core ECS components (position, dimensions, padding, renderable, hierarchy)
 * @module components/exports/core
 */

// Dimensions component
export type { DimensionConstraints, DimensionsData, DimensionValue } from '../dimensions';
export {
	AUTO_DIMENSION,
	Dimensions,
	decodePercentage,
	encodePercentage,
	getDimensions,
	getResolvedHeight,
	getResolvedWidth,
	hasDimensions,
	isPercentage,
	setConstraints,
	setDimensions,
	setShrink,
	shouldShrink,
} from '../dimensions';

// Hierarchy component
export type { HierarchyData, TraversalCallback } from '../hierarchy';
export {
	appendChild,
	detach,
	forAncestors,
	forDescendants,
	getAncestors,
	getChildAt,
	getChildIndex,
	getChildren,
	getCommonAncestor,
	getDepth,
	getDescendants,
	getFirstChild,
	getHierarchy,
	getLastChild,
	getNextSibling,
	getParent,
	getPrevSibling,
	getRoot,
	getSiblings,
	Hierarchy,
	hasAncestor,
	hasDescendant,
	hasHierarchy,
	insertAfter,
	insertAt,
	insertBefore,
	isLeaf,
	isRoot,
	NULL_ENTITY,
	prepend,
	removeChild,
	setParent,
} from '../hierarchy';

// Padding component
export type { PaddingData, PaddingOptions } from '../padding';
export {
	getHorizontalPadding,
	getPadding,
	getVerticalPadding,
	hasPadding,
	hasPaddingValue,
	Padding,
	setPadding,
	setPaddingAll,
	setPaddingHV,
} from '../padding';

// Position component
export type { PositionData, PositionKeyword } from '../position';
export {
	bringToFront,
	getPosition,
	getZIndex,
	hasPosition,
	isAbsolute,
	moveBackward,
	moveBy,
	moveForward,
	normalizeZIndices,
	Position,
	sendToBack,
	setAbsolute,
	setPosition,
	setPositionKeyword,
	setPositionPercent,
	setZIndex,
	swapZIndex,
} from '../position';

// Renderable component
export type { RenderableData, StyleData, StyleOptions } from '../renderable';
export {
	colorToHex,
	DEFAULT_BG,
	DEFAULT_FG,
	getRenderable,
	getStyle,
	hasRenderable,
	hexToColor,
	hide,
	isDetached,
	isDirty,
	isEffectivelyVisible,
	isVisible,
	markClean,
	markDirty,
	packColor,
	Renderable,
	setStyle,
	setVisible,
	show,
	toggle,
	unpackColor,
} from '../renderable';
