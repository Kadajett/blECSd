/**
 * Health component namespace.
 *
 * Provides all operations for entity health, damage, and healing.
 *
 * @example
 * ```typescript
 * import { health } from 'blecsd/components';
 * health.set(world, eid, { current: 100, max: 100 });
 * health.damage(world, eid, 25);
 * if (health.isDead(world, eid)) { ... }
 * ```
 */
import {
	clearInvulnerable,
	damage,
	getHealth,
	getHealthPercent,
	hasHealth,
	heal,
	isDead,
	isInvulnerable,
	removeHealth,
	setCurrentHealth,
	setHealth,
	setInvulnerable,
	setMaxHealth,
	setRegen,
	updateHealth,
} from '../health';

export const health = Object.freeze({
	get: getHealth,
	has: hasHealth,
	set: setHealth,
	remove: removeHealth,

	damage,
	heal,
	isDead,
	getPercent: getHealthPercent,

	setCurrent: setCurrentHealth,
	setMax: setMaxHealth,
	setRegen,
	update: updateHealth,

	isInvulnerable,
	setInvulnerable,
	clearInvulnerable,
});

export type HealthModule = typeof health;
