/**
 * HUD and status bar rendering.
 *
 * Draws health, ammo, armor, and minimap directly to the framebuffer
 * using a simple 5x7 bitmap font for numbers. The status bar occupies
 * the bottom 32 rows of the 320x200 screen (y=168 to y=199).
 *
 * @module render/hud
 */

import { three } from 'blecsd';
import { FRACBITS } from '../math/fixed.js';
import type { PlayerState } from '../game/player.js';
import type { InputState } from '../game/input.js';
import type { RenderState } from './defs.js';
import type { MapData } from '../wad/types.js';
import { drawAutomap } from './automap.js';

// ─── HUD State ──────────────────────────────────────────────────────

/** Persistent HUD state across frames. */
export interface HudState {
	/** Whether the automap overlay is currently visible. */
	showAutomap: boolean;
	/** Automap zoom level (higher = more zoomed out). */
	automapZoom: number;
	/** Kill statistics. */
	killCount: number;
	totalKills: number;
	/** Item statistics. */
	itemCount: number;
	totalItems: number;
	/** Secret statistics. */
	secretCount: number;
	totalSecrets: number;
}

/**
 * Create a default HUD state with the automap hidden and all counters at zero.
 *
 * @returns Fresh HUD state
 *
 * @example
 * ```typescript
 * import { createHudState } from './hud.js';
 * const hud = createHudState();
 * ```
 */
export function createHudState(): HudState {
	return {
		showAutomap: false,
		automapZoom: 4,
		killCount: 0,
		totalKills: 0,
		itemCount: 0,
		totalItems: 0,
		secretCount: 0,
		totalSecrets: 0,
	};
}

// ─── Constants ──────────────────────────────────────────────────────

/** Height of the status bar in pixels. */
export const STATUS_BAR_HEIGHT = 32;

/** Status bar background color (dark gray). */
const BAR_R = 48;
const BAR_G = 48;
const BAR_B = 48;

/** Status bar border/separator color. */
const BORDER_R = 80;
const BORDER_G = 80;
const BORDER_B = 80;

/** Health number color (green when healthy). */
const HEALTH_R = 0;
const HEALTH_G = 220;
const HEALTH_B = 0;

/** Armor number color (blue). */
const ARMOR_R = 0;
const ARMOR_G = 160;
const ARMOR_B = 220;

/** Ammo number color (yellow). */
const AMMO_R = 220;
const AMMO_G = 220;
const AMMO_B = 0;

/** Label text color (light gray). */
const LABEL_R = 180;
const LABEL_G = 180;
const LABEL_B = 180;

/** Key slot empty color (dark). */
const KEY_EMPTY_R = 32;
const KEY_EMPTY_G = 32;
const KEY_EMPTY_B = 32;

/** Digit width in pixels (including 1px gap). */
const DIGIT_WIDTH = 6;

/** Digit height in pixels. */
const DIGIT_HEIGHT = 7;

// ─── 5x7 Bitmap Font ───────────────────────────────────────────────

/**
 * 5x7 pixel patterns for digits 0-9.
 * Each entry is an array of 7 strings, each string is 5 characters wide.
 * '#' marks a lit pixel, ' ' marks an unlit pixel.
 */
const DIGIT_PATTERNS: readonly string[][] = [
	[' ### ', '#   #', '#  ##', '# # #', '##  #', '#   #', ' ### '], // 0
	['  #  ', ' ##  ', '  #  ', '  #  ', '  #  ', '  #  ', ' ### '], // 1
	[' ### ', '#   #', '    #', '  ## ', ' #   ', '#    ', '#####'], // 2
	[' ### ', '#   #', '    #', '  ## ', '    #', '#   #', ' ### '], // 3
	['#   #', '#   #', '#   #', '#####', '    #', '    #', '    #'], // 4
	['#####', '#    ', '#### ', '    #', '    #', '#   #', ' ### '], // 5
	[' ### ', '#    ', '#### ', '#   #', '#   #', '#   #', ' ### '], // 6
	['#####', '    #', '   # ', '  #  ', '  #  ', '  #  ', '  #  '], // 7
	[' ### ', '#   #', '#   #', ' ### ', '#   #', '#   #', ' ### '], // 8
	[' ### ', '#   #', '#   #', ' ####', '    #', '    #', ' ### '], // 9
];

/**
 * 5x7 bitmap patterns for label characters (A-Z subset used by labels).
 * Only the characters needed for "HEALTH", "ARMOR", "AMMO" are defined.
 */
const CHAR_PATTERNS: Readonly<Record<string, readonly string[]>> = {
	H: ['#   #', '#   #', '#####', '#   #', '#   #', '#   #', '#   #'],
	E: ['#####', '#    ', '#####', '#    ', '#    ', '#    ', '#####'],
	A: [' ### ', '#   #', '#   #', '#####', '#   #', '#   #', '#   #'],
	L: ['#    ', '#    ', '#    ', '#    ', '#    ', '#    ', '#####'],
	T: ['#####', '  #  ', '  #  ', '  #  ', '  #  ', '  #  ', '  #  '],
	R: ['#### ', '#   #', '#   #', '#### ', '#  # ', '#   #', '#   #'],
	M: ['#   #', '## ##', '# # #', '#   #', '#   #', '#   #', '#   #'],
	O: [' ### ', '#   #', '#   #', '#   #', '#   #', '#   #', ' ### '],
};

// ─── Drawing Helpers ────────────────────────────────────────────────

/**
 * Draw a single digit at the given screen position using the bitmap font.
 */
function drawDigit(
	rs: RenderState,
	x: number,
	y: number,
	digit: number,
	r: number,
	g: number,
	b: number,
): void {
	const pattern = DIGIT_PATTERNS[digit];
	if (!pattern) return;

	for (let row = 0; row < DIGIT_HEIGHT; row++) {
		const line = pattern[row];
		if (!line) continue;
		for (let col = 0; col < 5; col++) {
			if (line[col] === '#') {
				const px = x + col;
				const py = y + row;
				if (px >= 0 && px < rs.screenWidth && py >= 0 && py < rs.screenHeight) {
					three.setPixelUnsafe(rs.fb, px, py, r, g, b, 255);
				}
			}
		}
	}
}

/**
 * Draw a single character at the given screen position using the bitmap font.
 */
function drawChar(
	rs: RenderState,
	x: number,
	y: number,
	ch: string,
	r: number,
	g: number,
	b: number,
): void {
	const pattern = CHAR_PATTERNS[ch];
	if (!pattern) return;

	for (let row = 0; row < DIGIT_HEIGHT; row++) {
		const line = pattern[row];
		if (!line) continue;
		for (let col = 0; col < 5; col++) {
			if (line[col] === '#') {
				const px = x + col;
				const py = y + row;
				if (px >= 0 && px < rs.screenWidth && py >= 0 && py < rs.screenHeight) {
					three.setPixelUnsafe(rs.fb, px, py, r, g, b, 255);
				}
			}
		}
	}
}

/**
 * Draw a number right-aligned at the given position.
 * The x coordinate specifies the right edge of the number.
 */
function drawNumber(
	rs: RenderState,
	x: number,
	y: number,
	value: number,
	r: number,
	g: number,
	b: number,
): void {
	const str = String(Math.max(0, Math.floor(value)));
	const startX = x - str.length * DIGIT_WIDTH;

	for (let i = 0; i < str.length; i++) {
		const digit = str.charCodeAt(i) - 48; // '0' = 48
		if (digit >= 0 && digit <= 9) {
			drawDigit(rs, startX + i * DIGIT_WIDTH, y, digit, r, g, b);
		}
	}
}

/**
 * Draw a string label at the given position.
 */
function drawString(
	rs: RenderState,
	x: number,
	y: number,
	text: string,
	r: number,
	g: number,
	b: number,
): void {
	for (let i = 0; i < text.length; i++) {
		drawChar(rs, x + i * DIGIT_WIDTH, y, text[i] ?? '', r, g, b);
	}
}

// ─── Status Bar ─────────────────────────────────────────────────────

/**
 * Draw the HUD status bar and optionally the automap overlay.
 *
 * The status bar is a 320x32 dark gray bar at the bottom of the screen
 * showing health, armor, ammo, and key slots. If the automap is active,
 * it draws the top-down map view over the 3D viewport area.
 *
 * @param rs - Current render state with framebuffer
 * @param player - Player state for health/armor/ammo values
 * @param hudState - HUD state for automap toggle and statistics
 * @param map - Map data for automap rendering
 *
 * @example
 * ```typescript
 * import { drawHud, createHudState } from './hud.js';
 * const hud = createHudState();
 * drawHud(renderState, player, hud, mapData);
 * ```
 */
export function drawHud(
	rs: RenderState,
	player: PlayerState,
	hudState: HudState,
	map: MapData,
): void {
	const barTop = rs.screenHeight - STATUS_BAR_HEIGHT;

	// Draw automap if active (before status bar so bar draws on top)
	if (hudState.showAutomap) {
		drawAutomap(rs, player, hudState, map);
	}

	// Draw status bar background
	for (let y = barTop; y < rs.screenHeight; y++) {
		for (let x = 0; x < rs.screenWidth; x++) {
			three.setPixelUnsafe(rs.fb, x, y, BAR_R, BAR_G, BAR_B, 255);
		}
	}

	// Draw top border line
	for (let x = 0; x < rs.screenWidth; x++) {
		three.setPixelUnsafe(rs.fb, x, barTop, BORDER_R, BORDER_G, BORDER_B, 255);
	}

	// Layout positions (vertically centered within status bar)
	const labelY = barTop + 5;
	const numberY = barTop + 16;

	// ── Health section (left) ──
	drawString(rs, 10, labelY, 'HEALTH', LABEL_R, LABEL_G, LABEL_B);
	drawNumber(rs, 54, numberY, player.health, HEALTH_R, HEALTH_G, HEALTH_B);

	// ── Armor section (center-left) ──
	drawString(rs, 70, labelY, 'ARMOR', LABEL_R, LABEL_G, LABEL_B);
	drawNumber(rs, 108, numberY, player.armor, ARMOR_R, ARMOR_G, ARMOR_B);

	// ── Key indicators (center) ──
	// Three small 6x6 squares for blue, red, yellow keys (always empty for now)
	const keyY = barTop + 10;
	const keySize = 6;
	const keyGap = 3;
	const keyStartX = 140;

	// Blue key slot
	drawKeySlot(rs, keyStartX, keyY, keySize, 0, 0, 120);
	// Red key slot
	drawKeySlot(rs, keyStartX + keySize + keyGap, keyY, keySize, 120, 0, 0);
	// Yellow key slot
	drawKeySlot(rs, keyStartX + (keySize + keyGap) * 2, keyY, keySize, 120, 120, 0);

	// ── Ammo section (right) ──
	drawString(rs, 220, labelY, 'AMMO', LABEL_R, LABEL_G, LABEL_B);
	drawNumber(rs, 300, numberY, player.ammo, AMMO_R, AMMO_G, AMMO_B);
}

/**
 * Draw a key indicator slot as a small square outline.
 * Empty slots show a dark border, filled slots would show a solid color.
 */
function drawKeySlot(
	rs: RenderState,
	x: number,
	y: number,
	size: number,
	r: number,
	g: number,
	b: number,
): void {
	// Draw outline
	for (let i = 0; i < size; i++) {
		// Top and bottom edges
		if (x + i >= 0 && x + i < rs.screenWidth) {
			if (y >= 0 && y < rs.screenHeight) {
				three.setPixelUnsafe(rs.fb, x + i, y, r, g, b, 255);
			}
			if (y + size - 1 >= 0 && y + size - 1 < rs.screenHeight) {
				three.setPixelUnsafe(rs.fb, x + i, y + size - 1, r, g, b, 255);
			}
		}
		// Left and right edges
		if (y + i >= 0 && y + i < rs.screenHeight) {
			if (x >= 0 && x < rs.screenWidth) {
				three.setPixelUnsafe(rs.fb, x, y + i, r, g, b, 255);
			}
			if (x + size - 1 >= 0 && x + size - 1 < rs.screenWidth) {
				three.setPixelUnsafe(rs.fb, x + size - 1, y + i, r, g, b, 255);
			}
		}
	}

	// Fill interior with empty color
	for (let iy = 1; iy < size - 1; iy++) {
		for (let ix = 1; ix < size - 1; ix++) {
			const px = x + ix;
			const py = y + iy;
			if (px >= 0 && px < rs.screenWidth && py >= 0 && py < rs.screenHeight) {
				three.setPixelUnsafe(rs.fb, px, py, KEY_EMPTY_R, KEY_EMPTY_G, KEY_EMPTY_B, 255);
			}
		}
	}
}

// ─── HUD Update ─────────────────────────────────────────────────────

/**
 * Update HUD state based on player input.
 *
 * Toggles the automap overlay when the Tab key is pressed.
 *
 * @param hudState - Mutable HUD state to update
 * @param input - Current frame input state
 *
 * @example
 * ```typescript
 * import { updateHud, createHudState } from './hud.js';
 * const hud = createHudState();
 * updateHud(hud, pollInput());
 * ```
 */
export function updateHud(hudState: HudState, input: InputState): void {
	if (input.keys.has('tab')) {
		hudState.showAutomap = !hudState.showAutomap;
	}
}
