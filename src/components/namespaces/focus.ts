/**
 * Focusable component namespace.
 *
 * Provides all operations for entity focus management and tab ordering.
 *
 * @example
 * ```typescript
 * import { focusable } from 'blecsd/components';
 * focusable.makeFocusable(world, eid);
 * focusable.focus(world, eid);
 * focusable.next(world);
 * ```
 */
import {
	blur,
	focus as focusFn,
	focusNext,
	focusPrev,
	getFocusable,
	getFocusedEntity,
	getTabIndex,
	getTabOrder,
	hasFocusable,
	isFocusable,
	isFocused,
	isInTabOrder,
	makeFocusable,
	resetFocusState,
	setFocusable,
	setTabIndex,
} from '../focusable';

export const focusable = Object.freeze({
	get: getFocusable,
	has: hasFocusable,
	set: setFocusable,

	focus: focusFn,
	blur,
	next: focusNext,
	prev: focusPrev,

	isFocusable,
	isFocused,
	makeFocusable,

	getFocused: getFocusedEntity,
	getTabIndex,
	setTabIndex,
	getTabOrder,
	isInTabOrder,

	resetState: resetFocusState,
});

export type FocusableModule = typeof focusable;
