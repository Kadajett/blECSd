/**
 * Particle component namespace.
 *
 * Provides all operations for particle emitters and individual particles.
 *
 * @example
 * ```typescript
 * import { particle } from 'blecsd/components';
 * particle.emitter.set(world, eid, { rate: 10, speed: 2 });
 * particle.emitter.activate(world, eid);
 * ```
 */
import {
	activateEmitter,
	getEmitter,
	getEmitterAppearance,
	getEmitterParticles,
	getParticle,
	getParticleColor,
	getParticleProgress,
	getParticleTrackingStore,
	hasEmitter,
	hasParticle,
	interpolateColor,
	isEmitterActive,
	isParticleDead,
	pauseEmitter,
	removeEmitter,
	removeParticle,
	resetParticleStore,
	setEmitter,
	setEmitterAppearance,
	setEmitterGravity,
	setEmitterRate,
	setEmitterSpeed,
	setParticle,
	trackParticle,
	untrackParticle,
} from '../particle';

export const particle = Object.freeze({
	get: getParticle,
	has: hasParticle,
	set: setParticle,
	remove: removeParticle,
	isDead: isParticleDead,
	getColor: getParticleColor,
	getProgress: getParticleProgress,
	interpolateColor,

	track: trackParticle,
	untrack: untrackParticle,
	getTrackingStore: getParticleTrackingStore,

	emitter: Object.freeze({
		get: getEmitter,
		has: hasEmitter,
		set: setEmitter,
		remove: removeEmitter,
		activate: activateEmitter,
		pause: pauseEmitter,
		isActive: isEmitterActive,
		getParticles: getEmitterParticles,
		getAppearance: getEmitterAppearance,
		setAppearance: setEmitterAppearance,
		setRate: setEmitterRate,
		setSpeed: setEmitterSpeed,
		setGravity: setEmitterGravity,
	}),

	resetStore: resetParticleStore,
});

export type ParticleModule = typeof particle;
