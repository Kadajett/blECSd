/**
 * Flexbox Widget
 *
 * A flexbox-style layout system for responsive terminal UIs.
 * Supports flex direction, justify-content, align-items, wrapping, and nested containers.
 *
 * @module widgets/flexbox
 */

// Re-export types
export type {
	FlexDirection,
	JustifyContent,
	AlignItems,
	FlexWrap,
	FlexChildOptions,
	FlexContainerConfig,
	FlexContainerWidget,
} from './types';

// Re-export configuration schemas
export { FlexChildOptionsSchema, FlexContainerConfigSchema } from './config';

// Re-export state and component
export { FlexContainer } from './state';

// Re-export factory function
export { createFlexContainer, addFlexChild } from './factory';

// Re-export API functions
export { isFlexContainer, resetFlexContainerStore } from './api';
