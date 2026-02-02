/**
 * Widget wrappers for blECSd components.
 *
 * Widgets provide chainable APIs around ECS components for easier use.
 *
 * @module widgets
 */

// List widget
export type { ListStyleConfig, ListWidget, ListWidgetConfig } from './list';
export { createList, isListWidget, ListWidgetConfigSchema } from './list';
