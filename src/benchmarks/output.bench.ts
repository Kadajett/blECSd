/**
 * Output Buffer and Terminal Output Benchmarks
 *
 * Measures output buffering, escape sequence optimization, and frame rendering.
 *
 * Run with: pnpm bench src/benchmarks/output.bench.ts
 *
 * @module benchmarks/output
 */

import { bench, describe } from 'vitest';
import {
	beginFrame,
	clearBuffer,
	createOutputBuffer,
	endFrame,
	getBufferLength,
	getContents,
	moveCursor,
	type OutputBufferData,
	resetBuffer,
	resetStats,
	setBackground,
	setForeground,
	setScreenSize,
	writeCellAt,
	writeChar,
	writeStringAt,
} from '../terminal/optimizedOutput';

// =============================================================================
// SETUP HELPERS
// =============================================================================

/**
 * Creates a pre-configured output buffer.
 */
function createTestBuffer(trackStats = false): OutputBufferData {
	const buffer = createOutputBuffer({ trackStats, syncMode: false });
	setScreenSize(buffer, 80, 24);
	return buffer;
}

/**
 * Generates random RGB color.
 */

// =============================================================================
// BUFFER CREATION BENCHMARKS
// =============================================================================

describe('Output Buffer Creation', () => {
	bench('create buffer (default options)', () => {
		createOutputBuffer();
	});

	bench('create buffer (with stats tracking)', () => {
		createOutputBuffer({ trackStats: true });
	});
});

// =============================================================================
// CURSOR MOVEMENT BENCHMARKS
// =============================================================================

describe('Cursor Movement', () => {
	describe('cursor positioning', () => {
		let buffer: OutputBufferData;

		bench(
			'100 random cursor moves',
			() => {
				for (let i = 0; i < 100; i++) {
					moveCursor(buffer, (i * 17) % 80, (i * 7) % 24);
				}
			},
			{
				setup() {
					buffer = createTestBuffer();
				},
			},
		);

		bench(
			'100 sequential cursor moves (with optimization)',
			() => {
				for (let i = 0; i < 100; i++) {
					moveCursor(buffer, i % 80, Math.floor(i / 80));
				}
			},
			{
				setup() {
					buffer = createTestBuffer();
				},
			},
		);

		bench(
			'100 same-position moves (all skipped)',
			() => {
				for (let i = 0; i < 100; i++) {
					moveCursor(buffer, 10, 5);
				}
			},
			{
				setup() {
					buffer = createTestBuffer();
				},
			},
		);
	});
});

// =============================================================================
// COLOR CHANGE BENCHMARKS
// =============================================================================

describe('Color Changes', () => {
	describe('foreground color', () => {
		let buffer: OutputBufferData;

		bench(
			'100 random color changes',
			() => {
				for (let i = 0; i < 100; i++) {
					setForeground(buffer, (i * 0x10101) % 0xffffff);
				}
			},
			{
				setup() {
					buffer = createTestBuffer();
				},
			},
		);

		bench(
			'100 same-color changes (all skipped)',
			() => {
				for (let i = 0; i < 100; i++) {
					setForeground(buffer, 0xff0000);
				}
			},
			{
				setup() {
					buffer = createTestBuffer();
				},
			},
		);

		bench(
			'100 alternating colors',
			() => {
				for (let i = 0; i < 100; i++) {
					setForeground(buffer, i % 2 === 0 ? 0xff0000 : 0x00ff00);
				}
			},
			{
				setup() {
					buffer = createTestBuffer();
				},
			},
		);
	});

	describe('combined fg + bg', () => {
		let buffer: OutputBufferData;

		bench(
			'100 full color changes',
			() => {
				for (let i = 0; i < 100; i++) {
					setForeground(buffer, (i * 0x10101) % 0xffffff);
					setBackground(buffer, (i * 0x20202) % 0xffffff);
				}
			},
			{
				setup() {
					buffer = createTestBuffer();
				},
			},
		);
	});
});

// =============================================================================
// CELL WRITING BENCHMARKS
// =============================================================================

describe('Cell Writing', () => {
	describe('single cell writes', () => {
		let buffer: OutputBufferData;

		bench(
			'100 cells at random positions',
			() => {
				for (let i = 0; i < 100; i++) {
					writeCellAt(buffer, (i * 17) % 80, (i * 7) % 24, 'X', 0xff0000, 0x000000);
				}
			},
			{
				setup() {
					buffer = createTestBuffer();
				},
			},
		);

		bench(
			'100 cells sequential (same color)',
			() => {
				for (let i = 0; i < 100; i++) {
					writeCellAt(buffer, i % 80, Math.floor(i / 80), 'X', 0xff0000, 0x000000);
				}
			},
			{
				setup() {
					buffer = createTestBuffer();
				},
			},
		);

		bench(
			'1,000 cells sequential (same color)',
			() => {
				for (let i = 0; i < 1000; i++) {
					writeCellAt(buffer, i % 80, Math.floor(i / 80), 'X', 0xff0000, 0x000000);
				}
			},
			{
				setup() {
					buffer = createTestBuffer();
				},
			},
		);
	});

	describe('string writes', () => {
		let buffer: OutputBufferData;

		bench(
			'100 short strings',
			() => {
				for (let i = 0; i < 100; i++) {
					writeStringAt(buffer, 0, i % 24, 'Hello World!', 0xffffff);
				}
			},
			{
				setup() {
					buffer = createTestBuffer();
				},
			},
		);

		bench(
			'100 long strings (80 chars)',
			() => {
				const longString = 'X'.repeat(80);
				for (let i = 0; i < 100; i++) {
					writeStringAt(buffer, 0, i % 24, longString, 0xffffff);
				}
			},
			{
				setup() {
					buffer = createTestBuffer();
				},
			},
		);
	});
});

// =============================================================================
// FULL SCREEN BENCHMARKS
// =============================================================================

describe('Full Screen Operations', () => {
	describe('render full screen (80x24)', () => {
		let buffer: OutputBufferData;

		bench(
			'full screen, uniform color',
			() => {
				for (let y = 0; y < 24; y++) {
					for (let x = 0; x < 80; x++) {
						writeCellAt(buffer, x, y, ' ', 0xffffff, 0x000000);
					}
				}
			},
			{
				setup() {
					buffer = createTestBuffer();
				},
			},
		);

		bench(
			'full screen, varied colors',
			() => {
				for (let y = 0; y < 24; y++) {
					for (let x = 0; x < 80; x++) {
						writeCellAt(buffer, x, y, ' ', (x * 3 + y * 7) % 0xffffff, 0x000000);
					}
				}
			},
			{
				setup() {
					buffer = createTestBuffer();
				},
			},
		);
	});

	describe('render full screen (200x60)', () => {
		let buffer: OutputBufferData;

		bench(
			'large screen, uniform color',
			() => {
				for (let y = 0; y < 60; y++) {
					for (let x = 0; x < 200; x++) {
						writeCellAt(buffer, x, y, ' ', 0xffffff, 0x000000);
					}
				}
			},
			{
				setup() {
					buffer = createOutputBuffer({ syncMode: false });
					setScreenSize(buffer, 200, 60);
				},
			},
		);
	});
});

// =============================================================================
// BUFFER OPERATIONS BENCHMARKS
// =============================================================================

describe('Buffer Operations', () => {
	describe('buffer management', () => {
		let buffer: OutputBufferData;

		bench(
			'getContents (1KB buffer)',
			() => {
				getContents(buffer);
			},
			{
				setup() {
					buffer = createTestBuffer();
					for (let i = 0; i < 1000; i++) {
						writeChar(buffer, 'X');
					}
				},
			},
		);

		bench(
			'getBufferLength (1KB buffer)',
			() => {
				getBufferLength(buffer);
			},
			{
				setup() {
					buffer = createTestBuffer();
					for (let i = 0; i < 1000; i++) {
						writeChar(buffer, 'X');
					}
				},
			},
		);

		bench(
			'clearBuffer',
			() => {
				clearBuffer(buffer);
			},
			{
				setup() {
					buffer = createTestBuffer();
					for (let i = 0; i < 100; i++) {
						writeChar(buffer, 'X');
					}
				},
			},
		);

		bench(
			'resetBuffer',
			() => {
				resetBuffer(buffer);
			},
			{
				setup() {
					buffer = createTestBuffer();
					for (let i = 0; i < 100; i++) {
						writeChar(buffer, 'X');
					}
				},
			},
		);
	});

	describe('sync frame operations', () => {
		let buffer: OutputBufferData;

		bench(
			'begin/end frame cycle',
			() => {
				beginFrame(buffer);
				endFrame(buffer);
			},
			{
				setup() {
					buffer = createOutputBuffer({ syncMode: true });
				},
			},
		);

		bench(
			'100 begin/end frame cycles',
			() => {
				for (let i = 0; i < 100; i++) {
					beginFrame(buffer);
					endFrame(buffer);
				}
			},
			{
				setup() {
					buffer = createOutputBuffer({ syncMode: true });
				},
			},
		);
	});
});

// =============================================================================
// OPTIMIZATION EFFECTIVENESS BENCHMARKS
// =============================================================================

describe('Optimization Effectiveness', () => {
	describe('render with vs without optimization', () => {
		let buffer: OutputBufferData;

		bench(
			'optimized: 100 cells same color',
			() => {
				// Same color = color changes skipped after first
				for (let i = 0; i < 100; i++) {
					writeCellAt(buffer, i % 80, Math.floor(i / 80), 'X', 0xff0000, 0x000000);
				}
			},
			{
				setup() {
					buffer = createTestBuffer(true);
				},
			},
		);

		bench(
			'worst case: 100 cells all different colors',
			() => {
				// All different colors = no optimization possible
				for (let i = 0; i < 100; i++) {
					writeCellAt(buffer, i % 80, Math.floor(i / 80), 'X', i * 0x10101, i * 0x20202);
				}
			},
			{
				setup() {
					buffer = createTestBuffer(true);
				},
			},
		);
	});

	describe('cursor optimization effectiveness', () => {
		let buffer: OutputBufferData;

		bench(
			'sequential writes (cursor follows naturally)',
			() => {
				moveCursor(buffer, 0, 0);
				for (let i = 0; i < 100; i++) {
					writeChar(buffer, 'X');
				}
			},
			{
				setup() {
					buffer = createTestBuffer(true);
				},
			},
		);

		bench(
			'random position writes (all cursor moves)',
			() => {
				for (let i = 0; i < 100; i++) {
					moveCursor(buffer, (i * 17) % 80, (i * 7) % 24);
					writeChar(buffer, 'X');
				}
			},
			{
				setup() {
					buffer = createTestBuffer(true);
				},
			},
		);
	});
});

// =============================================================================
// 10K CELLS/FRAME BENCHMARK (ACCEPTANCE CRITERIA)
// =============================================================================

describe('10K Cells/Frame (Acceptance Criteria)', () => {
	let buffer: OutputBufferData;

	bench(
		'10,000 cells with uniform color',
		() => {
			for (let i = 0; i < 10000; i++) {
				writeCellAt(buffer, i % 100, Math.floor(i / 100), 'X', 0xffffff, 0x000000);
			}
		},
		{
			setup() {
				buffer = createOutputBuffer({ syncMode: false, trackStats: true });
				setScreenSize(buffer, 100, 100);
			},
		},
	);

	bench(
		'10,000 cells with varied colors',
		() => {
			for (let i = 0; i < 10000; i++) {
				writeCellAt(buffer, i % 100, Math.floor(i / 100), 'X', i * 0x101, i * 0x202);
			}
		},
		{
			setup() {
				buffer = createOutputBuffer({ syncMode: false, trackStats: true });
				setScreenSize(buffer, 100, 100);
			},
		},
	);

	bench(
		'60fps: 10K cells/frame for 1 second (60 frames)',
		() => {
			for (let frame = 0; frame < 60; frame++) {
				beginFrame(buffer);
				for (let i = 0; i < 10000; i++) {
					writeCellAt(buffer, i % 100, Math.floor(i / 100), 'X', 0xffffff, 0x000000);
				}
				endFrame(buffer);
				clearBuffer(buffer);
			}
		},
		{
			setup() {
				buffer = createOutputBuffer({ syncMode: true, trackStats: true });
				setScreenSize(buffer, 100, 100);
			},
		},
	);
});

// =============================================================================
// 60 FPS SIMULATION
// =============================================================================

describe('60 FPS Simulation', () => {
	let buffer: OutputBufferData;

	bench(
		'1 second of 60fps rendering (60 frames, 100 cells each)',
		() => {
			for (let frame = 0; frame < 60; frame++) {
				beginFrame(buffer);
				for (let i = 0; i < 100; i++) {
					writeCellAt(buffer, (i + frame) % 80, Math.floor(i / 80), 'X', 0xff0000, 0x000000);
				}
				endFrame(buffer);
				clearBuffer(buffer);
				resetStats(buffer);
			}
		},
		{
			setup() {
				buffer = createOutputBuffer({ syncMode: true, trackStats: true });
				setScreenSize(buffer, 80, 24);
			},
		},
	);

	bench(
		'1 second of 60fps, partial updates (60 frames, 10 cells each)',
		() => {
			for (let frame = 0; frame < 60; frame++) {
				beginFrame(buffer);
				for (let i = 0; i < 10; i++) {
					writeCellAt(buffer, (i * 8 + frame) % 80, (frame + i) % 24, 'X', 0xff0000, 0x000000);
				}
				endFrame(buffer);
				clearBuffer(buffer);
			}
		},
		{
			setup() {
				buffer = createOutputBuffer({ syncMode: true });
				setScreenSize(buffer, 80, 24);
			},
		},
	);
});
