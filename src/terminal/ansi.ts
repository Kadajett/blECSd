/**
 * ANSI Escape Code Generator
 *
 * Pure functions for generating ANSI escape sequences.
 * All functions return strings with no side effects.
 *
 * @module terminal/ansi
 * @internal This module is internal and not exported from the main package.
 *
 * @deprecated This file is deprecated. Import from './ansi/index' or specific submodules instead.
 * This re-export will be removed in a future version.
 */

// Re-export everything from the ansi submodule
export type {
	Attribute,
	BasicColor,
	BoxDrawingSet,
	CharacterSetId,
	CharacterSetRegister,
	ClipboardSelectionType,
	CodeAttrOptions,
	Color,
	Color256,
	CursorShapeType,
	HyperlinkOptions,
	HyperlinkProtocol,
	InternalColor,
	LocatorButtonValue,
	LocatorEventValue,
	MediaCopyModeValue,
	OutputColorDepth,
	RGBColor,
} from './ansi/index';

export {
	AttributeSchema,
	applySgrCodes,
	attrCode,
	attributesEqual,
	attrToSgrCodes,
	BEL,
	basicBgColors,
	basicFgColors,
	boxDrawing,
	bracketedPaste,
	ClipboardSelection,
	ColorType,
	CSI,
	CursorShape,
	charset,
	clipboard,
	cloneAttribute,
	codeAttr,
	createAttribute,
	cursor,
	DCS,
	DEC_SPECIAL_GRAPHICS,
	DEFAULT_ATTRIBUTE,
	DEFAULT_CLIPBOARD_MAX_SIZE,
	ESC,
	extractSgrCodes,
	HYPERLINK_ALLOWED_PROTOCOLS,
	hasStyle,
	hyperlink,
	isBasicColor,
	isHyperlinkAllowed,
	isRGBColor,
	LocatorButton,
	LocatorEvent,
	locator,
	MediaCopyMode,
	MouseMode,
	mediaCopy,
	mouse,
	OSC,
	packRgb,
	parseSgrString,
	rectangle,
	SGR,
	ST,
	screen,
	sgr,
	sgrReset,
	stripAnsi,
	style,
	sync,
	TextStyle,
	title,
	tmux,
	UNICODE_TO_ASCII,
	unpackRgb,
	visibleLength,
	windowOps,
} from './ansi/index';
