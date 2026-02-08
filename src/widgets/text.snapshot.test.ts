/**
 * Snapshot tests for Text widget ANSI rendering.
 * Captures exact visual output to catch rendering regressions.
 *
 * @module widgets/text.snapshot.test
 */

import { describe, expect, it } from 'vitest';
import { addEntity } from '../core/ecs';
import { layoutSystem } from '../systems/layoutSystem';
import { renderSystem } from '../systems/renderSystem';
import { cleanupTestBuffer, createTestBuffer, renderToString } from '../testing/snapshot';
import { createText } from './text';

describe('Text widget snapshots', () => {
	describe('basic rendering', () => {
		it('renders simple text', () => {
			const { world, db } = createTestBuffer(40, 10);
			const entity = addEntity(world);

			createText(world, entity, {
				top: 1,
				left: 1,
				content: 'Hello, World!',
			});

			layoutSystem(world);
			renderSystem(world);

			const output = renderToString(db);
			expect(output).toMatchSnapshot();

			cleanupTestBuffer();
		});

		it('renders multiline text', () => {
			const { world, db } = createTestBuffer(40, 10);
			const entity = addEntity(world);

			createText(world, entity, {
				top: 1,
				left: 1,
				width: 20,
				content: 'This is a longer text that should wrap to multiple lines',
			});

			layoutSystem(world);
			renderSystem(world);

			const output = renderToString(db);
			expect(output).toMatchSnapshot();

			cleanupTestBuffer();
		});

		it('renders empty text', () => {
			const { world, db } = createTestBuffer(20, 10);
			const entity = addEntity(world);

			createText(world, entity, {
				top: 1,
				left: 1,
				content: '',
			});

			layoutSystem(world);
			renderSystem(world);

			const output = renderToString(db);
			expect(output).toMatchSnapshot();

			cleanupTestBuffer();
		});
	});

	describe('alignment', () => {
		it('renders left-aligned text', () => {
			const { world, db } = createTestBuffer(30, 10);
			const entity = addEntity(world);

			createText(world, entity, {
				top: 1,
				left: 1,
				width: 20,
				height: 3,
				content: 'Left',
				align: 'left',
			});

			layoutSystem(world);
			renderSystem(world);

			const output = renderToString(db);
			expect(output).toMatchSnapshot();

			cleanupTestBuffer();
		});

		it('renders center-aligned text', () => {
			const { world, db } = createTestBuffer(30, 10);
			const entity = addEntity(world);

			createText(world, entity, {
				top: 1,
				left: 1,
				width: 20,
				height: 3,
				content: 'Centered',
				align: 'center',
			});

			layoutSystem(world);
			renderSystem(world);

			const output = renderToString(db);
			expect(output).toMatchSnapshot();

			cleanupTestBuffer();
		});

		it('renders right-aligned text', () => {
			const { world, db } = createTestBuffer(30, 10);
			const entity = addEntity(world);

			createText(world, entity, {
				top: 1,
				left: 1,
				width: 20,
				height: 3,
				content: 'Right',
				align: 'right',
			});

			layoutSystem(world);
			renderSystem(world);

			const output = renderToString(db);
			expect(output).toMatchSnapshot();

			cleanupTestBuffer();
		});

		it('renders top-aligned text', () => {
			const { world, db } = createTestBuffer(30, 10);
			const entity = addEntity(world);

			createText(world, entity, {
				top: 1,
				left: 1,
				width: 20,
				height: 5,
				content: 'Top',
				valign: 'top',
			});

			layoutSystem(world);
			renderSystem(world);

			const output = renderToString(db);
			expect(output).toMatchSnapshot();

			cleanupTestBuffer();
		});

		it('renders middle-aligned text', () => {
			const { world, db } = createTestBuffer(30, 10);
			const entity = addEntity(world);

			createText(world, entity, {
				top: 1,
				left: 1,
				width: 20,
				height: 5,
				content: 'Middle',
				valign: 'middle',
			});

			layoutSystem(world);
			renderSystem(world);

			const output = renderToString(db);
			expect(output).toMatchSnapshot();

			cleanupTestBuffer();
		});

		it('renders bottom-aligned text', () => {
			const { world, db } = createTestBuffer(30, 10);
			const entity = addEntity(world);

			createText(world, entity, {
				top: 1,
				left: 1,
				width: 20,
				height: 5,
				content: 'Bottom',
				valign: 'bottom',
			});

			layoutSystem(world);
			renderSystem(world);

			const output = renderToString(db);
			expect(output).toMatchSnapshot();

			cleanupTestBuffer();
		});
	});

	describe('colors and styling', () => {
		it('renders text with foreground color', () => {
			const { world, db } = createTestBuffer(30, 10);
			const entity = addEntity(world);

			createText(world, entity, {
				top: 1,
				left: 1,
				content: 'Colored Text',
				fg: 0xff0000, // Red
			});

			layoutSystem(world);
			renderSystem(world);

			const output = renderToString(db);
			expect(output).toMatchSnapshot();

			cleanupTestBuffer();
		});

		it('renders text with background color', () => {
			const { world, db } = createTestBuffer(30, 10);
			const entity = addEntity(world);

			createText(world, entity, {
				top: 1,
				left: 1,
				content: 'Background',
				bg: 0x0000ff, // Blue background
			});

			layoutSystem(world);
			renderSystem(world);

			const output = renderToString(db);
			expect(output).toMatchSnapshot();

			cleanupTestBuffer();
		});

		it('renders text with foreground and background colors', () => {
			const { world, db } = createTestBuffer(30, 10);
			const entity = addEntity(world);

			createText(world, entity, {
				top: 1,
				left: 1,
				content: 'Full Color',
				fg: 0xffff00, // Yellow text
				bg: 0x000080, // Navy background
			});

			layoutSystem(world);
			renderSystem(world);

			const output = renderToString(db);
			expect(output).toMatchSnapshot();

			cleanupTestBuffer();
		});
	});

	describe('edge cases', () => {
		it('renders text at screen origin', () => {
			const { world, db } = createTestBuffer(25, 8);
			const entity = addEntity(world);

			createText(world, entity, {
				top: 0,
				left: 0,
				content: 'Origin',
			});

			layoutSystem(world);
			renderSystem(world);

			const output = renderToString(db);
			expect(output).toMatchSnapshot();

			cleanupTestBuffer();
		});

		it('renders single character', () => {
			const { world, db } = createTestBuffer(10, 10);
			const entity = addEntity(world);

			createText(world, entity, {
				top: 2,
				left: 2,
				content: 'X',
			});

			layoutSystem(world);
			renderSystem(world);

			const output = renderToString(db);
			expect(output).toMatchSnapshot();

			cleanupTestBuffer();
		});

		it('renders very long text', () => {
			const { world, db } = createTestBuffer(50, 10);
			const entity = addEntity(world);

			createText(world, entity, {
				top: 1,
				left: 1,
				width: 40,
				content:
					'This is a very long text string that will definitely need to wrap across multiple lines',
			});

			layoutSystem(world);
			renderSystem(world);

			const output = renderToString(db);
			expect(output).toMatchSnapshot();

			cleanupTestBuffer();
		});
	});
});
