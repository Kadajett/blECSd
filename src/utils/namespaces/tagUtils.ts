/**
 * Tag parsing and manipulation utilities namespace.
 *
 * @example
 * ```typescript
 * import { tagUtils } from 'blecsd/utils';
 *
 * const parsed = tagUtils.parseTags('{red-fg}Hello{/red-fg} World');
 * const stripped = tagUtils.stripTags('{bold}text{/bold}');
 * const tagged = tagUtils.wrapWithTags('text', 'blue-fg');
 * ```
 */

import {
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
} from '../tags';

export const tagUtils = Object.freeze({
	parseTags,
	stripTags,
	hasTags,
	escapeTags,
	cleanTags,
	wrapWithTags,
	createTaggedText,
	parsedToTaggedText,
	segmentToTaggedText,
	taggedLength,
	mergeSegments,
	generateTags,
	generateCloseTags,
	colorToTag,
	attrToTag,
	attrsToTags,
	AlignmentSchema,
	ParsedContentSchema,
	TextSegmentSchema,
});

export type TagUtilsModule = typeof tagUtils;
