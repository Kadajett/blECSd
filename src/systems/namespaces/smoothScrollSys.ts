/**
 * Smooth scroll system namespace.
 *
 * @example
 * ```typescript
 * import { smoothScrollSys } from 'blecsd/systems';
 * const world = createWorld();
 * const system = smoothScrollSys.create(world);
 * smoothScrollSys.scrollTo(world, eid, { x: 0, y: 100 });
 * smoothScrollSys.scrollBy(world, eid, { x: 0, y: 10 });
 * const isMoving = smoothScrollSys.isScrolling(world, eid);
 * ```
 */
import {
	applyScrollImpulse,
	clearAllScrollStates,
	createSmoothScrollSystem,
	endUserScroll,
	getScrollPosition,
	getScrollState,
	isScrolling,
	removeScrollState,
	setScrollImmediate,
	smoothScrollTo,
	startUserScroll,
	updateScrollPhysics,
} from '../smoothScroll';

export const smoothScrollSys = Object.freeze({
	create: createSmoothScrollSystem,
	scrollTo: smoothScrollTo,
	scrollBy: applyScrollImpulse,
	setImmediate: setScrollImmediate,
	getPosition: getScrollPosition,
	getState: getScrollState,
	isScrolling,
	removeState: removeScrollState,
	clearAll: clearAllScrollStates,
	updatePhysics: updateScrollPhysics,
	user: Object.freeze({
		start: startUserScroll,
		end: endUserScroll,
	}),
});

export type SmoothScrollSysModule = typeof smoothScrollSys;
