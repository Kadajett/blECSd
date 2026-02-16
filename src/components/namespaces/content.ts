/**
 * Content component namespace.
 *
 * Provides all operations for entity text content management.
 *
 * @example
 * ```typescript
 * import { content } from 'blecsd/components';
 * content.set(world, eid, 'Hello, world!');
 * content.getText(world, eid);
 * content.setAlign(world, eid, TextAlign.Center);
 * ```
 */
import {
	appendContent,
	clearContent,
	getContent,
	getContentData,
	getContentHash,
	getContentLength,
	getText,
	hasContent,
	isParsingTags,
	isTextWrapped,
	setContent,
	setParseTags,
	setText,
	setTextAlign,
	setTextVAlign,
	setTextWrap,
} from '../content';

export const content = Object.freeze({
	set: setContent,
	get: getContent,
	has: hasContent,
	getData: getContentData,
	getHash: getContentHash,
	getLength: getContentLength,

	getText,
	setText,
	append: appendContent,
	clear: clearContent,

	setAlign: setTextAlign,
	setVAlign: setTextVAlign,
	setWrap: setTextWrap,
	setParseTags,
	isParsingTags,
	isWrapped: isTextWrapped,
});

export type ContentModule = typeof content;
