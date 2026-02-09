/**
 * Animation System Performance Benchmarks
 *
 * Measures animation system performance across different scenarios:
 * - Velocity/position updates for varying entity counts
 * - Spring physics simulation
 * - Smooth scroll performance (momentum scrolling with friction)
 * - Particle system updates
 * - PackedStore-backed vs Map-backed animation data comparison
 *
 * These benchmarks help identify animation bottlenecks and validate
 * optimization strategies for real-time animation systems.
 */

import { describe, bench } from 'vitest';

describe('Animation: Velocity/Position Updates', () => {
	bench('velocity update (100 entities)', () => {
		const { createWorld } = require('../src/core/world');
		const { addEntity } = require('../src/core/ecs');
		const { setPosition } = require('../src/components/position');
		const { setVelocity } = require('../src/components/velocity');
		const { movementSystem } = require('../src/systems/movementSystem');

		const world = createWorld();

		// Create 100 entities with velocity
		for (let i = 0; i < 100; i++) {
			const eid = addEntity(world);
			setPosition(world, eid, i, i);
			setVelocity(world, eid, Math.random() * 10 - 5, Math.random() * 10 - 5);
		}

		// Update movement (simulate 16ms frame)
		movementSystem(world, 0.016);
	});

	bench('velocity update (1000 entities)', () => {
		const { createWorld } = require('../src/core/world');
		const { addEntity } = require('../src/core/ecs');
		const { setPosition } = require('../src/components/position');
		const { setVelocity } = require('../src/components/velocity');
		const { movementSystem } = require('../src/systems/movementSystem');

		const world = createWorld();

		// Create 1000 entities with velocity
		for (let i = 0; i < 1000; i++) {
			const eid = addEntity(world);
			setPosition(world, eid, i % 100, Math.floor(i / 100));
			setVelocity(world, eid, Math.random() * 10 - 5, Math.random() * 10 - 5);
		}

		// Update movement
		movementSystem(world, 0.016);
	});

	bench('velocity update (5000 entities)', () => {
		const { createWorld } = require('../src/core/world');
		const { addEntity } = require('../src/core/ecs');
		const { setPosition } = require('../src/components/position');
		const { setVelocity } = require('../src/components/velocity');
		const { movementSystem } = require('../src/systems/movementSystem');

		const world = createWorld();

		// Create 5000 entities with velocity
		for (let i = 0; i < 5000; i++) {
			const eid = addEntity(world);
			setPosition(world, eid, i % 100, Math.floor(i / 100));
			setVelocity(world, eid, Math.random() * 10 - 5, Math.random() * 10 - 5);
		}

		// Update movement
		movementSystem(world, 0.016);
	});

	bench('velocity + acceleration (1000 entities)', () => {
		const { createWorld } = require('../src/core/world');
		const { addEntity } = require('../src/core/ecs');
		const { setPosition } = require('../src/components/position');
		const { setVelocity } = require('../src/components/velocity');
		const { setAcceleration } = require('../src/components/velocity');
		const { movementSystem } = require('../src/systems/movementSystem');

		const world = createWorld();

		// Create 1000 entities with velocity and acceleration
		for (let i = 0; i < 1000; i++) {
			const eid = addEntity(world);
			setPosition(world, eid, i % 100, Math.floor(i / 100));
			setVelocity(world, eid, Math.random() * 5, Math.random() * 5);
			setAcceleration(world, eid, 0, 9.8); // Gravity
		}

		// Update movement
		movementSystem(world, 0.016);
	});

	bench('velocity + friction (1000 entities)', () => {
		const { createWorld } = require('../src/core/world');
		const { addEntity } = require('../src/core/ecs');
		const { setPosition } = require('../src/components/position');
		const { setVelocityOptions } = require('../src/components/velocity');
		const { movementSystem } = require('../src/systems/movementSystem');

		const world = createWorld();

		// Create 1000 entities with velocity and friction
		for (let i = 0; i < 1000; i++) {
			const eid = addEntity(world);
			setPosition(world, eid, i % 100, Math.floor(i / 100));
			setVelocityOptions(world, eid, {
				x: Math.random() * 10,
				y: Math.random() * 10,
				friction: 0.1,
			});
		}

		// Update movement
		movementSystem(world, 0.016);
	});

	bench('velocity + max speed clamping (1000 entities)', () => {
		const { createWorld } = require('../src/core/world');
		const { addEntity } = require('../src/core/ecs');
		const { setPosition } = require('../src/components/position');
		const { setVelocityOptions } = require('../src/components/velocity');
		const { movementSystem } = require('../src/systems/movementSystem');

		const world = createWorld();

		// Create 1000 entities with velocity and max speed
		for (let i = 0; i < 1000; i++) {
			const eid = addEntity(world);
			setPosition(world, eid, i % 100, Math.floor(i / 100));
			setVelocityOptions(world, eid, {
				x: Math.random() * 20,
				y: Math.random() * 20,
				maxSpeed: 10,
			});
		}

		// Update movement
		movementSystem(world, 0.016);
	});
});

describe('Animation: Spring Physics', () => {
	bench('spring damping (100 springs)', () => {
		// Simulate spring physics using velocity and acceleration
		const { createWorld } = require('../src/core/world');
		const { addEntity } = require('../src/core/ecs');
		const { setPosition } = require('../src/components/position');
		const { setVelocity, setAcceleration } = require('../src/components/velocity');

		const world = createWorld();
		const springs: Array<{ eid: number; targetY: number }> = [];

		// Create 100 spring entities
		for (let i = 0; i < 100; i++) {
			const eid = addEntity(world);
			setPosition(world, eid, i, 50); // Start at y=50
			setVelocity(world, eid, 0, 0);

			springs.push({ eid, targetY: 10 }); // Spring towards y=10
		}

		// Simulate spring forces (stiffness=0.1, damping=0.8)
		const stiffness = 0.1;
		const damping = 0.8;
		const { Position, Velocity } = require('../src/components/position');
		const { Velocity: VelocityComp } = require('../src/components/velocity');

		for (const spring of springs) {
			const eid = spring.eid;
			const currentY = Position.y[eid] as number;
			const currentVy = VelocityComp.y[eid] as number;

			// Spring force: F = -k * displacement - damping * velocity
			const displacement = currentY - spring.targetY;
			const force = -stiffness * displacement - damping * currentVy;

			// Apply force as acceleration
			setAcceleration(world, eid, 0, force);
		}

		// Update all entities
		const { movementSystem } = require('../src/systems/movementSystem');
		movementSystem(world, 0.016);
	});

	bench('spring with different stiffness (100 springs)', () => {
		const { createWorld } = require('../src/core/world');
		const { addEntity } = require('../src/core/ecs');
		const { setPosition } = require('../src/components/position');
		const { setVelocity, setAcceleration } = require('../src/components/velocity');

		const world = createWorld();
		const springs: Array<{ eid: number; targetY: number; stiffness: number }> = [];

		// Create 100 springs with varying stiffness
		for (let i = 0; i < 100; i++) {
			const eid = addEntity(world);
			setPosition(world, eid, i, 50);
			setVelocity(world, eid, 0, 0);

			springs.push({
				eid,
				targetY: 10,
				stiffness: 0.05 + (i / 100) * 0.2, // 0.05 to 0.25
			});
		}

		const damping = 0.8;
		const { Position } = require('../src/components/position');
		const { Velocity } = require('../src/components/velocity');

		for (const spring of springs) {
			const eid = spring.eid;
			const currentY = Position.y[eid] as number;
			const currentVy = Velocity.y[eid] as number;

			const displacement = currentY - spring.targetY;
			const force = -spring.stiffness * displacement - damping * currentVy;

			setAcceleration(world, eid, 0, force);
		}

		const { movementSystem } = require('../src/systems/movementSystem');
		movementSystem(world, 0.016);
	});
});

describe('Animation: Smooth Scroll', () => {
	bench('smooth scroll momentum (10 entities)', () => {
		const { createWorld } = require('../src/core/world');
		const { addEntity } = require('../src/core/ecs');
		const { createSmoothScroll } = require('../src/systems/smoothScroll');

		const world = createWorld();

		// Create 10 scrollable entities
		for (let i = 0; i < 10; i++) {
			const eid = addEntity(world);
			const scroll = createSmoothScroll(world, eid, {
				contentWidth: 1000,
				contentHeight: 1000,
				viewportWidth: 80,
				viewportHeight: 24,
			});

			// Apply some momentum
			scroll.applyVelocity(0, -50);
		}

		// Update smooth scroll system
		const { smoothScrollSystem } = require('../src/systems/smoothScroll');
		smoothScrollSystem(world, 0.016);
	});

	bench('smooth scroll with friction (10 entities)', () => {
		const { createWorld } = require('../src/core/world');
		const { addEntity } = require('../src/core/ecs');
		const { createSmoothScroll } = require('../src/systems/smoothScroll');

		const world = createWorld();

		// Create 10 scrollable entities with custom physics
		for (let i = 0; i < 10; i++) {
			const eid = addEntity(world);
			const scroll = createSmoothScroll(world, eid, {
				contentWidth: 1000,
				contentHeight: 1000,
				viewportWidth: 80,
				viewportHeight: 24,
				physics: {
					friction: 0.92,
					minVelocity: 0.1,
					maxVelocity: 200,
					sensitivity: 1,
					springStiffness: 0.3,
					springDamping: 0.8,
					maxOverscroll: 50,
					enableMomentum: true,
					enableBounce: true,
				},
			});

			scroll.applyVelocity(0, -50);
		}

		const { smoothScrollSystem } = require('../src/systems/smoothScroll');
		smoothScrollSystem(world, 0.016);
	});

	bench('smooth scroll overscroll bounce (10 entities)', () => {
		const { createWorld } = require('../src/core/world');
		const { addEntity } = require('../src/core/ecs');
		const { createSmoothScroll } = require('../src/systems/smoothScroll');

		const world = createWorld();

		// Create 10 scrollable entities at boundary
		for (let i = 0; i < 10; i++) {
			const eid = addEntity(world);
			const scroll = createSmoothScroll(world, eid, {
				contentWidth: 1000,
				contentHeight: 1000,
				viewportWidth: 80,
				viewportHeight: 24,
			});

			// Scroll past boundary to trigger bounce
			scroll.scrollTo(0, -100);
			scroll.applyVelocity(0, -30);
		}

		const { smoothScrollSystem } = require('../src/systems/smoothScroll');
		smoothScrollSystem(world, 0.016);
	});
});

describe('Animation: Particle System', () => {
	bench('particle update (100 particles)', () => {
		const { createWorld } = require('../src/core/world');
		const { addEntity } = require('../src/core/ecs');
		const { setPosition } = require('../src/components/position');
		const { setVelocity } = require('../src/components/velocity');
		const { setParticle } = require('../src/components/particle');
		const { particleSystem } = require('../src/systems/particleSystem');

		const world = createWorld();

		// Create 100 particles
		for (let i = 0; i < 100; i++) {
			const eid = addEntity(world);
			setPosition(world, eid, 40, 12);
			setVelocity(world, eid, Math.random() * 10 - 5, Math.random() * 10 - 5);
			setParticle(world, eid, {
				lifetime: 2,
				char: '*'.codePointAt(0) ?? 42,
				startFg: 0xffffff00,
				endFg: 0xff880000,
				fadeOut: true,
			});
		}

		// Update particles
		particleSystem(world, 0.016);
	});

	bench('particle update (1000 particles)', () => {
		const { createWorld } = require('../src/core/world');
		const { addEntity } = require('../src/core/ecs');
		const { setPosition } = require('../src/components/position');
		const { setVelocity } = require('../src/components/velocity');
		const { setParticle } = require('../src/components/particle');
		const { particleSystem } = require('../src/systems/particleSystem');

		const world = createWorld();

		// Create 1000 particles
		for (let i = 0; i < 1000; i++) {
			const eid = addEntity(world);
			setPosition(world, eid, 40 + (i % 80), 12 + Math.floor(i / 80));
			setVelocity(world, eid, Math.random() * 10 - 5, Math.random() * 10 - 5);
			setParticle(world, eid, {
				lifetime: 2,
				char: '*'.codePointAt(0) ?? 42,
				startFg: 0xffffff00,
				endFg: 0xff880000,
				fadeOut: true,
			});
		}

		// Update particles
		particleSystem(world, 0.016);
	});

	bench('particle with gravity (500 particles)', () => {
		const { createWorld } = require('../src/core/world');
		const { addEntity } = require('../src/core/ecs');
		const { setPosition } = require('../src/components/position');
		const { setVelocity, setAcceleration } = require('../src/components/velocity');
		const { setParticle } = require('../src/components/particle');
		const { particleSystem } = require('../src/systems/particleSystem');
		const { movementSystem } = require('../src/systems/movementSystem');

		const world = createWorld();

		// Create 500 particles with gravity
		for (let i = 0; i < 500; i++) {
			const eid = addEntity(world);
			setPosition(world, eid, 40, 12);
			setVelocity(world, eid, Math.random() * 10 - 5, Math.random() * -10);
			setAcceleration(world, eid, 0, 20); // Gravity
			setParticle(world, eid, {
				lifetime: 2,
				char: '*'.codePointAt(0) ?? 42,
				startFg: 0xffffff00,
				endFg: 0xff880000,
				fadeOut: true,
			});
		}

		// Update movement and particles
		movementSystem(world, 0.016);
		particleSystem(world, 0.016);
	});

	bench('particle emitter burst (50 particles)', () => {
		const { createWorld } = require('../src/core/world');
		const { addEntity } = require('../src/core/ecs');
		const { setPosition } = require('../src/components/position');
		const { setEmitter, burstParticles } = require('../src/components/particle');
		const { particleSystem } = require('../src/systems/particleSystem');

		const world = createWorld();

		// Create emitter
		const emitter = addEntity(world);
		setPosition(world, emitter, 40, 12);
		setEmitter(world, emitter, {
			rate: 0,
			burstCount: 50,
			lifetime: 2,
			speed: 10,
			spread: Math.PI * 2,
			gravity: 20,
			angle: 0,
		});

		// Emit burst
		burstParticles(world, emitter, 50);

		// Update particles
		particleSystem(world, 0.016);
	});
});

describe('Animation: PackedStore vs Map', () => {
	interface AnimationData {
		progress: number;
		duration: number;
		startValue: number;
		endValue: number;
	}

	bench('PackedStore animation data (100 animations)', () => {
		const { createPackedStore, addToStore } = require('../src/core/storage/packedStore');

		const store = createPackedStore<AnimationData>();
		const handles: any[] = [];

		// Add 100 animations
		for (let i = 0; i < 100; i++) {
			const handle = addToStore(store, {
				progress: 0,
				duration: 1,
				startValue: 0,
				endValue: 100,
			});
			handles.push(handle);
		}

		// Update all animations (simulate lerp)
		const data = store.data;
		for (let i = 0; i < store.size; i++) {
			const anim = data[i];
			if (anim) {
				anim.progress += 0.016 / anim.duration;
				if (anim.progress > 1) anim.progress = 1;
			}
		}
	});

	bench('Map animation data (100 animations)', () => {
		const map = new Map<number, AnimationData>();

		// Add 100 animations
		for (let i = 0; i < 100; i++) {
			map.set(i, {
				progress: 0,
				duration: 1,
				startValue: 0,
				endValue: 100,
			});
		}

		// Update all animations
		for (const [id, anim] of map) {
			anim.progress += 0.016 / anim.duration;
			if (anim.progress > 1) anim.progress = 1;
		}
	});

	bench('PackedStore animation data (1000 animations)', () => {
		const { createPackedStore, addToStore } = require('../src/core/storage/packedStore');

		const store = createPackedStore<AnimationData>();
		const handles: any[] = [];

		// Add 1000 animations
		for (let i = 0; i < 1000; i++) {
			const handle = addToStore(store, {
				progress: 0,
				duration: 1,
				startValue: 0,
				endValue: 100,
			});
			handles.push(handle);
		}

		// Update all animations
		const data = store.data;
		for (let i = 0; i < store.size; i++) {
			const anim = data[i];
			if (anim) {
				anim.progress += 0.016 / anim.duration;
				if (anim.progress > 1) anim.progress = 1;
			}
		}
	});

	bench('Map animation data (1000 animations)', () => {
		const map = new Map<number, AnimationData>();

		// Add 1000 animations
		for (let i = 0; i < 1000; i++) {
			map.set(i, {
				progress: 0,
				duration: 1,
				startValue: 0,
				endValue: 100,
			});
		}

		// Update all animations
		for (const [id, anim] of map) {
			anim.progress += 0.016 / anim.duration;
			if (anim.progress > 1) anim.progress = 1;
		}
	});

	bench('PackedStore with easing calculation (1000 animations)', () => {
		const { createPackedStore, addToStore } = require('../src/core/storage/packedStore');

		const store = createPackedStore<AnimationData>();
		const handles: any[] = [];

		// Add 1000 animations
		for (let i = 0; i < 1000; i++) {
			const handle = addToStore(store, {
				progress: 0,
				duration: 1,
				startValue: 0,
				endValue: 100,
			});
			handles.push(handle);
		}

		// Easing function (ease-in-out cubic)
		const easeInOutCubic = (t: number): number => {
			return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
		};

		// Update all animations with easing
		const data = store.data;
		for (let i = 0; i < store.size; i++) {
			const anim = data[i];
			if (anim) {
				anim.progress += 0.016 / anim.duration;
				if (anim.progress > 1) anim.progress = 1;

				// Apply easing and calculate current value
				const easedProgress = easeInOutCubic(anim.progress);
				const currentValue = anim.startValue + (anim.endValue - anim.startValue) * easedProgress;
			}
		}
	});

	bench('Map with easing calculation (1000 animations)', () => {
		const map = new Map<number, AnimationData>();

		// Add 1000 animations
		for (let i = 0; i < 1000; i++) {
			map.set(i, {
				progress: 0,
				duration: 1,
				startValue: 0,
				endValue: 100,
			});
		}

		// Easing function (ease-in-out cubic)
		const easeInOutCubic = (t: number): number => {
			return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
		};

		// Update all animations with easing
		for (const [id, anim] of map) {
			anim.progress += 0.016 / anim.duration;
			if (anim.progress > 1) anim.progress = 1;

			// Apply easing and calculate current value
			const easedProgress = easeInOutCubic(anim.progress);
			const currentValue = anim.startValue + (anim.endValue - anim.startValue) * easedProgress;
		}
	});
});
