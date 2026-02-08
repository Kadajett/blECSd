/**
 * Snapshot tests for ProgressBar widget ANSI rendering.
 * Captures exact visual output to catch rendering regressions.
 *
 * @module widgets/progressBar.snapshot.test
 */

import { describe, expect, it } from 'vitest';
import { layoutSystem } from '../systems/layoutSystem';
import { renderSystem } from '../systems/renderSystem';
import { cleanupTestBuffer, createTestBuffer, renderToString } from '../testing/snapshot';
import { createProgressBar } from './progressBar';

describe('ProgressBar widget snapshots', () => {
	describe('basic rendering', () => {
		it('renders empty progress bar', () => {
			const { world, db } = createTestBuffer(30, 8);

			createProgressBar(world, {
				x: 1,
				y: 1,
				width: 20,
				value: 0,
			});

			layoutSystem(world);
			renderSystem(world);

			const output = renderToString(db);
			expect(output).toMatchSnapshot();

			cleanupTestBuffer();
		});

		it('renders 25% progress', () => {
			const { world, db } = createTestBuffer(30, 8);

			createProgressBar(world, {
				x: 1,
				y: 1,
				width: 20,
				value: 25,
			});

			layoutSystem(world);
			renderSystem(world);

			const output = renderToString(db);
			expect(output).toMatchSnapshot();

			cleanupTestBuffer();
		});

		it('renders 50% progress', () => {
			const { world, db } = createTestBuffer(30, 8);

			createProgressBar(world, {
				x: 1,
				y: 1,
				width: 20,
				value: 50,
			});

			layoutSystem(world);
			renderSystem(world);

			const output = renderToString(db);
			expect(output).toMatchSnapshot();

			cleanupTestBuffer();
		});

		it('renders 75% progress', () => {
			const { world, db } = createTestBuffer(30, 8);

			createProgressBar(world, {
				x: 1,
				y: 1,
				width: 20,
				value: 75,
			});

			layoutSystem(world);
			renderSystem(world);

			const output = renderToString(db);
			expect(output).toMatchSnapshot();

			cleanupTestBuffer();
		});

		it('renders complete progress bar', () => {
			const { world, db } = createTestBuffer(30, 8);

			createProgressBar(world, {
				x: 1,
				y: 1,
				width: 20,
				value: 100,
			});

			layoutSystem(world);
			renderSystem(world);

			const output = renderToString(db);
			expect(output).toMatchSnapshot();

			cleanupTestBuffer();
		});
	});

	describe('with percentage display', () => {
		it('renders with percentage at 0%', () => {
			const { world, db } = createTestBuffer(35, 8);

			createProgressBar(world, {
				x: 1,
				y: 1,
				width: 25,
				value: 0,
				showPercentage: true,
			});

			layoutSystem(world);
			renderSystem(world);

			const output = renderToString(db);
			expect(output).toMatchSnapshot();

			cleanupTestBuffer();
		});

		it('renders with percentage at 42%', () => {
			const { world, db } = createTestBuffer(35, 8);

			createProgressBar(world, {
				x: 1,
				y: 1,
				width: 25,
				value: 42,
				showPercentage: true,
			});

			layoutSystem(world);
			renderSystem(world);

			const output = renderToString(db);
			expect(output).toMatchSnapshot();

			cleanupTestBuffer();
		});

		it('renders with percentage at 100%', () => {
			const { world, db } = createTestBuffer(35, 8);

			createProgressBar(world, {
				x: 1,
				y: 1,
				width: 25,
				value: 100,
				showPercentage: true,
			});

			layoutSystem(world);
			renderSystem(world);

			const output = renderToString(db);
			expect(output).toMatchSnapshot();

			cleanupTestBuffer();
		});
	});

	describe('with custom characters', () => {
		it('renders with custom fill and empty characters', () => {
			const { world, db } = createTestBuffer(30, 8);

			createProgressBar(world, {
				x: 1,
				y: 1,
				width: 20,
				value: 60,
				fillChar: '=',
				emptyChar: '-',
			});

			layoutSystem(world);
			renderSystem(world);

			const output = renderToString(db);
			expect(output).toMatchSnapshot();

			cleanupTestBuffer();
		});

		it('renders with block characters', () => {
			const { world, db } = createTestBuffer(30, 8);

			createProgressBar(world, {
				x: 1,
				y: 1,
				width: 20,
				value: 40,
				fillChar: '▓',
				emptyChar: '░',
			});

			layoutSystem(world);
			renderSystem(world);

			const output = renderToString(db);
			expect(output).toMatchSnapshot();

			cleanupTestBuffer();
		});

		it('renders with hashtag characters', () => {
			const { world, db } = createTestBuffer(30, 8);

			createProgressBar(world, {
				x: 1,
				y: 1,
				width: 20,
				value: 70,
				fillChar: '#',
				emptyChar: '.',
			});

			layoutSystem(world);
			renderSystem(world);

			const output = renderToString(db);
			expect(output).toMatchSnapshot();

			cleanupTestBuffer();
		});
	});

	describe('with labels', () => {
		it('renders with custom label', () => {
			const { world, db } = createTestBuffer(40, 8);

			createProgressBar(world, {
				x: 1,
				y: 1,
				width: 30,
				value: 65,
				label: 'Loading...',
			});

			layoutSystem(world);
			renderSystem(world);

			const output = renderToString(db);
			expect(output).toMatchSnapshot();

			cleanupTestBuffer();
		});

		it('renders with label and percentage', () => {
			const { world, db } = createTestBuffer(40, 8);

			createProgressBar(world, {
				x: 1,
				y: 1,
				width: 30,
				value: 80,
				label: 'Progress',
				showPercentage: true,
			});

			layoutSystem(world);
			renderSystem(world);

			const output = renderToString(db);
			expect(output).toMatchSnapshot();

			cleanupTestBuffer();
		});
	});

	describe('size variations', () => {
		it('renders short progress bar', () => {
			const { world, db } = createTestBuffer(20, 8);

			createProgressBar(world, {
				x: 1,
				y: 1,
				width: 10,
				value: 50,
			});

			layoutSystem(world);
			renderSystem(world);

			const output = renderToString(db);
			expect(output).toMatchSnapshot();

			cleanupTestBuffer();
		});

		it('renders long progress bar', () => {
			const { world, db } = createTestBuffer(60, 8);

			createProgressBar(world, {
				x: 1,
				y: 1,
				width: 50,
				value: 33,
			});

			layoutSystem(world);
			renderSystem(world);

			const output = renderToString(db);
			expect(output).toMatchSnapshot();

			cleanupTestBuffer();
		});
	});

	describe('edge cases', () => {
		it('renders at screen origin', () => {
			const { world, db } = createTestBuffer(30, 8);

			createProgressBar(world, {
				x: 0,
				y: 0,
				width: 20,
				value: 50,
			});

			layoutSystem(world);
			renderSystem(world);

			const output = renderToString(db);
			expect(output).toMatchSnapshot();

			cleanupTestBuffer();
		});

		it('renders with fractional progress', () => {
			const { world, db } = createTestBuffer(30, 8);

			createProgressBar(world, {
				x: 1,
				y: 1,
				width: 20,
				value: 33.33,
			});

			layoutSystem(world);
			renderSystem(world);

			const output = renderToString(db);
			expect(output).toMatchSnapshot();

			cleanupTestBuffer();
		});

		it('renders narrow progress bar', () => {
			const { world, db } = createTestBuffer(15, 8);

			createProgressBar(world, {
				x: 1,
				y: 1,
				width: 5,
				value: 60,
			});

			layoutSystem(world);
			renderSystem(world);

			const output = renderToString(db);
			expect(output).toMatchSnapshot();

			cleanupTestBuffer();
		});
	});
});
