/**
 * Particle system for spawning, updating, and removing particles.
 *
 * Processes emitters (rate-based and burst-based spawning) and
 * updates particle age, position, and velocity each frame.
 *
 * @module systems/particleSystem
 */

import {
	type EmitterAppearance,
	getEmitterAppearance,
	hasEmitter,
	hasParticle,
	isParticleDead,
	Particle,
	ParticleEmitter,
	setParticle,
	trackParticle,
	untrackParticle,
} from '../components/particle';
import { hasPosition, Position, setPosition } from '../components/position';
import { hasVelocity, setVelocity, Velocity } from '../components/velocity';
import { addEntity, hasComponent, removeEntity } from '../core/ecs';
import type { Entity, System, World } from '../core/types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Function that provides entity IDs to iterate over.
 * User supplies this because blECSd doesn't own a global query registry.
 */
export type EntityProvider = (world: World) => ReadonlyArray<Entity>;

/**
 * Configuration for the particle system.
 */
export interface ParticleSystemConfig {
	/** Provides emitter entities each frame */
	readonly emitters: EntityProvider;
	/** Provides particle entities each frame */
	readonly particles: EntityProvider;
	/** Maximum concurrent particles (default: 1000) */
	readonly maxParticles?: number;
}

/**
 * Spawns a single particle from an emitter at a random angle within the spread.
 *
 * @param world - The ECS world
 * @param emitterId - The emitter entity ID
 * @param appearance - Visual appearance config
 * @returns The spawned particle entity ID, or -1 if spawn failed
 */
export function spawnParticle(
	world: World,
	emitterId: Entity,
	appearance: EmitterAppearance,
): Entity {
	if (!hasComponent(world, emitterId, ParticleEmitter)) {
		return -1 as Entity;
	}

	const eid = addEntity(world);

	// Pick a random character from the appearance chars
	const charIndex = Math.floor(Math.random() * appearance.chars.length);
	const char = appearance.chars[charIndex] ?? 0x2a; // Default '*'

	// Set particle component
	setParticle(world, eid, {
		lifetime: ParticleEmitter.lifetime[emitterId] as number,
		char,
		startFg: appearance.startFg,
		endFg: appearance.endFg ?? appearance.startFg,
		fadeOut: appearance.fadeOut ?? true,
		emitter: emitterId,
	});

	// Set position to emitter's position
	const ex = hasPosition(world, emitterId) ? (Position.x[emitterId] as number) : 0;
	const ey = hasPosition(world, emitterId) ? (Position.y[emitterId] as number) : 0;
	setPosition(world, eid, ex, ey);

	// Compute random angle within spread
	const baseAngle = ParticleEmitter.angle[emitterId] as number;
	const spread = ParticleEmitter.spread[emitterId] as number;
	const randomAngle = baseAngle + (Math.random() - 0.5) * spread;

	// Set velocity based on speed and angle
	const speed = ParticleEmitter.speed[emitterId] as number;
	const vx = Math.cos(randomAngle) * speed;
	const vy = Math.sin(randomAngle) * speed;
	setVelocity(world, eid, vx, vy);

	// Track this particle under the emitter
	trackParticle(emitterId, eid);

	return eid;
}

/**
 * Triggers a burst of particles from an emitter.
 *
 * @param world - The ECS world
 * @param emitterId - The emitter entity ID
 * @param count - Number of particles to emit (default: emitter's burstCount)
 * @param maxParticles - Maximum total particles allowed (default: 1000)
 * @param currentCount - Current total particle count
 * @returns Array of spawned particle entity IDs
 *
 * @example
 * ```typescript
 * import { burstParticles } from 'blecsd';
 *
 * const particles = burstParticles(world, emitterEntity, 20);
 * ```
 */
export function burstParticles(
	world: World,
	emitterId: Entity,
	count?: number,
	maxParticles = 1000,
	currentCount = 0,
): Entity[] {
	if (!hasComponent(world, emitterId, ParticleEmitter)) {
		return [];
	}

	const appearance = getEmitterAppearance(emitterId);
	if (!appearance) {
		return [];
	}

	const burstCount = count ?? (ParticleEmitter.burstCount[emitterId] as number);
	const spawned: Entity[] = [];

	for (let i = 0; i < burstCount; i++) {
		if (currentCount + spawned.length >= maxParticles) {
			break;
		}
		const eid = spawnParticle(world, emitterId, appearance);
		if (eid !== -1) {
			spawned.push(eid);
		}
	}

	return spawned;
}

/**
 * Ages a particle and updates its velocity for gravity.
 *
 * @param world - The ECS world
 * @param eid - The particle entity ID
 * @param delta - Time elapsed in seconds
 */
export function ageParticle(world: World, eid: Entity, delta: number): void {
	if (!hasComponent(world, eid, Particle)) {
		return;
	}

	// Age the particle
	Particle.age[eid] = (Particle.age[eid] as number) + delta;

	// Apply gravity from emitter
	const emitterId = Particle.emitter[eid] as number;
	if (emitterId > 0 && hasEmitter(world, emitterId as Entity)) {
		const gravity = ParticleEmitter.gravity[emitterId] as number;
		if (gravity !== 0 && hasVelocity(world, eid)) {
			Velocity.y[eid] = (Velocity.y[eid] as number) + gravity * delta;
		}
	}
}

/**
 * Updates a particle's position based on its velocity.
 *
 * @param world - The ECS world
 * @param eid - The particle entity ID
 * @param delta - Time elapsed in seconds
 */
export function moveParticle(world: World, eid: Entity, delta: number): void {
	if (!hasPosition(world, eid) || !hasVelocity(world, eid)) {
		return;
	}
	Position.x[eid] = (Position.x[eid] as number) + (Velocity.x[eid] as number) * delta;
	Position.y[eid] = (Position.y[eid] as number) + (Velocity.y[eid] as number) * delta;
}

/**
 * Removes a dead particle and cleans up tracking.
 *
 * @param world - The ECS world
 * @param eid - The particle entity ID
 */
export function killParticle(world: World, eid: Entity): void {
	const emitterId = Particle.emitter[eid] as number;
	if (emitterId > 0) {
		untrackParticle(emitterId as Entity, eid);
	}
	removeEntity(world, eid);
}

/**
 * Creates a particle system that processes emitters and particles each frame.
 *
 * The system:
 * 1. Processes emitters: rate-based continuous spawning
 * 2. Updates particles: age, gravity, position
 * 3. Removes dead particles
 *
 * @param config - System configuration
 * @returns A System function
 *
 * @example
 * ```typescript
 * import { createParticleSystem } from 'blecsd';
 *
 * const particleSystem = createParticleSystem({
 *   emitters: (world) => myEmitterEntities,
 *   particles: (world) => myParticleEntities,
 *   maxParticles: 500,
 * });
 *
 * // In your game loop
 * particleSystem(world);
 * ```
 */
export function createParticleSystem(config: ParticleSystemConfig): System {
	const maxParticles = config.maxParticles ?? 1000;

	return (world: World): World => {
		const delta = 1 / 60; // Default delta, can be overridden via world metadata
		const emitters = config.emitters(world);
		const particles = config.particles(world);

		let currentParticleCount = particles.length;

		// Process emitters (rate-based spawning)
		for (const emitterId of emitters) {
			if (!hasComponent(world, emitterId, ParticleEmitter)) {
				continue;
			}
			if ((ParticleEmitter.active[emitterId] as number) !== 1) {
				continue;
			}

			const appearance = getEmitterAppearance(emitterId);
			if (!appearance) {
				continue;
			}

			const rate = ParticleEmitter.rate[emitterId] as number;
			if (rate <= 0) {
				continue;
			}

			// Accumulate time and spawn particles
			ParticleEmitter.accumulator[emitterId] =
				(ParticleEmitter.accumulator[emitterId] as number) + delta;

			const interval = 1 / rate;
			while (
				(ParticleEmitter.accumulator[emitterId] as number) >= interval &&
				currentParticleCount < maxParticles
			) {
				ParticleEmitter.accumulator[emitterId] =
					(ParticleEmitter.accumulator[emitterId] as number) - interval;
				const eid = spawnParticle(world, emitterId, appearance);
				if (eid !== -1) {
					currentParticleCount++;
				}
			}
		}

		// Update and remove dead particles
		for (const eid of particles) {
			if (!hasParticle(world, eid)) {
				continue;
			}

			ageParticle(world, eid, delta);
			moveParticle(world, eid, delta);

			if (isParticleDead(world, eid)) {
				killParticle(world, eid);
			}
		}

		return world;
	};
}
