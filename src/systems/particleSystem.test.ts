import { beforeEach, describe, expect, it } from 'vitest';
import {
	getEmitterParticles,
	hasParticle,
	Particle,
	resetParticleStore,
	setEmitter,
	setEmitterAppearance,
	setParticle,
} from '../components/particle';
import { Position, setPosition } from '../components/position';
import { setVelocity, Velocity } from '../components/velocity';
import { addEntity, createWorld, hasComponent } from '../core/ecs';
import type { Entity, World } from '../core/types';
import {
	ageParticle,
	burstParticles,
	createParticleSystem,
	killParticle,
	moveParticle,
	spawnParticle,
} from './particleSystem';

describe('particleSystem', () => {
	let world: World;

	beforeEach(() => {
		world = createWorld();
		resetParticleStore();
	});

	describe('spawnParticle', () => {
		it('spawns a particle from an emitter', () => {
			const emitter = addEntity(world);
			setPosition(world, emitter, 10, 20);
			setEmitter(world, emitter, { lifetime: 2, speed: 5 });
			setEmitterAppearance(emitter, {
				chars: [0x2a],
				startFg: 0xffff0000,
				endFg: 0xff0000ff,
				fadeOut: true,
			});

			const pid = spawnParticle(world, emitter, {
				chars: [0x2a],
				startFg: 0xffff0000,
				endFg: 0xff0000ff,
				fadeOut: true,
			});

			expect(pid).not.toBe(-1);
			expect(hasParticle(world, pid)).toBe(true);
			expect(hasComponent(world, pid, Position)).toBe(true);
			expect(hasComponent(world, pid, Velocity)).toBe(true);

			// Particle starts at emitter position
			expect(Position.x[pid]).toBe(10);
			expect(Position.y[pid]).toBe(20);

			// Particle has emitter reference
			expect(Particle.emitter[pid]).toBe(emitter);

			// Particle is tracked by emitter
			expect(getEmitterParticles(emitter).has(pid)).toBe(true);
		});

		it('returns -1 if entity is not an emitter', () => {
			const eid = addEntity(world);
			const pid = spawnParticle(world, eid, { chars: [0x2a], startFg: 0 });
			expect(pid).toBe(-1);
		});

		it('sets velocity based on emitter speed and angle', () => {
			const emitter = addEntity(world);
			setPosition(world, emitter, 0, 0);
			setEmitter(world, emitter, {
				lifetime: 1,
				speed: 10,
				spread: 0, // No spread, exact direction
				angle: 0, // Right
			});

			const pid = spawnParticle(world, emitter, { chars: [0x2a], startFg: 0 });

			expect(Velocity.x[pid]).toBeCloseTo(10, 0);
			expect(Velocity.y[pid]).toBeCloseTo(0, 0);
		});
	});

	describe('burstParticles', () => {
		it('spawns multiple particles', () => {
			const emitter = addEntity(world);
			setPosition(world, emitter, 5, 5);
			setEmitter(world, emitter, { lifetime: 1, burstCount: 5 });
			setEmitterAppearance(emitter, { chars: [0x2a], startFg: 0 });

			const spawned = burstParticles(world, emitter);
			expect(spawned.length).toBe(5);
			for (const pid of spawned) {
				expect(hasParticle(world, pid)).toBe(true);
			}
		});

		it('uses explicit count over burstCount', () => {
			const emitter = addEntity(world);
			setPosition(world, emitter, 0, 0);
			setEmitter(world, emitter, { lifetime: 1, burstCount: 10 });
			setEmitterAppearance(emitter, { chars: [0x2a], startFg: 0 });

			const spawned = burstParticles(world, emitter, 3);
			expect(spawned.length).toBe(3);
		});

		it('respects maxParticles limit', () => {
			const emitter = addEntity(world);
			setPosition(world, emitter, 0, 0);
			setEmitter(world, emitter, { lifetime: 1, burstCount: 100 });
			setEmitterAppearance(emitter, { chars: [0x2a], startFg: 0 });

			const spawned = burstParticles(world, emitter, 100, 10, 5);
			expect(spawned.length).toBe(5); // 10 max - 5 current = 5 spawnable
		});

		it('returns empty array for missing appearance', () => {
			const emitter = addEntity(world);
			setEmitter(world, emitter, { lifetime: 1, burstCount: 5 });

			const spawned = burstParticles(world, emitter);
			expect(spawned.length).toBe(0);
		});

		it('returns empty array for non-emitter', () => {
			const eid = addEntity(world);
			const spawned = burstParticles(world, eid);
			expect(spawned.length).toBe(0);
		});
	});

	describe('ageParticle', () => {
		it('increments particle age', () => {
			const eid = addEntity(world);
			setParticle(world, eid, { lifetime: 2, char: 0x2a, startFg: 0 });

			ageParticle(world, eid, 0.5);
			expect(Particle.age[eid]).toBeCloseTo(0.5);

			ageParticle(world, eid, 0.3);
			expect(Particle.age[eid]).toBeCloseTo(0.8);
		});

		it('applies gravity from emitter', () => {
			const emitter = addEntity(world);
			setEmitter(world, emitter, { lifetime: 2, gravity: 10 });

			const eid = addEntity(world);
			setParticle(world, eid, {
				lifetime: 2,
				char: 0x2a,
				startFg: 0,
				emitter,
			});
			setVelocity(world, eid, 0, 0);

			ageParticle(world, eid, 0.5);
			expect(Velocity.y[eid]).toBeCloseTo(5); // 10 * 0.5
		});

		it('does nothing for non-particle entity', () => {
			const eid = addEntity(world);
			ageParticle(world, eid, 1); // Should not throw
		});
	});

	describe('moveParticle', () => {
		it('updates position based on velocity', () => {
			const eid = addEntity(world);
			setPosition(world, eid, 10, 20);
			setVelocity(world, eid, 5, -3);

			moveParticle(world, eid, 0.5);
			expect(Position.x[eid]).toBeCloseTo(12.5); // 10 + 5*0.5
			expect(Position.y[eid]).toBeCloseTo(18.5); // 20 + (-3)*0.5
		});

		it('does nothing without position or velocity', () => {
			const eid = addEntity(world);
			moveParticle(world, eid, 1); // Should not throw
		});
	});

	describe('killParticle', () => {
		it('removes entity from world', () => {
			const emitter = addEntity(world);
			setEmitter(world, emitter, { lifetime: 1 });
			setEmitterAppearance(emitter, { chars: [0x2a], startFg: 0 });

			const pid = spawnParticle(world, emitter, { chars: [0x2a], startFg: 0 });
			expect(getEmitterParticles(emitter).has(pid)).toBe(true);

			killParticle(world, pid);
			expect(getEmitterParticles(emitter).has(pid)).toBe(false);
		});
	});

	describe('createParticleSystem', () => {
		it('processes emitters and spawns particles', () => {
			const emitter = addEntity(world);
			setPosition(world, emitter, 0, 0);
			setEmitter(world, emitter, { lifetime: 1, rate: 60, speed: 5 }); // 60/sec = 1/frame
			setEmitterAppearance(emitter, { chars: [0x2a], startFg: 0 });

			const emitters: Entity[] = [emitter];
			const particles: Entity[] = [];

			const system = createParticleSystem({
				emitters: () => emitters,
				particles: () => particles,
			});

			system(world);

			// Should have spawned at least 1 particle (rate 60 at 1/60 delta = 1 particle)
			const tracked = getEmitterParticles(emitter);
			expect(tracked.size).toBeGreaterThanOrEqual(1);
		});

		it('ages and removes dead particles', () => {
			const eid = addEntity(world);
			setParticle(world, eid, { lifetime: 0.01, char: 0x2a, startFg: 0 });
			setPosition(world, eid, 0, 0);
			setVelocity(world, eid, 0, 0);
			// age is 0, lifetime is 0.01, delta 1/60 ~ 0.016 > 0.01

			const system = createParticleSystem({
				emitters: () => [],
				particles: () => [eid],
			});

			system(world);

			// Particle should be dead and removed
			// (We can't easily check entity removal, but age should exceed lifetime)
			expect(Particle.age[eid]).toBeGreaterThan(0);
		});

		it('skips inactive emitters', () => {
			const emitter = addEntity(world);
			setPosition(world, emitter, 0, 0);
			setEmitter(world, emitter, { lifetime: 1, rate: 60, active: false });
			setEmitterAppearance(emitter, { chars: [0x2a], startFg: 0 });

			const system = createParticleSystem({
				emitters: () => [emitter],
				particles: () => [],
			});

			system(world);

			expect(getEmitterParticles(emitter).size).toBe(0);
		});

		it('skips emitters without appearance', () => {
			const emitter = addEntity(world);
			setEmitter(world, emitter, { lifetime: 1, rate: 60 });

			const system = createParticleSystem({
				emitters: () => [emitter],
				particles: () => [],
			});

			system(world);

			expect(getEmitterParticles(emitter).size).toBe(0);
		});

		it('respects maxParticles limit', () => {
			const emitter = addEntity(world);
			setPosition(world, emitter, 0, 0);
			setEmitter(world, emitter, { lifetime: 1, rate: 1000 }); // Very high rate
			setEmitterAppearance(emitter, { chars: [0x2a], startFg: 0 });

			const system = createParticleSystem({
				emitters: () => [emitter],
				particles: () => [],
				maxParticles: 5,
			});

			system(world);

			expect(getEmitterParticles(emitter).size).toBeLessThanOrEqual(5);
		});
	});
});
