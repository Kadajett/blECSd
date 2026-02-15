import { beforeEach, describe, expect, it } from 'vitest';
import { addEntity, createWorld } from '../core/ecs';
import { getStoreData } from '../core/storage/packedStore';
import type { Entity, World } from '../core/types';
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
	Particle,
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
} from './particle';
import { packColor } from './renderable';

describe('Particle component', () => {
	let world: World;
	let eid: Entity;

	beforeEach(() => {
		world = createWorld();
		eid = addEntity(world);
		resetParticleStore();
	});

	describe('setParticle/getParticle', () => {
		it('sets and gets particle data', () => {
			setParticle(world, eid, {
				lifetime: 2,
				char: 0x2a,
				startFg: 0xffff0000,
				endFg: 0xff000000,
				fadeOut: true,
			});

			const data = getParticle(world, eid);
			expect(data).toBeDefined();
			expect(data?.lifetime).toBe(2);
			expect(data?.age).toBe(0);
			expect(data?.char).toBe(0x2a);
			expect(data?.startFg).toBe(0xffff0000);
			expect(data?.endFg).toBe(0xff000000);
			expect(data?.fadeOut).toBe(true);
		});

		it('defaults endFg to startFg when not specified', () => {
			setParticle(world, eid, {
				lifetime: 1,
				char: 0x2a,
				startFg: 0xffff0000,
			});

			const data = getParticle(world, eid);
			expect(data?.endFg).toBe(0xffff0000);
		});

		it('defaults fadeOut to false', () => {
			setParticle(world, eid, {
				lifetime: 1,
				char: 0x2a,
				startFg: 0xffff0000,
			});

			const data = getParticle(world, eid);
			expect(data?.fadeOut).toBe(false);
		});

		it('returns undefined for entity without particle', () => {
			expect(getParticle(world, eid)).toBeUndefined();
		});

		it('sets emitter reference', () => {
			const emitterId = addEntity(world);
			setParticle(world, eid, {
				lifetime: 1,
				char: 0x2a,
				startFg: 0xffff0000,
				emitter: emitterId,
			});

			expect(getParticle(world, eid)?.emitter).toBe(emitterId);
		});
	});

	describe('hasParticle', () => {
		it('returns false for entity without particle', () => {
			expect(hasParticle(world, eid)).toBe(false);
		});

		it('returns true for entity with particle', () => {
			setParticle(world, eid, { lifetime: 1, char: 0x2a, startFg: 0 });
			expect(hasParticle(world, eid)).toBe(true);
		});
	});

	describe('removeParticle', () => {
		it('removes particle component', () => {
			setParticle(world, eid, { lifetime: 1, char: 0x2a, startFg: 0 });
			removeParticle(world, eid);
			expect(hasParticle(world, eid)).toBe(false);
		});

		it('removes particle from emitter tracking', () => {
			const emitterId = addEntity(world);
			setParticle(world, eid, {
				lifetime: 1,
				char: 0x2a,
				startFg: 0,
				emitter: emitterId,
			});
			trackParticle(emitterId, eid);
			expect(getEmitterParticles(world, emitterId).has(eid)).toBe(true);

			removeParticle(world, eid);
			expect(getEmitterParticles(world, emitterId).has(eid)).toBe(false);
		});
	});

	describe('isParticleDead', () => {
		it('returns true when age exceeds lifetime', () => {
			setParticle(world, eid, { lifetime: 1, char: 0x2a, startFg: 0 });
			Particle.age[eid] = 1.5;
			expect(isParticleDead(world, eid)).toBe(true);
		});

		it('returns false when age is less than lifetime', () => {
			setParticle(world, eid, { lifetime: 2, char: 0x2a, startFg: 0 });
			Particle.age[eid] = 1;
			expect(isParticleDead(world, eid)).toBe(false);
		});

		it('returns true when age equals lifetime', () => {
			setParticle(world, eid, { lifetime: 1, char: 0x2a, startFg: 0 });
			Particle.age[eid] = 1;
			expect(isParticleDead(world, eid)).toBe(true);
		});

		it('returns true for entity without particle', () => {
			expect(isParticleDead(world, eid)).toBe(true);
		});
	});

	describe('getParticleProgress', () => {
		it('returns 0 at birth', () => {
			setParticle(world, eid, { lifetime: 2, char: 0x2a, startFg: 0 });
			expect(getParticleProgress(world, eid)).toBe(0);
		});

		it('returns 0.5 at half lifetime', () => {
			setParticle(world, eid, { lifetime: 2, char: 0x2a, startFg: 0 });
			Particle.age[eid] = 1;
			expect(getParticleProgress(world, eid)).toBe(0.5);
		});

		it('returns 1 at full lifetime', () => {
			setParticle(world, eid, { lifetime: 2, char: 0x2a, startFg: 0 });
			Particle.age[eid] = 2;
			expect(getParticleProgress(world, eid)).toBe(1);
		});

		it('clamps to 1 when exceeding lifetime', () => {
			setParticle(world, eid, { lifetime: 1, char: 0x2a, startFg: 0 });
			Particle.age[eid] = 5;
			expect(getParticleProgress(world, eid)).toBe(1);
		});

		it('returns 1 for zero lifetime', () => {
			setParticle(world, eid, { lifetime: 0, char: 0x2a, startFg: 0 });
			expect(getParticleProgress(world, eid)).toBe(1);
		});

		it('returns 1 for entity without particle', () => {
			expect(getParticleProgress(world, eid)).toBe(1);
		});
	});

	describe('interpolateColor', () => {
		it('returns start color at t=0', () => {
			const start = packColor(255, 0, 0);
			const end = packColor(0, 0, 255);
			expect(interpolateColor(start, end, 0)).toBe(start);
		});

		it('returns end color at t=1', () => {
			const start = packColor(255, 0, 0);
			const end = packColor(0, 0, 255);
			expect(interpolateColor(start, end, 1)).toBe(end);
		});

		it('interpolates channels at t=0.5', () => {
			const start = packColor(200, 0, 0);
			const end = packColor(0, 200, 0);
			const mid = interpolateColor(start, end, 0.5);

			const r = (mid >> 16) & 0xff;
			const g = (mid >> 8) & 0xff;
			expect(r).toBe(100);
			expect(g).toBe(100);
		});

		it('clamps t to 0-1 range', () => {
			const start = packColor(255, 0, 0);
			const end = packColor(0, 0, 255);
			expect(interpolateColor(start, end, -1)).toBe(start);
			expect(interpolateColor(start, end, 2)).toBe(end);
		});

		it('interpolates alpha channel', () => {
			const start = packColor(255, 0, 0, 255);
			const end = packColor(255, 0, 0, 0);
			const mid = interpolateColor(start, end, 0.5);
			const a = (mid >> 24) & 0xff;
			expect(a).toBe(128);
		});
	});

	describe('getParticleColor', () => {
		it('returns start color at age 0', () => {
			const startFg = packColor(255, 0, 0);
			const endFg = packColor(0, 0, 255);
			setParticle(world, eid, {
				lifetime: 2,
				char: 0x2a,
				startFg,
				endFg,
			});

			expect(getParticleColor(world, eid)).toBe(startFg);
		});

		it('returns end color at full age', () => {
			const startFg = packColor(255, 0, 0);
			const endFg = packColor(0, 0, 255);
			setParticle(world, eid, {
				lifetime: 2,
				char: 0x2a,
				startFg,
				endFg,
			});
			Particle.age[eid] = 2;

			expect(getParticleColor(world, eid)).toBe(endFg);
		});

		it('returns 0 for entity without particle', () => {
			expect(getParticleColor(world, eid)).toBe(0);
		});
	});
});

describe('ParticleEmitter component', () => {
	let world: World;
	let eid: Entity;

	beforeEach(() => {
		world = createWorld();
		eid = addEntity(world);
		resetParticleStore();
	});

	describe('setEmitter/getEmitter', () => {
		it('sets and gets emitter data', () => {
			setEmitter(world, eid, {
				rate: 10,
				lifetime: 2,
				speed: 5,
				spread: Math.PI / 4,
				gravity: 9.8,
				angle: Math.PI / 2,
			});

			const data = getEmitter(world, eid);
			expect(data).toBeDefined();
			expect(data?.rate).toBe(10);
			expect(data?.lifetime).toBe(2);
			expect(data?.speed).toBe(5);
			expect(data?.spread).toBeCloseTo(Math.PI / 4);
			expect(data?.gravity).toBeCloseTo(9.8);
			expect(data?.angle).toBeCloseTo(Math.PI / 2);
			expect(data?.active).toBe(true);
		});

		it('uses defaults for optional fields', () => {
			setEmitter(world, eid, { lifetime: 1 });

			const data = getEmitter(world, eid);
			expect(data?.rate).toBe(0);
			expect(data?.burstCount).toBe(0);
			expect(data?.spread).toBeCloseTo(Math.PI * 2);
			expect(data?.speed).toBe(3);
			expect(data?.gravity).toBe(0);
			expect(data?.angle).toBe(0);
			expect(data?.active).toBe(true);
		});

		it('returns undefined for entity without emitter', () => {
			expect(getEmitter(world, eid)).toBeUndefined();
		});
	});

	describe('hasEmitter', () => {
		it('returns false for entity without emitter', () => {
			expect(hasEmitter(world, eid)).toBe(false);
		});

		it('returns true for entity with emitter', () => {
			setEmitter(world, eid, { lifetime: 1 });
			expect(hasEmitter(world, eid)).toBe(true);
		});
	});

	describe('removeEmitter', () => {
		it('removes emitter component', () => {
			setEmitter(world, eid, { lifetime: 1 });
			removeEmitter(world, eid);
			expect(hasEmitter(world, eid)).toBe(false);
		});

		it('cleans up appearance and particle tracking', () => {
			setEmitter(world, eid, { lifetime: 1 });
			setEmitterAppearance(world, eid, { chars: [0x2a], startFg: 0 });
			trackParticle(eid, 99 as Entity);

			removeEmitter(world, eid);
			expect(getEmitterAppearance(world, eid)).toBeUndefined();
			expect(getEmitterParticles(world, eid).size).toBe(0);
		});
	});

	describe('emitter activation', () => {
		it('pauses and activates emitter', () => {
			setEmitter(world, eid, { lifetime: 1 });
			expect(isEmitterActive(world, eid)).toBe(true);

			pauseEmitter(world, eid);
			expect(isEmitterActive(world, eid)).toBe(false);

			activateEmitter(world, eid);
			expect(isEmitterActive(world, eid)).toBe(true);
		});

		it('returns false for entity without emitter', () => {
			expect(isEmitterActive(world, eid)).toBe(false);
		});
	});

	describe('emitter setters', () => {
		it('sets emission rate', () => {
			setEmitter(world, eid, { lifetime: 1 });
			setEmitterRate(world, eid, 20);
			expect(getEmitter(world, eid)?.rate).toBe(20);
		});

		it('sets speed', () => {
			setEmitter(world, eid, { lifetime: 1 });
			setEmitterSpeed(world, eid, 10);
			expect(getEmitter(world, eid)?.speed).toBe(10);
		});

		it('sets gravity', () => {
			setEmitter(world, eid, { lifetime: 1 });
			setEmitterGravity(world, eid, 5);
			expect(getEmitter(world, eid)?.gravity).toBe(5);
		});
	});

	describe('emitter appearance', () => {
		it('sets and gets appearance', () => {
			const appearance = { chars: [0x2a, 0x2e], startFg: 0xffff0000, fadeOut: true };
			setEmitterAppearance(world, eid, appearance);
			expect(getEmitterAppearance(world, eid)).toEqual(appearance);
		});

		it('returns undefined when not set', () => {
			expect(getEmitterAppearance(world, eid)).toBeUndefined();
		});
	});

	describe('particle tracking', () => {
		it('tracks and untracks particles', () => {
			const p1 = addEntity(world);
			const p2 = addEntity(world);

			trackParticle(eid, p1);
			trackParticle(eid, p2);

			const particles = getEmitterParticles(world, eid);
			expect(particles.size).toBe(2);
			expect(particles.has(p1)).toBe(true);
			expect(particles.has(p2)).toBe(true);

			untrackParticle(eid, p1);
			expect(getEmitterParticles(world, eid).size).toBe(1);
			expect(getEmitterParticles(world, eid).has(p1)).toBe(false);
		});

		it('returns empty set for entity without tracked particles', () => {
			expect(getEmitterParticles(world, eid).size).toBe(0);
		});

		it('getParticleTrackingStore exposes dense data for iteration', () => {
			const p1 = addEntity(world);
			const p2 = addEntity(world);

			trackParticle(eid, p1);
			trackParticle(eid, p2);

			const store = getParticleTrackingStore();
			expect(store.size).toBe(2);

			const data = getStoreData(store);
			const ids = new Set<number>();
			for (let i = 0; i < store.size; i++) {
				const entry = data[i];
				if (entry) ids.add(entry.particleId);
			}
			expect(ids.has(p1)).toBe(true);
			expect(ids.has(p2)).toBe(true);
		});

		it('generation-based handles invalidate after removal', () => {
			const p1 = addEntity(world);
			const p2 = addEntity(world);

			trackParticle(eid, p1);
			trackParticle(eid, p2);
			expect(getEmitterParticles(world, eid).size).toBe(2);

			// Remove p1, then add a new particle to reuse the slot
			untrackParticle(eid, p1);
			expect(getEmitterParticles(world, eid).size).toBe(1);

			// Add a new particle that may reuse the freed slot
			const p3 = addEntity(world);
			trackParticle(eid, p3);
			expect(getEmitterParticles(world, eid).size).toBe(2);
			expect(getEmitterParticles(world, eid).has(p3)).toBe(true);
			expect(getEmitterParticles(world, eid).has(p1)).toBe(false);
		});

		it('tracks particles from multiple emitters independently', () => {
			const emitter2 = addEntity(world);
			const p1 = addEntity(world);
			const p2 = addEntity(world);

			trackParticle(eid, p1);
			trackParticle(emitter2, p2);

			expect(getEmitterParticles(world, eid).size).toBe(1);
			expect(getEmitterParticles(world, eid).has(p1)).toBe(true);
			expect(getEmitterParticles(world, emitter2).size).toBe(1);
			expect(getEmitterParticles(world, emitter2).has(p2)).toBe(true);
		});
	});
});
