/**
 * Vector graphics primitives for terminal rendering using braille characters.
 *
 * Provides a pixel-perfect drawing API that renders to braille Unicode characters
 * (U+2800-U+28FF). Each braille character represents a 2x4 dot grid, allowing
 * high-resolution vector graphics in the terminal.
 *
 * @module terminal/graphics/vector
 */

// =============================================================================
// TYPES
// =============================================================================

/**
 * A canvas for drawing vector graphics using braille characters.
 *
 * The canvas uses a dot-coordinate system where each terminal cell contains
 * a 2x4 grid of dots. Coordinates are specified in dot-space (not cell-space).
 *
 * @example
 * ```typescript
 * import { createBrailleCanvas } from 'blecsd';
 *
 * const canvas = createBrailleCanvas(40, 20);
 * // Canvas has 40x20 cells = 80x80 dots
 * console.log(canvas.widthDots, canvas.heightDots); // 80, 80
 * ```
 */
export interface BrailleCanvas {
	/** Width in terminal cells */
	readonly widthCells: number;
	/** Height in terminal cells */
	readonly heightCells: number;
	/** Width in dots (widthCells * 2) */
	readonly widthDots: number;
	/** Height in dots (heightCells * 4) */
	readonly heightDots: number;
	/** Dot buffer: 1 bit per dot, packed as bytes */
	readonly dots: Uint8Array;
	/** Foreground color per cell (widthCells * heightCells) */
	readonly colors: Uint32Array;
}

/**
 * A single rendered cell with character and color.
 *
 * @example
 * ```typescript
 * import type { RenderedCell } from 'blecsd';
 *
 * const cell: RenderedCell = { char: '⠿', fg: 0xffffff };
 * ```
 */
export interface RenderedCell {
	/** The braille character to display */
	readonly char: string;
	/** Foreground color as packed RGB (0xRRGGBB) */
	readonly fg: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Base Unicode value for braille patterns */
const BRAILLE_BASE = 0x2800;

/**
 * Braille dot bit mapping for a 2x4 grid.
 *
 * Dot layout in each cell:
 * ```
 * Column 0  Column 1
 * ┌──────┬──────┐
 * │ 0x01 │ 0x08 │  Row 0
 * │ 0x02 │ 0x10 │  Row 1
 * │ 0x04 │ 0x20 │  Row 2
 * │ 0x40 │ 0x80 │  Row 3
 * └──────┴──────┘
 * ```
 */
const BRAILLE_DOTS: readonly (readonly [number, number])[] = [
	[0x01, 0x08], // Row 0
	[0x02, 0x10], // Row 1
	[0x04, 0x20], // Row 2
	[0x40, 0x80], // Row 3
] as const;

// =============================================================================
// CANVAS CREATION
// =============================================================================

/**
 * Creates a new braille canvas for vector drawing.
 *
 * @param widthCells - Width in terminal cells
 * @param heightCells - Height in terminal cells
 * @returns A new BrailleCanvas
 *
 * @example
 * ```typescript
 * import { createBrailleCanvas } from 'blecsd';
 *
 * const canvas = createBrailleCanvas(40, 20);
 * // Ready to draw on 80x80 dot grid
 * ```
 */
export function createBrailleCanvas(widthCells: number, heightCells: number): BrailleCanvas {
	const widthDots = widthCells * 2;
	const heightDots = heightCells * 4;
	const totalDots = widthDots * heightDots;
	const totalCells = widthCells * heightCells;

	// Pack dots as bits in bytes (8 dots per byte)
	const dotsBytes = Math.ceil(totalDots / 8);

	return {
		widthCells,
		heightCells,
		widthDots,
		heightDots,
		dots: new Uint8Array(dotsBytes),
		colors: new Uint32Array(totalCells),
	};
}

/**
 * Clears all dots and colors from a canvas.
 *
 * @param canvas - The canvas to clear
 *
 * @example
 * ```typescript
 * import { createBrailleCanvas, clearBrailleCanvas } from 'blecsd';
 *
 * const canvas = createBrailleCanvas(40, 20);
 * // ... draw something ...
 * clearBrailleCanvas(canvas);
 * ```
 */
export function clearBrailleCanvas(canvas: BrailleCanvas): void {
	canvas.dots.fill(0);
	canvas.colors.fill(0);
}

// =============================================================================
// DOT-LEVEL OPERATIONS
// =============================================================================

/**
 * Sets a single dot at the given dot coordinates.
 *
 * @param canvas - The canvas to modify
 * @param x - X coordinate in dot-space (0 to widthDots-1)
 * @param y - Y coordinate in dot-space (0 to heightDots-1)
 *
 * @example
 * ```typescript
 * import { createBrailleCanvas, setDot } from 'blecsd';
 *
 * const canvas = createBrailleCanvas(40, 20);
 * setDot(canvas, 10, 10); // Set dot at (10, 10)
 * ```
 */
export function setDot(canvas: BrailleCanvas, x: number, y: number): void {
	if (x < 0 || x >= canvas.widthDots || y < 0 || y >= canvas.heightDots) {
		return;
	}

	const dotIndex = y * canvas.widthDots + x;
	const byteIndex = Math.floor(dotIndex / 8);
	const bitIndex = dotIndex % 8;
	const byte = canvas.dots[byteIndex];

	if (byte !== undefined) {
		canvas.dots[byteIndex] = byte | (1 << bitIndex);
	}
}

/**
 * Clears a single dot at the given dot coordinates.
 *
 * @param canvas - The canvas to modify
 * @param x - X coordinate in dot-space
 * @param y - Y coordinate in dot-space
 *
 * @example
 * ```typescript
 * import { createBrailleCanvas, setDot, clearDot } from 'blecsd';
 *
 * const canvas = createBrailleCanvas(40, 20);
 * setDot(canvas, 10, 10);
 * clearDot(canvas, 10, 10); // Dot is now off
 * ```
 */
export function clearDot(canvas: BrailleCanvas, x: number, y: number): void {
	if (x < 0 || x >= canvas.widthDots || y < 0 || y >= canvas.heightDots) {
		return;
	}

	const dotIndex = y * canvas.widthDots + x;
	const byteIndex = Math.floor(dotIndex / 8);
	const bitIndex = dotIndex % 8;
	const byte = canvas.dots[byteIndex];

	if (byte !== undefined) {
		canvas.dots[byteIndex] = byte & ~(1 << bitIndex);
	}
}

/**
 * Gets the state of a single dot.
 *
 * @param canvas - The canvas to read from
 * @param x - X coordinate in dot-space
 * @param y - Y coordinate in dot-space
 * @returns True if the dot is set, false otherwise
 *
 * @example
 * ```typescript
 * import { createBrailleCanvas, setDot, getDot } from 'blecsd';
 *
 * const canvas = createBrailleCanvas(40, 20);
 * setDot(canvas, 10, 10);
 * console.log(getDot(canvas, 10, 10)); // true
 * console.log(getDot(canvas, 11, 11)); // false
 * ```
 */
export function getDot(canvas: BrailleCanvas, x: number, y: number): boolean {
	if (x < 0 || x >= canvas.widthDots || y < 0 || y >= canvas.heightDots) {
		return false;
	}

	const dotIndex = y * canvas.widthDots + x;
	const byteIndex = Math.floor(dotIndex / 8);
	const bitIndex = dotIndex % 8;

	return ((canvas.dots[byteIndex] ?? 0) & (1 << bitIndex)) !== 0;
}

/**
 * Sets the foreground color for a specific cell.
 *
 * @param canvas - The canvas to modify
 * @param cellX - Cell X coordinate (0 to widthCells-1)
 * @param cellY - Cell Y coordinate (0 to heightCells-1)
 * @param color - Packed RGB color (0xRRGGBB)
 *
 * @example
 * ```typescript
 * import { createBrailleCanvas, setCellColor } from 'blecsd';
 *
 * const canvas = createBrailleCanvas(40, 20);
 * setCellColor(canvas, 5, 10, 0xff0000); // Set cell (5, 10) to red
 * ```
 */
export function setCellColor(
	canvas: BrailleCanvas,
	cellX: number,
	cellY: number,
	color: number,
): void {
	if (cellX < 0 || cellX >= canvas.widthCells || cellY < 0 || cellY >= canvas.heightCells) {
		return;
	}

	const cellIndex = cellY * canvas.widthCells + cellX;
	if (cellIndex >= 0 && cellIndex < canvas.colors.length) {
		canvas.colors[cellIndex] = color;
	}
}

// =============================================================================
// DRAWING PRIMITIVES
// =============================================================================

/**
 * Draws a line using Bresenham's line algorithm.
 *
 * @param canvas - The canvas to draw on
 * @param x1 - Start X coordinate in dot-space
 * @param y1 - Start Y coordinate in dot-space
 * @param x2 - End X coordinate in dot-space
 * @param y2 - End Y coordinate in dot-space
 * @param color - Optional color to apply to affected cells
 *
 * @example
 * ```typescript
 * import { createBrailleCanvas, drawLine } from 'blecsd';
 *
 * const canvas = createBrailleCanvas(40, 20);
 * drawLine(canvas, 0, 0, 79, 79, 0xff0000); // Diagonal red line
 * ```
 */
export function drawLine(
	canvas: BrailleCanvas,
	x1: number,
	y1: number,
	x2: number,
	y2: number,
	color?: number,
): void {
	const dx = Math.abs(x2 - x1);
	const dy = Math.abs(y2 - y1);
	const sx = x1 < x2 ? 1 : -1;
	const sy = y1 < y2 ? 1 : -1;
	let err = dx - dy;

	let x = Math.round(x1);
	let y = Math.round(y1);
	const endX = Math.round(x2);
	const endY = Math.round(y2);

	while (true) {
		setDot(canvas, x, y);
		if (color !== undefined) {
			const { cellX, cellY } = dotToCell(x, y);
			setCellColor(canvas, cellX, cellY, color);
		}

		if (x === endX && y === endY) break;

		const e2 = 2 * err;
		if (e2 > -dy) {
			err -= dy;
			x += sx;
		}
		if (e2 < dx) {
			err += dx;
			y += sy;
		}
	}
}

/**
 * Draws a rectangle outline.
 *
 * @param canvas - The canvas to draw on
 * @param x - Top-left X coordinate in dot-space
 * @param y - Top-left Y coordinate in dot-space
 * @param w - Width in dots
 * @param h - Height in dots
 * @param color - Optional color to apply to affected cells
 *
 * @example
 * ```typescript
 * import { createBrailleCanvas, drawRect } from 'blecsd';
 *
 * const canvas = createBrailleCanvas(40, 20);
 * drawRect(canvas, 10, 10, 30, 20, 0x00ff00); // Green rectangle
 * ```
 */
export function drawRect(
	canvas: BrailleCanvas,
	x: number,
	y: number,
	w: number,
	h: number,
	color?: number,
): void {
	if (w <= 0 || h <= 0) return;

	const x2 = x + w - 1;
	const y2 = y + h - 1;

	// Draw four lines forming the rectangle
	drawLine(canvas, x, y, x2, y, color); // Top
	drawLine(canvas, x2, y, x2, y2, color); // Right
	drawLine(canvas, x2, y2, x, y2, color); // Bottom
	drawLine(canvas, x, y2, x, y, color); // Left
}

/**
 * Draws a filled rectangle.
 *
 * @param canvas - The canvas to draw on
 * @param x - Top-left X coordinate in dot-space
 * @param y - Top-left Y coordinate in dot-space
 * @param w - Width in dots
 * @param h - Height in dots
 * @param color - Optional color to apply to affected cells
 *
 * @example
 * ```typescript
 * import { createBrailleCanvas, fillRect } from 'blecsd';
 *
 * const canvas = createBrailleCanvas(40, 20);
 * fillRect(canvas, 10, 10, 30, 20, 0x0000ff); // Blue filled rectangle
 * ```
 */
export function fillRect(
	canvas: BrailleCanvas,
	x: number,
	y: number,
	w: number,
	h: number,
	color?: number,
): void {
	if (w <= 0 || h <= 0) return;

	const x1 = Math.round(x);
	const y1 = Math.round(y);
	const x2 = Math.round(x + w);
	const y2 = Math.round(y + h);

	for (let py = y1; py < y2; py++) {
		for (let px = x1; px < x2; px++) {
			setDot(canvas, px, py);
			if (color !== undefined) {
				const { cellX, cellY } = dotToCell(px, py);
				setCellColor(canvas, cellX, cellY, color);
			}
		}
	}
}

/**
 * Draws a circle outline using the Midpoint Circle Algorithm.
 *
 * @param canvas - The canvas to draw on
 * @param cx - Center X coordinate in dot-space
 * @param cy - Center Y coordinate in dot-space
 * @param r - Radius in dots
 * @param color - Optional color to apply to affected cells
 *
 * @example
 * ```typescript
 * import { createBrailleCanvas, drawCircle } from 'blecsd';
 *
 * const canvas = createBrailleCanvas(40, 20);
 * drawCircle(canvas, 40, 40, 20, 0xff00ff); // Magenta circle
 * ```
 */
export function drawCircle(
	canvas: BrailleCanvas,
	cx: number,
	cy: number,
	r: number,
	color?: number,
): void {
	if (r <= 0) return;

	const centerX = Math.round(cx);
	const centerY = Math.round(cy);
	const radius = Math.round(r);

	let x = 0;
	let y = radius;
	let d = 1 - radius;

	const plotOctants = (dx: number, dy: number): void => {
		const points: Array<[number, number]> = [
			[centerX + dx, centerY + dy],
			[centerX - dx, centerY + dy],
			[centerX + dx, centerY - dy],
			[centerX - dx, centerY - dy],
			[centerX + dy, centerY + dx],
			[centerX - dy, centerY + dx],
			[centerX + dy, centerY - dx],
			[centerX - dy, centerY - dx],
		];

		for (const [px, py] of points) {
			setDot(canvas, px, py);
			if (color !== undefined) {
				const { cellX, cellY } = dotToCell(px, py);
				setCellColor(canvas, cellX, cellY, color);
			}
		}
	};

	plotOctants(x, y);

	while (x < y) {
		x++;
		if (d < 0) {
			d += 2 * x + 1;
		} else {
			y--;
			d += 2 * (x - y) + 1;
		}
		plotOctants(x, y);
	}
}

/**
 * Draws a filled circle using scanline fill.
 *
 * @param canvas - The canvas to draw on
 * @param cx - Center X coordinate in dot-space
 * @param cy - Center Y coordinate in dot-space
 * @param r - Radius in dots
 * @param color - Optional color to apply to affected cells
 *
 * @example
 * ```typescript
 * import { createBrailleCanvas, fillCircle } from 'blecsd';
 *
 * const canvas = createBrailleCanvas(40, 20);
 * fillCircle(canvas, 40, 40, 20, 0xffff00); // Yellow filled circle
 * ```
 */
export function fillCircle(
	canvas: BrailleCanvas,
	cx: number,
	cy: number,
	r: number,
	color?: number,
): void {
	if (r <= 0) return;

	const centerX = Math.round(cx);
	const centerY = Math.round(cy);
	const radius = Math.round(r);
	const radiusSq = radius * radius;

	for (let y = -radius; y <= radius; y++) {
		const dy = y * y;
		const w = Math.floor(Math.sqrt(radiusSq - dy));
		for (let x = -w; x <= w; x++) {
			const px = centerX + x;
			const py = centerY + y;
			setDot(canvas, px, py);
			if (color !== undefined) {
				const { cellX, cellY } = dotToCell(px, py);
				setCellColor(canvas, cellX, cellY, color);
			}
		}
	}
}

/**
 * Draws an arc segment of a circle.
 *
 * @param canvas - The canvas to draw on
 * @param cx - Center X coordinate in dot-space
 * @param cy - Center Y coordinate in dot-space
 * @param r - Radius in dots
 * @param startAngle - Start angle in radians
 * @param endAngle - End angle in radians
 * @param color - Optional color to apply to affected cells
 *
 * @example
 * ```typescript
 * import { createBrailleCanvas, drawArc } from 'blecsd';
 *
 * const canvas = createBrailleCanvas(40, 20);
 * // Draw quarter circle (top-right quadrant)
 * drawArc(canvas, 40, 40, 20, 0, Math.PI / 2, 0x00ffff);
 * ```
 */
export function drawArc(
	canvas: BrailleCanvas,
	cx: number,
	cy: number,
	r: number,
	startAngle: number,
	endAngle: number,
	color?: number,
): void {
	if (r <= 0) return;

	const centerX = Math.round(cx);
	const centerY = Math.round(cy);
	const radius = Math.round(r);

	// Normalize angles to 0-2π range
	const normalizeAngle = (a: number): number => {
		const tau = 2 * Math.PI;
		return ((a % tau) + tau) % tau;
	};

	const start = normalizeAngle(startAngle);
	const end = normalizeAngle(endAngle);

	// Sample points along the arc
	const steps = Math.max(Math.ceil(radius * Math.abs(end - start)), 2);
	const angleStep = (end - start) / steps;

	for (let i = 0; i <= steps; i++) {
		const angle = start + i * angleStep;
		const x = centerX + Math.round(radius * Math.cos(angle));
		const y = centerY + Math.round(radius * Math.sin(angle));

		setDot(canvas, x, y);
		if (color !== undefined) {
			const { cellX, cellY } = dotToCell(x, y);
			setCellColor(canvas, cellX, cellY, color);
		}
	}
}

/**
 * Evaluates a cubic Bezier curve at parameter t.
 */
function evaluateBezier(
	p0: readonly [number, number],
	p1: readonly [number, number],
	p2: readonly [number, number],
	p3: readonly [number, number],
	t: number,
): { x: number; y: number } {
	const t1 = 1 - t;
	const t1sq = t1 * t1;
	const t1cb = t1sq * t1;
	const tsq = t * t;
	const tcb = tsq * t;

	const x =
		t1cb * (p0[0] ?? 0) +
		3 * t1sq * t * (p1[0] ?? 0) +
		3 * t1 * tsq * (p2[0] ?? 0) +
		tcb * (p3[0] ?? 0);
	const y =
		t1cb * (p0[1] ?? 0) +
		3 * t1sq * t * (p1[1] ?? 0) +
		3 * t1 * tsq * (p2[1] ?? 0) +
		tcb * (p3[1] ?? 0);

	return { x: Math.round(x), y: Math.round(y) };
}

/**
 * Calculates approximate length of a Bezier curve from control points.
 */
function calculateBezierLength(
	p0: readonly [number, number],
	p1: readonly [number, number],
	p2: readonly [number, number],
	p3: readonly [number, number],
): number {
	const dx1 = (p1[0] ?? 0) - (p0[0] ?? 0);
	const dy1 = (p1[1] ?? 0) - (p0[1] ?? 0);
	const dx2 = (p2[0] ?? 0) - (p1[0] ?? 0);
	const dy2 = (p2[1] ?? 0) - (p1[1] ?? 0);
	const dx3 = (p3[0] ?? 0) - (p2[0] ?? 0);
	const dy3 = (p3[1] ?? 0) - (p2[1] ?? 0);

	return (
		Math.sqrt(dx1 * dx1 + dy1 * dy1) +
		Math.sqrt(dx2 * dx2 + dy2 * dy2) +
		Math.sqrt(dx3 * dx3 + dy3 * dy3)
	);
}

/**
 * Draws a cubic Bezier curve using De Casteljau's algorithm.
 *
 * @param canvas - The canvas to draw on
 * @param points - Array of [x, y] control points (must have exactly 4 points)
 * @param color - Optional color to apply to affected cells
 *
 * @example
 * ```typescript
 * import { createBrailleCanvas, drawBezier } from 'blecsd';
 *
 * const canvas = createBrailleCanvas(40, 20);
 * drawBezier(canvas, [
 *   [0, 0],    // Start point
 *   [20, 40],  // Control point 1
 *   [60, 40],  // Control point 2
 *   [80, 0],   // End point
 * ], 0xff8800);
 * ```
 */
export function drawBezier(
	canvas: BrailleCanvas,
	points: readonly (readonly [number, number])[],
	color?: number,
): void {
	if (points.length !== 4) {
		return;
	}

	const p0 = points[0];
	const p1 = points[1];
	const p2 = points[2];
	const p3 = points[3];

	if (!p0 || !p1 || !p2 || !p3) return;

	const approxLength = calculateBezierLength(p0, p1, p2, p3);
	const steps = Math.max(Math.ceil(approxLength), 2);

	let prevX = Math.round(p0[0] ?? 0);
	let prevY = Math.round(p0[1] ?? 0);
	setDot(canvas, prevX, prevY);
	if (color !== undefined) {
		const { cellX, cellY } = dotToCell(prevX, prevY);
		setCellColor(canvas, cellX, cellY, color);
	}

	for (let i = 1; i <= steps; i++) {
		const t = i / steps;
		const { x: px, y: py } = evaluateBezier(p0, p1, p2, p3, t);

		drawLine(canvas, prevX, prevY, px, py, color);

		prevX = px;
		prevY = py;
	}
}

/**
 * Draws an ellipse outline.
 *
 * @param canvas - The canvas to draw on
 * @param cx - Center X coordinate in dot-space
 * @param cy - Center Y coordinate in dot-space
 * @param rx - Horizontal radius in dots
 * @param ry - Vertical radius in dots
 * @param color - Optional color to apply to affected cells
 *
 * @example
 * ```typescript
 * import { createBrailleCanvas, drawEllipse } from 'blecsd';
 *
 * const canvas = createBrailleCanvas(40, 20);
 * drawEllipse(canvas, 40, 40, 30, 15, 0xff0088);
 * ```
 */
export function drawEllipse(
	canvas: BrailleCanvas,
	cx: number,
	cy: number,
	rx: number,
	ry: number,
	color?: number,
): void {
	if (rx <= 0 || ry <= 0) return;

	const centerX = Math.round(cx);
	const centerY = Math.round(cy);
	const radiusX = Math.round(rx);
	const radiusY = Math.round(ry);

	// Use parametric equation and sample points
	const steps = Math.max(Math.ceil(2 * Math.PI * Math.max(radiusX, radiusY)), 8);
	const angleStep = (2 * Math.PI) / steps;

	let prevX = centerX + radiusX;
	let prevY = centerY;

	for (let i = 1; i <= steps; i++) {
		const angle = i * angleStep;
		const x = centerX + Math.round(radiusX * Math.cos(angle));
		const y = centerY + Math.round(radiusY * Math.sin(angle));

		drawLine(canvas, prevX, prevY, x, y, color);

		prevX = x;
		prevY = y;
	}
}

// =============================================================================
// OUTPUT CONVERSION
// =============================================================================

/**
 * Builds a braille pattern value for a specific cell.
 */
function buildBraillePattern(canvas: BrailleCanvas, cellX: number, cellY: number): number {
	let pattern = 0;
	for (let dy = 0; dy < 4; dy++) {
		for (let dx = 0; dx < 2; dx++) {
			const dotX = cellX * 2 + dx;
			const dotY = cellY * 4 + dy;
			if (getDot(canvas, dotX, dotY)) {
				const row = BRAILLE_DOTS[dy];
				if (row) {
					pattern |= row[dx] ?? 0;
				}
			}
		}
	}
	return pattern;
}

/**
 * Formats a cell with ANSI color codes.
 */
function formatCellWithColor(char: string, color: number): string {
	if (color === 0) {
		return char;
	}

	const r = (color >> 16) & 0xff;
	const g = (color >> 8) & 0xff;
	const b = color & 0xff;

	return `\x1b[38;2;${r};${g};${b}m${char}\x1b[0m`;
}

/**
 * Converts a braille canvas to an ANSI string with colors.
 *
 * @param canvas - The canvas to convert
 * @returns ANSI string with braille characters and color codes
 *
 * @example
 * ```typescript
 * import { createBrailleCanvas, drawCircle, canvasToString } from 'blecsd';
 *
 * const canvas = createBrailleCanvas(40, 20);
 * drawCircle(canvas, 40, 40, 20, 0xff0000);
 * const output = canvasToString(canvas);
 * process.stdout.write(output);
 * ```
 */
export function canvasToString(canvas: BrailleCanvas): string {
	const lines: string[] = [];

	for (let cellY = 0; cellY < canvas.heightCells; cellY++) {
		let line = '';
		for (let cellX = 0; cellX < canvas.widthCells; cellX++) {
			const pattern = buildBraillePattern(canvas, cellX, cellY);
			const char = String.fromCharCode(BRAILLE_BASE + pattern);

			const cellIndex = cellY * canvas.widthCells + cellX;
			const color = canvas.colors[cellIndex] ?? 0;

			line += formatCellWithColor(char, color);
		}
		lines.push(line);
	}

	return lines.join('\n');
}

/**
 * Converts a braille canvas to a 2D cell grid.
 *
 * @param canvas - The canvas to convert
 * @returns 2D array of cells (indexed as cells[row][col])
 *
 * @example
 * ```typescript
 * import { createBrailleCanvas, drawRect, canvasToCells } from 'blecsd';
 *
 * const canvas = createBrailleCanvas(40, 20);
 * drawRect(canvas, 10, 10, 30, 20, 0x00ff00);
 * const cells = canvasToCells(canvas);
 * console.log(cells[0][0]); // { char: '⠀', fg: 0 }
 * ```
 */
export function canvasToCells(canvas: BrailleCanvas): readonly (readonly RenderedCell[])[] {
	const cells: RenderedCell[][] = [];

	for (let cellY = 0; cellY < canvas.heightCells; cellY++) {
		const row: RenderedCell[] = [];
		for (let cellX = 0; cellX < canvas.widthCells; cellX++) {
			const pattern = buildBraillePattern(canvas, cellX, cellY);
			const char = String.fromCharCode(BRAILLE_BASE + pattern);
			const cellIndex = cellY * canvas.widthCells + cellX;
			const fg = canvas.colors[cellIndex] ?? 0;

			row.push({ char, fg });
		}
		cells.push(row);
	}

	return cells;
}

// =============================================================================
// COORDINATE HELPERS
// =============================================================================

/**
 * Converts dot coordinates to cell coordinates.
 *
 * @param dotX - X coordinate in dot-space
 * @param dotY - Y coordinate in dot-space
 * @returns Cell coordinates { cellX, cellY }
 *
 * @example
 * ```typescript
 * import { dotToCell } from 'blecsd';
 *
 * const { cellX, cellY } = dotToCell(5, 10);
 * console.log(cellX, cellY); // 2, 2
 * ```
 */
export function dotToCell(dotX: number, dotY: number): { cellX: number; cellY: number } {
	return {
		cellX: Math.floor(dotX / 2),
		cellY: Math.floor(dotY / 4),
	};
}

/**
 * Converts cell coordinates to the top-left dot coordinate of that cell.
 *
 * @param cellX - X coordinate in cell-space
 * @param cellY - Y coordinate in cell-space
 * @returns Dot coordinates { dotX, dotY }
 *
 * @example
 * ```typescript
 * import { cellToDot } from 'blecsd';
 *
 * const { dotX, dotY } = cellToDot(2, 2);
 * console.log(dotX, dotY); // 4, 8
 * ```
 */
export function cellToDot(cellX: number, cellY: number): { dotX: number; dotY: number } {
	return {
		dotX: cellX * 2,
		dotY: cellY * 4,
	};
}
