/**
 * Focus component namespace.
 *
 * Provides all operations for entity focus management and tab ordering.
 *
 * @example
 * ```typescript
 * import { focus } from 'blecsd/components';
 * focus.makeFocusable(world, eid);
 * focus.focus(world, eid);
 * focus.next(world);
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

export const focus = Object.freeze({
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

export type FocusModule = typeof focus;
