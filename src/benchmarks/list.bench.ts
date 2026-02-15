/**
 * List Widget and Scrolling Benchmarks
 *
 * Measures list operations, scrolling performance, and virtualization efficiency.
 *
 * Run with: pnpm bench src/benchmarks/list.bench.ts
 *
 * @module benchmarks/list
 */

import { addEntity, createWorld } from '../core/ecs';
import { bench, describe } from 'vitest';
import {
	attachListBehavior,
	getItems,
	getScrollInfo,
	getSelectedIndex,
	getVisibleItems,
	handleListKeyPress,
	type ListItem,
	scrollPage,
	selectNext,
	setItems,
	setSelectedIndex,
	setVisibleCount,
} from '../components/list';
import type { Entity, World } from '../core/types';

// =============================================================================
// SETUP HELPERS
// =============================================================================

function createTestWorld(): World {
	return createWorld() as World;
}

function createListEntity(world: World): Entity {
	const eid = addEntity(world) as Entity;
	attachListBehavior(world, eid);
	return eid;
}

function generateItems(count: number): ListItem[] {
	return Array.from({ length: count }, (_, i) => ({ text: `Item ${i + 1}`, value: `${i}` }));
}

// Pre-generate item arrays
const items100 = generateItems(100);
const items1000 = generateItems(1000);
const items10000 = generateItems(10000);
const items100000 = generateItems(100000);
const items1000000 = generateItems(1000000);

// =============================================================================
// LIST INITIALIZATION
// =============================================================================

describe('List Initialization', () => {
	describe('attachListBehavior', () => {
		bench('attach behavior only', () => {
			const world = createTestWorld();
			const eid = addEntity(world) as Entity;
			attachListBehavior(world, eid);
		});

		bench('attach + set 100 items', () => {
			const world = createTestWorld();
			const eid = createListEntity(world);
			setItems(world, eid, items100);
		});

		bench('attach + set 1,000 items', () => {
			const world = createTestWorld();
			const eid = createListEntity(world);
			setItems(world, eid, items1000);
		});

		bench('attach + set 10,000 items', () => {
			const world = createTestWorld();
			const eid = createListEntity(world);
			setItems(world, eid, items10000);
		});

		bench('attach + set 100,000 items', () => {
			const world = createTestWorld();
			const eid = createListEntity(world);
			setItems(world, eid, items100000);
		});

		bench('attach + set 1,000,000 items', () => {
			const world = createTestWorld();
			const eid = createListEntity(world);
			setItems(world, eid, items1000000);
		});
	});
});

// =============================================================================
// ITEM OPERATIONS
// =============================================================================

describe('List Item Operations', () => {
	describe('setItems', () => {
		let world: World;
		let eid: Entity;

		bench(
			'set 100 items',
			() => {
				setItems(world, eid, items100);
			},
			{
				setup() {
					world = createTestWorld();
					eid = createListEntity(world);
				},
			},
		);

		bench(
			'set 10,000 items',
			() => {
				setItems(world, eid, items10000);
			},
			{
				setup() {
					world = createTestWorld();
					eid = createListEntity(world);
				},
			},
		);

		bench(
			'set 100,000 items',
			() => {
				setItems(world, eid, items100000);
			},
			{
				setup() {
					world = createTestWorld();
					eid = createListEntity(world);
				},
			},
		);
	});

	describe('getItems', () => {
		let world: World;
		let eid: Entity;

		bench(
			'get items from 100 item list',
			() => {
				getItems(world, eid);
			},
			{
				setup() {
					world = createTestWorld();
					eid = createListEntity(world);
					setItems(world, eid, items100);
				},
			},
		);

		bench(
			'get items from 100,000 item list',
			() => {
				getItems(world, eid);
			},
			{
				setup() {
					world = createTestWorld();
					eid = createListEntity(world);
					setItems(world, eid, items100000);
				},
			},
		);
	});
});

// =============================================================================
// VIRTUALIZATION (Visible Items)
// =============================================================================

describe('Virtualization', () => {
	describe('getVisibleItems', () => {
		let world: World;
		let eid: Entity;

		bench(
			'100 items, 10 visible',
			() => {
				getVisibleItems(world, eid);
			},
			{
				setup() {
					world = createTestWorld();
					eid = createListEntity(world);
					setItems(world, eid, items100);
					setVisibleCount(world, eid, 10);
				},
			},
		);

		bench(
			'10,000 items, 10 visible',
			() => {
				getVisibleItems(world, eid);
			},
			{
				setup() {
					world = createTestWorld();
					eid = createListEntity(world);
					setItems(world, eid, items10000);
					setVisibleCount(world, eid, 10);
				},
			},
		);

		bench(
			'100,000 items, 10 visible',
			() => {
				getVisibleItems(world, eid);
			},
			{
				setup() {
					world = createTestWorld();
					eid = createListEntity(world);
					setItems(world, eid, items100000);
					setVisibleCount(world, eid, 10);
				},
			},
		);

		bench(
			'1,000,000 items, 10 visible',
			() => {
				getVisibleItems(world, eid);
			},
			{
				setup() {
					world = createTestWorld();
					eid = createListEntity(world);
					setItems(world, eid, items1000000);
					setVisibleCount(world, eid, 10);
				},
			},
		);

		bench(
			'1,000,000 items, 100 visible',
			() => {
				getVisibleItems(world, eid);
			},
			{
				setup() {
					world = createTestWorld();
					eid = createListEntity(world);
					setItems(world, eid, items1000000);
					setVisibleCount(world, eid, 100);
				},
			},
		);
	});
});

// =============================================================================
// SELECTION
// =============================================================================

describe('Selection', () => {
	describe('setSelectedIndex', () => {
		let world: World;
		let eid: Entity;

		bench(
			'select item in 100 item list',
			() => {
				setSelectedIndex(world, eid, 50);
			},
			{
				setup() {
					world = createTestWorld();
					eid = createListEntity(world);
					setItems(world, eid, items100);
					setVisibleCount(world, eid, 10);
				},
			},
		);

		bench(
			'select item in 100,000 item list',
			() => {
				setSelectedIndex(world, eid, 50000);
			},
			{
				setup() {
					world = createTestWorld();
					eid = createListEntity(world);
					setItems(world, eid, items100000);
					setVisibleCount(world, eid, 10);
				},
			},
		);

		bench(
			'select item in 1,000,000 item list',
			() => {
				setSelectedIndex(world, eid, 500000);
			},
			{
				setup() {
					world = createTestWorld();
					eid = createListEntity(world);
					setItems(world, eid, items1000000);
					setVisibleCount(world, eid, 10);
				},
			},
		);
	});

	describe('getSelectedIndex', () => {
		let world: World;
		let eid: Entity;

		bench(
			'get selection',
			() => {
				getSelectedIndex(eid);
			},
			{
				setup() {
					world = createTestWorld();
					eid = createListEntity(world);
					setItems(world, eid, items100000);
					setVisibleCount(world, eid, 10);
					setSelectedIndex(world, eid, 50000);
				},
			},
		);
	});
});

// =============================================================================
// SCROLLING
// =============================================================================

describe('Scrolling', () => {
	describe('selectNext (scroll by 1)', () => {
		let world: World;
		let eid: Entity;

		bench(
			'next in 100 item list',
			() => {
				selectNext(world, eid);
			},
			{
				setup() {
					world = createTestWorld();
					eid = createListEntity(world);
					setItems(world, eid, items100);
					setVisibleCount(world, eid, 10);
				},
			},
		);

		bench(
			'next in 1,000,000 item list',
			() => {
				selectNext(world, eid);
			},
			{
				setup() {
					world = createTestWorld();
					eid = createListEntity(world);
					setItems(world, eid, items1000000);
					setVisibleCount(world, eid, 10);
				},
			},
		);
	});

	describe('scrollPage', () => {
		let world: World;
		let eid: Entity;

		bench(
			'page down in 100 item list',
			() => {
				scrollPage(world, eid, 1);
			},
			{
				setup() {
					world = createTestWorld();
					eid = createListEntity(world);
					setItems(world, eid, items100);
					setVisibleCount(world, eid, 10);
				},
			},
		);

		bench(
			'page down in 1,000,000 item list',
			() => {
				scrollPage(world, eid, 1);
			},
			{
				setup() {
					world = createTestWorld();
					eid = createListEntity(world);
					setItems(world, eid, items1000000);
					setVisibleCount(world, eid, 10);
				},
			},
		);
	});

	describe('handleListKeyPress (arrow keys)', () => {
		let world: World;
		let eid: Entity;

		bench(
			'arrow down 100 times in 100 item list',
			() => {
				for (let i = 0; i < 100; i++) {
					handleListKeyPress(world, eid, 'down');
				}
			},
			{
				setup() {
					world = createTestWorld();
					eid = createListEntity(world);
					setItems(world, eid, items100);
					setVisibleCount(world, eid, 10);
				},
			},
		);

		bench(
			'arrow down 100 times in 1,000,000 item list',
			() => {
				for (let i = 0; i < 100; i++) {
					handleListKeyPress(world, eid, 'down');
				}
			},
			{
				setup() {
					world = createTestWorld();
					eid = createListEntity(world);
					setItems(world, eid, items1000000);
					setVisibleCount(world, eid, 10);
				},
			},
		);
	});
});

// =============================================================================
// SCROLL INFO
// =============================================================================

describe('Scroll Info', () => {
	let world: World;
	let eid: Entity;

	bench(
		'getScrollInfo',
		() => {
			getScrollInfo(eid);
		},
		{
			setup() {
				world = createTestWorld();
				eid = createListEntity(world);
				setItems(world, eid, items100000);
				setVisibleCount(world, eid, 10);
				setSelectedIndex(world, eid, 50000);
			},
		},
	);
});

// =============================================================================
// CONTINUOUS SCROLLING SIMULATION
// =============================================================================

describe('Continuous Scrolling Simulation', () => {
	describe('60 FPS scrolling', () => {
		let world: World;
		let eid: Entity;

		bench(
			'1 second scroll at 60fps, 1,000,000 items',
			() => {
				// Simulate 60 frames of scrolling
				for (let frame = 0; frame < 60; frame++) {
					handleListKeyPress(world, eid, 'down');
					getVisibleItems(world, eid); // Would be rendered
				}
			},
			{
				setup() {
					world = createTestWorld();
					eid = createListEntity(world);
					setItems(world, eid, items1000000);
					setVisibleCount(world, eid, 20);
				},
			},
		);

		bench(
			'page scroll through 10,000 items (100 pages)',
			() => {
				// Scroll through list page by page
				for (let page = 0; page < 100; page++) {
					scrollPage(world, eid, 1);
					getVisibleItems(world, eid);
				}
			},
			{
				setup() {
					world = createTestWorld();
					eid = createListEntity(world);
					setItems(world, eid, items10000);
					setVisibleCount(world, eid, 10);
				},
			},
		);
	});
});
