/**
 * 3D Rasterizer Benchmarks
 *
 * Measures line drawing, triangle fill, and buffer operation throughput.
 *
 * Run with: pnpm bench src/benchmarks/3d-raster.bench.ts
 *
 * @module benchmarks/3d-raster
 */

import { bench, describe } from 'vitest';
import { clearFramebuffer, createPixelFramebuffer } from '../3d/rasterizer/pixelBuffer';
import { drawLine, drawLineDepth } from '../3d/rasterizer/line';
import { fillTriangle, fillTriangleFlat } from '../3d/rasterizer/triangle';

// =============================================================================
// SETUP
// =============================================================================

const fb400x200 = createPixelFramebuffer({ width: 400, height: 200 });
const fb800x400 = createPixelFramebuffer({ width: 800, height: 400 });

function randomInt(min: number, max: number): number {
	return Math.floor(Math.random() * (max - min)) + min;
}

// Pre-generate random line endpoints
const LINE_COUNT = 10000;
const lines = Array.from({ length: LINE_COUNT }, () => ({
	x0: randomInt(0, 400),
	y0: randomInt(0, 200),
	x1: randomInt(0, 400),
	y1: randomInt(0, 200),
}));

const TRI_COUNT = 1000;
const triangles = Array.from({ length: TRI_COUNT }, () => ({
	v0: { x: randomInt(0, 400), y: randomInt(0, 200), depth: Math.random(), r: randomInt(0, 255), g: randomInt(0, 255), b: randomInt(0, 255) },
	v1: { x: randomInt(0, 400), y: randomInt(0, 200), depth: Math.random(), r: randomInt(0, 255), g: randomInt(0, 255), b: randomInt(0, 255) },
	v2: { x: randomInt(0, 400), y: randomInt(0, 200), depth: Math.random(), r: randomInt(0, 255), g: randomInt(0, 255), b: randomInt(0, 255) },
}));

// =============================================================================
// LINE BENCHMARKS
// =============================================================================

describe('Line Rasterization', () => {
	bench('10K random lines on 400x200 buffer', () => {
		for (let i = 0; i < LINE_COUNT; i++) {
			const l = lines[i]!;
			drawLine(fb400x200, l.x0, l.y0, l.x1, l.y1, 255, 255, 255);
		}
	});

	bench('10K horizontal lines', () => {
		for (let i = 0; i < LINE_COUNT; i++) {
			const y = i % 200;
			drawLine(fb400x200, 0, y, 399, y, 255, 255, 255);
		}
	});

	bench('10K lines with depth', () => {
		for (let i = 0; i < LINE_COUNT; i++) {
			const l = lines[i]!;
			drawLineDepth(
				fb400x200,
				{ x: l.x0, y: l.y0, depth: 0.2, r: 255, g: 255, b: 255 },
				{ x: l.x1, y: l.y1, depth: 0.8, r: 255, g: 255, b: 255 },
			);
		}
	});
});

// =============================================================================
// TRIANGLE BENCHMARKS
// =============================================================================

describe('Triangle Rasterization', () => {
	bench('1K random triangles on 400x200 buffer', () => {
		for (let i = 0; i < TRI_COUNT; i++) {
			const t = triangles[i]!;
			fillTriangle(fb400x200, t.v0, t.v1, t.v2);
		}
	});

	bench('1K triangles with depth test', () => {
		clearFramebuffer(fb400x200, undefined, 1.0);
		for (let i = 0; i < TRI_COUNT; i++) {
			const t = triangles[i]!;
			fillTriangle(fb400x200, t.v0, t.v1, t.v2);
		}
	});

	bench('1K flat-color triangles', () => {
		const color = { r: 200, g: 100, b: 50, a: 255 };
		for (let i = 0; i < TRI_COUNT; i++) {
			const t = triangles[i]!;
			fillTriangleFlat(fb400x200, t.v0, t.v1, t.v2, color);
		}
	});
});

// =============================================================================
// BUFFER OPERATION BENCHMARKS
// =============================================================================

describe('Buffer Operations', () => {
	bench('clear 400x200 buffer', () => {
		clearFramebuffer(fb400x200);
	});

	bench('clear 400x200 buffer with color', () => {
		clearFramebuffer(fb400x200, { r: 0, g: 0, b: 0, a: 255 });
	});

	bench('clear 800x400 buffer', () => {
		clearFramebuffer(fb800x400);
	});
});
