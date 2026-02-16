/**
 * ScrollableText widget namespace.
 *
 * @example
 * ```typescript
 * import { scrollableText } from 'blecsd/widgets';
 * const st = scrollableText.create(world, { text: 'Long text content...' });
 * ```
 */
import { createScrollableText, isScrollableText } from '../scrollableText';

export const scrollableText = Object.freeze({
	create: createScrollableText,
	is: isScrollableText,
});

export type ScrollableTextModule = typeof scrollableText;
