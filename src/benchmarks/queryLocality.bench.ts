/**
 * Query locality proxy benchmark.
 *
 * JS cannot directly expose CPU cache residency, but we can compare
 * throughput of sequential vs randomized access over the same dense
 * query data to approximate memory-access sensitivity.
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
	getWorldAdapter,
	isPackedQueryAdapter,
	setWorldAdapter,
	syncWorldAdapter,
} from '../core/worldAdapter';
import { createWorld } from '../core/world';

interface LocalityState {
	readonly dense: readonly number[];
	readonly size: number;
	readonly randomOrder: Uint32Array;
}

let localitySink = 0;
void localitySink;

function createWorldWithRenderables(entityCount: number, usePacked: boolean): LocalityState {
	const world = createWorld();
	createScreenEntity(world, { width: 200, height: 60 });

	if (usePacked) {
		setWorldAdapter(world, createDefaultPackedQueryAdapter(entityCount * 2));
	} else {
		clearWorldAdapter(world);
	}

	for (let i = 0; i < entityCount; i++) {
		const eid = addEntity(world);
		setPosition(world, eid, i % 200, Math.floor(i / 200));
		setDimensions(world, eid, 1, 1);
		setStyle(world, eid, { fg: 0xffffffff, bg: 0x000000ff });
	}

	syncWorldAdapter(world);

	const adapter = getWorldAdapter(world);
	const dense = isPackedQueryAdapter(adapter)
		? adapter.getQueryData('renderables')
		: adapter.queryRenderables(world);
	const size = isPackedQueryAdapter(adapter)
		? adapter.getQuerySize('renderables')
		: dense.length;

	const randomOrder = new Uint32Array(size);
	for (let i = 0; i < size; i++) {
		randomOrder[i] = i;
	}
	// Deterministic shuffle
	for (let i = size - 1; i > 0; i--) {
		const j = ((i * 1103515245 + 12345) >>> 1) % (i + 1);
		const tmp = randomOrder[i] as number;
		randomOrder[i] = randomOrder[j] as number;
		randomOrder[j] = tmp;
	}

	return {
		dense,
		size,
		randomOrder,
	};
}

describe('Query Locality Proxy', () => {
	let packedState: LocalityState;
	let defaultState: LocalityState;

	bench(
		'packed sequential scan (10k)',
		() => {
			let sum = 0;
			const { dense, size } = packedState;
			for (let i = 0; i < size; i++) {
				sum += dense[i] as number;
			}
			localitySink = sum;
		},
		{
			setup() {
				packedState = createWorldWithRenderables(10_000, true);
			},
		},
	);

	bench(
		'packed randomized scan (10k)',
		() => {
			let sum = 0;
			const { dense, size, randomOrder } = packedState;
			for (let i = 0; i < size; i++) {
				sum += dense[randomOrder[i] as number] as number;
			}
			localitySink = sum;
		},
	);

	bench(
		'default sequential scan (10k)',
		() => {
			let sum = 0;
			const { dense, size } = defaultState;
			for (let i = 0; i < size; i++) {
				sum += dense[i] as number;
			}
			localitySink = sum;
		},
		{
			setup() {
				defaultState = createWorldWithRenderables(10_000, false);
			},
		},
	);

	bench(
		'default randomized scan (10k)',
		() => {
			let sum = 0;
			const { dense, size, randomOrder } = defaultState;
			for (let i = 0; i < size; i++) {
				sum += dense[randomOrder[i] as number] as number;
			}
			localitySink = sum;
		},
	);
});
