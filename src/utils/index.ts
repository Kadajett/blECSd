/**
 * Utility functions for blECSd
 * @module utils
 */

// Box rendering utilities
export type { BoxChars, Cell, CellBuffer, RenderBoxOptions } from './box';
export {
	BOX_ASCII,
	BOX_BOLD,
	BOX_DASHED,
	BOX_DOUBLE,
	BOX_ROUNDED,
	BOX_SINGLE,
	bufferToString,
	charsetToBoxChars,
	createCellBuffer,
	fillRect,
	renderBox,
	renderHLine,
	renderText,
	renderVLine,
} from './box';
// Fuzzy search utilities
export type { FuzzyMatch, FuzzyOptions, FuzzySearchOptions } from './fuzzySearch';
export {
	FuzzyOptionsSchema,
	fuzzyFilter,
	fuzzyMatch,
	fuzzySearch,
	fuzzySearchBy,
	fuzzyTest,
	highlightMatch,
} from './fuzzySearch';
// Helper utilities
export {
	findAllFiles,
	findFile,
	groupBy,
	merge,
	partition,
	shallowMerge,
	sortBy,
	sortByIndex,
	sortByName,
	sortByPriority,
	unique,
	uniqueBy,
} from './helpers';
// Style attribute encoding
export type { StyleAttr, StyleInput } from './sattr';
export {
	AttrFlags,
	attrsToStyle,
	decodeStyleAttr,
	encodeStyleAttr,
	sattr,
	sattrAddFlag,
	sattrCopy,
	sattrEmpty,
	sattrEqual,
	sattrFromStyleData,
	sattrHasFlag,
	sattrInvert,
	sattrMerge,
	sattrRemoveFlag,
	styleToAttrs,
} from './sattr';
// Tag parsing utilities
export type { Alignment, ParsedContent, TextSegment } from './tags';
export {
	AlignmentSchema,
	attrsToTags,
	attrToTag,
	cleanTags,
	colorToTag,
	createTaggedText,
	escapeTags,
	generateCloseTags,
	generateTags,
	hasTags,
	mergeSegments,
	ParsedContentSchema,
	parsedToTaggedText,
	parseTags,
	segmentToTaggedText,
	stripTags,
	TextSegmentSchema,
	taggedLength,
	wrapWithTags,
} from './tags';
// Text wrapping utilities
export type { TextAlign, WrapOptions } from './textWrap';
export {
	alignLine,
	getVisibleWidth,
	padHeight,
	stripAnsi,
	truncate,
	wordWrap,
	wrapText,
} from './textWrap';
// Unicode utilities
export type {
	CodePointRange,
	DropUnicodeOptions,
	GraphemeSliceResult,
	SliceResult,
	WidthOptions,
} from './unicode';
export {
	// Width tables
	AMBIGUOUS_RANGES,
	// Combining character utilities
	COMBINING_RANGES,
	COMBINING_SET,
	// String width utilities
	centerByWidth,
	// Code point utilities
	charAtCodePoint,
	characters,
	charWidth,
	charWidthAt,
	codePointAt,
	codePointLength,
	codePoints,
	codePointToSurrogatePair,
	codePointWidth,
	columnAtIndex,
	// Normalization utilities
	dropUnicode,
	EMOJI_WIDE_RANGES,
	FULLWIDTH_RANGES,
	fromCodePoint,
	getCharWidth,
	getCombiningCharCount,
	// Grapheme utilities
	graphemeAt,
	graphemeClusters,
	graphemeCount,
	graphemeWidth,
	HIGH_SURROGATE_END,
	HIGH_SURROGATE_START,
	hasGraphemeSegmenter,
	hasWideChars,
	hasZeroWidthChars,
	indexAtColumn,
	isAmbiguousChar,
	isAstral,
	isBMP,
	isCombiningChar,
	isCombiningCharBinarySearch,
	isHighSurrogate,
	isLowSurrogate,
	isSurrogate,
	isSurrogateCode,
	isValidCodePoint,
	isWideChar,
	isZeroWidthChar,
	LOW_SURROGATE_END,
	LOW_SURROGATE_START,
	normalizeNFC,
	normalizeNFD,
	normalizeNFKC,
	normalizeNFKD,
	padEndByWidth,
	padStartByWidth,
	reverseGraphemes,
	sliceByWidth,
	sliceByWidthGrapheme,
	sliceCodePoints,
	sliceGraphemes,
	stringWidth,
	stringWidthGrapheme,
	stripCombining,
	stripControl,
	stripZeroWidth,
	strWidth,
	surrogatePairToCodePoint,
	toAscii,
	toCodePoints,
	toGraphemes,
	truncateByWidth,
	truncateWithEllipsis,
	truncateWithEllipsisGrapheme,
	WIDE_RANGES,
	ZERO_WIDTH_RANGES,
} from './unicode';
