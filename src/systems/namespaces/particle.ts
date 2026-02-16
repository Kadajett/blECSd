/**
 * Particle system namespace.
 *
 * @example
 * ```typescript
 * import { particle } from 'blecsd/systems';
 * const system = particle.create(world, {
 *   maxParticles: 1000,
 *   entityProvider: (world) => addEntity(world),
 * });
 * particle.spawn(world, eid, { x: 100, y: 100, vx: 1, vy: -2 });
 * particle.burst(world, { x: 100, y: 100, count: 50 });
 * ```
 */
import {
	ageParticle,
	burstParticles,
	createParticleSystem,
	killParticle,
	moveParticle,
	spawnParticle,
} from '../particleSystem';

export const particle = Object.freeze({
	create: createParticleSystem,
	spawn: spawnParticle,
	burst: burstParticles,
	kill: killParticle,
	age: ageParticle,
	move: moveParticle,
});

export type ParticleSystemModule = typeof particle;
