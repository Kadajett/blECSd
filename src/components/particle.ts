/**
 * Particle and ParticleEmitter components for visual effects.
 *
 * Provides SoA component stores for particles and emitters,
 * along with helper functions for color interpolation, aging,
 * and emitter configuration.
 *
 * @module components/particle
 */

import { addComponent, hasComponent, removeComponent } from '../core/ecs';
import type { PackedHandle, PackedStore } from '../core/storage/packedStore';
import {
	addToStore,
	createPackedStore,
	getStoreData,
	removeFromStore,
} from '../core/storage/packedStore';
import type { Entity, World } from '../core/types';

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

// =============================================================================
// PARTICLE COMPONENT
// =============================================================================

/**
 * Particle component store using SoA (Structure of Arrays).
 *
 * - `lifetime`: Total lifetime in seconds
 * - `age`: Current age in seconds
 * - `fadeOut`: 1 if particle should fade as it ages, 0 otherwise
 * - `char`: Character code point to render
 * - `startFg`: Foreground color at birth (packed RGBA)
 * - `endFg`: Foreground color at death (packed RGBA)
 * - `emitter`: Entity ID of the emitter that spawned this particle
 *
 * @example
 * ```typescript
 * import { Particle, setParticle, getParticle, isParticleDead } from 'blecsd';
 *
 * setParticle(world, entity, {
 *   lifetime: 2,
 *   char: '*'.codePointAt(0)!,
 *   startFg: 0xffff0000,
 *   endFg: 0xff880000,
 *   fadeOut: true,
 * });
 * ```
 */
export const Particle = {
	/** Total lifetime in seconds */
	lifetime: new Float32Array(DEFAULT_CAPACITY),
	/** Current age in seconds */
	age: new Float32Array(DEFAULT_CAPACITY),
	/** 1 if particle fades out, 0 otherwise */
	fadeOut: new Uint8Array(DEFAULT_CAPACITY),
	/** Character code point to render */
	char: new Uint32Array(DEFAULT_CAPACITY),
	/** Foreground color at birth (packed RGBA) */
	startFg: new Uint32Array(DEFAULT_CAPACITY),
	/** Foreground color at death (packed RGBA) */
	endFg: new Uint32Array(DEFAULT_CAPACITY),
	/** Entity ID of the emitter that spawned this particle (0 = none) */
	emitter: new Uint32Array(DEFAULT_CAPACITY),
};

/**
 * ParticleEmitter component store using SoA (Structure of Arrays).
 *
 * - `rate`: Particles per second (continuous emission)
 * - `burstCount`: Number of particles to emit in a burst
 * - `lifetime`: Default lifetime for spawned particles
 * - `spread`: Emission spread angle in radians (0 = forward, PI = half-circle, 2*PI = full circle)
 * - `speed`: Initial speed of spawned particles (cells/sec)
 * - `gravity`: Downward acceleration (cells/sec^2)
 * - `angle`: Base emission angle in radians (0 = right)
 * - `active`: 1 if emitter is actively emitting, 0 if paused
 * - `accumulator`: Internal accumulator for rate-based emission
 *
 * @example
 * ```typescript
 * import { ParticleEmitter, setEmitter, burstParticles } from 'blecsd';
 *
 * setEmitter(world, entity, {
 *   rate: 10,
 *   lifetime: 1.5,
 *   speed: 5,
 *   spread: Math.PI / 4,
 *   gravity: 2,
 * });
 *
 * burstParticles(world, entity, 20);
 * ```
 */
export const ParticleEmitter = {
	/** Particles per second */
	rate: new Float32Array(DEFAULT_CAPACITY),
	/** Burst count */
	burstCount: new Uint16Array(DEFAULT_CAPACITY),
	/** Default particle lifetime in seconds */
	lifetime: new Float32Array(DEFAULT_CAPACITY),
	/** Emission spread angle in radians */
	spread: new Float32Array(DEFAULT_CAPACITY),
	/** Initial speed in cells per second */
	speed: new Float32Array(DEFAULT_CAPACITY),
	/** Downward gravity in cells/sec^2 */
	gravity: new Float32Array(DEFAULT_CAPACITY),
	/** Base emission angle in radians (0 = right) */
	angle: new Float32Array(DEFAULT_CAPACITY),
	/** 1 if active, 0 if paused */
	active: new Uint8Array(DEFAULT_CAPACITY),
	/** Internal accumulator for rate-based emission */
	accumulator: new Float32Array(DEFAULT_CAPACITY),
};

// =============================================================================
// TYPES
// =============================================================================

/**
 * Particle data returned by getParticle.
 */
export interface ParticleData {
	readonly lifetime: number;
	readonly age: number;
	readonly fadeOut: boolean;
	readonly char: number;
	readonly startFg: number;
	readonly endFg: number;
	readonly emitter: number;
}

/**
 * Options for setting a particle.
 */
export interface ParticleOptions {
	/** Total lifetime in seconds */
	lifetime: number;
	/** Character code point to render */
	char: number;
	/** Foreground color at birth (packed RGBA) */
	startFg: number;
	/** Foreground color at death (packed RGBA, default: same as startFg) */
	endFg?: number;
	/** Whether particle fades out (default: false) */
	fadeOut?: boolean;
	/** Entity ID of the emitter (default: 0) */
	emitter?: number;
}

/**
 * Emitter data returned by getEmitter.
 */
export interface EmitterData {
	readonly rate: number;
	readonly burstCount: number;
	readonly lifetime: number;
	readonly spread: number;
	readonly speed: number;
	readonly gravity: number;
	readonly angle: number;
	readonly active: boolean;
}

/**
 * Options for configuring an emitter.
 */
export interface EmitterOptions {
	/** Particles per second (default: 0, continuous off) */
	rate?: number;
	/** Burst count (default: 0) */
	burstCount?: number;
	/** Default particle lifetime in seconds */
	lifetime: number;
	/** Emission spread angle in radians (default: 2*PI, full circle) */
	spread?: number;
	/** Initial particle speed in cells/sec (default: 3) */
	speed?: number;
	/** Gravity in cells/sec^2 (default: 0) */
	gravity?: number;
	/** Base emission angle in radians (default: 0, right) */
	angle?: number;
	/** Whether emitter is active (default: true) */
	active?: boolean;
}

/**
 * Options for configuring emitter characters and colors.
 */
export interface EmitterAppearance {
	/** Characters to randomly pick from for spawned particles */
	chars: ReadonlyArray<number>;
	/** Start foreground color (packed RGBA) */
	startFg: number;
	/** End foreground color (packed RGBA, default: same as startFg) */
	endFg?: number;
	/** Whether particles should fade out (default: true) */
	fadeOut?: boolean;
}

// =============================================================================
// TYPES (tracked particle)
// =============================================================================

/**
 * Data stored per tracked particle in the packed store.
 * Associates a particle entity with the emitter that spawned it.
 *
 * @example
 * ```typescript
 * import { getParticleTrackingStore, getStoreData } from 'blecsd';
 *
 * const store = getParticleTrackingStore();
 * const data = getStoreData(store);
 * for (let i = 0; i < store.size; i++) {
 *   const entry = data[i];
 *   if (entry) console.log(entry.particleId, entry.emitterId);
 * }
 * ```
 */
export interface TrackedParticle {
	readonly particleId: number;
	readonly emitterId: number;
}

// =============================================================================
// SIDE STORES
// =============================================================================

/** Map of emitter entity ID to appearance config */
const emitterAppearances = new Map<number, EmitterAppearance>();

/** Packed store of all tracked particles (dense, cache-friendly iteration) */
let particleTrackingStore: PackedStore<TrackedParticle> = createPackedStore<TrackedParticle>(256);

/** Index from particle entity ID to its PackedHandle (for O(1) removal) */
const particleHandleIndex = new Map<number, PackedHandle>();

// =============================================================================
// PARTICLE HELPERS
// =============================================================================

function initParticle(eid: Entity): void {
	Particle.lifetime[eid] = 0;
	Particle.age[eid] = 0;
	Particle.fadeOut[eid] = 0;
	Particle.char[eid] = 0;
	Particle.startFg[eid] = 0;
	Particle.endFg[eid] = 0;
	Particle.emitter[eid] = 0;
}

/**
 * Sets particle data on an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param options - Particle configuration
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { setParticle, packColor } from 'blecsd';
 *
 * setParticle(world, entity, {
 *   lifetime: 1.5,
 *   char: '*'.codePointAt(0)!,
 *   startFg: packColor(255, 255, 0),
 *   endFg: packColor(255, 0, 0),
 *   fadeOut: true,
 * });
 * ```
 */
export function setParticle(world: World, eid: Entity, options: ParticleOptions): Entity {
	if (!hasComponent(world, eid, Particle)) {
		addComponent(world, eid, Particle);
		initParticle(eid);
	}

	Particle.lifetime[eid] = options.lifetime;
	Particle.age[eid] = 0;
	Particle.fadeOut[eid] = options.fadeOut ? 1 : 0;
	Particle.char[eid] = options.char;
	Particle.startFg[eid] = options.startFg;
	Particle.endFg[eid] = options.endFg ?? options.startFg;
	Particle.emitter[eid] = options.emitter ?? 0;

	return eid;
}

/**
 * Gets particle data for an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns ParticleData or undefined if not a particle
 */
export function getParticle(world: World, eid: Entity): ParticleData | undefined {
	if (!hasComponent(world, eid, Particle)) {
		return undefined;
	}
	return {
		lifetime: Particle.lifetime[eid] as number,
		age: Particle.age[eid] as number,
		fadeOut: (Particle.fadeOut[eid] as number) === 1,
		char: Particle.char[eid] as number,
		startFg: Particle.startFg[eid] as number,
		endFg: Particle.endFg[eid] as number,
		emitter: Particle.emitter[eid] as number,
	};
}

/**
 * Checks if an entity has a Particle component.
 */
export function hasParticle(world: World, eid: Entity): boolean {
	return hasComponent(world, eid, Particle);
}

/**
 * Removes the Particle component from an entity.
 */
export function removeParticle(world: World, eid: Entity): Entity {
	if (hasComponent(world, eid, Particle)) {
		// Remove from packed tracking store
		const handle = particleHandleIndex.get(eid);
		if (handle) {
			removeFromStore(particleTrackingStore, handle);
			particleHandleIndex.delete(eid);
		}
		removeComponent(world, eid, Particle);
	}
	return eid;
}

/**
 * Checks if a particle has exceeded its lifetime.
 */
export function isParticleDead(world: World, eid: Entity): boolean {
	if (!hasComponent(world, eid, Particle)) {
		return true;
	}
	return (Particle.age[eid] as number) >= (Particle.lifetime[eid] as number);
}

/**
 * Gets the normalized age of a particle (0-1).
 */
export function getParticleProgress(world: World, eid: Entity): number {
	if (!hasComponent(world, eid, Particle)) {
		return 1;
	}
	const lifetime = Particle.lifetime[eid] as number;
	if (lifetime <= 0) {
		return 1;
	}
	return Math.min(1, (Particle.age[eid] as number) / lifetime);
}

/**
 * Interpolates a color channel between start and end based on progress (0-1).
 */
function lerpChannel(start: number, end: number, t: number): number {
	return Math.round(start + (end - start) * t);
}

/**
 * Interpolates between two packed RGBA colors based on a 0-1 parameter.
 *
 * @param startColor - Start color (packed RGBA)
 * @param endColor - End color (packed RGBA)
 * @param t - Interpolation factor (0 = start, 1 = end)
 * @returns Interpolated packed RGBA color
 *
 * @example
 * ```typescript
 * import { interpolateColor, packColor } from 'blecsd';
 *
 * const red = packColor(255, 0, 0);
 * const blue = packColor(0, 0, 255);
 * const purple = interpolateColor(red, blue, 0.5);
 * ```
 */
export function interpolateColor(startColor: number, endColor: number, t: number): number {
	const clamped = Math.max(0, Math.min(1, t));

	const sr = (startColor >> 16) & 0xff;
	const sg = (startColor >> 8) & 0xff;
	const sb = startColor & 0xff;
	const sa = (startColor >> 24) & 0xff;

	const er = (endColor >> 16) & 0xff;
	const eg = (endColor >> 8) & 0xff;
	const eb = endColor & 0xff;
	const ea = (endColor >> 24) & 0xff;

	const r = lerpChannel(sr, er, clamped);
	const g = lerpChannel(sg, eg, clamped);
	const b = lerpChannel(sb, eb, clamped);
	const a = lerpChannel(sa, ea, clamped);

	return (((a & 0xff) << 24) | ((r & 0xff) << 16) | ((g & 0xff) << 8) | (b & 0xff)) >>> 0;
}

/**
 * Gets the current interpolated color of a particle based on its age.
 */
export function getParticleColor(world: World, eid: Entity): number {
	if (!hasComponent(world, eid, Particle)) {
		return 0;
	}
	const progress = getParticleProgress(world, eid);
	return interpolateColor(Particle.startFg[eid] as number, Particle.endFg[eid] as number, progress);
}

// =============================================================================
// EMITTER HELPERS
// =============================================================================

function initEmitter(eid: Entity): void {
	ParticleEmitter.rate[eid] = 0;
	ParticleEmitter.burstCount[eid] = 0;
	ParticleEmitter.lifetime[eid] = 1;
	ParticleEmitter.spread[eid] = Math.PI * 2;
	ParticleEmitter.speed[eid] = 3;
	ParticleEmitter.gravity[eid] = 0;
	ParticleEmitter.angle[eid] = 0;
	ParticleEmitter.active[eid] = 1;
	ParticleEmitter.accumulator[eid] = 0;
}

/**
 * Sets emitter data on an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param options - Emitter configuration
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { setEmitter } from 'blecsd';
 *
 * setEmitter(world, entity, {
 *   rate: 20,
 *   lifetime: 1,
 *   speed: 5,
 *   spread: Math.PI / 3,
 *   gravity: 9.8,
 * });
 * ```
 */
export function setEmitter(world: World, eid: Entity, options: EmitterOptions): Entity {
	if (!hasComponent(world, eid, ParticleEmitter)) {
		addComponent(world, eid, ParticleEmitter);
		initEmitter(eid);
	}

	ParticleEmitter.lifetime[eid] = options.lifetime;
	if (options.rate !== undefined) ParticleEmitter.rate[eid] = options.rate;
	if (options.burstCount !== undefined) ParticleEmitter.burstCount[eid] = options.burstCount;
	if (options.spread !== undefined) ParticleEmitter.spread[eid] = options.spread;
	if (options.speed !== undefined) ParticleEmitter.speed[eid] = options.speed;
	if (options.gravity !== undefined) ParticleEmitter.gravity[eid] = options.gravity;
	if (options.angle !== undefined) ParticleEmitter.angle[eid] = options.angle;
	if (options.active !== undefined) ParticleEmitter.active[eid] = options.active ? 1 : 0;

	return eid;
}

/**
 * Gets emitter data for an entity.
 */
export function getEmitter(world: World, eid: Entity): EmitterData | undefined {
	if (!hasComponent(world, eid, ParticleEmitter)) {
		return undefined;
	}
	return {
		rate: ParticleEmitter.rate[eid] as number,
		burstCount: ParticleEmitter.burstCount[eid] as number,
		lifetime: ParticleEmitter.lifetime[eid] as number,
		spread: ParticleEmitter.spread[eid] as number,
		speed: ParticleEmitter.speed[eid] as number,
		gravity: ParticleEmitter.gravity[eid] as number,
		angle: ParticleEmitter.angle[eid] as number,
		active: (ParticleEmitter.active[eid] as number) === 1,
	};
}

/**
 * Checks if an entity has a ParticleEmitter component.
 */
export function hasEmitter(world: World, eid: Entity): boolean {
	return hasComponent(world, eid, ParticleEmitter);
}

/**
 * Removes the ParticleEmitter component from an entity.
 */
export function removeEmitter(world: World, eid: Entity): Entity {
	if (hasComponent(world, eid, ParticleEmitter)) {
		removeComponent(world, eid, ParticleEmitter);
		emitterAppearances.delete(eid);

		// Remove all tracked particles belonging to this emitter from the store.
		// Collect handles first, then remove (swap-and-pop safe).
		const data = getStoreData(particleTrackingStore);
		const toRemove: Array<{ handle: PackedHandle; particleId: number }> = [];
		for (let i = 0; i < particleTrackingStore.size; i++) {
			const entry = data[i];
			if (entry && entry.emitterId === eid) {
				const handle = particleHandleIndex.get(entry.particleId);
				if (handle) {
					toRemove.push({ handle, particleId: entry.particleId });
				}
			}
		}
		for (const item of toRemove) {
			removeFromStore(particleTrackingStore, item.handle);
			particleHandleIndex.delete(item.particleId);
		}
	}
	return eid;
}

/**
 * Sets the visual appearance config for particles spawned by this emitter.
 *
 * @param eid - The emitter entity ID
 * @param appearance - Appearance configuration
 */
export function setEmitterAppearance(eid: Entity, appearance: EmitterAppearance): void {
	emitterAppearances.set(eid, appearance);
}

/**
 * Gets the appearance config for an emitter.
 */
export function getEmitterAppearance(eid: Entity): EmitterAppearance | undefined {
	return emitterAppearances.get(eid);
}

/**
 * Gets the set of particle entity IDs spawned by an emitter.
 *
 * Iterates the packed store's dense data array using a linear for-loop
 * and collects particles matching the given emitter.
 *
 * @param eid - The emitter entity ID
 * @returns ReadonlySet of particle entity IDs belonging to this emitter
 *
 * @example
 * ```typescript
 * import { getEmitterParticles } from 'blecsd';
 *
 * const particles = getEmitterParticles(emitterEntity);
 * for (const pid of particles) {
 *   console.log('tracked particle:', pid);
 * }
 * ```
 */
export function getEmitterParticles(eid: Entity): ReadonlySet<number> {
	const result = new Set<number>();
	const data = getStoreData(particleTrackingStore);
	for (let i = 0; i < particleTrackingStore.size; i++) {
		const entry = data[i];
		if (entry && entry.emitterId === eid) {
			result.add(entry.particleId);
		}
	}
	return result;
}

/**
 * Tracks a particle as belonging to an emitter.
 *
 * Adds the particle to the packed store and records the handle
 * in the index for O(1) removal later.
 *
 * @param emitterId - The emitter entity ID
 * @param particleId - The particle entity ID
 *
 * @example
 * ```typescript
 * import { trackParticle } from 'blecsd';
 *
 * trackParticle(emitterEntity, particleEntity);
 * ```
 */
export function trackParticle(emitterId: Entity, particleId: Entity): void {
	// Remove old entry if already tracked (prevent duplicates)
	const existing = particleHandleIndex.get(particleId);
	if (existing) {
		removeFromStore(particleTrackingStore, existing);
		particleHandleIndex.delete(particleId);
	}

	const handle = addToStore(particleTrackingStore, {
		particleId,
		emitterId,
	});
	particleHandleIndex.set(particleId, handle);
}

/**
 * Untracks a particle from its emitter.
 *
 * Removes the particle from the packed store using its handle.
 * The generation is bumped so any outstanding handles become invalid.
 *
 * @param _emitterId - The emitter entity ID (unused, kept for API compat)
 * @param particleId - The particle entity ID
 *
 * @example
 * ```typescript
 * import { untrackParticle } from 'blecsd';
 *
 * untrackParticle(emitterEntity, particleEntity);
 * ```
 */
export function untrackParticle(_emitterId: Entity, particleId: Entity): void {
	const handle = particleHandleIndex.get(particleId);
	if (handle) {
		removeFromStore(particleTrackingStore, handle);
		particleHandleIndex.delete(particleId);
	}
}

/**
 * Activates an emitter.
 */
export function activateEmitter(world: World, eid: Entity): void {
	if (hasComponent(world, eid, ParticleEmitter)) {
		ParticleEmitter.active[eid] = 1;
	}
}

/**
 * Pauses an emitter.
 */
export function pauseEmitter(world: World, eid: Entity): void {
	if (hasComponent(world, eid, ParticleEmitter)) {
		ParticleEmitter.active[eid] = 0;
	}
}

/**
 * Checks if an emitter is active.
 */
export function isEmitterActive(world: World, eid: Entity): boolean {
	if (!hasComponent(world, eid, ParticleEmitter)) {
		return false;
	}
	return (ParticleEmitter.active[eid] as number) === 1;
}

/**
 * Sets the emission rate (particles per second).
 */
export function setEmitterRate(world: World, eid: Entity, rate: number): void {
	if (hasComponent(world, eid, ParticleEmitter)) {
		ParticleEmitter.rate[eid] = rate;
	}
}

/**
 * Sets the emitter speed.
 */
export function setEmitterSpeed(world: World, eid: Entity, speed: number): void {
	if (hasComponent(world, eid, ParticleEmitter)) {
		ParticleEmitter.speed[eid] = speed;
	}
}

/**
 * Sets the emitter gravity.
 */
export function setEmitterGravity(world: World, eid: Entity, gravity: number): void {
	if (hasComponent(world, eid, ParticleEmitter)) {
		ParticleEmitter.gravity[eid] = gravity;
	}
}

/**
 * Returns the packed store used for particle tracking.
 *
 * The store's dense data array can be iterated with a linear for-loop
 * via `getStoreData()` for cache-friendly per-frame processing.
 *
 * @returns The packed store of tracked particles
 *
 * @example
 * ```typescript
 * import { getParticleTrackingStore, getStoreData } from 'blecsd';
 *
 * const store = getParticleTrackingStore();
 * const data = getStoreData(store);
 * for (let i = 0; i < store.size; i++) {
 *   const entry = data[i];
 *   if (entry) {
 *     // Process entry.particleId, entry.emitterId
 *   }
 * }
 * ```
 */
export function getParticleTrackingStore(): Readonly<PackedStore<TrackedParticle>> {
	return particleTrackingStore;
}

/**
 * Resets all particle/emitter side stores. Useful for testing.
 *
 * Creates a fresh PackedStore rather than clearing, to ensure
 * generation counters start at zero for clean test isolation.
 */
export function resetParticleStore(): void {
	emitterAppearances.clear();
	particleTrackingStore = createPackedStore<TrackedParticle>(256);
	particleHandleIndex.clear();
}
