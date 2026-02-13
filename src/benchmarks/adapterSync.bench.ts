/**
 * Packed adapter sync cost benchmark.
 *
 * Isolates sync overhead from render/layout systems by benchmarking
 * `syncWorldAdapter(world)` directly.
 */

import { bench, describe } from 'vitest';
import { setDimensions } from '../components/dimensions';
import { setPosition } from '../components/position';
import { setStyle } from '../components/renderable';
import { addEntity } from '../core/ecs';
import { createScreenEntity } from '../core/entities';
import {
	clearWorldAdapter,
	createDefaultPackedQueryAdapter,
	setWorldAdapter,
	syncWorldAdapter,
} from '../core/worldAdapter';
import { createWorld } from '../core/world';
import type { World } from '../core/types';

interface SyncState {
	readonly world: World;
}

function setupWorld(entityCount: number, usePacked: boolean): SyncState {
	const world = createWorld();
	createScreenEntity(world, { width: 160, height: 50 });

	if (usePacked) {
		setWorldAdapter(world, createDefaultPackedQueryAdapter(entityCount * 2));
	} else {
		clearWorldAdapter(world);
	}

	for (let i = 0; i < entityCount; i++) {
		const eid = addEntity(world);
		setPosition(world, eid, i % 160, Math.floor(i / 160));
		setDimensions(world, eid, 1, 1);
		setStyle(world, eid, { fg: 0xffffffff, bg: 0x000000ff });
	}

	// Warm initial sync.
	syncWorldAdapter(world);

	return { world };
}

describe('World Adapter Sync Cost', () => {
	let default1k: SyncState;
	let packed1k: SyncState;
	let default10k: SyncState;
	let packed10k: SyncState;

	bench(
		'default adapter sync (1k entities)',
		() => {
			syncWorldAdapter(default1k.world);
		},
		{
			setup() {
				default1k = setupWorld(1_000, false);
			},
		},
	);

	bench(
		'packed adapter sync (1k entities)',
		() => {
			syncWorldAdapter(packed1k.world);
		},
		{
			setup() {
				packed1k = setupWorld(1_000, true);
			},
		},
	);

	bench(
		'default adapter sync (10k entities)',
		() => {
			syncWorldAdapter(default10k.world);
		},
		{
			setup() {
				default10k = setupWorld(10_000, false);
			},
		},
	);

	bench(
		'packed adapter sync (10k entities)',
		() => {
			syncWorldAdapter(packed10k.world);
		},
		{
			setup() {
				packed10k = setupWorld(10_000, true);
			},
		},
	);
});

