/**
 * FormWidget namespace.
 *
 * @example
 * ```typescript
 * import { formWidget } from 'blecsd/widgets';
 * const f = formWidget.create(world, { fields: [...] });
 * ```
 */
import { createForm, isForm, resetFormStore } from '../form';

export const formWidget = Object.freeze({
	create: createForm,
	is: isForm,
	resetStore: resetFormStore,
});

export type FormWidgetModule = typeof formWidget;
