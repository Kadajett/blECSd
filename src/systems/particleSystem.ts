/**
 * Particle system for spawning, updating, and removing particles.
 *
 * Processes emitters (rate-based and burst-based spawning) and
 * updates particle age, position, and velocity each frame.
 *
 * @module systems/particleSystem
 */

import { z } from 'zod';
import {
	type EmitterAppearance,
	getEmitterAppearance,
	getParticleTrackingStore,
	hasEmitter,
	hasParticle,
	isParticleDead,
	Particle,
	ParticleEmitter,
	setParticle,
	type TrackedParticle,
	trackParticle,
	untrackParticle,
} from '../components/particle';
import { hasPosition, Position, setPosition } from '../components/position';
import { hasVelocity, setVelocity, Velocity } from '../components/velocity';
import { addEntity, hasComponent, removeComponent, removeEntity } from '../core/ecs';
import { acquireEntity, releaseEntity } from '../core/storage/archetypePool';
import { getStoreData } from '../core/storage/packedStore';
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
	/** Archetype pool name for zero-alloc entity recycling (optional) */
	readonly archetypeName?: string;
}

/**
 * Zod schema for ParticleSystemConfig validation.
 */
export const ParticleSystemConfigSchema = z.object({
	emitters: z.function(),
	particles: z.function(),
	maxParticles: z.number().int().positive().optional(),
	archetypeName: z.string().optional(),
});

/**
 * Spawns a single particle from an emitter at a random angle within the spread.
 *
 * @param world - The ECS world
 * @param emitterId - The emitter entity ID
 * @param appearance - Visual appearance config
 * @param archetypeName - Optional archetype pool name for entity recycling
 * @returns The spawned particle entity ID, or -1 if spawn failed
 */
export function spawnParticle(
	world: World,
	emitterId: Entity,
	appearance: EmitterAppearance,
	archetypeName?: string,
): Entity {
	if (!hasComponent(world, emitterId, ParticleEmitter)) {
		return -1 as Entity;
	}

	let eid: Entity;
	if (archetypeName) {
		const acquired = acquireEntity(world, archetypeName);
		if (acquired === null) return -1 as Entity;
		eid = acquired;
	} else {
		eid = addEntity(world);
	}

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
 * When an archetype name is provided, the entity is returned to the pool
 * instead of being fully removed from the world.
 *
 * @param world - The ECS world
 * @param eid - The particle entity ID
 * @param archetypeName - Optional archetype pool name for entity recycling
 */
export function killParticle(world: World, eid: Entity, archetypeName?: string): void {
	const emitterId = Particle.emitter[eid] as number;
	if (emitterId > 0) {
		untrackParticle(emitterId as Entity, eid);
	}
	if (archetypeName) {
		// Remove Particle component so the entity is not returned by particle queries
		removeComponent(world, eid, Particle);
		releaseEntity(world, archetypeName, eid);
	} else {
		removeEntity(world, eid);
	}
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
function shouldProcessEmitter(world: World, emitterId: Entity): boolean {
	if (!hasComponent(world, emitterId, ParticleEmitter)) {
		return false;
	}
	if ((ParticleEmitter.active[emitterId] as number) !== 1) {
		return false;
	}
	return true;
}

function processEmitterSpawning(
	world: World,
	emitterId: Entity,
	delta: number,
	maxParticles: number,
	currentCount: number,
	archetypeName?: string,
): number {
	const appearance = getEmitterAppearance(emitterId);
	if (!appearance) return currentCount;

	const rate = ParticleEmitter.rate[emitterId] as number;
	if (rate <= 0) return currentCount;

	// Accumulate time
	ParticleEmitter.accumulator[emitterId] =
		(ParticleEmitter.accumulator[emitterId] as number) + delta;

	const interval = 1 / rate;
	let spawned = currentCount;

	while ((ParticleEmitter.accumulator[emitterId] as number) >= interval && spawned < maxParticles) {
		ParticleEmitter.accumulator[emitterId] =
			(ParticleEmitter.accumulator[emitterId] as number) - interval;
		const eid = spawnParticle(world, emitterId, appearance, archetypeName);
		if (eid !== -1) {
			spawned++;
		}
	}

	return spawned;
}

function processEmitters(
	world: World,
	emitters: ReadonlyArray<Entity>,
	delta: number,
	maxParticles: number,
	currentCount: number,
	archetypeName?: string,
): number {
	let count = currentCount;

	for (const emitterId of emitters) {
		if (!shouldProcessEmitter(world, emitterId)) continue;

		count = processEmitterSpawning(world, emitterId, delta, maxParticles, count, archetypeName);
	}

	return count;
}

function updateParticle(world: World, eid: Entity, delta: number, archetypeName?: string): void {
	if (!hasParticle(world, eid)) return;

	ageParticle(world, eid, delta);
	moveParticle(world, eid, delta);

	if (isParticleDead(world, eid)) {
		killParticle(world, eid, archetypeName);
	}
}

/**
 * Ages and moves all tracked particles using the store's dense data array.
 * Returns a set of processed particle IDs to avoid double-processing.
 */
function updateTrackedParticles(
	world: World,
	storeData: readonly TrackedParticle[],
	storeSize: number,
	delta: number,
	processedIds: Set<number>,
): void {
	for (let i = 0; i < storeSize; i++) {
		const entry = storeData[i];
		if (!entry) continue;
		const eid = entry.particleId as Entity;
		if (!hasParticle(world, eid)) continue;
		processedIds.add(eid);
		ageParticle(world, eid, delta);
		moveParticle(world, eid, delta);
	}
}

/**
 * Kills dead tracked particles. Iterates backward for swap-and-pop safety.
 */
function killDeadTrackedParticles(
	world: World,
	storeData: readonly TrackedParticle[],
	storeSize: number,
	archetypeName?: string,
): void {
	for (let i = storeSize - 1; i >= 0; i--) {
		const entry = storeData[i];
		if (!entry) continue;
		const eid = entry.particleId as Entity;
		if (hasParticle(world, eid)) {
			if (isParticleDead(world, eid)) {
				killParticle(world, eid, archetypeName);
			}
		} else {
			// Stale entry: particle lost its component, just untrack
			untrackParticle(entry.emitterId as Entity, eid);
		}
	}
}

export function createParticleSystem(config: ParticleSystemConfig): System {
	const validated = ParticleSystemConfigSchema.parse(config) as ParticleSystemConfig;
	const maxParticles = validated.maxParticles ?? 1000;
	const archetypeName = validated.archetypeName;
	const processedIds = new Set<number>();

	return (world: World): World => {
		const delta = 1 / 60;
		const emitters = validated.emitters(world);
		const store = getParticleTrackingStore();
		const storeData = getStoreData(store) as readonly TrackedParticle[];

		// Get all particles up-front so we count both tracked and untracked
		const providedParticles = validated.particles(world);

		// Process emitters (rate-based spawning) with total particle count
		processEmitters(world, emitters, delta, maxParticles, providedParticles.length, archetypeName);

		// Phase 1: Age and move tracked particles (linear for-loop, cache-friendly)
		processedIds.clear();
		updateTrackedParticles(world, storeData, store.size, delta, processedIds);

		// Phase 2: Kill dead tracked particles (backward for swap-and-pop safety)
		killDeadTrackedParticles(world, storeData, store.size, archetypeName);

		// Phase 3: Process any untracked particles from the EntityProvider
		for (const eid of providedParticles) {
			if (processedIds.has(eid)) continue;
			updateParticle(world, eid, delta, archetypeName);
		}

		return world;
	};
}
