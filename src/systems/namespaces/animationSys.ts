/**
 * Animation system namespace.
 *
 * @example
 * ```typescript
 * import { animationSys } from 'blecsd/systems';
 * const world = createWorld();
 * animationSys.register(world);
 * animationSys.update(world);
 * ```
 */
import {
	animationSystem,
	createAnimationSystem,
	hasAnimationSystem,
	queryAnimation,
	registerAnimationSystem,
	updateAnimations,
} from '../animationSystem';

export const animationSys = Object.freeze({
	create: createAnimationSystem,
	register: registerAnimationSystem,
	system: animationSystem,
	has: hasAnimationSystem,
	query: queryAnimation,
	update: updateAnimations,
});

export type AnimationSysModule = typeof animationSys;
