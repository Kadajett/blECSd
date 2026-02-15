/**
 * ScrollableBox Widget
 *
 * A scrollable container widget that combines Box functionality with scrolling.
 * Supports keyboard and mouse-based scrolling, configurable scrollbars, and
 * automatic scroll clamping.
 *
 * @module widgets/scrollableBox
 */

// Re-export types
export type {
	Align,
	BorderConfig,
	DimensionValue,
	PaddingConfig,
	PositionValue,
	ScrollableBoxConfig,
	ScrollableBoxWidget,
	ScrollbarConfig,
	ScrollbarMode,
	VAlign,
} from './types';

// Re-export configuration schemas
export { ScrollableBoxConfigSchema } from './config';

// Re-export state and component
export { ScrollableBox } from './state';

// Re-export factory function
export { createScrollableBox } from './factory';

// Re-export API functions
export {
	isKeysScrollEnabled,
	isMouseScrollEnabled,
	isScrollableBox,
	resetScrollableBoxStore,
} from './api';
