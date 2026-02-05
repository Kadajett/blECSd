/**
 * Sprite component for game entities with frame-based graphics.
 * @module components/sprite
 */

import { addComponent, hasComponent } from '../core/ecs';
import type { Entity, World } from '../core/types';

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

// =============================================================================
// SPRITE CELL AND FRAME TYPES
// =============================================================================

/**
 * A single cell in a sprite frame.
 * Represents one character position with optional color styling.
 */
export interface SpriteCell {
	/** The character to render (can be ' ' for transparent/empty) */
	char: string;
	/** Foreground color (packed RGBA), undefined uses entity's default */
	fg?: number;
	/** Background color (packed RGBA), undefined uses entity's default */
	bg?: number;
}

/**
 * A single frame of a sprite, represented as a 2D array of cells.
 * First index is row (y), second is column (x).
 */
export type SpriteFrame = SpriteCell[][];

/**
 * Complete sprite sheet data stored in the sprite store.
 */
export interface SpriteSheetData {
	/** Unique identifier for this sprite sheet */
	readonly id: number;
	/** Human-readable name for the sprite */
	readonly name: string;
	/** Array of animation frames */
	readonly frames: readonly SpriteFrame[];
	/** Width in terminal cells */
	readonly width: number;
	/** Height in terminal cells */
	readonly height: number;
}

/**
 * Options for creating a new sprite sheet.
 */
export interface SpriteSheetOptions {
	/** Human-readable name for the sprite */
	name: string;
	/** Array of animation frames */
	frames: SpriteFrame[];
	/** Width in terminal cells (inferred from first frame if not provided) */
	width?: number;
	/** Height in terminal cells (inferred from first frame if not provided) */
	height?: number;
}

// =============================================================================
// SPRITE STORE (for frame data)
// =============================================================================

let nextSpriteSheetId = 1;

/**
 * Storage for sprite sheet data.
 * Maps sprite sheet IDs to their frame data.
 *
 * @example
 * ```typescript
 * import { spriteStore, registerSprite, getSpriteSheet } from 'blecsd';
 *
 * // Register a sprite
 * const spriteId = registerSprite({
 *   name: 'player',
 *   frames: [
 *     [[{ char: '@' }]],  // Frame 0
 *     [[{ char: 'O' }]],  // Frame 1
 *   ],
 * });
 *
 * // Get sprite data
 * const sheet = getSpriteSheet(spriteId);
 * console.log(sheet?.name); // 'player'
 * ```
 */
export const spriteStore = {
	/** Map of sprite sheet ID to data */
	sheets: new Map<number, SpriteSheetData>(),
	/** Map of sprite name to ID for lookup */
	nameToId: new Map<string, number>(),
};

/**
 * Resets the sprite store to initial state.
 * Useful for testing.
 */
export function resetSpriteStore(): void {
	spriteStore.sheets.clear();
	spriteStore.nameToId.clear();
	nextSpriteSheetId = 1;
}

/**
 * Registers a new sprite sheet and returns its ID.
 *
 * @param options - Sprite sheet configuration
 * @returns The sprite sheet ID
 *
 * @example
 * ```typescript
 * import { registerSprite } from 'blecsd';
 *
 * // Simple single-frame sprite
 * const playerId = registerSprite({
 *   name: 'player',
 *   frames: [
 *     [
 *       [{ char: ' ', bg: 0xff0000ff }, { char: ' ', bg: 0xff0000ff }],
 *       [{ char: '/', fg: 0xffffffff }, { char: '\\', fg: 0xffffffff }],
 *     ],
 *   ],
 * });
 *
 * // Multi-frame animated sprite
 * const coinId = registerSprite({
 *   name: 'coin',
 *   frames: [
 *     [[{ char: 'O', fg: 0xffffff00 }]],
 *     [[{ char: 'o', fg: 0xffffff00 }]],
 *     [[{ char: '.', fg: 0xffffff00 }]],
 *     [[{ char: 'o', fg: 0xffffff00 }]],
 *   ],
 * });
 * ```
 */
export function registerSprite(options: SpriteSheetOptions): number {
	const id = nextSpriteSheetId++;
	const firstFrame = options.frames[0];

	// Infer dimensions from first frame if not provided
	const height = options.height ?? firstFrame?.length ?? 0;
	const width = options.width ?? firstFrame?.[0]?.length ?? 0;

	const data: SpriteSheetData = {
		id,
		name: options.name,
		frames: options.frames,
		width,
		height,
	};

	spriteStore.sheets.set(id, data);
	spriteStore.nameToId.set(options.name, id);

	return id;
}

/**
 * Gets a sprite sheet by ID.
 *
 * @param id - The sprite sheet ID
 * @returns The sprite sheet data or undefined if not found
 *
 * @example
 * ```typescript
 * import { getSpriteSheet } from 'blecsd';
 *
 * const sheet = getSpriteSheet(playerId);
 * if (sheet) {
 *   console.log(`${sheet.name}: ${sheet.frames.length} frames`);
 * }
 * ```
 */
export function getSpriteSheet(id: number): SpriteSheetData | undefined {
	return spriteStore.sheets.get(id);
}

/**
 * Gets a sprite sheet by name.
 *
 * @param name - The sprite name
 * @returns The sprite sheet data or undefined if not found
 *
 * @example
 * ```typescript
 * import { getSpriteSheetByName } from 'blecsd';
 *
 * const sheet = getSpriteSheetByName('player');
 * if (sheet) {
 *   console.log(`Found sprite with ${sheet.frames.length} frames`);
 * }
 * ```
 */
export function getSpriteSheetByName(name: string): SpriteSheetData | undefined {
	const id = spriteStore.nameToId.get(name);
	if (id === undefined) {
		return undefined;
	}
	return spriteStore.sheets.get(id);
}

/**
 * Gets a sprite sheet ID by name.
 *
 * @param name - The sprite name
 * @returns The sprite sheet ID or undefined if not found
 */
export function getSpriteIdByName(name: string): number | undefined {
	return spriteStore.nameToId.get(name);
}

/**
 * Unregisters a sprite sheet.
 *
 * @param id - The sprite sheet ID to remove
 * @returns true if removed, false if not found
 */
export function unregisterSprite(id: number): boolean {
	const sheet = spriteStore.sheets.get(id);
	if (!sheet) {
		return false;
	}
	spriteStore.nameToId.delete(sheet.name);
	spriteStore.sheets.delete(id);
	return true;
}

// =============================================================================
// SPRITE COMPONENT (per-entity data)
// =============================================================================

/**
 * Sprite component store using SoA (Structure of Arrays) for performance.
 *
 * - `frameIndex`: Current animation frame (0-based)
 * - `frameCount`: Total number of frames in the sprite (cached from sheet)
 * - `frameWidth`: Width in terminal cells (cached from sheet)
 * - `frameHeight`: Height in terminal cells (cached from sheet)
 * - `spriteSheetId`: Reference to sprite sheet in spriteStore
 *
 * @example
 * ```typescript
 * import { Sprite, setSprite, getSprite, setFrame } from 'blecsd';
 *
 * // Assign a sprite to an entity
 * setSprite(world, entity, playerId);
 *
 * // Change frame for animation
 * setFrame(world, entity, 1);
 *
 * // Get sprite data
 * const sprite = getSprite(world, entity);
 * console.log(`Frame ${sprite?.frameIndex} of ${sprite?.frameCount}`);
 * ```
 */
export const Sprite = {
	/** Current animation frame index (0-based) */
	frameIndex: new Uint16Array(DEFAULT_CAPACITY),
	/** Total number of frames (cached from sprite sheet) */
	frameCount: new Uint16Array(DEFAULT_CAPACITY),
	/** Width in terminal cells (cached from sprite sheet) */
	frameWidth: new Uint8Array(DEFAULT_CAPACITY),
	/** Height in terminal cells (cached from sprite sheet) */
	frameHeight: new Uint8Array(DEFAULT_CAPACITY),
	/** Reference to sprite sheet ID in spriteStore */
	spriteSheetId: new Uint32Array(DEFAULT_CAPACITY),
};

/**
 * Sprite data returned by getSprite.
 */
export interface SpriteData {
	/** Current animation frame index */
	readonly frameIndex: number;
	/** Total number of frames */
	readonly frameCount: number;
	/** Width in terminal cells */
	readonly frameWidth: number;
	/** Height in terminal cells */
	readonly frameHeight: number;
	/** Sprite sheet ID */
	readonly spriteSheetId: number;
}

/**
 * Assigns a sprite to an entity.
 * Adds the Sprite component if not already present.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param spriteSheetId - The sprite sheet ID from registerSprite()
 * @param initialFrame - Initial frame index (default: 0)
 * @returns The entity ID for chaining, or undefined if sprite not found
 *
 * @example
 * ```typescript
 * import { createWorld, addEntity } from '../core/ecs';
 * import { registerSprite, setSprite } from 'blecsd';
 *
 * const world = createWorld();
 * const entity = addEntity(world);
 *
 * const playerId = registerSprite({
 *   name: 'player',
 *   frames: [[[{ char: '@' }]]],
 * });
 *
 * setSprite(world, entity, playerId);
 * ```
 */
export function setSprite(
	world: World,
	eid: Entity,
	spriteSheetId: number,
	initialFrame = 0,
): Entity | undefined {
	const sheet = getSpriteSheet(spriteSheetId);
	if (!sheet) {
		return undefined;
	}

	if (!hasComponent(world, eid, Sprite)) {
		addComponent(world, eid, Sprite);
	}

	Sprite.spriteSheetId[eid] = spriteSheetId;
	Sprite.frameCount[eid] = sheet.frames.length;
	Sprite.frameWidth[eid] = sheet.width;
	Sprite.frameHeight[eid] = sheet.height;
	Sprite.frameIndex[eid] = Math.min(initialFrame, sheet.frames.length - 1);

	return eid;
}

/**
 * Assigns a sprite to an entity by name.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param spriteName - The sprite name
 * @param initialFrame - Initial frame index (default: 0)
 * @returns The entity ID for chaining, or undefined if sprite not found
 *
 * @example
 * ```typescript
 * import { setSpriteByName } from 'blecsd';
 *
 * setSpriteByName(world, entity, 'player');
 * ```
 */
export function setSpriteByName(
	world: World,
	eid: Entity,
	spriteName: string,
	initialFrame = 0,
): Entity | undefined {
	const id = getSpriteIdByName(spriteName);
	if (id === undefined) {
		return undefined;
	}
	return setSprite(world, eid, id, initialFrame);
}

/**
 * Gets the sprite data of an entity.
 * Returns undefined if the entity doesn't have a Sprite component.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns Sprite data or undefined
 *
 * @example
 * ```typescript
 * import { getSprite } from 'blecsd';
 *
 * const sprite = getSprite(world, entity);
 * if (sprite) {
 *   console.log(`Frame ${sprite.frameIndex + 1} of ${sprite.frameCount}`);
 * }
 * ```
 */
export function getSprite(world: World, eid: Entity): SpriteData | undefined {
	if (!hasComponent(world, eid, Sprite)) {
		return undefined;
	}
	return {
		frameIndex: Sprite.frameIndex[eid] as number,
		frameCount: Sprite.frameCount[eid] as number,
		frameWidth: Sprite.frameWidth[eid] as number,
		frameHeight: Sprite.frameHeight[eid] as number,
		spriteSheetId: Sprite.spriteSheetId[eid] as number,
	};
}

/**
 * Gets the current frame data for an entity's sprite.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns The current frame's cell data, or undefined if no sprite
 *
 * @example
 * ```typescript
 * import { getCurrentFrame } from 'blecsd';
 *
 * const frame = getCurrentFrame(world, entity);
 * if (frame) {
 *   for (const row of frame) {
 *     for (const cell of row) {
 *       // Render cell.char with cell.fg and cell.bg
 *     }
 *   }
 * }
 * ```
 */
export function getCurrentFrame(world: World, eid: Entity): SpriteFrame | undefined {
	if (!hasComponent(world, eid, Sprite)) {
		return undefined;
	}

	const sheetId = Sprite.spriteSheetId[eid] as number;
	const sheet = getSpriteSheet(sheetId);
	if (!sheet) {
		return undefined;
	}

	const frameIndex = Sprite.frameIndex[eid] as number;
	return sheet.frames[frameIndex];
}

/**
 * Sets the current animation frame.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param frameIndex - The frame index (clamped to valid range)
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { setFrame } from 'blecsd';
 *
 * // Set to frame 2
 * setFrame(world, entity, 2);
 *
 * // Frames are clamped to valid range
 * setFrame(world, entity, 999); // Sets to last frame
 * ```
 */
export function setFrame(world: World, eid: Entity, frameIndex: number): Entity {
	if (!hasComponent(world, eid, Sprite)) {
		return eid;
	}

	const frameCount = Sprite.frameCount[eid] as number;
	const clamped = Math.max(0, Math.min(frameIndex, frameCount - 1));
	Sprite.frameIndex[eid] = clamped;

	return eid;
}

/**
 * Advances to the next animation frame, wrapping to 0 at the end.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { nextFrame } from 'blecsd';
 *
 * // Advance animation by one frame
 * nextFrame(world, entity);
 * ```
 */
export function nextFrame(world: World, eid: Entity): Entity {
	if (!hasComponent(world, eid, Sprite)) {
		return eid;
	}

	const frameCount = Sprite.frameCount[eid] as number;
	const current = Sprite.frameIndex[eid] as number;
	Sprite.frameIndex[eid] = (current + 1) % frameCount;

	return eid;
}

/**
 * Goes to the previous animation frame, wrapping to last frame at 0.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { prevFrame } from 'blecsd';
 *
 * // Go back one frame
 * prevFrame(world, entity);
 * ```
 */
export function prevFrame(world: World, eid: Entity): Entity {
	if (!hasComponent(world, eid, Sprite)) {
		return eid;
	}

	const frameCount = Sprite.frameCount[eid] as number;
	const current = Sprite.frameIndex[eid] as number;
	Sprite.frameIndex[eid] = current === 0 ? frameCount - 1 : current - 1;

	return eid;
}

/**
 * Checks if an entity has a Sprite component.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if entity has Sprite component
 *
 * @example
 * ```typescript
 * import { hasSprite } from 'blecsd';
 *
 * if (hasSprite(world, entity)) {
 *   // Safe to get sprite data
 * }
 * ```
 */
export function hasSprite(world: World, eid: Entity): boolean {
	return hasComponent(world, eid, Sprite);
}

/**
 * Gets the sprite sheet data for an entity's assigned sprite.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns The sprite sheet data or undefined
 *
 * @example
 * ```typescript
 * import { getEntitySpriteSheet } from 'blecsd';
 *
 * const sheet = getEntitySpriteSheet(world, entity);
 * if (sheet) {
 *   console.log(`Sprite: ${sheet.name}`);
 * }
 * ```
 */
export function getEntitySpriteSheet(world: World, eid: Entity): SpriteSheetData | undefined {
	if (!hasComponent(world, eid, Sprite)) {
		return undefined;
	}
	const sheetId = Sprite.spriteSheetId[eid] as number;
	return getSpriteSheet(sheetId);
}

/**
 * Removes the sprite from an entity.
 * Does not affect the sprite sheet in the store.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns The entity ID for chaining
 */
export function removeSprite(world: World, eid: Entity): Entity {
	if (hasComponent(world, eid, Sprite)) {
		Sprite.spriteSheetId[eid] = 0;
		Sprite.frameIndex[eid] = 0;
		Sprite.frameCount[eid] = 0;
		Sprite.frameWidth[eid] = 0;
		Sprite.frameHeight[eid] = 0;
	}
	return eid;
}
