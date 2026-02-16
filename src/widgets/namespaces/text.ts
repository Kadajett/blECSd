/**
 * Text widget namespace.
 *
 * @example
 * ```typescript
 * import { text } from 'blecsd/widgets';
 * const t = text.create(world, { content: 'Hello' });
 * const content = text.getContent(world, t.eid);
 * text.setContent(world, t.eid, 'World');
 * ```
 */
import { createText, getTextContent, isText, resetTextStore, setTextContent } from '../text';

export const text = Object.freeze({
	create: createText,
	is: isText,
	getContent: getTextContent,
	setContent: setTextContent,
	resetStore: resetTextStore,
});

export type TextModule = typeof text;
