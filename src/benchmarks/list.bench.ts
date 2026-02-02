/**
 * List Widget and Scrolling Benchmarks
 *
 * Measures list operations, scrolling performance, and virtualization efficiency.
 *
 * Run with: pnpm bench src/benchmarks/list.bench.ts
 *
 * @module benchmarks/list
 */

import { addEntity, createWorld } from 'bitecs';
import { bench, describe } from 'vitest';
import {
	createListItems,
	getItemsInView,
	getListItems,
	getScrollInfo,
	getSelectedIndex,
	handleListKeyPress,
	initListWidget,
	selectItem,
	scrollPage,
	scrollToIndex,
	setListHeight,
	setListItems,
} from '../components/list';
import type { Entity, World } from '../core/types';

// =============================================================================
// SETUP HELPERS
// =============================================================================

function createTestWorld(): World {
	return createWorld() as World;
}

function createListEntity(world: World): Entity {
	return addEntity(world) as Entity;
}

function generateItems(count: number): string[] {
	return Array.from({ length: count }, (_, i) => `Item ${i + 1}`);
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
	describe('initListWidget', () => {
		bench('init empty list', () => {
			const world = createTestWorld();
			const eid = createListEntity(world);
			initListWidget(world, eid, { height: 10 });
		});

		bench('init with 100 items', () => {
			const world = createTestWorld();
			const eid = createListEntity(world);
			initListWidget(world, eid, { items: items100, height: 10 });
		});

		bench('init with 1,000 items', () => {
			const world = createTestWorld();
			const eid = createListEntity(world);
			initListWidget(world, eid, { items: items1000, height: 10 });
		});

		bench('init with 10,000 items', () => {
			const world = createTestWorld();
			const eid = createListEntity(world);
			initListWidget(world, eid, { items: items10000, height: 10 });
		});

		bench('init with 100,000 items', () => {
			const world = createTestWorld();
			const eid = createListEntity(world);
			initListWidget(world, eid, { items: items100000, height: 10 });
		});

		bench('init with 1,000,000 items', () => {
			const world = createTestWorld();
			const eid = createListEntity(world);
			initListWidget(world, eid, { items: items1000000, height: 10 });
		});
	});
});

// =============================================================================
// ITEM OPERATIONS
// =============================================================================

describe('List Item Operations', () => {
	describe('setListItems', () => {
		let world: World;
		let eid: Entity;

		bench(
			'set 100 items',
			() => {
				setListItems(world, eid, items100);
			},
			{
				setup() {
					world = createTestWorld();
					eid = createListEntity(world);
					initListWidget(world, eid, { height: 10 });
				},
			},
		);

		bench(
			'set 10,000 items',
			() => {
				setListItems(world, eid, items10000);
			},
			{
				setup() {
					world = createTestWorld();
					eid = createListEntity(world);
					initListWidget(world, eid, { height: 10 });
				},
			},
		);

		bench(
			'set 100,000 items',
			() => {
				setListItems(world, eid, items100000);
			},
			{
				setup() {
					world = createTestWorld();
					eid = createListEntity(world);
					initListWidget(world, eid, { height: 10 });
				},
			},
		);
	});

	describe('getListItems', () => {
		let world: World;
		let eid: Entity;

		bench(
			'get items from 100 item list',
			() => {
				getListItems(world, eid);
			},
			{
				setup() {
					world = createTestWorld();
					eid = createListEntity(world);
					initListWidget(world, eid, { items: items100, height: 10 });
				},
			},
		);

		bench(
			'get items from 100,000 item list',
			() => {
				getListItems(world, eid);
			},
			{
				setup() {
					world = createTestWorld();
					eid = createListEntity(world);
					initListWidget(world, eid, { items: items100000, height: 10 });
				},
			},
		);
	});
});

// =============================================================================
// VIRTUALIZATION (Items in View)
// =============================================================================

describe('Virtualization', () => {
	describe('getItemsInView', () => {
		let world: World;
		let eid: Entity;

		bench(
			'100 items, 10 visible',
			() => {
				getItemsInView(world, eid);
			},
			{
				setup() {
					world = createTestWorld();
					eid = createListEntity(world);
					initListWidget(world, eid, { items: items100, height: 10 });
				},
			},
		);

		bench(
			'10,000 items, 10 visible',
			() => {
				getItemsInView(world, eid);
			},
			{
				setup() {
					world = createTestWorld();
					eid = createListEntity(world);
					initListWidget(world, eid, { items: items10000, height: 10 });
				},
			},
		);

		bench(
			'100,000 items, 10 visible',
			() => {
				getItemsInView(world, eid);
			},
			{
				setup() {
					world = createTestWorld();
					eid = createListEntity(world);
					initListWidget(world, eid, { items: items100000, height: 10 });
				},
			},
		);

		bench(
			'1,000,000 items, 10 visible',
			() => {
				getItemsInView(world, eid);
			},
			{
				setup() {
					world = createTestWorld();
					eid = createListEntity(world);
					initListWidget(world, eid, { items: items1000000, height: 10 });
				},
			},
		);

		bench(
			'1,000,000 items, 100 visible',
			() => {
				getItemsInView(world, eid);
			},
			{
				setup() {
					world = createTestWorld();
					eid = createListEntity(world);
					initListWidget(world, eid, { items: items1000000, height: 100 });
				},
			},
		);
	});
});

// =============================================================================
// SELECTION
// =============================================================================

describe('Selection', () => {
	describe('selectItem', () => {
		let world: World;
		let eid: Entity;

		bench(
			'select item in 100 item list',
			() => {
				selectItem(world, eid, 50);
			},
			{
				setup() {
					world = createTestWorld();
					eid = createListEntity(world);
					initListWidget(world, eid, { items: items100, height: 10 });
				},
			},
		);

		bench(
			'select item in 100,000 item list',
			() => {
				selectItem(world, eid, 50000);
			},
			{
				setup() {
					world = createTestWorld();
					eid = createListEntity(world);
					initListWidget(world, eid, { items: items100000, height: 10 });
				},
			},
		);

		bench(
			'select item in 1,000,000 item list',
			() => {
				selectItem(world, eid, 500000);
			},
			{
				setup() {
					world = createTestWorld();
					eid = createListEntity(world);
					initListWidget(world, eid, { items: items1000000, height: 10 });
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
				getSelectedIndex(world, eid);
			},
			{
				setup() {
					world = createTestWorld();
					eid = createListEntity(world);
					initListWidget(world, eid, { items: items100000, height: 10, selected: 50000 });
				},
			},
		);
	});
});

// =============================================================================
// SCROLLING
// =============================================================================

describe('Scrolling', () => {
	describe('scrollToIndex', () => {
		let world: World;
		let eid: Entity;

		bench(
			'scroll to middle of 100 items',
			() => {
				scrollToIndex(world, eid, 50);
			},
			{
				setup() {
					world = createTestWorld();
					eid = createListEntity(world);
					initListWidget(world, eid, { items: items100, height: 10 });
				},
			},
		);

		bench(
			'scroll to middle of 100,000 items',
			() => {
				scrollToIndex(world, eid, 50000);
			},
			{
				setup() {
					world = createTestWorld();
					eid = createListEntity(world);
					initListWidget(world, eid, { items: items100000, height: 10 });
				},
			},
		);

		bench(
			'scroll to middle of 1,000,000 items',
			() => {
				scrollToIndex(world, eid, 500000);
			},
			{
				setup() {
					world = createTestWorld();
					eid = createListEntity(world);
					initListWidget(world, eid, { items: items1000000, height: 10 });
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
				scrollPage(world, eid, 'down');
			},
			{
				setup() {
					world = createTestWorld();
					eid = createListEntity(world);
					initListWidget(world, eid, { items: items100, height: 10 });
				},
			},
		);

		bench(
			'page down in 1,000,000 item list',
			() => {
				scrollPage(world, eid, 'down');
			},
			{
				setup() {
					world = createTestWorld();
					eid = createListEntity(world);
					initListWidget(world, eid, { items: items1000000, height: 10 });
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
					initListWidget(world, eid, { items: items100, height: 10 });
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
					initListWidget(world, eid, { items: items1000000, height: 10 });
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
			getScrollInfo(world, eid);
		},
		{
			setup() {
				world = createTestWorld();
				eid = createListEntity(world);
				initListWidget(world, eid, { items: items100000, height: 10, selected: 50000 });
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
					getItemsInView(world, eid); // Would be rendered
				}
			},
			{
				setup() {
					world = createTestWorld();
					eid = createListEntity(world);
					initListWidget(world, eid, { items: items1000000, height: 20 });
				},
			},
		);

		bench(
			'page scroll through entire 100,000 item list',
			() => {
				// Scroll through entire list page by page
				const pages = Math.ceil(100000 / 10);
				for (let page = 0; page < pages; page++) {
					scrollPage(world, eid, 'down');
					getItemsInView(world, eid);
				}
			},
			{
				setup() {
					world = createTestWorld();
					eid = createListEntity(world);
					initListWidget(world, eid, { items: items100000, height: 10 });
				},
			},
		);
	});
});
