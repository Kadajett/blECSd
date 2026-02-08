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
