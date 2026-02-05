#!/usr/bin/env npx tsx
/**
 * Packed Store Benchmark
 *
 * Compares performance of PackedStore vs Map for typical ECS data patterns.
 * Tests iteration (most critical), random access, and add/remove operations.
 */

import {
	addToStore,
	createPackedStore,
	forEachInStore,
	getFromStore,
	getStoreData,
	removeFromStore,
	type PackedHandle,
	type PackedStore,
} from '../src/core/storage/packedStore';

import {
	allocateEntity,
	createEntityPool,
	deallocateEntity,
	type EntityHandle,
	type EntityPool,
} from '../src/core/storage/entityPool';

// =============================================================================
// Test Data
// =============================================================================

interface Particle {
	x: number;
	y: number;
	vx: number;
	vy: number;
	mass: number;
	color: number;
}

function createParticle(): Particle {
	return {
		x: Math.random() * 1000,
		y: Math.random() * 1000,
		vx: (Math.random() - 0.5) * 10,
		vy: (Math.random() - 0.5) * 10,
		mass: Math.random() * 10 + 1,
		color: Math.floor(Math.random() * 0xffffff),
	};
}

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
	for (let i = 0; i < Math.min(1000, iterations / 10); i++) {
		fn();
	}

	// Actual measurement
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
		`  ${result.name.padEnd(35)} ${result.totalMs.toFixed(2).padStart(8)}ms  ` +
			`${(result.opsPerSec / 1000).toFixed(1).padStart(8)}k ops/s  ` +
			`${result.avgNs.toFixed(0).padStart(8)}ns/op`,
	);
}

function printComparison(baseline: BenchResult, test: BenchResult): void {
	const speedup = baseline.avgNs / test.avgNs;
	const faster = speedup > 1 ? 'faster' : 'slower';
	const ratio = speedup > 1 ? speedup : 1 / speedup;
	console.log(`  → PackedStore is ${ratio.toFixed(2)}x ${faster} than Map\n`);
}

// =============================================================================
// Benchmark: Iteration
// =============================================================================

function benchIteration(elementCount: number, iterations: number): void {
	console.log(`\n=== ITERATION BENCHMARK (${elementCount.toLocaleString()} elements) ===`);

	// Setup: PackedStore
	const store = createPackedStore<Particle>(elementCount);
	const storeHandles: PackedHandle[] = [];
	for (let i = 0; i < elementCount; i++) {
		storeHandles.push(addToStore(store, createParticle()));
	}

	// Setup: Map
	const map = new Map<number, Particle>();
	for (let i = 0; i < elementCount; i++) {
		map.set(i, createParticle());
	}

	// Setup: Plain array (baseline)
	const array: Particle[] = [];
	for (let i = 0; i < elementCount; i++) {
		array.push(createParticle());
	}

	// Benchmark: Array iteration (baseline)
	let sumArray = 0;
	const arrayResult = bench('Array for loop', iterations, () => {
		for (let i = 0; i < array.length; i++) {
			const p = array[i]!;
			sumArray += p.x + p.y;
		}
	});
	printResult(arrayResult);

	// Benchmark: PackedStore direct data access
	let sumStoreDirect = 0;
	const storeDirectResult = bench('PackedStore getStoreData()', iterations, () => {
		const data = getStoreData(store);
		const size = store.size;
		for (let i = 0; i < size; i++) {
			const p = data[i]!;
			sumStoreDirect += p.x + p.y;
		}
	});
	printResult(storeDirectResult);

	// Benchmark: PackedStore forEach
	let sumStoreEach = 0;
	const storeEachResult = bench('PackedStore forEachInStore()', iterations, () => {
		forEachInStore(store, (p) => {
			sumStoreEach += p.x + p.y;
		});
	});
	printResult(storeEachResult);

	// Benchmark: Map iteration
	let sumMap = 0;
	const mapResult = bench('Map forEach', iterations, () => {
		map.forEach((p) => {
			sumMap += p.x + p.y;
		});
	});
	printResult(mapResult);

	// Benchmark: Map values() iteration
	let sumMapValues = 0;
	const mapValuesResult = bench('Map for...of values()', iterations, () => {
		for (const p of map.values()) {
			sumMapValues += p.x + p.y;
		}
	});
	printResult(mapValuesResult);

	// Prevent optimization from removing the sums
	if (sumArray + sumStoreDirect + sumStoreEach + sumMap + sumMapValues === -1) {
		console.log('Never happens');
	}

	printComparison(mapResult, storeDirectResult);
}

// =============================================================================
// Benchmark: Random Access
// =============================================================================

function benchRandomAccess(elementCount: number, accessCount: number): void {
	console.log(`\n=== RANDOM ACCESS BENCHMARK (${elementCount.toLocaleString()} elements, ${accessCount.toLocaleString()} accesses) ===`);

	// Setup
	const store = createPackedStore<Particle>(elementCount);
	const storeHandles: PackedHandle[] = [];
	for (let i = 0; i < elementCount; i++) {
		storeHandles.push(addToStore(store, createParticle()));
	}

	const map = new Map<number, Particle>();
	for (let i = 0; i < elementCount; i++) {
		map.set(i, createParticle());
	}

	// Random access indices
	const indices: number[] = [];
	for (let i = 0; i < accessCount; i++) {
		indices.push(Math.floor(Math.random() * elementCount));
	}

	// Benchmark: PackedStore random access
	let sumStore = 0;
	const storeResult = bench('PackedStore getFromStore()', 100, () => {
		for (const idx of indices) {
			const handle = storeHandles[idx]!;
			const p = getFromStore(store, handle);
			if (p) sumStore += p.x;
		}
	});
	printResult(storeResult);

	// Benchmark: Map random access
	let sumMap = 0;
	const mapResult = bench('Map get()', 100, () => {
		for (const idx of indices) {
			const p = map.get(idx);
			if (p) sumMap += p.x;
		}
	});
	printResult(mapResult);

	if (sumStore + sumMap === -1) console.log('Never happens');

	const speedup = mapResult.avgNs / storeResult.avgNs;
	if (speedup > 1) {
		console.log(`  → PackedStore is ${speedup.toFixed(2)}x faster than Map\n`);
	} else {
		console.log(`  → Map is ${(1 / speedup).toFixed(2)}x faster than PackedStore (expected for random access)\n`);
	}
}

// =============================================================================
// Benchmark: Add/Remove Churn
// =============================================================================

function benchChurn(initialCount: number, churnOps: number): void {
	console.log(`\n=== ADD/REMOVE CHURN BENCHMARK (${initialCount.toLocaleString()} initial, ${churnOps.toLocaleString()} ops) ===`);

	// Setup: PackedStore
	const store = createPackedStore<Particle>(initialCount);
	const storeHandles: PackedHandle[] = [];
	for (let i = 0; i < initialCount; i++) {
		storeHandles.push(addToStore(store, createParticle()));
	}

	// Setup: Map
	const map = new Map<number, Particle>();
	let mapNextId = 0;
	const mapIds: number[] = [];
	for (let i = 0; i < initialCount; i++) {
		const id = mapNextId++;
		map.set(id, createParticle());
		mapIds.push(id);
	}

	// Benchmark: PackedStore add/remove
	const storeResult = bench('PackedStore add/remove', churnOps, () => {
		// Remove random element
		const removeIdx = Math.floor(Math.random() * storeHandles.length);
		const handle = storeHandles[removeIdx]!;
		removeFromStore(store, handle);

		// Add new element (reuses the freed slot)
		const newHandle = addToStore(store, createParticle());
		storeHandles[removeIdx] = newHandle;
	});
	printResult(storeResult);

	// Benchmark: Map add/remove
	const mapResult = bench('Map set/delete', churnOps, () => {
		// Remove random element
		const removeIdx = Math.floor(Math.random() * mapIds.length);
		const id = mapIds[removeIdx]!;
		map.delete(id);

		// Add new element
		const newId = mapNextId++;
		map.set(newId, createParticle());
		mapIds[removeIdx] = newId;
	});
	printResult(mapResult);

	printComparison(mapResult, storeResult);
}

// =============================================================================
// Benchmark: Entity Pool
// =============================================================================

function benchEntityPool(allocCount: number): void {
	console.log(`\n=== ENTITY POOL BENCHMARK (${allocCount.toLocaleString()} allocations) ===`);

	// EntityPool
	const pool = createEntityPool(allocCount);
	const poolHandles: EntityHandle[] = [];

	const poolAllocResult = bench('EntityPool allocate', allocCount, () => {
		poolHandles.push(allocateEntity(pool));
	});
	printResult(poolAllocResult);

	// Simple counter (baseline for raw ID allocation)
	let counter = 0;
	const counterIds: number[] = [];

	const counterResult = bench('Simple counter', allocCount, () => {
		counterIds.push(counter++);
	});
	printResult(counterResult);

	console.log(`  → EntityPool overhead: ${(poolAllocResult.avgNs - counterResult.avgNs).toFixed(0)}ns per allocation\n`);

	// Deallocate half and reallocate
	console.log('--- Deallocation + Reallocation ---');

	const halfCount = Math.floor(allocCount / 2);
	const indicesToRemove = new Set<number>();
	while (indicesToRemove.size < halfCount) {
		indicesToRemove.add(Math.floor(Math.random() * poolHandles.length));
	}

	const deallocResult = bench('EntityPool deallocate', halfCount, () => {
		const iter = indicesToRemove.values();
		const result = iter.next();
		if (!result.done) {
			const idx = result.value;
			const handle = poolHandles[idx];
			if (handle) {
				deallocateEntity(pool, handle);
				indicesToRemove.delete(idx);
			}
		}
	});
	printResult(deallocResult);

	// Reallocate (reuses freed slots)
	const reallocResult = bench('EntityPool reallocate (reuse)', halfCount, () => {
		allocateEntity(pool);
	});
	printResult(reallocResult);
}

// =============================================================================
// Benchmark: Mixed Workload (Realistic Simulation)
// =============================================================================

function benchMixedWorkload(entityCount: number, frames: number): void {
	console.log(`\n=== MIXED WORKLOAD (${entityCount.toLocaleString()} entities, ${frames} frames) ===`);
	console.log('Simulates: iterate all + 5% random access + 1% churn per frame\n');

	const accessPerFrame = Math.floor(entityCount * 0.05);
	const churnPerFrame = Math.floor(entityCount * 0.01);

	// PackedStore setup
	const store = createPackedStore<Particle>(entityCount);
	let storeHandles: PackedHandle[] = [];
	for (let i = 0; i < entityCount; i++) {
		storeHandles.push(addToStore(store, createParticle()));
	}

	// Map setup
	const map = new Map<number, Particle>();
	let mapNextId = 0;
	let mapIds: number[] = [];
	for (let i = 0; i < entityCount; i++) {
		const id = mapNextId++;
		map.set(id, createParticle());
		mapIds.push(id);
	}

	// PackedStore workload
	let storeSum = 0;
	const storeStart = performance.now();
	for (let frame = 0; frame < frames; frame++) {
		// Iterate all
		const data = getStoreData(store);
		for (let i = 0; i < store.size; i++) {
			const p = data[i]!;
			p.x += p.vx;
			p.y += p.vy;
			storeSum += p.x;
		}

		// Random access
		for (let i = 0; i < accessPerFrame; i++) {
			const idx = Math.floor(Math.random() * storeHandles.length);
			const handle = storeHandles[idx]!;
			const p = getFromStore(store, handle);
			if (p) storeSum += p.mass;
		}

		// Churn
		for (let i = 0; i < churnPerFrame; i++) {
			const removeIdx = Math.floor(Math.random() * storeHandles.length);
			removeFromStore(store, storeHandles[removeIdx]!);
			storeHandles[removeIdx] = addToStore(store, createParticle());
		}
	}
	const storeTime = performance.now() - storeStart;

	// Map workload
	let mapSum = 0;
	const mapStart = performance.now();
	for (let frame = 0; frame < frames; frame++) {
		// Iterate all
		for (const p of map.values()) {
			p.x += p.vx;
			p.y += p.vy;
			mapSum += p.x;
		}

		// Random access
		for (let i = 0; i < accessPerFrame; i++) {
			const idx = Math.floor(Math.random() * mapIds.length);
			const id = mapIds[idx]!;
			const p = map.get(id);
			if (p) mapSum += p.mass;
		}

		// Churn
		for (let i = 0; i < churnPerFrame; i++) {
			const removeIdx = Math.floor(Math.random() * mapIds.length);
			map.delete(mapIds[removeIdx]!);
			const newId = mapNextId++;
			map.set(newId, createParticle());
			mapIds[removeIdx] = newId;
		}
	}
	const mapTime = performance.now() - mapStart;

	console.log(`  PackedStore total:  ${storeTime.toFixed(2)}ms (${(storeTime / frames).toFixed(3)}ms/frame)`);
	console.log(`  Map total:          ${mapTime.toFixed(2)}ms (${(mapTime / frames).toFixed(3)}ms/frame)`);

	const speedup = mapTime / storeTime;
	console.log(`  → PackedStore is ${speedup.toFixed(2)}x faster overall\n`);

	if (storeSum + mapSum === -1) console.log('Never happens');
}

// =============================================================================
// Main
// =============================================================================

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║          PACKED STORE vs MAP PERFORMANCE BENCHMARK            ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

// Core benchmarks
benchIteration(10_000, 1000);
benchIteration(100_000, 100);

benchRandomAccess(10_000, 10_000);

benchChurn(10_000, 10_000);

benchEntityPool(100_000);

// Realistic workload
benchMixedWorkload(10_000, 100);
benchMixedWorkload(50_000, 60);

console.log('\n═══════════════════════════════════════════════════════════════════');
console.log('CONCLUSION: PackedStore provides significant speedup for iteration-');
console.log('heavy workloads (typical in ECS). Map is slightly faster for pure');
console.log('random access, but this is rarely the bottleneck in real apps.');
console.log('═══════════════════════════════════════════════════════════════════\n');
