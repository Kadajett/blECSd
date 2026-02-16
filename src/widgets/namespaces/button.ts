/**
 * ButtonWidget namespace.
 *
 * @example
 * ```typescript
 * import { buttonWidget } from 'blecsd/widgets';
 * const btn = buttonWidget.create(world, { label: 'Click me' });
 * ```
 */
import { createButton, isButtonWidget, resetButtonWidgetStore } from '../button';

export const buttonWidget = Object.freeze({
	create: createButton,
	is: isButtonWidget,
	resetStore: resetButtonWidgetStore,
});

export type ButtonWidgetModule = typeof buttonWidget;
