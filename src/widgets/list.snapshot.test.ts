/**
 * Snapshot tests for List widget ANSI rendering.
 * Captures exact visual output to catch rendering regressions.
 *
 * @module widgets/list.snapshot.test
 */

import { describe, expect, it } from 'vitest';
import { addEntity } from '../core/ecs';
import { layoutSystem } from '../systems/layoutSystem';
import { renderSystem } from '../systems/renderSystem';
import { cleanupTestBuffer, createTestBuffer, renderToString } from '../testing/snapshot';
import { createList } from './list';

describe('List widget snapshots', () => {
	describe('basic rendering', () => {
		it('renders simple list', () => {
			const { world, db } = createTestBuffer(30, 12);
			const entity = addEntity(world);

			createList(world, entity, {
				x: 1,
				y: 1,
				width: 20,
				height: 5,
				items: ['Item 1', 'Item 2', 'Item 3', 'Item 4', 'Item 5'],
			});

			layoutSystem(world);
			renderSystem(world);

			const output = renderToString(db);
			expect(output).toMatchSnapshot();

			cleanupTestBuffer();
		});

		it('renders empty list', () => {
			const { world, db } = createTestBuffer(30, 10);
			const entity = addEntity(world);

			createList(world, entity, {
				x: 1,
				y: 1,
				width: 20,
				height: 5,
				items: [],
			});

			layoutSystem(world);
			renderSystem(world);

			const output = renderToString(db);
			expect(output).toMatchSnapshot();

			cleanupTestBuffer();
		});

		it('renders single-item list', () => {
			const { world, db } = createTestBuffer(30, 10);
			const entity = addEntity(world);

			createList(world, entity, {
				x: 1,
				y: 1,
				width: 20,
				height: 3,
				items: ['Only Item'],
			});

			layoutSystem(world);
			renderSystem(world);

			const output = renderToString(db);
			expect(output).toMatchSnapshot();

			cleanupTestBuffer();
		});

		it('renders list with long items', () => {
			const { world, db } = createTestBuffer(40, 12);
			const entity = addEntity(world);

			createList(world, entity, {
				x: 1,
				y: 1,
				width: 30,
				height: 5,
				items: [
					'Short',
					'This is a very long item that should be truncated',
					'Medium length item',
					'Another extremely long item that definitely exceeds the width',
				],
			});

			layoutSystem(world);
			renderSystem(world);

			const output = renderToString(db);
			expect(output).toMatchSnapshot();

			cleanupTestBuffer();
		});
	});

	describe('selection', () => {
		it('renders list with first item selected', () => {
			const { world, db } = createTestBuffer(30, 12);
			const entity = addEntity(world);

			createList(world, entity, {
				x: 1,
				y: 1,
				width: 20,
				height: 5,
				items: ['Item 1', 'Item 2', 'Item 3', 'Item 4', 'Item 5'],
				selected: 0,
			});

			layoutSystem(world);
			renderSystem(world);

			const output = renderToString(db);
			expect(output).toMatchSnapshot();

			cleanupTestBuffer();
		});

		it('renders list with middle item selected', () => {
			const { world, db } = createTestBuffer(30, 12);
			const entity = addEntity(world);

			createList(world, entity, {
				x: 1,
				y: 1,
				width: 20,
				height: 5,
				items: ['Item 1', 'Item 2', 'Item 3', 'Item 4', 'Item 5'],
				selected: 2,
			});

			layoutSystem(world);
			renderSystem(world);

			const output = renderToString(db);
			expect(output).toMatchSnapshot();

			cleanupTestBuffer();
		});

		it('renders list with last item selected', () => {
			const { world, db } = createTestBuffer(30, 12);
			const entity = addEntity(world);

			createList(world, entity, {
				x: 1,
				y: 1,
				width: 20,
				height: 5,
				items: ['Item 1', 'Item 2', 'Item 3', 'Item 4', 'Item 5'],
				selected: 4,
			});

			layoutSystem(world);
			renderSystem(world);

			const output = renderToString(db);
			expect(output).toMatchSnapshot();

			cleanupTestBuffer();
		});
	});

	describe('styling', () => {
		it('renders list with custom selected style', () => {
			const { world, db } = createTestBuffer(30, 12);
			const entity = addEntity(world);

			createList(world, entity, {
				x: 1,
				y: 1,
				width: 20,
				height: 5,
				items: ['Item 1', 'Item 2', 'Item 3'],
				selected: 1,
				style: {
					selected: {
						fg: 0xffffff,
						bg: 0x0000ff,
						prefix: '> ',
					},
				},
			});

			layoutSystem(world);
			renderSystem(world);

			const output = renderToString(db);
			expect(output).toMatchSnapshot();

			cleanupTestBuffer();
		});

		it('renders list with custom item colors', () => {
			const { world, db } = createTestBuffer(30, 12);
			const entity = addEntity(world);

			createList(world, entity, {
				x: 1,
				y: 1,
				width: 20,
				height: 5,
				items: ['Item 1', 'Item 2', 'Item 3'],
				style: {
					item: {
						fg: 0x00ff00,
					},
				},
			});

			layoutSystem(world);
			renderSystem(world);

			const output = renderToString(db);
			expect(output).toMatchSnapshot();

			cleanupTestBuffer();
		});

		it('renders list with custom prefixes', () => {
			const { world, db } = createTestBuffer(30, 12);
			const entity = addEntity(world);

			createList(world, entity, {
				x: 1,
				y: 1,
				width: 20,
				height: 5,
				items: ['Item 1', 'Item 2', 'Item 3'],
				selected: 0,
				style: {
					selected: {
						prefix: '→ ',
					},
					unselectedPrefix: '  ',
				},
			});

			layoutSystem(world);
			renderSystem(world);

			const output = renderToString(db);
			expect(output).toMatchSnapshot();

			cleanupTestBuffer();
		});
	});

	describe('scrolling', () => {
		it('renders list with more items than visible height', () => {
			const { world, db } = createTestBuffer(30, 12);
			const entity = addEntity(world);

			createList(world, entity, {
				x: 1,
				y: 1,
				width: 20,
				height: 5,
				items: ['Item 1', 'Item 2', 'Item 3', 'Item 4', 'Item 5', 'Item 6', 'Item 7', 'Item 8'],
			});

			layoutSystem(world);
			renderSystem(world);

			const output = renderToString(db);
			expect(output).toMatchSnapshot();

			cleanupTestBuffer();
		});

		it('renders scrolled list with selection beyond visible area', () => {
			const { world, db } = createTestBuffer(30, 12);
			const entity = addEntity(world);

			createList(world, entity, {
				x: 1,
				y: 1,
				width: 20,
				height: 5,
				items: ['Item 1', 'Item 2', 'Item 3', 'Item 4', 'Item 5', 'Item 6', 'Item 7', 'Item 8'],
				selected: 6,
			});

			layoutSystem(world);
			renderSystem(world);

			const output = renderToString(db);
			expect(output).toMatchSnapshot();

			cleanupTestBuffer();
		});
	});

	describe('edge cases', () => {
		it('renders list at screen origin', () => {
			const { world, db } = createTestBuffer(25, 10);
			const entity = addEntity(world);

			createList(world, entity, {
				x: 0,
				y: 0,
				width: 15,
				height: 4,
				items: ['Item 1', 'Item 2', 'Item 3'],
			});

			layoutSystem(world);
			renderSystem(world);

			const output = renderToString(db);
			expect(output).toMatchSnapshot();

			cleanupTestBuffer();
		});

		it('renders narrow list', () => {
			const { world, db } = createTestBuffer(20, 12);
			const entity = addEntity(world);

			createList(world, entity, {
				x: 1,
				y: 1,
				width: 10,
				height: 5,
				items: ['A', 'B', 'C', 'D', 'E'],
			});

			layoutSystem(world);
			renderSystem(world);

			const output = renderToString(db);
			expect(output).toMatchSnapshot();

			cleanupTestBuffer();
		});
	});
});
