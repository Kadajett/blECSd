/**
 * Unicode utilities namespace with sub-namespaces for different Unicode operations.
 *
 * @example
 * ```typescript
 * import { unicodeUtils } from 'blecsd/utils';
 *
 * // Width operations
 * const width = unicodeUtils.width.stringWidth('Hello 世界');
 * const truncated = unicodeUtils.width.truncateByWidth(text, 20);
 *
 * // Code point operations
 * const codePoints = unicodeUtils.codePoint.toCodePoints('Hello');
 * const char = unicodeUtils.codePoint.fromCodePoint(0x1f600);
 *
 * // Grapheme operations
 * const clusters = unicodeUtils.grapheme.graphemeClusters('Hello 👨‍👩‍👧‍👦');
 * const count = unicodeUtils.grapheme.graphemeCount(text);
 *
 * // Normalization operations
 * const normalized = unicodeUtils.normalize.normalizeNFC(text);
 *
 * // Surrogate pair operations
 * const pair = unicodeUtils.surrogate.codePointToSurrogatePair(0x1f600);
 * const codePoint = unicodeUtils.surrogate.surrogatePairToCodePoint(0xd83d, 0xde00);
 * ```
 */

import {
	AMBIGUOUS_RANGES,
	COMBINING_RANGES,
	COMBINING_SET,
	centerByWidth,
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
	dropUnicode,
	EMOJI_WIDE_RANGES,
	FULLWIDTH_RANGES,
	fromCodePoint,
	getCharWidth,
	getCombiningCharCount,
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
} from '../unicode';

/**
 * Width calculation and manipulation sub-namespace.
 */
const width = Object.freeze({
	stringWidth,
	charWidth,
	charWidthAt,
	codePointWidth,
	graphemeWidth,
	stringWidthGrapheme,
	strWidth,
	getCharWidth,
	hasWideChars,
	hasZeroWidthChars,
	isWideChar,
	isZeroWidthChar,
	isAmbiguousChar,
	isCombiningChar,
	isCombiningCharBinarySearch,
	getCombiningCharCount,
	truncateByWidth,
	sliceByWidth,
	sliceByWidthGrapheme,
	truncateWithEllipsis,
	truncateWithEllipsisGrapheme,
	padStartByWidth,
	padEndByWidth,
	centerByWidth,
	columnAtIndex,
	indexAtColumn,
	WIDE_RANGES,
	ZERO_WIDTH_RANGES,
	AMBIGUOUS_RANGES,
	FULLWIDTH_RANGES,
	EMOJI_WIDE_RANGES,
	COMBINING_RANGES,
	COMBINING_SET,
});

/**
 * Code point operations sub-namespace.
 */
const codePoint = Object.freeze({
	codePointAt,
	codePoints,
	toCodePoints,
	fromCodePoint,
	codePointLength,
	charAtCodePoint,
	characters,
	sliceCodePoints,
	isValidCodePoint,
	isBMP,
	isAstral,
});

/**
 * Grapheme cluster operations sub-namespace.
 */
const grapheme = Object.freeze({
	graphemeClusters,
	toGraphemes,
	graphemeAt,
	graphemeCount,
	sliceGraphemes,
	reverseGraphemes,
	hasGraphemeSegmenter,
});

/**
 * Unicode normalization sub-namespace.
 */
const normalize = Object.freeze({
	normalizeNFC,
	normalizeNFD,
	normalizeNFKC,
	normalizeNFKD,
	dropUnicode,
	toAscii,
	stripCombining,
	stripZeroWidth,
	stripControl,
});

/**
 * Surrogate pair operations sub-namespace.
 */
const surrogate = Object.freeze({
	codePointToSurrogatePair,
	surrogatePairToCodePoint,
	isHighSurrogate,
	isLowSurrogate,
	isSurrogate,
	isSurrogateCode,
	HIGH_SURROGATE_START,
	HIGH_SURROGATE_END,
	LOW_SURROGATE_START,
	LOW_SURROGATE_END,
});

export const unicodeUtils = Object.freeze({
	width,
	codePoint,
	grapheme,
	normalize,
	surrogate,
	// Also expose common functions at top level for convenience
	stringWidth,
	charWidth,
	truncateByWidth,
	hasWideChars,
	isWideChar,
	graphemeClusters,
	toCodePoints,
	normalizeNFC,
});

export type UnicodeUtilsModule = typeof unicodeUtils;
