/**
 * Flexbox Widget
 *
 * A flexbox-style layout system for responsive terminal UIs.
 * Supports flex direction, justify-content, align-items, wrapping, and nested containers.
 *
 * @module widgets/flexbox
 */

// Re-export API functions
export { isFlexContainer, resetFlexContainerStore } from './api';

// Re-export configuration schemas
export { FlexChildOptionsSchema, FlexContainerConfigSchema } from './config';
// Re-export factory function
export { addFlexChild, createFlexContainer } from './factory';
// Re-export state and component
export { FlexContainer } from './state';
// Re-export types
export type {
	AlignItems,
	FlexChildOptions,
	FlexContainerConfig,
	FlexContainerWidget,
	FlexDirection,
	FlexWrap,
	JustifyContent,
} from './types';
