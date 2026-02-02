import { addEntity, createWorld } from 'bitecs';
import { beforeEach, describe, expect, it } from 'vitest';
import type { World } from '../core/types';
import { Position, setPosition } from './position';
import {
	Acceleration,
	addVelocity,
	applyAccelerationToEntity,
	applyFrictionToEntity,
	applyVelocityToEntity,
	clampSpeedForEntity,
	clearAcceleration,
	getAcceleration,
	getSpeed,
	getVelocity,
	hasAcceleration,
	hasVelocity,
	removeAcceleration,
	removeVelocity,
	setAcceleration,
	setFriction,
	setMaxSpeed,
	setVelocity,
	setVelocityOptions,
	stopEntity,
	updateEntityMovement,
	Velocity,
} from './velocity';

describe('velocity', () => {
	let world: World;

	beforeEach(() => {
		world = createWorld();
	});

	describe('Velocity component', () => {
		it('has typed arrays for all fields', () => {
			expect(Velocity.x).toBeInstanceOf(Float32Array);
			expect(Velocity.y).toBeInstanceOf(Float32Array);
			expect(Velocity.maxSpeed).toBeInstanceOf(Float32Array);
			expect(Velocity.friction).toBeInstanceOf(Float32Array);
		});
	});

	describe('setVelocity', () => {
		it('sets velocity values', () => {
			const eid = addEntity(world);

			setVelocity(world, eid, 5, -3);

			expect(Velocity.x[eid]).toBe(5);
			expect(Velocity.y[eid]).toBe(-3);
		});

		it('adds Velocity component if missing', () => {
			const eid = addEntity(world);
			expect(hasVelocity(world, eid)).toBe(false);

			setVelocity(world, eid, 1, 1);

			expect(hasVelocity(world, eid)).toBe(true);
		});

		it('returns entity for chaining', () => {
			const eid = addEntity(world);
			expect(setVelocity(world, eid, 0, 0)).toBe(eid);
		});
	});

	describe('setVelocityOptions', () => {
		it('sets all velocity options', () => {
			const eid = addEntity(world);

			setVelocityOptions(world, eid, {
				x: 5,
				y: -2,
				maxSpeed: 10,
				friction: 0.1,
			});

			expect(Velocity.x[eid]).toBe(5);
			expect(Velocity.y[eid]).toBe(-2);
			expect(Velocity.maxSpeed[eid]).toBe(10);
			expect(Velocity.friction[eid]).toBeCloseTo(0.1);
		});

		it('only sets provided options', () => {
			const eid = addEntity(world);
			setVelocityOptions(world, eid, { x: 1, y: 1 });

			setVelocityOptions(world, eid, { maxSpeed: 5 });

			expect(Velocity.x[eid]).toBe(1);
			expect(Velocity.y[eid]).toBe(1);
			expect(Velocity.maxSpeed[eid]).toBe(5);
		});
	});

	describe('getVelocity', () => {
		it('returns velocity data', () => {
			const eid = addEntity(world);
			setVelocityOptions(world, eid, {
				x: 3,
				y: 4,
				maxSpeed: 10,
				friction: 0.2,
			});

			const vel = getVelocity(world, eid);

			expect(vel).toBeDefined();
			expect(vel?.x).toBe(3);
			expect(vel?.y).toBe(4);
			expect(vel?.maxSpeed).toBe(10);
			expect(vel?.friction).toBeCloseTo(0.2);
		});

		it('returns undefined for entity without velocity', () => {
			const eid = addEntity(world);
			expect(getVelocity(world, eid)).toBeUndefined();
		});
	});

	describe('hasVelocity', () => {
		it('returns true for entity with velocity', () => {
			const eid = addEntity(world);
			setVelocity(world, eid, 0, 0);

			expect(hasVelocity(world, eid)).toBe(true);
		});

		it('returns false for entity without velocity', () => {
			const eid = addEntity(world);
			expect(hasVelocity(world, eid)).toBe(false);
		});
	});

	describe('setMaxSpeed', () => {
		it('sets max speed', () => {
			const eid = addEntity(world);

			setMaxSpeed(world, eid, 15);

			expect(Velocity.maxSpeed[eid]).toBe(15);
		});

		it('adds Velocity component if missing', () => {
			const eid = addEntity(world);

			setMaxSpeed(world, eid, 10);

			expect(hasVelocity(world, eid)).toBe(true);
		});
	});

	describe('setFriction', () => {
		it('sets friction', () => {
			const eid = addEntity(world);

			setFriction(world, eid, 0.5);

			expect(Velocity.friction[eid]).toBeCloseTo(0.5);
		});

		it('clamps friction to 0-1 range', () => {
			const eid = addEntity(world);

			setFriction(world, eid, -0.5);
			expect(Velocity.friction[eid]).toBe(0);

			setFriction(world, eid, 1.5);
			expect(Velocity.friction[eid]).toBe(1);
		});
	});

	describe('addVelocity', () => {
		it('adds to current velocity', () => {
			const eid = addEntity(world);
			setVelocity(world, eid, 5, 5);

			addVelocity(world, eid, 2, -3);

			expect(Velocity.x[eid]).toBe(7);
			expect(Velocity.y[eid]).toBe(2);
		});

		it('works on entity without velocity', () => {
			const eid = addEntity(world);

			addVelocity(world, eid, 1, 2);

			expect(Velocity.x[eid]).toBe(1);
			expect(Velocity.y[eid]).toBe(2);
		});
	});

	describe('getSpeed', () => {
		it('calculates speed magnitude', () => {
			const eid = addEntity(world);
			setVelocity(world, eid, 3, 4);

			expect(getSpeed(world, eid)).toBe(5); // 3-4-5 triangle
		});

		it('returns 0 for entity without velocity', () => {
			const eid = addEntity(world);
			expect(getSpeed(world, eid)).toBe(0);
		});
	});

	describe('stopEntity', () => {
		it('sets velocity to zero', () => {
			const eid = addEntity(world);
			setVelocity(world, eid, 10, 10);

			stopEntity(world, eid);

			expect(Velocity.x[eid]).toBe(0);
			expect(Velocity.y[eid]).toBe(0);
		});

		it('returns entity for chaining', () => {
			const eid = addEntity(world);
			setVelocity(world, eid, 1, 1);

			expect(stopEntity(world, eid)).toBe(eid);
		});
	});

	describe('removeVelocity', () => {
		it('clears all velocity data', () => {
			const eid = addEntity(world);
			setVelocityOptions(world, eid, {
				x: 5,
				y: 5,
				maxSpeed: 10,
				friction: 0.5,
			});

			removeVelocity(world, eid);

			expect(Velocity.x[eid]).toBe(0);
			expect(Velocity.y[eid]).toBe(0);
			expect(Velocity.maxSpeed[eid]).toBe(0);
			expect(Velocity.friction[eid]).toBe(0);
		});
	});

	describe('Acceleration component', () => {
		it('has typed arrays for all fields', () => {
			expect(Acceleration.x).toBeInstanceOf(Float32Array);
			expect(Acceleration.y).toBeInstanceOf(Float32Array);
		});
	});

	describe('setAcceleration', () => {
		it('sets acceleration values', () => {
			const eid = addEntity(world);

			setAcceleration(world, eid, 0, 9.8);

			expect(Acceleration.x[eid]).toBe(0);
			expect(Acceleration.y[eid]).toBeCloseTo(9.8);
		});

		it('returns entity for chaining', () => {
			const eid = addEntity(world);
			expect(setAcceleration(world, eid, 0, 0)).toBe(eid);
		});
	});

	describe('getAcceleration', () => {
		it('returns acceleration data', () => {
			const eid = addEntity(world);
			setAcceleration(world, eid, 1, 2);

			const accel = getAcceleration(world, eid);

			expect(accel).toEqual({ x: 1, y: 2 });
		});

		it('returns undefined for entity without acceleration', () => {
			const eid = addEntity(world);
			expect(getAcceleration(world, eid)).toBeUndefined();
		});
	});

	describe('hasAcceleration', () => {
		it('returns true for entity with acceleration', () => {
			const eid = addEntity(world);
			setAcceleration(world, eid, 0, 0);

			expect(hasAcceleration(world, eid)).toBe(true);
		});

		it('returns false for entity without acceleration', () => {
			const eid = addEntity(world);
			expect(hasAcceleration(world, eid)).toBe(false);
		});
	});

	describe('clearAcceleration', () => {
		it('sets acceleration to zero', () => {
			const eid = addEntity(world);
			setAcceleration(world, eid, 5, 10);

			clearAcceleration(world, eid);

			expect(Acceleration.x[eid]).toBe(0);
			expect(Acceleration.y[eid]).toBe(0);
		});
	});

	describe('removeAcceleration', () => {
		it('clears acceleration data', () => {
			const eid = addEntity(world);
			setAcceleration(world, eid, 5, 5);

			removeAcceleration(world, eid);

			expect(Acceleration.x[eid]).toBe(0);
			expect(Acceleration.y[eid]).toBe(0);
		});
	});

	describe('applyAccelerationToEntity', () => {
		it('applies acceleration to velocity', () => {
			const eid = addEntity(world);
			setVelocity(world, eid, 0, 0);
			setAcceleration(world, eid, 10, 20);

			applyAccelerationToEntity(eid, 0.1);

			expect(Velocity.x[eid]).toBeCloseTo(1); // 10 * 0.1
			expect(Velocity.y[eid]).toBeCloseTo(2); // 20 * 0.1
		});

		it('accumulates over time', () => {
			const eid = addEntity(world);
			setVelocity(world, eid, 5, 5);
			setAcceleration(world, eid, 10, 10);

			applyAccelerationToEntity(eid, 0.1);
			applyAccelerationToEntity(eid, 0.1);

			expect(Velocity.x[eid]).toBeCloseTo(7); // 5 + 1 + 1
			expect(Velocity.y[eid]).toBeCloseTo(7);
		});
	});

	describe('applyFrictionToEntity', () => {
		it('reduces velocity over time', () => {
			const eid = addEntity(world);
			setVelocityOptions(world, eid, { x: 10, y: 10, friction: 0.5 });

			applyFrictionToEntity(eid, 0.1);

			expect(Velocity.x[eid]).toBeLessThan(10);
			expect(Velocity.y[eid]).toBeLessThan(10);
		});

		it('does nothing with zero friction', () => {
			const eid = addEntity(world);
			setVelocityOptions(world, eid, { x: 10, y: 10, friction: 0 });

			applyFrictionToEntity(eid, 0.1);

			expect(Velocity.x[eid]).toBe(10);
			expect(Velocity.y[eid]).toBe(10);
		});

		it('stops entity with high friction', () => {
			const eid = addEntity(world);
			setVelocityOptions(world, eid, { x: 10, y: 10, friction: 1 });

			// With friction=1, should stop after 1 second
			applyFrictionToEntity(eid, 1);

			expect(Velocity.x[eid]).toBe(0);
			expect(Velocity.y[eid]).toBe(0);
		});
	});

	describe('clampSpeedForEntity', () => {
		it('clamps velocity to max speed', () => {
			const eid = addEntity(world);
			setVelocityOptions(world, eid, { x: 30, y: 40, maxSpeed: 25 });

			clampSpeedForEntity(eid);

			const speed = getSpeed(world, eid);
			expect(speed).toBeCloseTo(25);
		});

		it('preserves direction when clamping', () => {
			const eid = addEntity(world);
			setVelocityOptions(world, eid, { x: 30, y: 40, maxSpeed: 25 });

			clampSpeedForEntity(eid);

			// Should maintain 3:4 ratio
			const ratio = (Velocity.x[eid] as number) / (Velocity.y[eid] as number);
			expect(ratio).toBeCloseTo(30 / 40);
		});

		it('does nothing when under max speed', () => {
			const eid = addEntity(world);
			setVelocityOptions(world, eid, { x: 3, y: 4, maxSpeed: 100 });

			clampSpeedForEntity(eid);

			expect(Velocity.x[eid]).toBe(3);
			expect(Velocity.y[eid]).toBe(4);
		});

		it('does nothing with unlimited speed', () => {
			const eid = addEntity(world);
			setVelocityOptions(world, eid, { x: 1000, y: 1000, maxSpeed: 0 });

			clampSpeedForEntity(eid);

			expect(Velocity.x[eid]).toBe(1000);
			expect(Velocity.y[eid]).toBe(1000);
		});
	});

	describe('applyVelocityToEntity', () => {
		it('updates position based on velocity', () => {
			const eid = addEntity(world);
			setPosition(world, eid, 10, 10);
			setVelocity(world, eid, 5, -5);

			applyVelocityToEntity(eid, 0.1);

			expect(Position.x[eid]).toBeCloseTo(10.5); // 10 + 5*0.1
			expect(Position.y[eid]).toBeCloseTo(9.5); // 10 + (-5)*0.1
		});
	});

	describe('updateEntityMovement', () => {
		it('applies full movement cycle', () => {
			const eid = addEntity(world);
			setPosition(world, eid, 0, 0);
			setVelocityOptions(world, eid, { x: 0, y: 0 });
			setAcceleration(world, eid, 100, 0);

			updateEntityMovement(world, eid, 0.1);

			expect(Velocity.x[eid]).toBeCloseTo(10); // 100 * 0.1
			expect(Position.x[eid]).toBeCloseTo(1); // 10 * 0.1
		});

		it('applies friction after acceleration', () => {
			const eid = addEntity(world);
			setPosition(world, eid, 0, 0);
			setVelocityOptions(world, eid, { x: 10, y: 0, friction: 0.5 });

			updateEntityMovement(world, eid, 0.1);

			expect(Velocity.x[eid]).toBeLessThan(10);
		});

		it('clamps speed', () => {
			const eid = addEntity(world);
			setPosition(world, eid, 0, 0);
			setVelocityOptions(world, eid, { x: 0, y: 0, maxSpeed: 5 });
			setAcceleration(world, eid, 1000, 0);

			updateEntityMovement(world, eid, 1);

			const speed = getSpeed(world, eid);
			expect(speed).toBeCloseTo(5);
		});

		it('does nothing for entity without velocity', () => {
			const eid = addEntity(world);
			setPosition(world, eid, 10, 10);

			updateEntityMovement(world, eid, 0.1);

			expect(Position.x[eid]).toBe(10);
			expect(Position.y[eid]).toBe(10);
		});
	});

	describe('physics simulation', () => {
		it('simulates projectile with gravity', () => {
			const eid = addEntity(world);
			setPosition(world, eid, 0, 100);
			setVelocity(world, eid, 10, 0); // Moving right
			setAcceleration(world, eid, 0, 10); // Gravity down

			// Simulate 1 second in 0.1s steps
			for (let i = 0; i < 10; i++) {
				updateEntityMovement(world, eid, 0.1);
			}

			// Should have moved right
			expect(Position.x[eid]).toBeGreaterThan(0);
			// Should have fallen (y increased with gravity down)
			expect(Position.y[eid]).toBeGreaterThan(100);
		});

		it('simulates friction slowdown', () => {
			const eid = addEntity(world);
			setPosition(world, eid, 0, 0);
			setVelocityOptions(world, eid, { x: 100, y: 0, friction: 0.9 });

			const initialSpeed = getSpeed(world, eid);

			// Simulate some time
			for (let i = 0; i < 50; i++) {
				updateEntityMovement(world, eid, 0.1);
			}

			const finalSpeed = getSpeed(world, eid);
			expect(finalSpeed).toBeLessThan(initialSpeed * 0.01); // Should be nearly stopped
		});
	});
});
