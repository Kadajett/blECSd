/**
 * Focus system namespace.
 *
 * @example
 * ```typescript
 * import { focus } from 'blecsd/systems';
 * const world = createWorld();
 * const system = focus.create(world);
 * focus.focus(world, eid);
 * focus.next(world);
 * const focused = focus.getFocused(world);
 * ```
 */
import {
	blurAll,
	clearFocusStack,
	createFocusSystem,
	focusEntity,
	focusFirst,
	focusLast,
	focusNext,
	focusOffset,
	focusPop,
	focusPrev,
	focusPush,
	focusSystem,
	getFocusableEntities,
	getFocusEventBus,
	getFocused,
	getFocusStackDepth,
	peekFocusStack,
	resetFocusEventBus,
	restoreFocus,
	rewindFocus,
	saveFocus,
} from '../focusSystem';

export const focus = Object.freeze({
	create: createFocusSystem,
	system: focusSystem,
	focus: focusEntity,
	next: focusNext,
	prev: focusPrev,
	first: focusFirst,
	last: focusLast,
	offset: focusOffset,
	blurAll,
	getFocused,
	getFocusable: getFocusableEntities,
	getEventBus: getFocusEventBus,
	resetEventBus: resetFocusEventBus,
	stack: Object.freeze({
		push: focusPush,
		pop: focusPop,
		peek: peekFocusStack,
		depth: getFocusStackDepth,
		clear: clearFocusStack,
	}),
	history: Object.freeze({
		save: saveFocus,
		restore: restoreFocus,
		rewind: rewindFocus,
	}),
});

export type FocusSystemModule = typeof focus;
