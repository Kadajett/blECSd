/**
 * Sprite lump loading and frame/rotation lookup.
 *
 * Parses sprite lumps from between S_START and S_END markers in the WAD,
 * groups them by sprite name, frame letter, and rotation index, and provides
 * lookup functions for sprite rendering.
 *
 * @module wad/spriteData
 */

import type { Picture, WadFile } from './types.js';
import { getLumpsBetween } from './wad.js';
import { parsePicture } from './pictureFormat.js';

// ─── Sprite Data Types ────────────────────────────────────────────

/** A single animation frame of a sprite, with up to 8 rotations. */
export interface SpriteFrame {
	/** Pictures for each rotation (0-7). Rotation 0 means single rotation for all angles. */
	readonly rotations: (Picture | null)[];
	/** Whether each rotation is horizontally flipped (mirrored). */
	readonly flipped: boolean[];
	/** Whether this frame is full-bright (ignore light level). */
	readonly fullBright: boolean;
}

/** Complete sprite definition with all frames. */
export interface SpriteDef {
	/** Four-character sprite prefix name. */
	readonly name: string;
	/** Animation frames, indexed by frame letter (A=0, B=1, ...). */
	readonly frames: SpriteFrame[];
}

/** Collection of all loaded sprites, keyed by name. */
export interface SpriteStore {
	/** Map from sprite name (e.g. "POSS") to its definition. */
	readonly sprites: ReadonlyMap<string, SpriteDef>;
}

// ─── Sprite Loading ───────────────────────────────────────────────

/**
 * Load all sprites from a WAD file.
 *
 * Reads sprite lumps between S_START and S_END markers, parses each
 * lump name to extract the sprite name, frame letter, and rotation,
 * then groups them into SpriteDef structures.
 *
 * @param wad - Loaded WAD file
 * @returns SpriteStore containing all parsed sprites
 *
 * @example
 * ```typescript
 * import { loadSprites } from './spriteData.js';
 * const store = loadSprites(wad);
 * const possFrame = getSpriteFrame(store, 'POSS', 0);
 * ```
 */
export function loadSprites(wad: WadFile): SpriteStore {
	const spriteLumps = getLumpsBetween(wad, 'S_START', 'S_END');

	// Intermediate storage: name -> frame index -> rotation index -> Picture
	const spriteMap = new Map<string, Map<number, { rotations: (Picture | null)[]; flipped: boolean[]; fullBright: boolean }>>();

	for (const lump of spriteLumps) {
		const name = lump.name;
		if (name.length < 6) continue;

		// Parse lump name: XXXXFY or XXXXFYFY
		// First 4 chars = sprite name, char 5 = frame letter (A-Z), char 6 = rotation (0-8)
		const spriteName = name.slice(0, 4);
		const frameChar = name.charCodeAt(4) - 65; // A=0, B=1, ...
		const rotationChar = name.charCodeAt(5) - 48; // '0'=0, '1'=1, ...

		if (frameChar < 0 || frameChar > 28) continue;
		if (rotationChar < 0 || rotationChar > 8) continue;

		// Parse the picture data
		let picture: Picture;
		try {
			const data = wad.raw.subarray(lump.filepos, lump.filepos + lump.size);
			picture = parsePicture(data);
		} catch {
			continue; // Skip unparseable sprite lumps
		}

		// Get or create sprite entry
		let frameMap = spriteMap.get(spriteName);
		if (!frameMap) {
			frameMap = new Map();
			spriteMap.set(spriteName, frameMap);
		}

		// Set frame/rotation for the primary entry (not flipped)
		setFrameRotation(frameMap, frameChar, rotationChar, picture, false);

		// Handle mirrored frame (8-char lump names): chars 7-8 are mirror frame+rotation
		// The mirrored entry uses the same picture but is drawn flipped horizontally
		if (name.length >= 8) {
			const mirrorFrameChar = name.charCodeAt(6) - 65;
			const mirrorRotChar = name.charCodeAt(7) - 48;

			if (mirrorFrameChar >= 0 && mirrorFrameChar <= 28 && mirrorRotChar >= 0 && mirrorRotChar <= 8) {
				setFrameRotation(frameMap, mirrorFrameChar, mirrorRotChar, picture, true);
			}
		}
	}

	// Convert intermediate map to SpriteDef structures
	const sprites = new Map<string, SpriteDef>();

	for (const [name, frameMap] of spriteMap) {
		// Find the highest frame index
		let maxFrame = 0;
		for (const frameIdx of frameMap.keys()) {
			if (frameIdx > maxFrame) maxFrame = frameIdx;
		}

		const frames: SpriteFrame[] = [];
		for (let i = 0; i <= maxFrame; i++) {
			const entry = frameMap.get(i);
			if (entry) {
				frames.push({
					rotations: entry.rotations,
					flipped: entry.flipped,
					fullBright: entry.fullBright,
				});
			} else {
				frames.push({
					rotations: [null, null, null, null, null, null, null, null],
					flipped: [false, false, false, false, false, false, false, false],
					fullBright: false,
				});
			}
		}

		sprites.set(name, { name, frames });
	}

	return { sprites };
}

/**
 * Set a picture into a frame's rotation slot.
 */
function setFrameRotation(
	frameMap: Map<number, { rotations: (Picture | null)[]; flipped: boolean[]; fullBright: boolean }>,
	frameIdx: number,
	rotation: number,
	picture: Picture,
	flip: boolean,
): void {
	let entry = frameMap.get(frameIdx);
	if (!entry) {
		entry = {
			rotations: [null, null, null, null, null, null, null, null],
			flipped: [false, false, false, false, false, false, false, false],
			fullBright: false,
		};
		frameMap.set(frameIdx, entry);
	}

	if (rotation === 0) {
		// Rotation 0 = use this picture for all angles (fill all 8 slots)
		for (let r = 0; r < 8; r++) {
			entry.rotations[r] = picture;
			entry.flipped[r] = flip;
		}
	} else {
		// Rotations 1-8 map to indices 0-7
		entry.rotations[rotation - 1] = picture;
		entry.flipped[rotation - 1] = flip;
	}
}

// ─── Sprite Lookup ────────────────────────────────────────────────

/**
 * Look up a sprite frame by name and frame index.
 *
 * @param store - Sprite store from loadSprites
 * @param name - Four-character sprite prefix (e.g. "POSS")
 * @param frame - Frame index (0-based, corresponding to frame letter A=0, B=1, ...)
 * @returns The sprite frame, or null if not found
 *
 * @example
 * ```typescript
 * const frame = getSpriteFrame(store, 'TROO', 0);
 * if (frame) {
 *   const pic = getSpriteRotation(frame, 3);
 * }
 * ```
 */
export function getSpriteFrame(store: SpriteStore, name: string, frame: number): SpriteFrame | null {
	const def = store.sprites.get(name);
	if (!def) return null;

	const spriteFrame = def.frames[frame];
	if (!spriteFrame) return null;

	return spriteFrame;
}

/** Result of a sprite rotation lookup, including the flip flag. */
export interface SpriteRotationResult {
	readonly picture: Picture;
	readonly flip: boolean;
}

/**
 * Get the picture for a specific rotation from a sprite frame.
 *
 * If the frame only has rotation 0 set (single rotation for all angles),
 * that picture is returned regardless of the requested angle. Otherwise,
 * the picture at the given rotation index (0-7) is returned.
 *
 * @param frame - Sprite frame to look up
 * @param angle - Rotation index (0-7)
 * @returns The picture and flip flag for the rotation, or null if not available
 *
 * @example
 * ```typescript
 * const result = getSpriteRotation(frame, 0);
 * if (result) {
 *   console.log(`Sprite: ${result.picture.width}x${result.picture.height}, flip: ${result.flip}`);
 * }
 * ```
 */
export function getSpriteRotation(frame: SpriteFrame, angle: number): SpriteRotationResult | null {
	// Rotation 0 sprites have all 8 slots filled with the same picture,
	// so this lookup works for both single-rotation and multi-rotation sprites.
	const idx = angle & 7;
	const pic = frame.rotations[idx];
	if (!pic) return null;
	return { picture: pic, flip: frame.flipped[idx] ?? false };
}
