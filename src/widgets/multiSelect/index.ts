/**
 * Multi-Select Widget
 *
 * A standalone multi-select dropdown/list with checkbox display,
 * filter-as-you-type, range selection, and keyboard-only navigation.
 *
 * @module widgets/multiSelect
 *
 * @example
 * ```typescript
 * import { createMultiSelect, getSelectedItems, onSelectionChange } from 'blecsd';
 *
 * const world = createWorld();
 * const ms = createMultiSelect(world, {
 *   items: ['Apple', 'Banana', 'Cherry', 'Date'],
 *   width: 30,
 *   height: 10,
 * });
 *
 * // Toggle items
 * ms.focus().select(0).toggleCurrent();
 *
 * // Get selected
 * const selected = getSelectedItems(world, ms.eid);
 * console.log(selected); // ['Apple']
 *
 * // Listen for changes
 * onSelectionChange(world, ms.eid, (items) => {
 *   console.log('Selected:', items);
 * });
 * ```
 */

// Re-export types
export type {
	MultiSelectConfig,
	MultiSelectItem,
	MultiSelectWidget,
	SelectionChangeCallback,
} from './types';

// Re-export configuration schemas and constants
export { CHECKBOX_CHECKED, CHECKBOX_UNCHECKED, DEFAULT_HEIGHT, DEFAULT_WIDTH, MultiSelectConfigSchema } from './config';

// Re-export state and component
export { MultiSelect, stateMap } from './state';
export type { MultiSelectState } from './state';

// Re-export factory function
export { createMultiSelect } from './factory';

// Re-export API functions
export { getSelectedItems, isMultiSelect, onSelectionChange, resetMultiSelectStore } from './api';
