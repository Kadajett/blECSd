/**
 * Automap: top-down minimap overlay showing walls and player position.
 *
 * Renders the map geometry as seen from above, centered on the player.
 * Walls are color-coded: white for one-sided (solid), gray for two-sided
 * (passable), and yellow for lines with specials (doors, lifts, etc.).
 *
 * @module render/automap
 */

import { three } from 'blecsd';
import { FRACBITS } from '../math/fixed.js';
import type { PlayerState } from '../game/player.js';
import type { RenderState } from './defs.js';
import type { HudState } from './hud.js';
import type { MapData } from '../wad/types.js';

// ─── Constants ──────────────────────────────────────────────────────

/** Top margin for the automap viewport (pixels from top of screen). */
const AUTOMAP_TOP = 0;

/** Background overlay color (dark semi-transparent). */
const BG_R = 0;
const BG_G = 0;
const BG_B = 0;

/** Border color for the automap frame. */
const BORDER_R = 100;
const BORDER_G = 100;
const BORDER_B = 100;

// ─── Line Colors ────────────────────────────────────────────────────

/** One-sided wall (solid): white. */
const WALL_1S_R = 255;
const WALL_1S_G = 255;
const WALL_1S_B = 255;

/** Two-sided wall (passable): gray. */
const WALL_2S_R = 144;
const WALL_2S_G = 144;
const WALL_2S_B = 144;

/** Special line (door, lift, etc.): yellow. */
const WALL_SP_R = 252;
const WALL_SP_G = 252;
const WALL_SP_B = 0;

/** Player arrow color: green. */
const PLAYER_R = 0;
const PLAYER_G = 255;
const PLAYER_B = 0;

// ─── Bresenham Line Drawing ─────────────────────────────────────────

/**
 * Draw a line using Bresenham's algorithm directly to the framebuffer.
 * Pixels outside the given clipping rectangle are skipped.
 */
function drawLine(
	rs: RenderState,
	x0: number,
	y0: number,
	x1: number,
	y1: number,
	r: number,
	g: number,
	b: number,
	clipTop: number,
	clipBottom: number,
): void {
	let cx0 = Math.round(x0);
	let cy0 = Math.round(y0);
	const cx1 = Math.round(x1);
	const cy1 = Math.round(y1);

	const dx = Math.abs(cx1 - cx0);
	const dy = Math.abs(cy1 - cy0);
	const sx = cx0 < cx1 ? 1 : -1;
	const sy = cy0 < cy1 ? 1 : -1;
	let err = dx - dy;

	for (;;) {
		if (cx0 >= 0 && cx0 < rs.screenWidth && cy0 >= clipTop && cy0 < clipBottom) {
			three.setPixelUnsafe(rs.fb, cx0, cy0, r, g, b, 255);
		}

		if (cx0 === cx1 && cy0 === cy1) break;

		const e2 = 2 * err;
		if (e2 > -dy) {
			err -= dy;
			cx0 += sx;
		}
		if (e2 < dx) {
			err += dx;
			cy0 += sy;
		}
	}
}

// ─── Automap Rendering ──────────────────────────────────────────────

/**
 * Draw the automap overlay on the framebuffer.
 *
 * Centers the view on the player position and renders all map linedefs
 * with Bresenham lines. The player is shown as a small directional arrow.
 *
 * @param rs - Current render state with framebuffer
 * @param player - Player state for centering and arrow direction
 * @param hudState - HUD state containing automap zoom level
 * @param map - Map data with linedefs and vertices
 *
 * @example
 * ```typescript
 * import { drawAutomap } from './automap.js';
 * drawAutomap(renderState, player, hudState, map);
 * ```
 */
export function drawAutomap(
	rs: RenderState,
	player: PlayerState,
	hudState: HudState,
	map: MapData,
): void {
	const viewportBottom = rs.screenHeight - 32; // Leave room for status bar
	const viewportHeight = viewportBottom - AUTOMAP_TOP;
	const centerX = rs.screenWidth / 2;
	const centerY = AUTOMAP_TOP + viewportHeight / 2;

	// Draw dark background overlay
	for (let y = AUTOMAP_TOP; y < viewportBottom; y++) {
		for (let x = 0; x < rs.screenWidth; x++) {
			three.setPixelUnsafe(rs.fb, x, y, BG_R, BG_G, BG_B, 255);
		}
	}

	// Draw border
	for (let x = 0; x < rs.screenWidth; x++) {
		three.setPixelUnsafe(rs.fb, x, AUTOMAP_TOP, BORDER_R, BORDER_G, BORDER_B, 255);
		three.setPixelUnsafe(rs.fb, x, viewportBottom - 1, BORDER_R, BORDER_G, BORDER_B, 255);
	}
	for (let y = AUTOMAP_TOP; y < viewportBottom; y++) {
		three.setPixelUnsafe(rs.fb, 0, y, BORDER_R, BORDER_G, BORDER_B, 255);
		three.setPixelUnsafe(rs.fb, rs.screenWidth - 1, y, BORDER_R, BORDER_G, BORDER_B, 255);
	}

	// Player position in map units (convert from fixed-point)
	const playerMapX = player.x >> FRACBITS;
	const playerMapY = player.y >> FRACBITS;
	const zoom = hudState.automapZoom;

	// Draw all linedefs
	for (const linedef of map.linedefs) {
		const v1 = map.vertexes[linedef.v1];
		const v2 = map.vertexes[linedef.v2];
		if (!v1 || !v2) continue;

		// Transform: center on player, scale by zoom, flip Y for screen coords
		const sx0 = centerX + (v1.x - playerMapX) / zoom;
		const sy0 = centerY - (v1.y - playerMapY) / zoom;
		const sx1 = centerX + (v2.x - playerMapX) / zoom;
		const sy1 = centerY - (v2.y - playerMapY) / zoom;

		// Choose color based on line properties
		let lr: number;
		let lg: number;
		let lb: number;

		if (linedef.special !== 0) {
			lr = WALL_SP_R;
			lg = WALL_SP_G;
			lb = WALL_SP_B;
		} else if (linedef.flags & 4) {
			// TWO_SIDED
			lr = WALL_2S_R;
			lg = WALL_2S_G;
			lb = WALL_2S_B;
		} else {
			lr = WALL_1S_R;
			lg = WALL_1S_G;
			lb = WALL_1S_B;
		}

		drawLine(rs, sx0, sy0, sx1, sy1, lr, lg, lb, AUTOMAP_TOP + 1, viewportBottom - 1);
	}

	// Draw player position as a small directional arrow
	drawPlayerArrow(rs, centerX, centerY, player.angle, AUTOMAP_TOP + 1, viewportBottom - 1);
}

/**
 * Draw a small arrow at the center of the automap showing the player's
 * facing direction. The arrow is 8 pixels long from center to tip.
 */
function drawPlayerArrow(
	rs: RenderState,
	cx: number,
	cy: number,
	angle: number,
	clipTop: number,
	clipBottom: number,
): void {
	// Convert BAM angle to radians. BAM 0 = East, increases counter-clockwise.
	const radians = (angle / 0x100000000) * 2 * Math.PI;
	const cos = Math.cos(radians);
	const sin = Math.sin(radians);

	// Arrow tip (8 pixels ahead)
	const tipX = cx + cos * 8;
	const tipY = cy - sin * 8; // Screen Y is inverted

	// Arrow tail (4 pixels behind)
	const tailX = cx - cos * 4;
	const tailY = cy + sin * 4;

	// Arrow barbs (angled back)
	const barbAngle = 2.5; // radians offset for barb spread
	const barbLen = 4;
	const leftX = cx + Math.cos(radians + barbAngle) * barbLen;
	const leftY = cy - Math.sin(radians + barbAngle) * barbLen;
	const rightX = cx + Math.cos(radians - barbAngle) * barbLen;
	const rightY = cy - Math.sin(radians - barbAngle) * barbLen;

	// Draw arrow lines
	drawLine(rs, tailX, tailY, tipX, tipY, PLAYER_R, PLAYER_G, PLAYER_B, clipTop, clipBottom);
	drawLine(rs, tipX, tipY, leftX, leftY, PLAYER_R, PLAYER_G, PLAYER_B, clipTop, clipBottom);
	drawLine(rs, tipX, tipY, rightX, rightY, PLAYER_R, PLAYER_G, PLAYER_B, clipTop, clipBottom);
}
