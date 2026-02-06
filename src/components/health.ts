/**
 * Health/Resource component for game entities.
 *
 * Provides a generic resource pool (HP, mana, stamina, etc.) with
 * current/max values, regeneration, invulnerability, and damage/heal helpers.
 * Uses SoA (Structure of Arrays) for ECS performance.
 *
 * @module components/health
 */

import { addComponent, hasComponent, removeComponent } from '../core/ecs';
import type { Entity, World } from '../core/types';

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Health component store using SoA (Structure of Arrays) for performance.
 *
 * - `current`: Current resource value
 * - `max`: Maximum resource value
 * - `regen`: Regeneration per second
 * - `invulnerable`: 1 if currently invulnerable, 0 otherwise
 * - `invulnerableTime`: Remaining invulnerability time in seconds
 *
 * @example
 * ```typescript
 * import { Health, setHealth, getHealth, damage, heal } from 'blecsd';
 *
 * setHealth(world, entity, { current: 100, max: 100, regen: 1 });
 *
 * damage(world, entity, 30); // 70 HP remaining
 * heal(world, entity, 10);   // 80 HP remaining
 * ```
 */
export const Health = {
	/** Current resource value */
	current: new Float32Array(DEFAULT_CAPACITY),
	/** Maximum resource value */
	max: new Float32Array(DEFAULT_CAPACITY),
	/** Regeneration per second */
	regen: new Float32Array(DEFAULT_CAPACITY),
	/** 1 if invulnerable, 0 if not */
	invulnerable: new Uint8Array(DEFAULT_CAPACITY),
	/** Remaining invulnerability time in seconds */
	invulnerableTime: new Float32Array(DEFAULT_CAPACITY),
};

// =============================================================================
// TYPES
// =============================================================================

/**
 * Health component data returned by getHealth.
 */
export interface HealthData {
	readonly current: number;
	readonly max: number;
	readonly regen: number;
	readonly invulnerable: boolean;
	readonly invulnerableTime: number;
}

/**
 * Options for setting health on an entity.
 */
export interface HealthOptions {
	/** Current resource value (default: same as max) */
	current?: number;
	/** Maximum resource value */
	max: number;
	/** Regeneration per second (default: 0) */
	regen?: number;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Initializes Health component values to defaults.
 */
function initHealth(eid: Entity): void {
	Health.current[eid] = 0;
	Health.max[eid] = 0;
	Health.regen[eid] = 0;
	Health.invulnerable[eid] = 0;
	Health.invulnerableTime[eid] = 0;
}

/**
 * Sets health on an entity. Adds the Health component if not present.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param options - Health configuration
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { setHealth } from 'blecsd';
 *
 * // Full health
 * setHealth(world, entity, { max: 100 });
 *
 * // Partially damaged
 * setHealth(world, entity, { max: 100, current: 75, regen: 2 });
 * ```
 */
export function setHealth(world: World, eid: Entity, options: HealthOptions): Entity {
	if (!hasComponent(world, eid, Health)) {
		addComponent(world, eid, Health);
		initHealth(eid);
	}

	Health.max[eid] = options.max;
	Health.current[eid] = options.current ?? options.max;
	Health.regen[eid] = options.regen ?? 0;

	return eid;
}

/**
 * Gets the health data of an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns Health data or undefined if no Health component
 *
 * @example
 * ```typescript
 * import { getHealth } from 'blecsd';
 *
 * const hp = getHealth(world, entity);
 * if (hp) {
 *   console.log(`HP: ${hp.current}/${hp.max}`);
 * }
 * ```
 */
export function getHealth(world: World, eid: Entity): HealthData | undefined {
	if (!hasComponent(world, eid, Health)) {
		return undefined;
	}
	return {
		current: Health.current[eid] as number,
		max: Health.max[eid] as number,
		regen: Health.regen[eid] as number,
		invulnerable: (Health.invulnerable[eid] as number) === 1,
		invulnerableTime: Health.invulnerableTime[eid] as number,
	};
}

/**
 * Checks if an entity has a Health component.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if entity has Health
 */
export function hasHealth(world: World, eid: Entity): boolean {
	return hasComponent(world, eid, Health);
}

/**
 * Removes the Health component from an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns The entity ID for chaining
 */
export function removeHealth(world: World, eid: Entity): Entity {
	if (hasComponent(world, eid, Health)) {
		removeComponent(world, eid, Health);
	}
	return eid;
}

/**
 * Applies damage to an entity. Respects invulnerability.
 * Damage is clamped so current health cannot go below 0.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param amount - Amount of damage to apply (must be positive)
 * @returns true if the entity is now dead (current <= 0), false otherwise
 *
 * @example
 * ```typescript
 * import { damage, isDead } from 'blecsd';
 *
 * const killed = damage(world, entity, 50);
 * if (killed) {
 *   console.log('Entity was killed!');
 * }
 * ```
 */
export function damage(world: World, eid: Entity, amount: number): boolean {
	if (!hasComponent(world, eid, Health)) {
		return false;
	}

	if (amount <= 0) {
		return (Health.current[eid] as number) <= 0;
	}

	// Invulnerable entities take no damage
	if ((Health.invulnerable[eid] as number) === 1) {
		return false;
	}

	Health.current[eid] = Math.max(0, (Health.current[eid] as number) - amount);
	return (Health.current[eid] as number) <= 0;
}

/**
 * Heals an entity. Clamped to max health.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param amount - Amount to heal (must be positive)
 *
 * @example
 * ```typescript
 * import { heal } from 'blecsd';
 *
 * heal(world, entity, 25); // Restore 25 HP
 * ```
 */
export function heal(world: World, eid: Entity, amount: number): void {
	if (!hasComponent(world, eid, Health)) {
		return;
	}

	if (amount <= 0) {
		return;
	}

	Health.current[eid] = Math.min(
		Health.max[eid] as number,
		(Health.current[eid] as number) + amount,
	);
}

/**
 * Sets an entity as invulnerable for a duration.
 * While invulnerable, the entity takes no damage.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param duration - Duration in seconds (0 = permanent until cleared)
 *
 * @example
 * ```typescript
 * import { setInvulnerable } from 'blecsd';
 *
 * setInvulnerable(world, entity, 2.0); // 2 seconds of invulnerability
 * setInvulnerable(world, entity, 0);   // Permanent invulnerability
 * ```
 */
export function setInvulnerable(world: World, eid: Entity, duration: number): void {
	if (!hasComponent(world, eid, Health)) {
		return;
	}

	Health.invulnerable[eid] = 1;
	Health.invulnerableTime[eid] = duration;
}

/**
 * Clears invulnerability from an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 */
export function clearInvulnerable(world: World, eid: Entity): void {
	if (!hasComponent(world, eid, Health)) {
		return;
	}

	Health.invulnerable[eid] = 0;
	Health.invulnerableTime[eid] = 0;
}

/**
 * Checks if an entity is dead (current health <= 0).
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if dead, false if alive or no Health component
 *
 * @example
 * ```typescript
 * import { isDead } from 'blecsd';
 *
 * if (isDead(world, entity)) {
 *   console.log('Entity is dead');
 * }
 * ```
 */
export function isDead(world: World, eid: Entity): boolean {
	if (!hasComponent(world, eid, Health)) {
		return false;
	}
	return (Health.current[eid] as number) <= 0;
}

/**
 * Checks if an entity is currently invulnerable.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if invulnerable
 */
export function isInvulnerable(world: World, eid: Entity): boolean {
	if (!hasComponent(world, eid, Health)) {
		return false;
	}
	return (Health.invulnerable[eid] as number) === 1;
}

/**
 * Gets the health as a percentage (0-1).
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns Health percentage (0-1), or 0 if no Health component or max is 0
 *
 * @example
 * ```typescript
 * import { getHealthPercent } from 'blecsd';
 *
 * const percent = getHealthPercent(world, entity);
 * console.log(`HP: ${Math.round(percent * 100)}%`);
 * ```
 */
export function getHealthPercent(world: World, eid: Entity): number {
	if (!hasComponent(world, eid, Health)) {
		return 0;
	}

	const max = Health.max[eid] as number;
	if (max <= 0) {
		return 0;
	}

	return (Health.current[eid] as number) / max;
}

/**
 * Sets the current health directly, clamped to [0, max].
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param value - The new current health value
 */
export function setCurrentHealth(world: World, eid: Entity, value: number): void {
	if (!hasComponent(world, eid, Health)) {
		return;
	}
	Health.current[eid] = Math.max(0, Math.min(Health.max[eid] as number, value));
}

/**
 * Sets the max health. If current > new max, clamps current.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param max - The new maximum health value
 */
export function setMaxHealth(world: World, eid: Entity, max: number): void {
	if (!hasComponent(world, eid, Health)) {
		return;
	}
	Health.max[eid] = max;
	if ((Health.current[eid] as number) > max) {
		Health.current[eid] = max;
	}
}

/**
 * Sets the regeneration rate.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param regen - Regeneration per second
 */
export function setRegen(world: World, eid: Entity, regen: number): void {
	if (!hasComponent(world, eid, Health)) {
		return;
	}
	Health.regen[eid] = regen;
}

// =============================================================================
// HEALTH SYSTEM
// =============================================================================

/**
 * Updates health regeneration and invulnerability timers.
 * Call this each frame with the delta time.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param delta - Time elapsed in seconds
 *
 * @example
 * ```typescript
 * import { updateHealth, getDeltaTime } from 'blecsd';
 *
 * // In a system
 * const dt = getDeltaTime();
 * updateHealth(world, entity, dt);
 * ```
 */
export function updateHealth(world: World, eid: Entity, delta: number): void {
	if (!hasComponent(world, eid, Health)) {
		return;
	}

	// Update invulnerability timer
	if ((Health.invulnerable[eid] as number) === 1) {
		const remaining = Health.invulnerableTime[eid] as number;
		if (remaining > 0) {
			Health.invulnerableTime[eid] = remaining - delta;
			if ((Health.invulnerableTime[eid] as number) <= 0) {
				Health.invulnerable[eid] = 0;
				Health.invulnerableTime[eid] = 0;
			}
		}
		// If invulnerableTime was 0 (permanent), don't decrement
	}

	// Apply regeneration
	const regen = Health.regen[eid] as number;
	if (regen > 0 && (Health.current[eid] as number) < (Health.max[eid] as number)) {
		Health.current[eid] = Math.min(
			Health.max[eid] as number,
			(Health.current[eid] as number) + regen * delta,
		);
	}
}
