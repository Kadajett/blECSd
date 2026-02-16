/**
 * MultiSelect widget namespace.
 *
 * @example
 * ```typescript
 * import { multiSelect } from 'blecsd/widgets';
 * const ms = multiSelect.create(world, { items: [...] });
 * const selected = multiSelect.getSelectedItems(world, ms.eid);
 * multiSelect.onSelectionChange(world, ms.eid, callback);
 * ```
 */
import {
	createMultiSelect,
	getSelectedItems,
	isMultiSelect,
	onSelectionChange,
	resetMultiSelectStore,
} from '../multiSelect';

export const multiSelect = Object.freeze({
	create: createMultiSelect,
	is: isMultiSelect,
	getSelectedItems,
	onSelectionChange,
	resetStore: resetMultiSelectStore,
});

export type MultiSelectModule = typeof multiSelect;
