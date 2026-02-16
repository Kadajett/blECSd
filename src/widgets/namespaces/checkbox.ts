/**
 * CheckboxWidget namespace.
 *
 * @example
 * ```typescript
 * import { checkboxWidget } from 'blecsd/widgets';
 * const cb = checkboxWidget.create(world, { label: 'Accept terms' });
 * ```
 */
import { createCheckbox, isCheckboxWidget, resetCheckboxWidgetStore } from '../checkbox';

export const checkboxWidget = Object.freeze({
	create: createCheckbox,
	is: isCheckboxWidget,
	resetStore: resetCheckboxWidgetStore,
});

export type CheckboxWidgetModule = typeof checkboxWidget;
