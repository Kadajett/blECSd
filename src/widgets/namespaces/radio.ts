/**
 * RadioWidget namespace.
 *
 * @example
 * ```typescript
 * import { radioWidget } from 'blecsd/widgets';
 * const btn = radioWidget.createButton(world, { label: 'Option A', group: 'group1' });
 * const group = radioWidget.createGroup(world, { options: [...] });
 * ```
 */
import {
	createRadioButton,
	createRadioGroup,
	isRadioButtonWidget,
	isRadioGroupWidget,
	resetRadioWidgetStore,
} from '../radioButton';

export const radioWidget = Object.freeze({
	createButton: createRadioButton,
	createGroup: createRadioGroup,
	isButton: isRadioButtonWidget,
	isGroup: isRadioGroupWidget,
	resetStore: resetRadioWidgetStore,
});

export type RadioWidgetModule = typeof radioWidget;
