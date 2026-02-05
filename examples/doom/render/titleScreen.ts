/**
 * Title screen and menu rendering.
 *
 * Loads TITLEPIC from the WAD and draws it as the background.
 * Renders menu overlays (main menu, skill selection) with
 * a simple 5x7 bitmap font.
 *
 * @module render/titleScreen
 */

import { three } from 'blecsd';
import type { WadFile, Palette } from '../wad/types.js';
import { findLump, getLumpData } from '../wad/wad.js';
import { parsePicture, renderPictureToFlat } from '../wad/pictureFormat.js';
import type { MenuState } from '../game/menu.js';
import { MenuMode, MAIN_MENU_ITEMS, SKILL_NAMES } from '../game/menu.js';

// ─── Title Picture Cache ──────────────────────────────────────────

/** Cached TITLEPIC pixel data (palette indices, 320x200). */
let titlePicPixels: Uint8Array | null = null;
let titlePicWidth = 0;
let titlePicHeight = 0;

/**
 * Load the TITLEPIC lump from the WAD and cache it.
 *
 * @param wad - Loaded WAD file
 * @returns true if TITLEPIC was loaded successfully
 */
export function loadTitlePic(wad: WadFile): boolean {
	const entry = findLump(wad, 'TITLEPIC');
	if (!entry) return false;

	try {
		const data = getLumpData(wad, entry);
		const picture = parsePicture(data);
		titlePicPixels = renderPictureToFlat(picture);
		titlePicWidth = picture.width;
		titlePicHeight = picture.height;
		return true;
	} catch {
		return false;
	}
}

// ─── 5x7 Bitmap Font ──────────────────────────────────────────────

/**
 * 5x7 pixel patterns for characters used in menus.
 * '#' marks a lit pixel, ' ' marks an unlit pixel.
 */
const FONT: Readonly<Record<string, readonly string[]>> = {
	A: [' ### ', '#   #', '#   #', '#####', '#   #', '#   #', '#   #'],
	B: ['#### ', '#   #', '#### ', '#   #', '#   #', '#   #', '#### '],
	C: [' ### ', '#   #', '#    ', '#    ', '#    ', '#   #', ' ### '],
	D: ['#### ', '#   #', '#   #', '#   #', '#   #', '#   #', '#### '],
	E: ['#####', '#    ', '#####', '#    ', '#    ', '#    ', '#####'],
	F: ['#####', '#    ', '#### ', '#    ', '#    ', '#    ', '#    '],
	G: [' ### ', '#   #', '#    ', '# ###', '#   #', '#   #', ' ### '],
	H: ['#   #', '#   #', '#####', '#   #', '#   #', '#   #', '#   #'],
	I: [' ### ', '  #  ', '  #  ', '  #  ', '  #  ', '  #  ', ' ### '],
	J: ['  ###', '   # ', '   # ', '   # ', '#  # ', '#  # ', ' ## '],
	K: ['#   #', '#  # ', '# #  ', '##   ', '# #  ', '#  # ', '#   #'],
	L: ['#    ', '#    ', '#    ', '#    ', '#    ', '#    ', '#####'],
	M: ['#   #', '## ##', '# # #', '#   #', '#   #', '#   #', '#   #'],
	N: ['#   #', '##  #', '# # #', '#  ##', '#   #', '#   #', '#   #'],
	O: [' ### ', '#   #', '#   #', '#   #', '#   #', '#   #', ' ### '],
	P: ['#### ', '#   #', '#   #', '#### ', '#    ', '#    ', '#    '],
	Q: [' ### ', '#   #', '#   #', '#   #', '# # #', '#  # ', ' ## #'],
	R: ['#### ', '#   #', '#   #', '#### ', '#  # ', '#   #', '#   #'],
	S: [' ####', '#    ', ' ### ', '    #', '    #', '#   #', ' ### '],
	T: ['#####', '  #  ', '  #  ', '  #  ', '  #  ', '  #  ', '  #  '],
	U: ['#   #', '#   #', '#   #', '#   #', '#   #', '#   #', ' ### '],
	V: ['#   #', '#   #', '#   #', '#   #', ' # # ', ' # # ', '  #  '],
	W: ['#   #', '#   #', '#   #', '# # #', '# # #', '## ##', '#   #'],
	X: ['#   #', ' # # ', '  #  ', '  #  ', '  #  ', ' # # ', '#   #'],
	Y: ['#   #', ' # # ', '  #  ', '  #  ', '  #  ', '  #  ', '  #  '],
	Z: ['#####', '    #', '   # ', '  #  ', ' #   ', '#    ', '#####'],
	'0': [' ### ', '#   #', '#  ##', '# # #', '##  #', '#   #', ' ### '],
	'1': ['  #  ', ' ##  ', '  #  ', '  #  ', '  #  ', '  #  ', ' ### '],
	'2': [' ### ', '#   #', '    #', '  ## ', ' #   ', '#    ', '#####'],
	'3': [' ### ', '#   #', '    #', '  ## ', '    #', '#   #', ' ### '],
	'4': ['#   #', '#   #', '#   #', '#####', '    #', '    #', '    #'],
	'5': ['#####', '#    ', '#### ', '    #', '    #', '#   #', ' ### '],
	'6': [' ### ', '#    ', '#### ', '#   #', '#   #', '#   #', ' ### '],
	'7': ['#####', '    #', '   # ', '  #  ', '  #  ', '  #  ', '  #  '],
	'8': [' ### ', '#   #', '#   #', ' ### ', '#   #', '#   #', ' ### '],
	'9': [' ### ', '#   #', '#   #', ' ####', '    #', '    #', ' ### '],
	"'": ['  #  ', '  #  ', ' #   ', '     ', '     ', '     ', '     '],
	',': ['     ', '     ', '     ', '     ', '  #  ', '  #  ', ' #   '],
	'-': ['     ', '     ', '     ', '#####', '     ', '     ', '     '],
	'!': ['  #  ', '  #  ', '  #  ', '  #  ', '  #  ', '     ', '  #  '],
	'.': ['     ', '     ', '     ', '     ', '     ', '     ', '  #  '],
};

/** Character width including 1px gap. */
const CHAR_WIDTH = 6;

/** Character height. */
const CHAR_HEIGHT = 7;

// ─── Drawing Helpers ──────────────────────────────────────────────

/**
 * Draw a character at the given position using the bitmap font.
 */
function drawFontChar(
	fb: three.PixelFramebuffer,
	x: number,
	y: number,
	ch: string,
	r: number,
	g: number,
	b: number,
): void {
	const pattern = FONT[ch];
	if (!pattern) return;

	for (let row = 0; row < CHAR_HEIGHT; row++) {
		const line = pattern[row];
		if (!line) continue;
		for (let col = 0; col < 5; col++) {
			if (line[col] === '#') {
				const px = x + col;
				const py = y + row;
				if (px >= 0 && px < fb.width && py >= 0 && py < fb.height) {
					three.setPixelUnsafe(fb, px, py, r, g, b, 255);
				}
			}
		}
	}
}

/**
 * Draw a string at the given position.
 */
function drawText(
	fb: three.PixelFramebuffer,
	x: number,
	y: number,
	text: string,
	r: number,
	g: number,
	b: number,
): void {
	for (let i = 0; i < text.length; i++) {
		const ch = text[i];
		if (ch && ch !== ' ') {
			drawFontChar(fb, x + i * CHAR_WIDTH, y, ch, r, g, b);
		}
	}
}

/**
 * Draw a string centered horizontally on screen.
 */
function drawTextCentered(
	fb: three.PixelFramebuffer,
	y: number,
	text: string,
	r: number,
	g: number,
	b: number,
): void {
	const textWidth = text.length * CHAR_WIDTH;
	const x = Math.floor((fb.width - textWidth) / 2);
	drawText(fb, x, y, text, r, g, b);
}

/**
 * Fill a rectangle with a color (with alpha blending for dimming).
 */
function fillRect(
	fb: three.PixelFramebuffer,
	x: number,
	y: number,
	w: number,
	h: number,
	r: number,
	g: number,
	b: number,
	a: number,
): void {
	for (let py = y; py < y + h && py < fb.height; py++) {
		if (py < 0) continue;
		for (let px = x; px < x + w && px < fb.width; px++) {
			if (px < 0) continue;
			if (a >= 255) {
				three.setPixelUnsafe(fb, px, py, r, g, b, 255);
			} else {
				// Alpha blend
				const idx = (py * fb.width + px) * 4;
				const sr = fb.data[idx] ?? 0;
				const sg = fb.data[idx + 1] ?? 0;
				const sb = fb.data[idx + 2] ?? 0;
				const alpha = a / 255;
				const outR = Math.round(sr * (1 - alpha) + r * alpha);
				const outG = Math.round(sg * (1 - alpha) + g * alpha);
				const outB = Math.round(sb * (1 - alpha) + b * alpha);
				three.setPixelUnsafe(fb, px, py, outR, outG, outB, 255);
			}
		}
	}
}

// ─── Title Screen Rendering ───────────────────────────────────────

/**
 * Draw the TITLEPIC background to the framebuffer.
 *
 * @param fb - Pixel framebuffer (320x200)
 * @param palette - Color palette for index-to-RGB conversion
 */
export function drawTitlePic(
	fb: three.PixelFramebuffer,
	palette: Palette,
): void {
	if (!titlePicPixels) {
		// No TITLEPIC, fill with dark red
		for (let y = 0; y < fb.height; y++) {
			for (let x = 0; x < fb.width; x++) {
				three.setPixelUnsafe(fb, x, y, 80, 0, 0, 255);
			}
		}
		return;
	}

	for (let y = 0; y < fb.height && y < titlePicHeight; y++) {
		for (let x = 0; x < fb.width && x < titlePicWidth; x++) {
			const palIdx = titlePicPixels[y * titlePicWidth + x] ?? 0;
			const color = palette[palIdx];
			if (color) {
				three.setPixelUnsafe(fb, x, y, color.r, color.g, color.b, 255);
			}
		}
	}
}

// ─── Menu Colors ──────────────────────────────────────────────────

const MENU_BG_ALPHA = 160;
const ITEM_R = 220;
const ITEM_G = 180;
const ITEM_B = 50;
const SELECTED_R = 255;
const SELECTED_G = 50;
const SELECTED_B = 50;
const TITLE_R = 255;
const TITLE_G = 255;
const TITLE_B = 255;
const CURSOR_R = 255;
const CURSOR_G = 50;
const CURSOR_B = 50;

// ─── Menu Drawing ─────────────────────────────────────────────────

/**
 * Draw the title screen with menu overlays.
 *
 * Renders the TITLEPIC background, then overlays the appropriate
 * menu (main menu or skill selection) based on the menu state.
 *
 * @param fb - Pixel framebuffer
 * @param palette - Color palette
 * @param menu - Current menu state
 */
export function drawTitleScreen(
	fb: three.PixelFramebuffer,
	palette: Palette,
	menu: MenuState,
): void {
	// Draw TITLEPIC as background
	drawTitlePic(fb, palette);

	if (menu.mode === MenuMode.TITLE) {
		drawMainMenu(fb, menu);
	} else if (menu.mode === MenuMode.SKILL_SELECT) {
		drawSkillMenu(fb, menu);
	}
}

/**
 * Draw the main menu overlay (NEW GAME, QUIT).
 */
function drawMainMenu(
	fb: three.PixelFramebuffer,
	menu: MenuState,
): void {
	const items = MAIN_MENU_ITEMS;
	const menuHeight = items.length * 16 + 30;
	const menuTop = Math.floor((fb.height - menuHeight) / 2) + 20;

	// Semi-transparent background panel
	fillRect(fb, 60, menuTop - 10, 200, menuHeight + 10, 0, 0, 0, MENU_BG_ALPHA);

	// Title text
	drawTextCentered(fb, menuTop, 'TERMINAL DOOM', TITLE_R, TITLE_G, TITLE_B);

	// Menu items
	const itemStartY = menuTop + 20;
	for (let i = 0; i < items.length; i++) {
		const item = items[i];
		if (!item) continue;

		const y = itemStartY + i * 16;
		const isSelected = menu.selectedItem === i;

		if (isSelected) {
			// Blinking cursor (every 16 tics)
			const showCursor = (menu.ticCount % 32) < 20;
			if (showCursor) {
				const textWidth = item.length * CHAR_WIDTH;
				const textX = Math.floor((fb.width - textWidth) / 2);
				drawText(fb, textX - 12, y, '>', CURSOR_R, CURSOR_G, CURSOR_B);
			}
			drawTextCentered(fb, y, item, SELECTED_R, SELECTED_G, SELECTED_B);
		} else {
			drawTextCentered(fb, y, item, ITEM_R, ITEM_G, ITEM_B);
		}
	}
}

/**
 * Draw the skill selection menu overlay.
 */
function drawSkillMenu(
	fb: three.PixelFramebuffer,
	menu: MenuState,
): void {
	const items = SKILL_NAMES;
	const menuHeight = items.length * 14 + 30;
	const menuTop = Math.floor((fb.height - menuHeight) / 2);

	// Semi-transparent background panel
	fillRect(fb, 20, menuTop - 10, 280, menuHeight + 10, 0, 0, 0, MENU_BG_ALPHA);

	// Title
	drawTextCentered(fb, menuTop, 'CHOOSE YOUR SKILL', TITLE_R, TITLE_G, TITLE_B);

	// Skill items
	const itemStartY = menuTop + 18;
	for (let i = 0; i < items.length; i++) {
		const item = items[i];
		if (!item) continue;

		const y = itemStartY + i * 14;
		const isSelected = menu.selectedItem === i;

		if (isSelected) {
			const showCursor = (menu.ticCount % 32) < 20;
			if (showCursor) {
				const textWidth = item.length * CHAR_WIDTH;
				const textX = Math.floor((fb.width - textWidth) / 2);
				drawText(fb, textX - 12, y, '>', CURSOR_R, CURSOR_G, CURSOR_B);
			}
			drawTextCentered(fb, y, item, SELECTED_R, SELECTED_G, SELECTED_B);
		} else {
			drawTextCentered(fb, y, item, ITEM_R, ITEM_G, ITEM_B);
		}
	}

	// Footer hint
	drawTextCentered(fb, menuTop + menuHeight - 4, 'ESC TO GO BACK', 120, 120, 120);
}
