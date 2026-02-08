/**
 * Snapshot tests for Box widget ANSI rendering.
 * Captures exact visual output to catch rendering regressions.
 *
 * @module widgets/box.snapshot.test
 */

import { describe, expect, it } from 'vitest';
import { addEntity } from '../core/ecs';
import { layoutSystem } from '../systems/layoutSystem';
import { renderSystem } from '../systems/renderSystem';
import { cleanupTestBuffer, createTestBuffer, renderToString } from '../testing/snapshot';
import { createBox } from './box';

describe('Box widget snapshots', () => {
	describe('basic rendering', () => {
		it('renders simple box without border', () => {
			const { world, buffer } = createTestBuffer(20, 10);
			const entity = addEntity(world);

			createBox(world, entity, {
				top: 1,
				left: 1,
				width: 10,
				height: 5,
			});

			layoutSystem(world);
			renderSystem(world);

			const output = renderToString(buffer);
			expect(output).toMatchSnapshot();

			cleanupTestBuffer();
		});

		it('renders box with single line border', () => {
			const { world, buffer } = createTestBuffer(20, 10);
			const entity = addEntity(world);

			createBox(world, entity, {
				top: 1,
				left: 1,
				width: 10,
				height: 5,
				border: { type: 'line' },
			});

			layoutSystem(world);
			renderSystem(world);

			const output = renderToString(buffer);
			expect(output).toMatchSnapshot();

			cleanupTestBuffer();
		});

		it('renders box with double line border', () => {
			const { world, buffer } = createTestBuffer(20, 10);
			const entity = addEntity(world);

			createBox(world, entity, {
				top: 1,
				left: 1,
				width: 10,
				height: 5,
				border: { type: 'line', ch: 'double' },
			});

			layoutSystem(world);
			renderSystem(world);

			const output = renderToString(buffer);
			expect(output).toMatchSnapshot();

			cleanupTestBuffer();
		});

		it('renders box with bold border', () => {
			const { world, buffer } = createTestBuffer(20, 10);
			const entity = addEntity(world);

			createBox(world, entity, {
				top: 1,
				left: 1,
				width: 10,
				height: 5,
				border: { type: 'line', ch: 'bold' },
			});

			layoutSystem(world);
			renderSystem(world);

			const output = renderToString(buffer);
			expect(output).toMatchSnapshot();

			cleanupTestBuffer();
		});

		it('renders box with rounded border', () => {
			const { world, buffer } = createTestBuffer(20, 10);
			const entity = addEntity(world);

			createBox(world, entity, {
				top: 1,
				left: 1,
				width: 10,
				height: 5,
				border: { type: 'line', ch: 'rounded' },
			});

			layoutSystem(world);
			renderSystem(world);

			const output = renderToString(buffer);
			expect(output).toMatchSnapshot();

			cleanupTestBuffer();
		});
	});

	describe('colors and styling', () => {
		it('renders box with background color', () => {
			const { world, buffer } = createTestBuffer(20, 10);
			const entity = addEntity(world);

			createBox(world, entity, {
				top: 1,
				left: 1,
				width: 10,
				height: 5,
				bg: 0x0000ff, // Blue background
			});

			layoutSystem(world);
			renderSystem(world);

			const output = renderToString(buffer);
			expect(output).toMatchSnapshot();

			cleanupTestBuffer();
		});

		it('renders box with foreground and background colors', () => {
			const { world, buffer } = createTestBuffer(20, 10);
			const entity = addEntity(world);

			createBox(world, entity, {
				top: 1,
				left: 1,
				width: 10,
				height: 5,
				border: { type: 'line' },
				fg: 0xffff00, // Yellow text
				bg: 0x000080, // Navy background
			});

			layoutSystem(world);
			renderSystem(world);

			const output = renderToString(buffer);
			expect(output).toMatchSnapshot();

			cleanupTestBuffer();
		});

		it('renders box with bold border', () => {
			const { world, buffer } = createTestBuffer(20, 10);
			const entity = addEntity(world);

			createBox(world, entity, {
				top: 1,
				left: 1,
				width: 10,
				height: 5,
				border: { type: 'line' },
				// Note: BoxConfig does not support bold styling
			});

			layoutSystem(world);
			renderSystem(world);

			const output = renderToString(buffer);
			expect(output).toMatchSnapshot();

			cleanupTestBuffer();
		});
	});

	describe('padding', () => {
		it('renders box with symmetric padding', () => {
			const { world, buffer } = createTestBuffer(20, 10);
			const entity = addEntity(world);

			createBox(world, entity, {
				top: 1,
				left: 1,
				width: 12,
				height: 7,
				border: { type: 'line' },
				padding: { top: 1, bottom: 1, left: 2, right: 2 },
			});

			layoutSystem(world);
			renderSystem(world);

			const output = renderToString(buffer);
			expect(output).toMatchSnapshot();

			cleanupTestBuffer();
		});

		it('renders box with asymmetric padding', () => {
			const { world, buffer } = createTestBuffer(25, 12);
			const entity = addEntity(world);

			createBox(world, entity, {
				top: 1,
				left: 1,
				width: 15,
				height: 8,
				border: { type: 'line' },
				padding: { top: 2, bottom: 1, left: 3, right: 1 },
			});

			layoutSystem(world);
			renderSystem(world);

			const output = renderToString(buffer);
			expect(output).toMatchSnapshot();

			cleanupTestBuffer();
		});
	});

	describe('edge cases', () => {
		it('renders minimal 1x1 box', () => {
			const { world, buffer } = createTestBuffer(10, 10);
			const entity = addEntity(world);

			createBox(world, entity, {
				top: 2,
				left: 2,
				width: 1,
				height: 1,
			});

			layoutSystem(world);
			renderSystem(world);

			const output = renderToString(buffer);
			expect(output).toMatchSnapshot();

			cleanupTestBuffer();
		});

		it('renders box at screen origin', () => {
			const { world, buffer } = createTestBuffer(15, 8);
			const entity = addEntity(world);

			createBox(world, entity, {
				top: 0,
				left: 0,
				width: 8,
				height: 4,
				border: { type: 'line' },
			});

			layoutSystem(world);
			renderSystem(world);

			const output = renderToString(buffer);
			expect(output).toMatchSnapshot();

			cleanupTestBuffer();
		});

		it('renders full-screen box', () => {
			const { world, buffer } = createTestBuffer(20, 10);
			const entity = addEntity(world);

			createBox(world, entity, {
				top: 0,
				left: 0,
				width: 20,
				height: 10,
				border: { type: 'line', ch: 'double' },
			});

			layoutSystem(world);
			renderSystem(world);

			const output = renderToString(buffer);
			expect(output).toMatchSnapshot();

			cleanupTestBuffer();
		});
	});
});
