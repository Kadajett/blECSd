/**
 * Smooth scroll system namespace.
 *
 * @example
 * ```typescript
 * import { smoothScroll } from 'blecsd/systems';
 * const world = createWorld();
 * const system = smoothScroll.create(world);
 * smoothScroll.scrollTo(world, eid, { x: 0, y: 100 });
 * smoothScroll.scrollBy(world, eid, { x: 0, y: 10 });
 * const isMoving = smoothScroll.isScrolling(world, eid);
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

export const smoothScroll = Object.freeze({
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

export type SmoothScrollSystemModule = typeof smoothScroll;
