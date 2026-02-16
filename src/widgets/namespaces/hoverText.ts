/**
 * HoverText (Tooltip) namespace.
 *
 * @example
 * ```typescript
 * import { hoverText } from 'blecsd/widgets';
 * const manager = hoverText.createManager(world, {});
 * hoverText.set(world, eid, 'This is a tooltip');
 * const text = hoverText.get(world, eid);
 * hoverText.clear(world, eid);
 * ```
 */
import {
	clearAllHoverText,
	clearHoverText,
	createHoverTextManager,
	DEFAULT_CURSOR_OFFSET_X,
	DEFAULT_CURSOR_OFFSET_Y,
	DEFAULT_HIDE_DELAY,
	DEFAULT_HOVER_DELAY,
	DEFAULT_TOOLTIP_BG,
	DEFAULT_TOOLTIP_BORDER,
	DEFAULT_TOOLTIP_FG,
	getHoverText,
	getHoverTextCount,
	hasHoverText,
	resetHoverTextStore,
	setHoverText,
} from '../hoverText';

export const hoverText = Object.freeze({
	createManager: createHoverTextManager,
	set: setHoverText,
	get: getHoverText,
	has: hasHoverText,
	clear: clearHoverText,
	clearAll: clearAllHoverText,
	getCount: getHoverTextCount,
	resetStore: resetHoverTextStore,
	DEFAULT_CURSOR_OFFSET_X,
	DEFAULT_CURSOR_OFFSET_Y,
	DEFAULT_HIDE_DELAY,
	DEFAULT_HOVER_DELAY,
	DEFAULT_TOOLTIP_BG,
	DEFAULT_TOOLTIP_BORDER,
	DEFAULT_TOOLTIP_FG,
});

export type HoverTextModule = typeof hoverText;
