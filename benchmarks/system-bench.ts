#!/usr/bin/env npx tsx
/**
 * System Performance Benchmark
 *
 * Measures real system performance for particles, collision detection,
 * widget rendering, spatial hashing, and mixed workloads.
 */

import { addComponent, addEntity, query } from '../src/core/ecs';
import type { Entity, World } from '../src/core/types';
import { createWorld } from '../src/core/world';

import { setCollider, Collider } from '../src/components/collision';
import { attachListBehavior, renderListItems } from '../src/components/list';
import {
	type EmitterAppearance,
	Particle,
	ParticleEmitter,
	setEmitter,
	setEmitterAppearance,
	setParticle,
} from '../src/components/particle';
import { Position, setPosition } from '../src/components/position';
import { Velocity, setVelocity } from '../src/components/velocity';

import {
	detectCollisions,
	resetCollisionState,
} from '../src/systems/collisionSystem';
import {
	ageParticle,
	createParticleSystem,
	killParticle,
	moveParticle,
	spawnParticle,
} from '../src/systems/particleSystem';
import {
	clearSpatialHash,
	createSpatialHash,
	insertEntity as insertSpatialEntity,
	queryArea,
	rebuildSpatialHash,
} from '../src/systems/spatialHash';

import { createTabs, renderTabBar } from '../src/widgets/tabs';
import { createTree } from '../src/widgets/tree';

// =============================================================================
// Benchmarking Utilities
// =============================================================================

interface BenchResult {
	name: string;
	ops: number;
	totalMs: number;
	opsPerSec: number;
	avgNs: number;
}

function bench(name: string, iterations: number, fn: () => void): BenchResult {
	// Warmup
	for (let i = 0; i < Math.min(100, Math.floor(iterations / 10)); i++) {
		fn();
	}

	const start = performance.now();
	for (let i = 0; i < iterations; i++) {
		fn();
	}
	const end = performance.now();

	const totalMs = end - start;
	const opsPerSec = (iterations / totalMs) * 1000;
	const avgNs = (totalMs * 1_000_000) / iterations;

	return { name, ops: iterations, totalMs, opsPerSec, avgNs };
}

function printResult(result: BenchResult): void {
	console.log(
		`  ${result.name.padEnd(40)} ${result.totalMs.toFixed(2).padStart(8)}ms  ` +
			`${(result.opsPerSec / 1000).toFixed(1).padStart(8)}k ops/s  ` +
			`${result.avgNs.toFixed(0).padStart(8)}ns/op`,
	);
}

function printFrameResult(name: string, totalMs: number, frames: number): void {
	const msPerFrame = totalMs / frames;
	const fps = 1000 / msPerFrame;
	console.log(
		`  ${name.padEnd(40)} ${totalMs.toFixed(2).padStart(8)}ms  ` +
			`${msPerFrame.toFixed(3).padStart(8)}ms/frame  ` +
			`${fps.toFixed(0).padStart(6)} FPS`,
	);
}

// =============================================================================
// Helpers
// =============================================================================

function createColliderEntity(world: World, x: number, y: number, w: number, h: number): Entity {
	const eid = addEntity(world);
	setPosition(world, eid, x, y);
	setCollider(world, eid, { width: w, height: h });
	return eid;
}

function createMovingEntity(world: World, x: number, y: number, vx: number, vy: number): Entity {
	const eid = addEntity(world);
	setPosition(world, eid, x, y);
	setVelocity(world, eid, vx, vy);
	setCollider(world, eid, { width: 1, height: 1 });
	return eid;
}

const DEFAULT_APPEARANCE: EmitterAppearance = {
	chars: [0x2a, 0x2e, 0x6f], // *, ., o
	startFg: 0xffff0000,
	endFg: 0xff880000,
	fadeOut: true,
};

// =============================================================================
// Benchmark 1: Particle System
// =============================================================================

function benchParticleSystem(emitterCount: number, particlesPerEmitter: number, frames: number): void {
	const totalParticles = emitterCount * particlesPerEmitter;
	console.log(
		`\n=== PARTICLE BENCHMARK (${emitterCount} emitters x ${particlesPerEmitter} particles = ${totalParticles.toLocaleString()} total, ${frames} frames) ===`,
	);

	// --- Spawn benchmark ---
	{
		const world = createWorld();
		const emitters: Entity[] = [];
		for (let i = 0; i < emitterCount; i++) {
			const eid = addEntity(world);
			setPosition(world, eid, Math.random() * 100, Math.random() * 100);
			setEmitter(world, eid, {
				rate: 0,
				lifetime: 2,
				speed: 5,
				spread: Math.PI * 2,
			});
			setEmitterAppearance(eid, DEFAULT_APPEARANCE);
			emitters.push(eid);
		}

		let spawnIdx = 0;
		const spawnResult = bench('spawnParticle', totalParticles, () => {
			const emitter = emitters[spawnIdx % emitterCount]!;
			spawnParticle(world, emitter, DEFAULT_APPEARANCE);
			spawnIdx++;
		});
		printResult(spawnResult);
	}

	// --- Update benchmark (age + move) ---
	{
		const world = createWorld();
		const emitters: Entity[] = [];
		for (let i = 0; i < emitterCount; i++) {
			const eid = addEntity(world);
			setPosition(world, eid, Math.random() * 100, Math.random() * 100);
			setEmitter(world, eid, {
				rate: 0,
				lifetime: 999, // Long lifetime so they don't die during benchmark
				speed: 5,
				spread: Math.PI * 2,
				gravity: 1,
			});
			setEmitterAppearance(eid, DEFAULT_APPEARANCE);
			emitters.push(eid);
		}

		// Spawn particles
		const particles: Entity[] = [];
		for (let i = 0; i < totalParticles; i++) {
			const emitter = emitters[i % emitterCount]!;
			const pid = spawnParticle(world, emitter, DEFAULT_APPEARANCE);
			if (pid !== -1) {
				particles.push(pid);
			}
		}

		const delta = 1 / 60;
		const updateResult = bench(`ageParticle+moveParticle (${particles.length})`, frames, () => {
			for (const pid of particles) {
				ageParticle(world, pid, delta);
				moveParticle(world, pid, delta);
			}
		});
		printResult(updateResult);
		printFrameResult('Per-frame particle update', updateResult.totalMs, frames);
	}

	// --- Full system benchmark ---
	{
		const world = createWorld();
		const emitterEntities: Entity[] = [];
		const particleEntities: Entity[] = [];

		for (let i = 0; i < emitterCount; i++) {
			const eid = addEntity(world);
			setPosition(world, eid, Math.random() * 100, Math.random() * 100);
			setEmitter(world, eid, {
				rate: particlesPerEmitter / 2, // Continuous spawn rate
				lifetime: 999,
				speed: 5,
				spread: Math.PI * 2,
			});
			setEmitterAppearance(eid, DEFAULT_APPEARANCE);
			emitterEntities.push(eid);
		}

		// Pre-spawn particles
		for (let i = 0; i < totalParticles; i++) {
			const emitter = emitterEntities[i % emitterCount]!;
			const pid = spawnParticle(world, emitter, DEFAULT_APPEARANCE);
			if (pid !== -1) {
				particleEntities.push(pid);
			}
		}

		const system = createParticleSystem({
			emitters: () => emitterEntities,
			particles: () => particleEntities,
			maxParticles: totalParticles * 2,
		});

		const systemResult = bench(`createParticleSystem full frame`, frames, () => {
			system(world);
		});
		printResult(systemResult);
		printFrameResult('Full particle system frame', systemResult.totalMs, frames);
	}
}

// =============================================================================
// Benchmark 2: Collision System
// =============================================================================

function benchCollisionSystem(entityCounts: number[], frames: number): void {
	console.log(`\n=== COLLISION BENCHMARK (O(n^2) broad phase, ${frames} frames) ===`);

	for (const count of entityCounts) {
		const world = createWorld();

		// Spread entities across a grid to get varying collision density
		const gridSize = Math.ceil(Math.sqrt(count));
		for (let i = 0; i < count; i++) {
			const x = (i % gridSize) * 2 + Math.random();
			const y = Math.floor(i / gridSize) * 2 + Math.random();
			createColliderEntity(world, x, y, 1.5, 1.5);
		}

		resetCollisionState();
		const result = bench(`detectCollisions (${count} colliders)`, frames, () => {
			resetCollisionState();
			detectCollisions(world);
		});
		printResult(result);
		printFrameResult(`${count} colliders per frame`, result.totalMs, frames);
	}
}

// =============================================================================
// Benchmark 3: Widget Rendering
// =============================================================================

function benchWidgetRender(itemCounts: number[], iterations: number): void {
	console.log(`\n=== WIDGET RENDER BENCHMARK (${iterations} iterations) ===`);

	const width = 80;

	// --- List rendering ---
	for (const count of itemCounts) {
		const world = createWorld();
		const eid = addEntity(world);
		const items = Array.from({ length: count }, (_, i) => ({
			text: `Item ${i}: ${String.fromCharCode(65 + (i % 26)).repeat(20)}`,
		}));
		attachListBehavior(world, eid, items, {
			visibleCount: Math.min(count, 50),
		});

		const result = bench(`renderListItems (${count} items)`, iterations, () => {
			renderListItems(eid, width);
		});
		printResult(result);
	}

	// --- Tabs rendering ---
	for (const count of itemCounts) {
		const world = createWorld();
		const eid = addEntity(world);
		const tabs = Array.from({ length: count }, (_, i) => ({
			label: `Tab ${i}`,
			content: `Content for tab ${i}`,
		}));
		createTabs(world, eid, { tabs });

		const result = bench(`renderTabBar (${count} tabs)`, iterations, () => {
			renderTabBar(world, eid, width);
		});
		printResult(result);
	}

	// --- Tree rendering ---
	for (const count of itemCounts) {
		const world = createWorld();
		const eid = addEntity(world);

		// Build a tree with depth: root -> children -> grandchildren
		const nodesPerLevel = Math.ceil(Math.sqrt(count));
		const nodes = Array.from({ length: Math.min(nodesPerLevel, count) }, (_, i) => ({
			label: `Node ${i}`,
			expanded: true,
			children: Array.from(
				{ length: Math.min(nodesPerLevel, Math.max(0, count - nodesPerLevel)) },
				(_, j) => ({
					label: `Child ${i}.${j}`,
				}),
			),
		}));

		const tree = createTree(world, eid, {
			nodes,
			width,
			height: Math.min(count, 50),
		});

		const result = bench(`tree.renderLines (${count} nodes)`, iterations, () => {
			tree.renderLines(width);
		});
		printResult(result);
	}
}

// =============================================================================
// Benchmark 4: Spatial Hash
// =============================================================================

function benchSpatialHash(entityCounts: number[], frames: number): void {
	console.log(`\n=== SPATIAL HASH BENCHMARK (${frames} frames) ===`);

	for (const count of entityCounts) {
		const world = createWorld();
		const entities: Entity[] = [];

		// Create entities spread across a world
		const worldSize = Math.ceil(Math.sqrt(count)) * 4;
		for (let i = 0; i < count; i++) {
			const eid = createMovingEntity(
				world,
				Math.random() * worldSize,
				Math.random() * worldSize,
				(Math.random() - 0.5) * 2,
				(Math.random() - 0.5) * 2,
			);
			entities.push(eid);
		}

		const grid = createSpatialHash({ cellSize: 8 });

		// --- Rebuild benchmark ---
		const rebuildResult = bench(`rebuildSpatialHash (${count} entities)`, frames, () => {
			rebuildSpatialHash(grid, world);
		});
		printResult(rebuildResult);
		printFrameResult(`${count} entities rebuild`, rebuildResult.totalMs, frames);

		// --- Query benchmark ---
		rebuildSpatialHash(grid, world);
		let querySum = 0;
		const queryResult = bench(`queryArea (${count} entities, 100 queries)`, frames, () => {
			for (let i = 0; i < 100; i++) {
				const x = Math.random() * worldSize;
				const y = Math.random() * worldSize;
				const result = queryArea(grid, x, y, 8, 8);
				querySum += result.size;
			}
		});
		printResult(queryResult);

		// --- Move + rebuild benchmark (simulates one frame) ---
		const moveRebuildResult = bench(`move+rebuild frame (${count} entities)`, frames, () => {
			// Move entities
			for (const eid of entities) {
				Position.x[eid] = (Position.x[eid] as number) + (Velocity.x[eid] as number);
				Position.y[eid] = (Position.y[eid] as number) + (Velocity.y[eid] as number);
			}
			rebuildSpatialHash(grid, world);
		});
		printResult(moveRebuildResult);
		printFrameResult(`${count} move+rebuild`, moveRebuildResult.totalMs, frames);

		if (querySum === -1) console.log('Never happens');
	}
}

// =============================================================================
// Benchmark 5: Mixed Workload
// =============================================================================

function benchMixedWorkload(
	particleCount: number,
	colliderCount: number,
	widgetItemCount: number,
	frames: number,
): void {
	console.log(
		`\n=== MIXED WORKLOAD (${particleCount} particles, ${colliderCount} colliders, ${widgetItemCount} widget items, ${frames} frames) ===`,
	);

	const world = createWorld();

	// --- Set up particles ---
	const emitterCount = Math.max(1, Math.floor(particleCount / 50));
	const emitterEntities: Entity[] = [];
	const particleEntities: Entity[] = [];

	for (let i = 0; i < emitterCount; i++) {
		const eid = addEntity(world);
		setPosition(world, eid, Math.random() * 200, Math.random() * 200);
		setEmitter(world, eid, {
			rate: 0,
			lifetime: 999,
			speed: 5,
			spread: Math.PI * 2,
		});
		setEmitterAppearance(eid, DEFAULT_APPEARANCE);
		emitterEntities.push(eid);
	}

	for (let i = 0; i < particleCount; i++) {
		const emitter = emitterEntities[i % emitterCount]!;
		const pid = spawnParticle(world, emitter, DEFAULT_APPEARANCE);
		if (pid !== -1) {
			particleEntities.push(pid);
		}
	}

	// --- Set up colliders ---
	const colliderEntities: Entity[] = [];
	const gridSize = Math.ceil(Math.sqrt(colliderCount));
	for (let i = 0; i < colliderCount; i++) {
		const x = (i % gridSize) * 2 + Math.random();
		const y = Math.floor(i / gridSize) * 2 + Math.random();
		colliderEntities.push(createColliderEntity(world, x, y, 1.5, 1.5));
	}

	// --- Set up spatial hash ---
	const spatialGrid = createSpatialHash({ cellSize: 8 });

	// --- Set up list widget ---
	const listEid = addEntity(world);
	const listItems = Array.from({ length: widgetItemCount }, (_, i) => ({
		text: `Item ${i}: ${String.fromCharCode(65 + (i % 26)).repeat(15)}`,
	}));
	attachListBehavior(world, listEid, listItems, {
		visibleCount: Math.min(widgetItemCount, 50),
	});

	const delta = 1 / 60;
	let sink = 0;

	// --- Measure full mixed frame ---
	const start = performance.now();
	for (let frame = 0; frame < frames; frame++) {
		// 1. Update particles (age + move)
		for (const pid of particleEntities) {
			ageParticle(world, pid, delta);
			moveParticle(world, pid, delta);
		}

		// 2. Rebuild spatial hash
		rebuildSpatialHash(spatialGrid, world);

		// 3. Run collision detection
		resetCollisionState();
		const pairs = detectCollisions(world);
		sink += pairs.length;

		// 4. Render widget
		const lines = renderListItems(listEid, 80);
		sink += lines.length;
	}
	const totalMs = performance.now() - start;

	printFrameResult('Mixed workload (combined)', totalMs, frames);

	// --- Also measure each subsystem individually within the mixed context ---
	const particleResult = bench('  Particles only', frames, () => {
		for (const pid of particleEntities) {
			ageParticle(world, pid, delta);
			moveParticle(world, pid, delta);
		}
	});
	printResult(particleResult);

	const spatialResult = bench('  Spatial hash rebuild only', frames, () => {
		rebuildSpatialHash(spatialGrid, world);
	});
	printResult(spatialResult);

	const collisionResult = bench('  Collision detection only', frames, () => {
		resetCollisionState();
		detectCollisions(world);
	});
	printResult(collisionResult);

	const widgetResult = bench('  Widget render only', frames, () => {
		renderListItems(listEid, 80);
	});
	printResult(widgetResult);

	console.log(
		`\n  Frame budget breakdown (${(totalMs / frames).toFixed(3)}ms/frame total):`,
	);
	console.log(
		`    Particles:       ${((particleResult.totalMs / frames)).toFixed(3)}ms  (${((particleResult.totalMs / totalMs) * 100).toFixed(1)}%)`,
	);
	console.log(
		`    Spatial hash:    ${((spatialResult.totalMs / frames)).toFixed(3)}ms  (${((spatialResult.totalMs / totalMs) * 100).toFixed(1)}%)`,
	);
	console.log(
		`    Collision:       ${((collisionResult.totalMs / frames)).toFixed(3)}ms  (${((collisionResult.totalMs / totalMs) * 100).toFixed(1)}%)`,
	);
	console.log(
		`    Widget render:   ${((widgetResult.totalMs / frames)).toFixed(3)}ms  (${((widgetResult.totalMs / totalMs) * 100).toFixed(1)}%)`,
	);

	if (sink === -1) console.log('Never happens');
}

// =============================================================================
// Main
// =============================================================================

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║            SYSTEM PERFORMANCE BENCHMARK                      ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

// 1. Particle system
benchParticleSystem(10, 100, 500);
benchParticleSystem(50, 200, 100);

// 2. Collision detection
benchCollisionSystem([50, 100, 200, 500], 200);

// 3. Widget rendering
benchWidgetRender([100, 500, 1000], 1000);

// 4. Spatial hash
benchSpatialHash([500, 1000, 5000], 200);

// 5. Mixed workload
benchMixedWorkload(500, 100, 200, 200);
benchMixedWorkload(2000, 200, 500, 60);

console.log('\n═══════════════════════════════════════════════════════════════════');
console.log('SUMMARY: These benchmarks measure real system overhead per frame.');
console.log('Target: 16.6ms/frame for 60 FPS, 33.3ms/frame for 30 FPS.');
console.log('Use these numbers to identify bottlenecks before optimizing.');
console.log('═══════════════════════════════════════════════════════════════════\n');
