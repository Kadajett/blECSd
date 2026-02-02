/**
 * Screen Buffer and Rendering Benchmarks
 *
 * Measures screen buffer operations, double buffering, and dirty rect tracking.
 *
 * Run with: pnpm bench src/benchmarks/screenBuffer.bench.ts
 *
 * @module benchmarks/screenBuffer
 */

import { bench, describe } from 'vitest';
import { createCell, fillRect, setCell, type Cell, type ScreenBufferData } from '../terminal/screen/cell';
import {
	clearDirtyRegions,
	createDoubleBuffer,
	getMinimalUpdates,
	markDirtyRegion,
	markFullRedraw,
	swapBuffers,
	type DoubleBufferData,
} from '../terminal/screen/doubleBuffer';

// =============================================================================
// SETUP HELPERS
// =============================================================================

const WHITE_ON_BLACK = createCell(' ', 0xffffffff, 0x000000ff);
const RED_ON_BLACK = createCell('X', 0xff0000ff, 0x000000ff);
const GREEN_ON_BLACK = createCell('O', 0x00ff00ff, 0x000000ff);

// Standard terminal sizes
const SIZES = {
	small: { width: 80, height: 24 },
	medium: { width: 120, height: 40 },
	large: { width: 200, height: 60 },
	huge: { width: 400, height: 120 },
};

// =============================================================================
// CELL OPERATIONS
// =============================================================================

describe('Cell Operations', () => {
	describe('createCell', () => {
		bench('create cell with defaults', () => {
			createCell(' ');
		});

		bench('create cell with colors', () => {
			createCell('X', 0xff0000ff, 0x000000ff);
		});

		bench('create 1,000 cells', () => {
			for (let i = 0; i < 1000; i++) {
				createCell(String.fromCharCode(65 + (i % 26)), 0xffffffff, 0x000000ff);
			}
		});
	});
});

// =============================================================================
// DOUBLE BUFFER CREATION
// =============================================================================

describe('Double Buffer Creation', () => {
	bench('create 80x24 buffer', () => {
		createDoubleBuffer(SIZES.small.width, SIZES.small.height);
	});

	bench('create 120x40 buffer', () => {
		createDoubleBuffer(SIZES.medium.width, SIZES.medium.height);
	});

	bench('create 200x60 buffer', () => {
		createDoubleBuffer(SIZES.large.width, SIZES.large.height);
	});

	bench('create 400x120 buffer', () => {
		createDoubleBuffer(SIZES.huge.width, SIZES.huge.height);
	});
});

// =============================================================================
// CELL WRITING
// =============================================================================

describe('Cell Writing', () => {
	describe('setCell', () => {
		let db: DoubleBufferData;

		bench(
			'set single cell',
			() => {
				setCell(db.backBuffer, 40, 12, RED_ON_BLACK);
			},
			{
				setup() {
					db = createDoubleBuffer(SIZES.small.width, SIZES.small.height);
				},
			},
		);

		bench(
			'set 100 cells scattered',
			() => {
				for (let i = 0; i < 100; i++) {
					setCell(db.backBuffer, (i * 17) % 80, (i * 7) % 24, RED_ON_BLACK);
				}
			},
			{
				setup() {
					db = createDoubleBuffer(SIZES.small.width, SIZES.small.height);
				},
			},
		);

		bench(
			'set 1,000 cells scattered',
			() => {
				for (let i = 0; i < 1000; i++) {
					setCell(db.backBuffer, (i * 17) % 80, (i * 7) % 24, RED_ON_BLACK);
				}
			},
			{
				setup() {
					db = createDoubleBuffer(SIZES.small.width, SIZES.small.height);
				},
			},
		);
	});

	describe('fillRect', () => {
		let db: DoubleBufferData;

		bench(
			'fill 10x3 region',
			() => {
				fillRect(db.backBuffer, 10, 5, 10, 3, RED_ON_BLACK);
			},
			{
				setup() {
					db = createDoubleBuffer(SIZES.small.width, SIZES.small.height);
				},
			},
		);

		bench(
			'fill 40x12 region (quarter screen 80x24)',
			() => {
				fillRect(db.backBuffer, 0, 0, 40, 12, RED_ON_BLACK);
			},
			{
				setup() {
					db = createDoubleBuffer(SIZES.small.width, SIZES.small.height);
				},
			},
		);

		bench(
			'fill full 80x24 screen',
			() => {
				fillRect(db.backBuffer, 0, 0, 80, 24, RED_ON_BLACK);
			},
			{
				setup() {
					db = createDoubleBuffer(SIZES.small.width, SIZES.small.height);
				},
			},
		);

		bench(
			'fill full 200x60 screen',
			() => {
				fillRect(db.backBuffer, 0, 0, 200, 60, RED_ON_BLACK);
			},
			{
				setup() {
					db = createDoubleBuffer(SIZES.large.width, SIZES.large.height);
				},
			},
		);
	});
});

// =============================================================================
// DIRTY REGION TRACKING
// =============================================================================

describe('Dirty Region Tracking', () => {
	describe('mark dirty region', () => {
		let db: DoubleBufferData;

		bench(
			'mark single 10x3 region',
			() => {
				markDirtyRegion(db, 10, 5, 10, 3);
			},
			{
				setup() {
					db = createDoubleBuffer(SIZES.small.width, SIZES.small.height);
				},
			},
		);

		bench(
			'mark 10 scattered regions',
			() => {
				for (let i = 0; i < 10; i++) {
					markDirtyRegion(db, (i * 17) % 60, (i * 7) % 20, 10, 3);
				}
			},
			{
				setup() {
					db = createDoubleBuffer(SIZES.small.width, SIZES.small.height);
				},
			},
		);

		bench(
			'mark 100 scattered regions',
			() => {
				for (let i = 0; i < 100; i++) {
					markDirtyRegion(db, (i * 17) % 60, (i * 7) % 20, 10, 3);
				}
			},
			{
				setup() {
					db = createDoubleBuffer(SIZES.small.width, SIZES.small.height);
				},
			},
		);
	});

	describe('full redraw', () => {
		let db: DoubleBufferData;

		bench(
			'mark full redraw 80x24',
			() => {
				markFullRedraw(db);
			},
			{
				setup() {
					db = createDoubleBuffer(SIZES.small.width, SIZES.small.height);
				},
			},
		);

		bench(
			'mark full redraw 200x60',
			() => {
				markFullRedraw(db);
			},
			{
				setup() {
					db = createDoubleBuffer(SIZES.large.width, SIZES.large.height);
				},
			},
		);
	});

	describe('clear dirty regions', () => {
		let db: DoubleBufferData;

		bench(
			'clear after 10 regions',
			() => {
				clearDirtyRegions(db);
			},
			{
				setup() {
					db = createDoubleBuffer(SIZES.small.width, SIZES.small.height);
					for (let i = 0; i < 10; i++) {
						markDirtyRegion(db, (i * 17) % 60, (i * 7) % 20, 10, 3);
					}
				},
			},
		);

		bench(
			'clear after 100 regions',
			() => {
				clearDirtyRegions(db);
			},
			{
				setup() {
					db = createDoubleBuffer(SIZES.small.width, SIZES.small.height);
					for (let i = 0; i < 100; i++) {
						markDirtyRegion(db, (i * 17) % 60, (i * 7) % 20, 10, 3);
					}
				},
			},
		);
	});
});

// =============================================================================
// MINIMAL UPDATES CALCULATION
// =============================================================================

describe('Minimal Updates Calculation', () => {
	describe('getMinimalUpdates', () => {
		let db: DoubleBufferData;

		bench(
			'no changes (empty diff)',
			() => {
				getMinimalUpdates(db);
			},
			{
				setup() {
					db = createDoubleBuffer(SIZES.small.width, SIZES.small.height);
				},
			},
		);

		bench(
			'10 cell changes',
			() => {
				getMinimalUpdates(db);
			},
			{
				setup() {
					db = createDoubleBuffer(SIZES.small.width, SIZES.small.height);
					for (let i = 0; i < 10; i++) {
						setCell(db.backBuffer, (i * 17) % 80, (i * 7) % 24, RED_ON_BLACK);
						markDirtyRegion(db, (i * 17) % 80, (i * 7) % 24, 1, 1);
					}
				},
			},
		);

		bench(
			'100 cell changes',
			() => {
				getMinimalUpdates(db);
			},
			{
				setup() {
					db = createDoubleBuffer(SIZES.small.width, SIZES.small.height);
					for (let i = 0; i < 100; i++) {
						setCell(db.backBuffer, (i * 17) % 80, (i * 7) % 24, RED_ON_BLACK);
						markDirtyRegion(db, (i * 17) % 80, (i * 7) % 24, 1, 1);
					}
				},
			},
		);

		bench(
			'1,000 cell changes',
			() => {
				getMinimalUpdates(db);
			},
			{
				setup() {
					db = createDoubleBuffer(SIZES.small.width, SIZES.small.height);
					for (let i = 0; i < 1000; i++) {
						setCell(db.backBuffer, (i * 17) % 80, (i * 7) % 24, RED_ON_BLACK);
					}
					markFullRedraw(db);
				},
			},
		);

		bench(
			'full redraw 80x24',
			() => {
				getMinimalUpdates(db);
			},
			{
				setup() {
					db = createDoubleBuffer(SIZES.small.width, SIZES.small.height);
					fillRect(db.backBuffer, 0, 0, 80, 24, RED_ON_BLACK);
					markFullRedraw(db);
				},
			},
		);

		bench(
			'full redraw 200x60',
			() => {
				getMinimalUpdates(db);
			},
			{
				setup() {
					db = createDoubleBuffer(SIZES.large.width, SIZES.large.height);
					fillRect(db.backBuffer, 0, 0, 200, 60, RED_ON_BLACK);
					markFullRedraw(db);
				},
			},
		);
	});
});

// =============================================================================
// BUFFER SWAP
// =============================================================================

describe('Buffer Swap', () => {
	let db: DoubleBufferData;

	bench(
		'swap 80x24 buffers',
		() => {
			swapBuffers(db);
		},
		{
			setup() {
				db = createDoubleBuffer(SIZES.small.width, SIZES.small.height);
			},
		},
	);

	bench(
		'swap 200x60 buffers',
		() => {
			swapBuffers(db);
		},
		{
			setup() {
				db = createDoubleBuffer(SIZES.large.width, SIZES.large.height);
			},
		},
	);
});

// =============================================================================
// FULL RENDER CYCLE
// =============================================================================

describe('Full Render Cycle', () => {
	describe('simulated frame', () => {
		let db: DoubleBufferData;

		bench(
			'frame with 10 entity updates',
			() => {
				// Simulate writing 10 entities (each ~20 cells)
				for (let e = 0; e < 10; e++) {
					const x = (e * 17) % 60;
					const y = (e * 3) % 20;
					fillRect(db.backBuffer, x, y, 10, 3, e % 2 === 0 ? RED_ON_BLACK : GREEN_ON_BLACK);
					markDirtyRegion(db, x, y, 10, 3);
				}
				// Get updates
				const updates = getMinimalUpdates(db);
				// Swap
				swapBuffers(db);
				clearDirtyRegions(db);
				// (updates would be sent to terminal here)
			},
			{
				setup() {
					db = createDoubleBuffer(SIZES.small.width, SIZES.small.height);
				},
			},
		);

		bench(
			'frame with 100 entity updates',
			() => {
				for (let e = 0; e < 100; e++) {
					const x = (e * 7) % 70;
					const y = (e * 3) % 20;
					fillRect(db.backBuffer, x, y, 8, 2, e % 2 === 0 ? RED_ON_BLACK : GREEN_ON_BLACK);
					markDirtyRegion(db, x, y, 8, 2);
				}
				const updates = getMinimalUpdates(db);
				swapBuffers(db);
				clearDirtyRegions(db);
			},
			{
				setup() {
					db = createDoubleBuffer(SIZES.small.width, SIZES.small.height);
				},
			},
		);
	});
});
