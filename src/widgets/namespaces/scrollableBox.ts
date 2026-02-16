/**
 * ScrollableBox widget namespace.
 *
 * @example
 * ```typescript
 * import { scrollableBox } from 'blecsd/widgets';
 * const sb = scrollableBox.create(world, { scrollbarMode: 'auto' });
 * const keysEnabled = scrollableBox.isKeysScrollEnabled(world, sb.eid);
 * const mouseEnabled = scrollableBox.isMouseScrollEnabled(world, sb.eid);
 * ```
 */
import {
	createScrollableBox,
	isKeysScrollEnabled,
	isMouseScrollEnabled,
	isScrollableBox,
	resetScrollableBoxStore,
} from '../scrollableBox';

export const scrollableBox = Object.freeze({
	create: createScrollableBox,
	is: isScrollableBox,
	isKeysScrollEnabled,
	isMouseScrollEnabled,
	resetStore: resetScrollableBoxStore,
});

export type ScrollableBoxModule = typeof scrollableBox;
