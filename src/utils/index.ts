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
// Change coalescing
export type {
	CoalescingConfig,
	CoalescingState,
	DirtyRegion,
	FlushResult,
	TextChange,
} from './changeCoalescing';
export {
	createCoalescer,
	deleteChange,
	destroyCoalescer,
	flushChanges,
	getCoalescingState,
	insertChange,
	queueChange,
	replaceChange,
} from './changeCoalescing';
// Component storage
export type {
	ComponentMemoryReport,
	SparseStorageConfig,
	SparseStore,
	TypedArrayPool,
} from './componentStorage';
export {
	createSparseStore,
	createTypedArrayPool,
	estimateMemoryUsage,
	getComponentMemoryReport,
	isWithinMemoryBounds,
} from './componentStorage';
// Cursor navigation
export type {
	CursorNavConfig,
	CursorPosition,
	LineIndex,
	NavigationResult,
	ViewportState,
} from './cursorNavigation';
export {
	buildLineIndex,
	buildLineIndexFromLengths,
	clampCursor,
	createCursor,
	createNavConfig,
	createViewport,
	ensureCursorVisible,
	goToEnd,
	goToLine,
	goToStart,
	lineForOffset,
	moveCursorDown,
	moveCursorLeft,
	moveCursorRight,
	moveCursorUp,
	offsetForLine,
	pageDown,
	pageUp,
} from './cursorNavigation';
// Efficient diff rendering
export type {
	DiffCache,
	DiffChunk,
	DiffConfig,
	DiffLine,
	DiffResult,
	DiffType,
	SideBySideLine,
	VisibleDiff,
} from './diffRender';
export {
	clearDiffCache,
	collapseChunk,
	collapseUnchanged,
	computeDiff,
	computeDiffCached,
	createDiffCache,
	DEFAULT_COLLAPSE_THRESHOLD,
	DEFAULT_CONTEXT,
	expandAll,
	expandChunk,
	getDiffStats,
	getSideBySideView,
	getTotalLineCount,
	getVisibleDiffLines,
	parseUnifiedDiff,
	toggleChunk,
	toUnifiedDiff,
} from './diffRender';
// Legacy codepage encoding utilities (CP437, etc.)
export * as encoding from './encoding';
// Fast word wrap with caching
export type {
	FastWrapOptions,
	LinePosition,
	ProgressiveWrapResult,
	WrapCache,
	WrapCacheStats,
	WrapEntry,
} from './fastWrap';
export {
	clearWrapCache,
	continueWrap,
	createWrapCache,
	DEFAULT_BATCH_SIZE,
	getWrapCacheStats,
	invalidateAll,
	invalidateParagraph,
	invalidateRange,
	lineToPosition,
	MAX_PARAGRAPH_CHUNK,
	positionToLine,
	resizeWrapCache,
	wrapVisibleFirst,
	wrapWithCache,
} from './fastWrap';
// Fold regions
export type {
	FoldConfig,
	FoldRegion,
	FoldStats,
	VisibleLine,
} from './foldRegions';
export {
	addFoldRegion,
	createFoldState,
	foldAll,
	foldAtDepth,
	foldRegion,
	getAllFoldRegions,
	getFoldAtLine,
	getFoldStats,
	getVisibleFoldLines,
	originalToVisibleLine,
	removeFoldRegion,
	toggleFold,
	unfoldAll,
	unfoldRegion,
	updateTotalLines,
	visibleToOriginalLine,
} from './foldRegions';
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
// Lazy content loading
export type {
	ContentChunk,
	ContentSource,
	LazyContentConfig,
	LazyContentState,
} from './lazyContent';
export {
	clearLazyContent,
	createArraySource,
	createLazyContent,
	evictChunks,
	getLazyContentState,
	getLazyLines,
	isRangeLoaded,
	prefetchAround,
} from './lazyContent';
// Line gutter
export type {
	GutterConfig,
	GutterLine,
	GutterResult,
	LineNumberMode,
} from './lineGutter';
export {
	computeDigitWidth,
	computeGutterWidth,
	computeVisibleGutter,
	createGutterConfig,
	formatLineNumber,
	gutterWidthChanged,
	renderGutterBlock,
} from './lineGutter';
// Efficient markdown rendering
export type {
	BlockData,
	BlockquoteData,
	BlockType,
	CodeData,
	HeadingData,
	HrData,
	HtmlData,
	InlineElement,
	InlineType,
	LineStyle,
	ListData,
	ListItem,
	MarkdownBlock,
	MarkdownCache,
	MarkdownParseResult,
	MarkdownStats,
	ParagraphData,
	RenderedLine,
	TableCell,
	TableData,
	VisibleMarkdown,
} from './markdownRender';
export {
	clearMarkdownCache,
	createMarkdownCache,
	DEFAULT_PARSE_BATCH,
	getMarkdownStats,
	getTotalLineCount as getMarkdownLineCount,
	getVisibleMarkdown,
	invalidateLines as invalidateMarkdownLines,
	parseInline,
	parseMarkdown,
	parseMarkdownCached,
	renderBlock,
	renderMarkdown,
} from './markdownRender';
// Rope data structure for large text buffers
export type { LineInfo, Rope, RopeLeaf, RopeNode, RopeStats } from './rope';
export {
	append,
	charAt,
	createEmptyRope,
	createRope,
	deleteRange,
	getLength,
	getLine,
	getLineCount,
	getLineEnd,
	getLineForIndex,
	getLineStart,
	getLines,
	getNewlineCount,
	getStats,
	getText,
	insert,
	isEmpty,
	LEAF_MAX_SIZE,
	LEAF_MIN_SIZE,
	MAX_DEPTH,
	prepend,
	replaceRange,
	substring,
	verify,
} from './rope';
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
// Incremental syntax highlighting
export type {
	Grammar,
	HighlightCache,
	HighlightResult,
	HighlightStats,
	LineEntry,
	LineState,
	Token,
	TokenType,
} from './syntaxHighlight';
export {
	clearHighlightCache,
	continueHighlight,
	createHighlightCache,
	DEFAULT_HIGHLIGHT_BATCH,
	detectLanguage,
	detectLanguageFromContent,
	EMPTY_STATE,
	GRAMMAR_GO,
	GRAMMAR_JAVASCRIPT,
	GRAMMAR_JSON,
	GRAMMAR_PLAINTEXT,
	GRAMMAR_PYTHON,
	GRAMMAR_RUST,
	GRAMMAR_SHELL,
	GRAMMARS,
	getGrammarByName,
	getHighlightStats,
	highlightVisibleFirst,
	highlightWithCache,
	invalidateAllLines,
	invalidateLine,
	invalidateLines,
	setGrammar,
	tokenizeLine,
} from './syntaxHighlight';
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
// Efficient text search
export type {
	ProgressiveSearchResult,
	SearchCache,
	SearchMatch,
	SearchOptions,
	SearchResult,
} from './textSearch';
export {
	boyerMooreHorspool,
	clearSearchCache,
	createSearchCache,
	DEFAULT_SEARCH_BATCH,
	DEFAULT_TIMEOUT,
	findNearestMatch,
	getMatchAt,
	getMatchStatus,
	getNextMatch,
	getPreviousMatch,
	getVisibleMatches,
	positionToLineColumn,
	search,
	searchBatch,
	searchLiteral,
	searchRegex,
	searchReverse,
	searchWithCache,
	updateSearchQuery,
	WORD_BOUNDARY_AFTER,
	WORD_BOUNDARY_BEFORE,
} from './textSearch';
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
// Time utilities
export { formatDate, unixTimestamp, unixTimestampMs } from './time';
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
// Virtualized line store for large text content
export type {
	LineInfo as VirtualizedLineInfo,
	LineRange as VirtualizedLineRange,
	LineStoreStats,
	VirtualizedLineStore,
} from './virtualizedLineStore';
export {
	appendLines as appendLinesToStore,
	appendToStore,
	CHUNKED_THRESHOLD,
	createEmptyLineStore,
	createLineStore,
	createLineStoreFromLines,
	exportContent,
	exportLineRange,
	getByteSize,
	getLineAtIndex,
	getLineCount as getLineStoreLineCount,
	getLineForOffset,
	getLineInfo,
	getLineRange as getLineStoreRange,
	getOffsetForLine,
	getStoreStats,
	getVisibleLines as getLineStoreVisibleLines,
	isStoreEmpty,
	LineIndexSchema,
	LineRangeParamsSchema,
	TrimParamsSchema,
	trimToLineCount as trimLineStore,
	VisibleLinesParamsSchema,
} from './virtualizedLineStore';
// Virtualized scrollback buffer
export type {
	Chunk,
	LineRange,
	ScrollbackBuffer,
	ScrollbackConfig,
	ScrollbackLine,
	ScrollbackStats,
} from './virtualScrollback';
export {
	appendLine,
	appendLines,
	COMPRESSION_RATIO,
	clearScrollback,
	compressOldChunks,
	createScrollbackBuffer,
	DEFAULT_CHUNK_SIZE,
	DEFAULT_MAX_CACHED,
	DEFAULT_MAX_MEMORY,
	decompressAll,
	exportToText,
	getLine as getScrollbackLine,
	getLineRange,
	getMemoryUsage,
	getScrollbackStats,
	getVisibleLines,
	jumpToLine,
	loadFromText,
	scrollBy,
	scrollToBottom,
	scrollToTop,
	trimToLineCount,
} from './virtualScrollback';
