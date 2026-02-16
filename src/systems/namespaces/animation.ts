/**
 * Animation system namespace.
 *
 * @example
 * ```typescript
 * import { animation } from 'blecsd/systems';
 * const world = createWorld();
 * animation.register(world);
 * animation.update(world);
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

export const animation = Object.freeze({
	create: createAnimationSystem,
	register: registerAnimationSystem,
	system: animationSystem,
	has: hasAnimationSystem,
	query: queryAnimation,
	update: updateAnimations,
});

export type AnimationSystemModule = typeof animation;
