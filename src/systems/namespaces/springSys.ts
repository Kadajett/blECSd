/**
 * Spring system namespace.
 *
 * @example
 * ```typescript
 * import { springSys } from 'blecsd/systems';
 * const world = createWorld();
 * springSys.create(world, eid, springSys.presets.bouncy);
 * springSys.setTarget(world, eid, 100);
 * const isActive = springSys.isActive(world, eid);
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

export const springSys = Object.freeze({
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

export type SpringSysModule = typeof springSys;
