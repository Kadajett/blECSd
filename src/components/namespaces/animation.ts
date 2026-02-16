/**
 * Animation component namespace.
 *
 * Provides all operations for entity animation playback and management.
 *
 * @example
 * ```typescript
 * import { animation } from 'blecsd/components';
 * animation.register({ name: 'fadeIn', frames: [...] });
 * animation.play(world, eid, 'fadeIn');
 * ```
 */
import {
	getAnimation,
	getAnimationByName,
	getAnimationData,
	getAnimationIdByName,
	getEntityAnimation,
	hasAnimation,
	isAnimationPlaying,
	pauseAnimation,
	playAnimation,
	playAnimationByName,
	registerAnimation,
	removeAnimation,
	resetAnimationStore,
	resumeAnimation,
	setAnimationDirection,
	setAnimationLoop,
	setAnimationSpeed,
	stopAnimation,
	unregisterAnimation,
	updateAnimationEntity,
} from '../animation';

export const animation = Object.freeze({
	get: getAnimation,
	has: hasAnimation,
	getByName: getAnimationByName,
	getIdByName: getAnimationIdByName,
	getData: getAnimationData,
	getEntity: getEntityAnimation,

	register: registerAnimation,
	unregister: unregisterAnimation,
	remove: removeAnimation,

	play: playAnimation,
	playByName: playAnimationByName,
	pause: pauseAnimation,
	resume: resumeAnimation,
	stop: stopAnimation,
	isPlaying: isAnimationPlaying,

	setDirection: setAnimationDirection,
	setLoop: setAnimationLoop,
	setSpeed: setAnimationSpeed,
	updateEntity: updateAnimationEntity,

	resetStore: resetAnimationStore,
});

export type AnimationModule = typeof animation;
