/**
 * Unicode utilities for terminal text handling
 * @module utils/unicode
 */

export {
	charAtCodePoint,
	characters,
	codePointAt,
	codePointLength,
	codePoints,
	codePointToSurrogatePair,
	fromCodePoint,
	HIGH_SURROGATE_END,
	HIGH_SURROGATE_START,
	isAstral,
	isBMP,
	isHighSurrogate,
	isLowSurrogate,
	isSurrogate,
	isSurrogateCode,
	isValidCodePoint,
	LOW_SURROGATE_END,
	LOW_SURROGATE_START,
	sliceCodePoints,
	surrogatePairToCodePoint,
	toCodePoints,
} from './codePoint';
export {
	COMBINING_RANGES,
	COMBINING_SET,
	getCombiningCharCount,
	isCombiningChar,
	isCombiningCharBinarySearch,
} from './combining';
export type { SliceResult, WidthOptions } from './stringWidth';
export {
	centerByWidth,
	charWidth,
	charWidthAt,
	codePointWidth,
	columnAtIndex,
	hasWideChars,
	hasZeroWidthChars,
	indexAtColumn,
	padEndByWidth,
	padStartByWidth,
	sliceByWidth,
	stringWidth,
	strWidth,
	truncateByWidth,
	truncateWithEllipsis,
} from './stringWidth';
export type { CodePointRange } from './widthTables';
export {
	AMBIGUOUS_RANGES,
	EMOJI_WIDE_RANGES,
	FULLWIDTH_RANGES,
	getCharWidth,
	isAmbiguousChar,
	isWideChar,
	isZeroWidthChar,
	WIDE_RANGES,
	ZERO_WIDTH_RANGES,
} from './widthTables';
