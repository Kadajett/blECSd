/**
 * Spring system namespace.
 *
 * @example
 * ```typescript
 * import { spring } from 'blecsd/systems';
 * const world = createWorld();
 * spring.create(world, eid, spring.presets.bouncy);
 * spring.setTarget(world, eid, 100);
 * const isActive = spring.isActive(world, eid);
 * ```
 */
import {
	createSpring,
	getSpringTarget,
	isSpringActive,
	Spring,
	setSpringTarget,
	springBouncy,
	springSmooth,
	springSnappy,
	springSystem,
} from '../spring';

export const spring = Object.freeze({
	create: createSpring,
	system: springSystem,
	setTarget: setSpringTarget,
	getTarget: getSpringTarget,
	isActive: isSpringActive,
	Spring,
	presets: Object.freeze({
		bouncy: springBouncy,
		smooth: springSmooth,
		snappy: springSnappy,
	}),
});

export type SpringSystemModule = typeof spring;
