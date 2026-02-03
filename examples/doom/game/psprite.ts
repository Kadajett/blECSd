/**
 * Player sprite (psprite) rendering for weapon overlays.
 *
 * Renders the current weapon sprite as a screen overlay on top of
 * the 3D view. Handles weapon bob, raise/lower animation, and
 * muzzle flash brightness.
 *
 * @module game/psprite
 */

import { three } from 'blecsd';
import { FRACBITS } from '../math/fixed.js';
import type { RenderState } from '../render/defs.js';
import type { SpriteStore } from '../wad/spriteData.js';
import { getSpriteFrame } from '../wad/spriteData.js';
import type { WeaponState } from './weapons.js';
import { WEAPON_INFO, WeaponStateType } from './weapons.js';

// ─── Constants ───────────────────────────────────────────────────

/** Y position for fully raised weapon (centered on screen). */
const WEAPON_TOP = 32;

/** Y position for lowered weapon (below screen bottom). */
const WEAPON_BOTTOM = 128;

/** Scale factor for weapon sprite rendering. */
const WEAPON_SCALE = 2;

// ─── Weapon Sprite Rendering ─────────────────────────────────────

/**
 * Draw the current weapon sprite overlay on the framebuffer.
 *
 * The weapon sprite is drawn centered horizontally and positioned
 * vertically based on the raise/lower state. During firing, the
 * frame advances through the fire animation. Weapon bob is applied
 * based on player movement.
 *
 * @param rs - Current render state with framebuffer
 * @param ws - Current weapon state
 * @param spriteStore - Loaded sprite data for weapon sprites
 */
export function drawWeaponSprite(
	rs: RenderState,
	ws: WeaponState,
	spriteStore: SpriteStore,
): void {
	const info = WEAPON_INFO[ws.current];
	if (!info) return;

	// Calculate Y offset based on weapon state
	let yOffset = 0;
	switch (ws.state) {
		case WeaponStateType.WS_RAISE: {
			const raiseTotal = info.raiseTics;
			const progress = 1.0 - ws.tics / raiseTotal;
			yOffset = WEAPON_BOTTOM - (WEAPON_BOTTOM - WEAPON_TOP) * progress;
			break;
		}
		case WeaponStateType.WS_LOWER: {
			const lowerTotal = info.lowerTics;
			const progress = 1.0 - ws.tics / lowerTotal;
			yOffset = WEAPON_TOP + (WEAPON_BOTTOM - WEAPON_TOP) * progress;
			break;
		}
		case WeaponStateType.WS_FIRE:
			// Slight upward kick during fire
			yOffset = WEAPON_TOP - 4 + ws.frame * 2;
			break;
		case WeaponStateType.WS_READY:
		default:
			yOffset = WEAPON_TOP;
			break;
	}

	// Add weapon bob
	const bobTime = Date.now() / 100;
	const bobAmplitude = Math.min(ws.bobX + ws.bobY, 0xffff) / 65536.0;
	const xBob = Math.sin(bobTime) * bobAmplitude * 4;
	const yBob = Math.abs(Math.sin(bobTime * 2)) * bobAmplitude * 2;
	yOffset += yBob;

	// Get the weapon sprite frame
	let frameIdx = 0;
	if (ws.state === WeaponStateType.WS_FIRE) {
		frameIdx = ws.frame;
	}

	const spriteFrame = getSpriteFrame(spriteStore, info.spriteName, frameIdx);
	if (!spriteFrame) {
		// Fallback: draw a simple weapon rectangle
		drawFallbackWeapon(rs, ws, yOffset + 10, xBob);
		return;
	}

	// Weapon sprites use rotation 0 (front-facing only)
	const pic = spriteFrame.rotations[0];
	if (!pic) {
		drawFallbackWeapon(rs, ws, yOffset + 10, xBob);
		return;
	}

	// Draw the weapon sprite scaled and centered
	const screenCenterX = rs.screenWidth >> 1;
	const spriteWidth = pic.width * WEAPON_SCALE;
	const spriteHeight = pic.height * WEAPON_SCALE;
	const drawX = Math.floor(screenCenterX - spriteWidth / 2 + xBob);
	const drawY = Math.floor(rs.screenHeight - spriteHeight - yOffset);

	// Determine light level (brighter during muzzle flash)
	const flashBright = ws.flashTics > 0;

	// Render column by column
	for (let sx = 0; sx < spriteWidth; sx++) {
		const texCol = Math.floor(sx / WEAPON_SCALE);
		const column = pic.columns[texCol];
		if (!column) continue;

		const px = drawX + sx;
		if (px < 0 || px >= rs.screenWidth) continue;

		for (const post of column) {
			for (let p = 0; p < post.pixels.length; p++) {
				const texRow = post.topDelta + p;
				const startScreenY = drawY + texRow * WEAPON_SCALE;

				for (let sy = 0; sy < WEAPON_SCALE; sy++) {
					const py = startScreenY + sy;
					if (py < 0 || py >= rs.screenHeight) continue;

					const paletteIdx = post.pixels[p]!;
					let colormapIdx = 0;
					if (!flashBright) {
						// Apply light diminishing based on sector light
						colormapIdx = Math.min(15, Math.max(0, 8));
					}

					const colormap = rs.colormap[colormapIdx];
					const mappedIdx = colormap ? colormap[paletteIdx] ?? paletteIdx : paletteIdx;
					const color = rs.palette[mappedIdx];
					const r = color ? color.r : 0;
					const g = color ? color.g : 0;
					const b = color ? color.b : 0;

					three.setPixelUnsafe(rs.fb, px, py, r, g, b, 255);
				}
			}
		}
	}
}

/**
 * Draw a simple fallback weapon graphic when sprites are not available.
 * Renders a colored rectangle representing the weapon.
 */
function drawFallbackWeapon(
	rs: RenderState,
	ws: WeaponState,
	yOffset: number,
	xBob: number,
): void {
	const centerX = rs.screenWidth >> 1;
	const weaponWidth = 32;
	const weaponHeight = 24;
	const drawX = Math.floor(centerX - weaponWidth / 2 + xBob);
	const drawY = Math.floor(rs.screenHeight - weaponHeight - yOffset);

	// Color based on weapon type
	let r = 128;
	let g = 128;
	let b = 128;
	if (ws.state === WeaponStateType.WS_FIRE && ws.frame === 0) {
		r = 255;
		g = 200;
		b = 50; // Muzzle flash
	}

	const statusBarTop = rs.screenHeight - 32;

	for (let y = Math.max(0, drawY); y < Math.min(statusBarTop, drawY + weaponHeight); y++) {
		for (let x = Math.max(0, drawX); x < Math.min(rs.screenWidth, drawX + weaponWidth); x++) {
			three.setPixelUnsafe(rs.fb, x, y, r, g, b, 255);
		}
	}

	// Draw barrel
	const barrelWidth = 6;
	const barrelHeight = 16;
	const barrelX = Math.floor(centerX - barrelWidth / 2 + xBob);
	const barrelY = drawY - barrelHeight;

	for (let y = Math.max(0, barrelY); y < Math.min(statusBarTop, barrelY + barrelHeight); y++) {
		for (let x = Math.max(0, barrelX); x < Math.min(rs.screenWidth, barrelX + barrelWidth); x++) {
			three.setPixelUnsafe(rs.fb, x, y, r - 20, g - 20, b - 20, 255);
		}
	}
}
