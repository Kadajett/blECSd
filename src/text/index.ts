/**
 * Text processing and markup utilities
 * @module text
 */

export type { MarkupStyle, StyledSegment } from './markup';
export {
	MarkupStyleSchema,
	markupLength,
	parseMarkup,
	renderMarkup,
	stripMarkup,
} from './markup';

export type {
	HighlightColors,
	HighlightConfig,
	SupportedLanguage,
	// Note: TokenType not exported to avoid conflict with utils/syntaxHighlight
} from './syntaxHighlight';
export {
	DEFAULT_COLORS,
	HighlightConfigSchema,
	highlightCode,
	stripHighlight,
} from './syntaxHighlight';
