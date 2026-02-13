/**
 * Packed Adapter Render Benchmark
 *
 * Compares frame throughput between:
 * - Default world adapter (bitecs query path)
 * - Packed query adapter (dense data path)
 *
 * Focused on normal TUI rendering workload.
 */

import { bench, describe } from 'vitest';
import { setDimensions } from '../components/dimensions';
import { setPosition } from '../components/position';
import { setStyle } from '../components/renderable';
import { addEntity } from '../core/ecs';
import { createScreenEntity } from '../core/entities';
import { createScheduler } from '../core/scheduler';
import { LoopPhase, type World } from '../core/types';
import {
	clearWorldAdapter,
	createDefaultPackedQueryAdapter,
	setWorldAdapter,
} from '../core/worldAdapter';
import { createWorld } from '../core/world';
import { createDirtyTracker } from '../core/dirtyTracking';
import { createScreenBuffer } from '../terminal/screen/cell';
import { layoutSystem } from '../systems/layoutSystem';
import { markAllDirty, setRenderBuffer } from '../systems/renderSystem';
import { renderSystem } from '../systems/renderSystem';

interface BenchState {
	world: World;
}

function setupWorld(entityCount: number, usePackedAdapter: boolean): BenchState {
	const world = createWorld();
	createScreenEntity(world, { width: 160, height: 50 });

	if (usePackedAdapter) {
		setWorldAdapter(world, createDefaultPackedQueryAdapter(entityCount * 2));
	} else {
		clearWorldAdapter(world);
	}

	const tracker = createDirtyTracker(160, 50);
	const buffer = createScreenBuffer(160, 50);
	setRenderBuffer(tracker, buffer);

	for (let i = 0; i < entityCount; i++) {
		const eid = addEntity(world);
		setPosition(world, eid, i % 160, Math.floor(i / 160));
		setDimensions(world, eid, 1, 1);
		setStyle(world, eid, { fg: 0xffffffff, bg: 0x000000ff });
	}

	const scheduler = createScheduler();
	scheduler.registerSystem(LoopPhase.LAYOUT, layoutSystem);
	scheduler.registerSystem(LoopPhase.RENDER, renderSystem);

	// Warm initial frame so benchmark reflects steady-state frame work.
	markAllDirty(world);
	scheduler.run(world, 1 / 60);

	return { world };
}

describe('Packed Adapter: Render Frame Throughput', () => {
	let default200: BenchState;
	let packed200: BenchState;
	let default1000: BenchState;
	let packed1000: BenchState;

	bench(
		'default adapter frame (200 entities)',
		() => {
			markAllDirty(default200.world);
			layoutSystem(default200.world);
			renderSystem(default200.world);
		},
		{
			setup() {
				default200 = setupWorld(200, false);
			},
		},
	);

	bench(
		'packed adapter frame (200 entities)',
		() => {
			markAllDirty(packed200.world);
			layoutSystem(packed200.world);
			renderSystem(packed200.world);
		},
		{
			setup() {
				packed200 = setupWorld(200, true);
			},
		},
	);

	bench(
		'default adapter frame (1000 entities)',
		() => {
			markAllDirty(default1000.world);
			layoutSystem(default1000.world);
			renderSystem(default1000.world);
		},
		{
			setup() {
				default1000 = setupWorld(1000, false);
			},
		},
	);

	bench(
		'packed adapter frame (1000 entities)',
		() => {
			markAllDirty(packed1000.world);
			layoutSystem(packed1000.world);
			renderSystem(packed1000.world);
		},
		{
			setup() {
				packed1000 = setupWorld(1000, true);
			},
		},
	);
});
