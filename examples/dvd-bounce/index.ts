#!/usr/bin/env node
/**
 * DVD Bounce Demo - Thousands of floating panels bouncing around the screen
 *
 * Demonstrates:
 * - High-performance rendering with 5000 entities
 * - Double buffering with dirty rect optimization
 * - Only changed cells are sent to terminal (see "Dirty: X%" in stats)
 * - World adapter with precomputed renderable entities
 * - Physics-based movement with velocity
 * - Wall bouncing (DVD logo style)
 * - Dynamic z-order shuffling (card shuffle effect)
 * - Shadow rendering
 * - Color cycling and visual effects
 *
 * Double Buffer Optimization:
 * - Keeps previous frame buffer for comparison
 * - Only emits ANSI codes for cells that actually changed
 * - Uses cursor positioning to jump to dirty cells
 * - Significantly reduces terminal I/O bandwidth
 *
 * @module examples/dvd-bounce
 */

import { addEntity, hasComponent } from 'blecsd';
import type { World, Entity } from 'blecsd';
import {
	createWorld,
	createWorldAdapter,
	Position,
	setPosition,
	getPosition,
	Velocity,
	setVelocity,
	Shadow,
	setShadow,
	ZOrder,
	setZIndex,
	getZIndex,
	sortByZIndex,
	setWorldAdapter,
	createCellBuffer,
	fillRect,
	packColor,
} from 'blecsd';

// =============================================================================
// CONFIGURATION
// =============================================================================

/** Number of panels to create */
const PANEL_COUNT = 5000;

/** Panel dimensions */
const PANEL_WIDTH = 6;
const PANEL_HEIGHT = 3;

/** Speed range for panels */
const MIN_SPEED = 15;
const MAX_SPEED = 45;

/** How often to shuffle z-order (ms) */
const SHUFFLE_INTERVAL = 100;

/** Frame rate target */
const TARGET_FPS = 60;
const FRAME_TIME = 1000 / TARGET_FPS;

// =============================================================================
// COLORS
// =============================================================================

const COLORS = [
	0xff5555ff, // Red
	0x55ff55ff, // Green
	0x5555ffff, // Blue
	0xffff55ff, // Yellow
	0xff55ffff, // Magenta
	0x55ffffff, // Cyan
	0xffaa55ff, // Orange
	0xaa55ffff, // Purple
	0x55ffaaff, // Lime
	0xff55aaff, // Pink
	0xaaffaaff, // Light green
	0xaaaaff, // Light blue
];

const BG_COLOR = 0x101018ff;
const SHADOW_COLOR = 0x000000ff;
const LOGO_FG = 0xffffffff; // White logo fill
const LOGO_OUTLINE = 0x000000ff; // Black outline
const LOGO_SHADOW = 0x000000aa; // Semi-transparent shadow

// =============================================================================
// LOGO - Bold bubble letter "blECSd"
// =============================================================================

// Each letter is defined as an array of strings
// Lowercase b, l, d to emphasize "ECS" in the middle
const LOGO_b = [
	'██╗     ',
	'██║     ',
	'█████╗  ',
	'██╔══██╗',
	'██████╔╝',
	'╚═════╝ ',
];

const LOGO_l = [
	'██╗',
	'██║',
	'██║',
	'██║',
	'██║',
	'╚═╝',
];

// Uppercase E, C, S for emphasis
const LOGO_E = [
	'███████╗',
	'██╔════╝',
	'█████╗  ',
	'██╔══╝  ',
	'███████╗',
	'╚══════╝',
];

const LOGO_C = [
	' ██████╗',
	'██╔════╝',
	'██║     ',
	'██║     ',
	'╚██████╗',
	' ╚═════╝',
];

const LOGO_S = [
	'███████╗',
	'██╔════╝',
	'███████╗',
	'╚════██║',
	'███████║',
	'╚══════╝',
];

// Lowercase d
const LOGO_d = [
	'     ██╗',
	'     ██║',
	' █████╔╝',
	'██╔══██║',
	'╚█████╔╝',
	' ╚════╝ ',
];

// Combine all letters into the full logo: blECSd
const LOGO_LETTERS = [LOGO_b, LOGO_l, LOGO_E, LOGO_C, LOGO_S, LOGO_d];

function getLogoWidth(): number {
	let width = 0;
	for (const letter of LOGO_LETTERS) {
		const letterWidth = Math.max(...letter.map(row => row.length));
		width += letterWidth;
	}
	return width;
}

function getLogoHeight(): number {
	return LOGO_b.length;
}

// =============================================================================
// TYPES
// =============================================================================

interface CellBufferDirect {
	width: number;
	height: number;
	cells: { char: string; fg: number; bg: number }[][];
	setCell: (x: number, y: number, char: string, fg: number, bg: number) => void;
}

interface Panel {
	eid: Entity;
	color: number;
	char: string;
}

/** Precomputed list of renderable entities for the world adapter */
const renderableEntities: Entity[] = [];

interface AppState {
	world: World;
	panels: Panel[];
	buffer: CellBufferDirect;
	prevBuffer: CellBufferDirect; // Previous frame for dirty rect comparison
	width: number;
	height: number;
	running: boolean;
	lastShuffle: number;
	frameCount: number;
	lastFpsUpdate: number;
	fps: number;
	dirtyCount: number; // Track how many cells changed (for stats)
}

// =============================================================================
// PANEL CREATION
// =============================================================================

const PANEL_CHARS = ['█', '▓', '▒', '░', '■', '●', '◆', '◉', '★', '♦'];

function createPanel(world: World, width: number, height: number, index: number): Panel {
	const eid = addEntity(world);

	// Random position within bounds
	const x = Math.random() * (width - PANEL_WIDTH - 2) + 1;
	const y = Math.random() * (height - PANEL_HEIGHT - 2) + 1;
	setPosition(world, eid, x, y);

	// Random velocity with minimum speed
	const angle = Math.random() * Math.PI * 2;
	const speed = MIN_SPEED + Math.random() * (MAX_SPEED - MIN_SPEED);
	const vx = Math.cos(angle) * speed;
	const vy = Math.sin(angle) * speed;
	setVelocity(world, eid, vx, vy);

	// Enable shadow
	setShadow(world, eid, {
		enabled: true,
		offsetX: 1,
		offsetY: 1,
		opacity: 100,
	});

	// Set z-index (will be shuffled)
	setZIndex(world, eid, index);

	// Random color and character
	const color = COLORS[index % COLORS.length] ?? COLORS[0] ?? 0xffffffff;
	const char = PANEL_CHARS[index % PANEL_CHARS.length] ?? '█';

	// Register entity in the precomputed render list
	renderableEntities.push(eid);

	return { eid, color, char };
}

// =============================================================================
// PHYSICS
// =============================================================================

function updatePhysics(state: AppState, deltaTime: number): void {
	const { world, panels, width, height } = state;

	for (const panel of panels) {
		const { eid } = panel;

		// Get current position and velocity
		const pos = getPosition(world, eid);
		if (!pos) continue;

		const vx = Velocity.x[eid] ?? 0;
		const vy = Velocity.y[eid] ?? 0;

		// Calculate new position
		let newX = pos.x + vx * deltaTime;
		let newY = pos.y + vy * deltaTime;
		let newVx = vx;
		let newVy = vy;

		// Bounce off walls (DVD style)
		if (newX <= 0) {
			newX = 0;
			newVx = Math.abs(newVx);
			// Slight speed variation on bounce for variety
			newVx *= 0.95 + Math.random() * 0.1;
		} else if (newX >= width - PANEL_WIDTH) {
			newX = width - PANEL_WIDTH;
			newVx = -Math.abs(newVx);
			newVx *= 0.95 + Math.random() * 0.1;
		}

		if (newY <= 0) {
			newY = 0;
			newVy = Math.abs(newVy);
			newVy *= 0.95 + Math.random() * 0.1;
		} else if (newY >= height - PANEL_HEIGHT) {
			newY = height - PANEL_HEIGHT;
			newVy = -Math.abs(newVy);
			newVy *= 0.95 + Math.random() * 0.1;
		}

		// Maintain minimum speed
		const speed = Math.sqrt(newVx * newVx + newVy * newVy);
		if (speed < MIN_SPEED) {
			const scale = MIN_SPEED / Math.max(speed, 0.1);
			newVx *= scale;
			newVy *= scale;
		}

		// Update position and velocity directly in typed arrays for speed
		Position.x[eid] = newX;
		Position.y[eid] = newY;
		Velocity.x[eid] = newVx;
		Velocity.y[eid] = newVy;
	}
}

// =============================================================================
// Z-ORDER SHUFFLING
// =============================================================================

function shuffleZOrder(state: AppState): void {
	const { world, panels } = state;
	const count = panels.length;

	// Fisher-Yates shuffle of z-indices
	// But only shuffle a portion each time for a "rippling" effect
	const shuffleCount = Math.floor(count * 0.1); // Shuffle 10% each time

	for (let i = 0; i < shuffleCount; i++) {
		const a = Math.floor(Math.random() * count);
		const b = Math.floor(Math.random() * count);

		const panelA = panels[a];
		const panelB = panels[b];
		if (!panelA || !panelB) continue;

		const zA = getZIndex(world, panelA.eid);
		const zB = getZIndex(world, panelB.eid);

		setZIndex(world, panelA.eid, zB);
		setZIndex(world, panelB.eid, zA);
	}
}

// =============================================================================
// RENDERING
// =============================================================================

function renderPanel(
	buffer: CellBufferDirect,
	x: number,
	y: number,
	char: string,
	fg: number,
	bg: number,
): void {
	const ix = Math.floor(x);
	const iy = Math.floor(y);

	for (let dy = 0; dy < PANEL_HEIGHT; dy++) {
		for (let dx = 0; dx < PANEL_WIDTH; dx++) {
			const px = ix + dx;
			const py = iy + dy;
			if (px >= 0 && px < buffer.width && py >= 0 && py < buffer.height) {
				buffer.setCell(px, py, char, fg, bg);
			}
		}
	}
}

function renderLogo(buffer: CellBufferDirect): void {
	const logoWidth = getLogoWidth();
	const logoHeight = getLogoHeight();

	// Center the logo
	const startX = Math.floor((buffer.width - logoWidth) / 2);
	const startY = Math.floor((buffer.height - logoHeight) / 2);

	// First pass: render shadow (offset by 2,1)
	let offsetX = startX + 2;
	for (const letter of LOGO_LETTERS) {
		const letterWidth = Math.max(...letter.map(row => row.length));
		for (let row = 0; row < letter.length; row++) {
			const line = letter[row] ?? '';
			for (let col = 0; col < line.length; col++) {
				const char = line[col];
				if (char && char !== ' ') {
					const px = offsetX + col;
					const py = startY + row + 1;
					if (px >= 0 && px < buffer.width && py >= 0 && py < buffer.height) {
						buffer.setCell(px, py, '█', LOGO_SHADOW, LOGO_SHADOW);
					}
				}
			}
		}
		offsetX += letterWidth;
	}

	// Second pass: render black outline (thicker border)
	offsetX = startX;
	for (const letter of LOGO_LETTERS) {
		const letterWidth = Math.max(...letter.map(row => row.length));
		for (let row = 0; row < letter.length; row++) {
			const line = letter[row] ?? '';
			for (let col = 0; col < line.length; col++) {
				const char = line[col];
				if (char && char !== ' ') {
					// Draw outline in all 8 directions + diagonals for thickness
					for (let dy = -1; dy <= 1; dy++) {
						for (let dx = -1; dx <= 1; dx++) {
							if (dx === 0 && dy === 0) continue;
							const px = offsetX + col + dx;
							const py = startY + row + dy;
							if (px >= 0 && px < buffer.width && py >= 0 && py < buffer.height) {
								buffer.setCell(px, py, '█', LOGO_OUTLINE, LOGO_OUTLINE);
							}
						}
					}
				}
			}
		}
		offsetX += letterWidth;
	}

	// Third pass: render the actual logo characters (white fill)
	offsetX = startX;
	for (const letter of LOGO_LETTERS) {
		const letterWidth = Math.max(...letter.map(row => row.length));
		for (let row = 0; row < letter.length; row++) {
			const line = letter[row] ?? '';
			for (let col = 0; col < line.length; col++) {
				const char = line[col];
				if (char && char !== ' ') {
					const px = offsetX + col;
					const py = startY + row;
					if (px >= 0 && px < buffer.width && py >= 0 && py < buffer.height) {
						buffer.setCell(px, py, char, LOGO_FG, LOGO_OUTLINE);
					}
				}
			}
		}
		offsetX += letterWidth;
	}
}

function renderShadow(
	buffer: CellBufferDirect,
	x: number,
	y: number,
): void {
	const ix = Math.floor(x) + 1; // Shadow offset
	const iy = Math.floor(y) + 1;

	// Right edge shadow
	for (let dy = 0; dy < PANEL_HEIGHT; dy++) {
		const px = ix + PANEL_WIDTH;
		const py = iy + dy;
		if (px >= 0 && px < buffer.width && py >= 0 && py < buffer.height) {
			buffer.setCell(px, py, '░', SHADOW_COLOR, BG_COLOR);
		}
	}

	// Bottom edge shadow
	for (let dx = 0; dx < PANEL_WIDTH; dx++) {
		const px = ix + dx;
		const py = iy + PANEL_HEIGHT;
		if (px >= 0 && px < buffer.width && py >= 0 && py < buffer.height) {
			buffer.setCell(px, py, '░', SHADOW_COLOR, BG_COLOR);
		}
	}

	// Corner shadow
	const cx = ix + PANEL_WIDTH;
	const cy = iy + PANEL_HEIGHT;
	if (cx >= 0 && cx < buffer.width && cy >= 0 && cy < buffer.height) {
		buffer.setCell(cx, cy, '░', SHADOW_COLOR, BG_COLOR);
	}
}

function render(state: AppState): void {
	const { world, panels, buffer, width, height, fps } = state;

	// Clear buffer with background
	fillRect(buffer, 0, 0, width, height, ' ', 0xffffffff, BG_COLOR);

	// Sort panels by z-index for correct layering
	const sortedPanels = [...panels].sort((a, b) => {
		const zA = getZIndex(world, a.eid);
		const zB = getZIndex(world, b.eid);
		return zA - zB;
	});

	// Render all panels (back to front)
	for (const panel of sortedPanels) {
		const pos = getPosition(world, panel.eid);
		if (!pos) continue;

		// Render shadow first (behind panel)
		renderShadow(buffer, pos.x, pos.y);

		// Render panel
		const darkerBg = (panel.color & 0xfefefe00) >> 1 | 0x000000ff; // Darker version for bg
		renderPanel(buffer, pos.x, pos.y, panel.char, panel.color, darkerBg);
	}

	// Render centered logo on top of everything
	renderLogo(buffer);

	// Render stats overlay (include dirty cell percentage)
	const totalCells = width * height;
	const dirtyPct = totalCells > 0 ? ((state.dirtyCount / totalCells) * 100).toFixed(1) : '0.0';
	const statsText = `Panels: ${panels.length} | FPS: ${fps.toFixed(0)} | Dirty: ${dirtyPct}% | Q to quit`;
	for (let i = 0; i < statsText.length && i < width; i++) {
		buffer.setCell(i, 0, statsText[i] ?? ' ', 0xffffffff, 0x000000cc);
	}
}

// =============================================================================
// OUTPUT - Double Buffer with Dirty Rect Optimization
// =============================================================================

/**
 * Compare two cells to check if they're identical
 */
function cellsEqual(
	a: { char: string; fg: number; bg: number } | undefined,
	b: { char: string; fg: number; bg: number } | undefined,
): boolean {
	if (!a || !b) return a === b;
	return a.char === b.char && a.fg === b.fg && a.bg === b.bg;
}

/**
 * Copy current buffer to previous buffer for next frame comparison
 */
function copyBuffer(src: CellBufferDirect, dst: CellBufferDirect): void {
	for (let y = 0; y < src.height && y < dst.height; y++) {
		const srcRow = src.cells[y];
		const dstRow = dst.cells[y];
		if (!srcRow || !dstRow) continue;

		for (let x = 0; x < src.width && x < dst.width; x++) {
			const srcCell = srcRow[x];
			const dstCell = dstRow[x];
			if (srcCell && dstCell) {
				dstCell.char = srcCell.char;
				dstCell.fg = srcCell.fg;
				dstCell.bg = srcCell.bg;
			}
		}
	}
}

/**
 * Generate ANSI output only for cells that changed between frames.
 * Uses cursor positioning to jump to dirty cells instead of redrawing everything.
 * Returns the number of dirty cells for stats.
 */
function bufferToAnsiDirty(
	current: CellBufferDirect,
	previous: CellBufferDirect,
): { output: string; dirtyCount: number } {
	let output = '';
	let dirtyCount = 0;
	let lastFg = -1;
	let lastBg = -1;
	let lastX = -1;
	let lastY = -1;

	for (let y = 0; y < current.height; y++) {
		const currentRow = current.cells[y];
		const prevRow = previous.cells[y];
		if (!currentRow) continue;

		// Track runs of consecutive dirty cells on this row
		let runStart = -1;
		let runChars = '';

		for (let x = 0; x < current.width; x++) {
			const currentCell = currentRow[x];
			const prevCell = prevRow?.[x];

			if (!currentCell) continue;

			// Check if cell changed
			const isDirty = !cellsEqual(currentCell, prevCell);

			if (isDirty) {
				dirtyCount++;

				// If starting a new run or not consecutive, position cursor
				if (runStart === -1) {
					runStart = x;
					// Only emit cursor position if not already there
					if (lastX !== x || lastY !== y) {
						output += `\x1b[${y + 1};${x + 1}H`; // 1-indexed cursor position
					}
				}

				// Emit color codes if changed
				const fg = currentCell.fg;
				const bg = currentCell.bg;
				if (fg !== lastFg || bg !== lastBg) {
					// Flush any pending run chars first
					if (runChars) {
						output += runChars;
						runChars = '';
					}
					const fgR = (fg >> 24) & 0xff;
					const fgG = (fg >> 16) & 0xff;
					const fgB = (fg >> 8) & 0xff;
					const bgR = (bg >> 24) & 0xff;
					const bgG = (bg >> 16) & 0xff;
					const bgB = (bg >> 8) & 0xff;
					output += `\x1b[38;2;${fgR};${fgG};${fgB};48;2;${bgR};${bgG};${bgB}m`;
					lastFg = fg;
					lastBg = bg;
				}

				runChars += currentCell.char;
				lastX = x + 1;
				lastY = y;
			} else {
				// Cell unchanged - flush any pending run
				if (runChars) {
					output += runChars;
					runChars = '';
					runStart = -1;
				}
			}
		}

		// Flush remaining run chars at end of row
		if (runChars) {
			output += runChars;
		}
	}

	return { output, dirtyCount };
}

/**
 * Full buffer render (used for first frame or after resize)
 */
function bufferToAnsiFull(buffer: CellBufferDirect): string {
	let output = '\x1b[H'; // Move cursor to home
	let lastFg = -1;
	let lastBg = -1;

	for (let y = 0; y < buffer.height; y++) {
		const row = buffer.cells[y];
		if (!row) continue;

		for (let x = 0; x < buffer.width; x++) {
			const cell = row[x];
			if (!cell) continue;

			const fg = cell.fg;
			const bg = cell.bg;

			if (fg !== lastFg || bg !== lastBg) {
				const fgR = (fg >> 24) & 0xff;
				const fgG = (fg >> 16) & 0xff;
				const fgB = (fg >> 8) & 0xff;
				const bgR = (bg >> 24) & 0xff;
				const bgG = (bg >> 16) & 0xff;
				const bgB = (bg >> 8) & 0xff;
				output += `\x1b[38;2;${fgR};${fgG};${fgB};48;2;${bgR};${bgG};${bgB}m`;
				lastFg = fg;
				lastBg = bg;
			}

			output += cell.char;
		}

		if (y < buffer.height - 1) {
			output += '\n';
		}
	}

	return output;
}

// =============================================================================
// MAIN
// =============================================================================

async function main(): Promise<void> {
	const stdout = process.stdout;
	const stdin = process.stdin;

	const width = stdout.columns ?? 80;
	const height = stdout.rows ?? 24;

	// Create world with custom adapter for precomputed render list
	const world = createWorld();
	const buffer = createCellBuffer(width, height) as CellBufferDirect;
	const prevBuffer = createCellBuffer(width, height) as CellBufferDirect; // For dirty rect comparison
	const adapter = createWorldAdapter({
		type: 'custom',
		queryRenderables: () => renderableEntities,
	});
	setWorldAdapter(world, adapter);

	// Create panels
	const panels: Panel[] = [];
	for (let i = 0; i < PANEL_COUNT; i++) {
		panels.push(createPanel(world, width, height, i));
	}

	const state: AppState = {
		world,
		panels,
		buffer,
		prevBuffer,
		width,
		height,
		running: true,
		lastShuffle: Date.now(),
		frameCount: 0,
		lastFpsUpdate: Date.now(),
		fps: 0,
		dirtyCount: 0,
	};

	// Setup terminal
	stdout.write('\x1b[?1049h'); // Alt screen
	stdout.write('\x1b[?25l'); // Hide cursor
	stdin.setRawMode?.(true);
	stdin.resume();

	// Handle input
	stdin.on('data', (data: Buffer) => {
		const str = data.toString();
		if (str === 'q' || str === 'Q' || str === '\x03') {
			state.running = false;
		}
	});

	// Handle resize
	stdout.on('resize', () => {
		state.width = stdout.columns ?? 80;
		state.height = stdout.rows ?? 24;
		// Recreate both buffers on resize
		state.buffer = createCellBuffer(state.width, state.height) as CellBufferDirect;
		state.prevBuffer = createCellBuffer(state.width, state.height) as CellBufferDirect;
		// Force full redraw on next frame by clearing previous buffer
		needsFullRedraw = true;
	});

	// Track if we need a full redraw (first frame, resize, etc.)
	let needsFullRedraw = true;

	// Main loop
	let lastTime = Date.now();

	const loop = (): void => {
		if (!state.running) {
			// Cleanup and exit
			stdout.write('\x1b[?25h'); // Show cursor
			stdout.write('\x1b[?1049l'); // Exit alt screen
			process.exit(0);
		}

		const now = Date.now();
		const deltaTime = (now - lastTime) / 1000;
		lastTime = now;

		// Update FPS counter
		state.frameCount++;
		if (now - state.lastFpsUpdate >= 1000) {
			state.fps = state.frameCount / ((now - state.lastFpsUpdate) / 1000);
			state.frameCount = 0;
			state.lastFpsUpdate = now;
		}

		// Shuffle z-order periodically
		if (now - state.lastShuffle >= SHUFFLE_INTERVAL) {
			shuffleZOrder(state);
			state.lastShuffle = now;
		}

		// Update physics
		updatePhysics(state, deltaTime);

		// Render to current buffer
		render(state);

		// Output using dirty rect optimization
		if (needsFullRedraw) {
			// Full redraw for first frame or after resize
			stdout.write(bufferToAnsiFull(state.buffer));
			state.dirtyCount = state.width * state.height;
			needsFullRedraw = false;
		} else {
			// Dirty rect optimization - only output changed cells
			const { output, dirtyCount } = bufferToAnsiDirty(state.buffer, state.prevBuffer);
			state.dirtyCount = dirtyCount;
			if (output) {
				stdout.write(output);
			}
		}

		// Copy current buffer to previous for next frame comparison
		copyBuffer(state.buffer, state.prevBuffer);

		// Schedule next frame
		const elapsed = Date.now() - now;
		const delay = Math.max(0, FRAME_TIME - elapsed);
		setTimeout(loop, delay);
	};

	// Start loop
	loop();
}

main().catch((err) => {
	console.error('Error:', err);
	process.exit(1);
});
