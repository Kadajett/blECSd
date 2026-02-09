/**
 * Canvas Widget
 *
 * A widget for drawing custom shapes and pixels using Unicode braille characters.
 * Each character represents a 2x4 grid of dots, providing 2x resolution compared
 * to regular text characters.
 *
 * @module widgets/canvas
 */

import { z } from 'zod';
import { appendChild } from '../components/hierarchy';
import { setPosition } from '../components/position';
import { markDirty, setStyle } from '../components/renderable';
import { addEntity } from '../core/ecs';
import type { Entity, World } from '../core/types';
import { parseColor } from '../utils/color';
import { createBox } from './box';
import { BRAILLE_BASE, BRAILLE_DOTS } from './chartUtils';
import { createText, setTextContent } from './text';

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Canvas component marker for identifying canvas entities.
 */
export const Canvas = {
	/** Tag indicating this is a canvas widget (1 = yes) */
	isCanvas: new Uint8Array(DEFAULT_CAPACITY),
};

// =============================================================================
// TYPES
// =============================================================================

/**
 * Canvas widget configuration.
 *
 * @example
 * ```typescript
 * import { createCanvas } from 'blecsd';
 *
 * const canvas = createCanvas(world, eid, {
 *   width: 40,  // 40 braille dots wide (20 characters)
 *   height: 80, // 80 braille dots high (20 character rows)
 *   fg: '#FFFFFF',
 *   bg: '#000000'
 * });
 *
 * // Draw shapes
 * setPixel(canvas, 10, 10, true);
 * drawLine(canvas, 0, 0, 39, 79);
 * drawRect(canvas, 10, 10, 20, 30);
 * drawCircle(canvas, 20, 40, 15);
 * ```
 */
export interface CanvasConfig {
	/**
	 * Canvas width in braille dots (2 dots per character width)
	 * @default 40
	 */
	readonly width?: number;

	/**
	 * Canvas height in braille dots (4 dots per character height)
	 * @default 40
	 */
	readonly height?: number;

	/**
	 * Foreground color for drawn pixels
	 * @default undefined
	 */
	readonly fg?: string | number;

	/**
	 * Background color
	 * @default undefined
	 */
	readonly bg?: string | number;

	/**
	 * Initial fill character
	 * @default ' '
	 */
	readonly fillChar?: string;
}

/**
 * Canvas widget interface.
 */
export interface CanvasWidget {
	readonly entity: Entity;
	readonly world: World;
	readonly widthDots: number;
	readonly heightDots: number;
}

// =============================================================================
// SCHEMA
// =============================================================================

export const CanvasConfigSchema = z.object({
	width: z.number().int().positive().optional().default(40),
	height: z.number().int().positive().optional().default(40),
	fg: z.union([z.string(), z.number()]).optional(),
	bg: z.union([z.string(), z.number()]).optional(),
	fillChar: z.string().length(1).optional().default(' '),
});

type ValidatedCanvasConfig = z.infer<typeof CanvasConfigSchema>;

// =============================================================================
// STATE
// =============================================================================

interface CanvasState {
	world: World;
	entity: Entity;
	textEntity: Entity;
	widthDots: number;
	heightDots: number;
	widthChars: number;
	heightChars: number;
	pixels: Uint8Array; // Braille dot state (8 dots per character)
}

const canvasStateMap = new Map<Entity, CanvasState>();

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Converts dot coordinates to character coordinates and local dot position.
 */
function dotToChar(
	x: number,
	y: number,
): { charX: number; charY: number; col: number; row: number } {
	const charX = Math.floor(x / 2);
	const charY = Math.floor(y / 4);
	const col = x % 2;
	const row = y % 4;
	return { charX, charY, col, row };
}

/**
 * Gets the index in the pixels array for a character position.
 */
function getCharIndex(state: CanvasState, charX: number, charY: number): number {
	return charY * state.widthChars + charX;
}

/**
 * Converts the pixel state to a renderable string.
 */
function renderCanvas(state: CanvasState): string {
	const lines: string[] = [];

	for (let y = 0; y < state.heightChars; y++) {
		let line = '';
		for (let x = 0; x < state.widthChars; x++) {
			const idx = getCharIndex(state, x, y);
			const bits = state.pixels[idx] ?? 0;
			line += String.fromCharCode(BRAILLE_BASE | bits);
		}
		lines.push(line);
	}

	return lines.join('\n');
}

/**
 * Updates the canvas display.
 */
function updateCanvas(state: CanvasState): void {
	const content = renderCanvas(state);
	setTextContent(state.world, state.textEntity, content);
	markDirty(state.world, state.entity);
}

// =============================================================================
// DRAWING API
// =============================================================================

/**
 * Sets or clears a single pixel (braille dot) on the canvas.
 *
 * @param canvas - The canvas widget
 * @param x - X coordinate in braille dots
 * @param y - Y coordinate in braille dots
 * @param on - True to set the pixel, false to clear it (default: true)
 *
 * @example
 * ```typescript
 * setPixel(canvas, 10, 10, true);  // Set pixel
 * setPixel(canvas, 10, 11, false); // Clear pixel
 * ```
 */
export function setPixel(canvas: CanvasWidget, x: number, y: number, on = true): void {
	const state = canvasStateMap.get(canvas.entity);
	if (!state) return;

	// Bounds check
	if (x < 0 || x >= state.widthDots || y < 0 || y >= state.heightDots) {
		return;
	}

	const { charX, charY, col, row } = dotToChar(x, y);
	const idx = getCharIndex(state, charX, charY);

	const rowDots = BRAILLE_DOTS[row];
	if (!rowDots) return;
	const dotBit = rowDots[col] ?? 0;

	if (on) {
		state.pixels[idx] = (state.pixels[idx] ?? 0) | dotBit;
	} else {
		state.pixels[idx] = (state.pixels[idx] ?? 0) & ~dotBit;
	}

	updateCanvas(state);
}

/**
 * Draws a line between two points using Bresenham's algorithm.
 *
 * @param canvas - The canvas widget
 * @param x1 - Start X coordinate
 * @param y1 - Start Y coordinate
 * @param x2 - End X coordinate
 * @param y2 - End Y coordinate
 *
 * @example
 * ```typescript
 * drawLine(canvas, 0, 0, 39, 39); // Diagonal line
 * ```
 */
export function drawLine(
	canvas: CanvasWidget,
	x1: number,
	y1: number,
	x2: number,
	y2: number,
): void {
	const dx = Math.abs(x2 - x1);
	const dy = Math.abs(y2 - y1);
	const sx = x1 < x2 ? 1 : -1;
	const sy = y1 < y2 ? 1 : -1;
	let err = dx - dy;

	let x = x1;
	let y = y1;

	while (true) {
		setPixel(canvas, x, y, true);

		if (x === x2 && y === y2) break;

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
 * Draws a rectangle on the canvas.
 *
 * @param canvas - The canvas widget
 * @param x - Top-left X coordinate
 * @param y - Top-left Y coordinate
 * @param width - Rectangle width in dots
 * @param height - Rectangle height in dots
 * @param fill - If true, fill the rectangle; otherwise just draw outline (default: false)
 *
 * @example
 * ```typescript
 * drawRect(canvas, 10, 10, 20, 30);       // Outline
 * drawRect(canvas, 10, 10, 20, 30, true); // Filled
 * ```
 */
export function drawRect(
	canvas: CanvasWidget,
	x: number,
	y: number,
	width: number,
	height: number,
	fill = false,
): void {
	if (fill) {
		// Fill rectangle
		for (let dy = 0; dy < height; dy++) {
			for (let dx = 0; dx < width; dx++) {
				setPixel(canvas, x + dx, y + dy, true);
			}
		}
	} else {
		// Draw outline
		// Top and bottom edges
		for (let dx = 0; dx < width; dx++) {
			setPixel(canvas, x + dx, y, true);
			setPixel(canvas, x + dx, y + height - 1, true);
		}
		// Left and right edges
		for (let dy = 0; dy < height; dy++) {
			setPixel(canvas, x, y + dy, true);
			setPixel(canvas, x + width - 1, y + dy, true);
		}
	}
}

/**
 * Draws a circle using the midpoint circle algorithm.
 *
 * @param canvas - The canvas widget
 * @param cx - Center X coordinate
 * @param cy - Center Y coordinate
 * @param radius - Circle radius in dots
 * @param fill - If true, fill the circle; otherwise just draw outline (default: false)
 *
 * @example
 * ```typescript
 * drawCircle(canvas, 20, 20, 10);       // Outline
 * drawCircle(canvas, 20, 20, 10, true); // Filled
 * ```
 */
export function drawCircle(
	canvas: CanvasWidget,
	cx: number,
	cy: number,
	radius: number,
	fill = false,
): void {
	if (fill) {
		// Filled circle - draw horizontal lines for each y
		for (let y = -radius; y <= radius; y++) {
			const width = Math.floor(Math.sqrt(radius * radius - y * y));
			for (let x = -width; x <= width; x++) {
				setPixel(canvas, cx + x, cy + y, true);
			}
		}
	} else {
		// Midpoint circle algorithm for outline
		let x = radius;
		let y = 0;
		let err = 0;

		while (x >= y) {
			// Draw 8 octants
			setPixel(canvas, cx + x, cy + y, true);
			setPixel(canvas, cx + y, cy + x, true);
			setPixel(canvas, cx - y, cy + x, true);
			setPixel(canvas, cx - x, cy + y, true);
			setPixel(canvas, cx - x, cy - y, true);
			setPixel(canvas, cx - y, cy - x, true);
			setPixel(canvas, cx + y, cy - x, true);
			setPixel(canvas, cx + x, cy - y, true);

			if (err <= 0) {
				y += 1;
				err += 2 * y + 1;
			}
			if (err > 0) {
				x -= 1;
				err -= 2 * x + 1;
			}
		}
	}
}

/**
 * Draws text on the canvas at the specified position.
 * Note: This overlays regular text characters, not braille dots.
 *
 * @param canvas - The canvas widget
 * @param _x - X position in characters (not dots)
 * @param _y - Y position in characters (not dots)
 * @param _text - Text to draw
 *
 * @example
 * ```typescript
 * drawText(canvas, 5, 5, 'Hello!');
 * ```
 */
export function drawText(canvas: CanvasWidget, _x: number, _y: number, _text: string): void {
	// Text drawing is more complex as it needs to overlay on braille
	// For now, this is a placeholder that would need proper implementation
	// involving mixing regular characters with braille
	const state = canvasStateMap.get(canvas.entity);
	if (!state) return;

	// This is a simplified implementation - real implementation would need
	// to handle text overlay properly
	updateCanvas(state);
}

/**
 * Clears all pixels on the canvas.
 *
 * @param canvas - The canvas widget
 *
 * @example
 * ```typescript
 * clearCanvas(canvas);
 * ```
 */
export function clearCanvas(canvas: CanvasWidget): void {
	const state = canvasStateMap.get(canvas.entity);
	if (!state) return;

	state.pixels.fill(0);
	updateCanvas(state);
}

/**
 * Gets the current canvas content as a string.
 *
 * @param canvas - The canvas widget
 * @returns The rendered canvas content
 *
 * @example
 * ```typescript
 * const content = getCanvasContent(canvas);
 * console.log(content);
 * ```
 */
export function getCanvasContent(canvas: CanvasWidget): string {
	const state = canvasStateMap.get(canvas.entity);
	if (!state) return '';

	return renderCanvas(state);
}

// =============================================================================
// WIDGET FACTORY
// =============================================================================

/**
 * Creates a Canvas widget for drawing custom shapes with braille dots.
 *
 * The canvas uses Unicode braille characters (U+2800-U+28FF) where each character
 * represents a 2x4 grid of dots. This provides 2x resolution compared to regular
 * text characters.
 *
 * @param world - The ECS world
 * @param entity - The entity to attach the canvas to
 * @param config - Canvas configuration
 * @returns Canvas widget instance
 *
 * @example
 * ```typescript
 * import { createWorld, addEntity } from '../core/ecs';
 * import { createCanvas, setPixel, drawLine, drawCircle } from 'blecsd';
 *
 * const world = createWorld();
 * const eid = addEntity(world);
 *
 * // Create canvas (40 dots wide, 80 dots high = 20x20 characters)
 * const canvas = createCanvas(world, eid, {
 *   width: 40,
 *   height: 80,
 *   fg: '#00FF00',
 *   bg: '#000000'
 * });
 *
 * // Draw shapes
 * setPixel(canvas, 10, 10, true);
 * drawLine(canvas, 0, 0, 39, 79);
 * drawRect(canvas, 10, 10, 20, 30);
 * drawCircle(canvas, 20, 40, 15);
 * drawCircle(canvas, 20, 40, 10, true); // Filled
 *
 * // Clear and redraw
 * clearCanvas(canvas);
 * drawCircle(canvas, 20, 40, 20);
 * ```
 */
export function createCanvas(
	world: World,
	entity: Entity,
	config: CanvasConfig = {},
): CanvasWidget {
	const validated = CanvasConfigSchema.parse(config) as ValidatedCanvasConfig;

	// Calculate character dimensions (2 dots wide, 4 dots high per character)
	const widthChars = Math.ceil(validated.width / 2);
	const heightChars = Math.ceil(validated.height / 4);

	// Mark as canvas
	Canvas.isCanvas[entity] = 1;

	// Create container
	createBox(world, entity);
	setPosition(world, entity, 0, 0);

	// Apply colors
	const fg = validated.fg ? parseColor(validated.fg) : undefined;
	const bg = validated.bg ? parseColor(validated.bg) : undefined;
	if (fg !== undefined || bg !== undefined) {
		setStyle(world, entity, { fg, bg });
	}

	// Create text entity for rendering
	const textEntity = addEntity(world);
	createText(world, textEntity);
	setPosition(world, textEntity, 0, 0);
	appendChild(world, entity, textEntity);

	// Initialize pixel state
	const pixels = new Uint8Array(widthChars * heightChars);
	pixels.fill(0);

	// Initialize state
	const state: CanvasState = {
		world,
		entity,
		textEntity,
		widthDots: validated.width,
		heightDots: validated.height,
		widthChars,
		heightChars,
		pixels,
	};

	canvasStateMap.set(entity, state);

	// Initial render
	updateCanvas(state);

	// Return widget API
	return {
		entity,
		world,
		widthDots: validated.width,
		heightDots: validated.height,
	};
}

/**
 * Checks if an entity is a canvas widget.
 *
 * @param entity - The entity to check
 * @returns True if the entity is a canvas
 */
export function isCanvas(entity: Entity): boolean {
	return Canvas.isCanvas[entity] === 1;
}

/**
 * Resets the canvas store (for testing).
 * @internal
 */
export function resetCanvasStore(): void {
	canvasStateMap.clear();
	Canvas.isCanvas.fill(0);
}
