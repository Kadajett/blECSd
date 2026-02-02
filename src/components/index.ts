/**
 * ECS Components for blECSd
 * @module components
 */

// Border component
export type { BorderCharset, BorderData, BorderOptions } from './border';
export {
	BORDER_ASCII,
	BORDER_BOLD,
	BORDER_DOUBLE,
	BORDER_ROUNDED,
	BORDER_SINGLE,
	Border,
	BorderType,
	DEFAULT_BORDER_BG,
	DEFAULT_BORDER_FG,
	disableAllBorders,
	enableAllBorders,
	getBorder,
	getBorderChar,
	hasBorder,
	hasBorderVisible,
	setBorder,
	setBorderChars,
} from './border';
// Content component
export type { ContentData, ContentOptions } from './content';
export {
	appendContent,
	Content,
	clearContent,
	contentStore,
	getContent,
	getContentData,
	getContentHash,
	getContentLength,
	hasContent,
	isParsingTags,
	isTextWrapped,
	resetContentStore,
	setContent,
	setParseTags,
	setTextAlign,
	setTextVAlign,
	setTextWrap,
	TextAlign,
	TextVAlign,
} from './content';
// Dimensions component
export type { DimensionConstraints, DimensionsData, DimensionValue } from './dimensions';
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
} from './dimensions';
// Focusable component
export type { FocusableData, FocusableOptions } from './focusable';
export {
	blur,
	DEFAULT_FOCUS_BG,
	DEFAULT_FOCUS_FG,
	Focusable,
	focus,
	focusNext,
	focusPrev,
	getFocusable,
	getFocusedEntity,
	getTabIndex,
	getTabOrder,
	hasFocusable,
	isFocusable,
	isFocused,
	isInTabOrder,
	makeFocusable,
	resetFocusState,
	setFocusable,
	setTabIndex,
} from './focusable';
// Hierarchy component
export type { HierarchyData } from './hierarchy';
export {
	appendChild,
	getAncestors,
	getChildren,
	getDepth,
	getDescendants,
	getHierarchy,
	getNextSibling,
	getParent,
	getPrevSibling,
	Hierarchy,
	hasHierarchy,
	isLeaf,
	isRoot,
	NULL_ENTITY,
	removeChild,
	setParent,
} from './hierarchy';
// Input components
export type {
	InputBufferData,
	KeyboardInputData,
	KeyboardInputOptions,
	MouseInputData,
	MouseInputOptions,
} from './input';
export {
	clearInputBufferSelection,
	clearKeyboardInput,
	clearMouseInput,
	getInputBuffer,
	getInputBufferText,
	getKeyboardInput,
	getMouseInput,
	hasInputBuffer,
	hasKeyboardInput,
	hasMouseInput,
	InputBuffer,
	inputBufferStore,
	KeyboardInput,
	ModifierFlags,
	MouseButtons,
	MouseInput,
	packModifiers,
	recordClick,
	removeInputBuffer,
	removeKeyboardInput,
	removeMouseInput,
	setInputBuffer,
	setInputBufferSelection,
	setInputBufferText,
	setKeyboardInput,
	setMouseInput,
	unpackModifiers,
} from './input';
// Interactive component
export type { InteractiveData, InteractiveOptions } from './interactive';
export {
	clearInteractionState,
	DEFAULT_HOVER_BG,
	DEFAULT_HOVER_FG,
	getInteractive,
	hasInteractive,
	Interactive,
	isClickable,
	isDraggable,
	isHoverable,
	isHovered,
	isKeyable,
	isPressed,
	setClickable,
	setDraggable,
	setHoverable,
	setHovered,
	setInteractive,
	setKeyable,
	setPressed,
} from './interactive';
// Label component
export type { LabelData, LabelOptions } from './label';
export {
	getLabel,
	getLabelPosition,
	getLabelText,
	hasLabel,
	hasLabelText,
	Label,
	LabelPosition,
	labelStore,
	removeLabel,
	resetLabelStore,
	setLabel,
	setLabelOffset,
	setLabelPosition,
} from './label';
// Padding component
export type { PaddingData, PaddingOptions } from './padding';
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
} from './padding';
// Position component
export type { PositionData } from './position';
export {
	getPosition,
	hasPosition,
	isAbsolute,
	moveBy,
	Position,
	setAbsolute,
	setPosition,
	setZIndex,
} from './position';
// Renderable component
export type { RenderableData, StyleData, StyleOptions } from './renderable';
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
} from './renderable';
// Scrollable component
export type {
	ScrollableData,
	ScrollableOptions,
	ScrollPercentage,
	ScrollPosition,
} from './scrollable';
export {
	canScroll,
	getScroll,
	getScrollable,
	getScrollPercentage,
	hasScrollable,
	isAtBottom,
	isAtTop,
	Scrollable,
	ScrollbarVisibility,
	scrollBy,
	scrollTo,
	scrollToBottom,
	scrollToTop,
	setScroll,
	setScrollable,
	setScrollbarVisibility,
	setScrollSize,
} from './scrollable';
// State Machine component
export {
	attachStateMachine,
	canSendEvent,
	detachStateMachine,
	getPreviousState,
	getState,
	getStateAge,
	hasStateMachine,
	isInState,
	StateMachineStore,
	sendEvent,
	updateStateAge,
} from './stateMachine';
