/**
 * Tests for the Health/Resource component.
 * @module components/health.test
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { addEntity, createWorld } from '../core/ecs';
import type { Entity, World } from '../core/types';
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
} from './health';

describe('health', () => {
	let world: World;
	let eid: Entity;

	beforeEach(() => {
		world = createWorld();
		eid = addEntity(world);
	});

	// =========================================================================
	// setHealth / getHealth / hasHealth / removeHealth
	// =========================================================================

	describe('setHealth', () => {
		it('adds health component and sets values', () => {
			setHealth(world, eid, { max: 100 });
			const hp = getHealth(world, eid);
			expect(hp).toBeDefined();
			expect(hp?.current).toBe(100);
			expect(hp?.max).toBe(100);
			expect(hp?.regen).toBe(0);
		});

		it('defaults current to max', () => {
			setHealth(world, eid, { max: 50 });
			expect(getHealth(world, eid)?.current).toBe(50);
		});

		it('allows setting current separately', () => {
			setHealth(world, eid, { max: 100, current: 75 });
			expect(getHealth(world, eid)?.current).toBe(75);
		});

		it('sets regen rate', () => {
			setHealth(world, eid, { max: 100, regen: 5 });
			expect(getHealth(world, eid)?.regen).toBe(5);
		});

		it('returns entity ID for chaining', () => {
			const result = setHealth(world, eid, { max: 100 });
			expect(result).toBe(eid);
		});
	});

	describe('getHealth', () => {
		it('returns undefined without Health component', () => {
			expect(getHealth(world, eid)).toBeUndefined();
		});

		it('includes invulnerability state', () => {
			setHealth(world, eid, { max: 100 });
			setInvulnerable(world, eid, 2);
			const hp = getHealth(world, eid);
			expect(hp?.invulnerable).toBe(true);
			expect(hp?.invulnerableTime).toBe(2);
		});
	});

	describe('hasHealth', () => {
		it('returns false without component', () => {
			expect(hasHealth(world, eid)).toBe(false);
		});

		it('returns true with component', () => {
			setHealth(world, eid, { max: 100 });
			expect(hasHealth(world, eid)).toBe(true);
		});
	});

	describe('removeHealth', () => {
		it('removes the Health component', () => {
			setHealth(world, eid, { max: 100 });
			removeHealth(world, eid);
			expect(hasHealth(world, eid)).toBe(false);
		});

		it('returns entity ID', () => {
			const result = removeHealth(world, eid);
			expect(result).toBe(eid);
		});

		it('is safe on entities without Health', () => {
			expect(() => removeHealth(world, eid)).not.toThrow();
		});
	});

	// =========================================================================
	// damage
	// =========================================================================

	describe('damage', () => {
		it('reduces current health', () => {
			setHealth(world, eid, { max: 100 });
			damage(world, eid, 30);
			expect(getHealth(world, eid)?.current).toBe(70);
		});

		it('returns true when entity is killed', () => {
			setHealth(world, eid, { max: 100 });
			const killed = damage(world, eid, 100);
			expect(killed).toBe(true);
		});

		it('returns false when entity survives', () => {
			setHealth(world, eid, { max: 100 });
			const killed = damage(world, eid, 50);
			expect(killed).toBe(false);
		});

		it('clamps health to 0', () => {
			setHealth(world, eid, { max: 100 });
			damage(world, eid, 200);
			expect(getHealth(world, eid)?.current).toBe(0);
		});

		it('does not damage invulnerable entities', () => {
			setHealth(world, eid, { max: 100 });
			setInvulnerable(world, eid, 5);
			const killed = damage(world, eid, 100);
			expect(killed).toBe(false);
			expect(getHealth(world, eid)?.current).toBe(100);
		});

		it('returns false without Health component', () => {
			expect(damage(world, eid, 10)).toBe(false);
		});

		it('handles zero damage', () => {
			setHealth(world, eid, { max: 100 });
			damage(world, eid, 0);
			expect(getHealth(world, eid)?.current).toBe(100);
		});

		it('handles negative damage', () => {
			setHealth(world, eid, { max: 100, current: 50 });
			damage(world, eid, -10);
			expect(getHealth(world, eid)?.current).toBe(50);
		});

		it('returns true for already dead entity with positive damage', () => {
			setHealth(world, eid, { max: 100, current: 0 });
			const killed = damage(world, eid, 10);
			expect(killed).toBe(true);
		});
	});

	// =========================================================================
	// heal
	// =========================================================================

	describe('heal', () => {
		it('increases current health', () => {
			setHealth(world, eid, { max: 100, current: 50 });
			heal(world, eid, 20);
			expect(getHealth(world, eid)?.current).toBe(70);
		});

		it('clamps to max', () => {
			setHealth(world, eid, { max: 100, current: 90 });
			heal(world, eid, 50);
			expect(getHealth(world, eid)?.current).toBe(100);
		});

		it('does nothing without Health component', () => {
			expect(() => heal(world, eid, 10)).not.toThrow();
		});

		it('ignores zero heal', () => {
			setHealth(world, eid, { max: 100, current: 50 });
			heal(world, eid, 0);
			expect(getHealth(world, eid)?.current).toBe(50);
		});

		it('ignores negative heal', () => {
			setHealth(world, eid, { max: 100, current: 50 });
			heal(world, eid, -10);
			expect(getHealth(world, eid)?.current).toBe(50);
		});

		it('can heal dead entities', () => {
			setHealth(world, eid, { max: 100, current: 0 });
			heal(world, eid, 30);
			expect(getHealth(world, eid)?.current).toBe(30);
			expect(isDead(world, eid)).toBe(false);
		});
	});

	// =========================================================================
	// Invulnerability
	// =========================================================================

	describe('setInvulnerable / clearInvulnerable / isInvulnerable', () => {
		it('sets invulnerability with duration', () => {
			setHealth(world, eid, { max: 100 });
			setInvulnerable(world, eid, 3);
			expect(isInvulnerable(world, eid)).toBe(true);
			expect(getHealth(world, eid)?.invulnerableTime).toBe(3);
		});

		it('sets permanent invulnerability with 0', () => {
			setHealth(world, eid, { max: 100 });
			setInvulnerable(world, eid, 0);
			expect(isInvulnerable(world, eid)).toBe(true);
		});

		it('clears invulnerability', () => {
			setHealth(world, eid, { max: 100 });
			setInvulnerable(world, eid, 5);
			clearInvulnerable(world, eid);
			expect(isInvulnerable(world, eid)).toBe(false);
		});

		it('isInvulnerable returns false without Health', () => {
			expect(isInvulnerable(world, eid)).toBe(false);
		});

		it('does nothing without Health component', () => {
			expect(() => setInvulnerable(world, eid, 5)).not.toThrow();
			expect(() => clearInvulnerable(world, eid)).not.toThrow();
		});
	});

	// =========================================================================
	// isDead / getHealthPercent
	// =========================================================================

	describe('isDead', () => {
		it('returns true when health is 0', () => {
			setHealth(world, eid, { max: 100, current: 0 });
			expect(isDead(world, eid)).toBe(true);
		});

		it('returns false when health is above 0', () => {
			setHealth(world, eid, { max: 100, current: 1 });
			expect(isDead(world, eid)).toBe(false);
		});

		it('returns false without Health component', () => {
			expect(isDead(world, eid)).toBe(false);
		});
	});

	describe('getHealthPercent', () => {
		it('returns 1 at full health', () => {
			setHealth(world, eid, { max: 100 });
			expect(getHealthPercent(world, eid)).toBe(1);
		});

		it('returns 0.5 at half health', () => {
			setHealth(world, eid, { max: 100, current: 50 });
			expect(getHealthPercent(world, eid)).toBe(0.5);
		});

		it('returns 0 when dead', () => {
			setHealth(world, eid, { max: 100, current: 0 });
			expect(getHealthPercent(world, eid)).toBe(0);
		});

		it('returns 0 without Health component', () => {
			expect(getHealthPercent(world, eid)).toBe(0);
		});

		it('returns 0 with max of 0', () => {
			setHealth(world, eid, { max: 0 });
			expect(getHealthPercent(world, eid)).toBe(0);
		});
	});

	// =========================================================================
	// setCurrentHealth / setMaxHealth / setRegen
	// =========================================================================

	describe('setCurrentHealth', () => {
		it('sets current health clamped to max', () => {
			setHealth(world, eid, { max: 100 });
			setCurrentHealth(world, eid, 50);
			expect(getHealth(world, eid)?.current).toBe(50);
		});

		it('clamps to max', () => {
			setHealth(world, eid, { max: 100 });
			setCurrentHealth(world, eid, 200);
			expect(getHealth(world, eid)?.current).toBe(100);
		});

		it('clamps to 0', () => {
			setHealth(world, eid, { max: 100 });
			setCurrentHealth(world, eid, -50);
			expect(getHealth(world, eid)?.current).toBe(0);
		});

		it('does nothing without Health', () => {
			expect(() => setCurrentHealth(world, eid, 50)).not.toThrow();
		});
	});

	describe('setMaxHealth', () => {
		it('updates max health', () => {
			setHealth(world, eid, { max: 100 });
			setMaxHealth(world, eid, 200);
			expect(getHealth(world, eid)?.max).toBe(200);
		});

		it('clamps current if over new max', () => {
			setHealth(world, eid, { max: 100 });
			setMaxHealth(world, eid, 50);
			expect(getHealth(world, eid)?.current).toBe(50);
		});

		it('does not affect current if under new max', () => {
			setHealth(world, eid, { max: 100, current: 30 });
			setMaxHealth(world, eid, 50);
			expect(getHealth(world, eid)?.current).toBe(30);
		});
	});

	describe('setRegen', () => {
		it('updates regen rate', () => {
			setHealth(world, eid, { max: 100 });
			setRegen(world, eid, 10);
			expect(getHealth(world, eid)?.regen).toBe(10);
		});
	});

	// =========================================================================
	// updateHealth (regeneration and invulnerability timer)
	// =========================================================================

	describe('updateHealth', () => {
		it('regenerates health over time', () => {
			setHealth(world, eid, { max: 100, current: 50, regen: 10 });
			updateHealth(world, eid, 1);
			expect(getHealth(world, eid)?.current).toBe(60);
		});

		it('clamps regen to max', () => {
			setHealth(world, eid, { max: 100, current: 95, regen: 10 });
			updateHealth(world, eid, 1);
			expect(getHealth(world, eid)?.current).toBe(100);
		});

		it('does not regen at full health', () => {
			setHealth(world, eid, { max: 100, regen: 10 });
			updateHealth(world, eid, 1);
			expect(getHealth(world, eid)?.current).toBe(100);
		});

		it('does not regen with 0 regen', () => {
			setHealth(world, eid, { max: 100, current: 50 });
			updateHealth(world, eid, 1);
			expect(getHealth(world, eid)?.current).toBe(50);
		});

		it('decrements invulnerability timer', () => {
			setHealth(world, eid, { max: 100 });
			setInvulnerable(world, eid, 2);
			updateHealth(world, eid, 0.5);
			expect(getHealth(world, eid)?.invulnerableTime).toBeCloseTo(1.5);
			expect(isInvulnerable(world, eid)).toBe(true);
		});

		it('clears invulnerability when timer expires', () => {
			setHealth(world, eid, { max: 100 });
			setInvulnerable(world, eid, 1);
			updateHealth(world, eid, 1.5);
			expect(isInvulnerable(world, eid)).toBe(false);
		});

		it('does not decrement permanent invulnerability', () => {
			setHealth(world, eid, { max: 100 });
			setInvulnerable(world, eid, 0); // permanent
			updateHealth(world, eid, 10);
			expect(isInvulnerable(world, eid)).toBe(true);
		});

		it('does nothing without Health component', () => {
			expect(() => updateHealth(world, eid, 1)).not.toThrow();
		});

		it('handles fractional delta times', () => {
			setHealth(world, eid, { max: 100, current: 50, regen: 20 });
			updateHealth(world, eid, 0.016);
			expect(getHealth(world, eid)?.current).toBeCloseTo(50.32, 2);
		});
	});

	// =========================================================================
	// Multi-resource usage (same component, different entities)
	// =========================================================================

	describe('multi-resource', () => {
		it('can use Health for different resource types', () => {
			const hpEntity = addEntity(world);
			const manaEntity = addEntity(world);
			const staminaEntity = addEntity(world);

			setHealth(world, hpEntity, { max: 100, regen: 1 });
			setHealth(world, manaEntity, { max: 200, regen: 5 });
			setHealth(world, staminaEntity, { max: 50, regen: 10 });

			damage(world, hpEntity, 30);
			damage(world, manaEntity, 50);
			damage(world, staminaEntity, 20);

			expect(getHealth(world, hpEntity)?.current).toBe(70);
			expect(getHealth(world, manaEntity)?.current).toBe(150);
			expect(getHealth(world, staminaEntity)?.current).toBe(30);
		});
	});
});
