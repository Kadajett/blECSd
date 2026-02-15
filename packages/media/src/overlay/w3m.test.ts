import { describe, expect, it } from 'vitest';
import {
	buildClearSequence,
	buildDrawSequence,
	CellPixelSizeSchema,
	cellToPixels,
	createW3MState,
	DEFAULT_CELL_HEIGHT,
	DEFAULT_CELL_WIDTH,
	drawConfigFromCells,
	findW3MBinary,
	formatClearCommand,
	formatDrawCommand,
	formatGetSizeCommand,
	formatNopCommand,
	formatRedrawCommand,
	formatSyncCommand,
	formatTerminateCommand,
	maxDisplaySize,
	parseSizeResponse,
	pixelsToCells,
	scaleToFit,
	W3M_SEARCH_PATHS,
	W3MClearConfigSchema,
	W3MCommand,
	W3MConfigSchema,
	W3MDrawConfigSchema,
} from './w3m';

// =============================================================================
// CONSTANTS
// =============================================================================

describe('W3MCommand', () => {
	it('should have correct command codes', () => {
		expect(W3MCommand.Draw).toBe(0);
		expect(W3MCommand.Redraw).toBe(1);
		expect(W3MCommand.Terminate).toBe(2);
		expect(W3MCommand.Sync).toBe(3);
		expect(W3MCommand.Nop).toBe(4);
		expect(W3MCommand.GetSize).toBe(5);
		expect(W3MCommand.Clear).toBe(6);
	});
});

describe('defaults', () => {
	it('should have standard cell dimensions', () => {
		expect(DEFAULT_CELL_WIDTH).toBe(8);
		expect(DEFAULT_CELL_HEIGHT).toBe(14);
	});

	it('should have search paths', () => {
		expect(W3M_SEARCH_PATHS.length).toBeGreaterThan(0);
		for (const p of W3M_SEARCH_PATHS) {
			expect(p).toContain('w3mimgdisplay');
		}
	});
});

// =============================================================================
// ZOD SCHEMAS
// =============================================================================

describe('CellPixelSizeSchema', () => {
	it('should accept valid sizes', () => {
		const result = CellPixelSizeSchema.parse({ width: 8, height: 14 });
		expect(result.width).toBe(8);
		expect(result.height).toBe(14);
	});

	it('should reject zero width', () => {
		expect(() => CellPixelSizeSchema.parse({ width: 0, height: 14 })).toThrow();
	});

	it('should reject negative height', () => {
		expect(() => CellPixelSizeSchema.parse({ width: 8, height: -1 })).toThrow();
	});
});

describe('W3MDrawConfigSchema', () => {
	it('should accept valid draw config', () => {
		const result = W3MDrawConfigSchema.parse({
			id: 1,
			x: 0,
			y: 0,
			width: 200,
			height: 160,
			filePath: '/path/to/image.png',
		});
		expect(result.id).toBe(1);
		expect(result.filePath).toBe('/path/to/image.png');
	});

	it('should accept optional source crop fields', () => {
		const result = W3MDrawConfigSchema.parse({
			id: 1,
			x: 0,
			y: 0,
			width: 200,
			height: 160,
			srcX: 10,
			srcY: 20,
			srcWidth: 100,
			srcHeight: 80,
			filePath: '/path/to/image.png',
		});
		expect(result.srcX).toBe(10);
		expect(result.srcY).toBe(20);
		expect(result.srcWidth).toBe(100);
		expect(result.srcHeight).toBe(80);
	});

	it('should reject empty filePath', () => {
		expect(() =>
			W3MDrawConfigSchema.parse({
				id: 1,
				x: 0,
				y: 0,
				width: 200,
				height: 160,
				filePath: '',
			}),
		).toThrow();
	});

	it('should reject zero width', () => {
		expect(() =>
			W3MDrawConfigSchema.parse({
				id: 1,
				x: 0,
				y: 0,
				width: 0,
				height: 160,
				filePath: '/path',
			}),
		).toThrow();
	});
});

describe('W3MClearConfigSchema', () => {
	it('should accept valid clear config', () => {
		const result = W3MClearConfigSchema.parse({ x: 10, y: 20, width: 100, height: 80 });
		expect(result.x).toBe(10);
	});

	it('should reject negative position', () => {
		expect(() => W3MClearConfigSchema.parse({ x: -1, y: 0, width: 100, height: 80 })).toThrow();
	});
});

describe('W3MConfigSchema', () => {
	it('should accept empty config', () => {
		const result = W3MConfigSchema.parse({});
		expect(result.binaryPath).toBeUndefined();
	});

	it('should accept full config', () => {
		const result = W3MConfigSchema.parse({
			binaryPath: '/usr/lib/w3m/w3mimgdisplay',
			cellSize: { width: 8, height: 14 },
			columns: 120,
			rows: 40,
		});
		expect(result.binaryPath).toBe('/usr/lib/w3m/w3mimgdisplay');
		expect(result.columns).toBe(120);
	});
});

// =============================================================================
// COMMAND FORMATTING
// =============================================================================

describe('formatDrawCommand', () => {
	it('should format basic draw command', () => {
		const cmd = formatDrawCommand({
			id: 1,
			x: 0,
			y: 0,
			width: 200,
			height: 160,
			filePath: '/path/to/image.png',
		});
		expect(cmd).toBe('0;1;0;0;200;160;;;;;/path/to/image.png\n');
	});

	it('should include source crop when specified', () => {
		const cmd = formatDrawCommand({
			id: 2,
			x: 80,
			y: 70,
			width: 100,
			height: 80,
			srcX: 10,
			srcY: 20,
			srcWidth: 50,
			srcHeight: 40,
			filePath: '/img.png',
		});
		expect(cmd).toBe('0;2;80;70;100;80;10;20;50;40;/img.png\n');
	});
});

describe('formatRedrawCommand', () => {
	it('should format redraw with command code 1', () => {
		const cmd = formatRedrawCommand({
			id: 1,
			x: 0,
			y: 0,
			width: 200,
			height: 160,
			filePath: '/path/to/image.png',
		});
		expect(cmd).toBe('1;1;0;0;200;160;;;;;/path/to/image.png\n');
	});
});

describe('formatClearCommand', () => {
	it('should format clear command', () => {
		const cmd = formatClearCommand({ x: 10, y: 20, width: 100, height: 80 });
		expect(cmd).toBe('6;10;20;100;80\n');
	});
});

describe('formatGetSizeCommand', () => {
	it('should format get-size command', () => {
		const cmd = formatGetSizeCommand('/path/to/image.png');
		expect(cmd).toBe('5;/path/to/image.png\n');
	});
});

describe('formatSyncCommand', () => {
	it('should format sync command', () => {
		expect(formatSyncCommand()).toBe('3;\n');
	});
});

describe('formatNopCommand', () => {
	it('should format nop command', () => {
		expect(formatNopCommand()).toBe('4;\n');
	});
});

describe('formatTerminateCommand', () => {
	it('should format terminate command', () => {
		expect(formatTerminateCommand()).toBe('2;\n');
	});
});

// =============================================================================
// RESPONSE PARSING
// =============================================================================

describe('parseSizeResponse', () => {
	it('should parse valid size response', () => {
		const result = parseSizeResponse('640 480\n');
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.size).toEqual({ width: 640, height: 480 });
		}
	});

	it('should parse without trailing newline', () => {
		const result = parseSizeResponse('1920 1080');
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.size).toEqual({ width: 1920, height: 1080 });
		}
	});

	it('should handle extra whitespace', () => {
		const result = parseSizeResponse('  800   600  \n');
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.size).toEqual({ width: 800, height: 600 });
		}
	});

	it('should fail on empty response', () => {
		const result = parseSizeResponse('');
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error).toContain('Empty response');
		}
	});

	it('should fail on whitespace-only response', () => {
		const result = parseSizeResponse('  \n  ');
		expect(result.ok).toBe(false);
	});

	it('should fail on single number', () => {
		const result = parseSizeResponse('640\n');
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error).toContain('Invalid size response');
		}
	});

	it('should fail on non-numeric values', () => {
		const result = parseSizeResponse('abc def\n');
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error).toContain('Could not parse');
		}
	});

	it('should fail on zero dimensions', () => {
		const result = parseSizeResponse('0 480\n');
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error).toContain('Invalid dimensions');
		}
	});

	it('should fail on negative dimensions', () => {
		const result = parseSizeResponse('-100 480\n');
		expect(result.ok).toBe(false);
	});
});

// =============================================================================
// PIXEL RATIO CALCULATION
// =============================================================================

describe('cellToPixels', () => {
	const cellSize = { width: 8, height: 14 };

	it('should convert origin', () => {
		expect(cellToPixels(0, 0, cellSize)).toEqual({ x: 0, y: 0 });
	});

	it('should convert standard position', () => {
		expect(cellToPixels(10, 5, cellSize)).toEqual({ x: 80, y: 70 });
	});

	it('should handle fractional positions', () => {
		const result = cellToPixels(1.5, 2.5, cellSize);
		expect(result.x).toBe(12);
		expect(result.y).toBe(35);
	});
});

describe('pixelsToCells', () => {
	const cellSize = { width: 8, height: 14 };

	it('should convert origin', () => {
		expect(pixelsToCells(0, 0, cellSize)).toEqual({ col: 0, row: 0 });
	});

	it('should convert exact cell boundaries', () => {
		expect(pixelsToCells(80, 70, cellSize)).toEqual({ col: 10, row: 5 });
	});

	it('should floor partial cells', () => {
		expect(pixelsToCells(83, 73, cellSize)).toEqual({ col: 10, row: 5 });
	});
});

describe('maxDisplaySize', () => {
	const cellSize = { width: 8, height: 14 };

	it('should calculate display size for standard terminal', () => {
		const result = maxDisplaySize(80, 24, cellSize);
		expect(result.width).toBe(640);
		// 24 - 2 = 22 rows reserved, 22 * 14 = 308
		expect(result.height).toBe(308);
	});

	it('should handle large terminals', () => {
		const result = maxDisplaySize(200, 50, cellSize);
		expect(result.width).toBe(1600);
		expect(result.height).toBe(672); // (50-2) * 14
	});

	it('should handle very small terminals', () => {
		const result = maxDisplaySize(20, 2, cellSize);
		expect(result.width).toBe(160);
		expect(result.height).toBe(0); // (2-2) * 14
	});

	it('should not go negative', () => {
		const result = maxDisplaySize(20, 1, cellSize);
		expect(result.height).toBe(0);
	});
});

describe('scaleToFit', () => {
	it('should not scale if already fits', () => {
		const result = scaleToFit({ width: 100, height: 80 }, { width: 640, height: 480 });
		expect(result).toEqual({ width: 100, height: 80 });
	});

	it('should scale down width-constrained image', () => {
		const result = scaleToFit({ width: 1920, height: 1080 }, { width: 640, height: 480 });
		expect(result.width).toBe(640);
		expect(result.height).toBe(360);
	});

	it('should scale down height-constrained image', () => {
		const result = scaleToFit({ width: 400, height: 1200 }, { width: 640, height: 480 });
		expect(result.width).toBe(160);
		expect(result.height).toBe(480);
	});

	it('should handle square images', () => {
		const result = scaleToFit({ width: 1000, height: 1000 }, { width: 640, height: 480 });
		expect(result.width).toBe(480);
		expect(result.height).toBe(480);
	});

	it('should handle zero dimensions', () => {
		expect(scaleToFit({ width: 0, height: 100 }, { width: 640, height: 480 })).toEqual({
			width: 0,
			height: 0,
		});
	});
});

// =============================================================================
// BINARY SEARCH
// =============================================================================

describe('findW3MBinary', () => {
	it('should find binary at first matching path', () => {
		const existing = new Set(['/usr/lib/w3m/w3mimgdisplay']);
		const result = findW3MBinary((p) => existing.has(p));
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.path).toBe('/usr/lib/w3m/w3mimgdisplay');
		}
	});

	it('should find binary at non-first path', () => {
		const existing = new Set(['/opt/local/libexec/w3m/w3mimgdisplay']);
		const result = findW3MBinary((p) => existing.has(p));
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.path).toBe('/opt/local/libexec/w3m/w3mimgdisplay');
		}
	});

	it('should fail when binary not found', () => {
		const result = findW3MBinary(() => false);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error).toContain('w3mimgdisplay not found');
		}
	});

	it('should use custom search paths', () => {
		const customPaths = ['/custom/path/w3mimgdisplay'];
		const result = findW3MBinary((p) => p === '/custom/path/w3mimgdisplay', customPaths);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.path).toBe('/custom/path/w3mimgdisplay');
		}
	});
});

// =============================================================================
// STATE MANAGEMENT
// =============================================================================

describe('createW3MState', () => {
	it('should create state with defaults', () => {
		const state = createW3MState({});
		expect(state.binaryPath).toBe('');
		expect(state.cellSize).toEqual({ width: 8, height: 14 });
		expect(state.columns).toBe(80);
		expect(state.rows).toBe(24);
	});

	it('should use provided config', () => {
		const state = createW3MState({
			binaryPath: '/usr/lib/w3m/w3mimgdisplay',
			cellSize: { width: 10, height: 18 },
			columns: 120,
			rows: 40,
		});
		expect(state.binaryPath).toBe('/usr/lib/w3m/w3mimgdisplay');
		expect(state.cellSize).toEqual({ width: 10, height: 18 });
		expect(state.columns).toBe(120);
		expect(state.rows).toBe(40);
	});

	it('should throw on spawn without custom spawner', () => {
		const state = createW3MState({});
		expect(() => state.spawner.spawn('cmd', [])).toThrow('No process spawner configured');
	});
});

// =============================================================================
// COMMAND SEQUENCES
// =============================================================================

describe('buildDrawSequence', () => {
	it('should combine draw + nop + sync', () => {
		const seq = buildDrawSequence({
			id: 1,
			x: 0,
			y: 0,
			width: 200,
			height: 160,
			filePath: '/img.png',
		});
		expect(seq).toBe('0;1;0;0;200;160;;;;;/img.png\n4;\n3;\n');
	});
});

describe('buildClearSequence', () => {
	it('should combine clear + sync', () => {
		const seq = buildClearSequence({ x: 10, y: 20, width: 100, height: 80 });
		expect(seq).toBe('6;10;20;100;80\n3;\n');
	});
});

// =============================================================================
// CELL COORDINATE CONVERSION
// =============================================================================

describe('drawConfigFromCells', () => {
	const cellSize = { width: 8, height: 14 };

	it('should convert cell coordinates to pixel draw config', () => {
		const config = drawConfigFromCells(1, 10, 5, 40, 20, '/img.png', cellSize);
		expect(config.id).toBe(1);
		expect(config.x).toBe(80); // 10 * 8
		expect(config.y).toBe(70); // 5 * 14
		expect(config.width).toBe(320); // 40 * 8
		expect(config.height).toBe(280); // 20 * 14
		expect(config.filePath).toBe('/img.png');
	});

	it('should handle origin position', () => {
		const config = drawConfigFromCells(0, 0, 0, 10, 5, '/img.png', cellSize);
		expect(config.x).toBe(0);
		expect(config.y).toBe(0);
		expect(config.width).toBe(80);
		expect(config.height).toBe(70);
	});
});
