import { beforeEach, describe, expect, it } from 'vitest';
import { addEntity, createWorld } from '../core/ecs';
import type { World } from '../core/types';
import {
	getCurrentFrame,
	getEntitySpriteSheet,
	getSprite,
	getSpriteIdByName,
	getSpriteSheet,
	getSpriteSheetByName,
	hasSprite,
	nextFrame,
	prevFrame,
	registerSprite,
	removeSprite,
	resetSpriteStore,
	Sprite,
	setFrame,
	setSprite,
	setSpriteByName,
	spriteStore,
	unregisterSprite,
} from './sprite';

describe('sprite', () => {
	let world: World;

	beforeEach(() => {
		world = createWorld();
		resetSpriteStore();
	});

	describe('spriteStore', () => {
		it('starts empty', () => {
			expect(spriteStore.sheets.size).toBe(0);
			expect(spriteStore.nameToId.size).toBe(0);
		});

		it('resets correctly', () => {
			registerSprite({
				name: 'test',
				frames: [[[{ char: '@' }]]],
			});
			expect(spriteStore.sheets.size).toBe(1);

			resetSpriteStore();
			expect(spriteStore.sheets.size).toBe(0);
			expect(spriteStore.nameToId.size).toBe(0);
		});
	});

	describe('registerSprite', () => {
		it('registers a sprite and returns an ID', () => {
			const id = registerSprite({
				name: 'player',
				frames: [[[{ char: '@' }]]],
			});

			expect(id).toBeGreaterThan(0);
			expect(spriteStore.sheets.has(id)).toBe(true);
		});

		it('assigns unique IDs', () => {
			const id1 = registerSprite({
				name: 'sprite1',
				frames: [[[{ char: 'A' }]]],
			});
			const id2 = registerSprite({
				name: 'sprite2',
				frames: [[[{ char: 'B' }]]],
			});

			expect(id1).not.toBe(id2);
		});

		it('infers dimensions from first frame', () => {
			const id = registerSprite({
				name: 'box',
				frames: [
					[
						[{ char: '+' }, { char: '-' }, { char: '+' }],
						[{ char: '|' }, { char: ' ' }, { char: '|' }],
						[{ char: '+' }, { char: '-' }, { char: '+' }],
					],
				],
			});

			const sheet = getSpriteSheet(id);
			expect(sheet?.width).toBe(3);
			expect(sheet?.height).toBe(3);
		});

		it('uses explicit dimensions if provided', () => {
			const id = registerSprite({
				name: 'custom',
				frames: [[[{ char: '@' }]]],
				width: 5,
				height: 3,
			});

			const sheet = getSpriteSheet(id);
			expect(sheet?.width).toBe(5);
			expect(sheet?.height).toBe(3);
		});

		it('stores frame data correctly', () => {
			const frames = [[[{ char: 'A', fg: 0xff0000ff }]], [[{ char: 'B', fg: 0x00ff00ff }]]];
			const id = registerSprite({
				name: 'animated',
				frames,
			});

			const sheet = getSpriteSheet(id);
			expect(sheet?.frames).toHaveLength(2);
			expect(sheet?.frames[0]?.[0]?.[0]?.char).toBe('A');
			expect(sheet?.frames[1]?.[0]?.[0]?.char).toBe('B');
		});

		it('maps name to ID', () => {
			const id = registerSprite({
				name: 'named-sprite',
				frames: [[[{ char: 'X' }]]],
			});

			expect(spriteStore.nameToId.get('named-sprite')).toBe(id);
		});
	});

	describe('getSpriteSheet', () => {
		it('returns sprite sheet by ID', () => {
			const id = registerSprite({
				name: 'test',
				frames: [[[{ char: '@' }]]],
			});

			const sheet = getSpriteSheet(id);
			expect(sheet).toBeDefined();
			expect(sheet?.name).toBe('test');
			expect(sheet?.id).toBe(id);
		});

		it('returns undefined for invalid ID', () => {
			expect(getSpriteSheet(999)).toBeUndefined();
		});
	});

	describe('getSpriteSheetByName', () => {
		it('returns sprite sheet by name', () => {
			registerSprite({
				name: 'player',
				frames: [[[{ char: '@' }]]],
			});

			const sheet = getSpriteSheetByName('player');
			expect(sheet).toBeDefined();
			expect(sheet?.name).toBe('player');
		});

		it('returns undefined for unknown name', () => {
			expect(getSpriteSheetByName('nonexistent')).toBeUndefined();
		});
	});

	describe('getSpriteIdByName', () => {
		it('returns ID for known name', () => {
			const id = registerSprite({
				name: 'coin',
				frames: [[[{ char: 'O' }]]],
			});

			expect(getSpriteIdByName('coin')).toBe(id);
		});

		it('returns undefined for unknown name', () => {
			expect(getSpriteIdByName('unknown')).toBeUndefined();
		});
	});

	describe('unregisterSprite', () => {
		it('removes sprite from store', () => {
			const id = registerSprite({
				name: 'temp',
				frames: [[[{ char: 'T' }]]],
			});

			expect(unregisterSprite(id)).toBe(true);
			expect(getSpriteSheet(id)).toBeUndefined();
			expect(getSpriteSheetByName('temp')).toBeUndefined();
		});

		it('returns false for unknown ID', () => {
			expect(unregisterSprite(999)).toBe(false);
		});
	});

	describe('Sprite component', () => {
		it('has typed arrays for all fields', () => {
			expect(Sprite.frameIndex).toBeInstanceOf(Uint16Array);
			expect(Sprite.frameCount).toBeInstanceOf(Uint16Array);
			expect(Sprite.frameWidth).toBeInstanceOf(Uint8Array);
			expect(Sprite.frameHeight).toBeInstanceOf(Uint8Array);
			expect(Sprite.spriteSheetId).toBeInstanceOf(Uint32Array);
		});
	});

	describe('setSprite', () => {
		it('assigns sprite to entity', () => {
			const spriteId = registerSprite({
				name: 'player',
				frames: [[[{ char: '@' }]]],
			});
			const eid = addEntity(world);

			const result = setSprite(world, eid, spriteId);

			expect(result).toBe(eid);
			expect(hasSprite(world, eid)).toBe(true);
		});

		it('sets component values from sprite sheet', () => {
			const spriteId = registerSprite({
				name: 'animated',
				frames: [
					[
						[{ char: 'A' }, { char: 'B' }],
						[{ char: 'C' }, { char: 'D' }],
					],
					[
						[{ char: 'E' }, { char: 'F' }],
						[{ char: 'G' }, { char: 'H' }],
					],
				],
			});
			const eid = addEntity(world);

			setSprite(world, eid, spriteId);

			expect(Sprite.spriteSheetId[eid]).toBe(spriteId);
			expect(Sprite.frameCount[eid]).toBe(2);
			expect(Sprite.frameWidth[eid]).toBe(2);
			expect(Sprite.frameHeight[eid]).toBe(2);
			expect(Sprite.frameIndex[eid]).toBe(0);
		});

		it('accepts initial frame', () => {
			const spriteId = registerSprite({
				name: 'multi',
				frames: [[[{ char: 'A' }]], [[{ char: 'B' }]], [[{ char: 'C' }]]],
			});
			const eid = addEntity(world);

			setSprite(world, eid, spriteId, 1);

			expect(Sprite.frameIndex[eid]).toBe(1);
		});

		it('clamps initial frame to valid range', () => {
			const spriteId = registerSprite({
				name: 'short',
				frames: [[[{ char: 'A' }]], [[{ char: 'B' }]]],
			});
			const eid = addEntity(world);

			setSprite(world, eid, spriteId, 99);

			expect(Sprite.frameIndex[eid]).toBe(1); // Last frame
		});

		it('returns undefined for invalid sprite ID', () => {
			const eid = addEntity(world);
			const result = setSprite(world, eid, 999);

			expect(result).toBeUndefined();
			expect(hasSprite(world, eid)).toBe(false);
		});
	});

	describe('setSpriteByName', () => {
		it('assigns sprite by name', () => {
			registerSprite({
				name: 'enemy',
				frames: [[[{ char: 'E' }]]],
			});
			const eid = addEntity(world);

			const result = setSpriteByName(world, eid, 'enemy');

			expect(result).toBe(eid);
			expect(hasSprite(world, eid)).toBe(true);
		});

		it('returns undefined for unknown name', () => {
			const eid = addEntity(world);
			const result = setSpriteByName(world, eid, 'unknown');

			expect(result).toBeUndefined();
		});
	});

	describe('getSprite', () => {
		it('returns sprite data', () => {
			const spriteId = registerSprite({
				name: 'test',
				frames: [[[{ char: '@' }]], [[{ char: 'O' }]]],
				width: 1,
				height: 1,
			});
			const eid = addEntity(world);
			setSprite(world, eid, spriteId, 1);

			const sprite = getSprite(world, eid);

			expect(sprite).toEqual({
				frameIndex: 1,
				frameCount: 2,
				frameWidth: 1,
				frameHeight: 1,
				spriteSheetId: spriteId,
			});
		});

		it('returns undefined for entity without sprite', () => {
			const eid = addEntity(world);
			expect(getSprite(world, eid)).toBeUndefined();
		});
	});

	describe('getCurrentFrame', () => {
		it('returns current frame data', () => {
			const spriteId = registerSprite({
				name: 'test',
				frames: [[[{ char: 'A', fg: 0xff0000ff }]], [[{ char: 'B', fg: 0x00ff00ff }]]],
			});
			const eid = addEntity(world);
			setSprite(world, eid, spriteId, 0);

			const frame = getCurrentFrame(world, eid);

			expect(frame).toBeDefined();
			expect(frame?.[0]?.[0]?.char).toBe('A');
			expect(frame?.[0]?.[0]?.fg).toBe(0xff0000ff);
		});

		it('returns correct frame after setFrame', () => {
			const spriteId = registerSprite({
				name: 'test',
				frames: [[[{ char: 'A' }]], [[{ char: 'B' }]]],
			});
			const eid = addEntity(world);
			setSprite(world, eid, spriteId);
			setFrame(world, eid, 1);

			const frame = getCurrentFrame(world, eid);
			expect(frame?.[0]?.[0]?.char).toBe('B');
		});

		it('returns undefined for entity without sprite', () => {
			const eid = addEntity(world);
			expect(getCurrentFrame(world, eid)).toBeUndefined();
		});

		it('returns undefined if sprite sheet was removed', () => {
			const spriteId = registerSprite({
				name: 'test',
				frames: [[[{ char: '@' }]]],
			});
			const eid = addEntity(world);
			setSprite(world, eid, spriteId);

			unregisterSprite(spriteId);

			expect(getCurrentFrame(world, eid)).toBeUndefined();
		});
	});

	describe('setFrame', () => {
		it('sets the frame index', () => {
			const spriteId = registerSprite({
				name: 'multi',
				frames: [[[{ char: 'A' }]], [[{ char: 'B' }]], [[{ char: 'C' }]]],
			});
			const eid = addEntity(world);
			setSprite(world, eid, spriteId);

			setFrame(world, eid, 2);

			expect(Sprite.frameIndex[eid]).toBe(2);
		});

		it('clamps to valid range (high)', () => {
			const spriteId = registerSprite({
				name: 'short',
				frames: [[[{ char: 'A' }]], [[{ char: 'B' }]]],
			});
			const eid = addEntity(world);
			setSprite(world, eid, spriteId);

			setFrame(world, eid, 99);

			expect(Sprite.frameIndex[eid]).toBe(1);
		});

		it('clamps to valid range (low)', () => {
			const spriteId = registerSprite({
				name: 'short',
				frames: [[[{ char: 'A' }]], [[{ char: 'B' }]]],
			});
			const eid = addEntity(world);
			setSprite(world, eid, spriteId);

			setFrame(world, eid, -5);

			expect(Sprite.frameIndex[eid]).toBe(0);
		});

		it('returns entity for chaining', () => {
			const spriteId = registerSprite({
				name: 'test',
				frames: [[[{ char: '@' }]]],
			});
			const eid = addEntity(world);
			setSprite(world, eid, spriteId);

			expect(setFrame(world, eid, 0)).toBe(eid);
		});

		it('handles entity without sprite', () => {
			const eid = addEntity(world);
			expect(setFrame(world, eid, 0)).toBe(eid);
		});
	});

	describe('nextFrame', () => {
		it('advances to next frame', () => {
			const spriteId = registerSprite({
				name: 'anim',
				frames: [[[{ char: 'A' }]], [[{ char: 'B' }]], [[{ char: 'C' }]]],
			});
			const eid = addEntity(world);
			setSprite(world, eid, spriteId);

			nextFrame(world, eid);
			expect(Sprite.frameIndex[eid]).toBe(1);

			nextFrame(world, eid);
			expect(Sprite.frameIndex[eid]).toBe(2);
		});

		it('wraps to 0 at end', () => {
			const spriteId = registerSprite({
				name: 'short',
				frames: [[[{ char: 'A' }]], [[{ char: 'B' }]]],
			});
			const eid = addEntity(world);
			setSprite(world, eid, spriteId, 1);

			nextFrame(world, eid);

			expect(Sprite.frameIndex[eid]).toBe(0);
		});

		it('handles entity without sprite', () => {
			const eid = addEntity(world);
			expect(nextFrame(world, eid)).toBe(eid);
		});
	});

	describe('prevFrame', () => {
		it('goes to previous frame', () => {
			const spriteId = registerSprite({
				name: 'anim',
				frames: [[[{ char: 'A' }]], [[{ char: 'B' }]], [[{ char: 'C' }]]],
			});
			const eid = addEntity(world);
			setSprite(world, eid, spriteId, 2);

			prevFrame(world, eid);
			expect(Sprite.frameIndex[eid]).toBe(1);

			prevFrame(world, eid);
			expect(Sprite.frameIndex[eid]).toBe(0);
		});

		it('wraps to last frame at 0', () => {
			const spriteId = registerSprite({
				name: 'short',
				frames: [[[{ char: 'A' }]], [[{ char: 'B' }]], [[{ char: 'C' }]]],
			});
			const eid = addEntity(world);
			setSprite(world, eid, spriteId, 0);

			prevFrame(world, eid);

			expect(Sprite.frameIndex[eid]).toBe(2);
		});

		it('handles entity without sprite', () => {
			const eid = addEntity(world);
			expect(prevFrame(world, eid)).toBe(eid);
		});
	});

	describe('hasSprite', () => {
		it('returns true for entity with sprite', () => {
			const spriteId = registerSprite({
				name: 'test',
				frames: [[[{ char: '@' }]]],
			});
			const eid = addEntity(world);
			setSprite(world, eid, spriteId);

			expect(hasSprite(world, eid)).toBe(true);
		});

		it('returns false for entity without sprite', () => {
			const eid = addEntity(world);
			expect(hasSprite(world, eid)).toBe(false);
		});
	});

	describe('getEntitySpriteSheet', () => {
		it('returns sprite sheet data for entity', () => {
			const spriteId = registerSprite({
				name: 'player',
				frames: [[[{ char: '@' }]]],
			});
			const eid = addEntity(world);
			setSprite(world, eid, spriteId);

			const sheet = getEntitySpriteSheet(world, eid);

			expect(sheet).toBeDefined();
			expect(sheet?.name).toBe('player');
			expect(sheet?.id).toBe(spriteId);
		});

		it('returns undefined for entity without sprite', () => {
			const eid = addEntity(world);
			expect(getEntitySpriteSheet(world, eid)).toBeUndefined();
		});
	});

	describe('removeSprite', () => {
		it('clears sprite data from entity', () => {
			const spriteId = registerSprite({
				name: 'test',
				frames: [[[{ char: '@' }]]],
			});
			const eid = addEntity(world);
			setSprite(world, eid, spriteId);

			removeSprite(world, eid);

			expect(Sprite.spriteSheetId[eid]).toBe(0);
			expect(Sprite.frameIndex[eid]).toBe(0);
			expect(Sprite.frameCount[eid]).toBe(0);
		});

		it('returns entity for chaining', () => {
			const eid = addEntity(world);
			expect(removeSprite(world, eid)).toBe(eid);
		});

		it('handles entity without sprite', () => {
			const eid = addEntity(world);
			expect(removeSprite(world, eid)).toBe(eid);
		});
	});

	describe('multi-frame sprites', () => {
		it('handles complex multi-frame animation', () => {
			// Create a 2x2 sprite with 4 frames (spinning animation)
			const spriteId = registerSprite({
				name: 'spinner',
				frames: [
					[
						[{ char: '/' }, { char: '-' }],
						[{ char: '|' }, { char: '\\' }],
					],
					[
						[{ char: '-' }, { char: '\\' }],
						[{ char: '/' }, { char: '|' }],
					],
					[
						[{ char: '\\' }, { char: '|' }],
						[{ char: '-' }, { char: '/' }],
					],
					[
						[{ char: '|' }, { char: '/' }],
						[{ char: '\\' }, { char: '-' }],
					],
				],
			});

			const eid = addEntity(world);
			setSprite(world, eid, spriteId);

			expect(Sprite.frameCount[eid]).toBe(4);
			expect(Sprite.frameWidth[eid]).toBe(2);
			expect(Sprite.frameHeight[eid]).toBe(2);

			// Cycle through all frames
			for (let i = 0; i < 4; i++) {
				const frame = getCurrentFrame(world, eid);
				expect(frame).toHaveLength(2); // 2 rows
				expect(frame?.[0]).toHaveLength(2); // 2 columns
				nextFrame(world, eid);
			}

			// Should wrap back to 0
			expect(Sprite.frameIndex[eid]).toBe(0);
		});

		it('handles sprites with color data', () => {
			const spriteId = registerSprite({
				name: 'colored',
				frames: [
					[
						[
							{ char: '#', fg: 0xff0000ff, bg: 0x000000ff },
							{ char: '#', fg: 0x00ff00ff, bg: 0x000000ff },
						],
						[
							{ char: '#', fg: 0x0000ffff, bg: 0x000000ff },
							{ char: '#', fg: 0xffff00ff, bg: 0x000000ff },
						],
					],
				],
			});

			const eid = addEntity(world);
			setSprite(world, eid, spriteId);

			const frame = getCurrentFrame(world, eid);
			expect(frame?.[0]?.[0]?.fg).toBe(0xff0000ff); // Red
			expect(frame?.[0]?.[1]?.fg).toBe(0x00ff00ff); // Green
			expect(frame?.[1]?.[0]?.fg).toBe(0x0000ffff); // Blue
			expect(frame?.[1]?.[1]?.fg).toBe(0xffff00ff); // Yellow
		});
	});
});
