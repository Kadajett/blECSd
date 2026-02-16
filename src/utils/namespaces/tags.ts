/**
 * Tag parsing and manipulation utilities namespace.
 *
 * @example
 * ```typescript
 * import { tags } from 'blecsd/utils';
 *
 * const parsed = tags.parseTags('{red-fg}Hello{/red-fg} World');
 * const stripped = tags.stripTags('{bold}text{/bold}');
 * const tagged = tags.wrapWithTags('text', 'blue-fg');
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

export const tags = Object.freeze({
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

export type TagsModule = typeof tags;
