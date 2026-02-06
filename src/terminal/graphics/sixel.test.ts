import { describe, expect, it } from 'vitest';
import type { SixelEnvChecker } from './sixel';
import {
	buildPalette,
	buildPaletteHeader,
	buildSixelColumn,
	bytesPerPixel,
	clearSixelImage,
	countImageColors,
	createSixelGraphicsBackend,
	cursorPosition,
	DCS_START,
	DEFAULT_MAX_COLORS,
	encodeSixelData,
	encodeSixelImage,
	findNearestColor,
	getPixelRGBA,
	isSixelSupported,
	mapPixelsToPalette,
	packRGB,
	rawEncodeBand,
	renderSixelImage,
	rleEncodeBand,
	SIXEL_BACKEND_NAME,
	SIXEL_ST,
	SixelBackendConfigSchema,
} from './sixel';

// =============================================================================
// CONSTANTS
// =============================================================================

describe('constants', () => {
	it('should have correct DCS start', () => {
		expect(DCS_START).toBe('\x1bPq');
	});

	it('should have correct string terminator', () => {
		expect(SIXEL_ST).toBe('\x1b\\');
	});

	it('should have correct backend name', () => {
		expect(SIXEL_BACKEND_NAME).toBe('sixel');
	});

	it('should have correct default max colors', () => {
		expect(DEFAULT_MAX_COLORS).toBe(256);
	});
});

// =============================================================================
// SCHEMA
// =============================================================================

describe('SixelBackendConfigSchema', () => {
	it('should apply defaults', () => {
		const result = SixelBackendConfigSchema.parse({});
		expect(result.maxColors).toBe(256);
		expect(result.rleEnabled).toBe(true);
	});

	it('should accept valid config', () => {
		const result = SixelBackendConfigSchema.parse({ maxColors: 64, rleEnabled: false });
		expect(result.maxColors).toBe(64);
		expect(result.rleEnabled).toBe(false);
	});

	it('should reject maxColors > 256', () => {
		expect(() => SixelBackendConfigSchema.parse({ maxColors: 257 })).toThrow();
	});

	it('should reject maxColors < 2', () => {
		expect(() => SixelBackendConfigSchema.parse({ maxColors: 1 })).toThrow();
	});

	it('should accept boundary values', () => {
		expect(SixelBackendConfigSchema.parse({ maxColors: 2 }).maxColors).toBe(2);
		expect(SixelBackendConfigSchema.parse({ maxColors: 256 }).maxColors).toBe(256);
	});
});

// =============================================================================
// PIXEL HELPERS
// =============================================================================

describe('bytesPerPixel', () => {
	it('should return 4 for rgba', () => {
		expect(bytesPerPixel('rgba')).toBe(4);
	});

	it('should return 3 for rgb', () => {
		expect(bytesPerPixel('rgb')).toBe(3);
	});

	it('should return 4 for png', () => {
		expect(bytesPerPixel('png')).toBe(4);
	});
});

describe('getPixelRGBA', () => {
	it('should extract RGBA from 4-byte data', () => {
		const data = new Uint8Array([255, 128, 64, 200]);
		expect(getPixelRGBA(data, 0, 4)).toEqual([255, 128, 64, 200]);
	});

	it('should extract RGB with alpha=255 from 3-byte data', () => {
		const data = new Uint8Array([255, 128, 64]);
		expect(getPixelRGBA(data, 0, 3)).toEqual([255, 128, 64, 255]);
	});

	it('should handle pixel index offset', () => {
		const data = new Uint8Array([0, 0, 0, 0, 100, 200, 50, 255]);
		expect(getPixelRGBA(data, 1, 4)).toEqual([100, 200, 50, 255]);
	});
});

describe('packRGB', () => {
	it('should pack RGB into 24-bit integer', () => {
		expect(packRGB(255, 0, 0)).toBe(0xff0000);
		expect(packRGB(0, 255, 0)).toBe(0x00ff00);
		expect(packRGB(0, 0, 255)).toBe(0x0000ff);
		expect(packRGB(255, 255, 255)).toBe(0xffffff);
		expect(packRGB(0, 0, 0)).toBe(0);
	});
});

// =============================================================================
// COLOR QUANTIZATION
// =============================================================================

describe('countImageColors', () => {
	it('should count unique colors', () => {
		// 2 red pixels, 1 green pixel (RGBA)
		const data = new Uint8Array([255, 0, 0, 255, 255, 0, 0, 255, 0, 255, 0, 255]);
		const counts = countImageColors(data, 3, 4);
		expect(counts.size).toBe(2);
		expect(counts.get(packRGB(255, 0, 0))).toBe(2);
		expect(counts.get(packRGB(0, 255, 0))).toBe(1);
	});

	it('should skip transparent pixels', () => {
		const data = new Uint8Array([
			255,
			0,
			0,
			255,
			0,
			255,
			0,
			0, // transparent
		]);
		const counts = countImageColors(data, 2, 4);
		expect(counts.size).toBe(1);
	});

	it('should handle RGB format', () => {
		const data = new Uint8Array([255, 0, 0, 0, 255, 0]);
		const counts = countImageColors(data, 2, 3);
		expect(counts.size).toBe(2);
	});

	it('should handle empty image', () => {
		const counts = countImageColors(new Uint8Array([]), 0, 4);
		expect(counts.size).toBe(0);
	});
});

describe('buildPalette', () => {
	it('should sort by popularity', () => {
		const counts = new Map<number, number>();
		counts.set(packRGB(0, 255, 0), 10); // green: most popular
		counts.set(packRGB(255, 0, 0), 5); // red: second
		counts.set(packRGB(0, 0, 255), 1); // blue: least

		const { paletteFlat, paletteCount } = buildPalette(counts, 256);
		expect(paletteCount).toBe(3);
		// First entry should be green (most popular)
		expect(paletteFlat[0]).toBe(0);
		expect(paletteFlat[1]).toBe(255);
		expect(paletteFlat[2]).toBe(0);
	});

	it('should limit to maxColors', () => {
		const counts = new Map<number, number>();
		counts.set(packRGB(255, 0, 0), 10);
		counts.set(packRGB(0, 255, 0), 5);
		counts.set(packRGB(0, 0, 255), 1);

		const { paletteCount } = buildPalette(counts, 2);
		expect(paletteCount).toBe(2);
	});

	it('should return at least 1 entry for empty counts', () => {
		const { paletteCount } = buildPalette(new Map(), 256);
		expect(paletteCount).toBe(1);
	});
});

describe('findNearestColor', () => {
	it('should find exact color match', () => {
		const palette = new Uint8Array([255, 0, 0, 0, 255, 0, 0, 0, 255]);
		expect(findNearestColor(0, 255, 0, palette, 3)).toBe(1);
	});

	it('should find nearest approximate color', () => {
		const palette = new Uint8Array([255, 0, 0, 0, 0, 255]);
		// (200, 50, 50) is closer to red than blue
		expect(findNearestColor(200, 50, 50, palette, 2)).toBe(0);
	});

	it('should return 0 for single-entry palette', () => {
		const palette = new Uint8Array([128, 128, 128]);
		expect(findNearestColor(0, 0, 0, palette, 1)).toBe(0);
	});
});

describe('mapPixelsToPalette', () => {
	it('should map pixels to nearest palette indices', () => {
		const data = new Uint8Array([
			255,
			0,
			0,
			255, // red
			0,
			255,
			0,
			255, // green
		]);
		const palette = new Uint8Array([255, 0, 0, 0, 255, 0]);
		const indexMap = mapPixelsToPalette(data, 2, 4, palette, 2);
		expect(indexMap[0]).toBe(0); // red -> palette[0]
		expect(indexMap[1]).toBe(1); // green -> palette[1]
	});

	it('should map transparent pixels to index 0', () => {
		const data = new Uint8Array([0, 0, 0, 0]);
		const palette = new Uint8Array([255, 0, 0]);
		const indexMap = mapPixelsToPalette(data, 1, 4, palette, 1);
		expect(indexMap[0]).toBe(0);
	});
});

// =============================================================================
// SIXEL ENCODING
// =============================================================================

describe('buildPaletteHeader', () => {
	it('should format palette as sixel color registers', () => {
		const palette = new Uint8Array([255, 0, 0, 0, 255, 0]);
		const header = buildPaletteHeader(palette, 2);
		expect(header).toContain('#0;2;100;0;0'); // red = 100%
		expect(header).toContain('#1;2;0;100;0'); // green = 100%
	});

	it('should round percentages correctly', () => {
		const palette = new Uint8Array([128, 128, 128]);
		const header = buildPaletteHeader(palette, 1);
		// 128/255 * 100 = 50.2 -> rounds to 50
		expect(header).toContain('#0;2;50;50;50');
	});
});

describe('buildSixelColumn', () => {
	it('should set bits for matching color rows', () => {
		// 3x6 image, color 0 in rows 0 and 2
		const indexMap = new Uint8Array([
			0,
			1,
			2, // row 0
			1,
			1,
			1, // row 1
			0,
			0,
			0, // row 2
			1,
			1,
			1, // row 3
			1,
			1,
			1, // row 4
			1,
			1,
			1, // row 5
		]);
		// Column 0, color 0: rows 0 and 2 match -> bits 0 and 2 -> 0b000101 = 5
		expect(buildSixelColumn(indexMap, 0, 0, 6, 3, 0)).toBe(5);
	});

	it('should handle partial bands', () => {
		const indexMap = new Uint8Array([0, 0, 0]); // 1 row of 3 pixels
		expect(buildSixelColumn(indexMap, 0, 0, 1, 3, 0)).toBe(1); // only bit 0
	});

	it('should return 0 when no rows match', () => {
		const indexMap = new Uint8Array([1, 1, 1, 1, 1, 1]);
		expect(buildSixelColumn(indexMap, 0, 0, 6, 1, 0)).toBe(0);
	});

	it('should return 63 when all 6 rows match', () => {
		const indexMap = new Uint8Array([0, 0, 0, 0, 0, 0]);
		expect(buildSixelColumn(indexMap, 0, 0, 6, 1, 0)).toBe(63);
	});
});

describe('rleEncodeBand', () => {
	it('should RLE compress runs of 3+', () => {
		const values = new Uint8Array([5, 5, 5, 5, 5]);
		const { encoded, hasPixels } = rleEncodeBand(values, 5);
		expect(encoded).toBe('!5D'); // 63+5=68='D', 5 repetitions
		expect(hasPixels).toBe(true);
	});

	it('should not RLE runs of 1-2', () => {
		const values = new Uint8Array([5, 5, 3]);
		const { encoded } = rleEncodeBand(values, 3);
		expect(encoded).toBe('DDB'); // D=68(63+5), B=66(63+3)
	});

	it('should detect no pixels when all zero', () => {
		const values = new Uint8Array([0, 0, 0]);
		const { hasPixels } = rleEncodeBand(values, 3);
		expect(hasPixels).toBe(false);
	});

	it('should handle empty band', () => {
		const { encoded, hasPixels } = rleEncodeBand(new Uint8Array(0), 0);
		expect(encoded).toBe('');
		expect(hasPixels).toBe(false);
	});

	it('should handle mixed runs', () => {
		const values = new Uint8Array([1, 1, 1, 2, 2, 2, 2]);
		const { encoded } = rleEncodeBand(values, 7);
		expect(encoded).toBe('!3@!4A'); // @=64(63+1), A=65(63+2)
	});
});

describe('rawEncodeBand', () => {
	it('should encode without RLE', () => {
		const values = new Uint8Array([5, 5, 5]);
		const { encoded, hasPixels } = rawEncodeBand(values, 3);
		expect(encoded).toBe('DDD');
		expect(hasPixels).toBe(true);
	});

	it('should detect no pixels when all zero', () => {
		const values = new Uint8Array([0, 0]);
		const { hasPixels } = rawEncodeBand(values, 2);
		expect(hasPixels).toBe(false);
	});
});

describe('encodeSixelData', () => {
	it('should encode single-color single-band', () => {
		// 1x6 image, all color 0
		const indexMap = new Uint8Array([0, 0, 0, 0, 0, 0]);
		const data = encodeSixelData(indexMap, 1, 1, 6, true);
		// color 0, all bits set: char 63+63='~', followed by $
		expect(data).toContain('#0~$');
	});

	it('should use band separators for multi-band images', () => {
		// 1x12 image -> 2 bands
		const indexMap = new Uint8Array(12).fill(0);
		const data = encodeSixelData(indexMap, 1, 1, 12, true);
		expect(data).toContain('-');
	});

	it('should handle multiple colors', () => {
		// 2x6 image: column 0 = color 0, column 1 = color 1
		const indexMap = new Uint8Array([0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1]);
		const data = encodeSixelData(indexMap, 2, 2, 6, true);
		expect(data).toContain('#0');
		expect(data).toContain('#1');
	});
});

// =============================================================================
// FULL ENCODING
// =============================================================================

describe('encodeSixelImage', () => {
	it('should produce valid DCS sequence', () => {
		const image = {
			width: 2,
			height: 6,
			data: new Uint8Array([
				255, 0, 0, 255, 0, 255, 0, 255, 255, 0, 0, 255, 0, 255, 0, 255, 255, 0, 0, 255, 0, 255, 0,
				255, 255, 0, 0, 255, 0, 255, 0, 255, 255, 0, 0, 255, 0, 255, 0, 255, 255, 0, 0, 255, 0, 255,
				0, 255,
			]),
			format: 'rgba' as const,
		};
		const seq = encodeSixelImage(image, 256, true);
		expect(seq.startsWith(DCS_START)).toBe(true);
		expect(seq.endsWith(SIXEL_ST)).toBe(true);
	});

	it('should contain palette header', () => {
		const image = {
			width: 1,
			height: 6,
			data: new Uint8Array([
				255, 0, 0, 255, 255, 0, 0, 255, 255, 0, 0, 255, 255, 0, 0, 255, 255, 0, 0, 255, 255, 0, 0,
				255,
			]),
			format: 'rgba' as const,
		};
		const seq = encodeSixelImage(image, 256, true);
		expect(seq).toContain('#0;2;100;0;0');
	});

	it('should handle empty image', () => {
		const image = { width: 0, height: 0, data: new Uint8Array([]), format: 'rgba' as const };
		const seq = encodeSixelImage(image, 256, true);
		expect(seq).toBe(`${DCS_START}${SIXEL_ST}`);
	});

	it('should handle RGB format', () => {
		const image = {
			width: 1,
			height: 6,
			data: new Uint8Array([255, 0, 0, 255, 0, 0, 255, 0, 0, 255, 0, 0, 255, 0, 0, 255, 0, 0]),
			format: 'rgb' as const,
		};
		const seq = encodeSixelImage(image, 256, true);
		expect(seq.startsWith(DCS_START)).toBe(true);
		expect(seq.endsWith(SIXEL_ST)).toBe(true);
		expect(seq).toContain('#0;2;100;0;0');
	});
});

// =============================================================================
// CURSOR POSITIONING
// =============================================================================

describe('cursorPosition', () => {
	it('should format CUP sequence (1-based)', () => {
		expect(cursorPosition(0, 0)).toBe('\x1b[1;1H');
		expect(cursorPosition(9, 4)).toBe('\x1b[5;10H');
	});

	it('should handle large positions', () => {
		expect(cursorPosition(199, 49)).toBe('\x1b[50;200H');
	});
});

// =============================================================================
// DETECTION
// =============================================================================

describe('isSixelSupported', () => {
	it('should detect xterm with XTERM_VERSION', () => {
		const env: SixelEnvChecker = {
			getEnv: (name: string) => {
				if (name === 'TERM_PROGRAM') return 'xterm';
				if (name === 'XTERM_VERSION') return 'XTerm(379)';
				return undefined;
			},
		};
		expect(isSixelSupported(env)).toBe(true);
	});

	it('should not detect xterm without XTERM_VERSION', () => {
		const env: SixelEnvChecker = {
			getEnv: (name: string) => (name === 'TERM_PROGRAM' ? 'xterm' : undefined),
		};
		expect(isSixelSupported(env)).toBe(false);
	});

	it('should detect mlterm via TERM_PROGRAM', () => {
		const env: SixelEnvChecker = {
			getEnv: (name: string) => (name === 'TERM_PROGRAM' ? 'mlterm' : undefined),
		};
		expect(isSixelSupported(env)).toBe(true);
	});

	it('should detect foot terminal', () => {
		const env: SixelEnvChecker = {
			getEnv: (name: string) => (name === 'TERM_PROGRAM' ? 'foot' : undefined),
		};
		expect(isSixelSupported(env)).toBe(true);
	});

	it('should detect contour terminal', () => {
		const env: SixelEnvChecker = {
			getEnv: (name: string) => (name === 'TERM_PROGRAM' ? 'contour' : undefined),
		};
		expect(isSixelSupported(env)).toBe(true);
	});

	it('should detect WezTerm', () => {
		const env: SixelEnvChecker = {
			getEnv: (name: string) => (name === 'TERM_PROGRAM' ? 'WezTerm' : undefined),
		};
		expect(isSixelSupported(env)).toBe(true);
	});

	it('should detect via TERM containing sixel', () => {
		const env: SixelEnvChecker = {
			getEnv: (name: string) => (name === 'TERM' ? 'xterm-sixel' : undefined),
		};
		expect(isSixelSupported(env)).toBe(true);
	});

	it('should detect mlterm via TERM', () => {
		const env: SixelEnvChecker = {
			getEnv: (name: string) => (name === 'TERM' ? 'mlterm' : undefined),
		};
		expect(isSixelSupported(env)).toBe(true);
	});

	it('should return false for unknown terminal', () => {
		const env: SixelEnvChecker = { getEnv: () => undefined };
		expect(isSixelSupported(env)).toBe(false);
	});

	it('should return false for iTerm2', () => {
		const env: SixelEnvChecker = {
			getEnv: (name: string) => (name === 'TERM_PROGRAM' ? 'iTerm.app' : undefined),
		};
		expect(isSixelSupported(env)).toBe(false);
	});
});

// =============================================================================
// RENDER
// =============================================================================

describe('renderSixelImage', () => {
	it('should include cursor positioning', () => {
		const image = {
			width: 1,
			height: 6,
			data: new Uint8Array([
				255, 0, 0, 255, 255, 0, 0, 255, 255, 0, 0, 255, 255, 0, 0, 255, 255, 0, 0, 255, 255, 0, 0,
				255,
			]),
			format: 'rgba' as const,
		};
		const output = renderSixelImage(image, { x: 5, y: 3 }, 256, true);
		expect(output.startsWith('\x1b[4;6H')).toBe(true);
	});

	it('should include sixel sequence', () => {
		const image = {
			width: 1,
			height: 6,
			data: new Uint8Array([
				255, 0, 0, 255, 255, 0, 0, 255, 255, 0, 0, 255, 255, 0, 0, 255, 255, 0, 0, 255, 255, 0, 0,
				255,
			]),
			format: 'rgba' as const,
		};
		const output = renderSixelImage(image, { x: 0, y: 0 }, 256, true);
		expect(output).toContain(DCS_START);
		expect(output).toContain(SIXEL_ST);
	});
});

// =============================================================================
// CLEAR
// =============================================================================

describe('clearSixelImage', () => {
	it('should return empty string without options', () => {
		expect(clearSixelImage()).toBe('');
	});

	it('should generate space-fill for area', () => {
		const output = clearSixelImage({ x: 0, y: 0, width: 3, height: 2 });
		expect(output).toContain('\x1b[1;1H   ');
		expect(output).toContain('\x1b[2;1H   ');
	});
});

// =============================================================================
// BACKEND FACTORY
// =============================================================================

describe('createSixelGraphicsBackend', () => {
	it('should create backend with correct name', () => {
		const backend = createSixelGraphicsBackend();
		expect(backend.name).toBe('sixel');
	});

	it('should have correct capabilities', () => {
		const backend = createSixelGraphicsBackend();
		expect(backend.capabilities.staticImages).toBe(true);
		expect(backend.capabilities.animation).toBe(false);
		expect(backend.capabilities.alphaChannel).toBe(false);
		expect(backend.capabilities.maxWidth).toBeNull();
		expect(backend.capabilities.maxHeight).toBeNull();
	});

	it('should detect support using env checker', () => {
		const footEnv: SixelEnvChecker = {
			getEnv: (name: string) => (name === 'TERM_PROGRAM' ? 'foot' : undefined),
		};
		const backend = createSixelGraphicsBackend(undefined, footEnv);
		expect(backend.isSupported()).toBe(true);

		const unknownEnv: SixelEnvChecker = { getEnv: () => undefined };
		const unsupported = createSixelGraphicsBackend(undefined, unknownEnv);
		expect(unsupported.isSupported()).toBe(false);
	});

	it('should render images', () => {
		const backend = createSixelGraphicsBackend();
		const image = {
			width: 1,
			height: 6,
			data: new Uint8Array([
				255, 0, 0, 255, 255, 0, 0, 255, 255, 0, 0, 255, 255, 0, 0, 255, 255, 0, 0, 255, 255, 0, 0,
				255,
			]),
			format: 'rgba' as const,
		};
		const output = backend.render(image, { x: 0, y: 0 });
		expect(output).toContain(DCS_START);
		expect(output).toContain(SIXEL_ST);
	});

	it('should return empty string for clear (sixel limitation)', () => {
		const backend = createSixelGraphicsBackend();
		expect(backend.clear()).toBe('');
	});

	it('should accept custom config', () => {
		const backend = createSixelGraphicsBackend({ maxColors: 16, rleEnabled: false });
		expect(backend.name).toBe('sixel');
		// Config is internal, but we can verify it still renders
		const image = {
			width: 1,
			height: 6,
			data: new Uint8Array([
				255, 0, 0, 255, 255, 0, 0, 255, 255, 0, 0, 255, 255, 0, 0, 255, 255, 0, 0, 255, 255, 0, 0,
				255,
			]),
			format: 'rgba' as const,
		};
		const output = backend.render(image, { x: 0, y: 0 });
		expect(output).toContain(DCS_START);
	});
});
